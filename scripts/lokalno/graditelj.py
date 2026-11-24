"""graditelj: kontrolna točka, početni pregled i praćenje za lokalnog graditelja Ducture.

Upotreba (C:\\Python314\\python.exe, PYTHONIOENCODING=utf-8):
  graditelj.py pocetak            jedan sažet pregled nakon pokretanja ili kompresije konteksta:
                                  kontrolna točka, RAM i stog, CI mojih PR-ova, nove poruke za
                                  graditelja na Ductus #2055, neuređena radna stabla
  graditelj.py zapis [polje=vrijednost ...] [+pr=web#638] [-pr=web#638] [+stablo=g-pocetna] [-stablo=...]
                                  ažurira kontrolnu točku (polja: zadatak, korak, sljedece, blokada)
  graditelj.py ci <repo#broj>     zašto PR pada: neuspjele provjere i prvi redovi greške iz loga
  graditelj.py prati [minuta]     petlja za Monitor: ispisuje red samo kad se nešto promijeni
                                  (CI zaključak PR-a, nova poruka za graditelja, stog pao);
                                  sama završava nakon zadanih minuta (zadano 25)
  graditelj.py samotest           provjera čistih funkcija bez mreže (pokreće je CI test)

Kontrolna točka je u DUCTURA_LOKALNO/_alati/graditelj.json. Nije izvor istine: zadatak, status i
nositelja vode Linear i #2055; `pocetak` ih uspoređuje s točkom i javlja razliku.
Alat samo čita GitHub; ništa ne objavljuje, ne spaja i ne gasi.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

LOKALNO = Path(os.environ.get("DUCTURA_LOKALNO", r"D:\Ductura\_lokalno"))
TOCKA = LOKALNO / "_alati" / "graditelj.json"
REPOI = {
    "web": "ductura/Institution_front_web_chrome",
    "srv": "ductura/Institution_server",
    "gh": "ductura/.github",
    "ductus": "danielrisavi77-create/Ductus",
}
KOORDINACIJA = ("ductus", 2055)
POLJA = ("zadatak", "korak", "sljedece", "blokada")
LOSE = {"failure", "timed_out", "cancelled", "action_required", "startup_failure"}


# ---------- čiste funkcije (samotest) ----------

def pr_ref(s: str) -> tuple[str, int]:
    m = re.fullmatch(r"(web|srv|gh|ductus)#(\d+)", s.strip())
    if not m:
        raise ValueError(f"neispravan PR '{s}'; oblik: web#638, srv#697, gh#83, ductus#2055")
    return m.group(1), int(m.group(2))


def primijeni_zapis(tocka: dict, argumenti: list[str], sada: str) -> dict:
    t = {"prs": [], "stabla": [], **tocka}
    for a in argumenti:
        if a.startswith(("+pr=", "-pr=")):
            ref = a[4:]
            pr_ref(ref)
            t["prs"] = [p for p in t["prs"] if p != ref] + ([ref] if a[0] == "+" else [])
        elif a.startswith(("+stablo=", "-stablo=")):
            ime = a[8:]
            t["stabla"] = [s for s in t["stabla"] if s != ime] + ([ime] if a[0] == "+" else [])
        elif "=" in a and a.split("=", 1)[0] in POLJA:
            k, v = a.split("=", 1)
            t[k] = v
        else:
            raise ValueError(f"nepoznat argument '{a}'; polja: {', '.join(POLJA)}, +pr=, -pr=, +stablo=, -stablo=")
    t["azurirano"] = sada
    return t


def sazmi_provjere(runs: list[dict]) -> tuple[str, list[str]]:
    """Zaključak PR-a iz check-runova: CEKA, PAD (s imenima) ili PROLAZ."""
    pali = sorted({r["name"] for r in runs if r.get("conclusion") in LOSE})
    if pali:
        return "PAD", pali
    if any(r.get("status") != "completed" for r in runs):
        return "CEKA", []
    return ("PROLAZ" if runs else "NEMA PROVJERA"), []


def za_graditelja(tijelo: str) -> bool:
    """Poruka na #2055 koja se tiče graditelja, a nije moja vlastita predaja."""
    prvi = tijelo.lstrip()[:200]
    if re.match(r"\**\s*GRADITELJ\b", prvi):
        return False
    return bool(re.search(r"graditelj|\bLOK-|\bINT-\d+", tijelo, re.I))


def kljucni_redovi(log: str, koliko: int = 8) -> list[str]:
    """Redovi loga koji objašnjavaju pad: bez vremenske oznake i ANSI boja, bez ponavljanja."""
    vidjeni: list[str] = []
    for x in log.splitlines():
        x = re.sub(r"\x1b\[[0-9;]*m", "", re.sub(r"^\ufeff?\S+Z ", "", x)).strip()
        if re.search(r"FAIL|✘|✗|×|\bError\b|error TS|AssertionError|Expected|\d+ failed|##\[error\]", x) and x not in vidjeni:
            vidjeni.append(x)
    return vidjeni[:koliko]


def razlike(staro: dict, novo: dict) -> list[str]:
    return [f"{k}: {staro.get(k, '—')} → {v}" for k, v in sorted(novo.items()) if staro.get(k) != v]


# ---------- vanjsko (gh, git, stog) ----------

def gh(path: str) -> object:
    r = subprocess.run(["gh", "api", path], capture_output=True, text=True, encoding="utf-8", timeout=60)
    if r.returncode != 0:
        raise RuntimeError(f"gh api {path.split('?')[0]}: {r.stderr.strip()[:200]}")
    return json.loads(r.stdout or "null")


def stanje_pr(ref: str) -> tuple[str, list[str], str]:
    kratko, broj = pr_ref(ref)
    pr = gh(f"repos/{REPOI[kratko]}/pulls/{broj}")
    if pr["state"] != "open":
        return ("SPOJEN" if pr.get("merged_at") else "ZATVOREN"), [], pr["head"]["sha"][:8]
    sha = pr["head"]["sha"]
    runs = gh(f"repos/{REPOI[kratko]}/commits/{sha}/check-runs?per_page=100")["check_runs"]
    z, pali = sazmi_provjere(runs)
    return z, pali, sha[:8]


def nove_poruke(od: str | None) -> list[dict]:
    kratko, broj = KOORDINACIJA
    od = od or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 86400))  # prvi put: zadnja 24 h
    return [c for c in gh(f"repos/{REPOI[kratko]}/issues/{broj}/comments?since={od}&per_page=100") if c["created_at"] > od]


def ucitaj() -> dict:
    try:
        return json.loads(TOCKA.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def spremi(t: dict) -> None:
    TOCKA.parent.mkdir(parents=True, exist_ok=True)
    TOCKA.write_text(json.dumps(t, ensure_ascii=False, indent=1), encoding="utf-8")


def sada() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def stog_kratko() -> str:
    sys.path.insert(0, str(Path(__file__).parent))
    import stog  # noqa: E402
    dolje = [ime for port, ime in stog.PORTOVI.items() if not stog.port_otvoren(port)]
    return f"RAM {stog.slobodni_ram_gb():.1f} GB; stog " + ("sav radi" if not dolje else "NE RADI: " + ", ".join(dolje))


def neuredno(ime: str) -> str:
    stablo = LOKALNO / ime
    if not stablo.is_dir():
        return f"{ime}: NE POSTOJI"
    r = subprocess.run(["git", "status", "--porcelain", "-b"], cwd=stablo, capture_output=True, text=True, encoding="utf-8")
    redovi = r.stdout.splitlines()
    grana = redovi[0][3:] if redovi else "?"
    izmjene = [x for x in redovi[1:] if not x.startswith("??")]
    return f"{ime}: {grana}" + (f"; {len(izmjene)} neuvedenih izmjena" if izmjene else "")


# ---------- naredbe ----------

def pocetak() -> int:
    t = ucitaj()
    if not t:
        print("kontrolne točke nema; zapiši je: graditelj.py zapis zadatak=… korak=… sljedece=…")
    else:
        print(f"TOČKA ({t.get('azurirano', '?')}): {t.get('zadatak', '—')}")
        for k in ("korak", "sljedece", "blokada"):
            if t.get(k):
                print(f"  {k}: {t[k]}")
    print(stog_kratko())
    for ref in t.get("prs", []):
        try:
            z, pali, sha = stanje_pr(ref)
            print(f"  {ref} {sha} {z}" + (f": {', '.join(pali[:4])}" if pali else ""))
        except Exception as e:  # mreža ili gh: javi i nastavi
            print(f"  {ref} NEPROVJERENO ({e})")
    for ime in t.get("stabla", []):
        print("  " + neuredno(ime))
    try:
        poruke = [c for c in nove_poruke(t.get("procitano_2055")) if za_graditelja(c["body"])]
        for c in poruke[-5:]:
            prvi = c["body"].strip().splitlines()[0][:160]
            print(f"  #2055 {c['created_at']} {c['html_url'].rsplit('-', 1)[-1]}: {prvi}")
        if not poruke:
            print("  #2055: ništa novo za graditelja")
        t["procitano_2055"] = sada()
        spremi(t)
    except Exception as e:
        print(f"  #2055 NEPROVJERENO ({e})")
    return 0


def ci(argv: list[str]) -> int:
    kratko, broj = pr_ref(argv[0])
    repo = REPOI[kratko]
    sha = gh(f"repos/{repo}/pulls/{broj}")["head"]["sha"]
    runs = gh(f"repos/{repo}/commits/{sha}/check-runs?per_page=100")["check_runs"]
    z, pali = sazmi_provjere(runs)
    print(f"{argv[0]} {sha[:8]} {z}")
    for r in runs:
        if r.get("conclusion") not in LOSE:
            continue
        m = re.search(r"/job/(\d+)", r.get("html_url") or "")
        print(f"- {r['name']}")
        if not m:
            continue
        log = subprocess.run(["gh", "api", "--allow-escape-sequences", f"repos/{repo}/actions/jobs/{m.group(1)}/logs"],
                             capture_output=True, text=True, encoding="utf-8", errors="replace")
        if log.returncode != 0:
            print(f"    log nedostupan: {log.stderr.strip()[:160]}")
            continue
        kljucni = kljucni_redovi(log.stdout)
        for x in kljucni[:8]:
            print("    " + x.strip()[:220])
    return 0


def prati(argv: list[str]) -> int:
    kraj = time.time() + 60 * (int(argv[0]) if argv else 25)
    prije: dict = {}
    while time.time() < kraj:
        t = ucitaj()
        sad: dict = {"stog": stog_kratko().split("; ", 1)[1]}
        for ref in t.get("prs", []):
            try:
                z, pali, sha = stanje_pr(ref)
                sad[ref] = f"{sha} {z}" + (f" ({', '.join(pali[:3])})" if pali else "")
            except Exception:
                pass  # privremena greška mreže ne smije ubiti praćenje
        if prije:
            for red in razlike(prije, sad):
                print(red, flush=True)
        try:
            for c in nove_poruke(t.get("procitano_2055")):
                if za_graditelja(c["body"]):
                    print(f"#2055 nova poruka {c['html_url']}: {c['body'].strip().splitlines()[0][:140]}", flush=True)
            t["procitano_2055"] = sada()
            spremi(t)
        except Exception:
            pass
        prije = sad
        time.sleep(120)
    print("praćenje završilo (rok); ponovno pokreni ako treba", flush=True)
    return 0


def samotest() -> int:
    assert pr_ref("web#638") == ("web", 638)
    for los in ("x#1", "web638", "web#"):
        try:
            pr_ref(los)
            raise AssertionError(los)
        except ValueError:
            pass
    t = primijeni_zapis({}, ["zadatak=INT-31", "+pr=web#638", "+pr=srv#697", "-pr=web#638", "+stablo=g-pocetna"], "T")
    assert t["zadatak"] == "INT-31" and t["prs"] == ["srv#697"] and t["stabla"] == ["g-pocetna"] and t["azurirano"] == "T"
    assert primijeni_zapis(t, ["+pr=srv#697"], "U")["prs"] == ["srv#697"]
    try:
        primijeni_zapis({}, ["lozinka=x"], "T")
        raise AssertionError("nepoznato polje prošlo")
    except ValueError:
        pass
    assert sazmi_provjere([{"name": "a", "status": "completed", "conclusion": "success"}]) == ("PROLAZ", [])
    assert sazmi_provjere([{"name": "a", "status": "in_progress", "conclusion": None}]) == ("CEKA", [])
    assert sazmi_provjere([{"name": "b", "status": "completed", "conclusion": "failure"},
                           {"name": "a", "status": "in_progress", "conclusion": None}]) == ("PAD", ["b"])
    assert sazmi_provjere([{"name": "s", "status": "completed", "conclusion": "skipped"}]) == ("PROLAZ", [])
    assert sazmi_provjere([]) == ("NEMA PROVJERA", [])
    assert za_graditelja("NALOG graditelju: INT-32")
    assert not za_graditelja("NALOG wpilk-shema-v3 za pisca u oblaku")
    assert not za_graditelja("**GRADITELJ, PREDAJA** INT-31")
    assert not za_graditelja("Izvještaj kruga bez ičega")
    assert razlike({"a": "1"}, {"a": "1", "b": "2"}) == ["b: — → 2"]
    log = ("2026-11-24T21:27:46.1Z \x1b[31m  ✘ 3 [app] e2e/a.spec.ts:50\x1b[0m\n2026-11-24T21:27:46.2Z ok\n"
           "2026-11-24T21:27:46.3Z   1 failed\n2026-11-24T21:27:46.4Z   1 failed\n")
    assert kljucni_redovi(log) == ["✘ 3 [app] e2e/a.spec.ts:50", "1 failed"], kljucni_redovi(log)
    print("samotest prolazi")
    return 0


def main() -> int:
    naredba, argv = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ("", [])
    if naredba == "pocetak":
        return pocetak()
    if naredba == "zapis":
        spremi(primijeni_zapis(ucitaj(), argv, sada()))
        print(f"točka zapisana: {TOCKA}")
        return 0
    if naredba == "ci" and argv:
        return ci(argv)
    if naredba == "prati":
        return prati(argv)
    if naredba == "samotest":
        return samotest()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())

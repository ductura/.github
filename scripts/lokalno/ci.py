"""ci: mjerenje i čekanje CI-ja te lokalni testovi pravila na Windowsu (CI-BRZINA, 25. 11. 2026.).

Upotreba (C:\\Python314\\python.exe, PYTHONIOENCODING=utf-8, < /dev/null):
  ci.py mjeri <cilj> [<cilj> ...] [--koraci N]
        Trajanje pokreta po workflowu: ukupno, najsporiji poslovi, čekanje na runner (red).
        Cilj: web#748 (zadnji pokreti na headu PR-a), web@<run_id> ili web:<grana> (zadnji push
        pokret grane). Više ciljeva daje usporedbu, red po red. --koraci N ispisuje korake
        N najsporijih poslova.
  ci.py cekaj <repo#broj> [--max minuta]
        Čeka da sve provjere PR-a završe pa ispiše sažetak. Izlaz: 0 ci-ok (ili sve) prolazi,
        1 pad, 2 isteklo vrijeme (zadano 60 min), 3 PR nema provjera ni nakon 5 min.
  ci.py testovi <mapa-repoa> <datoteke ...> [--node-modules <mapa>]
        node --test s Git Bashom na PATH-u (WSL bash daje lažne padove). Ako mapa nema
        node_modules, privremeno spaja --node-modules (zadano g-teza-web) i nakon toga briše
        spojnicu. Traži barem 1,5 GB slobodnog RAM-a.
  ci.py samotest

Repo kratice: web, srv, gh, ductus, iwm (Institution_web_mobile), wo (Web_other), pre (Preloader).
Alat samo čita GitHub; ništa ne objavljuje, ne spaja, ne pokreće ponovno.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

REPOI = {
    "web": "ductura/Institution_front_web_chrome",
    "srv": "ductura/Institution_server",
    "gh": "ductura/.github",
    "ductus": "danielrisavi77-create/Ductus",
    "iwm": "ductura/Institution_web_mobile",
    "wo": "ductura/Web_other",
    "pre": "ductura/Preloader",
}
GIT_BASH = [r"C:\Program Files\Git\usr\bin", r"C:\Program Files\Git\bin"]
ZADANI_NM = Path(os.environ.get("DUCTURA_LOKALNO", r"D:\Ductura\_lokalno")) / "g-teza-web" / "node_modules"
LOSE = {"FAILURE", "ERROR", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE"}


# ---------- čiste funkcije (samotest) ----------

def cilj(s: str) -> tuple[str, str, str]:
    """web#748 -> (repo, 'pr', '748'); web@123 -> (repo, 'run', '123'); web:grana -> (repo, 'grana', 'grana')."""
    m = re.fullmatch(r"([a-z]+)([#@:])(.+)", s.strip())
    if not m or m.group(1) not in REPOI:
        raise ValueError(f"neispravan cilj '{s}'; oblik: web#748, web@<run_id>, web:<grana>")
    vrsta = {"#": "pr", "@": "run", ":": "grana"}[m.group(2)]
    if vrsta in ("pr", "run") and not m.group(3).isdigit():
        raise ValueError(f"neispravan cilj '{s}'")
    return REPOI[m.group(1)], vrsta, m.group(3)


def sek(a: str | None, b: str | None) -> float | None:
    if not a or not b:
        return None
    f = lambda x: datetime.fromisoformat(x.replace("Z", "+00:00"))
    return (f(b) - f(a)).total_seconds()


def mmss(s: float | None) -> str:
    if s is None:
        return "—"
    s = int(round(s))
    return f"{s // 60}:{s % 60:02d}"


def sazmi_poslove(run_created: str, jobs: list[dict]) -> dict:
    """Ukupno (od nastanka pokreta do zadnjeg posla), red (najdulje čekanje na runner) i poslovi po trajanju."""
    stvarni = [j for j in jobs if j.get("started_at") and j.get("completed_at") and j.get("conclusion") != "skipped"]
    redovi = []
    for j in stvarni:
        redovi.append({
            "ime": j["name"],
            "trajanje": sek(j["started_at"], j["completed_at"]),
            "red": sek(j.get("created_at") or run_created, j["started_at"]),
            "zakljucak": j.get("conclusion") or "?",
            "koraci": j.get("steps") or [],
        })
    redovi.sort(key=lambda r: -(r["trajanje"] or 0))
    kraj = max((j["completed_at"] for j in stvarni), default=None)
    return {
        "ukupno": sek(run_created, kraj),
        "red_max": max((r["red"] or 0 for r in redovi), default=0),
        "red_zbroj": sum(r["red"] or 0 for r in redovi),
        "poslovi": redovi,
    }


# Commit statusi koji čekaju ljudski pregled, ne CI: dok čekaju, ne drže `cekaj`
# (SRV#933 je 27. 11. „čekao CI” satima, a CI je bio gotov za 4,5 min).
CEKA_PREGLED = {"Engineering review gate"}


def stanje_provjera(checks: list[dict]) -> str:
    """CEKA dok išta od CI-ja radi; inače PROLAZ ili PAD po ci-ok, a bez ci-ok po svim provjerama.

    Provjere iz CEKA_PREGLED ne drže čekanje dok su na čekanju (čekaju čovjeka)."""
    if not checks:
        return "NEMA"
    radi = ("PENDING", "QUEUED", "IN_PROGRESS", "WAITING", "REQUESTED")
    if any(c.get("state") in radi and c.get("name") not in CEKA_PREGLED for c in checks):
        return "CEKA"
    ok = [c for c in checks if c.get("name") == "ci-ok"]
    gledaj = ok or checks
    return "PAD" if any(c.get("state") in LOSE for c in gledaj) else "PROLAZ"


def pass_fail(izlaz: str) -> tuple[int, int, list[str]]:
    p = re.search(r"^ℹ pass (\d+)", izlaz, re.M)
    f = re.search(r"^ℹ fail (\d+)", izlaz, re.M)
    pali = [l.strip() for l in izlaz.splitlines() if re.match(r"\s*not ok \d+ - ", l)]
    return int(p.group(1)) if p else 0, int(f.group(1)) if f else -1, pali


# ---------- vanjsko ----------

def gh_api(path: str) -> object:
    for cekaj in (5, 15, 45, None):
        r = subprocess.run(["gh", "api", path], capture_output=True, text=True, encoding="utf-8", timeout=90)
        if r.returncode == 0:
            return json.loads(r.stdout or "null")
        if cekaj is None or not re.search(r"HTTP 5\d\d", r.stderr):
            raise RuntimeError(f"gh api {path.split('?')[0]}: {r.stderr.strip()[:200]}")
        time.sleep(cekaj)


def pokreti(repo: str, vrsta: str, vrijednost: str) -> list[dict]:
    if vrsta == "run":
        return [gh_api(f"repos/{repo}/actions/runs/{vrijednost}")]
    if vrsta == "pr":
        sha = gh_api(f"repos/{repo}/pulls/{vrijednost}")["head"]["sha"]
        runs = gh_api(f"repos/{repo}/actions/runs?head_sha={sha}&per_page=50")["workflow_runs"]
    else:
        runs = gh_api(f"repos/{repo}/actions/runs?branch={vrijednost}&event=push&per_page=20")["workflow_runs"]
    zadnji: dict[str, dict] = {}
    for r in runs:  # najnoviji prvi; po workflowu samo zadnji pokret
        zadnji.setdefault(r["name"], r)
    return list(zadnji.values())


def mjeri(argv: list[str]) -> int:
    koraci = 0
    if "--koraci" in argv:
        i = argv.index("--koraci")
        koraci = int(argv[i + 1])
        argv = argv[:i] + argv[i + 2:]
    if not argv:
        print(__doc__)
        return 2
    for c in argv:
        repo, vrsta, vrijednost = cilj(c)
        for run in pokreti(repo, vrsta, vrijednost):
            jobs = gh_api(f"repos/{repo}/actions/runs/{run['id']}/jobs?per_page=100")["jobs"]
            s = sazmi_poslove(run["created_at"], jobs)
            stanje = run.get("conclusion") or run.get("status")
            print(f"{c} · {run['name']} · run {run['id']} · {run['head_sha'][:8]} · {stanje} · "
                  f"ukupno {mmss(s['ukupno'])} · poslova {len(s['poslovi'])} · "
                  f"red najdulji {mmss(s['red_max'])}, zbroj {mmss(s['red_zbroj'])}")
            for r in s["poslovi"][:5]:
                print(f"    {mmss(r['trajanje']):>6}  (red {mmss(r['red'])})  {r['ime']}"
                      f"{'' if r['zakljucak'] == 'success' else '  [' + r['zakljucak'] + ']'}")
            for r in s["poslovi"][:koraci]:
                print(f"  koraci: {r['ime']}")
                for k in sorted(r["koraci"], key=lambda k: -(sek(k.get("started_at"), k.get("completed_at")) or 0))[:8]:
                    print(f"      {mmss(sek(k.get('started_at'), k.get('completed_at'))):>6}  {k['name']}")
    return 0


def cekaj(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    m = re.fullmatch(r"([a-z]+)#(\d+)", argv[0])
    if not m or m.group(1) not in REPOI:
        print(f"neispravan PR '{argv[0]}'; oblik: web#748")
        return 2
    repo, broj = REPOI[m.group(1)], m.group(2)
    najvise = float(argv[argv.index("--max") + 1]) if "--max" in argv else 60
    pocetak = time.time()
    while True:
        r = subprocess.run(["gh", "pr", "checks", broj, "-R", repo, "--json", "name,state,startedAt,completedAt"],
                           capture_output=True, text=True, encoding="utf-8", timeout=90)
        checks = json.loads(r.stdout) if r.stdout.strip().startswith("[") else []
        stanje = stanje_provjera(checks)
        proslo = (time.time() - pocetak) / 60
        if stanje in ("PROLAZ", "PAD"):
            break
        if stanje == "NEMA" and proslo > 5:
            print(f"{argv[0]}: nema provjera ni nakon 5 min")
            return 3
        if proslo > najvise:
            print(f"{argv[0]}: isteklo {najvise:.0f} min, još traje")
            return 2
        time.sleep(30)
    print(f"{argv[0]}: {stanje} ({len(checks)} provjera, čekao {proslo:.1f} min)")
    for c in sorted(checks, key=lambda c: (c["state"] == "SUCCESS", c["state"] == "SKIPPED", c["name"])):
        if c["state"] not in ("SUCCESS", "SKIPPED") or c["name"] == "ci-ok":
            if c["name"] in CEKA_PREGLED and c["state"] in ("PENDING", "WAITING"):
                print(f"    {c['state']:<10} {'—':>6}  {c['name']} (čeka pregled, nije CI)")
                continue
            print(f"    {c['state']:<10} {mmss(sek(c.get('startedAt'), c.get('completedAt'))):>6}  {c['name']}")
    return 0 if stanje == "PROLAZ" else 1


def slobodni_gb() -> float:
    r = subprocess.run(["powershell", "-NoProfile", "-Command",
                        "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"],
                       capture_output=True, text=True, timeout=60)
    return int(r.stdout.strip()) / 1024 / 1024


def testovi(argv: list[str]) -> int:
    nm = ZADANI_NM
    if "--node-modules" in argv:
        i = argv.index("--node-modules")
        nm = Path(argv[i + 1])
        argv = argv[:i] + argv[i + 2:]
    if len(argv) < 2:
        print(__doc__)
        return 2
    mapa, datoteke = Path(argv[0]), argv[1:]
    gb = slobodni_gb()
    if gb < 1.5:
        print(f"odbijeno: slobodno {gb:.1f} GB RAM-a, treba barem 1,5 GB")
        return 4
    spojnica = mapa / "node_modules"
    napravio = False
    if not spojnica.exists():
        if not nm.is_dir():
            print(f"nema {spojnica} ni {nm}")
            return 2
        subprocess.run(["cmd", "/c", "mklink", "/J", str(spojnica), str(nm)], capture_output=True, check=True)
        napravio = True
    try:
        env = dict(os.environ, PATH=os.pathsep.join(GIT_BASH + [os.environ.get("PATH", "")]))
        r = subprocess.run(["node", "--test", *datoteke], cwd=mapa, env=env, capture_output=True,
                           text=True, encoding="utf-8", errors="replace", timeout=900)
    finally:
        if napravio:
            os.rmdir(spojnica)  # briše samo spojnicu, ne sadržaj cilja
    p, f, pali = pass_fail(r.stdout)
    print(f"testovi: {p} prolazi, {f} pada{' (spojnica node_modules privremena, uklonjena)' if napravio else ''}")
    for l in pali[:20]:
        print(f"    {l}")
    if f < 0:
        print("\n".join(r.stdout.splitlines()[-15:] + r.stderr.splitlines()[-15:]))
    return 0 if f == 0 else 1


def samotest() -> int:
    assert cilj("web#748") == (REPOI["web"], "pr", "748")
    assert cilj("iwm@123") == (REPOI["iwm"], "run", "123")
    assert cilj("web:migracija/kopija-ductus-front") == (REPOI["web"], "grana", "migracija/kopija-ductus-front")
    for los in ("x#1", "web#a", "web@", "web748"):
        try:
            cilj(los)
            raise AssertionError(los)
        except ValueError:
            pass
    assert sek("2026-11-25T10:00:00Z", "2026-11-25T10:01:30Z") == 90
    assert mmss(90) == "1:30" and mmss(None) == "—"
    jobs = [
        {"name": "a", "created_at": "2026-11-25T10:00:00Z", "started_at": "2026-11-25T10:00:10Z",
         "completed_at": "2026-11-25T10:02:10Z", "conclusion": "success"},
        {"name": "b", "created_at": "2026-11-25T10:00:00Z", "started_at": "2026-11-25T10:01:00Z",
         "completed_at": "2026-11-25T10:05:00Z", "conclusion": "failure"},
        {"name": "c", "started_at": None, "completed_at": None, "conclusion": "skipped"},
    ]
    s = sazmi_poslove("2026-11-25T10:00:00Z", jobs)
    assert [r["ime"] for r in s["poslovi"]] == ["b", "a"]
    assert s["ukupno"] == 300 and s["red_max"] == 60 and s["red_zbroj"] == 70
    assert stanje_provjera([]) == "NEMA"
    assert stanje_provjera([{"name": "ci-ok", "state": "SUCCESS"}, {"name": "x", "state": "IN_PROGRESS"}]) == "CEKA"
    assert stanje_provjera([{"name": "ci-ok", "state": "SUCCESS"}, {"name": "ui-baselines", "state": "FAILURE"}]) == "PROLAZ"
    assert stanje_provjera([{"name": "ci-ok", "state": "FAILURE"}]) == "PAD"
    assert stanje_provjera([{"name": "ci-ok", "state": "SUCCESS"},
                            {"name": "Engineering review gate", "state": "PENDING"}]) == "PROLAZ"
    assert stanje_provjera([{"name": "ci-ok", "state": "IN_PROGRESS"},
                            {"name": "Engineering review gate", "state": "PENDING"}]) == "CEKA"
    assert stanje_provjera([{"name": "test", "state": "FAILURE"}]) == "PAD"
    izlaz = "TAP\nnot ok 3 - changes: x\nℹ tests 5\nℹ pass 4\nℹ fail 1\n"
    assert pass_fail(izlaz) == (4, 1, ["not ok 3 - changes: x"])
    print("samotest prolazi")
    return 0


def main() -> int:
    naredba, argv = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ("", [])
    try:
        if naredba == "mjeri":
            return mjeri(argv)
        if naredba == "cekaj":
            return cekaj(argv)
        if naredba == "testovi":
            return testovi(argv)
        if naredba == "samotest":
            return samotest()
    except (ValueError, RuntimeError) as e:
        print(f"greška: {e}")
        return 2
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())

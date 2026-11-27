"""stog: lokalni stog Ducture za graditelja (izmišljeni podaci, samo lokalno).

Upotreba (C:\\Python314\\python.exe, PYTHONIOENCODING=utf-8):
  stog.py status                 RAM, portovi, Docker, iz kojeg stabla rade SRV i WEB i
                                 koliko su commita iza svoje baze (zastarjela kopija daje
                                 „Stranica ne postoji” za rute koje su u bazi već spojene)
  stog.py start <stablo> [--local-iz <stablo>] [--seed redovni --web <web-stablo>]
                                 pokreće `pnpm lokalno` u stablu i ostaje u prvom planu;
                                 pokreći kao pozadinski Bash zadatak (odvojeni proces tiho umre).
                                 --seed redovni: podaci kao u CI poslu sistem (WEB sistem.yml):
                                 nova baza ductus_redovni, migracije i seed.sql (pnpm lokalno),
                                 pa e2e/sistem/seed-int04.sql iz WEB stabla preko psql u spremniku
  stog.py upit "<sql>" [...]     upit u glavnu bazu stoga, samo za čitanje (READ ONLY transakcija)
  stog.py stop <port> [...]      gasi stablo procesa koji sluša na portu, samo ako radi iz stabla
                                 pod _lokalno (TaskStop na Windowsu ostavi `next start` živim)
  stog.py samotest               provjera čistih funkcija

Status provjerava i Preloader: stablo na 3100 mora sadržavati granu Preloadera koju WEB-ov
posao sistem uzima (`preloader_ref` iz .github/workflows/sistem.yml stabla na 5173). Stari edge
šalje /aplikacija na staru putanju i sistemski testovi padnu s 404.

Pravila ugrađena u alat:
  - lozinka baze čita se iz compose.yaml u memoriju i ide samo u okolinu procesa; nikad se ne ispisuje
  - start traži >= 4 GB slobodnog RAM-a i slobodan port 4000
  - lokalni S3 (.local) mora biti prava mapa, ne spojnica; --local-iz radi pravu kopiju
  - alat ne zaustavlja Docker, compose stog ni procese koje nije pokrenuo
  - --seed redovni briše i stvara samo bazu ductus_redovni; ostale baze (ductus, ductus_legal,
    ductus_pr693_2511) nikad ne dira i upisuje samo seed-int04.sql iz WEB stabla
"""
from __future__ import annotations

import ctypes
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

# Radna stabla i stanje stoga su izvan repoa: DUCTURA_LOKALNO (zadano D:\Ductura\_lokalno).
LOKALNO = Path(os.environ.get("DUCTURA_LOKALNO", r"D:\Ductura\_lokalno"))
ALATI = LOKALNO / "_alati"
STANJE = ALATI / "stanje.json"
IZLAZ = ALATI / "izlaz"
PORTOVI = {4000: "SRV", 3100: "Preloader", 8000: "Edge", 5173: "WEB", 54329: "baza (postgres-main)", 8090: "lažni OIDC"}
HTTP = {8000: "/", 3100: "/"}
MIN_RAM_START_GB = 4.0
MIN_RAM_GB = 1.5
# Baza grane iz koje radna stabla stoga moraju biti svježa.
BAZE = {"SRV": "migracija/kopija-ductus-backend", "WEB": "migracija/kopija-ductus-front"}
# --seed redovni: zasebna baza koju alat smije obrisati i ponovno stvoriti.
BAZA_REDOVNI = "ductus_redovni"
NEDIRATI_BAZE = {"ductus", "ductus_legal", "ductus_pr693_2511", "postgres", "template0", "template1"}
SEED_INT04 = Path("e2e") / "sistem" / "seed-int04.sql"


def slobodni_ram_gb() -> float:
    class MS(ctypes.Structure):
        _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong), ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong), ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong), ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
    m = MS()
    m.dwLength = ctypes.sizeof(MS)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return m.ullAvailPhys / 1024**3


def port_otvoren(port: int) -> bool:
    with socket.socket() as s:
        s.settimeout(1.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def http_status(port: int, path: str) -> str:
    try:
        with urllib.request.urlopen(f"http://localhost:{port}{path}", timeout=8) as r:
            return str(r.status)
    except urllib.error.HTTPError as e:
        return str(e.code)
    except Exception as e:  # noqa: BLE001
        return type(e).__name__


def lozinka_baze(stablo: Path) -> str:
    """POSTGRES_PASSWORD iz bloka postgres-main u compose.yaml. Vraća se pozivatelju, nikad se ne ispisuje."""
    tekst = (stablo / "compose.yaml").read_text(encoding="utf-8")
    blok = re.search(r"^  postgres-main:\n(.*?)(?=^  \S)", tekst, re.S | re.M)
    if blok is None:
        raise SystemExit("compose.yaml: nema bloka postgres-main")
    m = re.search(r"^\s+POSTGRES_PASSWORD:\s*\"?([^\"\n]+?)\"?\s*$", blok.group(1), re.M)
    if m is None:
        raise SystemExit("compose.yaml: nema POSTGRES_PASSWORD u postgres-main")
    return m.group(1)


def stablo_iz(ime: str) -> Path:
    p = Path(ime) if Path(ime).is_absolute() else LOKALNO / ime
    if not (p / "compose.yaml").is_file() or not (p / "package.json").is_file():
        raise SystemExit(f"{p}: nije SRV stablo (nema compose.yaml ili package.json)")
    return p


def stablo_iz_naredbe(naredba: str) -> str | None:
    """Ime radnog stabla pod _lokalno iz naredbenog retka procesa (npr. next dev iz g-demo-web)."""
    m = re.search(r"[\\/]_lokalno[\\/]([^\\/\"' ]+)", naredba or "")
    return m.group(1) if m and not m.group(1).startswith("_") else None


def slusac(port: int) -> tuple[int, str] | None:
    """PID i naredbeni redak procesa koji sluša na portu (samo čitanje)."""
    ps = (f"$c=Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue|Select-Object -First 1;"
          "if($c){$c.OwningProcess;(Get-CimInstance Win32_Process -Filter \"ProcessId=$($c.OwningProcess)\").CommandLine}")
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True, timeout=30)
    except Exception:  # noqa: BLE001
        return None
    redovi = r.stdout.strip().splitlines()
    if not redovi or not redovi[0].strip().isdigit():
        return None
    return int(redovi[0]), " ".join(redovi[1:])


def stablo_na_portu(port: int) -> str | None:
    s = slusac(port)
    return stablo_iz_naredbe(s[1]) if s else None


def web_stablo() -> str | None:
    """Stablo iz kojeg radi WEB: naredbeni redak procesa koji sluša na 5173 (samo čitanje)."""
    return stablo_na_portu(5173)


def preloader_ref(sistem_yml: str) -> str | None:
    """Zadana grana Preloadera u WEB-ovu poslu sistem: `inputs.preloader_ref || '<grana>'`."""
    m = re.search(r"inputs\.preloader_ref\s*\|\|\s*['\"]([^'\"]+)['\"]", sistem_yml)
    return m.group(1) if m else None


def iza_baze(ime: str, baza: str) -> str:
    """Koliko je commita HEAD stabla iza origin/<baza>; dohvaća samo tu granu."""
    stablo = LOKALNO / ime
    if not stablo.is_dir():
        return f"{ime}: ne postoji"
    try:
        subprocess.run(["git", "fetch", "-q", "origin", baza], cwd=stablo, capture_output=True, timeout=90)
        r = subprocess.run(["git", "rev-list", "--count", f"HEAD..origin/{baza}"], cwd=stablo,
                           capture_output=True, text=True, timeout=30)
        n = int(r.stdout.strip())
    except Exception as e:  # noqa: BLE001
        return f"{ime}: svježina nepoznata ({type(e).__name__})"
    return f"{ime}: svjež prema origin/{baza}" if n == 0 else         f"{ime}: UPOZORENJE {n} commita iza origin/{baza}; nove rute iz baze ovdje ne postoje"


def svjezina() -> list[str]:
    """Po jedan redak za SRV i WEB stablo stoga koje radi."""
    redovi = []
    if STANJE.is_file() and port_otvoren(4000):
        ime = json.loads(STANJE.read_text(encoding="utf-8")).get("stablo")
        if ime:
            redovi.append("SRV " + iza_baze(ime, BAZE["SRV"]))
    if port_otvoren(5173):
        ime = web_stablo()
        redovi.append("WEB " + (iza_baze(ime, BAZE["WEB"]) if ime else "stablo nepoznato (proces na 5173 nije pod _lokalno)"))
        if port_otvoren(3100) and ime:
            redovi.append("Preloader " + preloader_svjezina(ime))
    return redovi


def preloader_svjezina(web_ime: str) -> str:
    yml = LOKALNO / web_ime / ".github" / "workflows" / "sistem.yml"
    ref = preloader_ref(yml.read_text(encoding="utf-8")) if yml.is_file() else None
    if ref is None:
        return f"grana nepoznata (nema preloader_ref u {web_ime}/.github/workflows/sistem.yml)"
    ime = stablo_na_portu(3100)
    if ime is None:
        return f"stablo nepoznato (proces na 3100 nije pod _lokalno); WEB sistem uzima {ref}"
    red = iza_baze(ime, ref)
    if "UPOZORENJE" in red:
        red += f" (WEB sistem uzima {ref}: prebaci {ime}, izgradi Preloader i ponovno pokreni Preloader i edge)"
    return red


def je_spojnica(p: Path) -> bool:
    try:
        return p.is_symlink() or bool(os.readlink(p))
    except OSError:
        return False


def status() -> int:
    ram = slobodni_ram_gb()
    print(f"RAM slobodno {ram:.1f} GB" + ("  (ISPOD 1,5 GB)" if ram < MIN_RAM_GB else ""))
    for port, ime in PORTOVI.items():
        otv = port_otvoren(port)
        dod = f" http {http_status(port, HTTP[port])}" if otv and port in HTTP else ""
        print(f"  {port:>5} {ime:<22} {'radi' if otv else '-'}{dod}")
    try:
        d = subprocess.run(["docker", "ps", "--format", "{{.Names}} {{.Status}}"], capture_output=True, text=True, timeout=25)
        imena = [l for l in d.stdout.splitlines() if l.strip()]
        print(f"Docker: {len(imena)} kontejnera" + "".join(f"\n  {l[:70]}" for l in imena))
    except Exception as e:  # noqa: BLE001
        print(f"Docker: nedostupan ({type(e).__name__})")
    if STANJE.is_file():
        s = json.loads(STANJE.read_text(encoding="utf-8"))
        print(f"SRV stablo: {s.get('stablo')}, baza {s.get('baza', 'ductus')}, seed {s.get('seed', 'demo')} (pokrenuto {s.get('pokrenuto')}, log {s.get('log')})")
    else:
        print("SRV stablo: nepoznato (nije pokrenut ovim alatom)")
    for red in svjezina():
        print(red)
    return 0


def opcija(argv: list[str], ime: str) -> str | None:
    if ime not in argv:
        return None
    i = argv.index(ime)
    if i + 1 >= len(argv) or argv[i + 1].startswith("--"):
        raise SystemExit(f"{ime} traži vrijednost")
    return argv[i + 1]


def baza_za_seed(seed: str | None) -> str:
    """Ime baze za SRV: zadano `ductus`, za --seed redovni zasebna ductus_redovni."""
    if seed is None:
        return "ductus"
    if seed != "redovni":
        raise SystemExit(f"nepoznat seed: {seed} (dopušteno: redovni)")
    assert BAZA_REDOVNI not in NEDIRATI_BAZE
    return BAZA_REDOVNI


def psql(kontejner: str, baza: str, ulaz: str) -> subprocess.CompletedProcess:
    """psql preko lokalnog socketa u spremniku (seed-int04.sql to traži), kao CI-jev docker compose exec.
    Piše samo u ductus_redovni; `postgres` služi samo za DROP/CREATE te baze."""
    if baza in NEDIRATI_BAZE - {"postgres"}:
        raise SystemExit(f"ODBIJENO: alat ne piše u bazu {baza}")
    return subprocess.run(["docker", "exec", "-i", kontejner, "psql", "-U", "ductus", "-d", baza, "-v", "ON_ERROR_STOP=1", "-q"],
                          input=ulaz, capture_output=True, text=True, encoding="utf-8", timeout=180)


def kontejner_s_portom(redovi: str, port: int = 54329) -> str | None:
    """Iz `docker ps --format {{.Names}}|{{.Ports}}` bira jedini spremnik čiji je port domaćina `port`."""
    uzorak = re.compile(rf"(?:^|[\s,])(?:[\d.]+|\[[^\]]*\]):{port}->")
    imena = sorted({ime for red in redovi.splitlines() if "|" in red
                    for ime, portovi in [red.split("|", 1)] if uzorak.search(" " + portovi)})
    return imena[0] if len(imena) == 1 else None


def kontejner_baze() -> str | None:
    r = subprocess.run(["docker", "ps", "--format", "{{.Names}}|{{.Ports}}"], capture_output=True, text=True, timeout=30)
    return kontejner_s_portom(r.stdout) if r.returncode == 0 else None


def ugasi_stablo(p: subprocess.Popen) -> None:
    """Gasi samo stablo procesa koje je ovaj start pokrenuo."""
    if p.poll() is None:
        subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True, timeout=60)
        try:
            p.wait(timeout=30)
        except subprocess.TimeoutExpired:
            pass


def pripremi_redovni(kontejner: str) -> int:
    r = psql(kontejner, "postgres", f"DROP DATABASE IF EXISTS {BAZA_REDOVNI} WITH (FORCE);\nCREATE DATABASE {BAZA_REDOVNI} OWNER ductus;\n")
    if r.returncode != 0:
        print(f"ODBIJENO: stvaranje baze {BAZA_REDOVNI} nije uspjelo: {r.stderr.strip()[:300]}")
    return r.returncode


def cekaj_srv(p: subprocess.Popen, sekundi: int = 600) -> bool:
    kraj = time.time() + sekundi
    while time.time() < kraj and p.poll() is None:
        try:
            with urllib.request.urlopen("http://127.0.0.1:4000/api/v1/health", timeout=5) as o:
                if o.status == 200:
                    return True
        except Exception:  # noqa: BLE001
            pass
        time.sleep(5)
    return False


def start(argv: list[str]) -> int:
    if not argv:
        raise SystemExit("upotreba: stog.py start <stablo> [--local-iz <stablo>] [--seed redovni --web <web-stablo>]")
    stablo = stablo_iz(argv[0])
    local_iz = opcija(argv, "--local-iz")
    seed = opcija(argv, "--seed")
    baza = baza_za_seed(seed)
    seed_int04 = None
    if seed is not None:
        web = opcija(argv, "--web")
        if web is None:
            raise SystemExit("--seed redovni traži --web <web-stablo> (odatle se uzima e2e/sistem/seed-int04.sql)")
        seed_int04 = stablo_iz(web) / SEED_INT04
        if not seed_int04.is_file():
            print(f"ODBIJENO: {seed_int04} ne postoji")
            return 2
    ram = slobodni_ram_gb()
    if ram < MIN_RAM_START_GB:
        print(f"ODBIJENO: slobodno {ram:.1f} GB, za start treba {MIN_RAM_START_GB:.0f} GB")
        return 2
    if port_otvoren(4000):
        print("ODBIJENO: port 4000 je zauzet, SRV već radi (stog.py status)")
        return 2
    local = stablo / ".local"
    if je_spojnica(local):
        print(f"ODBIJENO: {local} je spojnica; lokalni S3 traži pravu mapu. Ukloni samo poveznicu (cmd rmdir) pa pokreni s --local-iz")
        return 2
    if local_iz is not None:
        izvor = stablo_iz(local_iz) / ".local"
        if local.exists():
            print(f"ODBIJENO: {local} već postoji; --local-iz ne prepisuje postojeću mapu")
            return 2
        shutil.copytree(izvor, local, symlinks=False)
        print(f"kopirano {izvor} -> {local}")
    elif not local.is_dir():
        print(f"upozorenje: {local} ne postoji; radovi zapisani iz drugog stabla dat će 409 record_mismatch (--local-iz <stablo>)")
    env = dict(os.environ)
    from urllib.parse import quote
    kontejner = None
    if seed is not None:
        kontejner = kontejner_baze()
        if kontejner is None:
            print("ODBIJENO: nije nađen jedan spremnik baze na portu 54329")
            return 2
        if pripremi_redovni(kontejner) != 0:
            return 2
        print(f"baza {BAZA_REDOVNI} stvorena iznova u {kontejner}", flush=True)
    env["DATABASE_URL"] = f"postgres://ductus:{quote(lozinka_baze(stablo), safe='')}@127.0.0.1:54329/{baza}"
    log = LOKALNO / f"srv-{stablo.name}.log"
    STANJE.write_text(json.dumps({"stablo": stablo.name, "log": str(log), "baza": baza, "seed": seed or "demo",
                                  "pokrenuto": time.strftime("%Y-%m-%d %H:%M:%S")}, ensure_ascii=False), encoding="utf-8")
    print(f"pokrećem pnpm lokalno u {stablo.name} (baza {baza}), log {log}", flush=True)
    with open(log, "w", encoding="utf-8") as out:
        p = subprocess.Popen("pnpm lokalno --izvor=http://localhost:8000", cwd=stablo, env=env, stdout=out, stderr=subprocess.STDOUT, shell=True)
        if seed_int04 is not None and kontejner is not None:
            if not cekaj_srv(p):
                print("SRV se nije podigao; seed INT-04 nije primijenjen, gasim pokrenuti SRV (vidi log)", flush=True)
                ugasi_stablo(p)
                return 1
            r = psql(kontejner, baza, seed_int04.read_text(encoding="utf-8"))
            if r.returncode != 0:
                print(f"seed INT-04 PAO, gasim pokrenuti SRV: {r.stderr.strip()[:300]}", flush=True)
                ugasi_stablo(p)
                return 1
            print("seed INT-04 primijenjen", flush=True)
        kod = p.wait()
    print(f"SRV završio, izlaz {kod}")
    return kod


UPIT_JS = r"""
const R=require("module").createRequire(process.cwd()+"/package.json");const {Client}=R("pg");
(async()=>{const c=new Client({host:"127.0.0.1",port:54329,user:"ductus",database:process.env.STOG_DB||"ductus",password:process.env.STOG_PG});
await c.connect();await c.query("BEGIN TRANSACTION READ ONLY");
for(const q of process.argv.slice(1)){try{const r=await c.query(q);console.log(JSON.stringify(r.rows).slice(0,3000))}catch(e){console.log("ERR",e.message)}}
await c.query("ROLLBACK");await c.end()})();
"""


def upit(argv: list[str]) -> int:
    if not argv:
        raise SystemExit('upotreba: stog.py upit "<sql>" [...]')
    s = json.loads(STANJE.read_text(encoding="utf-8")) if STANJE.is_file() else {}
    stablo = stablo_iz(s.get("stablo", "g-pdf"))
    env = dict(os.environ, STOG_PG=lozinka_baze(stablo), STOG_DB=s.get("baza", "ductus"))
    return subprocess.run(["node", "-e", UPIT_JS, *argv], cwd=stablo, env=env, timeout=120).returncode


def smije_gasiti(port: int, naredba: str) -> str | None:
    """Razlog odbijanja ili None. Gase se samo procesi iz stabla pod _lokalno, nikad baza u Dockeru."""
    if port == 54329:
        return "port 54329 je baza u Dockeru; alat ne zaustavlja Docker"
    if stablo_iz_naredbe(naredba) is None:
        return "proces nije pokrenut iz stabla pod _lokalno"
    return None


def stop(argv: list[str]) -> int:
    if not argv or not all(a.isdigit() for a in argv):
        raise SystemExit("upotreba: stog.py stop <port> [...]")
    kod = 0
    for port in map(int, argv):
        s = slusac(port)
        if s is None:
            print(f"{port}: nitko ne sluša")
            continue
        pid, naredba = s
        razlog = smije_gasiti(port, naredba)
        if razlog:
            print(f"{port}: ODBIJENO, {razlog}")
            kod = 2
            continue
        r = subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, text=True, timeout=30)
        for _ in range(10):
            if not port_otvoren(port):
                break
            time.sleep(0.5)
        stanje = "ugašen" if not port_otvoren(port) else "i dalje sluša"
        print(f"{port}: PID {pid} iz {stablo_iz_naredbe(naredba)} {stanje} (taskkill {r.returncode})")
        kod = kod or (0 if stanje == "ugašen" else 1)
    return kod


def samotest() -> int:
    yml = "        with:\n          ref: ${{ inputs.preloader_ref || 'migracija/nextjs' }}\n"
    assert preloader_ref(yml) == "migracija/nextjs"
    assert preloader_ref('ref: ${{ inputs.preloader_ref || "main" }}') == "main"
    assert preloader_ref("ref: main") is None
    nxt = r'node "D:\Ductura\_lokalno\g-pre64\node_modules\.bin\..\next\dist\bin\next" start -p 3100'
    assert stablo_iz_naredbe(nxt) == "g-pre64"
    assert stablo_iz_naredbe(r"node D:\Ductura\_lokalno\_alati\x.mjs") is None
    assert smije_gasiti(3100, nxt) is None
    assert smije_gasiti(54329, nxt) is not None
    assert smije_gasiti(8000, r"node C:\Users\x\krug.mjs") is not None
    assert baza_za_seed(None) == "ductus" and baza_za_seed("redovni") == BAZA_REDOVNI
    for los in ("demo", "ductus_pr693_2511"):
        try:
            baza_za_seed(los)
            raise AssertionError(los)
        except SystemExit:
            pass
    for zabranjena in ("ductus", "ductus_legal", "ductus_pr693_2511"):
        try:
            psql("x", zabranjena, "")
            raise AssertionError(zabranjena)
        except SystemExit:
            pass
    assert kontejner_s_portom("ductura-server-postgres-main-1|127.0.0.1:54329->5432/tcp") == "ductura-server-postgres-main-1"
    assert kontejner_s_portom("a|0.0.0.0:54329->5432/tcp, [::]:54329->5432/tcp") == "a"
    assert kontejner_s_portom("a|0.0.0.0:32768->54329/tcp") is None
    assert kontejner_s_portom("a|0.0.0.0:543290->5432/tcp") is None
    assert kontejner_s_portom("a|127.0.0.1:54329->5432/tcp\nb|127.0.0.1:54329->5432/tcp") is None
    assert opcija(["g-x", "--seed", "redovni", "--web", "g-w"], "--web") == "g-w" and opcija(["g-x"], "--seed") is None
    try:
        opcija(["g-x", "--seed", "--web", "g-w"], "--seed")
        raise AssertionError("prazna opcija")
    except SystemExit:
        pass
    print("samotest prolazi")
    return 0


def main() -> int:
    naredbe = {"status": lambda: status(), "start": lambda: start(sys.argv[2:]), "upit": lambda: upit(sys.argv[2:]),
               "stop": lambda: stop(sys.argv[2:]), "samotest": samotest}
    if len(sys.argv) < 2 or sys.argv[1] not in naredbe:
        print(__doc__)
        return 1
    if sys.argv[1] != "samotest":
        IZLAZ.mkdir(parents=True, exist_ok=True)
    return naredbe[sys.argv[1]]()


if __name__ == "__main__":
    sys.exit(main())

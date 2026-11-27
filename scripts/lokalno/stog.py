"""stog: lokalni stog Ducture za graditelja (izmišljeni podaci, samo lokalno).

Upotreba (C:\\Python314\\python.exe, PYTHONIOENCODING=utf-8):
  stog.py status                 RAM, portovi, Docker, iz kojeg stabla rade SRV i WEB i
                                 koliko su commita iza svoje baze (zastarjela kopija daje
                                 „Stranica ne postoji” za rute koje su u bazi već spojene)
  stog.py start <stablo> [--local-iz <stablo>]
                                 pokreće `pnpm lokalno` u stablu i ostaje u prvom planu;
                                 pokreći kao pozadinski Bash zadatak (odvojeni proces tiho umre)
  stog.py upit "<sql>" [...]     upit u glavnu bazu stoga, samo za čitanje (READ ONLY transakcija)
  stog.py docker-upali           pali Docker Desktop i kontejner baze (start to radi sam)
  stog.py docker-ugasi           gasi kontejner baze i Docker Desktop kad stog ne radi

Pravila ugrađena u alat:
  - lozinka baze čita se iz compose.yaml u memoriju i ide samo u okolinu procesa; nikad se ne ispisuje
  - start traži >= 4 GB slobodnog RAM-a i slobodan port 4000
  - lokalni S3 (.local) mora biti prava mapa, ne spojnica; --local-iz radi pravu kopiju
  - Daniel 27. 11.: kad stog ne radi, Docker se gasi; start ga pali sam
  - docker-ugasi odbija ako radi ijedan port stoga, ako bazu koristi neki klijent ili ako
    radi neki drugi kontejner; alat ne zaustavlja procese koje nije pokrenuo
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
# Daniel 27. 11.: jednokratno niži prag uz STOG_MIN_RAM_START_GB (ne ispod 1,5 GB)
MIN_RAM_START_GB = max(1.5, float(os.environ.get("STOG_MIN_RAM_START_GB", "4.0")))
MIN_RAM_GB = 1.5
# Baza grane iz koje radna stabla stoga moraju biti svježa.
BAZE = {"SRV": "migracija/kopija-ductus-backend", "WEB": "migracija/kopija-ductus-front"}


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


def web_stablo() -> str | None:
    """Stablo iz kojeg radi WEB: naredbeni redak procesa koji sluša na 5173 (samo čitanje)."""
    ps = ("$c=Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue|Select-Object -First 1;"
          "if($c){(Get-CimInstance Win32_Process -Filter \"ProcessId=$($c.OwningProcess)\").CommandLine}")
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True, timeout=30)
        return stablo_iz_naredbe(r.stdout)
    except Exception:  # noqa: BLE001
        return None


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
    return redovi


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
        print(f"SRV stablo: {s.get('stablo')} (pokrenuto {s.get('pokrenuto')}, log {s.get('log')})")
    else:
        print("SRV stablo: nepoznato (nije pokrenut ovim alatom)")
    for red in svjezina():
        print(red)
    return 0


BAZA_KONTEJNER = "ductura-server-postgres-main-1"


def docker_radi() -> bool:
    try:
        return subprocess.run(["docker", "info", "--format", "{{.ServerVersion}}"], capture_output=True, text=True, timeout=90).returncode == 0
    except Exception:  # noqa: BLE001
        return False


def docker_upali() -> int:
    if not docker_radi():
        print("palim Docker Desktop…", flush=True)
        subprocess.run(["docker", "desktop", "start", "--timeout", "240"], capture_output=True, text=True, timeout=300)
        for _ in range(60):
            if docker_radi():
                break
            time.sleep(4)
        else:
            print("ODBIJENO: Docker se nije upalio u 4 minute")
            return 2
    if not port_otvoren(54329):
        r = subprocess.run(["docker", "start", BAZA_KONTEJNER], capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            print(f"ODBIJENO: kontejner baze se nije pokrenuo ({r.stderr.strip()[:200]})")
            return 2
        for _ in range(30):
            if port_otvoren(54329):
                break
            time.sleep(2)
    print("Docker i baza rade")
    return 0


def docker_ugasi() -> int:
    if not docker_radi():
        print("Docker već ne radi")
        return 0
    zauzeti = [f"{p} {i}" for p, i in PORTOVI.items() if p != 54329 and port_otvoren(p)]
    if zauzeti:
        print("ODBIJENO: stog još radi: " + ", ".join(zauzeti))
        return 2
    d = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True, timeout=30)
    drugi = [n for n in d.stdout.split() if n != BAZA_KONTEJNER]
    if drugi:
        print("ODBIJENO: rade drugi kontejneri: " + ", ".join(drugi))
        return 2
    if BAZA_KONTEJNER in d.stdout.split():
        q = "select count(*) from pg_stat_activity where backend_type='client backend' and pid<>pg_backend_pid()"
        r = subprocess.run(["docker", "exec", BAZA_KONTEJNER, "psql", "-U", "ductus", "-d", "ductus", "-tAc", q], capture_output=True, text=True, timeout=60)
        if r.returncode != 0 or r.stdout.strip() != "0":
            print(f"ODBIJENO: bazu koristi klijent ili provjera nije uspjela ({(r.stdout or r.stderr).strip()[:80]})")
            return 2
        subprocess.run(["docker", "stop", BAZA_KONTEJNER], capture_output=True, text=True, timeout=120)
    subprocess.run(["docker", "desktop", "stop", "--timeout", "120"], capture_output=True, text=True, timeout=180)
    print("Docker ugašen" if not docker_radi() else "upozorenje: Docker još radi")
    return 0


def start(argv: list[str]) -> int:
    if not argv:
        raise SystemExit("upotreba: stog.py start <stablo> [--local-iz <stablo>]")
    stablo = stablo_iz(argv[0])
    local_iz = argv[argv.index("--local-iz") + 1] if "--local-iz" in argv else None
    ram = slobodni_ram_gb()
    if ram < MIN_RAM_START_GB:
        print(f"ODBIJENO: slobodno {ram:.1f} GB, za start treba {MIN_RAM_START_GB:.0f} GB")
        return 2
    if port_otvoren(4000):
        print("ODBIJENO: port 4000 je zauzet, SRV već radi (stog.py status)")
        return 2
    if docker_upali() != 0:
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
    env["DATABASE_URL"] = f"postgres://ductus:{quote(lozinka_baze(stablo), safe='')}@127.0.0.1:54329/ductus"
    log = LOKALNO / f"srv-{stablo.name}.log"
    STANJE.write_text(json.dumps({"stablo": stablo.name, "log": str(log), "pokrenuto": time.strftime("%Y-%m-%d %H:%M:%S")}, ensure_ascii=False), encoding="utf-8")
    print(f"pokrećem pnpm lokalno u {stablo.name}, log {log}", flush=True)
    with open(log, "w", encoding="utf-8") as out:
        p = subprocess.Popen("pnpm lokalno --izvor=http://localhost:8000", cwd=stablo, env=env, stdout=out, stderr=subprocess.STDOUT, shell=True)
        kod = p.wait()
    print(f"SRV završio, izlaz {kod}")
    return kod


UPIT_JS = r"""
const R=require("module").createRequire(process.cwd()+"/package.json");const {Client}=R("pg");
(async()=>{const c=new Client({host:"127.0.0.1",port:54329,user:"ductus",database:"ductus",password:process.env.STOG_PG});
await c.connect();await c.query("BEGIN TRANSACTION READ ONLY");
for(const q of process.argv.slice(1)){try{const r=await c.query(q);console.log(JSON.stringify(r.rows).slice(0,3000))}catch(e){console.log("ERR",e.message)}}
await c.query("ROLLBACK");await c.end()})();
"""


def upit(argv: list[str]) -> int:
    if not argv:
        raise SystemExit('upotreba: stog.py upit "<sql>" [...]')
    stablo = stablo_iz(json.loads(STANJE.read_text(encoding="utf-8"))["stablo"]) if STANJE.is_file() else stablo_iz("g-pdf")
    env = dict(os.environ, STOG_PG=lozinka_baze(stablo))
    return subprocess.run(["node", "-e", UPIT_JS, *argv], cwd=stablo, env=env, timeout=120).returncode


def main() -> int:
    IZLAZ.mkdir(parents=True, exist_ok=True)
    naredbe = {
        "status": lambda: status(),
        "start": lambda: start(sys.argv[2:]),
        "upit": lambda: upit(sys.argv[2:]),
        "docker-upali": docker_upali,
        "docker-ugasi": docker_ugasi,
    }
    if len(sys.argv) < 2 or sys.argv[1] not in naredbe:
        print(__doc__)
        return 1
    return naredbe[sys.argv[1]]()


if __name__ == "__main__":
    sys.exit(main())

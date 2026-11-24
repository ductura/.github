"""tok: provjere graditelja sa sažetim ispisom.

Upotreba (C:\\Python314\\python.exe, PYTHONIOENCODING=utf-8):
  tok.py korak <ime> [--sve] [--timeout 200]
      korak iz koraci.mjs u pravom pregledniku nad stogom. Ispis bez RESP redaka s 2xx (--sve: sve).
      Izlaz: 0 korak prošao do kraja, 1 greška u koraku, 2 nepoznat korak, 3 PRIJAVA (nije pad proizvoda), 4 stog ne radi
  tok.py testovi <stablo> [argumenti za vitest ...]
      `npx vitest run` u stablu; ispisuje zbroj, nove padove i poznate padove (poznati-padovi.json) odvojeno.
      Izlaz 0 ako nema novih padova. Odbija tests/db dok port 54329 drži baza stoga.

Teška provjera: samo jedna istovremeno; pokreći kao pozadinski Bash zadatak.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from stog import IZLAZ, LOKALNO, MIN_RAM_GB, port_otvoren, slobodni_ram_gb, stablo_iz  # noqa: E402

ALATI = Path(__file__).parent
POZNATI = json.loads((ALATI / "poznati-padovi.json").read_text(encoding="utf-8"))
ANSI = re.compile(r"\x1b\[[0-9;]*m")


def provjeri_ram() -> bool:
    ram = slobodni_ram_gb()
    if ram < MIN_RAM_GB:
        print(f"ODBIJENO: slobodno {ram:.1f} GB, ispod {MIN_RAM_GB} GB")
        return False
    return True


def korak(argv: list[str]) -> int:
    if not argv:
        raise SystemExit("upotreba: tok.py korak <ime> [--sve] [--timeout 200]")
    if not provjeri_ram():
        return 4
    if not (port_otvoren(8000) and port_otvoren(4000)):
        print("STOG: Edge (8000) ili SRV (4000) ne radi; stog.py status")
        return 4
    t = int(argv[argv.index("--timeout") + 1]) if "--timeout" in argv else 200
    try:
        kod = subprocess.run(["node", str(ALATI / "tok-preglednik.mjs"), argv[0]], cwd=ALATI, timeout=t).returncode
    except subprocess.TimeoutExpired:
        kod = 1
        print(f"ISTEKLO nakon {t} s")
    zapis = (IZLAZ / "korak.txt").read_text(encoding="utf-8") if (IZLAZ / "korak.txt").is_file() else ""
    for red in zapis.splitlines():
        if "--sve" not in argv and red.startswith("RESP "):
            m = re.search(r" (\d{3}) \d+$", red)
            if m and m.group(1).startswith("2"):
                continue
        print(red[:250])
    print({0: "KORAK GOTOV", 1: "GREŠKA U KORAKU (slika: izlaz/greska.png)", 2: "NEPOZNAT KORAK", 3: "PRIJAVA NIJE USPJELA (nije pad proizvoda)"}.get(kod, f"izlaz {kod}"))
    return kod


def testovi(argv: list[str]) -> int:
    if not argv:
        raise SystemExit("upotreba: tok.py testovi <stablo> [argumenti za vitest ...]")
    stablo = stablo_iz(argv[0]) if (LOKALNO / argv[0] / "compose.yaml").is_file() else Path(argv[0]) if Path(argv[0]).is_absolute() else LOKALNO / argv[0]
    args = argv[1:]
    if port_otvoren(54329) and (not args or any("tests/db" in a or a.rstrip("/") == "tests" for a in args)):
        print("ODBIJENO: tests/db bi pisali u bazu stoga (127.0.0.1:54329). Navedi putanje bez tests/db; tests/db ostaju CI-u.")
        return 2
    if not provjeri_ram():
        return 2
    log = IZLAZ / f"testovi-{stablo.name}.log"
    # WEB keeps vitest in packages/app, not at the root of the tree.
    mjesto = next((m for m in (stablo, stablo / "packages" / "app") if (m / "node_modules" / ".bin" / "vitest").exists()), stablo)
    with open(log, "w", encoding="utf-8") as out:
        kod = subprocess.run(" ".join(["npx", "vitest", "run", *args]), cwd=mjesto, stdout=out, stderr=subprocess.STDOUT, shell=True).returncode
    tekst = ANSI.sub("", log.read_text(encoding="utf-8", errors="replace"))
    padovi = sorted({m.group(1).strip() for m in re.finditer(r"^\s*FAIL\s+(?:\|[^|]+\|\s+)?(.+?)\s*$", tekst, re.M) if ">" in m.group(1)})
    poznati, novi = [], []
    for p in padovi:
        z = next((k for k in POZNATI if re.search(k["uzorak"], p)), None)
        (poznati if z else novi).append((p, z))
    for red in tekst.splitlines():
        if re.match(r"^\s*(Test Files|Tests)\s", red):
            print(red.strip())
    for p, _ in novi:
        print(f"NOVI PAD  {p[:200]}")
    for p, z in poznati:
        print(f"poznat    {p[:120]}  ({z['razlog'][:60]})")
    if kod != 0 and not padovi:
        print(f"vitest izlaz {kod} bez prepoznatih padova; log {log}")
        return kod
    print(f"novih padova: {len(novi)}, poznatih: {len(poznati)}; log {log}")
    return 1 if novi else 0


def main() -> int:
    IZLAZ.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if len(sys.argv) < 2 or sys.argv[1] not in {"korak", "testovi"}:
        print(__doc__)
        return 1
    return korak(sys.argv[2:]) if sys.argv[1] == "korak" else testovi(sys.argv[2:])


if __name__ == "__main__":
    sys.exit(main())

"""cuvar: zajednički RAM čuvar za teške lokalne provjere (build, e2e, testovi).

Upotreba (C:\\Python314\\python.exe, PYTHONIOENCODING=utf-8):
  cuvar.py [--prag 1.5] [--start 4] [--log <datoteka>] -- <naredba ...>
  cuvar.py samotest

Pokreće naredbu i svake 2 s mjeri slobodni RAM. Ako slobodni RAM padne ispod praga
(zadano 1,5 GB), gasi stablo procesa koje je sam pokrenuo i izlazi s kodom 3. Ne dira
nijedan drugi proces. Prije pokretanja traži barem --start GB slobodno (zadano 4 GB, kao
pravilo za e2e i buildove), inače odbija s kodom 2. Inače vraća izlazni kod naredbe.
Na kraju javlja najmanji izmjereni slobodni RAM, da se vidi koliko je bilo blizu.

Zamjenjuje ručne petlje „mjeri RAM pa ubij” u pojedinim sesijama.
"""
from __future__ import annotations

import ctypes
import subprocess
import sys
import time

KORAK_S = 2.0


def slobodni_ram_gb() -> float:
    class MS(ctypes.Structure):
        _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong), ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong), ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong), ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
    m = MS()
    m.dwLength = ctypes.sizeof(MS)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return m.ullAvailPhys / 1024**3


def argumenti(argv: list[str]) -> tuple[float, float, str | None, list[str]]:
    """(prag, start, log, naredba). Naredba je sve iza `--`."""
    if "--" not in argv:
        raise ValueError("upotreba: cuvar.py [--prag 1.5] [--start 4] [--log <datoteka>] -- <naredba ...>")
    i = argv.index("--")
    opcije, naredba = argv[:i], argv[i + 1:]
    if not naredba:
        raise ValueError("nedostaje naredba iza --")
    vrijednosti = {"--prag": "1.5", "--start": "4", "--log": None}
    j = 0
    while j < len(opcije):
        if opcije[j] not in vrijednosti or j + 1 >= len(opcije):
            raise ValueError(f"nepoznata ili nepotpuna opcija: {opcije[j]}")
        vrijednosti[opcije[j]] = opcije[j + 1]
        j += 2
    prag = float(vrijednosti["--prag"])
    start = float(vrijednosti["--start"])
    if prag < 1.5:
        raise ValueError("prag ispod 1,5 GB nije dopušten (pravilo RAM-a)")
    if start < prag:
        raise ValueError("--start ne smije biti manji od --prag")
    return prag, start, vrijednosti["--log"], naredba


def presuda(slobodno: float, prag: float) -> bool:
    """True kad treba gasiti."""
    return slobodno < prag


def ugasi_stablo(pid: int) -> int:
    return subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, text=True, timeout=30).returncode


def pokreni(argv: list[str]) -> int:
    try:
        prag, start, log, naredba = argumenti(argv)
    except ValueError as e:
        print(e)
        return 1
    ram = slobodni_ram_gb()
    if ram < start:
        print(f"cuvar: ODBIJENO, slobodno {ram:.1f} GB, za pokretanje treba {start:.1f} GB")
        return 2
    izlaz = open(log, "w", encoding="utf-8") if log else None
    print(f"cuvar: pokrećem uz {ram:.1f} GB slobodno, prag {prag:.1f} GB", flush=True)
    p = subprocess.Popen(" ".join(naredba) if len(naredba) == 1 else naredba, shell=len(naredba) == 1,
                         stdout=izlaz, stderr=subprocess.STDOUT if izlaz else None)
    najmanje = ram
    try:
        while p.poll() is None:
            time.sleep(KORAK_S)
            ram = slobodni_ram_gb()
            najmanje = min(najmanje, ram)
            if presuda(ram, prag) and p.poll() is None:
                kod = ugasi_stablo(p.pid)
                p.wait(timeout=30)
                print(f"cuvar: UGAŠENO, slobodno {ram:.2f} GB < {prag:.1f} GB (taskkill {kod}); najmanje {najmanje:.2f} GB")
                return 3
    finally:
        if izlaz:
            izlaz.close()
    print(f"cuvar: naredba završila s {p.returncode}; najmanje slobodno {najmanje:.2f} GB")
    return p.returncode


def samotest() -> int:
    assert argumenti(["--", "pnpm", "build"]) == (1.5, 4.0, None, ["pnpm", "build"])
    assert argumenti(["--prag", "2", "--start", "3", "--log", "x.log", "--", "a"]) == (2.0, 3.0, "x.log", ["a"])
    for los in (["pnpm"], ["--"], ["--prag", "1", "--", "a"], ["--start", "1", "--", "a"], ["--x", "1", "--", "a"], ["--prag", "--", "a"]):
        try:
            argumenti(los)
        except ValueError:
            continue
        raise AssertionError(los)
    assert presuda(1.4, 1.5) and not presuda(1.5, 1.5) and not presuda(3.0, 1.5)
    print("samotest prolazi")
    return 0


def main() -> int:
    if len(sys.argv) >= 2 and sys.argv[1] == "samotest":
        return samotest()
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    return pokreni(sys.argv[1:])


if __name__ == "__main__":
    sys.exit(main())

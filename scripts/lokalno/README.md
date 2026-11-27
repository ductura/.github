# Alati graditelja za lokalni stog

Alati provjeravaju Ducturu na lokalnom stogu (SRV, Preloader, Edge, WEB, baza u Dockeru) i rade samo s izmišljenim podacima. Nastali su iz privremenih skripti tijekom INT-31 (24. 11. 2026.).

Pokreću se s Pythonom 3.12+ uz `PYTHONIOENCODING=utf-8`. Radna stabla, zapisi i stanje stoga nisu u repou nego u mapi `DUCTURA_LOKALNO` (zadano `D:\Ductura\_lokalno`). Zapisi idu u `_alati/izlaz/`, a stanje SRV-a u `_alati/stanje.json`.

| Naredba | Što radi |
|---|---|
| `stog.py status` | Prikazuje slobodni RAM, portove (SRV 4000, Preloader 3100, Edge 8000, WEB 5173, baza 54329, OIDC 8090), Docker i stablo iz kojeg radi SRV. |
| `stog.py start <stablo> [--local-iz <stablo>]` | Pokreće `pnpm lokalno`. Odbija ako je slobodno manje od 4 GB RAM-a, ako je port 4000 zauzet ili ako je `.local` spojnica. `--local-iz` radi pravu kopiju lokalnog S3. Pokreni ga kao pozadinski zadatak. |
| `stog.py upit "<sql>"` | Upit u bazu stoga samo za čitanje (`READ ONLY` transakcija). |
| `cuvar.py [--prag 1.5] [--start 4] [--log f] -- <naredba>` | Zajednički RAM čuvar za teške provjere. Odbija pokretanje ispod `--start` GB (izlaz 2), a stablo procesa koje je sam pokrenuo gasi kad slobodni RAM padne ispod praga (izlaz 3). Druge procese ne dira. Inače vraća izlaz naredbe i javlja najmanji izmjereni slobodni RAM. Prag ispod 1,5 GB nije dopušten. |
| `tok.py korak <ime>` | Pokreće korak iz `koraci.mjs` u pravom pregledniku (Playwright iz WEB stabla, `TOK_WEB`). Izlaz: 0 gotovo, 1 greška u koraku, 2 nepoznat korak, 3 neuspjela prijava (nije pad proizvoda), 4 stog ne radi. |
| `tok.py testovi <stablo> [putanje]` | Pokreće vitest i odvaja nove padove od poznatih (`poznati-padovi.json`). Odbija `tests/db` dok port 54329 drži baza stoga. |
| `graditelj.py pocetak` | Jedan sažet pregled nakon pokretanja sesije ili kompresije konteksta: kontrolna točka, RAM i stog, CI PR-ova iz točke, stanje radnih stabala i poruke za graditelja na Ductus #2055 od zadnjeg čitanja. |
| `graditelj.py zapis polje=… +pr=web#638 +stablo=g-x` | Ažurira kontrolnu točku `_alati/graditelj.json` (zadatak, korak, sljedece, blokada, PR-ovi, stabla). Točka nije izvor istine; zadatak i status vode Linear i #2055. |
| `graditelj.py ci <repo#broj>` | Neuspjele provjere PR-a i prvi redovi greške iz loga posla. |
| `graditelj.py prati [minuta]` | Petlja za Monitor: ispisuje red samo kad se promijeni CI zaključak PR-a ili stog ili stigne poruka za graditelja; sama završava (zadano 25 min). Samo čita. |
| `ci.py mjeri <cilj> [...] [--koraci N]` | Trajanje CI pokreta po workflowu: ukupno, najsporiji poslovi, čekanje na runner. Cilj je `web#748`, `web@<run_id>` ili `web:<grana>`. Više ciljeva daje usporedbu. Samo čita. |
| `ci.py cekaj <repo#broj> [--max min]` | Čeka da sve provjere PR-a završe i ispiše sažetak. Izlaz: 0 prolaz (po ci-ok), 1 pad, 2 isteklo vrijeme, 3 nema provjera. Samo čita. |
| `ci.py testovi <mapa> <datoteke…>` | `node --test` s Git Bashom na PATH-u (WSL bash daje lažne padove). Kad mapa nema `node_modules`, privremeno se spaja na `g-teza-web` i spojnica se poslije briše. Treba barem 1,5 GB slobodnog RAM-a. |

Provjere koje troše memoriju (`korak`, `testovi`) traže najmanje 1,5 GB slobodnog RAM-a, a `start` najmanje 4 GB.

Ugrađena pravila:
- Lozinka baze ne ispisuje se nikad. Čita se iz `compose.yaml` i ide samo u okolinu procesa.
- Tokeni poveznica ne pojavljuju se u zapisima.
- Alat ne gasi Docker ni procese koje nije sam pokrenuo.

## Koraci

Novi korak u pregledniku dodaje se kao nova metoda u `steps` u datoteci `koraci.mjs`. Koraci `predaj` i `predajtezu` pišu u lokalnu bazu stoga (predaja izmišljenog rada). Ostali koraci samo čitaju.

## Što provjerava CI

CI (`node --test scripts/*.test.mjs`) pokreće samo `scripts/lokalno-alati.test.mjs`. Taj test provjerava da tokeni ne ulaze u zapis, da nepoznat korak završava izlazom 2 bez preglednika da su uzorci u `poznati-padovi.json` ispravni i da prolaze `graditelj.py samotest` i `ci.py samotest` (čiste funkcije, bez mreže; preskače se ako nema Pythona). Ostali Python dio (`stog.py`, `tok.py`, mrežni dio `graditelj.py`) i sami koraci provjereni su samo ručno nad lokalnim stogom.

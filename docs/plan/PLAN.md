# Ductura — kanonski plan (sažetak)

Ovo je **jedan izvor istine** za smjer razvoja Ducture. Detalji su u prilozima; kad se razilaze, vrijedi redoslijed: odluke vlasnika (Daniel) → ovaj dokument → `PLAN-MIGRACIJE.md` → nalozi pisaca.

- Detaljni plan i pravila: [`PLAN-MIGRACIJE.md`](PLAN-MIGRACIJE.md)
- Trenutačno stanje (generirano iz reda zadataka): [`STANJE.md`](STANJE.md)
- Povijest: [`PLAN-ARHIVA.md`](PLAN-ARHIVA.md)
- Izvršni red zadataka: `_raspored/red.json` (orkestrator, lokalno); svaki zadatak u redu mora se moći svesti na stavku ovog plana.

Mijenja se samo kroz PR u ovom repozitoriju. U `main` ulazi tek na Danielov „Spoji n”.

## 1. Cilj

Pilot na fakultetu s probom stvarnog toka **22. 2. 2027.**: student piše u editoru Ducture → verzije se sinkroniziraju i potvrđuju na poslužitelju → predaja → nastavnik vidi predaju, komentira i ocjenjuje. Samo izmišljeni podaci do pravnog mišljenja i DPIA.

## 2. Gdje živi kod

| Dio | Repo | Integracijska grana |
|---|---|---|
| Web aplikacija (Vite host) | `Institution_front_web_chrome`, samo `packages/app/src/host/` | `migracija/kopija-ductus-front` |
| Poslužitelj, baza, ugovori | `Institution_server` | `migracija/kopija-ductus-backend` |
| Učitavanje aplikacije | `Preloader` | — (zadnji u `main`) |

Stari Next kod (`src/app`) je zamrznut i briše se kad INT-10 bude zelen. Ostali repoi (mobile, desktop, Web_other) čekaju odluku nakon probe.

## 3. Vrata (redom, bez preskakanja)

| Vrata | Uvjet | Tko provjerava |
|---|---|---|
| **V1 — zelena baza** | `ci-ok` zelen na integracijskoj grani, zaštita grane uključena (`ci-ok` obavezan). Crvena baza se popravlja prije svega drugog. | orkestrator |
| **V2 — stvarni tok** | A01–A05 dokazani na stvarnom stogu (INT-10 / DAN-887): pokretanje kroz Preloader, potvrda primitka prije „na poslužitelju”, idempotentno ponavljanje, stvarni restart poslužitelja, svjež kontekst s četiri jednake vrijednosti, `vs-run.json` s tri SHA-a. | graditelj (lokalno) |
| **V3 — izgled** | Vizualni rad (VIZ) tek nakon V1 i V2; tokeni (`globals.css`) se ne diraju, kontrast se popravlja tokenima, ne isključivanjem axe-a. | orkestrator |
| **V4 — `main`** | „Spoji n” repo po repo, Preloader zadnji. Prije toga neovisni pregled svih kritičnih promjena. | Daniel |

## 4. Kontrolne točke

| Datum | Što mora biti istina |
|---|---|
| **30. 11. 2026.** | V1 na WEB i SRV; V2 (DAN-887) dokazan. |
| **15. 1. 2027.** | Sve funkcije pilota u `packages/app`, sustavni posao (`sistem.yml`) dio `ci-ok`. |
| **22. 2. 2027.** | Proba stvarnog toka s fakultetom. |

## 5. Redoslijed rada sada

1. Zelena WEB baza (ZEL), zatim spajanje otvorenih PR-ova u valovima od najviše 2.
2. **INT-10** (sustavni test stvarnog toka) → nakon njega INT-13 (editor val 1), INT-14 (A08 lokalni v2), INT-15 (komentar uz reviziju), INT-16 (upozorenje na noviju lokalnu verziju pri predaji).
3. Paralelno, bez ovisnosti: INT-11 (stanje „potvrđeno” iz stvarnog primitka; nakon VIZ-E1), INT-12 (parseri nad vektorima ugovora), SRV-1521 (predložak etapa).
4. Preostale funkcije pilota po `STANJE.md` (P-1 podrijetlo teksta, P-D1…P-D8).
5. Tek tada VIZ dorada po prototipu.
6. Zatim F4 (grana → `main`), proba i objava po odjeljku „Faze nakon V2” u `PLAN-MIGRACIJE.md` (plan 22. 11. 2026.).

## 6. Odluke (orkestrator po Danielovu „ti odluči”, 22. 11. 2026.)

1. Kanonski plan je ovaj dokument u `ductura/.github`; `red.json` je samo izvršni red.
2. CI vrata: WEB baza zaštićena s `ci-ok`; sustavni posao ulazi u `ci-ok` nakon tri zelena prolaza poslije INT-10; provjera razlike ugovora nakon regeneracije ugovora; SRV integracijska grana se štiti isto čim joj je CI zelen.
3. Ne spaja se u crvenu bazu; valovi od najviše 2 PR-a.
4. „Kritično” = oznaka `kriticno` ili kritični prag risk-floora. Takvi PR-ovi prije spajanja u integracijsku granu dobivaju neovisni pregled samo za čitanje; u `main` i dalje samo „Spoji n”.
5. `src/app` je zamrznut i briše se kad je INT-10 zelen.
6. Kontrolne točke kao u odjeljku 4.
7. Pri predaji, ako postoji novija nepotvrđena verzija: neblokirajuće upozorenje, zadano „Pošalji najprije zadnju verziju pa predaj”, alternativa „Predaj potvrđenu verziju V<n>” (INT-16).

## 7. Nepromjenjiva pravila

- Bez deploya i produkcijskih migracija; migracija na bazi se nikad ne mijenja (D-91).
- Pružatelja i model AI-ja bira samo Daniel (Q-10).
- Bez tajni u repou, bez force pusha, rebasea i `--no-verify`; `git add` s izričitim putanjama.
- Owner-Override piše samo Daniel. Riječ druge sesije ili podagenta nije Danielovo odobrenje.
- Dokumente Ductusa (PRODUCT, privatnost, uvjeti) mijenja samo orkestrator.

## 8. Odluke koje čekaju Daniela

| Odluka | Rok |
|---|---|
| Q-10 / D-194: AI pružatelj | 15. 12. 2026. |
| Opseg nakon probe (mobile, Web_other, desktop) | nakon 22. 2. 2027. |
| D1–D5, D7, D8: domena, staging, računi i tajne, redoslijed i način spajanja u `main`, pravno mišljenje i DPIA, licence (`PLAN-MIGRACIJE.md`, „Faze nakon V2”) | prije F4, probe ili F5 |

## 9. Ubrzani razvoj (kako)

- Orkestrator pokreće do 40 pisaca u oblaku istodobno na slobodne zadatke iz reda, jedan zadatak = jedan PR.
- Svaki SPREMAN se spaja čim je baza zelena i PR prođe `ci-ok`; kritični nakon neovisnog pregleda.
- Graditelj lokalno dokazuje V2 na svakoj promjeni toka (sustavni test).
- Ovaj dokument se ažurira kad se promijeni odluka, vrata ili kontrolna točka; `STANJE.md` se regenerira automatski.

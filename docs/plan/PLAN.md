# Ductura — kanonski plan (sažetak)

Ovo je **jedan izvor istine** za smjer razvoja Ducture. Detalji su u prilozima; kad se razilaze, vrijedi redoslijed: odluke vlasnika (Daniel) → ovaj dokument → `PLAN-MIGRACIJE.md` → nalozi pisaca.

- Detaljni plan i pravila: [`PLAN-MIGRACIJE.md`](PLAN-MIGRACIJE.md)
- Trenutačno stanje (generirano iz reda zadataka): [`STANJE.md`](STANJE.md)
- Povijest: [`PLAN-ARHIVA.md`](PLAN-ARHIVA.md)
- Izvršni red zadataka: `_raspored/red.json` (orkestrator, lokalno); svaki zadatak u redu mora se moći svesti na stavku ovog plana.

Mijenja se samo kroz PR u ovom repozitoriju. U `main` ulazi tek na Danielov „Spoji n”.

## 1. Cilj

Pilot na fakultetu s probom stvarnog toka **22. 2. 2027.**: student piše u editoru Ducture → verzije se sinkroniziraju i potvrđuju na poslužitelju → predaja → nastavnik vidi predaju, komentira i daje povratnu informaciju; ocjena se upisuje u Merlinu (NF-5, PG-10). Samo izmišljeni podaci do pravnog mišljenja i DPIA.

**Opseg pilota (Daniel 24. 11.: „sve što je sada u pilotu ostaje u pilotu”):** opseg se ne smanjuje. Mijenja se samo redoslijed (odjeljak 5). U pilot ne ulazi ništa novo; nove ideje idu na popis „nakon pilota” u [`PRIJEDLOZI-2411.md`](PRIJEDLOZI-2411.md).

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
| **V2 — stvarni tok** | A01–A05 dokazani na stvarnom stogu (INT-10 / DAN-887): pokretanje kroz Preloader, potvrda primitka prije „na poslužitelju”, idempotentno ponavljanje, stvarni restart poslužitelja, svjež kontekst s četiri jednake vrijednosti, `vs-run.json` s tri SHA-a. Dokaz vrijedi samo kao `ok: true` na **trenutnim** glavama, spremljen u bazu PR-om; zeleni run na starijoj trojci ne vrijedi. | graditelj (lokalno) |
| **V3 — izgled** | Vizualni rad (VIZ) tek nakon V1 i V2; tokeni (`globals.css`) se ne diraju, kontrast se popravlja tokenima, ne isključivanjem axe-a. | orkestrator |
| **V4 — `main`** | „Spoji n” repo po repo, Preloader zadnji. Prije toga neovisni pregled svih kritičnih promjena. | Daniel |

## 4. Kontrolne točke

| Datum | Što mora biti istina |
|---|---|
| **30. 11. 2026.** | V1 na WEB i SRV; V2 (DAN-887) dokazan. |
| **15. 1. 2027.** | Tokovi probe A01–A10 rade na stvarnom stogu i prikazuju istinu; stavke stupca „nužno za probu” (40) gotove; sustavni posao (`sistem.yml`) dio `ci-ok`. |
| **22. 2. 2027.** | Proba stvarnog toka s fakultetom. Ostale stavke pilota (stupac „nakon 15. 1.”, 73) koje do tada nisu gotove isporučuju se tijekom pilota, po redu iz odjeljka 5; ne izbacuju se iz opsega. |

Procjena (analiza 24. 11., `_analiza/nalog-2411/02c`): pilot traži oko 273–524 jedinice (jedinica = jedna večer rada), a do 15. 1. je realno 55–65. Zato vrijedi redoslijed, a ne rez: „nužno” prvo, ostalo poslije. Procjena kapaciteta se provjerava na svakoj kontrolnoj točki prema stvarno spojenom poslu.

## 5. Redoslijed rada sada

Pojedini zadaci i njihovo stanje su u `STANJE.md`; ovdje je samo red prioriteta.

1. **Zelene baze.** Sustavni run na trenutnim glavama (ZEL-WEB-SISTEM-GLAVE: INT-03 / A08 pada na koraku izjave od 24. 11.), zadani Preloader u `sistem.yml` prebaciti na `migracija/nextjs`.
2. **V2** na trenutnim glavama, `vs-run.json` u bazu.
3. **Stupac „nužno za probu”** (40 stavki): najprije popravci mrtvih ili neistinitih tokova probe, zatim ostale nužne funkcije (P-1 podrijetlo teksta, P-D1…P-D8, NF stavke označene „nužno”).
4. **Blokade staginga i probe:** potpis izvan dev-a (D-71, sada 503; ključ u KMS-u daje Daniel) i Docker slika bez `config/` (obrazac izjave). Bez njih A01–A10 ne rade na stagingu.
5. **Stupac „nakon 15. 1.”** (73 stavke) po redu iz `02c`; ono što ne stigne do 22. 2. isporučuje se tijekom pilota.
6. VIZ dorada po prototipu (V3).
7. F4 (grana → `main`) nakon kontrolne točke 30. 11. i Danielova „Spoji n”, zatim proba i objava po odjeljku „Faze nakon V2” u `PLAN-MIGRACIJE.md`.

## 6. Odluke (orkestrator po Danielovu „ti odluči”, 22. 11. 2026.)

1. Kanonski plan je ovaj dokument u `ductura/.github`; `red.json` je samo izvršni red.
2. CI vrata: WEB baza zaštićena s `ci-ok`; sustavni posao ulazi u `ci-ok` nakon tri zelena prolaza poslije INT-10; provjera razlike ugovora nakon regeneracije ugovora; SRV integracijska grana se štiti isto čim joj je CI zelen.
3. Ne spaja se u crvenu bazu; valovi od najviše 2 PR-a.
4. „Kritično” = oznaka `kriticno` ili kritični prag risk-floora. Takvi PR-ovi prije spajanja u integracijsku granu dobivaju neovisni pregled samo za čitanje; u `main` i dalje samo „Spoji n”.
5. `src/app` je zamrznut i briše se kad je INT-10 zelen.
6. Kontrolne točke kao u odjeljku 4.
7. Pri predaji, ako postoji novija nepotvrđena verzija: neblokirajuće upozorenje, zadano „Pošalji najprije zadnju verziju pa predaj”, alternativa „Predaj potvrđenu verziju V<n>” (INT-16).

## 6a. Odluke 24. 11. 2026. (Daniel: opseg pilota ostaje; „sve ostalo ti odluči”)

Iz analize naloga 24. 11. (`_analiza/nalog-2411/`, prijedlozi u [`PRIJEDLOZI-2411.md`](PRIJEDLOZI-2411.md)).

| # | Odluka |
|---|---|
| C12 | Opseg pilota se ne smanjuje (Daniel). Redoslijed kao u odjeljku 5; stupac „nakon pilota” (13 NF stavki) ostaje nakon pilota. |
| C13 | P-1 (podrijetlo teksta) je u pilotu i ostaje: tekst P-1-NACRT se potvrđuje, a PRODUCT pravilo 4 usklađuje se s njim zasebnim PR-om u Ductusu. NF5-Q4 (ritam po dijelu teksta u pregledu nastavnika) nije u pilotu i ostaje zadržan; ide nakon pilota. |
| C3 | A8 (biometrija tipkanja) i A9 (AI detektor) se ne grade: biometrijski podaci (GDPR čl. 9) i tvrdnja o autorstvu (D-01). |
| C9, C14 | A1 (oznaka skriptiranog unosa) se ne gradi u pilotu, a kao model strojnog učenja nikad (pravilo 13). Ostaje zadržan. |
| C15 | AI asistent je u fazi A isključen (`ai_disabled`); u fazi B tek nakon Q-10, DPIA i pravnog mišljenja. NF-4 se označava „uvjetno”. |
| C22 | Lab se preusmjerava na `packages/app` iza Preloadera. Do tada se rezultati Laba S12–S34 ne navode kao svojstvo proizvoda. |
| C2, C4, C6, C7, C19 | A2, Merlin (LTI, prije A1), Safe Exam Browser, kvalificirani vremenski žig i alternativa bez zapisa (K5, uz D-04) idu nakon pilota. |
| K1–K8 | Pripremaju se kao dokumenti (nacrti u analizi), bez koda. K3 se u pilotu predaje samo kao tekst. Slanje fakultetu, Srcu i potpis su Danielovi. |
| E-pošta | D-241 vrijedi za pilot: obavijesti samo u aplikaciji; e-pošta (P-17, NZ-9) nakon pilota. |
| OA-10 | Uvoz iz Merlina ostaje u pilotu i čeka primjer izvoza od FPZG-a. |
| Ime | „Ductus” u PRODUCT.md i obavijesti o privatnosti mijenja se u „Ductura” (D-186) prije slanja obavijesti FPZG-u. |
| Repoi | Jedan popis: 9 repoa organizacije Ductura; stari Ductus je arhiva i mjesto koordinacije. |
| D-55 | Pravno mišljenje nije D-55 (to je kontrolna točka uživo); referenca u izvještaju se ispravlja. |

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
| D-71: ključ za potpis u KMS-u (AWS račun) | prije staginga |
| C17: pravna osoba; C10: model cijene; C16: budžet za pravno mišljenje i pentest | C17 odmah; C16 15. 12. |
| C8 i C20: pitanje Srcu o Clarityju i paralelni razgovor uz Q-21 (nacrt postoji) | prije sastanka s FPZG-om; Q-21 30. 11. |
| C18: klauzule K1, K2, K6 u ugovor s FPZG-om | uz Q-3 |
| C23: zamjenik s pristupom za hitne slučajeve | 15. 12. |
| C1, C11, C21, C24: ovise o odgovoru Srca, README pokusa i FPZG-u | kad stigne odgovor |
| Opseg nakon probe (mobile, Web_other, desktop) | nakon 22. 2. 2027. |
| Računi i tajne za staging i objavu (D3), narudžba pravnog mišljenja i DPIA (D7); ostale odluke D1–D8 su u `PLAN-MIGRACIJE.md`, „Faze nakon V2” | prije probe / F5 |

## 9. Ubrzani razvoj (kako)

- Orkestrator pokreće do 40 pisaca u oblaku istodobno na slobodne zadatke iz reda, jedan zadatak = jedan PR.
- Svaki SPREMAN se spaja čim je baza zelena i PR prođe `ci-ok`; kritični nakon neovisnog pregleda.
- Graditelj lokalno dokazuje V2 na svakoj promjeni toka (sustavni test).
- Ovaj dokument se ažurira kad se promijeni odluka, vrata ili kontrolna točka; `STANJE.md` se regenerira automatski.

## 10. Održavanje plana (23. 11. 2026., Daniel: „Može, napravi sve”)

- **Nova vrsta posla ide u plan prije prvog pisca.** Ako zadatak ne može navesti stavku ovog plana ili `PLAN-MIGRACIJE.md` (kao staging 23. 11.), orkestrator najprije otvori PR s dopunom plana pa tek onda pokreće pisce. Dopuna smije ući u isti dan; ne čeka „Spoji n” da bi se posao počeo, ali mora postojati kao PR.
- **Jedan izvor, ostalo snimke.** Mjerodavan je `docs/plan/` u ovom repozitoriju. Kopija u Institution_serveru (`docs/plan/PLAN-MIGRACIJE.md`), orkestratorova `_raspored/plan-snimka.md` i artefakt s pregledom plana su snimke za čitanje. Uređuju se samo ovdje; snimke osvježava `node _raspored/sinkro-plan.mjs` (`--provjeri` javlja zastarjelu kopiju, `--repo <klon>` osvježava kopiju u drugom repou, koja zatim ide kroz PR).

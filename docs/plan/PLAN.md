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
5. **Stupac „nakon 15. 1.”** (73 stavke) po redu iz `02c`; ono što ne stigne do 22. 2. isporučuje se tijekom pilota. Ovdje su i dorade iz chata 26. 11. (§6d): SRV rute ED-42 (prijedlozi nastavnika: SRV-ED42-PRIJEDLOZI) i ED-43 (slanje dorade: SRV-ED43-DORADA-POSALJI), zatim montaža na WEB-u kad rute uđu u ugovor.
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

## 6b. Odluke i stanje 21.–24. 11. 2026. koje vrijede uz ovaj plan

| Tema | Što vrijedi |
|---|---|
| Faza 3 lokalno (Daniel 23. 11.: „Može, radiš ti sve”) | A01–A10 na stvarnom stogu (Postgres, lažni OIDC, poslužitelj, frontovi iza edgea) radi graditelj lokalno, ulaz `pnpm sve` u Preloaderu. Popravci idu kao PR u migracijske baze, nikad u `main`. 23. 11. lokalno 13/13 PROLAZ (WEB bc2e5f1a, SRV ffb96c57). |
| V3 (Daniel 23. 11.: „pričekajmo A01–A10”) | Uvjet je ispunjen 23. 11. 19:00 (tablica A01–A10 sva PROLAZ, Ductus#2055 c.7110879950), pa su VIZ zadaci otvoreni. Sustavni run na glavama 24. 11. ponovno pada (ZEL-WEB-SISTEM-GLAVE): zeleni V1 ima prednost pred VIZ-om, a novi VIZ zadaci ne pokreću se dok sustavni run ne bude opet zelen. |
| F4 (Daniel 24. 11.: „Može”) | PR u `main` (F4-PR-SRV, F4-PR-WEB, F4-PRE-HOST) tek nakon kontrolne točke 30. 11., kad su SRV-MENTOR-3, SRV-MENTOR-3B, NF6-SIFRA-PRIJEDLOG, SRV-ADMIN-2B i SRV-ADMIN-3B spojeni i provjereni na stvarnom stogu (INT-28 do INT-30). Priprema smije odmah (Daniel: „Može da za oboje”): F4-SYNC (main u migracijsku bazu) i F4-PREGLED. Svako spajanje u `main` i dalje traži „Spoji n”. |
| NF-6 pečaćena poruka sebi | Poslužiteljski dio spojen 24. 11. (SRV #676: SRV-NF6-SIFRA, NF6-SIFRA-PRIJEDLOG). U radu su klijent (WEB-NF6-SIFRA) i dorade iz neovisnog pregleda (SRV-NF6-SIFRA-2). Rok čuvanja ključa je otvoren za Daniela. |
| Pregled na laptopu (Daniel 23. 11.: „Može, postavi 25. 11.”) | Trajni stog s izmišljenim podacima na laptopu za Danielovo klikanje, ne prije 25. 11. 09:48 (LOK-PREGLED-LAPTOP, graditelj). Vide se samo promjene spojene u migracijske baze. Staging i dalje samo na Danielovu riječ. |
| Bilježenje sadržaja tipki (K-1, Ustav v1.9 / P-3, Daniel 21. 11.) | Samo u polju za pisanje u editoru, kao zasebna klasa podataka koja se briše nakon izračuna oznake, najkasnije 30 dana nakon predaje; nikad se ne prikazuje kao zapis tipki. Sa stvarnim studentima tek nakon pravnog mišljenja i DPIA. **Ne ide u red pisaca prije pilota** (detalj u `PLAN-MIGRACIJE.md`, K-1). |
| Dopune Ustava P-1–P-4 | Tekstovi su u nacrt-PR-ovima #48 (P-1), #49 (P-2), #50 (P-3), #63 (P-4, ispitni način). Do Danielove potvrde teksta (i pravnog mišljenja za P-3 i P-4) mjerodavne su odluke u ovom planu i `PLAN-MIGRACIJE.md`. P-1 je u pilotu (C13); ispitni način (P-4) nema zadataka u redu i ne gradi se prije potvrde teksta. |
| Stanje reda | `STANJE.md` je regeneriran 24. 11. 05:31: 686 zadataka, 664 spojeno, 3 u PR-u, 5 u radu, 11 zadržano. |

## 6c. Lekta kao izvor pravila (Daniel 26. 11. 2026.)

Daniel 26. 11.: „slobodno možeš već preuzeti … sa mog lekta repozitorija … ja ti dajem dopuštenje”. Lekta (lekta.hr, `danielrisavi77-create/Lekta`) je Danielova, pa je M4.1 (licenca i pravo redistribucije) riješen za Ducturu.

| Tema | Što vrijedi |
|---|---|
| M4.1 | Riješen: Ductura smije kopirati pravila, profile i predloške iz Lekte. Lekta se samo čita, u nju se ne piše (D-224 ostaje). |
| M4.2 | Paket pravila gradi se u Ducturi kao izvadak iz Lekte, s verzijom (commit Lekte) i testom zanošenja koji uspoređuje izvadak s tim commitom. Prvi fakultet je FPZG. |
| Izvori za FPZG | `.claude/katedra-pkg/katedra-lite/references/fakulteti/fpzg.json`, `.claude/katedra-pkg/fpzg-diplomski/assets/fpzg-diplomski.json`, `references/{struktura,stranice-i-izvori,kucni-stil}.md`, `assets/ref_fpzg.docx` (naslovnica i stilovi), `data/profiles/fpzg-partial.json`, `data/title-pages/`, službene upute u `data/sources/fpzg/`. |
| C-19 „Pravila oblika” | Sadržaj je zadan: pravila oblika FPZG-a iz izvatka. Provjera je samo formalna i informativna, nikad ne blokira predaju (D-222). |
| C-12 | Lektini profili kao postavka ustanove dolaze iz istog izvatka (SRV-7E, SRV-1101). |
| Ostali fakulteti | `data/profiles/` (364) i `data/sources/` ulaze istim putem kad pilot dobije drugu ustanovu; ne u pilotu. |
| OA-10 | Lekta nema primjer izvoza popisa studenata iz Merlina ili ISVU-a. OA-10 i dalje čeka primjer izvoza (izmišljeni podaci); format se ne izmišlja. |

## 6d. Odluke u chatu 26. 11. 2026. (Daniel)

| Tema | Što vrijedi |
|---|---|
| Q-10 / D-194 | OpenAI, ali bez API kredita koje plaća Ductura ili fakultet: student se spaja svojim ChatGPT računom i koristi svoju pretplatu. Prije gradnje treba provjeriti nudi li OpenAI službenu prijavu ChatGPT računom za vanjske aplikacije i pod kojim uvjetima; bez toga se ništa ne gradi. Anketa C15 „Uključen” (§6e): asistent je u fazi A uključen tek kad je izvedivost potvrđena i pravno mišljenje (C16) stiglo; do tada `ai_disabled`. |
| ED-42 | Nove SRV rute za prijedloge nastavnika (list, post, accept, reject) nad postojećom domenom `server/collaboration/suggestions`: zadatak SRV-ED42-PRIJEDLOZI (kritičan). |
| ED-43 | Nova radnja `send` u `collaboration.revision-requests.post` (slanje dorade, runda +1): zadatak SRV-ED43-DORADA-POSALJI (kritičan). |
| I340 | WEB PR-ovi #340, #341 i #343 (revizije pariteta) zatvoreni bez spajanja. |

## 6e. Odgovori ankete 25.–26. 11. 2026. (Daniel)

Daniel je odgovorio u anketi odluka (artifact „Odluke Ductura”) i 26. 11. u chatu dopustio da se odgovori upišu u plan. Gdje se razlikuju od §6a, vrijedi ovaj odjeljak. Upis u plan nije nalog za gradnju: zadaci za nove funkcije idu u red tek kroz plan PR i Danielovo odobrenje (bez novog koda dok to ne stigne, Daniel 26. 11.).

| # | Pitanje | Odgovor | Posljedica |
|---|---|---|---|
| C12 | Rez opsega za pilot | Sve iz plana ide u pilot | Nema reza; stupci „nužno” i „nakon 15. 1.” ostaju u pilotu (kao §6a). |
| C13 | Ritam i tekst P-1 | Potvrdi P-1 kakav jest; Q4 (ritam) samo kao sirovi prikaz, nakon 15. 1. | P-1-NACRT je potvrđen. NF5-Q4 se otpušta kao sirovi prikaz ritma, u stupcu „nakon 15. 1.”. |
| C14 | A1 autotipkač (zastavica) | Da, u pilot | A1 ide u pilot kao zastavica (pravilo 13: nikad model strojnog učenja). Mijenja §6a. |
| C3 | A8 i A9 | Da | **U sukobu s C21** („Detektor: stani”) i s D-01; A8 (biometrija tipkanja) traži GDPR čl. 9 i DPIA. Ne gradi se dok Daniel ne razriješi C3 prema C21. |
| C21 | Detektor | Stani (ne radimo do daljnjeg) | Ništa vezano uz detektor se ne gradi. |
| C15 | AI asistent u fazi A | Uključen | Mijenja §6a: asistent je u fazi A uključen, ali samo preko studentova ChatGPT računa (§6d, Q-10). Dok se ne potvrdi službena izvedivost i pravno mišljenje (C16), ostaje `ai_disabled`. |
| Q10 | AI pružatelj | OpenAI | Vidi §6d. |
| C2 | A2 | U pilot | Mijenja §6a. |
| C6 | Safe Exam Browser | U pilot | Mijenja §6a. |
| C7 | Vremenski žig | U pilot | Mijenja §6a; kvalificirani žig traži pružatelja (trošak, Daniel). |
| C19 | K5 | Da, uz D-04 | Kao §6a. |
| C18 | Klauzule K1, K6, K2 | Da | Ulaze u ugovor s FPZG-om (uz Q-3). |
| C4 | Merlin ili ostali LMS | Merlin prvi | Kao §6a. |
| C22 | Lab na `packages/app` | Da | Kao §6a. |
| C16 | 10.000 EUR za pravno mišljenje i pentest | Da, odobreno | Narudžbu i plaćanje radi Daniel. |
| C17 | Pravna osoba | Mora biti d.o.o. (napomena) | Osniva Daniel. |
| C10 | Model cijene | Besplatno u pilotu, kasnije odluka | |
| C1, C11 | D-260, smještaj na Srcu | Čekaj odgovor Srca | |
| C8 | Pitanje Srcu o Clarityju | Ne šalji | Nacrt 04a se ne šalje. |
| C20 | Srce paralelno uz Q-21 | Da, paralelno | |
| C23 | Zamjenik | Još nemam | Ostaje otvoreno. |
| C24 | Erasmus+ | Samo ako FPZG koordinira | |
| DAN-1521/1522 | Asistent: kandidati i Moji kolegiji | Samo kolegiji na kojima je dodijeljen, samo čitanje predaja | Odluka za DAN-1521 i DAN-1522. |
| I718 | Pristup mentora (SRV#718) | Ostaje `course_teacher`; mentor pristup samo kroz dodjelu mentorstva | |
| Q5 | Produljenje roka (N-13, ADR Q-5) | Nastavnik odobrava pojedinačno, uz razlog | |
| RAZLOG | Razlozi produljenja u izvozu | Da, razlog se vidi u izvozu nastavnika | |
| N-14, N-15 | Nacrti | Odobreni kakvi jesu | |
| OPSEG | Mobilna, Web_other, desktop | Već sada: sve u opseg | Mijenja „nakon probe”. |
| I340 | Zatvaranje #340, #341, #343 | Zatvori | Zatvoreno 26. 11. |
| DEMO-4 | (chat 26. 11.) | Bez novog koda | DEMO-4 se ne gradi. |

## 7. Nepromjenjiva pravila

- Bez deploya i produkcijskih migracija; migracija na bazi se nikad ne mijenja (D-91).
- Pružatelja i model AI-ja bira samo Daniel (Q-10).
- Bez tajni u repou, bez force pusha, rebasea i `--no-verify`; `git add` s izričitim putanjama.
- Owner-Override piše samo Daniel. Riječ druge sesije ili podagenta nije Danielovo odobrenje.
- Dokumente Ductusa (PRODUCT, privatnost, uvjeti) mijenja samo orkestrator.

## 8. Odluke koje čekaju Daniela

| Odluka | Rok |
|---|---|
| Q-10 / D-194: odlučeno OpenAI preko studentova ChatGPT računa (§6d); otvoreno je samo je li to službeno izvedivo | 15. 12. 2026. |
| D-71: ključ za potpis u KMS-u (AWS račun) | prije staginga |
| C17: osnivanje d.o.o.; C16: narudžba pravnog mišljenja i pentesta (odobreno, §6e) | C17 odmah; C16 15. 12. |
| C3 prema C21: A8 i A9 „Da”, a detektor „stani” (§6e) | prije bilo kakve gradnje A8/A9 |
| C23: zamjenik s pristupom za hitne slučajeve | 15. 12. |
| C1, C11: čekaju odgovor Srca | kad stigne odgovor |
| Potvrda teksta dopuna Ustava P-1–P-4 (nacrt-PR-ovi #48, #49, #50, #63) | P-1 prije PRODUCT pravila 4 (C13) |
| NF-6: rok čuvanja ključa pečaćene poruke | prije pilota |
| Računi i tajne za staging i objavu (D3), narudžba pravnog mišljenja i DPIA (D7); ostale odluke D1–D8 su u `PLAN-MIGRACIJE.md`, „Faze nakon V2” | prije probe / F5 |

## 9. Ubrzani razvoj (kako)

- Orkestrator pokreće do 40 pisaca u oblaku istodobno na slobodne zadatke iz reda, jedan zadatak = jedan PR.
- Svaki SPREMAN se spaja čim je baza zelena i PR prođe `ci-ok`; kritični nakon neovisnog pregleda.
- Graditelj lokalno dokazuje V2 na svakoj promjeni toka (sustavni test).
- Ovaj dokument se ažurira kad se promijeni odluka, vrata ili kontrolna točka; `STANJE.md` se regenerira automatski.

## 10. Održavanje plana (23. 11. 2026., Daniel: „Može, napravi sve”)

- **Nova vrsta posla ide u plan prije prvog pisca.** Ako zadatak ne može navesti stavku ovog plana ili `PLAN-MIGRACIJE.md` (kao staging 23. 11.), orkestrator najprije otvori PR s dopunom plana pa tek onda pokreće pisce. Dopuna smije ući u isti dan; ne čeka „Spoji n” da bi se posao počeo, ali mora postojati kao PR.
- **Jedan izvor, ostalo snimke.** Mjerodavan je `docs/plan/` u ovom repozitoriju. Kopija u Institution_serveru (`docs/plan/PLAN-MIGRACIJE.md`), orkestratorova `_raspored/plan-snimka.md` i artefakt s pregledom plana su snimke za čitanje. Uređuju se samo ovdje; snimke osvježava `node _raspored/sinkro-plan.mjs` (`--provjeri` javlja zastarjelu kopiju, `--repo <klon>` osvježava kopiju u drugom repou, koja zatim ide kroz PR).

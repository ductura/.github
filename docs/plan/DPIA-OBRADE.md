# DPIA: popis obrada osobnih podataka (nacrt)

> **NACRT ZA PRAVNIKA. Nije pravni savjet ni pravno mišljenje.** Popis opisuje što kod i planovi rade s osobnim podacima. Ne ocjenjuje zakonitost. Ne bira pravnu osnovu. Ne određuje rokove. Svaki redak čeka pregled pravnika (**[PRAVNIK]**).

Odluka D7 (`PLAN-MIGRACIJE.md`, „Faze nakon V2”): pravno mišljenje i DPIA obvezni su prije stvarnih studenata (F5). Narudžbu radi Daniel. Orkestrator priprema popis obrada i tokova. Ovo je taj popis.

## Izvori

- Kod: `ductura/Institution_server`, grana `migracija/kopija-ductus-backend` (stanje 22. 11. 2026.): `db/main`, `db/logs`, `db/legal`, `server/domain/retention/catalog.ts`, `render.yaml`, `docs/DEPLOY.md`, `docs/privacy/08-inventar-tokova-podataka.md`.
- Kod: `ductura/Aplication_server` (`admin/migrations`, `institutions/migrations`), `ductura/Institution_front_web_chrome` (`.env.example`, `packages/app/vercel.json`).
- Dokumenti u ovom repou: `docs/ductus/privacy/01`–`08` (klase podataka, tokovi, podizvršitelji, prijedlog rokova), `docs/plan/PLAN-MIGRACIJE.md` (odluke D1–D8).
- Brojevi klasa (npr. „klasa 13”) su iz `docs/ductus/privacy/06-klase-podataka.md` §2. Ovaj nacrt ih ne mijenja.

## Tko su ispitanici

| Skupina | Kako ulazi | Napomena |
|---|---|---|
| Studenti | AAI@EduHr (OIDC) | Glavna skupina. Pišu radove. Mogu biti maloljetni? **[PRAVNIK]** |
| Nastavnici i mentori | AAI@EduHr | Postavljaju zadatke, čitaju radove, komentiraju. |
| Osoblje ustanove (administrator ustanove) | AAI@EduHr | Potvrđuje uloge nastavnika, pravila fakulteta. |
| Administratori platforme Ductura | korisničko ime i lozinka na Aplication_serveru | Nisu osoblje ustanove (D-09, D-16). |

## Popis obrada

Stupac „Pravna osnova” je namjerno prazan. Bira je pravnik.

| # | Obrada | Ispitanici | Podaci (klase) | Svrha | Pravna osnova | Gdje se sprema | Rok čuvanja |
|---|---|---|---|---|---|---|---|
| O-1 | Prijava i sesije | svi korisnici ustanove | `hrEduPersonUniqueID`, OIDC `sub`, ustanova iz `hrEduPersonHomeOrg`, ime i prezime, sesije (1, 2, 3). E-pošta i OIB se ne preuzimaju. | prijava, odjava, zaštita sesije | **[PRAVNIK]** | PostgreSQL `ductus` (shema `identity`) | sesije: 30 dana nakon kraja, brisanje izgrađeno (`retention/catalog.ts`, D-273). Ostalo: otvoreno (D-30, Q-16) |
| O-2 | Zapisi prijava i rada sustava | svi korisnici | događaji prijave i sesije, identifikator zahtjeva, vrsta računa; moguće IP adrese **[provjeriti što se sprema; čitanje ih skraćuje na /24 i /48]** | sigurnost i rad sustava | **[PRAVNIK]** | PostgreSQL `ductus_logs` (`log_entry`, samo dodavanje) | otvoreno (S-1K.8) |
| O-3 | Nastava i članstvo | studenti, nastavnici | kolegiji, članstvo, grupe, kodovi i pokušaji upisa, uloge, mentorstva, trag promjena ovlasti (4, 5, 26) | organizacija nastave | **[PRAVNIK]** | `ductus` (`institution`, `audit`) | otvoreno (D-30, Q-16) |
| O-4 | Zadaci, pravila i obavijesti | nastavnici, studenti | zadaci i verzije, pravila fakulteta, jezik rada, iznimke po studentu, obavijesti, potvrde obavijesti (6, 7, 9, 10) | provedba zadatka | **[PRAVNIK]** | `ductus` | otvoreno (D-30, Q-16) |
| O-5 | Pisanje rada i evidencija nastanka | studenti | projekt, dokument, revizije, kontrolne točke s punim tekstom, odsječci evidencije, potvrde i hashevi (11, 13, 14, 21, 27); vrijeme po promjeni (22) za sada samo lokalno | dokaz nastanka rada (D-24) | **[PRAVNIK]** | `ductus` i S3 bucket po ustanovi (`EVIDENCE_STORAGE_DOMAINS`) | otvoreno (D-30). Hashevi i potvrde se ne brišu (D-272 MQ06) **[PRAVNIK]** |
| O-6 | Lokalni dnevnik na uređaju | studenti | tekst rada dok se ne sinkronizira (30) | rad bez mreže | **[PRAVNIK]** | IndexedDB u pregledniku | do sinkronizacije ili odjave; rok otvoren (D-118, D-122) |
| O-7 | Prikaz uživo, sažetak procesa, ponovni prikaz | studenti (čiji je rad), nastavnici i mentori (koji čitaju) | stanje prikaza uživo, sažetak, zapis pristupa nastavnika (15, 21, 25) | praćenje i ocjena rada | **[PRAVNIK]** | `ductus` i S3 | otvoreno (D-30) |
| O-8 | Predaja, komentari, zahtjevi za doradu | studenti, nastavnici, mentori | predani rad, potvrda predaje, komentari, dorade (16, 18, 19, 27) | predaja i ocjena | **[PRAVNIK]** | `ductus` | otvoreno; prijedlog „prema pravilniku fakulteta” (D-30 PRIJEDLOG) |
| O-9 | Podudaranje s AI pomoćnikom | studenti, nastavnici | odgovori pomoćnika i tekst rada (24); usporedba je deterministička, nije AI analiza (P-1) | oznaka nastavniku | **[PRAVNIK]** | `ductus` | otvoreno (uz Q-10) |
| O-10 | AI pomoćnik | studenti | odlomak koji student sam pošalje, bez identiteta po zadanom; izjava o pomoći AI-ja (17, 24) | pomoć pri pisanju | **[PRAVNIK]** | zapis kod Ductura; odlomak ide pružatelju | otvoreno. **U produkciji je isključen** (`ai_disabled`) dok pružatelj nije izabran. |
| O-11 | Prijava problema | studenti, nastavnici | opis problema i zatvoreni tehnički kontekst, bez teksta rada (31) | podrška | **[PRAVNIK]** | `ductus` | otvoreno (D-30) |
| O-12 | Prihvat pravnih tekstova | svi korisnici | verzija teksta koju je korisnik prihvatio (D-301; tablica prihvata dolazi s DAN-847-2) | dokaz obavijesti i prihvata | **[PRAVNIK]** | PostgreSQL `ductus_legal` | otvoreno |
| O-13 | Administratori platforme | administratori Ductura | korisničko ime, hash lozinke (argon2id), vrijeme | upravljanje ustanovama | **[PRAVNIK]** | baza Aplication_servera (`admin.platform_admin`) | otvoreno |
| O-14 | Podaci o ustanovi | ustanove (nisu fizičke osobe); prvi administrator ustanove **[provjeriti]** | naziv, slug, `aai_home_org`, OIDC issuer | otvaranje instance ustanove | **[PRAVNIK]** | baza Aplication_servera (`institutions`) | otvoreno |
| O-15 | Kopije baze i bucketa | kao O-1 do O-12 | sve klase iz baze i bucketa (29) | oporavak (DAN-889) | **[PRAVNIK]** | kod pružatelja hostinga; plan nije izabran | otvoreno; vlastiti rok po vrsti kopije (D-12) |
| O-16 | Evaluacija pilota | studenti, nastavnici | ankete i razgovori, odvojeno od evidencije (8) | ocjena pilota | **[PRAVNIK]** | nije određeno | prijedlog „do kraja evaluacije”; planirano |

Pilot i proba: proba 22. 2. 2027. ide samo s izmišljenim podacima (D2, D7). Stvarni podaci tek u F5.

## Izvršitelji i primatelji

Nijedan izvršitelj nije ugovoren. Ugovore o obradi (čl. 28.) i prijenose izvan EU-a ocjenjuje pravnik.

| Subjekt | Uloga | Što vidi | Lokacija | Stanje |
|---|---|---|---|---|
| Render | hosting Institution_servera i baza PostgreSQL | sve u bazama `ductus`, `ductus_logs`, `ductus_legal` | Frankfurt (`render.yaml`) | odluka D2 za staging; račun otvara Daniel (D3). Matična grupa i DPA **[PRAVNIK]** |
| Vercel | hosting fronta (Next.js) i rub ispred servera | promet preglednika prema `ductura.org` i `/api/v1/*` | nije određeno | odluka D2; račun otvara Daniel (D3). Regija i DPA **[PRAVNIK]** |
| Pružatelj S3 pohrane | odsječci evidencije (klasa 21) | sadržaj odsječaka | nije određeno | nije izabran; račun otvara Daniel (D3) |
| Pružatelj hostinga Aplication_servera | baza ustanova i administratora | podaci O-13, O-14 | nije određeno | nije izabran |
| AI pružatelj | odgovor pomoćnika | odlomak koji student pošalje | nije određeno | **čeka Q-10 / D6, bira Daniel** (rok 15. 12. 2026.). Isključeni su pružatelji i modeli s kineskim sjedištem (D-194 t. 2). |
| AWS KMS | potpis potvrda | samo digest, bez sadržaja | eu-central-1 (prijedlog) | planirano (D-71, D-92); još se ne koristi |
| Srce (AAI@EduHr) | izvor identiteta | atributi prijave | HR | ustanova registrira uslugu; je li izvršitelj **[PRAVNIK]** |
| GitHub, Linear | razvojni alati | ne smiju dobiti stvarne osobne podatke | — | izvan obrade, ako pravilo vrijedi **[PRAVNIK]** |

Dokumenti Ductusa (`docs/ductus/privacy/04`) predlagali su UpCloud, Scaleway i druge (D-08 PRIJEDLOG). Odluka D2 za Ductura bira Render i Vercel. Koji popis vrijedi za produkciju, potvrđuje Daniel.

## Otvoreno za pravnika

- Pravna osnova svake obrade O-1 do O-16.
- Rokovi čuvanja: odlučen je samo rok sesija (30 dana). Ostalo je D-30 PRIJEDLOG i Q-16.
- Je li Ductura izvršitelj ustanove ili samostalni voditelj, po obradi.
- Zapis pristupa nastavnika (klasa 25) i vrijeme po promjeni (klasa 22): razmjernost (D-55, D-142, D-143).
- Hashevi i potvrde koji se ne brišu (klasa 27): ostaju li osobni podatak i koliko dugo.
- AI pomoćnik: izvršitelj, prijenos, treniranje, dob korisnika (čeka Q-10 / D6).
- Prijenosi izvan EU-a preko matičnih grupa Rendera, Vercela i pružatelja S3.
- Obavijest o privatnosti: nacrt je u `docs/ductus/privacy/03-obavijest-o-privatnosti-nacrt.md`.

## Što ovaj nacrt nije

- Nije DPIA. DPIA radi ustanova s pravnikom i službenikom za zaštitu podataka.
- Ne mijenja kod ni rokove. Kad se kod promijeni, ovaj popis treba osvježiti iz istih izvora.

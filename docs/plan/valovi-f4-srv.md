# Plan valova F4 za SRV (ductura/Institution_server)

Nalog: PLAN-VALOVI-F4 (orkestrator, po Danielovu nalogu). Daniel je 27. 11. odobrio da plan bude ovdje („Neka plan stavi u .github, odobravam”).
Izvori:
- popis zadataka SRV-ZADACI-F4 (Ductus#2059 c.7218816826);
- puni opisi iz `red.json`, stanje 27. 11. oko 13:10Z;
- nalog dizajna od 27. 11., zadaci 1.1–1.10 (Ductus#2059 c.7217617528);
- kod grane `migracija/kopija-ductus-backend` na `baec7835` (API 1.181.0, 413 ruta u ugovoru).

Ovo je plan, a ne odluka. Plan ne sadrži proizvodni kod. Svaki redak „postoji” provjeren je u ugovoru (`server/contracts/routes/**`). Pisac to prije rada još jednom potvrdi u kodu i, ako je rupa zatvorena, zadatak završava kao GOTOVO bez koda, uz dokaz.

## 1. Sažetak

| Skupina | Broj | Zadaci |
|---|---|---|
| Val 1: bez migracije, aditivni ugovor ili samo test/CI | 20 | §4 |
| Val 2: migracije (skupni migracijski PR), traži ODOBRENO | 9 | §5 |
| Val 3: ovisi o valu 2 ili o odluci | 6 | §6 |
| Nije posao SRV pisca (orkestrator, Daniel, graditelj, privatno) | 8 | §7 |

Prijelomna promjena ugovora nije dopuštena ni u jednom valu. Kad je potrebna, zadatak dobiva novu rutu ili novo neobavezno polje, a nikad zamjenu tijela ili `anyOf`. Razlog: `contracts:breaking` svaku promjenu `anyOf`/`oneOf` prijavljuje kao prijelomnu.

## 2. Zajedničke datoteke i vlasništvo po valu

Uzorak je SRV#937: jedna nova ruta dira 28 datoteka. Svaka zajednička datoteka u valu ima jednog vlasnika. Pisci ne diraju dijelove kojima nisu vlasnici, nego vlasniku ostave redak u opisu PR-a („za vlasnika vala: …”).

| Datoteka | Što se mijenja | Vlasnik u valu | Pisac smije |
|---|---|---|---|
| `server/contracts/version.ts`, `vectors/platform.health.get.json` | `API_VERSION` | vlasnik vala, jedan skok na kraju vala | ne |
| `openapi/v1.json`, `server/contracts/generated/**` | `pnpm contracts:generate` | vlasnik vala regenerira nakon svakog spajanja | regenerirati lokalno za test, ali u PR ide samo ako je ruta njegova (sukob rješava vlasnik regeneracijom) |
| `server/contracts/routes/<područje>.ts` | definicija rute | pisac koji ima to područje u valu (§4, stupac „Datoteka ugovora”) | da, samo svoj blok |
| `server/contracts/index.ts`, `inventory.ts`, `contracts.test.ts` | popis i inventar ruta | pisac (dodaje samo redak, sukob je samo redni) | da |
| `server/server.ts` | montiranje rute | vlasnik vala; pisac montira jednim retkom u svojem bloku | jedan redak |
| `tests/contracts/contract-only.test.ts`, `tests/db/logout-old-cookie.integration.test.ts` | ENTRY_MOUNTED, SESSION_ROUTES | pisac | da |
| `packages/test-fakes/dev-server/**`, `coverage.test.ts` | lažni poslužitelj i scenarij | pisac, po području | da |
| `db/main/migrations/**`, `db/main/migrations.sum` | migracija i zbroj | vlasnik skupnog migracijskog PR-a (val 2) | ne, osim kad je vlasnik |
| `db/main/tests/002-matrix-coverage.sql`, `030-institution-access-matrix.sql` | matrica pristupa | vlasnik skupnog migracijskog PR-a | ne |
| `db/main/tests/046-evidence-open-work.sql` | popis RPC-ova koje izvršava `ductus_app` | vlasnik skupnog migracijskog PR-a | ne |
| `db/seed/**` | dev seed | SEED-OIDC-OPERATER (val 1) | ne |

Prijedlog: vlasnik zajedničkih datoteka je Poslužitelj (`claude:posluzitelj`) za oba vala. Orkestrator može vlasništvo dati drugoj sesiji. Ako to učini, mijenja samo ovaj redak.

Redoslijed spajanja unutar vala:
1. Prvo PR-ovi bez ugovora (CI, test-fakes, popravci).
2. Zatim rute, po jedna, a vlasnik nakon svake regenerira `openapi`.
3. Na kraju PR vlasnika vala sa skokom `API_VERSION`.

## 3. Verzija API-ja i migracije

- Sada: `1.181.0`. Val 1 → `1.182.0`, val 2 → `1.183.0`, val 3 → `1.184.0`. Sve promjene su minor jer su aditivne.
- SRV#937 i grana `posluzitelj/dizajn-1-1-javna-provjera` već su na 1.181.0. Ako uđu prije vala 1, val 1 kreće od 1.181.0.
- Migracije vala 2 dobivaju vremenske oznake iz raspona `202612206xxxxx`, svaka iza vrha. Na vrhu je sada `20261220550000`, a `20261220560000` je zauzeta na grani 1.1 (3). Nijedna postojeća migracija se ne mijenja.
- Svaka nova tablica u valu 2 ima RLS i retke u pgTAP matrici (`002`, `030`).

## 4. Val 1 (20 zadataka, bez migracije)

Zadaci su međusobno neovisni. Datoteke ugovora po zadatku se ne preklapaju, osim kad je u stupcu „Ovisi” navedeno drukčije.

| # | Zadatak | Promjena ugovora (ruta, metoda, oblik, greške) | Datoteka ugovora | ODOBRENO | Ovisi |
|---|---|---|---|---|---|
| 1 | SRV-ZADATAK-422-PARSE | nema; popravak `parseAssignmentInput` za unos koji sučelje šalje, uz test koji bez popravka pada | — (`server/http/institution-assignments.ts`) | ne | — |
| 2 | SRV-CI-VS1-PORT | nema; port VS-1 stoga u CI-ju | — (`scripts/stack/`, `scripts/ci/`) | ne (CI se ne slabi) | — |
| 3 | RUTE-SRV-ODJAVA | nema; lažni OIDC: post-logout `/` iz `SIGNED_OUT_PATH` | — (`packages/test-fakes/oidc/`) | ne | — |
| 4 | SEED-OIDC-OPERATER (PR otvoren) | nema; operaterski račun u lažnom OIDC-u i dev seedu | — | ne | spaja se prije 3 (ista mapa) |
| 5 | F4-STU-R08-SRV | `student.notice.get` GET: nova neobavezna polja `courseName?: string`, `mentorName?: string \| null` i `differsFromFacultyRules?: boolean`; greške bez promjene. Usporedba verzija za basic se NE radi (odluka 27. 11.) | `enrollment.ts` | ne | — |
| 6 | F4-V13-R05 | `live.document.get` GET: novo polje `documentKind: 'text' \| 'slides' \| 'spreadsheet'` (neobavezno) | `live.ts` | ne | — |
| 7 | F4-EDI-R12-SRV | ako studentsko čitanje preporuka ne postoji: nova `student.source-recommendations.get` GET `/api/v1/student/works/{workId}/source-recommendations` → `{items: [{id, title, url?, note?, addedAt}]}`; 401, 404 (rad nije studentov), 503 | nova `source-recommendations-student.ts` | ne (pristup iz odnosa student–rad, postojeći obrazac) | — |
| 8 | F4-NAS-R14-SRV | `teacher.deadline-extensions.get` već vraća `existingSubmissionsUnchanged` samo nakon POST-a. Treba neobavezno `existingSubmission?: {submittedAt}` po studentu u odgovoru čitanja, za upozorenje pri odabiru | `deadline-extensions.ts` | ne | — |
| 9 | 1.1 (3) ruta | nova `public.verification-code.post` POST `/api/v1/public/verification/code`, tijelo `{code}` (uzorak `XXXX-XXXX-XXXX-XXXX`, Crockford), odgovor kao `public.verification.post`; 400, 415, 422, 429 (zajednički limiter 30/min po adresi), 503 | `public-verification.ts` | **da** (migracija `20261220560000` je već na grani) | — |
| 10 | 1.1 (4)–(6) | nema; PDF potvrde: QR `/provjera#k={kod}`, kod ispod QR-a | — (`server/downloads/receipt-pdf/`) | ne | 9 (oblik URL-a) |
| 11 | 1.1 (1) | nema u SRV-u; izvadak `student.submission-confirmation-code.get` u WEB (IZV-RUTE-1) | WEB repo | ne | — |
| 12 | 1.2 | `student.assignments.get`, `student.assignment-work.get`, `work.consultation-records.get`: dodati 403 u popis grešaka ugovora (ako ga rukovatelj već vraća); provjeriti `contracts:breaking` | `student.ts`, `consultation-records.ts` | ne | — |
| 13 | 1.5 | `teacher.course-students.get`: nova neobavezna polja `title?`, `workType?` po studentu | `institution.ts` (blok course-students) | ne | — |
| 14 | F4-V13-R02 | nema; rekonstrukcija predaje za slajdove (`slidesStepReplayer`) | — (`server/evidence/`) | ne | — |
| 15 | F4-V18-22-R05 | nema; `readParts` u `createWorkTeamStore`, zapis `provenance-share` | — | ne | — |
| 16 | F4-PM2-R18 | nema; tragovi iz PDF-a i ODT-a pri uvozu | — (`server/import/`) | ne | — |
| 17 | F4-PM2-R01B (PR otvoren) | nema; zaseban proces radnika | — | **da** (promjena slike, oblačni pregled) | F4-PM2-R01 |
| 18 | Provjera i zatvaranje A | F4-STU-R02 (`isPractice` postoji, `student.ts:60`), F4-NAS-R01-SRV (`teacher.assignment-late-submission.get` postoji), F4-OPE-R03-SRV (`institution.enrollments.post`, `student-removal`, `student-return` postoje) | — | ne | — |
| 19 | Provjera i zatvaranje B | F4-OPE-R06 (`institution.admin-actions.get` postoji; uvoz popisa u dnevniku čeka OPE-03), F4-PM1-R04-SRV (`student.working-criteria.get` postoji; ostaje WEB izvadak), 1.10 (`work.milestones.delete` postoji) | — | ne | — |
| 20 | REGRESIJA-BAZE-SRV | nema; provjera vrha grane, izvještaj na #2058 | — | ne | — |

### Stanje vala 1 (27. 11. popodne)

Ova tablica ima prednost pred retcima gore kad se razlikuju.

| # | Zadatak | Stanje |
|---|---|---|
| 1 | SRV-ZADATAK-422-PARSE | Gotovo bez koda: zatvorio ga je SRV#717 (INT-32). Pitanje za WEB (`documentKind: "text"` uz `workKind: "spreadsheet"`) ide u plan WEB valova. |
| 5 | F4-STU-R08-SRV | SRV#947: `courseName` i `mentorName` (niz za prikaz; više nastavnika spojeno s ", "). `differsFromFacultyRules` **ovisi o P01b** (vezanje zadatka na verziju pravila). Nova SECURITY DEFINER funkcija se ne radi bez ODOBRENO. |
| 6 | F4-V13-R05 | Zatvoreno bez promjene: `live.document.get` se ne mijenja (orkestrator, c.7219251307). |
| 7 | F4-EDI-R12-SRV | Gotovo bez koda: `student.work-sources.get` već vraća nastavnikove izvore s `requirement`. |
| 8 | F4-NAS-R14-SRV | Gotovo bez koda: `teacher.assignment-overview.get` već daje po studentu `submitted`, `requestedMinute` i `afterDeadline`. |
| 12 | 1.2 | Zatvoreno bez promjene ugovora, odluka (c). `contracts:breaking` dodavanje statusa i izmjenu `summary` smatra prijelomnim; WEB 403 čita kao opći forbidden. |
| 13 | 1.5 | SRV#948. |
| 15 | F4-V18-22-R05 | Nije val 1: treba pohrana provenance-share (val 2, migracija) i ožičenje (val 3). **Odgođeno nakon pilota**, zajedno sa shemom v4. |
| 16 | F4-PM2-R18 | Rastavljeno po preporuci A (vlasnik, 27. 11.): (1) ugovor `ductus-import-manifest-v2` (SRV#946, samo dokument); (2) migracija `file_format` s `odt` (val 2); (3) čitač ODT-a; (4) tragovi u PDF čitaču. Koraci 2–4 kreću tek kad se spoji korak 1. |
| 9 | F4-1.1-3-SRV | SRV#952: `public.verification-code.post`, migracija preimenovana u `20261220600000`, API 1.185.0. Ide u vlak #965. |
| 10 | F4-1.1-4-6-SRV | Spojeno u vlaku #961 (SRV#957): QR `/provjera#k={kod}` i kod ispod QR-a. Potvrda bez koda zadržava stari QR. Nastavak SRV#964: kod i u skupnom ZIP-u, prijenosnom zapisu i izvozu. |
| — | SRV-MIGRACIJE-BROJEVI | Spojeno u vlaku #958 (SRV#953, #956): provjera redoslijeda u `migrations-ledger --base`, `pnpm db:new` i `pnpm db:renumber`. Vlak na sudar ispisuje LEDGER-SUDAR. |
| 18 | Provjera i zatvaranje A | Provjera na bazi `72a77d5` našla je dvije rupe. NAS-R01, student-removal i student-return su zatvoreni. Rupe su nove stavke 18a i 18b. |
| 18a | F4-OPE-R03-SRV rukovatelj | `institution.enrollments.post` je samo ugovor (`CONTRACT_ONLY`, `inventory.ts`). Rukovatelj ide kao zaseban PR, Risk critical (prava i baza). Spojeno u vlaku #962 (SRV#951), uz ODOBRENO. |
| 18b | F4-STU-R02 `isPractice` | Polje je u ugovoru i bazi, ali ga `student.assignments.get` namjerno izostavlja, jer ga klijenti 2.9.1 odbijaju (VLAK-WEB934-ISPRACTICE, #873). **Blokirano** dok WEB ne prijeđe na novi ugovor; ne pokreće se. |
| 19 | Provjera i zatvaranje B | Zatvoreno: `admin-actions.get`, `working-criteria.get` i `milestones.delete` imaju ugovor, rukovatelja i test. Uvoz popisa čeka OPE-03, a za PM1-R04 ostaje WEB izvadak. |
| 20 | REGRESIJA-BAZE-SRV | Zatvoreno: baza `72a77d5` je zelena, API 1.183.0. |

Verzije: zbog paralelnih PR-ova vrijedi pravilo da onaj koji prvi bude spreman dobiva sljedeći minor, a drugi spaja bazu i ide na idući minor (npr. #947 i #948: 1.183.0 i 1.184.0). Brojevi u §3 su zato samo okvirni.

Retci 18 i 19 završavaju kao GOTOVO bez koda s dokazom (put do rute i testa) ili, ako nešto nedostaje, kao novi redak u valu 2.

## 5. Val 2 (9 zadataka, migracije)

Svi zadaci u ovom valu traže **ODOBRENO**, jer sadrže migraciju, `server/database/` ili prava (Risk critical). Prijedlog je jedan skupni migracijski PR: vlasnik vala napiše sve migracije, pgTAP i `migrations.sum`. Pisci zatim rade rute na grani od skupnog PR-a, a njihovi PR-ovi idu u vlak tek iza njega.

| # | Zadatak | Migracija (tablica, stupac, funkcija, RLS) | Promjena ugovora | Ovisi |
|---|---|---|---|---|
| 1 | F4-V13-R01 + F4-V14-R01 (zajedno) | nova definicija `app.open_student_work` (`CREATE OR REPLACE` u novoj migraciji) s revizijom nula za `slides` i `spreadsheet`; pgTAP `046` | nema (`student.work.open` već vraća `not_configured` → sada uspjeh) | — |
| 2 | 1.3 | `held_at timestamptz NULL` u tablici zapisa konzultacija; RPC upisa prima `p_held_at` (nova verzija funkcije) | `work.consultation-records.get/post`: neobavezno `heldAt` | — |
| 3 | 1.4 | funkcija čitanja razloga odbijanja iz `audit.mentorship_event` samo za studenta tog zahtjeva (SECURITY DEFINER, pristup iz odnosa) | `mentorship.student-requests.get`: neobavezno `declineReason?: string \| null` | — |
| 4 | 1.6 | zadnja viđena verzija obavijesti po studentu i zadatku (tablica ili stupac uz `notice-read`), s RLS-om | `student-work.works.get`: `noticeChangedSinceSeen: boolean`, po želji `afterDeadline` | — |
| 5 | 1.8 | tablica veze zadatak–grupa (`assignment_group`), RLS, matrica. Danas neprazan `groupIds` daje 422 (`institution.ts:413`) | `institution.course-assignments.post`: `groupIds` prestaje davati 422; čitanje grupa uz zadatak | `institution.course-groups.*` (postoji) |
| 6 | F4-PRE-R02-SRV2 (PR otvoren, dio A) | snimka razgovora (`declaration.conversation_snapshot`), `save_statement` v2 i prilozi | novo neobavezno polje za objašnjenje nesuglasja | F4-PRE-R02-SRV |
| 7 | F4-PRE-R02-SRV2 dio B | po potrebi funkcija koja vraća obvezne (`transferred`) razgovore | nova GET ruta ili polje u postojećem čitanju izjave (ime u ugovoru) | 6 |
| 8 | F4-EDI-R05-SRV | vjerojatno novi ishod u RPC-u commita („zadrži tekst s ovog uređaja”); kritična promjena, uz plan napada | `evidence.commit.post`: novi ishod mora biti aditivan. Ako to nije moguće bez promjene `anyOf`: nova ruta | — |
| 9 | 1.9 | grupe pri stvaranju kolegija: upis u postojeću tablicu grupa kroz RPC administratora | `institution.admin-courses.post`: neobavezno `groups?: [{name}]` (najviše 20) | 5 (ista tablica grupa) |

Unutar skupnog PR-a zadaci 1 i 5 dolaze prvi, jer na njima ostali grade. Ako skupni PR prijeđe oko 400 redaka, dijeli se u dva PR-a: (1, 2, 3, 4) i (5, 6, 7, 8, 9). Nakon toga vlasnik vala podiže `API_VERSION` na 1.183.0.

## 6. Val 3 (ovisi o valu 2 ili o odluci)

| Zadatak | Što | Ovisi |
|---|---|---|
| F4-V13-R04-SRV | e2e studentske polovice vala 13 (stvori, sinkroniziraj, predaj, izvezi) | val 2 #1, val 1 #14 |
| F4-V18-22-R03-SRV | `schemaVersion` 4 u `student.work.open`, commitu, replayu i rekonstrukciji | odluka „v4 u pilotu ili poslije” |
| F4-V18-22-R08-SRV | izvoz ocjena u probni ISVU: baza potvrde, rute `isvu-grades` | odluka OP-V22-1 / PG-10 |
| F4-PM2-R12 | brisanje po roku za klase podataka (M10.2) | potvrda D-30 |
| F4-PM2-R21-SRV | čitanje verzija iz OneDrivea, SharePointa i Google Drivea (M8.11) | vanjski računi i OAuth klijenti (Daniel) |
| F4-PM1-R11-SRV | objava `@ductura/contracts` 3.x | Danielovo dopuštenje za objavu paketa (vanjska radnja) |

## 7. Nije posao SRV pisca

| Zadatak | Tko | Napomena |
|---|---|---|
| F4-PREGLED-SRV | neovisni pregled | nalazi idu samo u privatni repo nalaza, ne u javni PR |
| F4-PR-SRV | orkestrator | PR grana → main, tek uz „Spoji n” |
| P-STAGING, STG-AAI | orkestrator i Daniel | računi, tajne i zahtjev Srcu |
| P-OPORAVAK | graditelj | ovisi o P-STAGING |
| A1-AUTOTIPKAC-ZASTAVICA | zadržano | čeka Danielovu odluku C14 |
| NAC-F3-1000 | — | ovisi o NAC-F2-OPT; pokretanje izvan lokalnog stroja traži novu Danielovu riječ |
| F4-NAS-R17-SRV | — | zatvoreno bez koda (odluka D-239, 26. 11.) |

## 8. ZA LAB: polja koja WEB treba po novoj ruti ili polju

| Ruta | Polja za lažne podatke u WEB-u |
|---|---|
| `public.verification-code.post` | zahtjev `{code}`; odgovor isti kao `public.verification.post` (`outcome`, vrijeme predaje i potpisa, `keyId`) |
| `student.notice.get` | `courseName`, `mentorName`, `differsFromFacultyRules` |
| `live.document.get` | `documentKind` |
| `student.source-recommendations.get` | `items[].id`, `title`, `url`, `note`, `addedAt` |
| `teacher.deadline-extensions.get` | `existingSubmission.submittedAt` po studentu |
| `teacher.course-students.get` | `title`, `workType` |
| `work.consultation-records.*` | `heldAt` |
| `mentorship.student-requests.get` | `declineReason` |
| `student-work.works.get` | `noticeChangedSinceSeen`, `afterDeadline` |
| `institution.course-assignments.post` | `groupIds` (sada prihvaćen) |
| `institution.admin-courses.post` | `groups[].name` |
| `evidence.commit.post` | novi ishod „zadrži tekst s ovog uređaja” (ime u ugovoru vala 2) |
| izjava (PRE-R02 B) | popis obveznih razgovora (`transferred`) |

Točna imena polja određuje ugovor u PR-u svakog zadatka. Do tada WEB koristi imena iz ove tablice i tako ih označi u lažnim podacima.

## 9. Za Daniela (popis, bez odluka)

- ODOBRENO za val 1 #9 (1.1 (3), migracija javne provjere po kodu) i val 1 #17 (F4-PM2-R01B, slika).
- ODOBRENO za skupni migracijski PR vala 2 (svih 9 zadataka).
- 1.1 (3): nalog traži isti put, ali je predložena nova ruta `/api/v1/public/verification/code`. Zamjena tijela postojeće rute bila bi prijelomna promjena.
- 1.4: student čita razlog odbijanja iz revizijskog traga.
- 1.8 i 1.9: nova tablica veze zadatak–grupa i upis grupa pri stvaranju kolegija (prava administratora).
- F4-EDI-R05-SRV: novi ishod commita na kritičnom putu evidencije.
- Odluke koje drže val 3: v4 u pilotu (R03), OP-V22-1 / PG-10 (R08), D-30 (R12), C14 (A1).
- Vanjske radnje: objava paketa `@ductura/contracts` 3.x (PM1-R11), računi za OneDrive, SharePoint i Google Drive (PM2-R21), pokretanje NAC-F3-1000 izvan lokalnog stroja.

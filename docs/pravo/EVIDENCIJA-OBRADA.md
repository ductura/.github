# Evidencija aktivnosti obrade, čl. 30. GDPR (nacrt)

> **PRIJEDLOG — konačno odlučuju Daniel i pravnik.** Nacrt nije pravni savjet ni pravno mišljenje. Opisuje što kod i planovi rade, ne ocjenjuje zakonitost. Sva mjesta označena **[PRAVNIK]** čekaju pravnika. Stanje izvora: `ductura/Institution_server`, grana `migracija/kopija-ductus-backend`, 26. 11. 2026.

Evidenciju vodi voditelj obrade; izvršitelj vodi evidenciju za obrade koje radi za voditelja (čl. 30. st. 2.). Tko je što, određuje pravnik. Ovaj nacrt preuzima obrade O-1 do O-16 iz `docs/plan/DPIA-OBRADE.md` i dopunjuje ih stvarnim shemama baze (Institution_server). Brojevi klasa su iz `docs/ductus/privacy/06-klase-podataka.md`.

## 1. Podaci o voditelju i izvršitelju

| Polje | Vrijednost |
|---|---|
| Voditelj | **[PRAVNIK: ustanova ili Ductura po obradi]** |
| Zajednički voditelj / predstavnik | **[PRAVNIK]** |
| Službenik za zaštitu podataka | **[PRAVNIK: kontakt]** |
| Izvršitelj | Ductura (ako pravnik potvrdi), uz ugovor iz UGOVOR-O-OBRADI-FAKULTET.md |

## 2. Obrade

Pravna osnova i rok namjerno nisu popunjeni ondje gdje ih nitko nije odlučio. Kategorije ispitanika: studenti (S), nastavnici i mentori (N), osoblje ustanove (O), administratori platforme (A).

| # | Obrada | Ispitanici | Kategorije podataka (klase) | Shema / spremnik | Primatelji | Prijenos izvan EU | Rok | Mjere |
|---|---|---|---|---|---|---|---|---|
| O-1 | Prijava i sesije | S, N, O | identitet, ime, sesije (1, 2, 3) | `identity` (user_account, person_name, session, staff_affiliation) | poslužitelj; ime vide nastavnik, mentor, admin ustanove | **[PRAVNIK]** (Render) | sesije 30 dana nakon kraja | RLS, hashirane oznake, kolačići nužni |
| O-2 | Zapisi prijava i rada sustava | svi | događaji, skraćena IP, identifikator zahtjeva | `ductus_logs` (log_entry, metric_sample), `identity.ops_alarm` | operater | **[PRAVNIK]** | otvoreno (S-1K.8) | zapis samo dodavanje (lanac), bez teksta rada |
| O-3 | Nastava i članstvo | S, N | kolegiji, članstvo, kodovi i pokušaji upisa, uloge, mentorstva, trag ovlasti (4, 5, 26) | `institution` (course, course_member, enrollment_attempt, mentorship …), `audit.*_event` | nastavnik kolegija, admin ustanove | **[PRAVNIK]** | otvoreno (D-30, Q-16) | RLS iz odnosa (C-23) |
| O-4 | Zadaci, pravila, obavijesti | N, S | zadaci i verzije, pravila fakulteta, jezik rada, iznimke, obavijesti (6, 7, 9, 10) | `institution` (assignment, assignment_version, faculty_rule_version, notification, notice_acknowledgment, work_accommodation) | studenti kolegija, nastavnik | — | otvoreno | RLS; oznaka prilagodbe vidi samo nastavnik |
| O-5 | Pisanje rada i evidencija nastanka | S | projekt, dokument, revizije, kontrolne točke s punim tekstom, odsječci, potvrde (11, 13, 14, 21, 27) | `evidence` (project, document, document_revision, document_checkpoint, segment, package, receipt, origin_segment), S3 po ustanovi | student; nastavnik/mentor kroz odnos | **[PRAVNIK]** (S3 pružatelj nije izabran) | otvoreno; hash/potvrde se ne brišu (D-272 MQ06) | JCS hash, potpis potvrda, ključ ustanove |
| O-6 | Lokalni dnevnik | S | tekst rada dok se ne sinkronizira (30) | IndexedDB u pregledniku | korisnik uređaja | — | do sinkronizacije/odjave | brisanje pri odjavi |
| O-7 | Prikaz uživo, sažetak, ponovni prikaz | S, N | stanje prikaza, sažetak, zapis pristupa (15, 21, 25) | `collaboration.live_state`, `audit.access_log` | nastavnik zadatka, mentor | — | otvoreno | zapis pristupa za nastavničku ulogu; student čita bez zapisa |
| O-8 | Predaja, komentari, dorade | S, N | predani rad, potvrda, komentari, dorade, povlačenje (16, 18, 19, 27) | `evidence.submission*`, `collaboration.comment*`, `collaboration.revision_*` | student, nastavnik, mentor | — | prijedlog "prema pravilniku fakulteta" | potvrda predaje, RLS |
| O-9 | Podudaranje s AI pomoćnikom | S, N | odgovori pomoćnika i tekst rada (24); deterministička usporedba | `evidence.assistant_match_*` | nastavnik (oznaka) | — | otvoreno (Q-10) | nije dokaz autorstva, ne blokira |
| O-10 | AI pomoćnik | S | odlomak koji student pošalje, izjava o pomoći AI-ja (17, 24) | `assistant.*`, `declaration.*`; odlomak ide pružatelju (OpenAI) | OpenAI (izvršitelj, **[PRAVNIK]**) | **DA, [PRAVNIK]** (DPIA-OPENAI.md) | otvoreno | za prave studente `ai_disabled` dok nema mišljenja |
| O-11 | Prijava problema | S, N | opis i zatvoreni tehnički kontekst (31) | `identity.problem_report`, `problem_report_status_event` | podrška | — | otvoreno | bez teksta rada |
| O-12 | Prihvat pravnih tekstova | svi | verzija prihvaćenog teksta (D-301) | `ductus_legal` (`legal.text_version`; prihvat s DAN-847-2) | — | — | otvoreno | nepromjenjivo (triggeri), samo hash teksta |
| O-13 | Administratori platforme | A | korisničko ime, hash lozinke (argon2id) | baza Aplication_servera (`admin.platform_admin`) | — | **[PRAVNIK]** | otvoreno | — |
| O-14 | Podaci o ustanovi | ustanove | naziv, slug, `aai_home_org`, OIDC issuer | baza Aplication_servera (`institutions`) | — | — | otvoreno | — |
| O-15 | Kopije | kao O-1 do O-12 | sve klase (29) | pružatelj hostinga | — | **[PRAVNIK]** | po vrsti kopije (D-12) | PITR 3 dana je tehnička postavka |
| O-16 | Evaluacija pilota | S, N | ankete i razgovori (8) | nije određeno; `institution.questionnaire*` za ankete u aplikaciji | tim pilota | — | prijedlog "do kraja evaluacije" | odvojeno od evidencije |
| O-17 | Anonimna uzajamna recenzija | S | tuđi rad čitan u krugu recenzije | `institution.peer_review*`, `audit.access_log` | recenzent (neutralna uloga), nastavnik vidi identitet | — | otvoreno | privremeno po OP-V19-6 |
| O-18 | Izvozni paket studenta | S | paket vlastitih podataka (20) | `app.student_data_export`, S3 | student | — | 24 h (D-273) | kratkotrajna poveznica |

O-17 i O-18 nisu u `DPIA-OBRADE.md` (dodane izgradnjom nakon 22. 11.); dodati ih ondje je zasebna odluka.

## 3. Izvršitelji i podizvršitelji

| Subjekt | Uloga | Lokacija | DPA | Stanje |
|---|---|---|---|---|
| Render | hosting poslužitelja i baza | Frankfurt (`render.yaml`) | nije ugovoren | **[PRAVNIK]** |
| Vercel | hosting fronta i rub | nije određeno | nije ugovoren | **[PRAVNIK]** |
| Pružatelj S3 | odsječci evidencije | nije izabran | — | otvoreno |
| AWS KMS | potpis potvrda (samo digest) | eu-central-1 (prijedlog) | — | planirano (D-71, D-92) |
| OpenAI | odgovor AI pomoćnika | EU projekt (`eu.api.openai.com`) uz uvjete, vidi DPIA-OPENAI.md | tekst DPA-a nije pročitan (HTTP 403) | D-316; čeka pravno mišljenje |
| Srce (AAI@EduHr) | izvor identiteta | HR | — | je li izvršitelj **[PRAVNIK]** |

## 4. Tehničke i organizacijske mjere (sažetak)

Pristup nastaje iz odnosa (student u kolegiju, nastavnik zadatka, mentor rada), ne iz uloge (C-23); RLS na svakoj tablici s pgTAP matricom pristupa; klijent piše samo kroz RPC; revizijski trag samo dodavanjem; tajne izvan repozitorija; testovi samo s izmišljenim podacima. **[PRAVNIK/DPO: ocijeniti dovoljnost.]**

## Otvorena pitanja za pravnika

1. Uloga (voditelj/izvršitelj) za svaku obradu.
2. Pravna osnova za O-1 do O-18.
3. Hoće li se O-17 i O-18 dodati u popis obrada.
4. Tko vodi evidenciju: ustanova ili Ductura za svoje obrade.

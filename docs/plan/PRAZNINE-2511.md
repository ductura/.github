# Praznine plana, 25. 11. 2026. (prijedlog)

> **Status: PRIJEDLOG.** Istraživanje samo čitanjem koda, na Danielovo odobrenje istraživanja. Ništa se ne dodaje u red ni u plan. Stavke označene „nova funkcija” traže Danielovu odluku; „rupa” je nedostatak u funkciji koja je već odlučena ili spojena.

## Osnova

- Glave: WEB `migracija/kopija-ductus-front` `a8b0d17`, SRV `migracija/kopija-ductus-backend` `b67690e` (API 1.139.0), ovaj repo `main` `24b7a68`.
- Čitano: `PLAN.md`, `NOVE-FUNKCIJE.md`, `FAZA3-A01-A10.md`, `PRIJEDLOZI-2411.md`, `STANJE.md`; u WEB-u `docs/prototip/INVENTAR-*.md`, `docs/nalazi/` (pariteti, nove funkcije, VIZ-WCAG), stranice `packages/app/app/[base]/**`, klijent `src/client/**`; u SRV-u `openapi/v1.json` (343 operacije) i `server/**`.
- Usporedba ruta: svaka operacija iz `openapi/v1.json` tražena je u WEB kodu (bez testova i generiranih datoteka) po `operationId` i po putanji, a sumnjive su provjerene ručno.
- Granica: `_raspored/red.json` nije dostupan iz oblaka. „Nema zadatka” znači samo da ID zadatka nije nađen u `STANJE.md`, planu ni komentarima koda; red treba provjeriti prije otvaranja zadataka.
- Kratice: `A/` = WEB `packages/app/src/host/`; vel. S/M/L kao u NF pregledima.

## Stavke (sortirano po prioritetu)

### Pilot nužno

| # | Stavka | Dokaz | Vel. | Vrsta |
|---|---|---|---|---|
| 1 | Potpis izvan dev-a (D-71): u stagingu nema `DUCTUS_KMS_*`, a `EVIDENCE_STORAGE_DOMAINS` je prazan, pa commit odgovara 503. Kod za KMS postoji; čeka ključ (Daniel). | SRV `render.staging.yaml:57-59`, `docs/STAGING.md:221`, `server/http/evidence-deps.ts:11-14`; `STAGING-KONFIG.md:59` | M | rupa (konfiguracija) |
| 2 | Docker slika SRV-a kopira samo `dist`, bez `config/faculties` (obrasci izjave, pravila, ISVU). Uz to `config/faculties/fpzg/` nema `declaration/` ni `rules.json` (sadržaj daje fakultet). | SRV `infra/web/Dockerfile:41-42`, `server/http/statement/index.ts:171`, `config/faculties/fpzg/` | S | rupa |
| 3 | Staging nema puta do prvog administratora ustanove ni početnih podataka (traži `BYPASSRLS`, pravna baza se ne stvara), pa nema kolegija ni zadataka. | SRV `docs/STAGING.md:203-218` | M | rupa |
| 4 | Stvarni AAI@EduHr: svi prolazi su na lažnom OIDC-u; STG-AAI čeka testni klijent Srca. | `STANJE.md` (Zadržano, STG-AAI) | S | vanjska ovisnost |
| 5 | Nema sistemskog dokaza iza predaje: PDF potvrde, `/provjera` s ključem iz KMS-a, „Vrati na doradu” → student vidi → ponovna predaja, student vidi komentar nastavnika, popis predaja, Merlin paket. Funkcije postoje, sistemski test ih ne prolazi. | WEB `e2e/sistem/` (INT-02, 03, 04, 05, 13, 15, 20); `zavrsni-pregled-nastavnika.sistem.ts:93-97` | M | rupa (dokaz) |
| 6 | Nastavnik ne vidi studentove napomene uz predaju, a studentu sučelje kaže „Vidi je nastavnik uz sažetak”. Postoje samo `student.submission-notes.*`, nastavnička ruta za čitanje ne postoji. | WEB `A/teacher/n10/SummaryPage.tsx:133-135`, `A/student/submission/summary/messages.hr.ts:82` | M (SRV+WEB) | rupa (PR-6) |
| 7 | „Student je vidio” (PG-9, MK-11) ostaje prazno: web studenta nikad ne poziva `work.seen.post`, a nastavnik čita `work.seen-by-student.get`. | SRV `openapi/v1.json` `work.seen.post`; WEB `A/teacher/work/review/extras.ts:25`, `A/teacher/mentorships/seen-port.ts:11` | S | rupa |
| 8 | Pitanje nastavnika uz izjavu (NZ-15, PR-20): polje je trajno onemogućeno s napomenom da ruta ne postoji, a `teacher.declaration-question.get/put` postoje. | WEB `A/teacher/assignment-form/QuestionField.tsx:10-20` | S | rupa (web zastario) |
| 9 | Otvaranje mentorstva (MK-7): gumb onemogućen, „server nema operaciju”, a `mentorship.open.post` i `notifications.mentorship-opened.list.get` postoje; student ne dobiva obavijest. | WEB `A/teacher/mentorships/OpenMentorshipCard.tsx:3-5`, `messages.hr.ts:71` | S–M | rupa (web zastario) |
| 10 | Kasna predaja (NZ-4a, NZ-5 B): iznimka piše „još nije dostupna”, a `teacher.late-exception.post` i `student.late-exceptions.get` postoje; izbor „predaja nakon roka” u obrascu ne šalje `institution.assignment-late-submission.put`, a student ne čita `student.assignment-late-submission.get`. | WEB `A/teacher/n13/messages.hr.ts:14-15`, `A/teacher/assignment-form/SubmissionRules.tsx:30` | M | rupa (web zastario) |
| 11 | NZ-8 (tko je pročitao i potvrdio obavijest zadatka): `teacher.assignment-follow-up.get` postoji, web ga ne poziva; INVENTAR i dalje kaže da polje nedostaje. | WEB `docs/prototip/INVENTAR-nastavnik.md:624` | S | rupa (web zastario) |
| 12 | „Vraćeno na doradu” nije u zvonu: zvono zna pet vrsta, a `notifications.returned-for-revision.list.get` se ne čita. Dorada se vidi samo na koracima predaje. | WEB `A/shell/notifications/inbox.ts:10`, `A/student/submission/index.tsx:183` | S | rupa |
| 13 | Izvoz podataka studenta nije dovršen: posao `runStudentDataExportPass` nitko ne pokreće, pa poveznica nikad ne nastaje, a „Moja prava” i ekran administratora je obećavaju. Ili spojiti posao, ili tekst uskladiti s ručnim postupkom (K7). | SRV `server/privacy/student-data-export/job.ts:82`, `index.ts:17`; WEB `A/public/my-rights/messages.hr.ts` | M | rupa |
| 14 | OA-10 uvoz popisa studenata (Merlin/ISVU): `institution.roster-imports.post` i `…-confirm.post` postoje, web nema ni poziva ni ekrana. Čeka primjer izvoza FPZG-a (PLAN §6a). | SRV `openapi/v1.json`; WEB bez pogodaka za `roster-import` | M | rupa |
| 15 | Plan si proturječi: PLAN §6a (D-241, C15) kaže da su u pilotu samo obavijesti u aplikaciji i da je asistent u fazi A isključen; NOVE-FUNKCIJE NF-1, NF-4 i dalje kažu da e-pošta ulazi u pilot i da asistent radi. | `PLAN.md` §6a; `NOVE-FUNKCIJE.md` NF-1, NF-4 | S | dokument |
| 16 | Poruka o sukobu kaže „javite se podršci”, ali uz nju nema gumba „Javi problem” (postoji samo kod zaustavljenog slanja). | WEB `src/lib/i18n/messages.hr.ts:1126`, `src/components/editor/LocalDocument.tsx:802,857` | S | rupa |
| 17 | Poslužitelj ne radi u trenutku roka: poruka ne spominje rok, nema poveznice na `/stanje` ni upute o iznimci kasne predaje. | WEB `A/student/submission/submit/messages.hr.ts:16-17,52` | S | rupa |
| 18 | Ručna provjera čitačem zaslona (NVDA, VoiceOver) za editor, predaju i stanje spremanja nije napravljena. | WEB `packages/app/e2e/a11y/RUCNA-PROVJERA.md:9-28` | S (rad) | rupa |
| 19 | „Pošalji doradu” (PR-16): `send: null`, student vidi „Slanje dorade trenutačno nije dostupno”. Provjeriti preklapa li se s ponovnom predajom nakon povrata. | WEB `A/editor/work/review/review-model.ts:43-47`, `ReviewHost.tsx:95-96` | M (SRV+WEB) | rupa |
| 20 | Predani rad studentu nema tekst za čitanje, samo bilješku. | WEB `A/student/work.tsx:66`; `docs/nalazi/paritet-student-2.md:162,168` | S–M | rupa |

### Korisno

| # | Stavka | Dokaz | Vel. | Vrsta |
|---|---|---|---|---|
| 21 | Karta podrijetla uz tekst (PG-2): web uvijek pokazuje „tekst nije dostupan”, a `work.origin-segments.get` sada daje raspone po reviziji. Pravni pregled ostaje uvjet. | WEB `A/teacher/provenance/ProvenanceMap.tsx:66-67`, `A/teacher/work/pages.tsx:130-132` | L | rupa |
| 22 | Objašnjenje studenta uz pojedini nalaz (PG-7): server ga ne veže uz nalaz. | WEB `A/teacher/work/review/PgSections.tsx:101-102` | M (SRV) | rupa |
| 23 | Sukob verzija između uređaja (P-3 u cijelosti) i poruka „rad je otvoren na drugom uređaju” (P-26): u kodu samo oznaka „Sukob”, student može samo izvesti tekst. | `docs/nalazi/nove-funkcije-2-radni-prostor-editor.md:316,345`; `INVENTAR-editor.md:1632` | L | rupa |
| 24 | MK-5, MK-10: mentor ne može dodati dogovoreni zadatak ni ga označiti, student ne može zatražiti termin s pripremom; rute postoje (`work.consultation-tasks.post`, `…-task-mark.post`, `…-slot-requests.post`), web ih ne poziva. | SRV `openapi/v1.json`; WEB čita samo `work.consultation-tasks.get` | M | rupa |
| 25 | „Moji studenti” (MK-11) slaže redak iz čitanja po radu jer „server nema agregat”, a `mentorship.overview.get` postoji. | WEB `A/teacher/mentorships/overview-model.ts:1-3` | S | rupa (web zastario) |
| 26 | Obnova starije verzije ne bilježi se na poslužitelju (`work.restore.post` se ne poziva), pa „vraćeno iz verzije N” vidi samo ta stranica. | WEB `A/student/document-history/restore/client-port.ts:40-63` | S | rupa |
| 27 | N-06 „Rad nije predan do roka” nikad se ne prikazuje: `WorkFrame` dobiva bez `deadlinePassed` i `started`. | WEB `A/teacher/work/pages.tsx:175`, `A/teacher/n06/WorkFrame.tsx:20,77` | S | rupa |
| 28 | „Kako vidi nastavnik” u editoru trajno onemogućen (nema `teacherHref`). | WEB `A/student/work.tsx:115`, `A/editor/shell/ShellView.tsx:51-58` | S–M | rupa |
| 29 | Nastavnik nema ekran za uklanjanje studenta s kolegija i povrat dopuštenja (`institution.student-removal.post`, `…student-return.post`); poziv postoji samo u zamrznutom `src/_cekanje`. | WEB `src/_cekanje/app/api/institution/courses/…/removal/route.ts` | S–M | rupa |
| 30 | Izvoz PDF-a pregleda kod nastavnika možda se ne bilježi kao izvoz u dnevnik pristupa (NF-5 t. 5 to traži). Provjeriti. | SRV `server/http/export/read-source.ts:26-29` | S–M | rupa (provjeriti) |
| 31 | Obavijest studentu o produljenju roka ili odobrenoj kasnoj predaji: takva vrsta obavijesti ne postoji. | SRV `server/contracts/routes/notifications.ts:15-21` | M | nova funkcija |
| 32 | Sistemski workflow nije obvezna provjera; `e2e/sistem/README.md` i dalje opisuje `test.fail` za INT-15. Slika lažnog OIDC-a ne gradi se u CI-ju. | WEB `e2e/sistem/README.md:26,32`; SRV `docs/STAGING.md:219` | S | rupa |
| 33 | Zastarjeli komentari i tekstovi „ruta ne postoji” zavode pisce (uz 8–11 i 25 još `ProblemReportHelp.tsx:18`, `src/client/source-proofs.ts:14`). `VIZ-WCAG.md` N1–N5 također zastario. Web izvadak ugovora je 1.137.0, server 1.139.0. | WEB `A/ProblemReportHelp.tsx:18`, `docs/nalazi/VIZ-WCAG.md:19-71`, `src/client/migration-contract-types.generated.ts:34` | S | rupa |

### Kasnije

| # | Stavka | Dokaz | Vel. | Vrsta |
|---|---|---|---|---|
| 34 | Obvezna literatura kolegija: `teacher.course-literature.*` i `student.course-literature.get` bez ekrana. Stavka plana nije utvrđena. | SRV `openapi/v1.json`; WEB bez pogodaka | M | nova funkcija (provjeriti) |
| 35 | Prekidač asistenta po kolegiju (`teacher.course-assistant.*`, `student.assignment-assistant.get`, `student.assistant-conversations.get`, SRV #737) i kodni testovi zadatka (val 21) bez weba. Asistent ovisi o C15 i Q-10. | SRV `b67690e`, `9d00871`; WEB `A/editor/assistant-chat/assistant-chat.ts:9,134` | M | rupa (iza odluke) |
| 36 | Nastavnik u aplikaciji ne dobiva obavijest o predaji ni o zahtjevu za termin. | SRV `db/main/migrations/20261129100000_in_app_notifications.sql:128-132` | M | nova funkcija |
| 37 | Preloader INT-07 (usmjeravanje po uređaju) nije potvrđen iz WEB/SRV. | `FAZA3-A01-A10.md`, „Što je ostalo otvoreno” | M | nije utvrđeno |
| 38 | Sitni nalazi faze 3 i dalje otvoreni: `vs1.ts:94` `HOME ?? ""`, napomena o ACL-u u `scripts/stack/evidence.ts`, moguće nestabilni `legal-hold.pg.integration.test.ts`, `auth.integration.test.ts:316`, `reconcile-pending-receipts`. | SRV `scripts/stack/` i navedeni testovi | S | rupa (testna infrastruktura) |
| 39 | Konzultacija prije prve verzije nije moguća (ugovor traži `revision` ≥ 1). | WEB `docs/nalazi/paritet-nastavnik-2.md:490` | S (SRV) | rupa |
| 40 | Oznaka vrste rada uz naslov ploče (E-10, N-07, N-09–N-11) i pomoćna rečenica N-11. | WEB `docs/nalazi/paritet-student-2.md:254`, `paritet-nastavnik-2.md:316,420,423` | S | rupa (VIZ) |

## Zaključak

- Za stog na stagingu presudne su 1–4; bez njih tok staje na spremanju.
- Najjeftiniji dobitak su 7–12 i 25: server ruta već postoji, web je zastario. Prijedlog: jedan pregled „web prema ugovoru 1.139.0” prije novih WEB zadataka.
- Sigurnosnih nalaza nije bilo.

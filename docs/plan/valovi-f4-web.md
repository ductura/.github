# Valovi WEB do F4: paralelni pisci

PRIJEDLOG planera (`claude:planer-web-valovi:docs`), 27. 11. 2026. Dokument ne mijenja red zadataka. Red vodi orkestrator; ovo je ulaz za njega.

Izvori i snimke:

| Izvor | Snimka |
|---|---|
| Popis zadataka Ductus#2060 | 27. 11. 2026. 12:19Z, 5 dijelova komentara |
| WEB baza `migracija/kopija-ductus-front` | `8e35784f` (VLAK web #1023 #1024) |
| Kanonski plan `docs/plan/PLAN.md` | `.github` main `e27abd7` |
| Otvoreni WEB PR-ovi | popisi datoteka iz REST-a (`pulls/<n>/files`) |

`H/` u tablicama znači `packages/app/src/host/`. Imena ruta su iz izvatka ugovora `src/client/migration-contracts.generated.json` na bazi.

## 1. Sažetak

- 67 WEB zadataka nije spojeno: 8 slobodno, 23 u otvorenom PR-u, 36 zadržano.
- 48 ide u valove, 19 ostaje izvan valova (odgođeno, zatvoreno, tuđe ili bez koda; §7).
- **Val 1: 24 retka.** Počinje odmah. 17 otvorenih PR-ova koji se međusobno ne preklapaju, 6 provjera „već zatvoreno” i 1 mali zadatak.
- **Val 2: 18 redaka.** Počinje kad se spoji Val 1. Novi zadaci koji su čekali tuđe putanje ili izvadak, i 4 PR-a koja se preklapaju s Valom 1.
- **Završni niz: 8 zadataka.** Manji od 15 jer su svi ostali već u Valu 1 ili 2. Tri staze redom (izjava, potvrda predaje, naslovi) i tri slobodna zadatka. Ne dopunjavam ga zadacima izvan opsega F4.
- Pravilo „najviše 2 PR-a po valu” iz `PLAN.md` §6 t. 3 ne slaže se s ovim planom. Potvrdu traži §8.
- Nalazi koje treba znati prije početka (§6): **#1037 ruši sistemski test potvrde**, **#957 širi skener zabranjenih izraza na sve `messages.hr.ts`**, `e2e/sistem/README.md` je zastario, 4 zadatka u #2060 čekaju izvadak koji već ima njihove rute.

## 2. Pravila valova

1. Zadatak je u valu samo ako ne dijeli nijednu datoteku s drugim zadatkom istog vala. Provjereno po popisima datoteka PR-ova; za nove zadatke po očekivanim mapama.
2. Zajedničku datoteku u valu smije dirati samo njezin vlasnik (§3). Ostali čekaju sljedeći val ili traže od vlasnika.
3. Val počinje kad su spojeni PR-ovi na koje čeka (stupac „Čeka”). Pisac prije početka i prije „spreman” usporedi svoj `git diff --name-only` s datotekama otvorenih PR-ova.
4. Jedan zadatak, jedan PR, redovita pravila (Closes, `DAN-xxx`, testovi zeleni, bez tajni, samo izmišljeni podaci).
5. Zadatak čiji je rupa već zatvorena završava s GOTOVO bez koda i dokazom (putanja i test). Ovdje je to samo moja procjena iz koda; pisac je potvrđuje.
6. Spajanje ostaje kroz vlak i „Spoji n”. Dok se potvrdi pravilo iz §8 t. 1, preporučujem vlakove do 6 PR-ova s `ci-ok` na vrhu.

## 3. Zajedničke datoteke i vlasnici

| Datoteka ili mapa | Tko je dira | Vlasnik / pravilo |
|---|---|---|
| `src/client/migration-contracts.generated.json`, `migration-contract-types.generated.ts`, `migration-contract-vectors.generated.json` (izvadak) | #1045 i #1046 (oba), a trebaju ga i EDI-R07, IZJAVA-V2, IZVADAK-PRILAGODBA, STU-R08, S08-KOD | Val 1: #1045. Val 2: jedan PR izvatka (orkestrator, izvadak-auto). Završni niz: isto, jedan PR. Pisci ne dodaju retke u izvadak; PR koji treba rutu čeka izvadak. |
| `scripts/forbidden-terms/ui-text.ts` | #957 | #957 u Valu 1. Skener postaje strožiji za sve ostale (§6 t. 2). |
| `H/**/messages.hr.ts` (185 datoteka, po jedna po modulu) | svaki zadatak u svojoj mapi | Sukob samo unutar iste mape. Zajednički `packages/app/src/i18n/messages.hr.ts` i `locales/hr.ts` nijedan zadatak u valovima ne treba; ne dirati. |
| `H/Host.tsx`, `H/states/*`, `packages/ui/src/tokens/tokens.css`, `packages/app/app/error.tsx`, `not-found.tsx`, `global-error.tsx`, 5 javnih stranica, 3 `e2e/a11y` specifikacije | 9 dizajnerskih PR-ova | Isti temeljni commit `94ee071` (WEB-DIZ-S-ZAJEDNICKO) u svih 9; blobovi su jednaki onima na bazi (npr. `States.tsx` `f90320be`), pa spajanje ne sukobljava. Ne računam kao preklapanje. Nitko ih dalje ne mijenja do WEB-NASLOVI-SVE. |
| `packages/app/src/routes.ts`, `H/pages.tsx` | #1032 (ako ruta priprema razgovora nije u paketu), WEB-NASLOVI-SVE | Val 1: #1032. Završni niz: NASLOVI-SVE. Nijedan drugi zadatak ne dodaje rutu. |
| `H/teacher/work/pages.tsx` | #1032, PM2-R04 | #1032 prvi (Val 1), PM2-R04 poslije (Val 2). |
| `H/student/work.tsx`, `H/student/work/*`, `H/student/enrol/HostNotice.tsx` | #1031, STU-R08, NASLOVI-SVE | #1031 (Val 1), pa STU-R08, pa NASLOVI-SVE. |
| `src/components/editor/EditorPage.read.ts` | #1031, #1037, #1040 | Tri vala po redu: #1031, #1037, #1040. |
| `H/teacher/ai-declaration/AiDeclarationSection.tsx`, `src/client/declaration*.ts` | #1040, NAS-R04, IZJAVA-V2, EDI-R07 (samo `declaration-attachments.ts`) | Staza izjave: #1040, NAS-R04, IZJAVA-V2. EDI-R07 ne dira `declaration.ts` ni nastavnički dio. |
| `e2e/sistem/*` | #1037 (mora ažurirati), #1040, IZJAVA-V2, NASLOVI-SVE | Po redu: #1037, #1040, IZJAVA-V2, NASLOVI-SVE. `pins.json` samo ako novi zadatak traži noviji server. |
| `src/middleware.ts` | #914 | #914 jedini. |
| `package.json` (korijen, `packages/app`, `src/client`) | nitko | Nijedan zadatak ne treba novu ovisnost. Podizanje `@ductura/contracts` 3.x (PM1-R11) je odgođeno. |
| `src/client/server.ts` | nitko | Ne dirati. |
| `packages/app/test-fakes/viz-*.ts`, `packages/app/e2e/viz/*` | nitko od očekivanih | Ako zadatak dodaje VIZ scenarij, javlja se orkestratoru; jedan vlasnik po valu. |

## 4. Sistemski e2e (`e2e/sistem`)

Posao `sistem` je u `needs` posla `ci-ok` u `ci.yml`. Okida se na svaki push u bazu, na PR koji dira `packages/app/src/host/editor/`, `e2e/sistem/` ili `playwright.sistem.config.ts`, i na sve što pokreće svaki posao. Testovi traže stvarne naslove, gumbe i tekstove:

| Test | Što čita | Zadaci koji ga mogu slomiti |
|---|---|---|
| `vs1-prijava-spremi-osvjezi` (INT-02) | tekstno polje „Tekst rada”, oznaka spremanja | #1031, #1025, #1033, #1038, PM2-R14, PM2-R15, EDI-R07 (nisko) |
| `zavrsna-predaja-studenta` (INT-03) | „Dalje”, „Predaj rad”, „Spremi izjavu”, kvačica „Potvrđujem izjavu”, dijalog „Predati rad?”, „Prije predaje”, „Predaj potvrđenu verziju V<n>”, naslov izjave razine 1, „Izjava o pomoći je spremljena na poslužitelju.”, „Predano …”, **otisak u grupama po 4**, „Samo za čitanje”, „Potvrđena d. m. gggg.” | **#1037** (skriva otisak), #1040, IZJAVA-V2, S08-KOD, NASLOVI-SVE, #1031 |
| `zavrsni-pregled-nastavnika` (INT-04) | „Brz put”, poveznica na studenta, „Otvori rad”, regija „Sažetak procesa”, obrazac „Novi komentar”, regija „Komentari i prijedlozi”, SHA predanog teksta uspoređen s potvrdom | #911, #1046 (mijenja izvor predane verzije), #1032, PM2-R04 |
| `k4-puni-tok` (PM2-R10) | „Kod kolegija”, „Upiši”, kvačica „Pročitao/la sam obavijest”, „Potvrdi i otvori editor”, „Započni rad”, „Otvori editor”, adrese `/upis`, `/zadatak/<id>`, `/rad/<id>` | #1021, #1031, STU-R08, V17-R01, NASLOVI-SVE |
| `tok-administrator-ustanove` (INT-05) | obrazac na `/ustanova/kolegiji` | NASLOVI-SVE. Nijedan drugi zadatak u valovima ne dira tu stranicu. |
| `editor-val1` (INT-13) | alatna traka „Oblikovanje teksta”, svaki gumb trake, axe na 1250 i 400 px | #1031, #1025, #1033, #1038 |
| `dvije-kartice-odjava` | gumb „Odjava”, dijalog „Odjava”, poveznica „Ductura: Moji zadaci” | NASLOVI-SVE, #1031 |

Pravilo: tko mijenja tekst ili ulogu kontrole koju test čita, ažurira test u istom PR-u i to piše u opisu. Test se ne briše ni ne slabi.

## 5. Valovi

Stupci svake tablice su četiri tražena odgovora: (1) datoteke, (2) ovisnost o SRV-u i rad na lažnim podacima, (3) sukob sa zajedničkim datotekama, (4) sistemski e2e. Redoslijed redaka je redoslijed spajanja.

### Val 1: počinje odmah (24 retka)

Vlasnici: izvadak #1045; skener #957; `routes.ts` i `teacher/work/pages.tsx` #1032; `student/work.tsx` i `HostNotice.tsx` #1031; `middleware.ts` #914.

Redoslijed spajanja: #957, #1045, mali PR-ovi (#1034, #1050, #1038, #911, #914), dizajnerski PR-ovi (#1021, #1027, #1029, #1030, #1026, #1028, #1032, #1033, #1025), zadnji #1031 (najveći, 64 datoteke). Provjere „već zatvoreno” i V14-R06 u bilo kojem trenutku.

| # | Zadatak | PR | (1) Datoteke | (2) SRV i lažni podaci | (3) Zajedničke | (4) Sistemski e2e |
|---|---|---|---|---|---|---|
| 1 | F4-MEN-R05 | #957 | `H/editor/mentor/messages.hr.ts`, `H/editor/work/consult/messages.hr.ts`, `scripts/forbidden-terms/ui-text.ts` (+test) | Bez SRV-a | Vlasnik skenera | Okida `sistem`; samo tekstovi, imena kontrola ostaju |
| 2 | F4-MEN-R09 i R10, dio izvatka | #1045 | 4 datoteke izvatka (`src/client/migration-contract*.generated.*`, `contract-reader.test.ts`) | Dodaje `working-style.get/put` (SRV#903) i `notifications.messages-and-slots.list.get` (SRV#862) | Vlasnik izvatka Vala 1 | Ne |
| 3 | F4-PM1-R08 | #1034 | `H/teacher/teaching-team/*`, `src/client/teaching-team.ts` | Rute postoje; lažni podaci da | Nema | Ne |
| 4 | WEB-MEN-LITERATURA-404 | #1050 | `H/editor/sources-mention/required-literature(.test).ts` | Ruta možda ne postoji: tada tiho preskoči panel i PITANJE | Nema | Okida `sistem`; ne dira ništa što test čita |
| 5 | WEB-PM2-R19-PLANER-MONTAZA | #1038 | `H/editor/left/LeftSectionsHost.tsx`, `work-planner-mount.test.ts` | Bez nove rute; lažni podaci da | Nema | Okida `sistem`; lijevi stupac ne smije promijeniti traku ni „Tekst rada” |
| 6 | F4-EDI-R20 | #911 | `H/editor/comments/{CommentsPanel.tsx,messages.hr.ts,step.dom.test.ts}` | Vrste komentara traže ugovor (Q-6); lažni podaci da | Nema | INT-04 koristi „Novi komentar” i „Komentari i prijedlozi”: imena ostaju |
| 7 | F4-V18-22-R04-MW | #914 | `src/middleware.ts`, `src/lib/security/middleware-matcher.test.ts` | Bez SRV-a; zaglavlja provjeriti curlom na `next start` | Jedini vlasnik `middleware.ts` | Ne okida. Kritično (CSP): traži ODOBRENO |
| 8 | WEB-DIZ-S02-S05 | #1021 | `H/student/{courses,enrol,home}/*`, `H/student/enrollment.tsx` | Rute postoje; lažni podaci da | `CoursesPages.tsx` (čeka #1047) | Pokrenuti `k4-puni-tok` (upis) |
| 9 | WEB-DIZ-B-V22 | #1027 | `H/admin/isvu/{IsvuPage.tsx,IsvuRoute.tsx,messages.hr.ts}` | Rute postoje | Nema (OPE-R05 čeka) | Ne |
| 10 | WEB-DIZ-B-V13 | #1029 | `H/slides/{editor,export,submit}/*`, `H/slides/human-time.ts`, `H/teacher/slides/*` | Rute postoje | Nema | Ne |
| 11 | WEB-DIZ-B-V19 | #1030 | `H/student/{peer-review,practice-journal,work-team}/*` i dr. (49 datoteka) | Rute postoje | Nema | Ne |
| 12 | WEB-DIZ-B-V18 | #1026 | `H/student/questionnaire/*`, `H/teacher/{questionnaire,questionnaire-export}/*` | Rute postoje | Nema | Ne |
| 13 | WEB-DIZ-B-V17 | #1028 | `H/admin/work-template/*`, `H/student/rubric/*`, `H/teacher/{comment-bank,rubric,work/rubric}/*` | Rute postoje | Nema | Ne |
| 14 | WEB-DIZ-B-N14 | #1032 | `H/teacher/interview/*`, `H/teacher/work/pages.tsx`, moguće `routes.ts` | Rute postoje | `pages.tsx`, `routes.ts` (čekaju PM2-R04, NASLOVI) | Pokrenuti `zavrsni-pregled-nastavnika` |
| 15 | WEB-DIZ-B-V21 | #1033 | `H/editor/{areas/skeleton,code-block,code-run,formula,rules}/*` | Rute postoje | Nema | Okida `sistem`; traka INT-13 |
| 16 | WEB-DIZ-B-V20 | #1025 | `H/editor/{reading-mode,reading-settings}/*` | Bez SRV-a | Nema | Okida `sistem`; traka INT-13 |
| 17 | WEB-DIZ-B-EDITOR | #1031 | `src/components/editor/*`, `H/student/{work.tsx,work/*,enrol/HostNotice.tsx,notice/*,access-log/*}`, 8 e2e | Rute postoje | `work.tsx`, `HostNotice.tsx`, `EditorPage.read.ts` (čekaju STU-R08, #1037, #1040, NASLOVI) | INT-13, `dvije-kartice-odjava`, `k4-puni-tok` |
| 18 | F4-PM2-R03 | — | Već: `H/teacher/proposals/port.ts` mapira `collaboration.suggestions*` (F4-PM1-R02) | Rute u izvatku | Nema | Ne |
| 19 | F4-PRE-R01 | — | Već: `H/student/submission/submit/timing.ts` čita `student.assignment-late-submission.get` i `student.late-exceptions.get` | Rute u izvatku | Nema | Ne |
| 20 | F4-PM1-R04 | — | Već: `H/editor/work/consult/StudentCriteria.tsx`, `src/client/student-working-criteria.ts` | `student.working-criteria.get` u izvatku | Nema | Ne |
| 21 | F4-V14-R02 | — | Već: `packages/editor-core/src/journal/sheet-saver.ts`, `serverSync/sheet-sync.ts`, `atomic-dexie-journal.sheet.test.ts`. Provjeriti SYNCED uz potpis | Bez nove rute | Nema | Ne |
| 22 | F4-V14-R04 | — | Već montirano: `H/student/submission/sheet/SheetSummary.tsx`, `H/teacher/work/sheet/SheetReview.tsx` | Rute postoje | Nema | Ne |
| 23 | F4-V14-R05 | — | Već: `H/editor/sheet-export/SheetExport.tsx` uvezen u `SheetPage.tsx` | Rute postoje | Nema | Ne |
| 24 | F4-V14-R06 | — | `packages/editor-core/src/sheet/{golden-vectors.json,sheet.test.ts}` | Vektori su bajt-ista kopija iz SRV-a; bez rute | Nema | Ne |

Redci 18 do 23: moja procjena iz koda na `8e35784f`. Pisac provjeri, pa zatvori kao GOTOVO bez koda ili otvori mali PR za ono što fali.

### Val 2: počinje kad je Val 1 spojen (18 redaka)

Čeka: #1027 (OPE-R05), #1032 (PM2-R04), #1031 (#1035, #1037), #1021 (#1047, V17-R01), #1045 (MEN-R09 i R10 klijent). Ostali zadaci čekaju samo da njihove mape budu slobodne.

Vlasnici: izvadak Vala 2 (redak 1); `e2e/sistem/zavrsna-predaja-studenta.sistem.ts` #1037; `teacher/work/pages.tsx` PM2-R04.

Redoslijed spajanja: izvadak Vala 2, #1046, ostali PR-ovi i novi zadaci u bilo kojem redu, #1037 zajedno sa svojim popravkom sistemskog testa.

| # | Zadatak | PR | (1) Datoteke | (2) SRV i lažni podaci | (3) Zajedničke | (4) Sistemski e2e |
|---|---|---|---|---|---|---|
| 1 | Izvadak Vala 2 | orkestrator | 3 datoteke izvatka | Dodaje: rutu nastavnika za predanu verziju (F4-NAS-R20-SRV, spojen), `teacher.student-accommodation.get` (SRV#888), declaration v2 (F4-EDI-R07-SRV, spojen) | Vlasnik izvatka | Ne |
| 2 | F4-NAS-R20-RUTA | #1046 | `H/teacher/pre-submit/{PreSubmitPanel.tsx,read.ts}`, `H/teacher/n07/ReceiptPage.tsx` (+testovi) | Prelazi s `GET /api/v1/works/{id}/versions/1` na novu rutu; 404 daje postojeću poruku. Njegov dio izvatka preuzima redak 1 | Izvadak (rebase) | INT-04 uspoređuje SHA predanog teksta: pokrenuti |
| 3 | F4-STU-R14 | #1047 | `H/student/courses/{CoursesPages.tsx,model.ts}` (+testovi) | Vrsta rada i mentor već u odgovoru; lažni podaci da | `CoursesPages.tsx` (nakon #1021) | Ne |
| 4 | WEB-DIZ-B-V15-V16 | #1035 | `H/analysis/*`, `H/thesis/*`, `H/admin/thesis-overview/*`, `packages/app/e2e/val16-razlika.spec.ts` | Rute postoje | `val16-razlika.spec.ts` (nakon #1031) | Ne |
| 5 | WEB-DIZ-S08 | #1037 | `H/student/submission/{index.tsx,receipt,steps,submit,summary}/*`, `EditorPage.read.ts` | Rute postoje | `EditorPage.read.ts` (nakon #1031); e2e/sistem | **PAD:** INT-03 traži otisak u grupama po 4. Ažurirati `e2e/sistem/zavrsna-predaja-studenta.sistem.ts` u ovom PR-u |
| 6 | F4-NAS-R16 | — | `H/teacher/n06/*`, `H/teacher/revision/*` | `revisionDueAt` i `work.revision-due.get` su u izvatku, SRV spojen; lažni podaci da | Nema | Ne |
| 7 | F4-PM2-R14 | — | `H/shared/document-history/*`, `H/editor/work-history/*` | `work.imports.get` u izvatku; `fake-port.ts` postoji | Nema | Okida `sistem` |
| 8 | F4-PM2-R15 | — | `H/editor/draft-panel/{DraftPanelHost.tsx,draft-model.ts}`, novi port | `work.plan.get/put` u izvatku; lažni podaci da | Nema | Okida `sistem` |
| 9 | F4-PM1-R07 | — | Nova `H/teacher/course-assistant/`, montaža u `H/teacher/course-aggregate/CourseAggregate.tsx`. Studentsko čitanje već u `H/student/submission/summary/extras.ts` | `teacher.course-assistant.get/put` u izvatku; lažni podaci da | Nema | Ne |
| 10 | WEB-NF7-POSTAVKE-SPOJ | — | `H/admin/faculty-settings/*`. Čitanje je već spojeno; fali spremanje `thesis-settings` s potvrdom | `institution.thesis-settings.get/put`; lažni podaci da | Nema | Ne |
| 11 | WEB-V17-R01-START-SADRZAJ | — | `H/student/start-work/{StartWork.tsx,template.ts,template-port.ts}` | `student.assignment-template.get` postoji. Prvo pročitati zašto je WEB#906 zatvoren | Nema | `k4-puni-tok` traži gumb „Započni rad”: ime ostaje |
| 12 | F4-V14-R03 | — | `packages/app/e2e/sheet-grid.spec.ts.pending`, `sheet-student.spec.ts.pending`: preimenovati u `.spec.ts` i uskladiti | Lažni API iz fixtura | Nema | Ne |
| 13 | F4-OPE-R05 | — | `H/admin/isvu/*`, novi `packages/app/e2e/admin-uvoz-popisa.spec.ts` | `institution.roster-imports.post` i `institution.roster-import-confirm.post` u izvatku; pregled prije potvrde; lažni CSV | `admin/isvu` (nakon #1027) | Ne |
| 14 | F4-PM2-R04 | — | `H/teacher/direct-edit/*`, montaža u `H/teacher/work/pages.tsx`, novi e2e | `work.direct-edit.get/put` u izvatku | `pages.tsx` (nakon #1032) | INT-04: nova regija ne smije mijenjati postojeće oznake |
| 15 | F4-MEN-R09, klijent | — | `H/editor/right/{MentorMount.tsx,mentor-mount.ts,messages.hr.ts}` | `working-style.get/put` iz izvatka #1045 | `MentorMount.tsx` (MEN-R13 poslije) | Okida `sistem` |
| 16 | F4-MEN-R10, klijent | — | `H/shell/notifications/inbox.ts` (+poruke) | `notifications.messages-and-slots.list.get` iz izvatka #1045 | Nema | Ne |
| 17 | F4-EDI-R07 | #1009 | `H/editor/assistant-chat/*`, `src/client/declaration-attachments.ts` | declaration v2 iz izvatka Vala 2; `ai.attachments` | Ne dira `declaration.ts` ni nastavnički dio | Okida `sistem` |
| 18 | WEB-IZVADAK-PRILAGODBA | — | `src/client/work-accommodation.ts` (+test); ukloniti TODO | `teacher.student-accommodation.get` iz izvatka Vala 2; DOM test da se oznake prikazuju | Izvadak (nakon retka 1) | Ne |

### Završni niz: 8 zadataka, nije val

Manji je od 15 jer ostalo ne postoji u opsegu F4. Zadaci nisu svi neovisni, pa ide u stazama.

| Staza | Redoslijed | Razlog |
|---|---|---|
| Potvrda predaje | #1037 (Val 2), pa #1040, pa S08-KOD | Ista mapa `receipt/`, 21 zajednička datoteka |
| Izjava | #1040, pa NAS-R04, pa IZJAVA-V2 | Svi diraju `teacher/ai-declaration/AiDeclarationSection.tsx` i `declaration*.ts` |
| Slobodni | MEN-R13, STU-R08, V13-R04 | Neovisni jedni o drugima; svaki čeka svoju ovisnost |
| Naslovi | NASLOVI-SVE zadnji i sam | Dira sve stranice, `Host.tsx`, `routes.ts` i sistemski test |

| # | Zadatak | PR | (1) Datoteke | (2) SRV i lažni podaci | (3) Zajedničke | (4) Sistemski e2e |
|---|---|---|---|---|---|---|
| 1 | WEB-DIZ-B-AI-ATT | #1040 | `src/components/predaja/*`, `H/student/submission/{declaration,receipt,steps,submit}/*`, `H/teacher/ai-declaration/AiDeclarationSection.tsx`, `catalog/src/teacher-ai-attachments.tsx`, `EditorPage.read.ts` | Rute postoje | `EditorPage.read.ts` (nakon #1037); `e2e/sistem` | Mijenja `zavrsna-predaja-studenta.sistem.ts`; okida `sistem` |
| 2 | F4-NAS-R04 | — | `H/teacher/ai-declaration/*`, novi `src/client/teacher-declaration-conversation.ts`. Danas `conversations: []` | `teacher.declaration-conversation.get` u izvatku; lažni podaci da (`declaration-fake.ts`) | Nakon #1040 | Ne |
| 3 | WEB-IZJAVA-V2 | — | `src/client/declaration.ts`, `declaration-fake.ts`, `H/student/statement/*`, `H/teacher/ai-declaration/*` | Rute declaration-v2; v1 na serveru ostaje. Test da PUT v2 ne briše `recorded`. SRV-1809 | Nakon NAS-R04; izvadak | INT-03 („Spremi izjavu”): pokrenuti; moguć pomak `pins.json` |
| 4 | WEB-DIZ-S08-KOD | — | `H/student/submission/receipt/*` | Čeka SRV-KOD-POTVRDE i izvadak `student.submission.get` | Nakon #1040; izvadak | INT-03 („Potvrđena d. m. gggg.”) |
| 5 | F4-MEN-R13 | — | `H/editor/right/MentorMount.tsx`, `H/editor/work/consult/ConsultPanel.tsx`. Prvo provjeriti: studentska polovica (`StudentCriteria`) je već spojena | `student.working-criteria.get` u izvatku | Nakon MEN-R09 klijenta | Okida `sistem` |
| 6 | F4-STU-R08 | — | `H/student/enrol/{HostNotice.tsx,messages.hr.ts,model.ts}` | Nova neobavezna polja kolegij i mentor u `student.notice.get` (F4-STU-R08-SRV, još ne spojen); uvjetna rečenica „Razlikuje se od pravila fakulteta”; lažni podaci da jer su polja neobavezna | Nakon #1031; izvadak | `k4-puni-tok`: kvačica i „Potvrdi i otvori editor” ostaju |
| 7 | F4-V13-R04 | — | `e2e/val13-razlika.spec.js` | Traži F4-V13-R01 i R02 na SRV-u (`app.open_student_work` za slajdove); samo na stvarnom stogu | Nema | Ne |
| 8 | WEB-NASLOVI-SVE | — | `H/states/document-title.ts`, `H/Host.tsx`, `routes.ts`, `app/(host)/**/page.tsx`, preimenovanje `H/student/work.tsx` i `H/student/work/index.ts`, `e2e/a11y/document-title.spec.ts`, `e2e/sistem/dvije-kartice-odjava.sistem.ts` | Bez SRV-a | Dira sve zajedničke datoteke: sam, zadnji | `dvije-kartice-odjava`, `k4-puni-tok`, `tok-administrator-ustanove` |

## 6. Nalazi i nesklad

1. **#1037 ruši INT-03.** Skriva otisak SHA-256 na zaslonu potvrde, a `zavrsna-predaja-studenta.sistem.ts` traži taj otisak u grupama po 4 prije i nakon osvježavanja. Popis datoteka #1037 nema `e2e/sistem/`. #1040 ga mijenja, ali dolazi poslije. Popravak ide u #1037.
2. **#957 širi skener zabranjenih izraza na sve `messages.hr.ts`.** Otvoreni PR-ovi koji su pisani prije mogu pasti na skeneru tek nakon njegova spajanja. Spojiti ga prvog i pokrenuti CI na ostalima.
3. **`e2e/sistem/README.md` se protivi samome sebi.** Jedan odlomak kaže da `sistem` nije u `ci-ok`; `ci.yml` ga ima u `needs` posla `ci-ok`. Vrijedi `ci.yml`. README treba ispraviti zasebnim malim PR-om (nije dio ovog plana).
4. **OPE-R05 i WEB-NF7-UVOZ (OA-10) su isti posao**: uvoz popisa iz CSV-a uz pregled prije potvrde, ista mapa `H/admin/isvu/`. UVOZ čeka primjer izvoza od FPZG-a. Preporuka orkestratoru: jedan zadatak. Pitanje o primjeru je u §8.
5. **Izvadak je u dva otvorena PR-a** (#1045 i #1046). Jedan od njih mora biti rebasean; zato jedan vlasnik izvatka po valu.
6. **Zastarjele blokade u #2060.** Zadržani zadaci PM2-R03, PRE-R01, PM1-R04, V14-R02, V14-R04 i V14-R05 čekaju „preklapanje s V13/V14” ili „isto kao spojeni zadatak”, a kod već sadrži rješenje (Val 1, redci 18 do 23). NAS-R04, NAS-R16, PM2-R14 i PM2-R15 čekaju izvadak, a izvadak na bazi već ima `teacher.declaration-conversation.get`, `revisionDueAt`, `work.imports.get` i `work.plan.get/put`.
7. **Zaključavanja putanja koja se ne slažu s mojim preklapanjima** (po očekivanim datotekama; pisac provjerava):

| Zadatak | Čeka (u #2060) | Moja procjena |
|---|---|---|
| F4-PM1-R07 | putanje: F4-NAS-R20-RUTA (#1046) | Nema zajedničkih datoteka; nepotrebno |
| F4-PM2-R04 | putanje: WEB-DIZ-B-V19 (#1030) | Stvarno preklapanje je s #1032 (`teacher/work/pages.tsx`) |
| WEB-V17-R01 | putanje: WEB-MEN-LITERATURA-404 (#1050) | Nema zajedničkih datoteka osim testa `card.test.ts` u #1021 |
| WEB-NF7-POSTAVKE-SPOJ | WEB-NF7-UVOZ | Različite mape (`faculty-settings` i `isvu`); nepotrebno |
| WEB-IZJAVA-V2 | putanje: F4-MEN-R05 (#957) | #957 dira samo poruke i skener; stvarno preklapanje je #1040 i NAS-R04 |
| F4-OPE-R05 | putanje: WEB-DIZ-B-V22 (#1027) | Točno (`admin/isvu`) |

8. Okidanje `sistem`: u Valu 1 ga okidaju #911, #957, #1025, #1033, #1038 i #1050 (mapa `host/editor/`); u Valu 2 PM2-R14, PM2-R15, MEN-R09 klijent i EDI-R07. Svaki push u bazu ga okida u svakom slučaju. Pokretanje 24 PR-a odjednom opterećuje CI i RAM; preporuka je pokretati pisce u grupama, a broj istodobnih sesija određuje orkestrator.

## 7. Izvan valova (19 zadataka)

| Zadatak | Razlog |
|---|---|
| F4-EDI-R13, F4-OPE-R02, F4-V18-22-R04, WEB-E2E-OTPORNOST, REGRESIJA-BAZE-WEB | Zatvoreno ili spojeno po #2060 (R04 se zatvara spajanjem #914) |
| F4-V18-22-R08 | Zatvoreno odlukom PG-10: nema izvoza u ISVU. U `routes.ts` ostaje „pending” stranica `isvu-ocjene`; orkestrator odlučuje hoće li se ukloniti |
| F4-EDI-R01, F4-V18-22-R03, F4-V18-22-R10 | Odgođeno nakon pilota: shema v4 ne ide u pilot (odluka orkestratora 27. 11.) |
| F4-PM1-R12B | Čeka prijelaz studentskog dokaznog puta na v4 (kritičan put, ODOBRENO) |
| F4-PM2-R05 | Klijent `postViaApi` postoji, ali `uploadImage` nije montiran u uređivač; slika traži v4 (§5.2 dokumenta). Vjerojatno odgođeno s EDI-R01; orkestrator potvrđuje |
| F4-PM2-R09 | Odgođeno: primjena AI prijedloga (M9.6) dolazi nakon F4 |
| F4-PM2-R21 | Odgođeno nakon pilota (OAuth Microsoft i Google) |
| F4-PM1-R11 | Bez contracts 3.x prije pilota (odluka 26. 11.); oznaku objavljuje Daniel |
| NF5-Q4-RITAM-PREGLED | Zadržano (anketa C13): ne prije 15. 1. 2027. |
| WEB-NF7-UVOZ | Čeka primjer izvoza od FPZG-a; vidi §6 t. 4 |
| F4-PR-WEB | Radi orkestrator (PR grane u `main`, „Spoji n”) |
| INT-34, INT-35 | Provjere na stvarnom stogu bez koda; ne dijele datoteke s valovima |

## 8. Za Daniela

Samo odluke koje planer ne smije donijeti.

| # | Odluka | Što je blokirano | Opcije |
|---|---|---|---|
| 1 | Vrijedi li pravilo „valovi od najviše 2 PR-a” (`PLAN.md` §6 t. 3) ili ga zamjenjuju valovi od 15 do 25 zadataka? Vlak već spaja i desetke PR-ova odjednom (npr. #942). | Cijeli plan | (a) valovi kao ovdje, vlakovi do 6 PR-ova; (b) staro pravilo, pa 2 PR-a po valu |
| 2 | Kad ide WEB-NASLOVI-SVE u odnosu na zamrzavanje grane za F4? Dira sve stranice i sistemske testove. | Završni niz | (a) prije F4 PR-a, ako je `sistem` zelen; (b) poslije F4 |
| 3 | Smije li F4-OPE-R05 (uvoz CSV-a) krenuti na izmišljenom CSV-u prije primjera izvoza od FPZG-a (OA-10)? Ruta na SRV-u postoji; format može biti drugačiji. | OPE-R05, a time i WEB-NF7-UVOZ | (a) da, uz pregled prije potvrde i izmišljene podatke; (b) čekati primjer |
| 4 | Tko potvrđuje tekstove označene „nacrt” u dizajnerskim zadacima (komentari Ductus#2059 c.7214951129 i c.7215579050)? Zadaci traže potvrdu prije ugradnje. | 13 dizajnerskih PR-ova, S08-KOD | (a) Daniel; (b) orkestrator po vlastitoj procjeni |
| 5 | Odobrenje promjene CSP-a u #914 (`src/middleware.ts`, okvir `/app/code-run`). Sigurnosno osjetljivo. | #914 | ODOBRENO ili izmjena |

## 9. Što nisam provjerio

- Nisam pokretao kod, testove ni CI. Sve su tvrdnje iz čitanja koda na `8e35784f`, popisa datoteka PR-ova i teksta #2060.
- Popisi datoteka novih zadataka su očekivani. Pisac ih provjerava prije početka (§2 t. 3).
- Procjene „već zatvoreno” (Val 1, redci 18 do 23) nisu dokaz zatvaranja.
- Nisam čitao punu specifikaciju dizajna (c.7214951129, c.7215579050) ni stanje SRV zadataka osim onoga što piše u #2060 i izvatku.
- Nisam provjeravao jesu li SRV rute u izvatku jednake onima na SRV-u u ovom trenutku.

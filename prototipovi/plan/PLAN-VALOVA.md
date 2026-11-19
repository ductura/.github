# Plan valova: cijela aplikacija Ductura (editor, student, nastavnik)

Datum: 19. 11. 2026. Izvori: `INVENTAR-editor.md` (oznaka **E§**), `INVENTAR-student.md` (**S:** E-n, PD-n, R-n, PO-n), `INVENTAR-nastavnik.md` (**N:** N-nn). Pitanja su u `PITANJA-ZA-DANIELA.md` (oznake 0, A-n, B-n, C-n). Danielovi odgovori (43/43, 19. 11.) su u `ODGOVORI-DANIEL-2026-11-19.md`; oznaka **✓** znači riješeno. Zadaci za valove 1, 2 i 4: `ZADACI-VAL-1-2-4.md`.

## Pravila koja vrijede za svaki val

- Ekrani i prozori su funkcionalno isti kao u prototipu. Editor je isti i po funkciji i po izgledu („papir i grafit”).
- Provjere tek na kraju: nema reviewa ni QA-a. Prije spajanja u granu ide samo lokalno: install, typecheck, testovi i build.
- Svi frontovi koriste `@ductura/ui`. Novi UI element prvo ide u `ui` (DAN-1111), tek onda u web.
- Front je Next.js i podatke dobiva samo preko Institution_server `/api/v1`. Front ne piše izravno u tablice.
- Svaka nova tablica dobiva RLS i retke u pgTAP matrici pristupa, u istom PR-u.
- PR ima najviše oko 300 redaka. U testovima i fixtureima su samo izmišljeni tekst i izmišljene osobe (✓ 0: primjer je `editor/samples/primjer-izmisljeni.json`).
- **Kraj vala:** Daniel lokalno pokrene server i web zajedno, prođe zadani tok i odobri. Tek onda kreće sljedeći val. Paralelni valovi grade se istodobno, a odobravaju zasebno.

Repoi: **SRV** je Institution_server, **WEB** je Institution_front_web_chrome, **UI** je paket `@ductura/ui` (ako stoji unutar WEB-a, PR ide u WEB).

## Odluke 19. 11. (Daniel) i odluke orkestratora

- ✓ A-1 početna studenta je „Moji zadaci” (`/zadaci`). ✓ A-2 kod 8–32 znaka; normalizira server; ugovor smije razlikovati „već upisan” i „kolegij bez zadatka”. ✓ A-3 `student.assignments.get` se proširuje (akademska godina, grupe, vrsta rada, mentor, produljeni rok, nastavnici kolegija); novo glavno izdanje `@ductura/contracts`.
- ✓ A-4 vrijedi 8 stanja iz `SaveState` (`ui`). ✓ A-5 403 na `/me` je stanje „bez uloge”; tekst upućuje na administratora fakulteta (koordinator = admin fakulteta).
- ✓ A-6 odjava: dijalog ostaje; odjava završava i AAI sesiju (`auth.logout.post` s krajem sesije kod pružatelja; lokalno lažni OIDC); nakon odjave javna početna stranica `/`.
- ✓ A-7 kolegij izrađuje **administrator** ustanove (`/ustanova/kolegiji`), s nositeljem i grupama; nastavnik ga ne izrađuje. ✓ A-8 kod se prikazuje jednom; server već čuva samo `code_hash`. ✓ A-9 „Zbirni” ulazi u bočnu traku nastavnika (4 stavke).
- ✓ A-10 dodatni web ekrani ostaju (student: reprodukcija, dnevnik pristupa, „Kako radi”, stanje, prijava problema, pretraga i godina na „Moji radovi”; nastavnik: jezik rada, nova verzija zadatka). ✓ A-11 N-01 do N-18 iz kartica su kanonski.
- ✓ A-12 druga kartica: blokada iz editor-corea. ✓ A-13 fontovi lokalno, izvori preko servera, vanjske stranice kao obične poveznice. ✓ A-14 pravila o alatima postavlja nastavnik u zadatku; „pogled uživo od prvog dana” ostaje.
- ✓ B-1 i ✓ B-2: Daniel želi „Podrijetlo teksta” (ritam unosa, postotci, pragovi) i podudaranje s automatskim prilaganjem kao u prototipu. To traži izmjenu pravila: **korak P-1** ispod. Do tada se ti dijelovi ne grade.
- ✓ B-3 „Kod potvrđuje da se predani tekst nije mijenjao od predaje.”, naziv bez „autorska”. ✓ B-4 gumb „Otisak u međuspremnik”; svi tekstovi kroz skener. ✓ B-5 „izvornost” samo kao doslovni navod službenog obrasca fakulteta (iznimka skenera ide u P-1).
- ✓ B-6 svaka poruka uspjeha tek uz potpisanu potvrdu, do tada „Šalje se…”. ✓ B-7 oznaka lijepljenja ostaje, uz napomenu da je tekst kasnije mijenjan. ✓ B-8 „tekst navoda razlikuje se od priložene stranice”.
- ✓ B-9 potvrđeno 19. 11. („Kritjerij je samo radna bilješka nastavnika”): 6 kriterija samo je nastavnikova radna bilješka; student ne vidi kriterije ni bodove, pa P-1 to ne treba.
- ✓ C-1 shema po valovima. ✓ C-2 `locator` ostaje i prikazuje se kao stranica; `via` i `rq` postaju atributi navoda u shemi v3. ✓ C-3 Izjava (E-9) smije se izgraditi prije D-194, na lažnom serveru: ide u val 3.
- ✓ C-5 napomene da. ✓ C-7 suradnik smije sve (komentar, dorada, izvoz, mentorstva, sve grupe). ✓ C-8 rok dorade u ugovoru. ✓ C-9 prijedlozi teksta jesu proizvod. ✓ C-10 nastavnik uspoređuje bilo koje dvije verzije.
- ✓ C-12 stilovi i Lektini profili ulaze; Lektu daje Daniel, ne čeka se Q-11. ✓ C-13 pomoćnik zadnji, do tada kartica „uskoro”. ✓ C-14 diktiranje i čitanje naglas kroz Web Speech API, preuzimanja da.
- ✓ C-15 grade se svi ekrani, i N-13, N-14, N-15 i N-AI-ATT. N-14, N-15 i N-AI-ATT nemaju prototip: prije gradnje ide nacrt ekrana u `_prototipovi`. ✓ C-16 Merlin: CSV po prezimenu, poveznica 24 h, PDF i .docx u paketu, popis razloga produljenja.
- ✓ C-17 pri objavi zadatka ne šalje se ništa dok nema kanala. ✓ C-18 banner o prazninama u zapisu se prikazuje (val 5). ✓ C-19 „Pravila oblika” nisu provjera stila FPZG-a; gradi se kako je u prototipu (bez funkcije) dok Daniel ne zada sadržaj.
- **✓ C-4, odluka orkestratora.** Stanje `ceka` postoji samo kad server vrati `pending_signature` (protokol 2, asinkrono potpisivanje). Nova ruta `student.submission.get`: `GET /api/v1/student/assignments/{assignmentId}/submission` vraća `{state: "none" | "ceka" | "potvrdeno", receipt?}`. Čita je E-11 nakon osvježavanja i R-38 „Provjeri stanje predaje”. Nastavnik u valu 5 čita istu potvrdu rutom `teacher.submission-receipt.get` (RLS po kolegiju).
- **✓ C-6, odluka orkestratora.** `/provjera` je javna stranica na instanci ustanove (ne `ductura.org`), bez prijave i bez kolačića sesije. QR sadrži `https://<instanca>/provjera#r=<id potvrde>&o=<otisak>` (fragment, pa ne ide u zapisnike). Stranica šalje `POST /api/v1/public/verification` (`public.verification.post`, ograničen broj zahtjeva). Server provjerava Ed25519 potpis i otisak kroz usku SECURITY DEFINER funkciju, koja vraća samo „podudara se / ne podudara”, vrijeme predaje, vrijeme potpisa i id ključa: bez imena, kolegija i teksta. Nikad ne izdaje sesiju (D-09). PDF potvrde radi server, samo za prijavljenog studenta i nastavnika kolegija.
- **✓ C-11, odluka orkestratora.** Za zajedničke podatke vrijedi nastavnički prototip: redak verzije stoji na potvrdi za oba korisnika; studentska poveznica na nepostojeću „3. Analizu” vodi na PD-1 Sažetak procesa; nastavnici kolegija dolaze sa servera (nositelj i članovi kolegija, polje iz A-3), isti popis u oba sučelja.

## Korak P-1: izmjena pravila proizvoda: čeka izmjenu pravila (Daniel odlučio 19. 11.)

Daniel je 19. 11. odlučio da se „Podrijetlo teksta” i podudaranje s pomoćnikom grade kao u prototipu i da se proizvod mijenja. To nije obična gradnja: ritam unosa su vremena između tipki, nova vrsta osobnih podataka. Prije gradnje tih dijelova mora sletjeti docs promjena:
1. PRODUCT §5: pravila 1 (tvrdnja o korištenju AI-ja), 2 (postotak), 4 (bilježenje tipki i ritma), 8 (atribucija), 13 (analiza procesa pisanja) i rječnik zabranjenih izraza; uz to iznimka skenera za doslovni navod službenog obrasca (B-5).
2. Ustav (Product Constitution v1.4), ako ga te granice pokrivaju: izmjena traži izričitu Danielovu potvrdu teksta.
3. Privatnost i DPIA: nova klasa podataka (vremena unosa), svrha, rok čuvanja (D-30 je još PRIJEDLOG), tko vidi, obavijest studentu; utjecaj na `docs/privacy/` i DPIA uz DPO-a (D-142/D-143).
4. Tekst „Što se bilježi” (val 6) mijenja se u istom koraku, da ne tvrdi suprotno od onoga što se bilježi.

Tek nakon P-1: bilježenje ritma u editoru i evidence zapisu (zaseban SRV + editor niz, prije vala 9), Karta podrijetla N-10 (val 9), Pragovi (val 11), Podudaranje i automatsko prilaganje te oznaka `aitext` (val 12). P-1 mora sletjeti prije nego što valovi 9, 11 i 12 dođu do tih dijelova; ostatak tih valova ide bez čekanja.

## Shema dokumenta: nesklad i gdje se rješava

**Nesklad.**
- Prototip editora koristi `bulletList`/`listItem`, `blockquote`, citat `{page, via, rq}` i `hid` samo na naslovima.
- Ima još 9 čvorova i atributa (fusnota, unakrsna poveznica, prikaz, formula, fxi, prijelom stranice, okvir, blok koda, `vg`) i 8 oznaka (paste, imported, hl, sup, sub, lang, aitext, link) (E§6).
- editor-core (V2 kanonska shema) i server (`server/domain/document/schema.ts`) poznaju samo odlomak, h1–h3, `bulletItem`, `quote`, podebljano, kurziv i citat `{sourceId, locator}`.
- Server odbija svako nepoznato polje (pravilo B-8 iz `STATE.md`, nije pitanje s popisa). Dokument iz prototipa zato ne prolazi commit, a izmjena sheme samo u webu ruši spremanje.

**Rješenje.**
1. Val 1 radi na postojećoj V2 shemi. Prikaz se prilagođava shemi: popis i citat crtaju se iz V2 čvorova kako izgledaju u prototipu, a stranica se prikazuje iz `locator` (✓ C-2).
2. Svako proširenje je zaseban niz PR-ova „shema vN”, nikad samo u jednom repou, uvijek ovim redom:
   1. ugovor i JCS test vektori;
   2. server `schema.ts` i validacija, uz migraciju verzije i test koji čita dokument stare verzije;
   3. editor-core;
   4. tek onda UI.
3. Proširenja idu korak po korak, po valu koji ih treba (✓ C-1):
   - **shema v3**, val 7: fusnota, unakrsna poveznica, atributi navoda `via` i `rq` (✓ C-2);
   - **shema v4**, val 10: prikaz, formula, fxi, prijelom stranice, okvir, blok koda, `vg`, oznake sup, sub, hl, lang i link, te `paste` i `imported` (✓ B-7: oznaka ostaje uz napomenu o kasnijoj izmjeni);
   - oznaka `aitext` ide u val 12, nakon P-1 (B-2).

## Redoslijed i paralelnost

| Val | Naziv | Paralelno s | Repo |
|---|---|---|---|
| 1 | Jezgra editora: pisanje i potvrda (+ Next.js temelj weba) | 2, 4 | WEB + UI (+2 SRV) |
| 2 | Student: ljuska, prijava, upis, obavijesti | 1, 4 | SRV + WEB |
| 3 | Student: radni prostor, Izjava, predaja, potvrda | nakon 1, 2 i 4 | SRV + WEB |
| 4 | Nastavnik: ljuska, kolegiji, novi zadatak; admin izrađuje kolegij | 1, 2 | SRV + WEB |
| 5 | Nastavnik vidi predaju | 6 | SRV + WEB |
| 6 | Izgled editora: trake, paneli, ladice | 5 | WEB + UI |
| 7 | Citati i izvori (shema v3) | 8 | SRV + WEB |
| 8 | Suradnja mentora: komentari, dorada, prijedlozi | 7 | SRV + WEB |
| 9 | Zapis procesa: sažetak, reprodukcija, usporedba, provjera | 10 | SRV + WEB |
| 10 | Bogati sadržaj i stranice (shema v4), izvoz | 9 | SRV + WEB |
| 11 | Provjere teksta, etape, konzultacije, Merlin, produljenje (11a student, 11b nastavnik) | 11a i 11b međusobno, 12 | SRV + WEB |
| 12 | Pomoćnik (nakon D-194) | 11 | SRV + WEB |

„Paralelno” znači disjunktne datoteke: WEB PR-ovi ne diraju iste rute ni komponente, SRV PR-ovi ne diraju iste rukovatelje. Zajedničke datoteke (ugovori i generirani klijent, `inventory.ts`, `server.ts`, `migrations.sum`, pgTAP matrica, `messages.hr`, izvozi `ui`, lockfile) imaju vlasnika trake ili zadani redoslijed (`ZADACI-VAL-1-2-4.md`).
- Val 7 dira shemu dokumenta, a val 8 rukovatelje `collaboration.*`, pa su disjunktni. Valovi 9 i 10 su disjunktni ako shema v4 (val 10) ne dira replay i projekcije (val 9).

Ograničenja:
- **Next.js temelj weba (val 1) ide prije svih WEB stranica.** Kopija weba nema `next` ni `next.config`; stranice su Next oblika, a 69 datoteka čita bazu izravno (`withActor`, `@/server/*`, a `src/server` u kopiji ne postoji). Svaka stranica u svom PR-u prelazi na `src/client` → `/api/v1`, a pripadni `src/app/api` rukovatelji s bazom se brišu.
- Val 3 traži gotove valove 1, 2 i 4: zadatak koji student otvara stvara nastavnik u valu 4. Val 5 traži val 3, jer nastavnik gleda stvarnu predaju.
- Valovi 1, 2 i 4 dijele SRV PR „lokalni seed”: izmišljeni student, nastavnik, administrator i račun bez uloge, kolegij s nositeljem i grupama, zadatak s obavijesti, rad, valjan i istekao kod. Samo lokalno i u CI-ju, nikad stvarne osobe ni tekstovi.
- Ako Q-6 izabere komentar u dokumentu, sidro komentara ulazi u shemu v3 i val 8 ide nakon vala 7, a ne paralelno.
- Val 6 je samo WEB i UI, pa ide uz val 5, koji je težak na serveru. UI PR-ovi su uska točka: komponente za val n+1 grade se dok Daniel klika val n.

**Rani cijeli tok.** Kad su gotovi valovi 1 do 5 (od toga 1, 2 i 4 paralelno), radi cijeli lanac: administrator izradi kolegij, nastavnik objavi zadatak i izda kod, student se upiše, piše, preda i dobije potpisanu potvrdu, a nastavnik vidi predaju i istu potvrdu.

## Val 1: Jezgra editora: pisanje, potpisana potvrda, ponovno učitavanje

**Što Daniel klikne:**
1. Napiše odlomak, naslov i popis. Status pokaže „Sinkroniziram” pa „Spremljeno na poslužitelju”.
2. Osvježi stranicu i vidi isti tekst.
3. Isključi mrežu i piše dalje. Status pokazuje „Spremljeno na uređaju”, bez „na poslužitelju”. Kad uključi mrežu, vraća se „Spremljeno na poslužitelju”.

**Ekrani:**
- list papira i statusna traka (E§1, status 30 px);
- statični dio trake alata (E§3.6 toolbar2): poništi, ponovi, stil bloka, podebljano, kurziv, popis, citat;
- stari nacrt (EarlierDraft);
- druga kartica, uz blokadu iz editor-corea (✓ A-12).

Stanja spremanja dolaze iz editor-corea (✓ A-4: 8 `SAVE_STATES`). SYNCED se pokazuje samo uz potpisanu potvrdu, a `pending_signature` nije potvrda (✓ B-6).

**Server:**
- evidence open, commit i replay već su montirani i samo se spajaju; novih ruta nema;
- test: commit, potvrda, a replay vraća isti JCS hash.

**WEB temelj:** Next.js u `src/app`, most `/api/v1` prema serveru, čitanje na serveru kroz `src/client`.

**UI prvo:**
- tokeni „papir i grafit”: tamna tema zadana, svijetla kroz `:root[data-theme=light]`, tema lista zasebna (zadano bijela);
- lokalni fontovi (✓ A-13);
- `SaveState` s 8 stanja (✓ A-4).

**PR-ovi:** 8: 2 SRV (lokalni seed, test evidence toka) i 6 WEB/UI (Next temelj, API most, tokeni i fontovi, stranica rada, statična traka, e2e).

**Blokira:** ništa od pitanja (✓ A-4, A-12, A-13, B-6). Traka: Next temelj je preduvjet za sve WEB PR-ove valova 1, 2 i 4.

## Val 2: Student: ljuska, prijava, upis kodom, obavijesti

**Što Daniel klikne:**
1. Prijavi se lažnim OIDC-om kao student i vidi bočnu traku s 5 stavki i „Moje zadatke” (✓ A-1).
2. Upiše kod i prođe stanja upisa: krivi kod, istekao kod, već upisan, kolegij bez zadatka, uspjeh (✓ A-2).
3. Pročita obavijest kolegija, potvrdi je i odjavi se kroz dijalog; završi na javnoj početnoj stranici (✓ A-6).
4. Prijavi se računom bez uloge i vidi stanje „bez uloge” s uputom na administratora fakulteta (✓ A-5).

**Ekrani:**
- S: E-0 ljuska (64 px, izbornik ispod 800 px, tema, odjava s dijalogom), E-1 Prijava (6 stanja);
- E-2 Moji zadaci, E-3 Moji kolegiji, E-4 Moji radovi (uz pretragu i godinu, ✓ A-10);
- E-5 Upis kodom (7 stanja), E-6 Obavijest (8 stanja, tekst prema ✓ A-14);
- prozori PD-5 do PD-8, radnje R-1 do R-15;
- dodatni web ekrani ostaju (✓ A-10): dnevnik pristupa, „Kako radi”, stanje.

**Server:**
- već montirano: auth, me, locale;
- samo ugovor, treba rukovatelj: `student.assignments.get`, `institution.enrollments.post`, `institution.acknowledgment.post`, `student.access-log.get`;
- novo: ugovor „obavijest pročitana” (PO-7) s tablicom potvrda čitanja (RLS, pgTAP); proširenje `student.assignments.get` (✓ A-3); ishodi upisa „već upisan” i „kolegij bez zadatka” (✓ A-2).

**UI prvo:** dijalog sa zarobljenim fokusom, toast, skeleton, oznaka, kvačica, odabir, detalji, izbornik ljuske.

**PR-ovi:** 18: 8 SRV (ugovori i njihovo izdanje, 3 migracije, 3 rukovatelja) i 10 UI/WEB.

**Blokira:** ništa od pitanja (✓ A-1, A-2, A-3, A-5, A-6, A-10, A-14). Stranice koje koriste nove ugovore čekaju izdanje ugovora i podizanje verzije u WEB-u.

## Val 3: Student: radni prostor, Izjava, predaja, potpisana potvrda

**Što Daniel klikne:**
1. Otvori zadatak iz vala 2 i piše u editoru iz vala 1.
2. Otvori „Prije predaje”, vidi provjere, prođe Izjavu, preda rad i potvrdi u prozoru „Predati rad?”.
3. Dobije potvrdu s otiskom. Nakon osvježavanja potvrda se učitava sa servera (C-4).

**Ekrani:**
- S: E-7 Radni prostor (6 stanja), E-8 Prije predaje, E-9 Izjava (✓ C-3, na lažnom serveru; naziv obrasca doslovno prema ✓ B-5 tek nakon iznimke skenera iz P-1), E-10 Predaja (10 stanja);
- E-11 Potvrda (redak verzije prema ✓ C-11, gumb „Otisak u međuspremnik” ✓ B-4), bez PDF-a, QR-a i javne provjere, koji dolaze u valu 9;
- PD-1 Sažetak procesa (osnovni dijelovi), PD-3 Predati rad?, PD-4 Napomena.

**Server:**
- samo ugovor, treba rukovatelj:
  - `submission.submit.post`, koji vraća `SignedSubmissionReceiptV2` (Ed25519);
  - `student.assignment-work.get`;
  - `projection.process-summary.post`;
- novo:
  - `student.submission.get` i stanje `ceka` (✓ C-4, odluka orkestratora gore);
  - napomene (PO-15): ugovor i tablica samo za dodavanje, s RLS-om i pgTAP retcima (✓ C-5);
  - redovi provjera (PO-14) i raspon riječi (PO-12) iz postavki zadatka;
  - Izjava: dio s pomoćnikom samo na lažnom serveru (`@ductura/test-fakes`), bez stvarnih rukovatelja do D-194.

**UI prvo:** koraci, prikaz otiska, popis ključ–vrijednost.

**PR-ovi:** oko 12: 5 SRV i 7 UI/WEB.

**Blokira:** ništa od pitanja (✓ B-4, C-3, C-4, C-5, C-11). Naziv obrasca u Izjavi čeka iznimku skenera (P-1); do tada stoji neutralan naziv.

## Val 4: Nastavnik: ljuska, kolegiji, novi zadatak, kod za upis; admin izrađuje kolegij

**Što Daniel klikne:**
1. Kao administrator na `/ustanova/kolegiji` izradi kolegij s nositeljem i grupama (✓ A-7).
2. Kao nastavnik vidi kolegije i bočnu traku s 4 stavke, i „Zbirni” (✓ A-9).
3. Izradi i objavi novi zadatak, uz pravila o alatima (✓ A-14).
4. Izradi novi kod za upis, vidi ga samo jednom (✓ A-8) i opozove stari. Student iz vala 2 upiše se tim kodom.

**Ekrani:**
- N: N-01 kolegiji, N-02/03 novi zadatak **bez obrasca kolegija** (✓ A-7: `submit:course` i varijanta `kolegij-stvoren` ne grade se za nastavnika; prazni nastavnik vidi uputu da kolegij izrađuje administrator), dijalog dk-h;
- admin: obrazac „Novi kolegij” na postojećem `/ustanova/kolegiji` (A-03); prototipa nema, gradi se iz `ui` elemenata u izgledu tog ekrana;
- postojeće web komponente: TeacherCourses, TeacherSetup, AssignmentVersionForm (✓ A-10).

**Server:**
- `institution.courses.post` postaje samo administratorov, s poljem nositelja (nova RPC `institution.admin_create_course`, RLS i pgTAP retci); nastavnički `create_course` ostaje u bazi, ali ga ruta više ne zove;
- već montirano: izrada i opoziv koda za upis (čuva se samo sažetak, ✓ A-8);
- samo ugovor, treba rukovatelj: `teacher.access.get`, `teacher.courses.get`, `institution.assignment-versions.post`;
- izrada zadatka: `server/institution/assignment-route.ts` postoji, ali nije spojen (PENDING). Treba ugovor, zatim spajanje;
- grupe: `course_team_groups` postoji samo kao migracija. Treba ugovor i rukovatelj (administrator i nositelj), uz provjeru RLS-a i pgTAP redaka.

**UI prvo:** iz weba u `ui` prelaze Dialog, PanelTabs, ErrorScreen i RouteLoading.

**PR-ovi:** 10: 6 SRV i 4 WEB.

**Blokira:** ništa od pitanja (✓ A-7, A-8, A-9, A-10, A-11, C-17: pri objavi se ne šalje ništa).

## Val 5: Nastavnik vidi predaju

**Što Daniel klikne:**
1. Vidi studente i radove sa stanjem predaje.
2. Čita rad iz vala 3 uživo, samo za čitanje.
3. Otvori predaju i vidi istu potvrdu, otisak i redak verzije koje je vidio student (✓ C-11).
4. Otvori zbirni pregled i prihvati ili odbije zamolbu za mentorstvo; vidi banner o prazninama u zapisu kad ih ima (✓ C-18).

**Ekrani:**
- N: N-04 studenti, N-16 mentorstva (dijalog do-h), N-17 zbirni, N-06 rad (pogled uživo, banner praznina), N-07 predaja;
- postojeće web komponente: MentoredWorks, LiveWorkView.

**Server:**
- samo ugovor, treba rukovatelj: `teacher.submissions.get`, `teacher.assignment-submissions.post`, `teacher.mentorships.get`, `teacher.mentorship.get`, `live.document.get`, `institution.student-removal.post`, `institution.student-return.post`;
- `teacher_rosters` i `mentorship_request` postoje samo kao migracije: ugovor i rukovatelj, uz provjeru RLS-a i pgTAP redaka; novo: `teacher.submission-receipt.get` (✓ C-4), uz RLS po kolegiju; suradnik ima ista prava kao nositelj (✓ C-7).

**UI prvo:** tablica s popisom, oznaka stanja.

**PR-ovi:** oko 9: 5 SRV i 4 WEB.

**Blokira:** ništa od pitanja (✓ B-4, C-7, C-11, C-18).

## Val 6: Izgled editora: ljuska, trake, paneli, ladice

Samo WEB i UI, paralelno s valom 5.

**Što Daniel klikne:**
1. Provjeri da editor izgleda kao prototip na 1250, 1050, 760 i 640 px.
2. Mijenja raspored panela A/B/C i otvara ladice, način fokusa i traku za traženje.
3. Otvara Ctrl+K, prečace i kontekstne izbornike.
4. Mijenja temu lista neovisno o temi ljuske.

**Ekrani:**
- E§1: zaglavlje 48 px, alati 44 px, stup 248/288/340, list najviše 820, panel 300/340/400;
- E§3.1: rasporedi i ladice;
- E§3.6:
  - toolbar2: Posebni znak, Oznake, cmdk, Prečaci, Prilagodi traku, selBub, mbar;
  - more2: kontekstni izbornik, kratice;
- E§3.3: izbornici Umetni, Pretvori, Više, Izvezi i Prikaz. Stavke bez funkcije vidljive su, ali onemogućene;
- E§3.2: popoveri @ i /, obavijesne trake (banneri);
- E§3.3: pomoć, Prvi koraci, Prije prve rečenice, Što se bilježi (tekst se mijenja u P-1 ako se počne bilježiti ritam);
- postojeće komponente: EditorToolbar, ToolbarMenu, HeadingOutline, SidePanels, StatusLength.

**Server:** ništa (raspored se pamti lokalno u pregledniku). **UI prvo:** ladica, paleta naredbi, dijalog prečaca, traka za traženje, kontekstni izbornik, popover.

**PR-ovi:** oko 10, svi UI i WEB.

**Blokira:** ništa.

## Val 7: Citati i izvori (shema v3)

**Što Daniel klikne:**
1. Doda izvor ručno i preko DOI/ISBN-a, pa umetne citat sa stranicom.
2. Promijeni stil citiranja ili Lektin profil, umetne fusnotu i unakrsnu poveznicu.
3. Otvori „Za provjeru” i „Pregled literature”.
4. Osvježi stranicu i sve ostaje spremljeno uz potvrdu.

**Ekrani:**
- E§3.2: popover citata, Za provjeru;
- E§3.3: Brzi izvor;
- E§3.4: sources2 (DOI/ISBN, preporučeni i obvezni izvori, Pregled literature), Dijelovi rada, Poveznica;
- postojeća komponenta: SourcesPanel.

**Server:**
- shema v3, redom kako je opisano gore (fusnota, unakrsna poveznica, `via`, `rq`);
- novo: tablica izvora rada (RLS, pgTAP);
- DOI/ISBN se traži preko servera, bez poziva iz preglednika (✓ A-13);
- stilovi i Lektini profili su postavka ustanove (✓ C-12), kroz `settings.catalogue.get` i `settings.values.get`, koji su samo ugovor i trebaju rukovatelj.

**UI prvo:** popover s obrascem, popis s pretraživanjem.

**PR-ovi:** oko 10: 5 SRV i 5 WEB.

**Blokira:** ništa od pitanja (✓ C-1, C-2, C-12).

## Val 8: Suradnja mentora: komentari, dorada, prijedlozi, brzi put

**Što Daniel klikne:**
1. Kao nastavnik ostavi komentar na odlomak i opći komentar, predloži izmjenu teksta i vrati rad na doradu s rokom.
2. Kao student vidi komentar, prijedlog i zahtjev, odgovori i pošalje doradu.
3. Nastavnik vidi novu rundu i povijest rundi, te koristi brzi put.

**Ekrani:**
- N: N-06/07/08 komentari, dorada i prijedlozi (dijalog dd-h), N-05 brzi put;
- E§3.5: comments2 (opći komentari, privatne bilješke, predlošci, povijest rundi, ispis), mentor2 „Vrati na doradu”;
- E§3.2: obrazac komentara;
- E§3.3: Pošalji doradu, Dnevnik dorade;
- postojeće komponente: TeacherComments, CommentPanel, RevisionPanel, FastPath.

**Server:**
- samo ugovor, treba rukovatelj: `collaboration.comments.post`, `collaboration.revision-requests.post`, `teacher.fast-path.post`;
- `live.document.put` za prijedloge teksta (✓ C-9);
- novo: rok dorade u ugovoru (✓ C-8), tablice privatnih bilješki i predložaka (RLS, pgTAP).

**UI prvo:** nit komentara, odabir datuma.

**PR-ovi:** oko 11: 6 SRV i 5 WEB.

**Blokira:** Q-6 iz `STATE.md`: D-133/D-134, arhitektura komentara, koju bira vlasnik (✓ C-8, C-9).

## Val 9: Zapis procesa: sažetak, reprodukcija, usporedba, javna provjera

**Što Daniel klikne:**
1. Kao nastavnik otvori sažetak procesa, pusti reprodukciju i usporedi bilo koje dvije verzije (✓ C-10).
2. Bez prijave otvori `/provjera` preko QR-a s potvrde i vidi da se predani tekst nije mijenjao (✓ C-6).
3. Preuzme PDF potvrde.

**Ekrani:**
- N: N-10 sažetak (Karta podrijetla tek nakon P-1), N-09 reprodukcija, N-11 usporedba;
- S: PD-1 svih 11 dijelova, E-11 s PDF-om i QR-om (PO-20, PO-21);
- E§3.3: Povijest rada, Predajni paket (naziv i tekst koda prema ✓ B-3);
- E§3.2: diff;
- E§3.5 mentor3: Pregled runde, Usporedi predaje;
- postojeće komponente: ProcessSummaryView, ReplayView.

**Server:**
- evidence replay je već montiran;
- novo: popis verzija, `public.verification.post` s uskom SECURITY DEFINER funkcijom (✓ C-6), PDF na serveru;
- javna provjera ne smije postati način prijave (D-09);
- nakon P-1: bilježenje ritma unosa i Karta podrijetla (zaseban niz).

**UI prvo:** reproduktor s vremenskom crtom, prikaz razlika.

**PR-ovi:** oko 10 (5 SRV i 5 WEB), plus niz Karte podrijetla nakon P-1 (oko 4).

**Blokira:** Karta podrijetla: čeka izmjenu pravila (Daniel odlučio 19. 11.), korak P-1. Ostalo bez blokade (✓ B-3, B-4, C-6, C-10).

## Val 10: Bogati sadržaj i stranice (shema v4), izvoz

**Što Daniel klikne:**
1. Umetne tablicu, sliku s obrezivanjem, formulu, blok koda, okvir, prijelom stranice i tekst na stranom jeziku.
2. Uveze tekst i vidi oznaku uvezenog i zalijepljenog teksta (✓ B-7).
3. Uredi naslovnicu i oblik stranice, otvori pregled ispisa, izveze i preuzme rad; uključi diktiranje i čitanje naglas (✓ C-14).
4. Osvježi stranicu i sve ostaje spremljeno uz potvrdu.

**Ekrani:**
- E§3.3: Tablica/Slika, Pregled ispisa, Uvoz teksta;
- E§3.4: Strani jezik, Formula (KaTeX, lokalno), blok koda, okvir;
- E§3.6 rich: trake tablice i slike, obrezivanje, paleta markera, Dodaci editora;
- E§3.6 pages: naslovnica, Oblik stranice.

**Server:**
- shema v4, uključivo `paste` i `imported`;
- slike kao privitci rada: tablica s RLS-om i pgTAP retcima;
- izvoz na serveru.

**UI prvo:** traka uz objekt, dijalog s pregledom.

**PR-ovi:** oko 12: 5 SRV i 7 WEB.

**Blokira:** ništa od pitanja (✓ C-1, C-14, B-7). Oznaka `aitext` ide u val 12.

## Val 11: Provjere teksta, etape, konzultacije, izvoz za Merlin, produljenje

**Što Daniel klikne:**
1. **11a, student:** otvori Pregled i Sitnice, pravopis, „Riješi redom”, „Probu predaje” i potvrdu iz izvora.
2. **11b, nastavnik:** postavi etape, pripremi razgovor i zakaže konzultacije, ocijeni kriterije, izveze za Merlin i produlji rok.

**Ekrani:**
- E§3.5 review2: Pregled, Sitnice, Sažetak rada;
- E§3.6 rich: pravopis;
- E§3.4: proofs (blaži tekst ✓ B-8), tools.js, advice.js, wizard, plus.js, Pravila oblika (✓ C-19);
- E§3.5 mentor2: Stanje rada, Etape, Poruke, Konzultacije, Obrasci (naziv ✓ B-5 nakon P-1), Suglasnost, Nakon predaje, Vremenska crta, Moji studenti;
- E§3.5 mentor3: Kriteriji ocjene (✓ B-9, samo bilješka nastavnika), Uz tekst; Pragovi tek nakon P-1;
- N: N-12 konzultacije, N-18 izvoz za Merlin (✓ C-16), N-13 produljenje (✓ C-15), N-14 Priprema za razgovor i N-15 Etape (✓ C-15, nakon nacrta ekrana).

**Server:**
- tablice etapa, konzultacija, poruka, kriterija i produljenog roka (PO-22), svaka s RLS-om i pgTAP retcima;
- izvoz za Merlin (CSV po prezimenu, poveznica 24 h, PDF i .docx, razlozi produljenja);
- pravila provjera i Lektini profili kao konfiguracija ustanove (✓ C-12).

**UI prvo:** kalendar termina, popis provjera s radnjom.

**PR-ovi:** oko 17: 8 SRV i 9 WEB, podijeljeno na 11a i 11b, plus Pragovi nakon P-1.

**Blokira:**
- Pragovi i naziv obrasca: P-1;
- N-14 i N-15: nacrt ekrana (nema prototipa);
- N-13: ADR Q-5 se i dalje piše (rok 30. 11.), ali gradnja ga ne čeka (✓ C-15).

## Val 12: Pomoćnik

**Što Daniel klikne:**
1. Kao student pita pomoćnika unutar dopuštene razine.
2. Tekst iz pomoćnika dobiva oznaku, a podudaranje sam priloži razgovor Izjavi (nakon P-1).
3. Kao nastavnik vidi razgovor i priloge (N-AI-ATT) onoliko koliko odluka dopušta.

**Ekrani:**
- E§3.5 assist/assist2: pomoćnik, izvori, ključevi, upozorenje o osobnim podacima, Podudaranje (✓ B-2, nakon P-1);
- E§3.3: dijalog pitanja; S: PD-2 dijalog razgovora (E-9 Izjava je u valu 3);
- N: N-AI-ATT (✓ C-15, nakon nacrta ekrana);
- diktiranje i čitanje naglas već iz vala 10 (✓ C-14).

**Server:** M9.2, ugovor i rukovatelji pomoćnika nakon D-194 t. 6 i t. 7 (Q-10, rok 15. 12.); shema: oznaka `aitext`.

**UI prvo:** nit razgovora, kartica „uskoro”.

**PR-ovi:** oko 11: 6 SRV i 5 WEB.

**Blokira:**
- Q-10/D-194 (✓ C-13: pomoćnik zadnji);
- P-1 za Podudaranje, automatsko prilaganje i `aitext`;
- N-AI-ATT: nacrt ekrana. Do tada u panelu pomoćnika stoji samo kartica „uskoro”.

## Zbroj

- 12 valova i oko 138 PR-ova, svaki do oko 300 redaka: SRV oko 61, WEB i UI oko 77. Valovi 1, 2 i 4 imaju 36 PR-ova (točan popis u `ZADACI-VAL-1-2-4.md`).
- Uz to korak P-1 (docs promjena pravila, privatnosti i DPIA) i niz Karte podrijetla i bilježenja ritma nakon njega.
- Paralelne skupine: 1+2+4, 5+6, 7+8, 9+10, 11a+11b, a 12 uz 11 kad se odblokira.
- Shema dokumenta mijenja se samo kroz nizove „shema v3” i „shema v4”, i `aitext` u valu 12.
- Pitanje 0 je riješeno: testovi i fixturei editora koriste samo `editor/samples/primjer-izmisljeni.json`; `diplomski.json` ne ide u testove, fixturee ni repoe.

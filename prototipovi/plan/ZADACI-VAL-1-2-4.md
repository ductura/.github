# Zadaci za pisce: valovi 1, 2 i 4 (paralelno)

Datum: 19. 11. 2026. Plan: `PLAN-VALOVA.md`. Odgovori: `ODGOVORI-DANIEL-2026-11-19.md`. Inventari: `INVENTAR-editor.md` (E§), `INVENTAR-student.md` (S:), `INVENTAR-nastavnik.md` (N:). Prototipovi su u `_prototipovi` (editor, student, nastavnik).

## Zajednička pravila za svaki PR

- PR do oko 300 promijenjenih redaka koda; generirane datoteke ugovora i lockfile se ne broje, ali se navode u opisu.
- **SRV** = `Institution_server`, bazna grana `migracija/kopija-ductus-backend`. **WEB** = `Institution_front_web_chrome`, bazna grana `migracija/kopija-ductus-front`. **UI** = paket `@ductura/ui` (`packages/ui` u WEB-u).
- Novi UI element prvo ide u `packages/ui` (DAN-1111), pa tek onda u stranicu. Stranica ne definira vlastiti gumb, dijalog ni polje.
- Front je Next.js i podatke dobiva samo preko `/api/v1` (klijent `src/client/api.ts`). Svaki PR stranice briše `src/app/api/**` rukovatelje i `withActor` pozive koje je ta stranica koristila.
- Svaka nova tablica ili RPC: RLS, `GRANT` samo potrebnoj ulozi, retci u pgTAP matrici (`db/main/tests/030-institution-access-matrix.sql` ili `103-m2-actor-matrix.sql`) u istom PR-u.
- Samo izmišljeni podaci: izmišljene osobe (`demo-*`, `sim:*`), izmišljeni kolegiji i tekstovi; editor koristi samo `editor/samples/primjer-izmisljeni.json` (nikad `diplomski.json`).
- Prijava je samo AAI@EduHr; lokalno i u CI-ju lažni OIDC (`localhost:8090`). Nema lozinki, magičnih poveznica ni drugih načina prijave.
- Bez tajni u repou, bez primjene migracija na produkciju.
- **Provjera prije SPREMAN** (bez reviewa i QA-a):
  - SRV: `pnpm install`, `pnpm typecheck`, `pnpm test`, `pnpm build`; uz bazu `pnpm db:up` i `pnpm test:db`;
  - WEB: `pnpm install`, `pnpm typecheck` (skriptu dodaje WEB-01; do tada `tsc --noEmit`), `pnpm test` (node unit + Playwright), `pnpm build`;
  - u opisu PR-a: koraci klikanja iz „Prihvaćanje”.
- Lokalni stog (SRV `pnpm lokalno`): server `:4000`, edge `:8000`, lažni OIDC `:8090`. Putanje označene „(novo)” u kopiji ne postoje; ostale su provjerene `git ls-tree` 19. 11.
- Tekstovi sučelja na hrvatskom, kroz katalog poruka i skener zabranjenih izraza.

## Trake i vlasništvo zajedničkih datoteka

Najviše 3 pisca u SRV i 3 u WEB istodobno.

| Traka | Repo | Vlasnik zajedničkih datoteka |
|---|---|---|
| S-A | SRV | `server/contracts/**` (rute, vektori, `generated/`, `openapi/`, `inventory.ts`), lokalni seed |
| S-B | SRV | `db/main/migrations/**`, `migrations.sum`, pgTAP matrice; migracije strogo redom |
| S-C | SRV | studentski rukovatelji `server/institution/student-*-route.ts` (novo) i evidence testovi |
| W-A | WEB | Next temelj, `next.config.ts`, `src/client/**` (i podizanje verzije ugovora), `packages/ui/**`, `src/app/ustanova/**` |
| W-B | WEB | `src/app/zadaci/**`, `src/app/upis/**`, `src/app/prijava/**`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/kako-radi`, `src/app/stanje`, `src/app/rad/[assignmentId]/dnevnik-pristupa`, `src/components/student/**`, `src/components/shell/**`, `messages.hr` (samo svoja sekcija) |
| W-C | WEB | `src/app/rad/**` (bez `dnevnik-pristupa`), `src/components/editor/**`, zatim `src/app/nastavnik/**`, `src/components/teacher/**` |

- `server.ts` (montiranje ruta) i lockfile: tko spaja kasnije, rješava konflikt pri rebaseu; generirane datoteke ugovora uvijek se ponovno generiraju (`pnpm contracts:generate`), ne spajaju ručno.
- Trake ne diraju tuđe direktorije. Treba li stranici nova komponenta u `ui`, pisac W-B ili W-C traži je od W-A (zaseban mali UI PR) ili ga sam otvori u `packages/ui` nakon dogovora na koordinacijskom issueu.

## Redoslijed (ovisnosti)

```
SRV-01 seed → SRV-16 (val 1)
SRV-01 → SRV-02 ugovori-student → SRV-03 ugovori-nastavnik → SRV-04 izdanje 3.0.0 → WEB-07 bump → stranice s novim ugovorima
SRV-05 → SRV-06 → SRV-08 → SRV-07 (migracije redom, traka S-B)
WEB-01 Next temelj → WEB-02 API most → WEB-03 tokeni → WEB-04/05/06 ui → stranice
```

---

## Val 1: jezgra editora (8 PR-ova)

### SRV-01 `seed-lokalni` · SRV · traka S-A
- **Datoteke:** `db/main/local/seed.sql`, `db/main/local/lazni-oidc-racuni.json` (novo, za `FAKE_OIDC_ACCOUNTS_FILE`), `scripts/lokalno/config.ts` (put do datoteke računa), `README` odjeljak „Lokalni računi”.
- **Gradi:** u `demo-fakultet`:
  - administrator `demo-admin` (imenovan kroz `appoint_institution_admin`);
  - nastavnici `demo-teacher` (nositelj) i `demo-teacher-2` (suradnik), uloge potvrđene;
  - studenti `demo-student`, `demo-student-2`; račun bez uloge: nastavnički račun `demo-bez-uloge` u datoteci računa, čija uloga u ustanovi nije potvrđena (oblik `sim:<uloga>:<korisnik>@<domena>` iz `scripts/lokalno/lokalno.integration.test.ts` smije se koristiti samo ako domena pada u `demo-fakultet`; pisac provjeri);
  - jedan redak dnevnika pristupa: `demo-teacher` otvorio rad `demo-student` (kroz postojeću funkciju zapisa u shemi `audit`), da se SRV-11 i WEB-13 mogu kliknuti prije vala 5;
  - kolegij „Izmišljeni seminar iz ekologije grada” (2026./2027.) s grupama A i B; objavljen zadatak „Seminarski rad: kućno kompostiranje” s obavijesti kolegija; `demo-student` upisan i ima otvoren rad;
  - kodovi za upis: valjan `UPIS2026DEMO`, istekao `STARI2025KOD` (pohranjen samo `code_hash`);
  - drugi kolegij bez zadatka (za stanje „kolegij bez zadatka”).
- **Prihvaćanje:** `pnpm lokalno` → prijava lažnim OIDC-om kao `demo-admin`, `demo-teacher`, `demo-student` i račun bez uloge; `GET /api/v1/me` vraća očekivanu ulogu (bez uloge: 403).
- **Ovisi o:** ništa. Blokira gotovo sve.

### SRV-16 `test-evidence-tok` · SRV · traka S-C
- **Datoteke:** proširiti `scripts/stack/evidence.integration.test.ts` (postoji) ili novi `server/evidence/evidence-tok.integration.test.ts` (novo) u vitest projektu `integration`.
- **Gradi:** integracijski test: evidence open za rad iz seeda → commit dokumenta iz `primjer-izmisljeni.json` pretvorenog u V2 shemu → potpisana potvrda (Ed25519) → replay vraća isti JCS hash; negativni slučaj: nepoznato polje u dokumentu → odbijeno (B-8).
- **Prihvaćanje:** `pnpm test` zelen; namjerno pokvaren hash u testu pada.
- **Ovisi o:** SRV-01.

### WEB-01 `next-temelj` · WEB · traka W-A
- **Datoteke:** `package.json` (dodati `next`, istu glavnu verziju kao Aplication_front, i skripte `next:dev`, `next:build`, `typecheck`), `next.config.ts` (novo; komentar u `src/app/api/[...path]/route.ts` ga spominje, ali ga u kopiji nema), `tsconfig.json` putanje; `git mv` svih datoteka koje uvoze `@/server/*` ili zovu `withActor` (69 datoteka: stranice, `src/app/api/**` osim `[...path]`, komponente) u `src/_cekanje/` (novo), isključeno iz `tsconfig` i izvan `src/app`, pa ga Next ne gradi ni ne usmjerava.
- **Gradi:** Next.js App Router nad `src/app`; postojeći `dev-server.mjs` (:5173) i `packages/app` (Vite) ostaju netaknuti dok ih stranice ne zamijene. Svaki PR stranice vraća svoju rutu iz `src/_cekanje/` u `src/app` i prebacuje je na `/api/v1`; ono što ostane u `_cekanje` na kraju vala 4 popisano je i čeka svoj val.
- **Prihvaćanje:** `pnpm next:dev` → `http://localhost:3000/` otvara javnu početnu bez greške; `pnpm next:build` i `pnpm typecheck` prolaze.
- **Ovisi o:** ništa. Blokira sve WEB PR-ove.

### WEB-02 `api-most` · WEB · traka W-A
- **Datoteke:** `src/app/api/v1/[...path]/route.ts` (novo, proxy; specifičnija ruta, pa ima prednost pred postojećim `src/app/api/[...path]` koji vraća 404), `src/client/server.ts` (novo: čitanje na serveru kroz `createApi` s kolačićima zahtjeva), `.env.example` (`INSTITUTION_SERVER_URL=http://127.0.0.1:4000`, kao `dev-server.mjs`).
- **Gradi:** sve `/api/v1/*` ide na Institution_server po uzoru na proxy u `dev-server.mjs`; kolačić sesije prolazi u oba smjera; prijava i odjava idu na serverske `/api/v1/auth/*` (stari `src/app/api/auth/*` iz `_cekanje` briše se ovdje); bez ikakvog pristupa bazi u WEB-u.
- **Prihvaćanje:** prijava kao `demo-student` kroz web → `/api/v1/me` u pregledniku vraća studenta; odjava briše kolačić.
- **Ovisi o:** WEB-01, SRV-01.

### WEB-03 `ui-tokeni-fontovi` · UI · traka W-A
- **Datoteke:** `packages/ui/src/tokens.css`, `packages/ui/src/fonts/**`, `packages/ui/src/icons/**` (ikone trake alata za WEB-15), `packages/ui/src/save-state.ts` (stanja već postoje; dodaje se komponenta).
- **Gradi:** tokeni „papir i grafit” (tamna ljuska zadana, svijetla `:root[data-theme=light]`, tema lista zasebna, zadano bijela) prema `docs/design/DESIGN-SYSTEM.md` i prototipu editora; fontovi lokalno (A-13); `SaveState` komponenta s 8 stanja (A-4), SYNCED tekst „Spremljeno na poslužitelju”.
- **Prihvaćanje:** Storybook ili testna stranica `/ui-pregled` (samo dev) pokazuje sve tokene u obje teme i 8 stanja spremanja.
- **Ovisi o:** WEB-01.

### WEB-14 `editor-stranica` · WEB · traka W-C
- **Datoteke:** `src/app/rad/[assignmentId]/page.tsx` (novo; postoji samo `src/app/rad/page.tsx`), `src/components/editor/EditorPage.tsx` i `StatusBar.tsx` (novo); koristi postojeće `OpenWork`, `EarlierDraft`, `document-saver`, `OfflineNotice` iz `src/components/editor`, vraćene iz `_cekanje` i prebačene na `/api/v1`.
- **Gradi:** list papira (E§1, širina do 820) i statusna traka 30 px sa `SaveState`; editor-core V2: dnevnik (Dexie), sync, `serverSync`; evidence open pri otvaranju; SYNCED samo uz potpisanu potvrdu (B-6); druga kartica: blokada iz editor-corea (A-12) s tekstom `BLOCKED_TEXT`; stari nacrt (EarlierDraft) iz dnevnika.
- **Prihvaćanje:** kao `demo-student` otvori rad iz seeda → piše → „Sinkroniziram” pa „Spremljeno na poslužitelju”; osvježi → isti tekst; mreža isključena → „Spremljeno na uređaju”; druga kartica → blokada.
- **Ovisi o:** WEB-02, WEB-03, SRV-01.

### WEB-15 `editor-traka-staticna` · WEB · traka W-C
- **Datoteke:** postojeći `src/components/editor/EditorToolbar.tsx` i `EditorToolbarFor.tsx`; ikone iz `packages/ui` (WEB-03).
- **Gradi:** statični dio trake (E§3.6 toolbar2): poništi, ponovi, stil bloka (odlomak, H1–H3), podebljano, kurziv, popis, citat; samo čvorovi V2 sheme (popis = `bulletItem`, citat = `quote`), izgled kao u prototipu.
- **Prihvaćanje:** svaki gumb mijenja tekst; Ctrl+Z/Ctrl+Y rade; stanje gumba prati odabir; spremanje i dalje „na poslužitelju”.
- **Ovisi o:** WEB-14.

### WEB-16 `editor-e2e` · WEB · traka W-C
- **Datoteke:** `e2e/editor-val1.spec.js` (novo, uz postojeće `e2e/*.spec.js` i `e2e/support/axe.js`).
- **Gradi:** Playwright tok iz „Prihvaćanja” WEB-14 i WEB-15 na lokalnom stogu (server + lažni OIDC), uz axe na 1250 i 400 px.
- **Prihvaćanje:** `pnpm test:functional` zelen lokalno.
- **Ovisi o:** WEB-15, SRV-16.

**Kraj vala 1:** Daniel pokrene `pnpm lokalno` (SRV) i `pnpm dev` (WEB) i prođe tri koraka iz plana.

---

## Val 2: student (18 PR-ova)

### SRV-02 `ugovori-student` · SRV · traka S-A
- **Datoteke:** `server/contracts/routes/student.ts`, `server/contracts/routes/enrollment.ts`, `server/contracts/vectors/*.json`, `server/contracts/generated/*`, `server/contracts/inventory.ts`.
- **Gradi:**
  - `student.assignments.get` prošireno (A-3): akademska godina, grupe, vrsta rada, mentor, produljeni rok, nastavnici kolegija (`{id, ime, uloga: nositelj|suradnik}`);
  - `institution.enrollments.post` ishodi (A-2): `enrolled`, `invalid_code`, `expired_code`, `already_enrolled`, `enrolled_no_assignment`; kod 8–32 znaka, normalizira server;
  - novo `student.notice-read.post` (PO-7);
  - JCS vektori za sve nove oblike; `contracts:breaking` označava glavno izdanje.
- **Prihvaćanje:** `pnpm contracts:generate` bez razlike nakon commita; `pnpm test` (vektori) zelen.
- **Ovisi o:** SRV-01.

### SRV-04 `ugovori-izdanje` · SRV · traka S-A
- **Gradi:** `pnpm release:tarball` za `@ductura/contracts` 3.0.0 (glavno izdanje) sa studentskim i nastavničkim/admin ugovorima zajedno, tarball u Releases. Jedno izdanje i jedno podizanje verzije u WEB-u za sva tri vala.
- **Prihvaćanje:** tarball se instalira u čistom direktoriju.
- **Ovisi o:** SRV-02, SRV-03 (ista traka S-A, odmah iza seeda).

### SRV-05 `mig-upis-ishodi` · SRV · traka S-B
- **Datoteke:** nova migracija, `migrations.sum`, pgTAP.
- **Gradi:** `enroll_with_code` vraća `already_enrolled` i `enrolled_no_assignment`; kod se normalizira (velika slova, bez razmaka) prije usporedbe s `code_hash`.
- **Prihvaćanje:** pgTAP: svih 5 ishoda; drugi student ne vidi tuđi upis.
- **Ovisi o:** SRV-01.

### SRV-06 `mig-obavijest-procitana` · SRV · traka S-B
- **Gradi:** tablica `institution.notice_read (assignment_id, student_id, read_at)` samo za dodavanje (novo), RLS (student piše i čita svoje, nastavnik kolegija čita), RPC `institution.mark_notice_read` (novo); pgTAP retci.
- **Prihvaćanje:** pgTAP matrica: student da, drugi student ne, nastavnik kolegija čita, nastavnik drugog kolegija ne.
- **Ovisi o:** SRV-05 (redoslijed migracija).

### SRV-08 `mig-zadaci-studenta` · SRV · traka S-B
- **Gradi:** funkcija čitanja zadataka studenta s poljima iz A-3 (grupe, mentor, produljeni rok, nastavnici kolegija), RLS po upisu; pgTAP.
- **Prihvaćanje:** pgTAP: student vidi samo zadatke svojih kolegija; polja odgovaraju seedu.
- **Ovisi o:** SRV-06.

### SRV-09 `h-student-zadaci` · SRV · traka S-C
- **Datoteke:** `server/institution/student-assignments-route.ts` (novo, uz postojeći `student-workspace.ts`), montiranje u `server.ts`.
- **Gradi:** rukovatelj `student.assignments.get` nad SRV-08.
- **Prihvaćanje:** `curl` s kolačićem `demo-student` vraća zadatak iz seeda s nastavnicima kolegija.
- **Ovisi o:** SRV-02, SRV-08.

### SRV-10 `h-upis-obavijest` · SRV · traka S-C
- **Gradi:** rukovatelji `institution.enrollments.post`, `institution.acknowledgment.post`, `student.notice-read.post`.
- **Prihvaćanje:** upis s `UPIS2026DEMO` → `enrolled`; ponovno → `already_enrolled`; `STARI2025KOD` → `expired_code`; obavijest pročitana pa potvrđena.
- **Ovisi o:** SRV-02, SRV-05, SRV-06.

### SRV-11 `h-pristup-dnevnik` · SRV · traka S-C
- **Gradi:** rukovatelj `student.access-log.get` nad postojećim `server/database/my-access-log.ts` (tko je i kada otvorio rad).
- **Prihvaćanje:** `demo-student` vidi redak iz seeda (`demo-teacher` otvorio rad).
- **Ovisi o:** SRV-01 (ugovor već postoji).

### WEB-04 `ui-dijalog-toast` · UI · traka W-A
- **Gradi:** `Dialog` sa zarobljenim fokusom i Esc, `Toast` (aria-live) u `packages/ui`.
- **Prihvaćanje:** `/ui-pregled`: Tab ostaje u dijalogu, Esc zatvara, fokus se vraća na gumb.
- **Ovisi o:** WEB-03.

### WEB-05 `ui-obrasci` · UI · traka W-A
- **Gradi:** kvačica, odabir, višeredno polje, oznaka (tag), skeleton, detalji (`details`).
- **Prihvaćanje:** `/ui-pregled` u obje teme, tipkovnica radi, axe bez nalaza.
- **Ovisi o:** WEB-03.

### WEB-06 `ui-ljuska` · UI · traka W-A
- **Gradi:** premjestiti iz weba u `packages/ui`: PanelTabs, ErrorScreen, RouteLoading, `LogoutDialog` (sada `src/components/editor`), izbornik ljuske (ispod 800 px); web uvozi iz `ui`.
- **Prihvaćanje:** postojeće stranice izgledaju isto; `pnpm build` prolazi.
- **Ovisi o:** WEB-03.

### WEB-07 `ugovori-bump` · WEB · traka W-A
- **Gradi:** `@ductura/contracts` s 2.8.0 na 3.0.0 (Release URL), prilagodba `src/client` parsera (klijent odbija nepoznata polja).
- **Prihvaćanje:** typecheck i testovi zeleni.
- **Ovisi o:** SRV-04.

### WEB-08 `student-ljuska-prijava` · WEB · traka W-B
- **Datoteke:** `src/app/layout.tsx`, `src/components/shell/**` (2 datoteke iz `_cekanje`), `src/app/prijava/page.tsx`, `src/app/page.tsx`; dijalog odjave iz `ui` (WEB-06).
- **Gradi:** S: E-0 ljuska (64 px, bočna traka s 5 stavki, tema, izbornik ispod 800 px), odjava s dijalogom (A-6): odjava iz Ducture i AAI sesije (`auth.logout.post`), zatim `/`; E-1 Prijava sa 6 stanja; 403 na `/me` → stanje „bez uloge” s uputom na administratora fakulteta (A-5).
- **Prihvaćanje:** prijava kao `demo-student` → ljuska i `/zadaci`; odjava kroz dijalog → `/`, ponovni ulaz traži prijavu; račun bez uloge → stanje „bez uloge”.
- **Ovisi o:** WEB-02, WEB-04, WEB-06.

### WEB-09 `student-moji-zadaci` · WEB · traka W-B
- **Gradi:** S: E-2 Moji zadaci (`/zadaci`, A-1) sa stanjima iz inventara; briše `src/app/zadaci` `withActor` datoteke (3).
- **Prihvaćanje:** `demo-student` vidi zadatak iz seeda, rok, nastavnike kolegija; prazno stanje za `demo-student-2`.
- **Ovisi o:** WEB-07, WEB-08, SRV-09.

### WEB-10 `student-kolegiji-radovi` · WEB · traka W-B
- **Gradi:** S: E-3 Moji kolegiji, E-4 Moji radovi uz pretragu i akademsku godinu (A-10).
- **Prihvaćanje:** popis kolegija i radova iz seeda; pretraga filtrira; odabir godine mijenja popis.
- **Ovisi o:** WEB-09.

### WEB-11 `student-upis` · WEB · traka W-B
- **Gradi:** S: E-5 Upis kodom (7 stanja), prozori PD-5/PD-6; briše `src/app/upis` `withActor` (2).
- **Prihvaćanje:** krivi kod, istekao kod, već upisan, kolegij bez zadatka, uspjeh: svaki daje svoje stanje.
- **Ovisi o:** WEB-08, WEB-07, SRV-10.

### WEB-12 `student-obavijest` · WEB · traka W-B
- **Gradi:** S: E-6 Obavijest (8 stanja), PO-7 „pročitano”, potvrda; tekst o pravilima alata i pogledu uživo prema A-14; PD-7/PD-8.
- **Prihvaćanje:** obavijest se otvori, označi pročitanom, potvrdi; nakon osvježavanja ostaje potvrđena.
- **Ovisi o:** WEB-11, SRV-10.

### WEB-13 `student-dodatni-ekrani` · WEB · traka W-B
- **Gradi:** dodatni web ekrani iz A-10 vraćeni iz `_cekanje` i prebačeni na `/api/v1`: `src/app/rad/[assignmentId]/dnevnik-pristupa`, `src/app/kako-radi`, `src/app/stanje`.
- **Prihvaćanje:** dnevnik pristupa pokazuje redak iz seeda; „Kako radi” i stanje se otvaraju bez greške.
- **Ovisi o:** WEB-08, SRV-11.

**Kraj vala 2:** četiri koraka iz plana (prijava, upis kodom, obavijest i odjava, račun bez uloge).

---

## Val 4: nastavnik i administrator (10 PR-ova)

### SRV-03 `ugovori-nastavnik-admin` · SRV · traka S-A
- **Gradi:** `institution.courses.post` (postoji, `routes/institution.ts`) samo za administratora, s `holderId` i grupama; ugovori grupa (`institution.course-groups.*`, novo); `institution.assignments.post` (novo, izrada zadatka); vektori. Izdaje se zajedno sa SRV-02 u SRV-04.
- **Prihvaćanje:** `contracts:generate` bez razlike; vektori zeleni.
- **Ovisi o:** SRV-02 (isti vlasnik, redom).

### SRV-07 `mig-admin-kolegij` · SRV · traka S-B
- **Gradi:** RPC `institution.admin_create_course(name, year, ai_policy, holder)` (SECURITY DEFINER, provjera uloge administratora ustanove); nastavnički `create_course` ostaje, ruta ga više ne zove.
- **Prihvaćanje:** pgTAP: administrator da, nastavnik ne, administrator druge ustanove ne.
- **Ovisi o:** SRV-08 (redoslijed migracija).

### SRV-12 `h-admin-kolegij` · SRV · traka S-A
- **Gradi:** rukovatelj `institution.courses.post` nad SRV-07.
- **Prihvaćanje:** `demo-admin` izradi kolegij; `demo-teacher` dobije 403.
- **Ovisi o:** SRV-03, SRV-07.

### SRV-13 `h-nastavnik-citanje` · SRV · traka S-A
- **Gradi:** rukovatelji `teacher.access.get`, `teacher.courses.get`.
- **Prihvaćanje:** `demo-teacher` vidi kolegij iz seeda i novi kolegij gdje je nositelj.
- **Ovisi o:** SRV-01.

### SRV-14 `h-zadatak-izrada` · SRV · traka S-A
- **Gradi:** spojiti `server/institution/assignment-route.ts` (makni iz PENDING), rukovatelj `institution.assignment-versions.post`; pravila o alatima u zadatku (A-14); pri objavi se ništa ne šalje (C-17).
- **Prihvaćanje:** `demo-teacher` izradi i objavi zadatak; `demo-student` ga vidi nakon upisa.
- **Ovisi o:** SRV-03.

### SRV-15 `h-grupe` · SRV · traka S-A
- **Gradi:** rukovatelji grupa nad `course_team_groups` (administrator i nositelj); provjeriti RLS i dodati pgTAP retke koji nedostaju.
- **Prihvaćanje:** nositelj doda grupu; suradnik (C-7) također; student ne.
- **Ovisi o:** SRV-03.

### WEB-17 `nastavnik-ljuska` · WEB · traka W-C
- **Gradi:** nastavnička ljuska s 4 stavke uključivo „Zbirni” (A-9; prazno stanje do vala 5), nad zajedničkom ljuskom iz WEB-08; `src/app/nastavnik/page.tsx` vraćen iz `_cekanje`.
- **Prihvaćanje:** prijava kao `demo-teacher` → bočna traka s 4 stavke; „Zbirni” pokazuje prazno stanje.
- **Ovisi o:** WEB-07, WEB-08, SRV-13.

### WEB-18 `nastavnik-kolegiji` · WEB · traka W-C
- **Gradi:** N: N-01 kolegiji, dijalog dk-h (izrada i opoziv koda; kod se pokazuje jednom, A-8); prazni nastavnik vidi uputu da kolegij izrađuje administrator (A-7).
- **Prihvaćanje:** izradi kod → vidi ga jednom, nakon zatvaranja samo „izdan”; opozove stari; `demo-student-2` se upiše novim kodom.
- **Ovisi o:** WEB-17, SRV-13.

### WEB-19 `nastavnik-novi-zadatak` · WEB · traka W-C
- **Gradi:** N: N-02/03 bez obrasca kolegija (`submit:course` i `kolegij-stvoren` se ne grade), koraci zs-1 do zs-4, objava; postojeće TeacherSetup i AssignmentVersionForm prebačeni na `/api/v1`; briše `src/app/nastavnik` `withActor` (8) koje ova stranica koristi.
- **Prihvaćanje:** izradi zadatak s pravilima alata i rokom, objavi; student ga vidi u „Mojim zadacima”.
- **Ovisi o:** WEB-18, SRV-14.

### WEB-20 `admin-kolegij-novi` · WEB · traka W-A
- **Gradi:** obrazac „Novi kolegij” na `/ustanova/kolegiji` (naziv, godina, AI pravilo, nositelj, grupe) iz `ui` elemenata, u izgledu postojećeg ekrana A-03 (prototipa nema); briše `src/app/ustanova` `withActor` (4).
- **Prihvaćanje:** `demo-admin` izradi kolegij s nositeljem `demo-teacher-2` i grupom; `demo-teacher-2` ga vidi u N-01.
- **Ovisi o:** WEB-05, WEB-07, SRV-12, SRV-15.

**Kraj vala 4:** četiri koraka iz plana (admin kolegij, nastavnička ljuska, novi zadatak, kod za upis).

---

## Zbroj i trake

| Val | SRV | WEB/UI | Ukupno |
|---|---|---|---|
| 1 | 2 (SRV-01, 16) | 6 (WEB-01, 02, 03, 14, 15, 16) | 8 |
| 2 | 8 (SRV-02, 04, 05, 06, 08, 09, 10, 11) | 10 (WEB-04 do 13) | 18 |
| 4 | 6 (SRV-03, 07, 12, 13, 14, 15) | 4 (WEB-17 do 20) | 10 |
| **Ukupno** | **16** | **20** | **36** |

Prvi krug bez čekanja: S-A SRV-01, S-B SRV-05 i W-A WEB-01; S-C kreće sa SRV-16 čim sleti SRV-01. W-B (WEB-08) i W-C (WEB-14) kreću kad sletnu WEB-01, 02 i 03 (WEB-08 još WEB-04 i 06).

**Uska grla:** W-A ima 8 PR-ova u nizu (WEB-01 do 07 i WEB-20), a W-C radi WEB-14 do 16 prije WEB-17 do 19. Uz granicu od 3 WEB pisca web dio vala 4 kreće tek kad W-C završi editor; serverski dio vala 4 ide paralelno.

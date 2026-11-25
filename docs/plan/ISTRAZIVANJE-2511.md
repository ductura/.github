# Zadaci iz istraživanja javnih repoa, 25. 11. 2026.

> **Status: ODOBRENO za pisce.** Daniel je 25. 11. 2026. u sesiji graditelja odobrio preporuke istraživanja javnih GitHub repoa („Sve napravi što mi preporučuješ”). Posao smije krenuti dok ovaj PR čeka „Spoji n” (PLAN.md §10). Otvorena pitanja na dnu i dalje čekaju Danielovu odluku i nisu dio odobrenja.

Zadaci su alati, ovisnosti i testovi. Nijedan ne dodaje funkciju za korisnika. Svaki zadatak ide zasebnim PR-om s ID-jem `ISTR-n`. Za SRV vrijedi risk floor (`.github/**` i `db/**/tests/**` su critical); gdje kartica traži višu razinu, vrijedi viša.

Redoslijed: ISTR-3 i ISTR-6 su mali i neovisni. ISTR-1 ide prije ISTR-2 jer oba diraju lanac dokumenata. ISTR-4 radi pisac s pristupom privatnom repou. ISTR-5 nakon ISTR-1 i nakon DAN-1090.

### ISTR-1 `pdf-lib-fork` (SRV)
- **Risk:** standard prema donjoj granici, a predlažem critical, jer zadatak mijenja ovisnost potvrde predaje i izvoza.
- **Opseg:**
  - U `package.json` zamijeniti `pdf-lib` 1.17.1 s `@cantoo/pdf-lib` na točnoj verziji (zadnji tag je v2.11.0, 2026-09-11).
  - Promijeniti 12 uvoza u `server/downloads/receipt-pdf`, `server/downloads/interview-pdf`, `server/downloads/merlin/files` i `server/import/pdf`. `@pdf-lib/fontkit` ostaje.
  - Prvo napraviti spike: diff izlaza na postojećim golden PDF-ovima.
- **Granice:**
  - API i izgled dokumenata se ne mijenjaju.
  - Nove funkcije forka (SVG, inkrementalno spremanje) se ne koriste.
  - Nijedan test se ne briše i ne preskače.
- **Gotovo kad:**
  - `verapdf.yml` je zelen na svim generiranim PDF-ovima.
  - Postojeći testovi `receipt-pdf.test.ts` i `interview-pdf.test.ts` su zeleni.
  - SBOM više ne sadrži `pdf-lib` 1.17.1.
- **Testovi prihvata:**
  - Postojeći testovi `receipt-pdf`, `interview-pdf` i Merlin izvoza prolaze nepromijenjeni.
  - veraPDF PDF/A-2u prolazi.
  - Test koji čita uvezeni PDF (`read-pdf`) prolazi.

### ISTR-2 `tsa-rfc3161-pkijs` (SRV, dio B5)
- **Risk:** standard prema donjoj granici, a predlažem critical (lanac povjerenja evidencije).
- **Opseg:**
  - Port `server/external/tsa`: iz SHA-256 dnevnog korijena gradi `TimeStampReq`, a `TimeStampResp` parsira i provjerava PKI.js-om (`TSTInfo.messageImprint`, nonce, vrijeme, lanac certifikata TSA-a).
  - Lažni TSA u `packages/test-fakes`.
  - CLI `evidence:verify` dobiva provjeru spremljenog žiga.
- **Granice:**
  - TSA-u ide samo hash, nikad sadržaj ni osobni podatak.
  - Dva TSA-a prema planu B5.
  - Izbor TSA-a i FINA ostaju odluke iz plana.
  - Prije pisca treba stavka u planu, prema pravilu „plan prije pisca”.
- **Gotovo kad:**
  - Dnevni korijen ima dva žiga ili zapisanu prazninu.
  - CLI provjerava žig bez mreže.
- **Testovi prihvata:**
  - Golden odgovori TSA-a (ispravan, krivi imprint, krivi nonce, istekao certifikat, `granted` / `rejection`).
  - Property test da promjena jednog bajta korijena ruši provjeru.
  - Test da lažni TSA nikad ne prima ništa osim hasha.

### ISTR-3 `scorecard-reusable` (`ductura/.github`)
- **Risk:** critical (`.github/**`).
- **Opseg:**
  - Reusable workflow `scorecard.yml` s `ossf/scorecard-action` prikvačenim na SHA, `publish_results: false` i SARIF uploadom u Code scanning.
  - Tjedni raspored i poziv iz SRV-a i WEB-a.
- **Granice:**
  - Workflow ne ulazi u `ci-ok`, nije obvezan i ne objavljuje ništa OpenSSF-u.
  - `permissions` je najmanji mogući (`security-events: write`, `contents: read`, `actions: read`).
  - Prolazi `pin-check`, `permissions-check` i zizmor.
- **Gotovo kad:** prvi tjedni pokret daje rezultat za oba repoa i zapisan je početni rezultat.
- **Testovi prihvata:**
  - `self-test.yml` (actionlint, pin-check, permissions-check) je zelen.
  - Test u `scripts/` potvrđuje da je `publish_results` false.

### ISTR-4 `rls-katalog-usporedba` (SRV, UZETI OBRAZAC)
- **Risk:** critical (`db/**/tests/**`).
- **Opseg:**
  - Usporediti 68 pravila iz pgrls `docs/RULES.md` s čuvarima u `db/{main,logs,legal}/tests/000`, `010` i `012`.
  - Za svako pravilo zapisati „pokriveno (datoteka, test)”, „ne primjenjuje se (razlog)” ili „otvoreno”.
- **Granice:**
  - pgrls se ne instalira i ne pokreće.
  - Tablica i stavke „otvoreno” idu **samo** u privatni `ductura/sigurnosni-nalazi`.
  - Eventualni novi pgTAP čuvari su zaseban zadatak, s negativnom kontrolom kao u `012`.
- **Gotovo kad:** svih 68 pravila ima status u privatnom repou.
- **Testovi prihvata:** nema koda. Ako nastanu novi čuvari, svaki ima negativnu kontrolu koja ga ruši.

### ISTR-5 `stryker-moduli-povjerenja` (SRV)
- **Risk:** critical (novi workflow u `.github/workflows`).
- **Odnos s DAN-1090:** isti alat. DAN-1090 (Backlog) gradi zajedničku naredbu u ductura/.github za datoteke koje PR mijenja. ISTR-5 je SRV konfiguracija za module povjerenja i koristi tu naredbu kad postoji, a ne uvodi drugu. Orkestrator ih vodi kao jedan tok: najprije DAN-1090, zatim ISTR-5.
- **Preduvjet:** provjeriti da `@stryker-mutator/vitest-runner` podržava Vitest 5 (SRV ima `^5.1.0`). Ako ne podržava, zadatak stoji i to se javlja na #2058.
- **Opseg:**
  - `@stryker-mutator/core` i `@stryker-mutator/vitest-runner` kao devDependency.
  - `stryker.config.mjs` ograničen na `server/domain/forensics/**`, `scripts/evidence-verify/**` i `scripts/engineering/risk-floor.ts`.
  - Tjedni i ručni workflow, izvještaj kao artefakt.
- **Granice:**
  - Samo u CI-ju, nikad lokalno, zbog RAM-a.
  - Ne ulazi u `ci-ok`.
  - Prag se prvo samo mjeri. Prijedlog praga dolazi tek nakon dva pokreta.
- **Gotovo kad:**
  - Postoji izvještaj s mutation scoreom po datoteci.
  - Preživjeli mutanti zapisani su kao popis kandidata za testove.
- **Testovi prihvata:**
  - Workflow prolazi `self-test` pravila (pin, permissions).
  - Postojeći testovi se ne mijenjaju.

### ISTR-6 `docx-fixturi-mammoth` (SRV, UZETI OBRAZAC, S)
- **Risk:** standard.
- **Opseg:**
  - Uzeti odabrane DOCX fixture iz `mammoth.js/test/test-data` (BSD-2-Clause, uz zapis licence i izvora) u `test-support/docx-zip`: `strict-format`, `comments`, `footnotes`, `endnotes`, `tables` i `external-picture`.
  - Dodati testove uvoza.
- **Granice:** biblioteka mammoth se ne uvodi. Uvoz ne smije slati vanjske zahtjeve (`external-picture`).
- **Gotovo kad:** svaki fixture ima test s očekivanim ishodom (uvezeno ili zatvorena greška).
- **Testovi prihvata:** novi testovi su zeleni, a postojeći testovi uvoza ostaju nepromijenjeni.

Obrazac iz Playwrighta (`--shard`, paralelni katalog) nije dobio zadatak: već je uveden u WEB #445 i #447, spojenima 22. 11. 2026.

## Otvorena pitanja (čekaju Daniela, nisu odobrena)

1. **Sličnost tekstova.** Treba li Ducturi ikad provjera sličnosti, npr. kroz nacionalni sustav preko Srca? Ili je potpuno isključena prema D-01 i rječniku? Do odgovora je svaki takav alat odbačen.
2. **LTI i Merlin.** Postoji Merlin izvoz (`server/downloads/merlin`). Je li prihvatljiv LTI 1.3 samo kao poveznica iz Merlina, uz koju se student i dalje prijavljuje AAI@EduHr-om? Ili LTI ostaje potpuno izvan opsega?
3. **PDF/UA.** Mora li izvoz rada i potvrde biti i PDF/UA, a ne samo PDF/A-2u? Ako mora, veraPDF već ima taj profil, pa je zadatak mali.
4. **Sigstore.** Smije li provenance javnih paketa `@ductura/contracts` i `@ductura/test-fakes` ići u javni Sigstore/Rekor log? Tamo idu samo metapodaci builda (repo, workflow, hash), bez korisničkih podataka. O tome ovisi `attest-build-provenance`.
5. **Dependabot.** SRV i WEB nemaju `.github/dependabot.yml`, ni na zadanoj ni na migracijskoj grani. Treba li proširiti obrazac iz `ductura/.github` (cooldown 7 dana, grupe) na njih? Plan (§ verzionirani paketi) računa s Dependabot PR-ovima u klijentima.

Izvor: istraživanje graditelja (77 ocijenjenih repoa, mjerenja `gh api` i OpenSSF Scorecard). Pune tablice ostaju u bilješkama graditelja, jer sadrže i odbačene kandidate.

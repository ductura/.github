Kanonski plan migracije: [PLAN-MIGRACIJE.md](https://github.com/ductura/.github/blob/main/docs/plan/PLAN-MIGRACIJE.md). Ovaj dokument je dio tog plana.

# Ductura/.github: plan repozitorija

Stanje: 14. 11. 2026. · **Samo plan.** Novi repo po vlasnikovoj odluci 14. 11. (#87 c.6870353871, mjera 2). Izvori kao u [planu servera](https://github.com/ductura/server/blob/main/docs/PLAN.md). Migracija ga je predlagala kao pomoćni repo (odluka 3, T-0.1 … T-0.4, T-0.7); ova odluka ga potvrđuje i pomiče na početak.

## 1. Svrha i granica

**Svrha.** Jedno mjesto za ono što svih pet repozitorija (server, preloader, web, desktop-windows, desktop-macos) dijele: reusable workflowe, preseti za TypeScript, lint i format, predloške PR-a i issuea, labele, generator novog repoa i tjednu provjeru razilaženja postavki. Svaki repo poziva workflow s punim SHA-om ovog repoa (`@<40 znakova> # <oznaka>`, npr. `# ci-v1`, `# gate-v1`; oznaka je samo komentar, nikad sam poziv) i daje samo svoje: tablicu putanja za risk, popis poslova i matricu.

**Granica (nikad ne ulazi):** kod aplikacije; tajne (workflowi ih primaju kao `secrets: inherit` ili ulaz, nikad ne sadrže vrijednost); pojedinosti sigurnosnih nalaza (repo je javan); odluke o prioritetu i statusu zadatka (Linear); vlastiti pisani retci verdikta (`Agent-Review:` i ostali ostaju u PR-u ciljnog repoa).

## 2. Zatečeno stanje

Repo ne postoji. U Ductusu postoje izvori koje izdvaja: `.github/workflows/{ci,engineering-gate,engineering-gate-review-signal,dependency-review,secret-scan-push}.yml`, `.github/{pull_request_template.md,CODEOWNERS,dependabot.yml,ISSUE_TEMPLATE/}`, `scripts/engineering/review-gate*.mjs`, `protected-paths.mjs`, `eslint.config.mjs`, `tsconfig.json`, `lefthook.yml`. Napomena: `scripts/engineering/risk-floor.test.mjs` postoji, a `risk-floor.mjs` ne; logika praga je drugdje (S-0.10-a mora to razjasniti prije prijenosa).

## 3. Sadržaj (PRIJEDLOG)

```
profile/README.md                 javni profil organizacije (hr)
.github/workflows/                reusable: ci-node.yml, ci-ok.yml, secret-scan.yml, dependency-review.yml, osv-scan.yml,
                                  engineering-gate.yml, publish-package.yml, ci-dotnet.yml i ci-swift.yml (faza E)
                                  vlastiti: self-test.yml, drift-check.yml (tjedno, samo čitanje)
PULL_REQUEST_TEMPLATE.md, ISSUE_TEMPLATE/   zadani predlošci za sve repoe organizacije
labels.yml                        zajednički popis labela
packages/tsconfig/                @ductura/tsconfig (strict)
packages/eslint-config/           @ductura/eslint-config (uključuje pravila granica kao opciju)
packages/prettier-config/         @ductura/prettier-config
scripts/gate/                     risk-floor, provjera verdikata, zaštićene putanje (TS)
scripts/new-repo/                 generator početnih datoteka (T-0.4)
fixtures/                         mali Node, .NET i Swift projekt za samotest workflowa
```

## 4. Što dolazi iz Ductusa (prijenos s testovima)

| Izvor (Ductus) | Testovi koji idu s njim | Cilj |
|---|---|---|
| `scripts/engineering/review-gate*.mjs`, `protected-paths.mjs` | 20-ak `review-gate-*.test.mjs`, `risk-floor.test.mjs` | `scripts/gate/*.ts` (prevedeno, iste tvrdnje) |
| `.github/workflows/{engineering-gate,engineering-gate-review-signal}.yml` | samotest nad fixtureom | `.github/workflows/engineering-gate.yml` (reusable) |
| `.github/workflows/{ci,dependency-review,secret-scan-push}.yml` | samotest | `ci-node.yml`, `dependency-review.yml`, `secret-scan.yml` |
| `.github/pull_request_template.md`, `ISSUE_TEMPLATE/` | `tests/unit/pr-metadata-precheck.test.ts` | zadani predlošci |
| `eslint.config.mjs`, `tsconfig.json`, `lefthook.yml` | fixture koji mora pasti i proći | `packages/*-config` |

Ne prenose se: skripte orkestratora (ostaju u Ductusu, T-0.6), `CODEOWNERS` (GitHub ga ne nasljeđuje; svaki repo ima svoj, generator ga stvara).

## 5. Zadaci

| Korak / ID | Što | Ovisi o | Risk |
|---|---|---|---|
| U2 (server plan; PRIJEDLOG ID) | Stvaranje repoa i prvi sadržaj; ide **odmah nakon kostura servera** | V-1 | standard |
| T-0.1 | Profil, predlošci issuea i PR-a, labele | U2 | standard |
| T-0.2 | Reusable workflowi: CI osnova s `ci-ok`, tajne, ovisnosti, gate | U2, S-0.9; S-0.10-a/b se pišu **ovdje**, ne u serveru, i nema izdvajanja iz servera | critical |
| — (novo, PRIJEDLOG ID) | Preseti `@ductura/tsconfig`, `eslint-config`, `prettier-config` na GitHub Packages | U2 | standard |
| T-0.3 | **Ukinuto 17. 11.** (spajanje po pravilu iz `docs/plan/PLAN-MIGRACIJE.md` §7) | — | — |
| T-0.4 | Generator novog repoa | S-0.6, T-0.2 | standard |
| T-0.7 | Tjedna provjera razilaženja postavki (samo čitanje) | T-0.2 | standard |
| U11 (server plan; PRIJEDLOG ID) | **Gate prema riziku uz ugovorne testove**: npr. PR koji mijenja `server/contracts/**` je najmanje `critical` i traži zelene ugovorne testove preloadera i weba nad novom verzijom; PR koji ne dira ugovor, a prolazi ugovorne testove, zadržava risk iz tablice putanja | zadnje: nakon ugovora (U4 … U10) i S-1H.8 | critical; **zaseban PR pravila, vlasnik potvrđuje** (pravilo gatea mijenja `docs/ENGINEERING_SYSTEM.md`) |

Promjena ponašanja gatea (risk floor, broj aplikacija za `critical`, popis obveznih statusa) nikad ne ide u PR koji radi nešto drugo.

## 6. Testovi (personalizirano: workflowi i pravila gatea)

| Sloj | Konkretni slučajevi |
|---|---|
| **Pomoćne funkcije** | risk-floor: putanja → razina za svaku tablicu repoa; najviša razina pobjeđuje; nepoznata putanja dobiva zadanu razinu; provjera verdikata: redak na krivom headu, krivi format `runtime:slot:role`, isti autor i reviewer, nedostaje QA za `critical`, Owner Override bez SHA. Preneseni testovi Ductusa s istim tvrdnjama. |
| **Statička provjera workflowa** | actionlint na svakom workflowu; svaka akcija prikvačena na SHA (test pada na `@v4`); najmanje dozvole (`permissions`) po poslu; nema `pull_request_target` s checkoutom tuđeg koda; PRIJEDLOG zizmor (besplatan) za sigurnost workflowa. |
| **Samotest (integracija)** | `self-test.yml` poziva svaki reusable workflow nad fixtureom: zeleni Node projekt daje zeleni `ci-ok`; projekt s namjerno palim testom daje crveni `ci-ok`; posao koji se preskoči ne daje lažno zeleni `ci-ok`; tajna u fixtureu ruši `secret-scan`; lockfile s poznatom ranjivošću ruši `osv-scan` (DAN-921). |
| **Preseti** | fixture koji mora pasti (implicitni `any`, dubok uvoz kad su granice uključene, krivi format) i koji mora proći. |
| **Generator** | novi repo dobiva README, adaptere pravila, CODEOWNERS, PR predložak, risk tablicu i labele; drugi prolaz ne mijenja ništa. |
| **Provjera razilaženja** | lažni API odgovori: repo bez zaštite grane, bez obveznog `ci-ok`, s viškom labele → nalaz u koordinacijskom issueu; ništa se ne mijenja (samo čitanje). |
| **Verzije** | promjena reusable workflowa ne utječe na repo koji poziva stariji puni SHA (test nad fixtureom s prikvačenim SHA-om); poziv oznakom ili granom pada. |

Vizualni, pristupačnost i performanse se ne primjenjuju. **Matrica:** `ubuntu-latest`; `windows-latest` i `macos-latest` samo za `ci-dotnet` i `ci-swift` u fazi E. **Prag „gotovo”:** samotest zelen za svaki workflow; svaka akcija prikvačena; preneseni testovi gatea prolaze.

## 7. CI i gate

- Poslovi: `actionlint`, `pin-check`, `permissions-check` (DAN-970), `unit` (skripte gatea), `self-test`, `node-fail`, `node-skipped` i `red-aggregate` (crveni `ci-ok`, DAN-971), `presets`, `lint-presets`, `secret-scan`, `osv-scan` i `osv-scan-negative` (DAN-921), `ci-ok-reusable` i obvezni `ci-ok` (običan posao nad svim ostalima, DAN-885), svi u `self-test.yml`. Tjedno `drift-check`.
- Risk: cijeli repo `critical` osim `profile/**` i `ISSUE_TEMPLATE/**` (`low`), jer upravlja gateom svih repoa.
- Vlasničke radnje: stvaranje repoa (V-1 opseg), V-2 i V-3 za ovaj repo; potvrda U11.

## 8. Kriterij izlaza (prvi val)

1. Server, preloader i web pozivaju reusable workflowe punim SHA-om (oznaka samo kao komentar); nijedan nema vlastitu kopiju gatea.
2. Preneseni testovi gatea prolaze; samotest zelen.
3. Preseti objavljeni i korišteni u sva tri repoa faze A–C.
4. Tjedna provjera razilaženja radi i javlja nalaz.
5. U11 spojen tek nakon vlasnikove potvrde.

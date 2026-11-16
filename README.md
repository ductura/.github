# .github
Shared CI workflows, tool presets and templates for Ductura

## Reusable workflows

Pozivaj ih s punim SHA-om ovog repoa (`@<40 znakova> # <oznaka>`), nikad s granom ili oznakom. Svaki repo i dalje pokreće svoje provjere nad svojim kodom; ovdje su samo predlošci.

| Workflow | Što radi |
|---|---|
| `ci-node.yml` | pnpm, Node iz `.nvmrc`, zadane skripte paketa |
| `ci-ok.yml` | Zbirna provjera: zelena samo ako je svaki posao iz `needs` uspio. Preskočen posao pada ako nije naveden u `allow-skipped`. Pozivatelj šalje `results: ${{ toJSON(needs) }}` i postavlja `if: ${{ always() }}`. |
| `secret-scan.yml` | gitleaks nad cijelom poviješću, slika prikvačena na digest, bez mreže; pada ako nije skeniran nijedan commit |
| `dependency-review.yml` | Na pull requestu odbija novu ovisnost s ranjivošću (od `moderate`) ili licencom izvan popisa; izvan PR-a pada |
| `engineering-gate.yml` | Status „Engineering review gate” na headu PR-a iz verdikata review i QA (runner `scripts/gate`); checkouta samo ovaj repo na `gate-sha`, nikad kod PR-a, bez tajni. Samotest nad `fixtures/gate` u `self-test.yml`. |

`self-test.yml` provjerava ove predloške nad fixtureima, a `scripts/pin-check.mjs` provjerava da je svaka akcija prikvačena na puni SHA. To je jedini workflow ovog repoa koji se pokreće na pull requestu (i `push`): `needs` ne vidi poslove iz drugog workflowa. Obvezni status je običan posao `ci-ok` koji ovisi o svim ostalim poslovima i izvodi točno blok iz `ci-ok.yml`; poziv reusable workflowa dao bi ime provjere `ci-ok / ci-ok`, pa se `ci-ok.yml` samotestira zasebnim poslom `ci-ok-reusable`.

## Tjedna provjera razilaženja

`drift-check.yml` (ponedjeljkom i ručno) samo čita postavke repoa navedenih u `drift/expected.json`: zadanu granu, zaštitu grane, obvezni status `ci-ok` i labele iz `labels.yml`. Oba posla (`scan` i `report`) imaju samo `contents: read` i ništa ne mijenjaju. Posao `report` piše ishod u sažetak posla i učitava ga kao artefakt `drift-report`. Razilaženje i skeniranje koje nije dovršeno ili mu izlaz nije prepoznat (tada izvještaj kaže da stanje nije poznato) ruše pokretanje; čista provjera prolazi. Nečitljiv odgovor (mreža, neispravan JSON, krivi oblik) je nalaz, nikad prolaz, a izvještaj broji nečitljive repoe u zasebnom retku. Logika je u `scripts/drift.mjs` i `scripts/drift-report.mjs` (testovi uz njih).

Posao `deliver` (`scripts/drift-deliver.mjs`) jedini smije pisati: razilaženje ili nepoznato stanje šalje kao jedan komentar na issue zadan brojem u varijabli repoa `DRIFT_REPORT_ISSUE`, a čistu provjeru ne šalje. Radi samo uz varijablu `DRIFT_DELIVERY=true` (zadano isključeno), u `ductura/.github`, s grane `main`, na rasporedu ili ručnom pokretanju. Šalje najviše jedan GET issuea i jedan POST komentara, bez ponavljanja; svaki odgovor (status, origin, `content-type`, `Link`, veličina, polja) provjerava se prije nego što se išta iz njega pročita. Issue ne traži i ne otvara: vlasnik ga jednom otvori s naslovom iz `reportIssue` u `drift/expected.json` i postavi obje varijable.

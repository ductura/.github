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

`self-test.yml` provjerava ove predloške nad fixtureima, a `scripts/pin-check.mjs` provjerava da je svaka akcija prikvačena na puni SHA.

## Tjedna provjera razilaženja

`drift-check.yml` (ponedjeljkom i ručno) samo čita postavke repoa navedenih u `drift/expected.json`: zadanu granu, zaštitu grane, obvezni status `ci-ok` i labele iz `labels.yml`. Oba posla (`scan` i `report`) imaju samo `contents: read` i ništa ne mijenjaju. Posao `report` piše ishod u sažetak posla i učitava ga kao artefakt `drift-report`. Razilaženje i skeniranje koje nije dovršeno ili mu izlaz nije prepoznat (tada izvještaj kaže da stanje nije poznato) ruše pokretanje; čista provjera prolazi. Nečitljiv odgovor (mreža, neispravan JSON, krivi oblik) je nalaz, nikad prolaz, a izvještaj broji nečitljive repoe u zasebnom retku. Dostava u koordinacijski issue dolazi u zasebnom PR-u (DAN-749). Logika je u `scripts/drift.mjs` i `scripts/drift-report.mjs` (testovi uz njih).

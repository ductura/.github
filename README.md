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

`self-test.yml` provjerava ove predloške nad fixtureima, a `scripts/pin-check.mjs` provjerava da je svaka akcija prikvačena na puni SHA.

## Tjedna provjera razilaženja

`drift-check.yml` (ponedjeljkom i ručno) samo čita postavke repoa navedenih u `drift/expected.json`: zadanu granu, zaštitu grane, obvezni status `ci-ok` i labele iz `labels.yml`. Posao ima samo `contents: read` i ništa ne mijenja. Nalaz je u sažetku posla, a posao tada pada; dostava u koordinacijski issue dolazi u zasebnom PR-u. Nečitljiv odgovor (mreža, neispravan JSON, krivi oblik) je nalaz, nikad prolaz. Logika je u `scripts/drift.mjs` (testovi u `scripts/drift.test.mjs`).

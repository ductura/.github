# %%name%%

Repozitorij organizacije Ductura. Zajednički plan je u [planu migracije](https://github.com/ductura/.github/blob/main/docs/plan/PLAN-MIGRACIJE.md).

## Pravila

Ovaj repo nema vlastitih pravila rada. `AGENTS.md` i `CLAUDE.md` su tanki adapteri koji upućuju na kanonske dokumente.

## CI

`.github/workflows/ci.yml` poziva zajedničke workflowe iz [ductura/.github](https://github.com/ductura/.github) punim SHA-om. Obvezni status je `ci-ok`.

## Rizik

Najniža razina rizika po putanji je u `.github/risk-paths.json`. Kad putanja odgovara više pravila, vrijedi najviša razina; putanja bez pravila dobiva zadanu razinu.

Početne datoteke stvorio je generator `scripts/new-repo` iz ductura/.github (preset `%%preset%%`).

# Mutacijsko testiranje promijenjenih datoteka (DAN-1090)

Naredba pokreće Stryker s Vitest runnerom samo nad JS/TS izvorima koje promjena dira i ispisuje svaki preživjeli mutant. Nije gate: nije obvezan status i ne ulazi u `ci-ok`.

```sh
cd scripts/mutate && npm ci --ignore-scripts
node scripts/mutate/mutate.mjs --project <projekt> [--base <ref>] [--vitest-config <datoteka>] [--concurrency <n>] [datoteke...]
```

- Datoteke su relativne prema projektu: iz argumenata, iz `MUTATE_FILES` (odvojene razmakom ili novim retkom) i, uz `--base`, iz `git diff <base>...HEAD`. Testovi (`*.test.*`, `*.spec.*`, `__tests__/`), `.d.ts` i ne-JS/TS datoteke se preskaču.
- Stryker čita `mutate` kao glob, pa se putanja predaje doslovno (`src/routes/[id].ts` mutira samo tu datoteku). Putanja s vitičastim zagradama `{}` ne može se doslovno zadati i daje grešku (2).
- Izlazni kod: `0` nijedan mutant nije preživio ili nema što mutirati; `1` barem jedan je preživio (`Survived` ili `NoCoverage`), svaki se ispisuje kao `::error::surviving mutant <datoteka>:<redak>:<stupac> ...`; `2` greška (krivi ulaz, crveni početni testovi, Stryker pao).
- Stryker i Vitest runner prikvačeni su na točno 10.1.1 (`package.json`, `package-lock.json`); `minimatch` i `qs` podignuti su kroz `overrides` zbog poznatih ranjivosti.
- Konfiguracija je fiksna u `lib.mjs`: `stryker.config.*` projekta se ne čita, `logLevel` je uvijek `info` (stryker-js#6272), `disableBail: true` pa runner šalje Vitestu `bail: 0` (#6335).

Reusable workflow `.github/workflows/mutate.yml` (samo `workflow_call`, `contents: read`) checkouta projekt pozivatelja i ovaj repo na `tool-sha` jedan uz drugi, instalira projekt s pnpm-om, a alat s `npm ci` i pokreće naredbu. Poziv je u zaglavlju workflowa. Pozive iz SRV-a i WEB-a dodaje ISTR-5.

Testovi: `npm test` u ovoj mapi (fixturei `fixtures/weak` i `fixtures/strong` vrte pravi Stryker). Statičke provjere workflowa su u `scripts/mutate-workflow.test.mjs` i idu s ostalim testovima u `scripts/`.

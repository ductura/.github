# Generator novog repoa (T-0.4)

Piše početne datoteke novog Ductura repozitorija u lokalnu mapu. Ne stvara repozitorij na GitHubu, ne zove API i ne treba mrežu. Datoteke se zatim predaju jednim PR-om u novi repo.

```sh
node scripts/new-repo/generate.mjs --name server --preset node \
  --codeowner @ductura/vlasnici --ref <40 znakova SHA ovog repoa> [--ref-label ci-v1] ../server
```

| Preset | Datoteke |
|---|---|
| oba | `README.md`, `AGENTS.md`, `CLAUDE.md`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, `.github/labels.yml`, `.github/risk-paths.json`, `.github/workflows/ci.yml` |
| `node` | uz to `package.json`, `tsconfig.json`, `eslint.config.ts`, `.nvmrc`, `.npmrc`, `.prettierignore` i posao `ci-node` u CI-ju |
| `generic` | samo zajednički dio; CI ima `secret-scan`, `dependency-review` i `ci-ok` |

- `AGENTS.md` i `CLAUDE.md` su tanki adapteri (S-0.6): samo poveznice na kanonske dokumente, isti sadržaj u svakom repou osim imena.
- PR predložak, `labels.yml` i `.nvmrc` su doslovne kopije iz ovog repoa; verzije alata u `package.json` dolaze iz `fixtures/lint-presets` i `packages/*`.
- `ci.yml` poziva zajedničke workflowe punim SHA-om (`@<sha> # <oznaka>`) i završava pozivom `ci-ok` s `if: always()`.
- Format `risk-paths.json` čita `scripts/gate/risk-floor.ts` (S-0.10-a), koji neispravnu tablicu odbija greškom. Spajanje u `engineering-gate.yml` je zaseban korak; dotad pozivatelj sam predaje `minimum-risk`.

Drugi prolaz ne mijenja ništa. Postojeća datoteka s drukčijim sadržajem je sukob: ništa se ne piše, izlazni kod je 1. Neispravan ulaz daje izlazni kod 2.

Preset `node` traži objavljene `@ductura/*` pakete; prvi PR novog repoa pokreće `pnpm install` i predaje `pnpm-lock.yaml`, jer `ci-node` instalira s `--frozen-lockfile`.

GitHub Packages traži token i za čitanje. Posao `node` u generiranom CI-ju zato daje `packages: read`, a `ci-node.yml` token predaje pnpm-u kroz korisničku `.npmrc` iz `setup-node`. `--ref` mora biti SHA na kojem `ci-node.yml` to već radi. Paket mora dopustiti čitanje novom repou (postavka paketa „Manage Actions access”, vlasnička radnja). Lokalno je token u vlastitoj `~/.npmrc`, nikad u repou.

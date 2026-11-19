# ductura/.github

Sva pravila rada: [docs/PRAVILA.md](docs/PRAVILA.md). Ova datoteka daje samo naredbe i putanje ovog repoa.

## Što je repo

Zajednički repo organizacije `ductura`:

- pravila, stanje, odluke, arhitektura i plan (`docs/`);
- preseljeni dokumenti proizvoda (`docs/proizvod/`, `docs/dizajn/`);
- reusable workflowi (`.github/workflows/`), preseti (`packages/`), predlošci PR-a i issuea, labele.

Repo nema objavu. PR ide prema `main`. Koda aplikacije, tajni i pojedinosti sigurnosnih nalaza ovdje nema.

## Naredbe

```bash
npm ci                                  # ovisnosti testova u scripts/
node --test scripts/*.test.mjs          # testovi skripti i dokumenata
```

Testovi gatea: `node --test scripts/gate/*.test.ts` (posao `gate` u `.github/workflows/self-test.yml`).

## Na što paziti u `docs/`

- `scripts/plan-mergify.test.mjs`: u cijelom `docs/` samo jedan redak smije imenovati alat za red spajanja koji je ukinut 17. 11. 2026.
- `scripts/plan-domain.test.mjs`: nijedna datoteka ne smije imenovati drugu domenu `ductura` osim ductura.org.
- `docs/plan/` je kanonski plan migracije. Mijenja se samo PR-om.

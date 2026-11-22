# Zapisnik osnovice faze 1 (kopija i osnovica)

Ovaj zapisnik zatvara stavku faze 1 u `PLAN-MIGRACIJE.md`: „evidencija prenesenih migracija i testova, točni repozitorije, grane i commitovi”. Stanje je provjereno 22. 11. 2026. preko GitHub API-ja i lokalnog `origin/main` u `D:\Ductus`. Brojke su točno ovakve kako su izmjerene, a ono što nije izmjereno označeno je.

## 1. Izvor kopije

- Izvor: Ductus `origin/main`, `https://github.com/danielrisavi77-create/Ductus`.
- Commit izvora kopije: `220b5db7` (14. 11. 2026., zadnji commit prije 02:08Z). Ovo je **procjena** po vremenu početnih commitova kopije (14. 11. 02:08Z); točan SHA izvora nije zapisan u grani.
- Početni commit kopije na svakoj grani: „Kostur repozitorija s funkcionalnim testom i testovima pomoćnih funkcija” (14. 11. 2026., 02:08Z).

## 2. Grane i commitovi

Stanje heada u trenutku provjere (22. 11. 2026.). Grane su se nakon kopije mijenjale, pa head nije jednak početnom commitu kopije.

| Repo | Grana | Početni commit kopije | Head | Ispred / iza `main` |
|---|---|---|---|---|
| `Institution_server` | `migracija/kopija-ductus-backend` | `f5b6dd71` | `1f2eebc2` | 247 / 6 |
| `Institution_server` | `migracija/kopija-ductus-testovi-server` | `f5b6dd71` | `d45585e9` | 15 / 6 |
| `Institution_front_web_chrome` | `migracija/kopija-ductus-front` | `b69cfab0` | `f1e72ebf` | 344 / 2 |
| `Institution_front_web_chrome` | `migracija/kopija-ductus-testovi-front` | `b69cfab0` | `45c8df93` | 3 / 2 |
| `Preloader` | `migracija/kopija-ductus-landing` | `3ebf71f1` | `7382072f` | 1 / 1 |
| `Preloader` | `migracija/nextjs` | `3ebf71f1` | `cd6128df` | nije mjereno |
| `Institution_web_mobile` | `migracija/nextjs` | `5c975a23` | `ae5f825c` | nije mjereno |
| `Web_other` | `migracija/nextjs` | `e75ca798` | `66a34105` | nije mjereno |

Grane `migracija/deploy-render-vercel` su faza 5 i nisu u ovom zapisniku. Ostale `migracija/*` grane (npr. `cweb…`, `csrv…`, `w1119…`) su razvojne grane faze 2 i nisu kopija.

## 3. Migracije (baza)

- Ductus `db/migrations`: **112** datoteka, sve `.sql` plus `migrations.sum`.
- Kopija `Institution_server` na `db/main/migrations/`: svih **112** Ductusovih migracija ima **identičan blob SHA** kao u Ductusu (provjereno).
- Grana sada ima **208** `.sql` datoteka u toj mapi. Razlika od **96** su migracije koje su dodane na grani nakon kopije (Ductus ih nema). To je očekivano i nije odstupanje od kopije.

## 4. Testovi

Ductus ima **663** test datoteke (`*.test.ts(x)` i `*.spec.ts(x)`) na `origin/main`.

Provjera je išla po putanji i po imenu datoteke u svim granama kopije i u `main` grana repoa. Usporedba po sadržaju nije korištena kao glavni kriterij, jer se 410 datoteka razlikuje od Ductusa zbog kasnijih izmjena (npr. preslikavanje `@/` aliasa i preraspodjela po KARTI).

| Ishod | Broj |
|---|---|
| Ista putanja u kopiji | 663 − 488 = **175** |
| Druga putanja u kopiji, isto ime datoteke (preraspodjela) | **454** |
| Nema ni po putanji ni po imenu | **34** |

Napomena: 454 je potvrda po imenu, ne po sadržaju. Za svaku od tih 454 nije provjerena identičnost sadržaja. Dio imena se pojavljuje u više repoa (npr. `e2e/prijava.spec.ts`, `src/domain/collaboration/share.test.ts`), što je očekivano jer kopije sadrže zajedničke dijelove.

### Nepronađeni testovi (34), po kategorijama

Svih 34 postojalo je u Ductusu na dan kopije (provjereno `git cat-file` na `220b5db7`). **Nijedan nije nastao nakon kopije.**

**A. Alati i proces Ductusa (13).** Vjerojatno namjerno nisu kopirani, jer ne pripadaju proizvodu. Potvrda s vlasnikom je potrebna.

- `tests/unit/runner.test.ts`, `tests/property/runner.property.test.ts`
- `tests/unit/codeowners.test.ts`
- `tests/unit/pr-metadata-precheck.test.ts`
- `tests/unit/run-ductus-skill.test.ts`
- `tests/unit/skill-copies.test.ts`
- `tests/unit/test-output.test.ts`
- `tests/unit/vitest-workers.test.ts`
- `tests/unit/m6-reference-b.test.ts`
- `tests/unit/operations-procedures.test.ts`, `tests/property/operations-procedures.property.test.ts`
- `tests/unit/spikes/d122-sealed-record.test.ts`
- `tests/unit/spikes/docx-provenance-policy.test.ts`

**B. Testovi proizvodnog koda bez kopije (21).** Ovo je **pravi nedostatak** u kopiji. Trebaju se prenijeti ili se mora zabilježiti zašto ne.

- Dokazi i predaja: `src/server/evidence/evidence-commit-request.test.ts`, `src/application/evidence/replay-reader.test.ts`, `src/application/ports/evidence-object-key.test.ts`
- Provenijencija i uvoz: `src/domain/provenance/docx/docx-reader.test.ts`, `src/domain/provenance/docx/docx-reader.property.test.ts`, `src/domain/provenance/docx/zip-hardening.test.ts`, `src/domain/provenance/import/manifest-v1.test.ts`, `src/domain/provenance/import/manifest-v1.property.test.ts`
- Privatnost i inventar: `src/domain/privacy/data-class-inventory.test.ts`, `src/domain/privacy/data-flow-inventory.test.ts`, `src/domain/privacy/export-recipient-contract.test.ts`
- Klijent i sinkronizacija: `src/client/api-contract.test.ts`, `src/client/comments-bridge.test.ts`, `src/client/submission-hold.test.ts`
- HTTP sigurnost: `src/server/http/content-security-policy.test.ts`, `src/server/http/security-headers.test.ts`
- Podrška: `src/server/support/problem-report-route.test.ts`, `tests/integration/problem-report-rate-limit.integration.test.ts`, `tests/property/log-redact.property.test.ts`
- Ostalo: `src/domain/institution-config/no-default-institution.test.ts`, `src/domain/rules/package.property.test.ts`

**C. Nastalo nakon kopije (0).**

## 5. Rezultati provjera

Ovo su stanja **check-runova na headu grane** u trenutku provjere, bez lokalnog pokretanja testova. Rezultati arhive, `main` i migracijskih grana zasebno **nisu u ovom zapisniku**, jer nisu dostupni u repou; pokrenuti ih treba zasebno.

| Grana | Check-runovi na headu |
|---|---|
| `Institution_front_web_chrome` `migracija/kopija-ductus-front` | 3 uspjeh, 2 pad, 1 otkazan |
| `Institution_front_web_chrome` `migracija/kopija-ductus-testovi-front` | nema check-runova |
| `Institution_server` `migracija/kopija-ductus-backend` | 7 uspjeh |
| `Institution_server` `migracija/kopija-ductus-testovi-server` | 3 uspjeh, 3 pad |
| `Preloader` `migracija/kopija-ductus-landing` | 1 uspjeh |
| `Preloader` `migracija/nextjs` | 5 uspjeh |
| `Institution_web_mobile` `migracija/nextjs` | 1 uspjeh |
| `Web_other` `migracija/nextjs` | 1 uspjeh |

Stanje `kopija-ductus-front` i `kopija-ductus-testovi-server` je crveno; uzroci nisu istraženi u ovom zapisniku. Plan za fazu 2 zahtijeva zeleni tsc, testove i gradnju, pa je to otvoreno.

## 6. Otvoreno

1. Potvrditi s vlasnikom kategoriju A (namjerno izostavljeno?).
2. Prenijeti kategoriju B u kopiju ili zabilježiti odluku za svaku datoteku.
3. Provjeriti identičnost sadržaja za 454 datoteke preimenovane/premještene (ovaj zapisnik to ne tvrdi).
4. Pokrenuti i zabilježiti rezultate testova za arhivu, `main` i migracijske grane.

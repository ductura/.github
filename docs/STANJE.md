# Ductura: stanje

Stanje: 19. 11. 2026., 01:15 UTC · Vodi orkestrator. Pravila: [PRAVILA.md](PRAVILA.md). Živo stanje rada: Linear i koordinacijski issue (dok se ne otvori novi u `ductura/.github`, to je Ductus#2028).

## Faza

**Faza 2, osposobljavanje na granama, je u tijeku.** Faza 1 (doslovna kopija Ductusa) je gotova. Plan: [plan/PLAN-MIGRACIJE.md](plan/PLAN-MIGRACIJE.md), odjeljak „Pet faza”.

| Repo | Grana migracije | U tijeku |
|---|---|---|
| Institution_server | `migracija/kopija-ductus-backend`, `migracija/kopija-ductus-testovi-server` | prijevod uvoza i padova testova nakon kopije |
| Institution_front_web_chrome | `migracija/kopija-ductus-front` | `packages/app` na Next.js, `src/client` prema `/api/v1` |
| Preloader | `migracija/nextjs` | statična stranica u Next.js |
| Institution_web_mobile | `migracija/nextjs` | prijelaz na Next.js |
| Web_other | `migracija/nextjs` | prijelaz na Next.js |
| Aplication_server, Aplication_front | `main` (zasebna traka) | administracija platforme: prijava admina, institucije |
| Desktop_windows, Desktop_macos | nema | čeka |
| `.github` | `main` | pravila, stanje, odluke, preseljeni dokumenti proizvoda |

Rokovi se ne mijenjaju: kontrolne točke 30. 11. 2026. i 15. 1. 2027., proba 22. 2. 2027.

## Otvoreno

- **TREBA API:** `/api/v1/documents` nije u `@ductura/contracts` 2.8.0. Frontovi Institution_web_mobile i Web_other ga zovu (Ductus#2028 c.6996411481).
- **Koraci uređivanja na serveru:** kopirani replay koraka u Institution_serveru uvozi Tiptap i Ductusov `src/editor`. Mogućnosti (a), (b) i (c) su u Ductus#2028 c.6996421192. Odluka je orkestratorova.
- **Preloader:** prije `main` se zamjenjuju hostovi `.invalid`.
- **Institution_front_web_chrome #58 do #61:** PR-ovi prema `main` iz faze kopije; zatvaraju se, ne spajaju.
- **Uvođenje pravila:** `AGENTS.md` u svakom repou (jedan mali PR po repou), novi koordinacijski issue u `ductura/.github`, lokalni `D:\Ductura\CLAUDE.md`.
- **Arhiva dokumenata Ductusa:** grana `migracija/kopija-ductus-docs` u `ductura/.github` nije spojena.

## Čeka Daniela

- **Ustav i Vizija:** doslovni tekst nije u Ductusu, nego samo na Google Driveu. Za kopiju u `docs/proizvod/` treba ga dati Daniel.
- **Izbor sustava za pilot:** kontrolna točka 20. 12. 2026. (odluka O-1).
- **Pravno mišljenje i FPZG:** stvarni podaci tek nakon pravnog mišljenja i potvrda FPZG-a (vidi [ODLUKE.md](ODLUKE.md)).
- **Aplication_server:** Docker, Kubernetes i CI (DAN-1103-2 do -4) miruju dok ih Daniel ne zada.
- **Objava (faza 5):** samo na Danielovu riječ.

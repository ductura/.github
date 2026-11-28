# Ductura: arhitektura

Stanje: 19. 11. 2026. · Pravila: [PRAVILA.md](PRAVILA.md). Podrobna karta prijenosa iz Ductusa: [plan/KARTA.md](plan/KARTA.md) i [plan/PLAN-MIGRACIJE.md](plan/PLAN-MIGRACIJE.md) §1.

## Repoi

Svi repoi su u organizaciji `ductura` i svi su javni.

| Repo | Što posjeduje | Tehnologija | Objava |
|---|---|---|---|
| `Institution_server` | API `/api/v1` za sva sučelja ustanove, prijava AAI@EduHr, ovlasti, baze, migracije i pgTAP, dokazi i potpis, pozadinski poslovi, ugovor API-ja | TypeScript, Node.js 24, PostgreSQL | Render |
| `Institution_front_web_chrome` | Sučelje za Chrome na računalu: editor, dnevnik, sinkronizacija, ekrani studenta, nastavnika i administratora ustanove | Next.js | Vercel |
| `Institution_web_mobile` | Sučelje za mobitel i tablet | Next.js | Vercel |
| `Web_other` | Sučelje za ostale preglednike na računalu | Next.js | Vercel |
| `Preloader` | Prvi ekran na ductura.org: provjera servera, odabir sučelja, ponuda desktop paketa, info i pravni tekstovi | Next.js | Vercel, projekt `preloader` |
| `Aplication_server` | Administracija platforme: otvaranje institucija, broj i vrste računa | Next.js na Node.js, JavaScript, SQLite | Render |
| `Aplication_front` | Sučelje administracije platforme | Next.js na Node.js, JavaScript | Vercel |
| `Desktop_windows`, `Desktop_macos` | Tanka izvorna ljuska oko istog web paketa, instalacijski paket i potpis | po odluci o ljusci | stranica za preuzimanje |
| `.github` | Pravila, stanje, odluke, plan, dokumenti proizvoda; zajednički workflowi i preseti | Markdown, YAML, Node.js | nema |

Ductus (`danielrisavi77-create/Ductus`) je arhiva. Ne prima nove promjene.

## Tko s kim razgovara

```
preglednik ──► Preloader (ductura.org) ──► odabrano sučelje na istoj domeni
                                              │
Institution_front_web_chrome ─┐               │
Institution_web_mobile ───────┼── /api/v1 ──► Institution_server ──► PostgreSQL
Web_other ────────────────────┘                   │        └──────► AAI@EduHr (OIDC)
Desktop_* (isti web paket) ───────────────────────┘
                                                   ▲
Aplication_front ──► Aplication_server ──(/internal/v1/institutions)──┘
                         └──► SQLite
```

- **Jedini put do podataka ustanove je Institution_server, `/api/v1`.** Front nikad ne čita bazu. Front zove `/api/v1` izravno ili kroz vlastiti poslužiteljski dio (BFF). Sesija je kolačić servera.
- **Ugovor:** `server/contracts/` u Institution_serveru je izvor OpenAPI dokumenta `openapi/v1.json`, klijenta, testnih vektora i lažnog servera. Frontovi ga koriste kao paket `@ductura/contracts`. Ruta koje u ugovoru nema javlja se kao `TREBA API`.
- **Klijenti međusobno ne razgovaraju.** Preloader samo preusmjerava korisnika na pravo sučelje.
- **Pisanje u evidenciju, predaju i revizijski trag** ide samo kroz RPC na serveru.
- **Desktop** učitava isti web paket. Editor se nikad ne piše iznova.
- **Administracija platforme** je zaseban sloj iznad `Institution_*` repoa i ne zamjenjuje Institution_server. Administrator platforme otvara instituciju: naziv fakulteta s popisa Sveučilišta u Zagrebu, broj računa za studente, nastavnike i mrežne inženjere te točno jedan račun administratora ustanove. Aplication_server zatim otvara instancu u Institution_serveru preko `/internal/v1/institutions`.
- **Prijava:** računi ustanove (student, nastavnik, administrator ustanove, mrežni inženjer) prijavljuju se samo kroz AAI@EduHr (D-09, D-16). Administrator platforme prijavljuje se korisničkim imenom i lozinkom u Aplication_serveru; lozinka se sprema samo kao Argon2id hash, a token je JWT (Daniel, 18. 11. 2026., [Ductus#2012 c.6992524641](https://github.com/danielrisavi77-create/Ductus/issues/2012#issuecomment-6992524641)).

## Zajednički paketi

| Paket | Živi u | Koriste |
|---|---|---|
| `@ductura/contracts` | Institution_server | svi frontovi i desktop |
| `@ductura/test-fakes` (lažni OIDC, lažni server iz ugovora i ostale zamjene) | Institution_server | server i frontovi u testovima |
| `@ductura/editor-core` | Institution_front_web_chrome | web sučelja i desktop |
| `@ductura/tsconfig`, `eslint-config`, `prettier-config` | `.github` | TypeScript repoi |

Paketi se objavljuju na GitHub Packages.

## Objava

- **Domena:** ductura.org (DNS na Cloudflareu).
- **Vercel:** frontovi. Projekt `preloader` već objavljuje svaki push na `main` Preloadera na ductura.org ([Ductus#2012 c.6991711540](https://github.com/danielrisavi77-create/Ductus/issues/2012#issuecomment-6991711540)). Zato Preloader ide na `main` zadnji.
- **Render:** serveri, iz Docker slike.
- Grane `migracija/deploy-render-vercel` postoje, ali ništa osim Preloadera nije objavljeno.
- Objava je samo na Danielovu riječ ([PRAVILA.md](PRAVILA.md) §9).

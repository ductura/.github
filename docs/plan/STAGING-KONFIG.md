# Staging: konfiguracija (nacrt)

> **NACRT. Ovdje nema tajni ni stvarnih vrijednosti.** Sve vrijednosti su rezervirana mjesta u obliku `<…>`. Račune i tajne otvara i upisuje Daniel (D3). Ovaj dokument ne stvara račune i ne pokreće deploy.

Zadatak: P-STAGING (`PLAN-MIGRACIJE.md`, „Faze nakon V2”). Proba je 22. 2. 2027.

## Odluke na kojima se temelji

| # | Odluka | Što znači za staging |
|---|---|---|
| D1 | Jedna domena `ductura.org` s podputanjama (`/`, `/c/`, `/api/v1/`), §1c | Staging je također **jedno podrijetlo** s istim podputanjama. Jedan kolačić sesije, bez CORS-a. |
| D2 | Render + Vercel preview, samo izmišljeni podaci, zasebna baza | Server i baze na Renderu, frontovi na Vercelu. Baze staginga su zasebne, nikad produkcijske. |
| D3 | Račune i tajne otvara Daniel | Orkestrator piše samo imena varijabli i rezervirana mjesta. |

## Adrese

| Putanja | Usluga | Hosting | Rezervirano mjesto |
|---|---|---|---|
| `/` | Preloader | Vercel | `<STAGING_ORIGIN>/` |
| `/c/` | Institution_front_web_chrome (`packages/app`) | Vercel | `<STAGING_ORIGIN>/c/` |
| `/api/v1/` | Institution_server | Render (Docker, Frankfurt) | `<STAGING_ORIGIN>/api/v1/` |
| zasebno | Aplication_server (ustanove, administratori platforme) | **[ODLUKA Daniel]**: D2 ga ne imenuje | `<APLICATION_SERVER_URL>` |

`<STAGING_ORIGIN>` je npr. `https://staging.ductura.org`. Poddomenu ili drugu adresu bira Daniel **[ODLUKA Daniel]**.

Rub (obrnuti proxy) spaja putanje na jedno podrijetlo. Po §1c njegova konfiguracija živi u Preloaderu. Hostovi su danas `.invalid` (zadatak F4-PRE-HOST). Za staging rub vodi `/api/v1/*` na `<RENDER_SERVICE_URL>`.

**Vercel preview i prijava:** svaki preview ima svoju `*.vercel.app` adresu. AAI@EduHr prima samo unaprijed registrirane adrese povratka. Zato preview služi za pregled sučelja. Prijava radi samo na fiksnom `<STAGING_ORIGIN>`.

## Institution_server (Render)

Izvor: `render.yaml` i `docs/DEPLOY.md` u `ductura/Institution_server`. Sve varijable su `sync: false`: vrijednosti se upisuju ručno u Renderu.

| Varijabla | Staging vrijednost (rezervirano mjesto) | Napomena |
|---|---|---|
| `APP_ORIGIN` | `<STAGING_ORIGIN>` | samo podrijetlo, bez putanje |
| `APP_DATABASE_URL` | `postgres://<app_uloga>:<TAJNA>@<staging-db-host>/ductus` | uloga web procesa, ne vlasnik baze |
| `AUTH_DATABASE_URL` | `postgres://<auth_uloga>:<TAJNA>@<staging-db-host>/ductus` | uloga za prijavu |
| `LOGS_DATABASE_URL` | `postgres://<logs_uloga>:<TAJNA>@<staging-logs-db-host>/ductus_logs` | |
| `LEGAL_DATABASE_URL` | `postgres://<legal_uloga>:<TAJNA>@<staging-db-host>/ductus_legal` | baza se stvara ručno u instanci glavne baze |
| `TRUSTED_PROXIES` | `<adrese i CIDR rasponi ruba>` | bez toga se `X-Forwarded-For` ne čita |
| `DUCTUS_AUTH_PROVIDER` | `aai-eduhr` | lažni pružatelj se odbija (D-09) |
| `OIDC_ISSUER` | `<issuer AAI@EduHr testne registracije>` | **[ODLUKA Daniel]**: testna registracija kod Srca (AAI Lab) |
| `OIDC_CLIENT_ID` | `<client id>` | |
| `OIDC_CLIENT_SECRET` | `<TAJNA>` | upisuje Daniel |
| `OIDC_REDIRECT_URI` | `<STAGING_ORIGIN>/api/v1/auth/callback` | |
| `OIDC_POST_LOGOUT_REDIRECT_URI` | `<STAGING_ORIGIN>/` | isto podrijetlo kao povratak |
| `DUCTURA_PROVISIONING_TOKEN` | `<TAJNA, najmanje 32 znaka>` | ista vrijednost kao na Aplication_serveru |
| `EVIDENCE_STORAGE_DOMAINS` | `<JSON domena pohrane>` | imenuje varijable `EVIDENCE_S3_*` |
| `EVIDENCE_S3_<IME>_ACCESS_KEY_ID` | `<TAJNA>` | ime zadaje `EVIDENCE_STORAGE_DOMAINS` |
| `EVIDENCE_S3_<IME>_SECRET_ACCESS_KEY` | `<TAJNA>` | zaseban bucket za staging |

Ne postavljati na stagingu: `NODE_ENV`, `DUCTURA_MODE`, `DUCTUS_DEV_SIGNING_KEY_FILE`. Test `infra/web/render-blueprint.test.ts` to već brani.

Baze (Render, Frankfurt, PostgreSQL 17): `<staging>-institution-db` (`ductus`, uz ručno stvorenu `ductus_legal`) i `<staging>-institution-logs-db` (`ductus_logs`). Uloge i migracije po `docs/DEPLOY.md`, „Što Daniel radi ručno”.

Poznato ograničenje: potpis dokaza rada izvan razvoja još ne radi (`POST /api/v1/evidence/commit` daje 503 `signing`, D-71). To treba riješiti prije probe A01–A10 na stagingu. Ovaj dokument to ne rješava.

## Institution_front_web_chrome (Vercel)

Izvor: `.env.example` i `packages/app/vercel.json`. Korijen projekta na Vercelu je `packages/app`.

| Varijabla | Staging vrijednost | Napomena |
|---|---|---|
| `INSTITUTION_SERVER_URL` | `<RENDER_SERVICE_URL>` | kamo Next prosljeđuje `/api/v1/*` (WEB-02) |

Osnovna putanja `/c/` dolazi iz gradnje, ne iz varijable. **[provjeriti]** kad rub bude spojen.

## Preloader (Vercel)

Statična stranica i rub. Tajni nema. Hostovi u konfiguraciji ruba: `<STAGING_ORIGIN>`, `<RENDER_SERVICE_URL>`, `<WEB_CHROME_VERCEL_URL>` (zadatak F4-PRE-HOST).

## Aplication_server

Izvor: `.env.example` u `ductura/Aplication_server`.

| Varijabla | Staging vrijednost | Napomena |
|---|---|---|
| `DATABASE_URL` | `postgres://<uloga>:<TAJNA>@<staging-app-db-host>/ductura` | zasebna staging baza |
| `INSTITUTION_SERVER_URL` | `<RENDER_SERVICE_URL>` | za `POST /internal/v1/institutions` |
| `DUCTURA_PROVISIONING_TOKEN` | `<TAJNA, najmanje 32 znaka>` | ista kao na Institution_serveru |
| `DUCTURA_ADMIN_TOKEN_SECRET` | `<TAJNA, najmanje 32 znaka>` | HMAC kolačića administratora; promjena gasi sve sesije |

## AI pomoćnik

Na stagingu ostaje isključen (`ai_disabled`). Pružatelja bira Daniel (Q-10 / D6, rok 15. 12. 2026.). Do tada nema varijabli za pružatelja.

## Podaci

- Samo izmišljeni podaci (D2, D7). Nikad kopija produkcije.
- Izmišljene ustanove i korisnici: `config/faculties/demo-fakultet*.json` i `db/main/local/seed.sql` kao predložak. Prijava ide kroz AAI testne račune, pa izmišljene osobe trebaju testne račune Srca **[ODLUKA Daniel]**.

## Što radi Daniel (D3)

1. Otvara račune: Render, Vercel, pružatelj S3, testna registracija AAI@EduHr.
2. Bira `<STAGING_ORIGIN>` i postavlja DNS.
3. Stvara baze, uloge i lozinke. Upisuje sve `<TAJNA>` vrijednosti.
4. Tek tada orkestrator smije tražiti prvi deploy.

## Što ovaj dokument ne radi

- Ne stvara račune, ne upisuje tajne i ne pokreće deploy.
- Ne mijenja `render.yaml`, `vercel.json` ni kod.

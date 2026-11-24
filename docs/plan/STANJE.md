# Ductura — stanje i sljedeća vrata

Generirano iz `_raspored/red.json` i PR-ova (Institution_front_web_chrome, Institution_server) skriptom `_raspored/stanje-plana.mjs`, 24. 11. 2026. 05:31. Ne uređuj ručno; pravila i odluke su u `PLAN-MIGRACIJE.md`, povijest u `PLAN-ARHIVA.md`.

## Brojke

Ukupno 686 zadataka: 664 spojeno, 3 u PR-u, 3 slobodno ili čeka ovisnost, 11 zadržano, 5 radi (pisac bez PR-a). Otvorenih kritičnih: 16 (oznaka **K**).

| Repo | Spojeno | PR otvoren | Radi | Čeka | Zadržano |
|---|---|---|---|---|---|
| Institution_front_web_chrome | 392 | 0 | 1 | 1 | 4 |
| Institution_server | 245 | 3 | 3 | 2 | 6 |
| Preloader | 7 | 0 | 1 | 0 | 1 |
| Institution_web_mobile | 4 | 0 | 0 | 0 | 0 |
| Web_other | 4 | 0 | 0 | 0 | 0 |
| Aplication_server | 4 | 0 | 0 | 0 | 0 |
| Aplication_front | 3 | 0 | 0 | 0 | 0 |
| Desktop_macos | 3 | 0 | 0 | 0 | 0 |
| Desktop_windows | 2 | 0 | 0 | 0 | 0 |

## Sljedeća vrata

1. **Faza 2 zatvorena:** zeleni `ci-ok` na svakoj bazi za migraciju.
2. **Faza 3, tok s kraja na kraj:** A01–A05 na stvarnom stogu (student piše → sinkronizacija → predaja → nastavnik vidi predaju), INT-08 i INT-09. Zatim A06–A10.
3. **Kontrolna točka 30. 11.:** točke 1 i 2 za server i Institution_front_web_chrome; funkcije po prototipu sa spojenim rutama.
4. **Faza 4:** „Spoji n” repo po repo u `main`, Preloader zadnji. Samo na Danielovu riječ.

## PR otvoren

- `F4-SYNC-SRV` **K** — Institution_server #680
- `NF6-SIFRA-PRIJEDLOG` **K** — Institution_server #676
- `SRV-NF6-SIFRA` **K** — Institution_server #676

## Radi (pisac bez PR-a)

- `INT-28` **K** — graditelj
- `INT-29` **K** — graditelj
- `INT-30` **K** — graditelj
- `ZEL-WEB-SISTEM-GLAVE` **K** — graditelj
- `LOK-PREGLED-LAPTOP` — graditelj

## Čeka

- `WEB-NF6-SIFRA` **K**
- `SRV-MENTOR-3C` **K**
- `SRV-NF6-SIFRA-2` **K**

## Zadržano (orkestrator)

- `F4-PREGLED-SRV` **K** — orkestrator 24. 11.: prvo potvrditi da oblak pise u privatni ductura/sigurnosni-nalazi
- `F4-PR-SRV` **K** — F4
- `F4-PR-WEB` **K** — F4
- `F4-PRE-HOST` **K** — F4
- `P-STAGING` **K** — Daniel 23. 11. 2026.: „Staging sam već napravio” (Render i Vercel, tajne); orkestrator provjerava stage; svaki deploy samo na Danielovu riječ
- `P-OPORAVAK` **K** — P
- `WEB-2113` — izvan-hosta
- `F5-LICENCE` — F4
- `STG-AAI` — Daniel 23. 11. 2026. poslao zahtjev Srcu za testni AAI@EduHr OIDC klijent; čeka odgovor Srca (OIDC_ISSUER/CLIENT_ID/SECRET), Daniel ih upisuje u Render
- `NF5-Q4-RITAM-PREGLED` — zadrzano-daniel: čeka odluku C13/C14 (nalog 24. 11. 2026.), ne graditi
- `A1-AUTOTIPKAC-ZASTAVICA` — zadrzano-daniel: čeka odluku C13/C14 (nalog 24. 11. 2026.), ne graditi

## Odluke koje čekaju Daniela

| Odluka | Rok |
|---|---|
| Q-10 / D-194: AI pružatelj (bira samo Daniel) | 15. 12. 2026. |
| Tekst P-1 (nacrt `docs/plan/P-1-NACRT.md`) | prije vala 9/11 dorade |
| Nacrti N-14 i N-15 | prije tih ekrana |
| Opseg nakon probe: Institution_web_mobile, Web_other, desktop | nakon probe 22. 2. 2027. |

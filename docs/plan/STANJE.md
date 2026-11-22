# Ductura — stanje i sljedeća vrata

Generirano iz `_raspored/red.json` skriptom `_raspored/stanje-plana.mjs`, 22. 11. 2026.. Ne uređuj ručno; pravila i odluke su u `PLAN-MIGRACIJE.md`, povijest u `PLAN-ARHIVA.md`.

## Brojke

Ukupno 526 zadataka: 498 spojeno, 16 u PR-u, 10 slobodno ili čeka ovisnost, 2 zadržano.

| Repo | Spojeno | PR | Slobodno / čeka | Zadržano |
|---|---|---|---|---|
| Institution_front_web_chrome | 269 | 13 | 10 | 1 |
| Institution_server | 202 | 3 | 0 | 1 |
| Preloader | 7 | 0 | 0 | 0 |
| Institution_web_mobile | 4 | 0 | 0 | 0 |
| Web_other | 4 | 0 | 0 | 0 |
| Aplication_server | 4 | 0 | 0 | 0 |
| Aplication_front | 3 | 0 | 0 | 0 |
| Desktop_macos | 3 | 0 | 0 | 0 |
| Desktop_windows | 2 | 0 | 0 | 0 |

## Sljedeća vrata

1. **Faza 2 zatvorena:** zeleni `ci-ok` na svakoj bazi za migraciju.
2. **Faza 3, tok s kraja na kraj:** A01–A05 na stvarnom stogu (student piše → sinkronizacija → predaja → nastavnik vidi predaju), INT-08 i INT-09. Zatim A06–A10.
3. **Kontrolna točka 30. 11.:** točke 1 i 2 za server i Institution_front_web_chrome; funkcije po prototipu sa spojenim rutama.
4. **Faza 4:** „Spoji n” repo po repo u `main`, Preloader zadnji. Samo na Danielovu riječ.

## Zadržano (orkestrator)

- `WEB-2113` — izvan-hosta

## Odluke koje čekaju Daniela

| Odluka | Rok |
|---|---|
| Q-10 / D-194: AI pružatelj (bira samo Daniel) | 15. 12. 2026. |
| Tekst P-1 (nacrt `docs/plan/P-1-NACRT.md`) | prije vala 9/11 dorade |
| Nacrti N-14 i N-15 | prije tih ekrana |
| Opseg nakon probe: Institution_web_mobile, Web_other, desktop | nakon probe 22. 2. 2027. |

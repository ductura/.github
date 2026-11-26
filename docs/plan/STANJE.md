# Ductura — stanje i sljedeća vrata

Generirano 25. 11. 2026. (oko 20:35 UTC) iz GitHub REST-a (otvoreni PR-ovi i glave baza), DAN-1528. Ne uređuj ručno; pravila i odluke su u `PLAN-MIGRACIJE.md`, povijest u `PLAN-ARHIVA.md`.

**Ograničenje ovog izdanja:** brojke zadataka po statusu (spojeno, radi, čeka, zadržano) dolaze iz `_raspored/red.json` skriptom `_raspored/stanje-plana.mjs`, a ni jedno ni drugo nije dostupno oblaku. Zato ovdje nema tih brojki ni popisa „Radi / Čeka / Zadržano”; zadnje poznate vrijednosti (24. 11. 05:31: 686 zadataka, 664 spojeno, 3 u PR-u, 5 u radu, 11 zadržano) ne prepisuju se kao trenutačne. Orkestrator ih dopunjuje iz reda.

## Izvori (SHA-ovi 25. 11. 2026.)

| Izvor | Grana | SHA |
|---|---|---|
| ductura/.github | `main` | `97c31e9178438ef0d7e663a609cea1b459a3e3aa` |
| ductura/Institution_server | `main` | `879a81e97b6743b807e3cbe37495572742d4e71c` |
| ductura/Institution_server | `migracija/kopija-ductus-backend` | `4709413102c6d2006efaa74edae97467445d6e71` |
| ductura/Institution_front_web_chrome | `main` | `a59455ab5e3c25b07629592cea43886127daf9eb` |
| ductura/Institution_front_web_chrome | `migracija/kopija-ductus-front` | `ce922d458fab3206ff1787d65e0d58680343a373` |

## Otvoreni PR-ovi po repozitoriju

Tablica navodi sve repozitorije organizacije (osim `.github`); `scripts/drift.test.mjs` iz nje provjerava `drift/expected.json`. Brojke za ovu tablicu osvježene 26. 11. 2026. oko 06:05 UTC iz GitHub REST-a (svi otvoreni PR-ovi, bilo koja baza).

| Repo | Otvoreno | Od toga nacrta |
|---|---|---|
| Institution_server | 9 | 1 |
| Institution_front_web_chrome | 10 | 5 |
| Aplication_server | 2 | 0 |
| Aplication_front | 4 | 1 |
| Institution_web_mobile | 1 | 0 |
| Web_other | 1 | 0 |
| Preloader | 2 | 0 |
| Desktop_windows | 6 | 4 |
| Desktop_macos | 1 | 0 |
| Lab | 40 | 37 |

Institution_server (#): #740 SRV-V13-IZVOZ-PPTX, #744 SRV-V15-KORELACIJA, #751 SRV-V15-HTTP, #764 SRV-V18-UPITNIK-ISPUNJAVANJE, #765 SRV-V14-KIND, #766 SRV-V13-EVIDENCE-SLAJD, #767 SRV-V18-KODIRANJE-GRADIVO, #768 SRV-V18-KODIRANJE-SIFRARNIK, #769 SRV-V16-TEMA-PRIJEDLOG, #770 SRV-V18-UPITNIK-IZVOZ. (#511 je nacrt prijedloga prema `main`.)

Institution_front_web_chrome (#): #682 sistem na push, #693 WEB-V16-ETAPE-STUDENT, #697 WEB-V22-STUDOMAT-ULAZ, #742 ED-37, #746 WEB-V13-MODEL-KLIJENT, #747 izvadak ugovora, #748 CI-BRZINA; nacrti: #700 ED-23, #340, #341, #343 (paritet). (#261, #486, #574 su nacrti prijedloga prema drugim granama.)

## Otvoreni PR-ovi u `.github`

- #85 plan: valovi 13–16, 18, 21, 22 odobreni (Daniel 25. 11.)
- #83 alati graditelja za lokalni stog
- #43, #42, #41 preseljenje pravila, proizvoda i odluka iz Ductusa
- #38 DAN-1078-1a, dozvole workflowa
- Nacrti Ustava: #48 (P-1), #49 (P-2), #50 (P-3), #63 (P-4)

## Sljedeća vrata

1. **Faza 2 zatvorena:** zeleni `ci-ok` na svakoj bazi za migraciju.
2. **Faza 3, tok s kraja na kraj:** A01–A05 na stvarnom stogu (student piše → sinkronizacija → predaja → nastavnik vidi predaju), INT-08 i INT-09. Zatim A06–A10.
3. **Kontrolna točka 30. 11.:** točke 1 i 2 za server i Institution_front_web_chrome; funkcije po prototipu sa spojenim rutama.
4. **Faza 4:** „Spoji n” repo po repo u `main`, Preloader zadnji. Samo na Danielovu riječ.

## Odluke koje čekaju Daniela

Potpun popis je u `PLAN.md`, odjeljak 8. Najbliži rokovi:

| Odluka | Rok |
|---|---|
| C17: pravna osoba | odmah |
| Q-21 / C8 / C20: pitanje Srcu i razgovor | 30. 11. 2026. |
| Q-10 / D-194: AI pružatelj (bira samo Daniel) | 15. 12. 2026. |
| C16: budžet za pravno mišljenje i pentest; C23: zamjenik za hitne slučajeve | 15. 12. 2026. |
| Potvrda teksta dopuna Ustava P-1–P-4 (#48, #49, #50, #63) | P-1 prije PRODUCT pravila 4 (C13) |
| NF-6: rok čuvanja ključa pečaćene poruke | prije pilota |
| Opseg nakon probe: Institution_web_mobile, Web_other, desktop | nakon probe 22. 2. 2027. |

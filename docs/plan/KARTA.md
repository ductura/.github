Kanonski plan migracije: [PLAN-MIGRACIJE.md](https://github.com/ductura/.github/blob/main/docs/plan/PLAN-MIGRACIJE.md). Ovaj dokument je dio tog plana.

# Karta: što ide u koji repozitorij

Stanje: 14. 11. 2026. · **Samo plan.** Svaka stavka plana cijele aplikacije i plana prvog vala ima **jedan** repozitorij ili paket.
Uključene vlasnikove odluke 14. 11.:
- **O** (Ductus#87 c.6880835493, dopuna c.6880861260): O-1 pilot na jednom sustavu, izbor 20. 12. 2026.; O-2 VS-1 s potpisom u istom odgovoru samo nad sintetičkim podacima, VS-1b bezuvjetan; O-3 uski rez servera iza S-0.19. Vidi PLAN-MIGRACIJE §4a-1, §4c, §4d i §8a.
- **A** („Prihvaćam tvoje ova tri prijedloga”): A1 jedan web repo `ductura/web`, A2 prijenos s testovima, A3 ugovor API-ja prvi.
- **B** (#87 c.6870353871, „Ok, može sve, sviđa mi se”): B1 ugovor kao izvor koda, B2 `ductura/.github`, B3 modularni monolit, B4 zajednički paket lažnih zamjena, B5 katalog komponenti, B6 gate prema riziku zadnji.

**Repozitoriji (5 + 1 pomoćni):** `server`, `preloader`, `web`, `desktop-windows`, `desktop-macos`, pomoćni `.github`. `web-mobile` i `web-other` arhiviraju se nakon vlasnikove potvrde plana. Izvan Ductura: **Ductus** (zadaci koji ostaju u starom repou).

**Paketi:**

| Paket | Živi u | Objava | Koriste |
|---|---|---|---|
| `@ductura/contracts` (generiran iz shema, B1: tipovi, klijent, vektori, katalog grešaka, OpenAPI, `server/domain` formati) | server `packages/contracts` | GitHub Packages (B1) | preloader, web, desktop (C#/Swift klijent iz istog OpenAPI-ja) |
| `@ductura/test-fakes` (B4: lažni AAI OIDC, FIDO2, PGlite tvornica, lažna baza zapisa, lažne usluge, sat, lažni server iz ugovora) | server `packages/test-fakes` | GitHub Packages | server, preloader, web, desktop |
| `@ductura/ui` (oznake D-188, komponente, lokale) | web `packages/ui` | GitHub Packages | preloader, web |
| `@ductura/editor-core` | Ductus (E-0.1, E-0.2), zatim web `packages/editor-core` (E-0.3) | GitHub Packages | web, desktop (ovisno o odluci 8) |
| `@ductura/parity` (scenariji S-1H.8/1..6) | web `packages/parity` | GitHub Packages | web, desktop |
| `@ductura/tsconfig`, `eslint-config`, `prettier-config` | `.github` `packages/` | GitHub Packages | svi TS repoi |

Koraci U1–U11 su nazivi iz [plan servera](https://github.com/ductura/server/blob/main/docs/PLAN.md) §5 (PRIJEDLOG; ID dodjeljuje orkestrator). Koraci 2.c1–2.c9 nemaju ID (PRIJEDLOG; ID u fazi 0.3).

## 1. Plan servera i weba: koraci

| Stavka plana | ID-evi | Repo | Paket | Paritet / napomena |
|---|---|---|---|---|
| 0.1 zapis odluka | S-0.1 | Ductus | — | |
| 0.2 mapa modula | S-0.12 | server | — | uz B3 granice |
| 0.3 tiketi | — | orkestrator (Linear) | — | ID-eve za U*, 2.c* dodjeljuje ovdje |
| 1A.0 pravila koda | S-0.5, S-0.7, S-0.8 | server | preseti iz `.github` | |
| 1A mape po područjima | S-1A-a, S-1A-b | server | — | B3: pet pravila granica u CI-ju |
| 1B jedan `server.js` | S-1B-a, S-1B-b, S-1B-c | server | — | |
| 1F baze | S-1F-a … S-1F-e | server | S-1F-e puni `test-fakes` | |
| 1J vrste računa | S-1J.1-a, S-1J.1-b, S-1J-c, S-1J-d, S-1J.2, S-1J.4 | server | — | |
| 3a postavke po razinama | S-1J-e, S-1J-f, S-1J-g | server (API); ekrani u web (2.c4) | contracts | |
| 1L lokale | S-1L.1, S-1L.2, S-1L.3, S-1L.4, S-1L.5 | server | — | lokale sučelja u web `packages/ui` |
| 1K.1–1K.3 zapisi | S-1K.1, S-1K.2-a, S-1K.2-b, S-1K.3-a, S-1K.3-b | server | lažna baza zapisa u `test-fakes` | |
| 1C promet i IP | S-1C.1 … S-1C.6 | server | — | |
| 1D sesije | S-1D-a … S-1D-d | server | — | |
| 1E vanjski servisi | S-1E-a … S-1E-g | server | lažni OIDC i FIDO2 u `test-fakes` | |
| 1K.4–1K.6 metrika, pregledi, izvoz | S-1K.4-a, S-1K.4-b, S-1K.5-a, S-1K.5-b, S-1K.6 | server (API); pregledi u web | contracts | |
| 1K.7–1K.9 | S-1K.7-a, S-1K.7-b, S-1K.7-c, S-1K.8, S-1K.9 | server | — | |
| 1M stanje, kontekst, katalog grešaka | S-1M-a, S-1M-b, S-1M-c | server | contracts | ulaz za P-0.4, P-0.5, P-0.8 |
| 1N i 3d pravni dio | S-1N-a … S-1N-d | server (API, baza); prikaz u preloader (P-0.6, P-0.9) i web | contracts | |
| 3b brisanje radova | S-3B-a … S-3B-e | server; ekrani u web | contracts | S-3B-e i izvršni dio S-3B-b/d čekaju D-30, Q-16 |
| uski rez za VS-1 (O-3) | ID-eve dodjeljuje orkestrator | server | — | sesija, `open`, `commit`, `replay`; zasebni `critical` PR-ovi redom iza S-0.19, usporedno s valovima 1–5; nije izdanje (migracija §4c) |
| val 6 prijenos područja | S-M-1, S-M-2a, S-M-2b, S-M-3, S-M-4, S-M-5, S-M-6, S-M-7, S-M-8, S-M-10 | server | — | A2: s testovima; S-M-9 namjerno izostavljen u zadacima |
| 1G backup | S-1G-a … S-1G-f | server | — | |
| 1H ugovori (ranije dio) | S-1H.1-a, S-1H.1-b, S-1H.1-c, S-1H.4 (= U4–U7) | server | contracts | **A3/B1: pomaknuto odmah nakon kostura** |
| 1H ugovori (kasniji dio) | S-1H.2, S-1H.3, S-1H.5, S-1H.6, S-1H.7, S-1H.8 | server | contracts, test-fakes | S-1H.8 = kostur pariteta |
| lažni server iz ugovora | U8 | server | test-fakes | nov (A3) |
| zajednički paket lažnih zamjena | U9 | server | test-fakes | nov (B4) |
| objava paketa | T-0.5 (= U10) | server | contracts, test-fakes | GitHub Packages (B1) |
| 1I završni CI | S-1I | server | — | |
| val 0 temelj repoa | S-0.4, S-0.6, S-0.9, S-0.10-a, S-0.10-b, S-0.11, S-0.13, S-0.14, S-0.15, S-0.16, S-0.17, S-0.18, S-0.19, S-0.20 | server | S-0.16 → test-fakes; S-0.10-a/b skripte u `.github` | |
| val 0 u Ductusu | S-0.2, S-0.3, S-0.21 | Ductus | — | S-0.2 ulaz u U4; S-0.3 odlučuje PGlite u test-fakes |
| 2.0 i 3c preloader | P-0.1 … P-0.11 | preloader | contracts, test-fakes, ui | A3: ovise o shemi, ne o serveru (osim P-0.10) |
| 2.1 i 3e info stranica | P-0.9 | preloader | ui | |
| 2.c1 popis i katalog komponenti | — | web | ui | B5: vizualni testovi od prvog zadatka |
| 2.c2 testovi komponenti | — | web | ui | |
| 2.c3 tipizirani klijent | — | web | contracts | ← U10 |
| 2.c4 komponente po području | — | web | contracts, ui, editor-core | ← 2.c3, shema rute, vektori U7 i U8, oznake iz 2.c1 (§1b migracije) |
| 2.c5 `src/platform` | — | web | — | uključuje bivše 2.c7 i 2.c8 (A1) |
| 2.c6 e2e | — | web | parity, test-fakes | matrica: Chromium/Chrome, Firefox, WebKit, Edge, mobilna emulacija; Opera ručno |
| 2.c7 mobilni web | — | web | — | A1: spojeno u 2.c5/2.c6 |
| 2.c8 ostali preglednici | — | web | — | A1: spojeno u 2.c5/2.c6 |
| 2.c9 stranica za preuzimanje | P-0.9 | preloader | contracts | vidi §4 |
| faza 3 desktop | D-0.1, „Faza E · aktivacija desktop razvoja” | Ductus (D-0.1), desktop-windows, desktop-macos | contracts (C#/Swift klijent) | kasnije |
| gate prema riziku uz ugovorne testove | U11 | `.github` | — | B6: zadnje; zaseban PR pravila, vlasnik potvrđuje |

## 2. Plan migracije: novi zadaci (§10b)

| ID | Repo | Napomena |
|---|---|---|
| T-0.1, T-0.2, T-0.3, T-0.4, T-0.7 | `.github` | B2: T-0.1, T-0.2, T-0.4 odmah nakon kostura (U2); preseti nov zadatak |
| T-0.5 | server | = U10 |
| T-0.6 | Ductus | skripte orkestratora za više repoa (popis: 5 + `.github` + Ductus) |
| P-0.1 … P-0.11 | preloader | |
| D-0.1 | Ductus (`spikes/`) | nakon faze B |
| E-0.1, E-0.2 | Ductus | editor-core nastaje u Ductusu |
| E-0.3 | web | |
| VS-1 | preloader + web + server | jedini zadatak preko tri repoa; nositelj PRIJEDLOG web. O-2: samo sintetički podaci, protokol 1 (potpis u istom odgovoru), uključuje VS-1.13; ovisi o uskom rezu (O-3) |
| VS-1b | server + web | O-2: `202 pending_signature`, worker, red poslova, oporavak; bezuvjetan; uvjet za osnovicu 20. 12. 2026. i za stvarne podatke (D-71); ovisi o VS-1 |
| VS-2 | web | A1: mobilni prikaz u istom repou |
| M-0.1 | Ductus | mjere |

## 3. Vlasničke radnje

| ID | Što (sažeto) | Repo |
|---|---|---|
| V-0 | domena `ductura.org` (odlučeno 17. 11., Ductus#2012 c.6934113245) i adresa e-pošte (otvoreno); konačan prije zahtjeva Srcu (R-4) | sve (preloader proxy) |
| V-1 | organizacija `Ductura` i repo `server` (gotovo 14. 11.) | server; B2 dodaje `.github` |
| V-1b | aktivacija repoa po fazama (migracija) | preloader i web (odobreno 14. 11., ne čeka fazu C); desktop je zasebna radnja „Faza E · aktivacija desktop razvoja”; arhiviranje `web-mobile`, `web-other` nakon potvrde |
| V-2 | zaštita grane, `ci-ok`, statusi gatea | svaki repo |
| V-3 | aplikacija botova i Mergify | svaki repo |
| V-4 | tajne i CI runneri | server |
| V-5 | zahtjev Srcu (registracija, ne-preglednički klijent); tek nakon konačnog V-0 (R-4) | server (S-1E-b, S-1E-e) |
| V-6 | backup u produkciji | server (nakon S-1G-e) |
| V-7 | račun admina aplikacije izvan aplikacije | server (nakon S-1J.1-b) |

## 4. Plan prvog vala (13. 11.)

| Stavka | Repo | Napomena |
|---|---|---|
| §1 koraci 1–3 (domena, preusmjeravanje, dijelovi) | preloader (proxy), V-0 | domena `ductura.org` (17. 11.) |
| §2 sedam dijelova u jednom `main` | zamijenjeno: 5 repoa + `.github` | shared-core → paketi u serveru i webu |
| §2 shared-core | `@ductura/contracts`, `@ductura/test-fakes`, `@ductura/ui`, `@ductura/editor-core`, `@ductura/parity` | |
| §3 redak Win Chrome | preloader | A1: web, prikaz računalo, gumb Windows |
| §3 redak Mac Chrome | preloader | web, računalo, macOS |
| §3 redak Win Edge/Firefox/Opera | preloader | web, računalo, Windows |
| §3 redak Mac Safari/Firefox | preloader | web, računalo, macOS |
| §3 redak mobitel/tablet | preloader | web, prikaz mobilno, bez paketa |
| §3 redak Linux/nepoznat | preloader | web, računalo, ručni izbor paketa |
| §3 rubni: iPad desktop, uski prozor, nema paketa | preloader | |
| §4 server: vlastiti/tuđi; prazan/neispravan ID | server | S-1H.3, S-1H.1-c |
| §4 Chrome: otvori, spremi, osvježi; zamjena | web | |
| §4 mobitel: tipkovnica, okretanje iPada | web | A1 |
| §4 ostali: učitavanje, navigacija, međuspremnik, dopuštenje | web | A1; Opera ručno |
| §4 Windows: preuzimanje, instalacija, Start; razmaci i hrvatski znakovi | desktop-windows | faza E |
| §4 macOS: preuzimanje, Applications, arhitektura | desktop-macos | faza E |
| §4 shared-core/preloader: matrica | preloader | P-0.2, P-0.11 |
| §5 koraci 1–5 | po stavkama iznad | prihvat vala s instalacijom desktopa: **otvoreno** |

## 5. Stavke koje ne pašu čisto (s preporukom)

1. **Zadaci u Ductusu** (S-0.1, S-0.2, S-0.3, S-0.21, T-0.6, M-0.1, E-0.1, E-0.2, D-0.1): ostaju u Ductusu. Preporuka: Ductus se ne zamrzava dok E-0.2 i S-0.2 nisu gotovi. **O-1:** ni prije izbora sustava za pilot na kontrolnoj točki 20. 12. 2026. (D-295).
2. **CSP** (`src/server/http/content-security-policy.ts`): opisuje stranice, a server ih nema. Preporuka: prijenos s testom u preloader `deploy/edge/`; proxy postavlja CSP za preloader i web.
3. **Stranica za preuzimanje**: zadaci §6 je stavljaju u web (2.c9), migracija P-0.9 u preloader. Preporuka: preloader (javna, prije prijave).
4. **Sinkronizacija u editor-coreu**: migracija §2c traži „osam stanja” u paketu i navodi `src/lib/sync`, a stroj je u `src/domain/sync` i `src/domain/serverSync`, koje §3 šalje kopijom. Preporuka: oba u `@ductura/editor-core` s testovima.
5. **VS-1** je preko tri repoa. Preporuka: nositelj web, PR-ovi po repou povezani jednim issueom; sistemski e2e u preloaderu.
6. **`@ductura/parity`** nedostaje u tablici paketa migracije §2c. Preporuka: dodati (web).
7. **Hosting proxyja** (domena odlučena: `ductura.org`): nijedan izvor ne odlučuje gdje radi proxy i server u produkciji ni trošak. **Otvoreno** (V-0, trošak).
8. **Putanja weba**: nakon A1 nema `/c/`, `/m/`, `/o/`. Preporuka: jedna putanja (npr. `/app/`), uz odluku 1.
9. **GitHub Packages i token**: npm registar GitHub Packagesa traži token i za javne pakete. Preporuka: u CI-ju `GITHUB_TOKEN` s `packages: read` i dodijeljenim pristupom repou; za lokalni rad osobni token. Ako to smeta vanjskim suradnicima, javni npm opseg je besplatna zamjena (nova vlasnička odluka).
10. **Testovi bez Dockera (B4) i pravi PostgreSQL**: ovlasti i RLS traže pravi PostgreSQL. Preporuka: nativni PostgreSQL na runneru (kao Ductus `native-db.mjs`); Docker slika S-1H.7 samo kao izdanje.
11. **Prijava admina aplikacije s FIDO2** (plan 3c) nije u P-0.7 (pitanje 8). Ostaje otvoreno.
12. **Potpis desktop paketa**: Windows certifikat i Apple Developer ID (oko 99 USD godišnje) su trošak izvan onoga što vlasnik plaća. **Otvoreno.**

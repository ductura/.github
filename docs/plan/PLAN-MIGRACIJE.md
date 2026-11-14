# Ductura: plan migracije na sedam repozitorija

Stanje: 14. 11. 2026. · Sastavio orkestrator · **Samo plan.** Ništa nije otvoreno ni izgrađeno: nema organizacije, repozitorija, grana, PR-ova, issuea ni Linear tiketa.

**Tvoja odluka, 14. 11. 2026.:**

> „Želim da krenemo s ovom migracijom i na ovaj način: Ductura će imati sedam zasebnih repozitorija, svaki sa svojom granom main, vlastitim funkcionalnim testovima i testovima pomoćnih funkcija. Preloader je sedmi razvojni dio. Korisnik će na jednoj domeni moći otvoriti odgovarajuće web-sučelje ili preuzeti desktop aplikaciju.”
>
> „Prvo možeš napraviti plan točni što i kako i dati svoje prijedloge s obzirom na stanje repozitorija i plan rada.”

**Što se mijenja:** `shared-core` više nije sedmi repozitorij. Na njegovo mjesto dolazi `preloader`. Sve ostalo što je odlučeno 14. 11. vrijedi i dalje: potvrđeni plan servera i weba, popis zadataka S-0.1 do S-1I, redoslijed „server, pa web od komponenata, pa desktop”.

**Izvori:** plan servera i weba, popis zadataka servera i plan prvog vala (izvorni dokumenti izvan repozitorija) te stanje Ductusa na `origin/main` 14. 11. Planovi po repozitorijima: [KARTA](KARTA.md), [plan `.github`](../PLAN.md) i `docs/PLAN.md` u repozitorijima `server`, `web` i `preloader`.

---

## Ispravci od 14. 11. 2026.

Vlasnik je 14. 11. odobrio sljedeće ispravke (Ductus#87, c.6879745570 i c.6879325032). Gdje se ostatak dokumenta s njima razilazi, vrijede ispravci. Ugrađeni su na mjestima označenima „(ispravak 14. 11.)”.

1. **Registar paketa je GitHub Packages**, ne npm (§2c, §8 točka 9, §9 redak 2).
2. **V-1b je podijeljen:** „web i preloader, odobreno 14. 11.” (ne čeka fazu C) i zasebna radnja „Faza E · aktivacija desktop razvoja” (§4).
3. **Tri odvojena izlaza po ruti** (§1b): shema postoji, ugovorna integracija prolazi, stvarni sistemski tok prolazi. Sama shema ne otključava web 2.c3 i 2.c4.
4. **Kriterij prihvata VS-1** (§4a): sintetički student se prijavi kroz lažni OIDC, spremi rečenicu i nakon osvježavanja je vidi. Ovisi o DAN-758, DAN-759 i DAN-760.
5. **Izdavatelji paketa** (§2c): koji repozitorij objavljuje koji paket `@ductura/*`.
6. **Redoslijed V-2** (§7): prvo dokaz prolaza i očekivanog pada u serveru (S-0.9, S-0.10-b), zatim V-2 dopisuje točna imena statusa, zatim Mergify.
7. **U11** (§7) traži vlasnikovu potvrdu teksta pravila.
8. **Nazivi repozitorija:** `web-chrome` je preimenovan u `web` (u §2d je to već zamijenjeno). `web-mobile` i `web-other` su arhivirani, pa se u ostatku dokumenta tri web repozitorija čitaju kao jedan repozitorij `web`.

---

## 0. Ukratko

- Sedam repozitorija u organizaciji `Ductura`. Svaki ima svoj `main`, svoj CI, svoje testove i isti gate.
- Svi klijenti razgovaraju samo sa serverom, preko njegova HTTP API-ja (`/api/v1`) i ugovora (OpenAPI).
- Preloader je jedini ulaz na domeni. On bira web-sučelje i nudi desktop paket.
- Zajednički kod dijelimo **verzioniranim paketima**, ne osmim repozitorijem. Editor i sinkronizacija imaju **jednu** implementaciju (`@ductura/editor-core`), a server objavljuje klijent API-ja (`@ductura/contracts`).
- Desktop je tanka izvorna ljuska oko istog web paketa. Editor se nikad ne piše iznova.
- Rano gradimo **vertikalni presjek**: prijava, otvaranje rada, spremanje rečenice i osvježavanje, kroz preloader, web-chrome i server.
- Prvo server (val 0 i dalje). Zatim preloader i web-chrome. Zatim web-mobile i web-other. Desktop na kraju.
- Mjerimo od prvih zadataka koliko nas razdvajanje košta (§8, prijedlog 17).
- Ductus ostaje živ dok novi web ne preuzme glavni tok. Onda ga zamrzavamo, a kasnije zaključavamo samo za čitanje.

---

## 1. Ciljna slika

### 1a. Sedam repozitorija

| Repo | Što posjeduje | Što nikad ne smije sadržavati |
|---|---|---|
| `Ductura/server` | API `/api/v1`, prijava AAI@EduHr (D-09), FIDO2 za operatere, ovlasti, sve baze (glavna, zapisi, pravni tekstovi), migracije i pgTAP, radnici u pozadini, zapisi i metrika, backup, manifest i ruta za preuzimanje, testni server, ugovor (OpenAPI i vektori) | Stranice, React, CSS, editor, Dexie. Ništa što ovisi o pregledniku. |
| `Ductura/preloader` | Prvi ekran, provjera servera, prepoznavanje okruženja, odabir sučelja, gumb za paket, stranice grešaka, traka kolačića i pristanak, ulaz u prijavu, javna info stranica (3e), javni pravni tekstovi, stranica za preuzimanje, pravila usmjeravanja na domeni | Pristup bazi. Odluke o ovlastima. Otisak preglednika (fingerprinting). Editor i radni ekrani. |
| `Ductura/web-chrome` | Sučelje za Chrome na računalu: editor, dnevnik, sinkronizacija, ekrani studenta, nastavnika i admina | Serverski kod, rute API-ja, tajne, izravne veze na bazu. Kod za mobitel i ostale preglednike. |
| `Ductura/web-mobile` | Sučelje za mobitele i tablete: dodir, zaslonska tipkovnica, rotacija, uski zaslon | Isto kao web-chrome. |
| `Ductura/web-other` | Firefox, Safari, Edge, Opera i ostali preglednici na računalu. **Prijedlog: tanki repo za kompatibilnost i testove, ili ga nema** (§8, prijedlog 16; odluka 13) | Isto kao web-chrome. Vlastiti editor ili vlastite ekrane. |
| `Ductura/desktop-windows` | Windows aplikacija, instalacijski paket, potpis paketa, prvo pokretanje | Vlastiti server ili baza. Druga prijava osim one preko servera. |
| `Ductura/desktop-macos` | macOS aplikacija, paket, potpis i notarizacija kod Applea | Isto kao Windows. |

### 1b. Kako razgovaraju

- Jedini put do podataka je HTTP API servera. Nijedan klijent ne zna kako izgleda baza.
- Ugovor je OpenAPI datoteka u serveru (S-1H.1-b). Iz nje se automatski stvara klijent za web i desktop.
- Server objavljuje testne vektore (S-1H.4). Svaki klijent ih pokreće u svom CI-ju.
- Klijenti međusobno ne razgovaraju. Preloader samo preusmjerava korisnika na pravo sučelje.
- Pisanje u evidenciju, predaje i revizijski trag ide samo kroz RPC na serveru, kao danas.
- **Tri odvojena izlaza po ruti (ispravak 14. 11.):** (1) shema rute postoji (priprema sučelja), (2) ugovorna integracija prolazi (vektori U7 i U8, objava paketa u U10), (3) stvarni sistemski tok prolazi. Sama shema ne otključava web 2.c3 i 2.c4: 2.c3 čeka objavljeni paket iz servera (U10), a 2.c4 čeka 2.c3, shemu, vektore (U7, U8) i oznake iz 2.c1.

### 1c. Jedna domena: prijedlog usmjeravanja

**Preporuka: jedna adresa i podputanje.** Primjer na `ductura.cfd`:

| Putanja | Tko je poslužuje |
|---|---|
| `/` | preloader (prvi ekran, info stranica, pravni tekstovi, preuzimanje) |
| `/c/` | web-chrome |
| `/m/` | web-mobile |
| `/o/` | web-other |
| `/api/v1/` | server |
| `/preuzimanje/` | paketi, preko manifesta servera (S-1H.5) |

Zašto podputanje, a ne poddomene (`c.ductura.cfd` …):
1. Kolačić sesije ostaje `__Host-` kolačić. On radi samo na jednoj adresi. S poddomenama bismo morali širiti kolačić na cijelu domenu, a to je slabija zaštita.
2. Nema CORS-a. Sučelje i API su na istom porijeklu, pa postojeća zaštita od zahtjeva s drugog porijekla radi bez promjene.
3. Srce dobiva jednu adresu preusmjeravanja za web (V-5).
4. Jedan certifikat i jedna sigurnosna politika sadržaja (CSP).

Cijena: svaki web gradi se s osnovnom putanjom (`/c/` i sl.). Ispred svega stoji jedan obrnuti proxy. Njegovu konfiguraciju predlažem držati u `preloader` repozitoriju, jer je preloader vlasnik ulaza.

Desktop aplikacija ne koristi kolačić. Prijavljuje se tokom u zaglavlju, po ADR-u S-1E-e.

---

## 2. Zajednički kod bez osmog repozitorija

### 2a. Problem

Tri web sučelja i preloader inače bi kopirali isto: klijent API-ja, tipove, lokale, oznake dizajna „papir i grafit” (D-188) i komponente. Kopije se brzo razilaze. Shared-core više nije repozitorij, pa treba drugo rješenje.

### 2b. Usporedba

| Način | Za | Protiv |
|---|---|---|
| **Verzionirani paketi** | Jasna verzija. Svaki repo bira kad nadograđuje. Automatski prijedlog nadogradnje (Dependabot). Radi s gateom i CI-jem. | Treba objava paketa i malo discipline oko verzija. |
| Git submoduli | Nema registra paketa. | Agenti i oblak često ih krivo kloniraju. Promjena traži dva PR-a i ručno pomicanje pokazivača. Teško se reviewa. |
| Kopiranje | Najjednostavnije na početku. | Razilaženje je sigurno. Popravak greške treba ponoviti četiri puta. |

### 2c. Preporuka: verzionirani paketi

| Paket | Objavljuje ga | Sadrži | Koriste ga |
|---|---|---|---|
| `@ductura/contracts` | server | generirani klijent iz OpenAPI-ja, tipovi, katalog kodova grešaka, testni vektori, čisti formati evidencije (JCS, sažeci) iz `server/domain` | preloader, sva tri weba; desktop koristi OpenAPI datoteku |
| `@ductura/ui` | web-chrome | oznake dizajna (D-188), osnovne komponente, hrvatske lokale sučelja | preloader, web-mobile, web-other |
| `@ductura/editor-core` | **najprije Ductus**, zatim web-chrome (`packages/editor-core`) | editor (shema, unos, identitet blokova), dnevnik (Dexie), sinkronizacija s osam stanja, ACK potpisanom potvrdom, odjava i brisanje lokalnih podataka | web-chrome, web-mobile, web-other, desktop (preko web paketa) |

**Izdavatelji paketa (ispravak 14. 11.; prema planovima po repozitorijima):**

| Paket | Izdavatelj (izvor i objava) |
|---|---|
| `@ductura/contracts` | `server` (`packages/contracts`), objava iz Actionsa na oznaku (U10) |
| `@ductura/test-fakes` | `server` (`packages/test-fakes`), objava iz Actionsa na oznaku (U10) |
| `@ductura/ui` | `web` (`packages/ui`, 2.c1) |
| `@ductura/parity` | `web` (`packages/parity`) |
| `@ductura/editor-core` | najprije Ductus (E-0.1, E-0.2 objavljuje 0.x prije VS-1), zatim `web` (`packages/editor-core`, E-0.3) |
| `@ductura/tsconfig`, `@ductura/eslint-config`, `@ductura/prettier-config` | `.github` (`packages/`) |

Zašto ovako:
- Server je vlasnik ugovora, pa i paketa ugovora. To je drugi paket: generirani klijent OpenAPI-ja i tipovi.
- **Editor i sinkronizacija imaju jednu implementaciju.** To je najkritičniji i najbolje testirani kod (B-8, F-3: property, ekvivalencijski i odjavni testovi u `src/editor`, `src/lib/journal`, `src/lib/sync`). Druga ili treća kopija bila bi najveći rizik cijele migracije.
- `server/domain` već po planu ne uvozi ništa (S-0.19), pa se može objaviti bez izmjena.

### 2d. Put paketa `@ductura/editor-core` (prijedlog)

1. **Počinje u Ductusu** (E-0.1, E-0.2). Ondje kod već radi i ima testove. U Ductusu se izdvaja u mapu `packages/editor-core` s jasnom granicom: bez Next.js-a, bez poziva na rute Ductusa, transport sinkronizacije kao ulazni parametar. Isti testovi prolaze prije i poslije.
2. Objavljuje se iz Ductusa kao verzija 0.x. Web-chrome ga koristi od prvog dana, bez kopije.
3. **Seli se u web** (`packages/editor-core`) kad su ispunjena sva četiri uvjeta izlaza:
   - web ima potpun gate (CI, review, QA, Mergify) i prošao je vertikalni presjek (§4);
   - svi testovi paketa (unit, property, ekvivalencijski, odjavni) prolaze u webu s istim brojem i ishodom kao u Ductusu;
   - zadnja objava iz Ductusa i prva iz weba daju istu izgradnju (isti testni vektori sinkronizacije i evidencije);
   - Ductus je zamrznut ili se ondje paket više ne mijenja.
4. Nakon selidbe Ductusova kopija postaje samo za čitanje, uz bilješku gdje paket sada živi.

**Tok verzija i nadogradnje:**
1. Svaki paket ima semantičku verziju. Promjena koja lomi daje novu glavnu verziju.
2. Verziju podiže PR koji mijenja paket, zapisom promjene (changeset). Spajanje u `main` pokreće objavu.
3. Klijent prikvači točnu verziju. Dependabot otvara PR za nadogradnju. Taj PR prolazi CI klijenta, s vektorima nove verzije.
4. Server drži staru glavnu verziju API-ja živom dok je koristi bilo koji klijent. Stari desktop paketi time ne pucaju (S-1H.4).
5. Lokalna izrada unutar jednog repoa (npr. `@ductura/ui` u web-chromeu) koristi pnpm workspace, bez objave.

**Registar (ispravak 14. 11.): GitHub Packages**, odluka je donesena. Instalacija i javnog paketa traži token: u CI-ju je dovoljan `GITHUB_TOKEN` s `packages: read` uz dodijeljen pristup repozitoriju, a za lokalni rad osobni token s `read:packages`. Javni npm opseg bio je raniji prijedlog.

---

## 3. Što se seli iz Ductusa i kada

Ductus danas: oko 806 `.ts`, 104 `.tsx` i 217 `.mjs` datoteka; 37 ruta u `app/api`; 99 pgTAP datoteka; oko 100 datoteka u `e2e/`; oko 275 datoteka u `src/components`. Novi repozitoriji pišu skripte samo u TypeScriptu, pa se `.mjs` prevodi pri prijenosu.

Pravilo za svaki prijenos: PR navodi izvorni SHA Ductusa, isti testovi prolaze prije i poslije, a logika se u istom PR-u ne mijenja. Povijest gita se ne prenosi, samo sadržaj (otvorena točka 13).

| Repo | Polazište iz Ductusa | Kada |
|---|---|---|
| **server** | Po §9 popisa zadataka: `db/migrations` i ledger (S-0.13), `db/local`, `infra/postgres` (S-0.14), `db/tests` (S-0.15), `infra/fake-oidc` (S-0.16), `src/server/log`, `src/server/db`, `env.ts` (S-0.17), čisti dio `src/server/auth` (S-0.18), dio `src/domain` i `src/adapters` (S-0.19), `src/lib/i18n` za serverske poruke (S-1L.1), zatim logika ostalih ruta (val 6). `src/application` (evidence, jobs, ports, projection) ide uz pripadne rute u valu 6. | Faza A i B |
| **preloader** | `app/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx` (stranice grešaka); `src/components/auth` (ulaz u prijavu); `src/components/landing` i `how-it-works` (info stranica, bez ustanova); `src/lib/status/public-status`; oznake iz `app/globals.css`, `app/fonts`, `src/components/shell/tokens`. Logika odabira sučelja je nova. | Čista logika rano (P-0.2), ostalo u fazi C |
| **web-chrome** | `src/editor`, `src/lib/journal` i `src/lib/sync` dolaze kao paket `@ductura/editor-core` iz Ductusa (§2d), ne kopijom; izvorni kod paketa seli se tek po uvjetima izlaza. Kopijom dolaze `src/client`, `src/components` (bez landinga), stranice `app/rad`, `zadaci`, `zadatak`, `nastavnik`, `ustanova`, `upis`, `stanje`; klijentski dio `src/domain` (document, diff, citation, text, provenance, sync, serverSync, collaboration); UI dio `src/lib/i18n`; `e2e/` za tokove sučelja. Pozivi prema Next.js rutama zamjenjuju se generiranim klijentom iz `@ductura/contracts`. | Faza C |
| **web-mobile** | Ništa izravno. Početak je predložak repoa plus `@ductura/ui` i `@ductura/editor-core`. Iz Ductusa samo e2e koji već provjeravaju uski zaslon. | Faza D |
| **web-other** | Ako ostaje (odluka 13): samo popravci kompatibilnosti i testovi preglednika. Iz Ductusa `.github/workflows/webkit-macos.yml` kao uzor za Safari. | Faza D |
| **desktop-windows / desktop-macos** | Ništa iz koda. Ljuska učitava isti web paket. Polazi od manifesta i simulacije preuzimanja (S-1H.5, S-1H.6) i ADR-a S-1E-e. | Faza E |

**Ostaje samo u Ductusu, kao povijest:** `docs/` (odluke, Ustav, plan, sažeci), `STATE.md`, skripte orkestratora (`scripts/orchestrator`), alati za gate Ductusa dok Ductus živi, `spikes/`, `plugins/`, `.claude/` i `.agents/` Ductusa, `middleware.ts` i Next.js rute API-ja (zamjenjuju ih rute servera), stari vizualni snimci.

**Dvostruke promjene tijekom prijelaza:** nakon prijenosa područja nova promjena ide prvo u novi repo, a Ductus dobiva samo popravke (otvorena točka 14). Nova migracija glavne baze nastaje prvo u serveru i kopira se u Ductus pod istim imenom (otvorena točka 17).

---

## 4. Redoslijed i faze

| Faza | Što | Ulaz | Izlaz | Tvoje radnje |
|---|---|---|---|---|
| **A** priprema, val 0 | Repo servera s CI-jem, gateom, botovima i Mergifyjem; prijenos temelja (S-0.1 … S-0.21) | V-0, V-1 | Jedan pravi PR prošao cijeli gate u `Ductura/server`; ledger migracija jednak Ductusovu; skripte orkestratora vide repo | V-0 domena i e-pošta; V-1 organizacija i repozitoriji; V-2 zaštita grane; V-3 botovi, Mergify i Codex; V-4 tajne |
| **B** server, valovi 1–10 | Sve od S-1A do S-1I | Faza A gotova | Testni server objavljen kao Docker slika; S-1H.8 prolazi; `@ductura/contracts` objavljen u verziji 0.x | V-5 zahtjev Srcu; V-7 račun admina aplikacije |
| **C** preloader i web-chrome | Preloader (2.0), info stranica (2.1), web-chrome od komponenata; izdvajanje standarda (T-0); selidba `editor-core` u web-chrome po uvjetima iz §2d | VS-1 prošao; S-1M, S-1N, S-1H.7 i `@ductura/contracts` dostupni | Prvi cijeli prolaz „domena → preloader → web-chrome → server” na sistemskom stogu; glavni tok u web-chromeu (otvori, piši, spremi, osvježi, bez veze, predaj) | V-1b (web i preloader, odobreno 14. 11., ne čeka fazu C); V-3 u njima; odluka o zamrzavanju Ductusa |
| **D** web-mobile i web-other | Ista funkcija, druga sučelja | `@ductura/ui` i `@ductura/editor-core` u verziji 1.0; skup scenarija pariteta | Paritet zelen u sva tri weba; matrica preloadera zelena; domena prebačena na novi stog | V-1b za ta dva repoa; potvrda prebacivanja produkcije |
| **E** desktop | Tanka ljuska oko istog web paketa za Windows i macOS | Odluka o ljusci i broju repozitorija (odluke 8 i 12); Apple račun; potpis za Windows; odgovor Srca (V-5) | Potpisani paketi; instalacija i pokretanje na čistom Windowsu i Macu; gumbi preloadera vode na prava izdanja | Apple Developer račun; certifikat za Windows; **Faza E · aktivacija desktop razvoja** (zasebna radnja, ne dio V-1b) |

**Napomena o redoslijedu:** tvoje pravilo je „prvo server”. Predlažem dvije iznimke:
1. Čista logika preloadera (P-0.1, P-0.2). Ne treba server, mala je i dobro se testira tablicom. Radi se samo kad je pisac slobodan.
2. **Vertikalni presjek (VS-1, VS-2), prijedlog.**

### 4a. Vertikalni presjek (prijedlog)

Cilj: što ranije dokazati da sedam repozitorija stvarno radi zajedno, prije nego što izgradimo sve valove servera.

- **VS-1:** preloader + web-chrome + server. Korisnik se prijavi (lažni AAI@EduHr), otvori rad, spremi jednu rečenicu, osvježi stranicu i vidi rečenicu.
- **Ulaz VS-1:** od servera samo prijava i spremanje rada, ne svi valovi: S-1E-a (prijava), S-1D-d (kolačić i odjava), S-1M-a (zdravlje s verzijom) i S-M-5 (otvaranje i spremanje evidencije). S-M-5 predlažem povući na početak vala 6. Od Ductusa: `@ductura/editor-core` 0.x (E-0.2).
- **Kriterij prihvata VS-1 (ispravak 14. 11.):** sintetički student se prijavi kroz lažni OIDC, spremi rečenicu i nakon osvježavanja stranice vidi tu rečenicu. Ovisi o DAN-758 (sheme i vektori za otvaranje i spremanje), DAN-759 (minimalni lokalni stog, umjesto S-1H.7) i DAN-760 (kriterij prihvata).
- **Izlaz VS-1:** test „prijava → otvori → spremi → osvježi” prolazi na sistemskom stogu, sa zapisanim SHA svakog repoa. Preloader i web-chrome imaju samo onoliko koda koliko presjek traži.
- **VS-2:** isti rad otvara se na mobitelu (web-mobile ili, ako je odluka 13 tako, web-chrome u mobilnom prikazu). Spremljena rečenica je ondje.
- Ostatak faza B i C nastavlja se nakon presjeka. Ako presjek pokaže da je razdvajanje preskupo, vidi se rano (prijedlog 17).

### 4a-1. Ovisnosti i prihvat VS-1 i VS-2 (Daniel 14. 11.)

Danielov tekst iz analize arhitekture, odobren za umetanje 14. 11. 2026. („Tekst za umetanje može”). Gdje se razlikuje od starijih redaka u §4a, vrijedi ovaj odjeljak.

**Ovisnosti do prvog spremljenog rada.** Za svaku rutu bilježimo tri odvojena prolaza. Nakon prihvaćene sheme klijent može graditi poziv i stanja sučelja. Nakon vektora uspjeha i grešaka te funkcionalnog lažnog servera može provjeriti ugovorno ponašanje. Nakon U10 integrira objavljenu verziju paketa. Sistemski prolaz izvodi se nad stvarnim handlerima, sesijom, trajnom bazom, objektnom pohranom i potpisnikom. DAN-758 određuje pozivatelja, handler i test za svaku rutu VS-1. Rani stog DAN-759 može se pripremati odmah, a njegov završetak čeka te handlere. Puni testni server S-1H.7 ostaje za kasniju provjeru pariteta.

**Prihvat VS-1.** U lokalnom i CI stogu sintetički student ulazi kroz `/`, prijavljuje se preko lokalnog OIDC pružatelja, vraća se u isti web pod `/app/` i otvara vlastiti postojeći rad s objavljenim `editor-coreom` 0.x. Upisuje jedinstvenu rečenicu. Nakon uspješnog lokalnog upisa editor prikazuje „Spremljeno na uređaju”. Nakon `202 pending_signature` čeka potpis. „Spremljeno na poslužitelju” prikazuje tek kad provjeri potpis za poslanu transakciju, dokument i reviziju. Nakon osvježavanja student vidi rečenicu. Čisti kontekst bez lokalnog dnevnika iz servera dobiva isti `documentId`, reviziju, hash i tekst. Test izgubljenog odgovora dokazuje da isti ključ i isti bajtovi daju jednu reviziju. Drugi student ne može pročitati ni izmijeniti taj rad. Uz prolaz se bilježe SHA preloadera, weba i servera, verzije paketa i rezultat provjera nad sintetičkim podacima.

**Prihvat VS-2.** Isti student u novom mobilnom kontekstu kroz isti web otvara rad iz VS-1 i s poslužitelja dobiva istu potvrđenu reviziju i rečenicu. Rezultat navodi uređaj ili emulaciju i preglednički motor. Produkcijski AAI, objava desktop paketa i prijelaz postojećih studentskih radova imaju zasebne uvjete prihvata.

### 4b. Vremenska crta (procjena, NEPROVJERENO)

Migracija počinje onog dana kad postoji **V-1** (organizacija i repozitoriji). Dan 1 je prvi radni dan nakon toga.

Mjera su radni dani uz današnji tempo: oko 35–40 PR-ova dnevno preko svih pisaca. Novi repo u početku ide sporije od tog prosjeka. Razlozi su ograničenje od tri kodna PR-a po repou, migracije redom, `critical` gate i ovisnosti među zadacima. Vanjska čekanja (Srce, Apple, certifikat za Windows, tvoje odluke) nisu uračunata.

| Faza | Procjena (radni dani) | Okvirno od–do | Napomena |
|---|---|---|---|
| A (val 0) | 3–6 | dan 1 – dan 6 | NEPROVJERENO. Gate se tek postavlja, pa su prvi PR-ovi sporiji. |
| B (valovi 1–10) | 8–15 | dan 4 – dan 20 | NEPROVJERENO. Oko 95 zadataka; usporedni rad počinje u valu 5. |
| VS-1 i VS-2 | 2–4 | otprilike dan 10 – dan 16 | NEPROVJERENO. Kreće čim su gotovi S-1E-a, S-1D-d, S-1M-a i S-M-5, usred faze B. |
| C (preloader i web-chrome) | 10–20 | dan 14 – dan 35 | NEPROVJERENO. Najveći dio prijenosa sučelja; preklapa se s krajem faze B. |
| D (mobile i other) | 5–10 | dan 30 – dan 45 | NEPROVJERENO. Kraće ako je `web-other` tanak ili ga nema (odluka 13). |
| E (desktop) | 8–15 | dan 40 – dan 60 | NEPROVJERENO. Plus vanjska čekanja na Apple račun, certifikat i Srce. |
| **Ukupno** | **oko 35–60 radnih dana** | | NEPROVJERENO. Prva provjera procjene nakon faze A, iz mjera M-0.1. |

**Prezentacija 16. 11.** radi na Ductusu. Ništa iz ovog plana ne dira kod Ductusa prije toga, osim dokumenata (S-0.1, S-0.2) i spikea (S-0.3).

---

## 5. Standard svakog repozitorija

Isti za svih sedam. Razlike su samo u putanjama i vrstama testova.

| Stavka | Pravilo |
|---|---|
| Grana `main` | PR obvezan, squash, bez izravnog pusha, obvezna zbirna provjera `ci-ok` i statusi gatea. Postavljaš ti (V-2). |
| CI | Lint, typecheck, **funkcionalni testovi** i **testovi pomoćnih funkcija** kao odvojeni poslovi; skeniranje tajni; pregled ovisnosti; `ci-ok` pada ako padne bilo koji potreban posao. Akcije prikvačene na SHA. |
| Funkcionalni test | Onaj iz tvoje tablice, npr. server „vlastiti dokument da, tuđi ne” (S-1H.3), preloader „Chrome na Macu otvara Chrome i nudi macOS paket”. |
| Test pomoćnih funkcija | Unit testovi uz kod, npr. server „prazan i neispravan ID”, mobile „izračun prostora uz tipkovnicu”. |
| Gate | Isti kao Ductus: risk razine po putanjama, `Agent-Review:` i `QA-Agent:` na aktualnom headu, Codex review na točnom headu, dvije različite aplikacije za `critical`, Mergify red. |
| CODEOWNERS | Pokriva sve `critical` putanje. |
| `CLAUDE.md`, `AGENTS.md`, `.claude/rules/` | Tanki adapteri. Nijedno novo pravilo. Upućuju na kanonske dokumente. |
| README | Na hrvatskom: što repo radi, kako se pokreće, kako se testira, što nikad ne sadrži. |
| Pravilnik koda | Jedan `docs/CODE_STYLE.md` (S-0.5), isti u svim web i serverskom repou. Desktop dobiva dodatak za svoj jezik. |
| Izdanja | Semantička verzija i oznaka `vX.Y.Z`. Server: Docker slika i paket ugovora. Web: statična izgradnja. Desktop: potpisani paket u GitHub Releaseu. |
| Botovi | Ista labela i ista pravila kao u Ductusu (`ready-for-claude`, `bug`, `security`, `area:*`, `role:*`). |

Web repozitoriji koriste Next.js sa statičnom izgradnjom (`output: 'export'`), bez server actions i bez vlastitih ruta API-ja. Tako ostaje postojeći kod, a server ostaje jedini server. Preloader ima proračun veličine (test pada ako JavaScript prvog ekrana prijeđe dogovorenu granicu).

---

## 6. Testiranje preko repozitorija

| Vrsta | Što provjerava | Gdje živi | Tko pokreće |
|---|---|---|---|
| **Ugovorni testovi** | Klijent i server govore isti jezik. Klijent prikvači verziju `@ductura/contracts` i pokreće njezine vektore. Server pokreće vektore svih glavnih verzija koje još podržava. | Vektori u serveru (S-1H.4); provjera u CI-ju svakog klijenta | CI na svakom PR-u |
| **Scenariji pariteta** | Isti tok prolazi u sva tri weba: prijava, otvaranje rada, pisanje, rad bez veze, ponovno spajanje, predaja. | Razina API-ja u serveru (S-1H.8). Razina sučelja kao paket `@ductura/parity` u web-chromeu, koji pokreću web-mobile i web-other | CI svakog weba, nad Docker slikom testnog servera (S-1H.7) |
| **Matrica preloadera** | Dvije odluke zasebno: sučelje po uređaju i pregledniku, gumb po sustavu. Rubni slučajevi: Edge s oznakom Chrome, iPad u desktop načinu, uski prozor, nepoznat sustav, nedostupan paket. | `preloader`: tablični unit test (P-0.2) i Playwright s emuliranim uređajima u Chromiumu, Firefoxu i WebKitu (P-0.11) | CI preloadera |
| **Simulacija preuzimanja** | Pravi paket za svaki sustav i arhitekturu, SHA-256 se poklapa, preuzimanje samo na klik. | Server (S-1H.6); kasnije desktop repo s pravim paketom | CI servera; CI desktopa pri izdanju |
| **Sistemski e2e** | „Domena → preloader → sučelje → server” kroz pravi proxy. | `preloader/e2e/system/` i `deploy/edge/` (proxy). Stog: slika testnog servera + statične izgradnje sva tri weba + preloader. | Noćni posao u preloaderu i svaki kandidat za izdanje. QA sesija čita rezultat; orkestrator ga ne smatra prolazom bez zapisa SHA-ova svih dijelova. |

Svaki prolaz bilježi verziju sustava, preglednika ili paketa i točan SHA svakog sudjelujućeg repoa. Svi podaci su izmišljeni.

Pravi uređaji (iPhone, iPad, Android) za fazu D: Playwright emulacija ne zamjenjuje pravi uređaj za zaslonsku tipkovnicu. Predlažem ručni QA protokol na tvojim uređajima ili plaćenu farmu uređaja (odluka 9).

---

## 7. Gate, botovi i orkestracija na sedam repozitorija

**Gate.** Workflow gatea i skripte (`risk-floor`, provjera verdikata) najprije nastaju u serveru (S-0.10-a/b). Kad ih zatreba drugi repo, izdvajaju se u zajedničke workflowe (T-0.2). Svaki repo ih poziva s oznakom verzije (npr. `gate-v1`) i daje samo svoju tablicu putanja za risk. Retci verdikta ostaju isti (`Agent-Review:`, `Review-Head:`, `Review-Verdict:`, `QA-*`), a format agenta ostaje `runtime:slot:role`.

**Redoslijed V-2 i obveznih statusa (ispravak 14. 11.):** S-0.9 i S-0.10-b u serveru prvo dokažu prolaz i očekivani pad svakog posla; zatim V-2 dopisuje točna emitirana imena u obvezne statuse; tek onda Mergify (S-0.20, koji čeka i S-0.11 te V-3). Postojeća zaštita (`test`) ostaje dok se u serveru ne dokaže prolaz i očekivani pad.

**U11, gate prema riziku uz ugovorne testove (ispravak 14. 11.):** zadnji korak, nakon U10 i S-1H.8. Ide kao zaseban PR pravila, a vlasnik mora potvrditi tekst pravila prije spajanja.

**Mergify.** Aplikacija se instalira na organizaciju. Svaki repo ima kratki `.mergify.yml` koji nasljeđuje zajednička pravila (`extends`). D-97 PR i dalje čeka tvoju naredbu.

**Botovi (`ductus-botovi[bot]`).** Danas je aplikacija instalirana samo na Ductus, a pravilo u `CLAUDE.md` to i kaže. Aplikacija u vlasništvu osobnog računa ne može se instalirati na tuđu organizaciju dok je privatna. Prijedlog: prenesi aplikaciju u organizaciju `Ductura` (GitHub to dopušta) i instaliraj je na odabrane repozitorije. Pravilo o „samo ovom repou” mijenja se D-zapisom, kao promjena pravila. Grok strani treba popis repozitorija koje čita.

**Codex i druga aplikacija za `critical`.** Instaliraju se na svaki aktivni repo. Kvota Codexa dijeli se na više repozitorija; pravilo „prvo potvrda, pa novi zahtjev” ostaje.

**Skripte orkestratora.** S-0.21 dodaje parametar `--repo`. T-0.6 to širi: jedan popis praćenih repozitorija, `orch:overlap` i preko repozitorija (npr. promjena ugovora u serveru i PR u webu koji ga koristi), status gatea za sve. Nadzor i heartbeat izvan repoa usklađujem sam.

**Ograničenje WIP-a.** Danas: najviše tri kodna PR-a izvan nacrta. Prijedlog: tri po repozitoriju, uz ukupnu granicu pisaca zbog RAM-a i oblaka (odluka 7).

**Koordinacijski issue.** Prijedlog: **#87 u Ductusu ostaje jedino mjesto tvojih odluka za sve repozitorije.** Tako povijest odluka ostaje na jednom mjestu. Svaki novi repo ima:
- issue „Koordinacija <repo>” za bilješke orkestratora tog repoa,
- issue „Botovi: dnevni pregled” za botove.

**Kanonski dokumenti.** `docs/ENGINEERING_SYSTEM.md`, `DECISIONS.md` i Ustav ostaju u Ductusu. Novi repozitoriji ih navode poveznicom (S-0.6). Kad se Ductus zaključa, ostaju čitljivi.

**Linear (prijedlog).** Ostaje **jedan projekt „Ductus”**, uz labelu po repozitoriju (`repo:server`, `repo:preloader` …) i prekretnice po fazama A–E. Za funkciju koja dira više repozitorija postoji **jedan zajednički zadatak** s poveznicama na svaki PR u svakom repou. Pod-zadaci po repou samo ako je posao velik. Integracija Lineara s GitHubom spaja se i na organizaciju `Ductura`, pa `DAN-xxx` radi u svim repozitorijima. Pravilo „svaki PR veže DAN-xxx” ostaje.

### 7a. Orkestratori po repozitoriju

Pitanje: može li svaki repo imati svog orkestratora, pa da svih sedam radi usporedno? **Preporuka: ne odmah. Jedan glavni orkestrator, a orkestratori po području dodaju se u etapama**, tek kad njihovi repozitoriji imaju stvaran usporedni posao.

**Glavni orkestrator** posjeduje sve što prelazi granice repozitorija:
- verzije ugovora (`@ductura/contracts`) i zajedničkih paketa (`editor-core`, `ui`);
- izdanja i sistemski e2e;
- #87, Linear i zajedničke zadatke;
- spajanja koja traže tvoju naredbu (D-97).

**Etape:**

| Etapa | Orkestratori | Kada počinje |
|---|---|---|
| 1 | Samo glavni, radi na serveru | Od V-1 |
| 2 | Glavni (server) + **front orkestrator** za preloader, web-chrome, web-mobile i web-other | Zajedno s vertikalnim presjekom (VS-1) |
| 3 | + **desktop orkestrator** | Kad počne rad na ljusci (faza E) |

Najviše **tri** orkestratora u isto vrijeme.

**Zašto ne sedam odmah:**
1. **RAM.** Desktop ima 16 GB, a orkestrator je već padao zbog manjka memorije. Dodatni orkestratori rade u oblaku ili na laptopu, ne na desktopu.
2. **Kvota.** Svaki orkestrator troši kvotu jednako kao pisac, i to stalno.
3. **Ti si jedna točka odluke.** Sedam orkestratora značilo bi sedam redova pitanja za tebe.
4. **Ovisnosti.** Na početku svi repozitoriji čekaju ugovor servera i paket editora. Sedam usporednih orkestratora uglavnom bi čekalo.

**Pravila:**
- Svaki orkestrator ima svoje ime slota (npr. `claude:b:orchestrator`, `claude:c:orch-front`) i svoj koordinacijski issue u svakom svom repou.
- Samo glavni mijenja zajedničke pakete i verzije ugovora. Front ili desktop orkestrator za to otvara zahtjev glavnom.
- Bazen pisaca i ograničenja WIP-a dijele se među orkestratorima. Glavni objavljuje podjelu na #87, a mijenja je samo on.
- **Prvo mjeri, pa dodaj.** Novi orkestrator dolazi tek kad mjere iz prijedloga 17 pokažu da postojeći ne stiže (npr. PR-ovi gotovi za review čekaju dulje od dogovorenog).

---

## 8. Rizici i moji prijedlozi

1. **Sedam repozitorija, jedan vlasnik: više održavanja.** Prijedlog: jedan pomoćni repo `Ductura/.github`, koji nije razvojni dio i nema koda aplikacije. U njemu su zajednički workflowi, zajednička Mergify pravila, predlošci issuea i PR-a, popis labela i profil organizacije. GitHub taj repo posebno prepoznaje. Ako ne želiš ni njega, sve to ide u `Ductura/server` (odluka 3).
2. **Razilaženje postavki među repozitorijima.** Prijedlog: tjedna provjera (T-0.7) koja samo čita: zaštita grane, obvezni statusi, instalirane aplikacije, labele. Nalaz ide u koordinacijski issue.
3. **Novi repo bez standarda.** Prijedlog: generator početnih datoteka (T-0.4). Novi repo dobiva README, adaptere pravila, CODEOWNERS, predložak PR-a, risk tablicu i labele u jednom PR-u.
4. **Ductus i novi repozitoriji paralelno.** Rizik: dvostruke promjene i dvije istine. Prijedlog u tri koraka:
   - sada: Ductus dovršava PR-ove u gateu, novi posao ide u Ducturu (već odlučeno);
   - **zamrzavanje** kad web-chrome prođe glavni tok na novom serveru (kraj faze C): Ductus dobiva samo sigurnosne popravke;
   - **zaključavanje samo za čitanje** dva tjedna nakon prebacivanja domene (kraj faze D).
5. **Desktop: tanka ljuska, nikad novi editor.** Izvorni editor u C#-u ili Swiftu bio bi četvrti i peti editor, uz web-chrome, mobile i other. To je najveći mogući trošak i rizik plana. Prijedlog: desktop je tanka izvorna ljuska oko **istog web paketa**. Ljuska radi prozor, instalaciju, ažuriranje, prijavu tokom (S-1E-e) i lokalno spremište. Tri moguća puta:
   - **A:** Windows u C#/.NET s WebView2 (motor Chromium), macOS u Swiftu s WKWebView (motor WebKit). Dva repozitorija, kako si zadao.
   - **B:** jedan kod za oba sustava, Tauri ili Electron. Tada predlažem **jedan repo `desktop` s dva cilja** (Windows i macOS) umjesto dva repozitorija.
   - **C:** mješovito nije preporučeno.
   Moja preporuka: A ako želiš izvorni osjećaj i C# kako je predloženo; B ako želiš manje održavanja. Odluka najkasnije na kraju faze C, uz kratki spike (D-0.1) ranije (odluke 8 i 12).
6. **macOS potpis i notarizacija.** Bez Apple Developer računa (99 USD godišnje) macOS blokira aplikaciju. Račun treba prije prvog javnog paketa. Predlažem otvoriti ga na početku faze E, ne prije.
7. **Windows potpis.** Bez potpisa SmartScreen upozorava korisnika. Mogućnosti: klasični certifikat (oko 200 do 400 USD godišnje) ili Microsoftova usluga potpisa u oblaku (mjesečna pretplata; treba provjeriti dostupnost za Hrvatsku). Odluka u fazi E.
8. **Gdje žive paketi za preuzimanje.** Prijedlog: izvor istine je GitHub Release desktop repoa. Server u manifestu drži adresu i SHA-256. Za korisnika ostaje jedna domena: `/preuzimanje/` vodi kroz server. Na početku je to preusmjeravanje na Release; kasnije, ako ustanova traži, kopija u vlastitoj pohrani.
9. **Token za pakete u oblaku.** Sesije u oblaku već imaju probleme s GitHub tokenom, a GitHub Packages traži token za čitanje. Registar je GitHub Packages (ispravak 14. 11., §2c); rizik se ublažava tokenom `GITHUB_TOKEN` u CI-ju.
10. **Lomljenje ugovora.** Promjena API-ja može srušiti sva četiri klijenta odjednom. Prijedlog: zaštita od lomljenja u serveru (S-1H.1-b), vektori starih verzija u CI-ju servera i Dependabot PR u klijentima kao rano upozorenje.
11. **Proxy kao jedna točka kvara.** Konfiguracija proxyja ima svoje testove u preloaderu (svaka putanja vodi na pravi dio, nepoznata putanja na stranicu greške).
12. **Kvota Codexa i botova.** Više repozitorija znači više reviewa. Prijedlog: Codex samo za `standard` i `critical`, a `low` PR-ovi samo uz Claude review, kao danas.
13. **RAM i lokalni rad.** Sedam repozitorija znači više worktreeja i ovisnosti. Prijedlog: pisci rade u oblaku, lokalno najviše tri, kao danas. Sistemski e2e ide samo u CI-ju.
14. **Javni repozitoriji.** Ductus je javan, pa će biti i novi. Prednost: besplatni GitHub runneri, i za macOS. Pazi: nalazi sigurnosti i dalje samo privatno (nacrti savjeta), nikad u javni issue.
15. **Više kopija editora i sinkronizacije.** Prijedlog: jedna implementacija, paket `@ductura/editor-core` (§2d). Počinje u Ductusu, seli se u web-chrome tek po četiri uvjeta izlaza. Nijedan drugi repo ne smije imati vlastiti editor ili dnevnik; T-0.7 to provjerava (traži uvoz Tiptapa ili Dexieja izvan paketa).
16. **Treba li `web-other` uopće vlastito sučelje?** Moderni Firefox, Safari, Edge i Opera izvode isti kod kao Chrome. Zaseban frontend značio bi treću kopiju ekrana bez stvarne potrebe. Prijedlog: **web-chrome postaje sučelje za sve preglednike na računalu**, uz CI s matricom preglednika (Chromium, Firefox, WebKit) i male popravke kompatibilnosti u `src/platform`. Preloader tada za ostale preglednike otvara isto sučelje. Druga mogućnost: `web-other` ostaje kao **tanki repo za kompatibilnost i testove** (popravci za Safari i Firefox, matrica preglednika, bez vlastitih ekrana). Time i dalje imaš sedam repozitorija. Odluka 13.
17. **Cijena razdvajanja se ne vidi na vrijeme.** Prijedlog: mjeriti od prvih zadataka (M-0.1, dodatak u `orch:metrics`):
    - koliko repozitorija dira jedna promjena;
    - koliko PR čeka na PR u drugom repou;
    - vrijeme od prvog commita do testiranog izdanja, uz ostale DORA mjere (učestalost izdanja, udio promjena koje ruše, vrijeme oporavka).
    **Pravilo:** ako obične promjene stalno traže tri gotovo jednaka PR-a (npr. ista izmjena u tri weba), to je znak da treba dijeliti više koda. Tada predlažem premještanje tog dijela u paket. Mjere idu u tjedni izvještaj petkom.
18. **Krivo prepoznavanje u preloaderu.** Niz preglednika (UA) laže: Edge i Opera nose oznaku Chrome, iPad se predstavlja kao Mac. Prijedlog: prepoznavanje koristi **client hints** (`Sec-CH-UA`, `Sec-CH-UA-Mobile`, `Sec-CH-UA-Platform`) i **provjeru mogućnosti** (dodir, širina zaslona, podržani API-ji), a niz preglednika samo kao zadnju zamjenu. Nikad samo niz. Korisnik **uvijek** može ručno promijeniti prikaz i paket. Prepoznavanje ne služi za ovlasti i nije otisak preglednika (3c).

---

## 9. Odluke koje trebam od tebe

| # | Pitanje | Moja preporuka |
|---|---|---|
| 1 | Usmjeravanje na domeni | Jedna adresa i podputanje (`/`, `/c/`, `/m/`, `/o/`, `/api/v1/`) |
| 2 | Način dijeljenja koda i registar | Verzionirani paketi; registar GitHub Packages (odluka od 14. 11., ispravak). Javni npm opseg bio je raniji prijedlog. |
| 3 | Pomoćni repo za zajedničke workflowe | `Ductura/.github`, bez koda aplikacije. Alternativa: sve u serveru. |
| 4 | Gdje se bilježe tvoje odluke | #87 u Ductusu ostaje jedino mjesto za svih sedam repozitorija |
| 5 | Linear | Jedan projekt „Ductus”, labela po repou, jedan zajednički zadatak po funkciji s poveznicama na sve PR-ove, prekretnice po fazama |
| 6 | Aplikacija botova | Prenijeti `ductus-botovi` u organizaciju; promijeniti pravilo „samo ovaj repo” D-zapisom |
| 7 | WIP | Tri kodna PR-a po repozitoriju, uz ukupnu granicu pisaca |
| 8 | Desktop ljuska i trenutak | Tanka ljuska oko istog web paketa, nikad izvorni editor. Put A (C#/.NET + WebView2 i Swift + WKWebView) ili put B (Tauri ili Electron). Odluka najkasnije na kraju faze C, spike ranije. |
| 9 | Pravi mobilni uređaji | Ručni QA protokol na tvojim uređajima; farma uređaja tek ako se pokaže potreba |
| 10 | Zamrzavanje Ductusa | Zamrznuti na kraju faze C, zaključati dva tjedna nakon prebacivanja domene |
| 11 | Repozitoriji pri V-1 | Otvoriti svih sedam odmah (rezervacija imena), aktivirati samo `server`; ostali prazni s README-om „u pripremi” |
| 12 | Jedan ili dva desktop repozitorija | Dva (`desktop-windows`, `desktop-macos`) uz put A; jedan `desktop` s dva cilja uz put B |
| 13 | `web-other` | Web-chrome za sve preglednike na računalu uz matricu preglednika u CI-ju; `web-other` kao tanki repo za kompatibilnost i testove ako želiš zadržati sedam repozitorija |
| 14 | Editor i sinkronizacija | Jedan paket `@ductura/editor-core`: počinje u Ductusu, seli se u web-chrome po uvjetima iz §2d |
| 15 | Vertikalni presjek | Da: VS-1 odmah nakon S-1E-a, S-1D-d, S-1M-a i S-M-5; S-M-5 povući na početak vala 6 |
| 16 | Mjere razdvajanja | Da: M-0.1 u `orch:metrics` od prvih zadataka, s pravilom „tri gotovo jednaka PR-a → dijeli više” |
| 17 | Orkestratori po repozitoriju | Ne sedam odmah: glavni + front (od VS-1) + desktop (od faze E), najviše tri, dodatni u oblaku ili na laptopu (§7a) |

---

## 10. Prva dva tjedna

Pretpostavka: početak u ponedjeljak 17. 11., nakon prezentacije. Dokumenti i spike mogu i ranije.

### 10a. Što se mijenja u postojećim zadacima

| Zadatak | Izmjena |
|---|---|
| S-0.1 | D-zapis navodi `preloader` kao sedmi repo umjesto `shared-core`. Dodaje odluke iz §9 koje potvrdiš (usmjeravanje, paketi, pomoćni repo, botovi). |
| S-0.6 | Adapteri pravila nastaju tako da ih T-0.4 kasnije može kopirati u druge repozitorije. Sadržaj isti. |
| S-0.9, S-0.10-b, S-0.20 | Grade se u serveru kao danas. Pišu se tako da ih T-0.2 i T-0.3 kasnije izdvoje bez promjene ponašanja. |
| S-0.11 | Ovisi i o prijenosu aplikacije botova u organizaciju (V-3). Labele dolaze iz zajedničkog popisa kad postoji T-0.1. |
| S-0.19 | Briše se „Otvoreno: prelazi u shared-core”. `server/domain` ostaje u serveru i objavljuje se u `@ductura/contracts`. Otvorena točka 12 se zatvara. |
| S-0.21 | Popis praćenih repozitorija ima svih sedam plus Ductus. Proširenje preko repozitorija je T-0.6. |
| S-1L.1 | Briše se „dugoročno mjesto lokala je shared-core”. Serverske lokale ostaju u serveru. Lokale sučelja idu u `@ductura/ui`. Test u `@ductura/ui` provjerava da svaki kod greške iz ugovora ima tekst. |
| S-1M-c | Katalog grešaka objavljuje se u `@ductura/contracts`, jer ga preloader treba. |
| S-1H.4, S-1H.8 | Vektori i scenariji objavljuju se u `@ductura/contracts`. Potrošači su preloader i web repozitoriji, ne shared-core. |
| §6 i §7 popisa | „Testovi shared-core” zamjenjuju testovi preloadera. Desktop gradi nad paketima i OpenAPI-jem, ne nad shared-coreom. |

### 10b. Novi zadaci

| ID | Što | Repo | Ovisi o | Risk |
|---|---|---|---|---|
| T-0.1 | Pomoćni repo: profil organizacije, predlošci issuea i PR-a, zajednički popis labela | `.github` (ili server) | V-1, odluka 3 | standard |
| T-0.2 | Zajednički workflowi: CI osnova s `ci-ok`, gate, tajne, ovisnosti; izdvojeni iz servera | `.github` | S-0.9, S-0.10-b | critical |
| T-0.3 | Zajednička Mergify pravila i nasljeđivanje | `.github` | S-0.20 | critical |
| T-0.4 | Generator početnih datoteka novog repoa | `.github` | S-0.6, S-0.10-a | standard |
| T-0.5 | Objava paketa: verzije, zapisi promjena, objava iz Actionsa | server | S-1H.1-b, odluka 2 | critical |
| T-0.6 | Skripte orkestratora za sedam repozitorija, preklapanje preko repozitorija | Ductus | S-0.21 | critical |
| T-0.7 | Tjedna provjera razilaženja postavki (samo čitanje) | `.github` | T-0.2 | standard |
| P-0.1 | Kostur preloadera (statična izgradnja, proračun veličine) | preloader | V-1b, T-0.4 ili ručno | standard |
| P-0.2 | Dvije odluke kao čiste funkcije, s tablicom iz plana prvog vala; ulaz su client hints i provjera mogućnosti, niz preglednika samo kao zamjena | preloader | P-0.1 | standard |
| P-0.3 | Ručni izbor prikaza i paketa, pamćenje izbora | preloader | P-0.2 | standard |
| P-0.4 | Provjera servera i verzije API-ja | preloader | S-1M-a | standard |
| P-0.5 | Stranice grešaka iz kataloga | preloader | S-1M-c | standard |
| P-0.6 | Traka kolačića i ekran pristanka | preloader | S-1N-d | critical |
| P-0.7 | Ulaz u prijavu AAI@EduHr; FIDO2 za mrežnog inženjera | preloader | S-1E-a, S-1E-g | critical |
| P-0.8 | Slanje konteksta klijenta | preloader | S-1M-b | standard |
| P-0.9 | Info stranica, javni pravni tekstovi, stranica za preuzimanje | preloader | S-1N-c, S-1H.5 | standard |
| P-0.10 | Proxy na domeni i lokalni sistemski stog | preloader | S-1H.7 | critical |
| P-0.11 | Matrica preloadera u Playwrightu (tri motora) | preloader | P-0.3 | standard |
| D-0.1 | Spike desktop ljuske (WebView2, WKWebView, Tauri) s istom web izgradnjom | Ductus `spikes/` | kraj faze B | low |
| E-0.1 | Granica paketa `editor-core` u Ductusu: `packages/editor-core`, bez Next.js-a, transport kao parametar; isti testovi prije i poslije | Ductus | nakon 16. 11. | critical |
| E-0.2 | Objava `@ductura/editor-core` 0.x iz Ductusa | Ductus | E-0.1, odluka 2 | critical |
| E-0.3 | Selidba paketa u web-chrome po uvjetima izlaza (§2d) | web-chrome | VS-1, zamrzavanje Ductusa | critical |
| VS-1 | Vertikalni presjek: prijava, otvori, spremi rečenicu, osvježi | preloader, web-chrome, server | S-1E-a, S-1D-d, S-1M-a, S-M-5, E-0.2, P-0.1 | critical |
| VS-2 | Isti rad otvoren na mobitelu | web-mobile ili web-chrome | VS-1, odluka 13 | standard |
| M-0.1 | Mjere razdvajanja i DORA u `orch:metrics` (repozitorija po promjeni, čekanje na drugi repo, vrijeme do testiranog izdanja) | Ductus | S-0.21 | standard |

### 10c. Raspored

**Tjedan 1 (17.–21. 11.)**
- Ti: V-0 domena i e-pošta. V-1 organizacija i repozitoriji. Odgovori na odluke 1–6, 11 i 14–16.
- U Ductusu odmah: S-0.1 (s izmjenom iz 10a), S-0.2, S-0.3, S-0.21.
- Nakon V-1: S-0.4, zatim S-0.5, S-0.7 i S-0.16 usporedno.

**Tjedan 2 (24.–28. 11.)**
- Ti: V-2 zaštita grane, V-3 prijenos i instalacija aplikacije botova, Mergify i Codex, V-4 tajne.
- Server: S-0.6, S-0.8, S-0.12, zatim S-0.9, S-0.10-a, S-0.10-b, S-0.11, S-0.13, S-0.14.
- T-0.6 i M-0.1 u Ductusu, nakon S-0.21. Mjere počinju s prvim PR-om u serveru.
- E-0.1 u Ductusu (granica paketa editora), nakon prezentacije i uz pisca koji poznaje `src/editor`.
- Ako je pisac slobodan: P-0.1 i P-0.2 (bez servera).

**Izlaz iz dva tjedna:** `Ductura/server` ima CI s `ci-ok`, gate, botove i Mergify, a jedan pravi PR prošao je cijeli gate. Migracije su prenesene s istim ledgerom. Orkestrator prati server iz svojih skripti. Odluke 1–6, 11 i 14–16 su zapisane na #87.

Ostatak vala 0 (S-0.15, S-0.17, S-0.18, S-0.19, S-0.20) i T-0.1 do T-0.4 ide u treći tjedan.

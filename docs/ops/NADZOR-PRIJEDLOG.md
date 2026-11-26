# Nadzor: prijedlog (staging i pilot)

> **SAMO PRIJEDLOG.** Nema koda, novih ruta ni računa. Izbor alata odlučuje Daniel (D3). Cijene i uvjeti alata su iz općeg znanja, **[provjeriti]** na službenim stranicama prije odluke. Ovdje nema tajni.

Zadatak: OPS-NADZOR (`docs/plan/PRIJEDLOZI-2611.md`, odobrio Daniel 26. 11. 2026.). Podloga: `docs/plan/STAGING-KONFIG.md`, `docs/plan/DPIA-OBRADE.md` (O-2, O-11, O-15), kod `ductura/Institution_server` i `ductura/Institution_front_web_chrome` (stanje main, 26. 11. 2026.).

## 1. Što treba pokriti

1. **Praćenje grešaka** na serveru (Render) i u pregledniku (Vercel), s grupiranjem i obavijesti o novoj grešci.
2. **Središnji zapisi**: jedno mjesto za pretragu redaka servera, bez osobnih podataka i sadržaja radova.
3. **Upozorenja**: server ne radi, `ready` pada, porast 5xx, pad baze zapisa, neuspjeh backupa.
4. **ID zahtjeva od fronta do baze**: jedan identifikator koji vežu odgovor, redak zapisa, grška u pregledniku i prijava problema.

Okvir: staging (proba 22. 2. 2027.) ima samo izmišljene podatke. Pilot sa stvarnim studentima tek nakon pravnog mišljenja i DPIA (D7). Svaki vanjski alat koji prima podatke o korisnicima postaje **izvršitelj** (čl. 28.); nijedan nije ugovoren, pa za pilot odlučuje pravnik **[PRAVNIK]**.

## 2. Što postoji danas u kodu

### Institution_server

| Mogućnost | Stanje | Izvor |
|---|---|---|
| ID zahtjeva | Postoji. Server ga sam stvara (UUID v4), nikad ne uzima od klijenta, a vraća ga u zaglavlju `X-Request-Id` i u tijelu greške (`requestId`). Na uspješnom odgovoru zaglavlje se postavlja tek kad ga neki redak ili greška zatraži. | `server/http/request-id.ts`, `server/http/problem.ts` |
| Strukturirani zapis | Postoji. Jedan JSON redak `{time, level, event, fields}`, prolaz kroz `redact`; konzola: stderr za upozorenja i greške, stdout za ostalo. | `server/log/logger.ts`, `server/log/README.md` |
| Zatvoreni katalog događaja | Postoji. Pet ključeva (`time`, `event`, `requestId`, `accountKind`, `fields`), bez polja slobodnog teksta, među njima `error.unexpected`, `warning.raised`, `traffic.*`, `metrics.collected`. | `server/log/events/` |
| Servis zapisa u bazu `ductus_logs` | Kôd je tu (`createLogWriter`, rok 1 s, najviše 64 zapisa u čekanju). README navodi da pravi adapter čeka tablicu, a `server.ts` kaže da za neke rute pisac još nije uvezan. **[provjeriti]** je li u stagingu uvezan. | `server/log/writer.ts`, `server/server.ts` |
| Neuhvaćena greška | 500 `internal` i redak `server_error` ili `error.unexpected` s `errorClass` (zatvoren popis), `requestId`, `route`. Bez poruke i stoga. | `server/http/README.md` |
| Zdravlje | `GET /api/v1/health` (koristi ga Docker `HEALTHCHECK`), uz `ready` provjeru sposobnosti i rok 2,5 s. | `server/http/health.ts`, `ready.ts`, `infra/web/Dockerfile` |
| Metrike | Sakupljač upisuje uzorke (npr. veze na baze) u `metric_sample` baze zapisa; krug se preskače uz zatvoren razlog. Nema izvoza prema vanjskom alatu. | `server/metrics/` |
| Revizijski trag operatora | `admin.action` s `requestId`. | `server/log/operator-audit.ts` |
| Prijava problema | `POST /api/v1/client-context` i `support.problem-report.post` sa zatvorenim popisima polja. | `server/http/client-context.ts`, `server/support/` |

### Institution_front_web_chrome

| Mogućnost | Stanje |
|---|---|
| Hvatanje grešaka u pregledniku (`window.onerror`, `unhandledrejection`, granica grešaka) | Ne postoji u `packages/app/src` ni `src/components` (pretraga 26. 11. 2026.). |
| Čitanje `X-Request-Id` ili `requestId` iz odgovora | Ne postoji. |
| Prijava problema | Model i obrazac postoje (`src/components/support/problem-report*.ts`), zatvoreni popis kategorija i 27 predložaka stranica, bez adrese i korisničkog agenta. Poziv ide kroz klijent u sljedećem rezu. Ne šalje `requestId` zadnje greške. |
| Nadzor Vercela | Samo ono što daje platforma. |

### Praznine

1. Nema vanjskog primatelja zapisa: retci s Rendera ostaju na platformi (zadržavanje i pretraga ograničeni planom).
2. Nema upozorenja: nitko ne dobije poruku kad `health` ili `ready` padne ili raste broj 500.
3. Preglednik ne javlja greške: pad u editoru vidi samo student.
4. ID zahtjeva stiže do korisnika samo u tijelu greške; ne ide u prijavu problema ni u zapis preglednika.
5. Metrike nemaju izvoz.

## 3. Ograničenja iz pravila proizvoda

- Zapis servera ne smije nositi tekst rada, osobne podatke ni tajne (`redact`, katalog bez slobodnog teksta). Isto vrijedi za svaki novi izlaz: alat dobiva **isti** već očišćeni redak, ne sirovi.
- ID zahtjeva stvara server; klijent ga ne smije birati ni slati (zaštita od umetanja). Front ga samo **čita** iz odgovora.
- Greške preglednika: URL-ovi, stog i poruke mogu sadržavati naslove radova ili ime. Alat bi smio primati samo zatvorene vrijednosti (vrsta greške iz popisa, predložak rute, verzija aplikacije, `requestId`, `syncState`), kao što radi prijava problema. Zapis tipki, sadržaj uređivača i snimanje sesije su izvan opsega (Ustav v1.9, P-3).
- IP se bilježi samo u bazi zapisa (D-303), nikad u konzolu; vanjski alat ga ne smije primati.
- Student i nastavnik se prijavljuju samo kroz AAI@EduHr (D-09); alat za nadzor nema vlastite prijave studenata. Pristup alatu imaju samo imenovani operatori.

## 4. Usporedba alata

Tražen je prednost besplatnim ili samostalno hostanim alatima. Četiri kandidata:

| | A. GlitchTip (samostalno) | B. Sentry (SaaS, EU regija) | C. Grafana Loki + Alloy + Alertmanager (samostalno) ili Grafana Cloud | D. Uptime Kuma (samostalno) |
|---|---|---|---|---|
| Namjena | greške servera i preglednika, grupiranje | greške servera i preglednika, praćenje izdanja | središnji zapisi, upozorenja, nadzorne ploče | provjera dostupnosti (`health`/`ready`), status stranica |
| Pokriva točke iz §1 | 1, (4) | 1, (4) | 2, 3 | 3 (samo dostupnost) |
| Licenca | otvoreni kod (MIT), kompatibilan sa Sentry SDK-ovima **[provjeriti]** | SaaS; samostalna inačica je izvorno dostupna, ne klasičan otvoreni kod **[provjeriti]** | otvoreni kod (AGPL-3.0 za Grafanu i Loki) **[provjeriti]**; Cloud je SaaS | otvoreni kod (MIT) |
| Cijena | samostalno: samo hosting (mala usluga + PostgreSQL); postoji i plaćena usluga u oblaku **[provjeriti]** | postoji besplatan plan s malim mjesečnim brojem događaja **[provjeriti]**; plaćeni planovi po događajima | samostalno: hosting; Cloud: besplatan plan s ograničenim zapisima i serijama **[provjeriti]** | samo hosting (vrlo malen) |
| Smještaj podataka u EU | ako ga hostamo na Renderu u Frankfurtu, da (isto kao baze); usluga u oblaku **[provjeriti]** | postoji EU regija (Frankfurt) **[provjeriti]** | samostalno u Frankfurtu, da; Cloud ima EU regije **[provjeriti]** | da, ako je u Frankfurtu |
| GDPR | mi smo voditelj i hostamo: nema novog izvršitelja osim hostinga (Render, već u planu); odgovornost za čišćenje je naša | novi izvršitelj (ugovor o obradi, podizvršitelji, prijenos izvan EU-a ocjenjuje pravnik) | samostalno kao A; Cloud kao B | nema osobnih podataka osim adrese koju provjerava |
| Trošak rada | srednji: nadogradnje, kopija baze, nadzor samog alata | nizak | srednji do visok (Loki, pohrana, pravila) | nizak |
| Rizik | još jedna usluga za održavanje; SDK-ovi su Sentry, pa treba zatvoriti što šalju | prijava poslanih podataka; ključ (DSN) u pregledniku je javan | složenost; zapisi su već u bazi `ductus_logs`, pa se podaci udvostručuju | provjerava izvana, ne vidi unutarnje stanje |

### Preporuka za Danielovu odluku (nije odluka)

- **Greške:** A (GlitchTip, samostalno, Frankfurt) za staging; razmotriti B tek ako održavanje A zasmeta. Razlog: prvo besplatno i samostalno, podaci ostaju u EU bez novog izvršitelja.
- **Zapisi:** za staging **ne uvoditi C**. Baza `ductus_logs` već je središnji, zatvoreni, očišćeni zapis; za pretragu prvo koristiti prikaz zapisa platforme (Render). C razmotriti kad se pokaže da to ne dostaje (broj redaka, rok čuvanja).
- **Upozorenja:** D (Uptime Kuma) provjerava `/api/v1/health` i `/api/v1/ready` izvana i šalje poruku; to je najmanji korak koji pokriva točku 3. Upozorenja na porast 500 dolaze iz A (pravila po pojavi greške).

Odluka: **[ODLUKA Daniel]**. Dok nije donesena, ništa se ne instalira.

## 5. ID zahtjeva od fronta do baze

Tok danas i predloženi završeci (popis izmjena u §6):

1. Preglednik šalje zahtjev na `/api/v1/...` (jedno podrijetlo, Vercel prosljeđuje na Render).
2. Server stvara `requestId` i vraća ga u `X-Request-Id` (na greškama uvijek i u tijelu).
3. Server upisuje `requestId` u redak zapisa (katalog ga već traži u svakom zapisu) i u revizijski trag operatora.
4. **Predloženo:** klijentski sloj (`src/client`) čita `X-Request-Id` iz svakog odgovora i čuva zadnji za grešku u memoriji (ne u pohrani), pa ga: (a) prikazuje uz poruku greške („Šifra za podršku”), (b) šalje kao polje u prijavi problema, (c) predaje alatu za greške kao oznaku.
5. **Predloženo:** server za 2xx odgovore uvijek postavlja zaglavlje (danas se postavlja tek na zahtjev), da i uspješan lanac prije pada bude povezan. Trošak je malen; odluka o tome ide u ugovor jer je to promjena odgovora (**[provjeriti]** pravilo `contracts:breaking` za dodatna zaglavlja).
6. Do baze: `requestId` ostaje u zapisima `ductus_logs`; veza s upitom na glavnu bazu (npr. `application_name` ili komentar upita) je zaseban prijedlog i traži provjeru da u njega ne ulazi ništa osim UUID-a.
7. Klijent **ne šalje** vlastiti ID zahtjeva. Ako se kasnije želi povezati korisnička radnja s više zahtjeva, to je zasebna „korelacija sesije preglednika” s novim poljem i odlukom Daniela.

## 6. Izmjene koje bi trebale (popis, bez koda)

Svaka stavka je zaseban zadatak i čeka odluku iz §4.

**Institution_server**
1. S1. Provjeriti i po potrebi uvezati servis zapisa u `server.ts` za staging (adapter za `ductus_logs`, tablica, RLS i pgTAP retci ako je nova).
2. S2. Provjeriti da `error.unexpected` i `warning.raised` nose `requestId` i da se na stdout/stderr ispisuje isti redak kojeg čita odabrani alat.
3. S3. (Ako A ili B) poslužiteljski SDK s filtrom prije slanja (`beforeSend`) koji propušta samo zatvorena polja: `errorClass`, ruta iz ugovora, `requestId`, verzija. Bez poruke, stoga, zaglavlja, kolačića, tijela i IP-a.
4. S4. Postavljati `X-Request-Id` na svaki odgovor (ugovorna promjena, vidi §5.5).
5. S5. Rute zdravlja: potvrditi da `health` i `ready` nisu iza prijave i ne otkrivaju više od `ok` i imena sposobnosti.
6. S6. (Ako C) izvoz metrika iz `metric_sample` (samo brojke, bez oznaka s osobnim podacima).
7. S7. Prag upozorenja: kad `LOG_STORE_FAILED`/`TIMEOUT`/`BUSY` rastu, događaj `warning.raised` sa zatvorenim razlogom.

**Institution_front_web_chrome**
1. W1. Klijent `src/client` čita `X-Request-Id`/`requestId` i izlaže ga komponentama (samo čitanje).
2. W2. Granica grešaka i hvatanje `window.onerror`/`unhandledrejection` u hostu (`packages/app/src/host/`), koje prijavljuju samo zatvorene vrijednosti.
3. W3. Obrazac „Prijavi problem” prilaže `requestId` zadnje greške (novo polje u ugovoru rute, dakle ide Danielu).
4. W4. Poruka greške s „Šifrom za podršku” (tekst u `messages.hr`, hrvatski).
5. W5. (Ako A ili B) SDK preglednika s istim filtrom kao S3, bez snimanja sesije, bez snimki zaslona i bez sadržaja uređivača; `connect-src` samo za adresu alata.
6. W6. Provjeriti da se u izvornim kartama za staging ne objavljuju imena datoteka s podacima.

**Infrastruktura (Platforma)**
1. I1. Hosting alata iz §4 u Frankfurtu, zasebna baza, kopija i brisanje po roku.
2. I2. Mrežna pravila: alat prima samo od servera i preglednika, administracija samo za imenovane operatore.
3. I3. Popis tajni (DSN, token za upozorenja) upisuje Daniel; u repou samo imena varijabli (npr. `ERROR_TRACKING_DSN`).
4. I4. Odredišta upozorenja (e-pošta ili poruka) i tko ih prima **[ODLUKA Daniel]**.

**Dokumenti i pravo**
1. D1. Dodati alat i vrstu podataka u `DPIA-OBRADE.md` (O-2) i popis izvršitelja ako je vanjski **[PRAVNIK]**.
2. D2. Rok čuvanja zapisa i događaja grešaka (otvoreno, S-1K.8) mora biti određen prije pilota.

## 7. Otvorena pitanja za Daniela

| # | Pitanje | Zadano dok nema odgovora |
|---|---|---|
| N-1 | Koji alat za greške (A, B ili nijedan) za staging? | nijedan |
| N-2 | Treba li središnji zapisi (C) već u stagingu? | ne, koristi se `ductus_logs` i prikaz Rendera |
| N-3 | Tko prima upozorenja i kojim kanalom? | nitko |
| N-4 | Smije li svaki 2xx odgovor imati `X-Request-Id` (promjena ugovora)? | ne |
| N-5 | Smije li prijava problema nositi `requestId` (promjena ugovora)? | ne |
| N-6 | Za pilot: smije li vanjski izvršitelj (B ili Cloud) primati podatke o greškama? | ne, tek nakon pravnog mišljenja i DPIA |

## 8. Redoslijed (prijedlog)

1. Odluke N-1 do N-6.
2. S1, S2, S5, W1, W4 (nema vanjskog alata, koriste ono što postoji).
3. D (uptime) i I3/I4 za upozorenja.
4. Alat za greške: S3, W2, W5, I1, I2.
5. DPIA i izvršitelji prije pilota.

Granice ovog dokumenta: ne instalira alat, ne otvara račune, ne dodaje rute, ne mijenja ugovor.

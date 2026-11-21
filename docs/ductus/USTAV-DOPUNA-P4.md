# Dopuna Ustava P-4: Ispitni način (sprječavanje umjesto označavanja)

**Status: PRIJEDLOG, ČEKA DANIELOVU POTVRDU TEKSTA I PRAVNO MIŠLJENJE.** Ovo nije upisana izmjena. Do potvrde se P-4 gradi samo u testovima s izmišljenim podacima.

## 1. Polazište

- **Odluka.** Daniel 21. 11. 2026.: umjesto detektora koji iz teksta pogađa je li ga pisao AI, Ductura dobiva ispitni način u kojem tekst koji nije natipkan ne ulazi u rad. Predaja se ne blokira automatski; zaključak o radu i dalje donosi nastavnik. Ritam pisanja (P-1) gradi se, ali sa stvarnim studentima radi tek nakon pravnog mišljenja (N-3).
- **Zašto ne detektor teksta.** Procjena koliko je teksta napisao AI ostaje na popisu „Nikad”. Takvi alati lažno optužuju poštene studente (osobito one kojima jezik nije prvi ili koji pišu jednostavno), parafraziranje ih zaobilazi, a Ductura bi postala sustav iz Priloga III. Akta o umjetnoj inteligenciji.
- **Zašto ispitni način.** Oznake P-2 i P-3 dolaze nakon unosa i nose rizik lažne oznake. Ispitni način djeluje u trenutku unosa: ono što nije natipkano editor ne prima i kaže zašto. Nitko nije označen, ništa se ne pripisuje osobi, a pošten student ne gubi ništa.
- **Red-team.** Lab i testovi u `Institution_front_web_chrome` (`ispitni.spec.ts`, grana `feat/ispitni-nacin`) pokazuju da ispitni način odbija lijepljenje izvana, unos bez tipki i promjenu skripte, i da stranica nakon odbijanja pokazuje točno ono što editor drži.

## 2. Što P-4 uvodi, u jednoj rečenici

Nastavnik zadatka smije za zadatak uključiti **ispitni način**, u kojem Ductura u rad prima samo natipkan tekst, a lijepljenje izvana, ispuštanje i unos bez tipki odbija u trenutku unosa, uz objašnjenje studentu i iznimku za odobrenu prilagodbu.

## 3. Pravila ispitnog načina

| Unos | U ispitnom načinu |
|---|---|
| Tipkanje, tipke uređivanja, poništi i ponovi | prima se |
| Pravopisni prijedlog preglednika, obrazac Literatura, traži i zamijeni | prima se |
| Brisanje i oblikovanje | prima se |
| Lijepljenje teksta kopiranog iz istog rada | prima se |
| Lijepljenje ili ispuštanje teksta izvana | **odbija se** |
| Unos bez tipki (diktat, zaslonska tipkovnica, ekstenzija ili skripta s `insertText`) | **odbija se**, osim uz odobrenu prilagodbu; kompozicija nastala tipkama (npr. mrtve tipke) prima se |
| Promjena koju ne objašnjava nijedan pouzdan događaj (skripta, ekstenzija, program) | **odbija se**, i uz prilagodbu |
| Vlastite promjene aplikacije (učitavanje rada, inačica s poslužitelja) | prima se |

Odbijena promjena ne ulazi u dokument ni u evidenciju i ne ostavlja oznaku. Student vidi poruku, npr.:

- „U ispitnom načinu lijepiti se može samo tekst kopiran iz ovog rada.”
- „U ispitnom načinu primaju se samo natipkani znakovi. Ako koristiš pomoćnu tehnologiju, javi se nastavniku za prilagodbu.”
- „Ova promjena nije došla s tipkovnice pa je ispitni način nije primio.”

Tekstovi poruka ulaze u katalog sučelja i provjeru zabranjenih izraza; ne spominju varanje ni AI.

## 4. Granice koje vrijede uvijek

- Ispitni način ne blokira predaju, ne šalje obavijest, ne pokreće postupak i ne ulazi u ocjenu. Ne broji odbijene pokušaje po studentu i ne prikazuje ih nastavniku.
- Ispitni način uključuje nastavnik zadatka za pojedini zadatak, a obavijest prije prve rečenice studentu kaže da je uključen i što ne prima.
- Student s odobrenom prilagodbom (`work_accommodation`) piše bez ograničenja unosa bez tipki. Prijava pomoćne tehnologije ne traži obrazloženje zdravstvenog stanja (kao P-3).
- Ispitni način nije nadzor računala: gleda samo događaje unutar editora Ducture.

## 5. Što P-4 ne može

- **Tipke koje šalje program.** Ekstenzija s dopuštenjem `chrome.debugger` ili program izvan preglednika (AutoHotkey, Python sa `SendInput`) šalje tipke koje preglednik smatra pravima; ispitni način ih prima (red-team `kanali.spec.ts`, `ispitni.spec.ts`). Razlikuje ih samo desktop aplikacija (P-3).
- **Uređaj koji glumi tipkovnicu, drugi uređaj i prepisivanje rukom.** Kao u P-3.
- **Preglednik koji student izmijeni.** Pravila rade u klijentu; tko izmijeni klijent, može ih zaobići. Poslužitelj prima samo evidenciju (vidi PR #511).

Zato ispitni način podiže cijenu zloupotrebe unutar Ducture, a ne jamči da je tekst studentov. Za ispit visokog uloga uz ispitni način vrijede desktop aplikacija (P-3), kontrolna točka uživo (D-55) i razgovor o radu.

## 6. Faza 2 (nije dio ovog prijedloga)

U desktop aplikaciji ispitni način može odbiti i tipke koje šalje program: aplikacija javlja editoru da je tipka stigla bez uređaja (P-3, `hDevice = 0`), a editor tu promjenu ne prima. To traži ugovor između aplikacije i weba i iste iznimke za pomoćnu tehnologiju.

## 7. Izmijenjene odredbe

### N-4 Oznaka „za pregled”

**Predloženo, dodaje se:**
> U zadatku s ispitnim načinom editor ne prima tekst koji nije natipkan (P-4). Odbijena promjena ne ulazi u rad ni u evidenciju i nije oznaka.

### C-3 Obavijest

**Predloženo, dodaje se:**
> U zadatku s ispitnim načinom obavijest navodi da je uključen, što editor ne prima i kako zatražiti prilagodbu.

### C-10 Autorstvo

**Predloženo, dodaje se:**
> Ispitni način ne tvrdi ništa o autoru i ne blokira predaju; odluku o radu donosi nastavnik.

## 8. Pitanja za pravno mišljenje

1. Je li ograničenje načina unosa u zadatku (bez lijepljenja izvana i unosa bez tipki) dopušteno bez posebne pravne osnove, kao uvjet ispita?
2. Je li iznimka uz odobrenu prilagodbu dovoljna zaštita od posredne diskriminacije studenata s invaliditetom?
3. Treba li za ispitni način zasebna obavijest ili privola, ili je dovoljna obavijest prije prve rečenice?

## 9. Pitanja za Daniela

1. Potvrđuješ li pravila iz odjeljka 3 i granice iz odjeljka 4?
2. Smije li ispitni način uključiti samo nastavnik zadatka, ili i fakultet za sve zadatke kolegija?
3. Treba li lijepljenje teksta kopiranog iz istog rada ostati dopušteno?

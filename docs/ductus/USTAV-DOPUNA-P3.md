# Dopuna Ustava P-3: Tipke koje šalje program (desktop aplikacija)

**Status: PRIJEDLOG, ČEKA DANIELOVU POTVRDU TEKSTA I PRAVNO MIŠLJENJE.** Ovo nije upisana izmjena. Do potvrde se P-3 gradi samo u testovima s izmišljenim podacima.

## 1. Polazište

- **Nalaz.** Pravila P-2 (R-2 do R-4) čitaju ritam unosa. Program koji vjerno oponaša pisanje osobe može ih zaobići, jer su pravila javna, a pragovi moraju biti blagi da osobe ne dobivaju lažne oznake (cilj iz P-2: najviše 1 na 1000 sesija). Čovjek koji ručno prepisuje AI tekst je osoba koja tipka i ne može se uhvatiti nikako.
- **Što ostaje.** Operativni sustav sam označava tipku koju je poslao program, a ne tipkovnica. Na Windowsu tipka poslana funkcijom `SendInput` u Raw Inputu stiže bez uređaja (`hDevice = 0`) i u kuki tipkovnice nosi zastavicu `LLKHF_INJECTED`; na macOS-u događaj nosi izvor (`CGEventSourceStateID`) i PID procesa koji ga je poslao. Taj podatak ne ovisi o ritmu, pa ga oponašanje ritma ne mijenja.
- **Odluka.** Daniel 21. 11. 2026.: nastaviti s ovom provjerom kao prijedlogom, uz red-team test u desktop aplikaciji.
- **Ovisnost.** P-3 se naslanja na P-2 (oznaka „za pregled” i njezine granice). Bez potvrđenog P-2 nema ni P-3.

## 2. Što P-3 uvodi, u jednoj rečenici

Desktop aplikacija Ducture smije, dok je njezin prozor u prvom planu, brojati koliko je tipki u editor stiglo s tipkovnice, a koliko ih je poslao program, i kad ih je program poslao više od praga, izvještaj „Podrijetlo teksta” dobiva oznaku **„za pregled”** s pravilom R-5.

## 3. Pravilo (prijedlog)

| Oznaka | Pravilo | Podatak |
|---|---|---|
| R-5 Tipke koje šalje program | U sesiji pisanja u desktop aplikaciji više od praga tipki stiglo je od programa, ne od uređaja. | dva broja po sesiji pisanja: tipke s uređaja i tipke od programa |

- Bilježi se samo dok je prozor Ducture u prvom planu, samo broj, nikad koja je tipka ni kad je pritisnuta. Nema globalne kuke tipkovnice, nema podataka o drugim programima, nema PID-a ni imena procesa.
- Prag se postavlja iz uzoraka (P-2 §5) i objavljuje s verzijom.

## 4. Granice koje vrijede uvijek

Sve granice iz P-2 §4 vrijede i za R-5. Uz njih:

- **Pomoćne tehnologije.** Zaslonska tipkovnica sustava (`osk.exe`), alati za prebacivanje, neki programi za diktat i makro-alati za osobe s invaliditetom šalju tipke istim putem kao napadač, i operativni sustav ih ne razlikuje. Zato R-5 ne smije okinuti studentu s odobrenom prilagodbom (`work_accommodation`), a obavijest prije prve rečenice kaže da student koji koristi takav alat to može prijaviti bez obrazloženja zdravstvenog stanja. Ovo je najveći rizik pravila i glavni razlog za pravno mišljenje (odjeljak 7).
- **Samo uz pristanak zadatka.** R-5 postoji samo u zadatku za koji je nastavnik zadatka odabrao pisanje u desktop aplikaciji. Rad u pregledniku nikad ne dobiva R-5 ni oznaku zato što nije pisan u desktop aplikaciji.
- **Nije nadzor računala.** Aplikacija ne gleda druge programe, zaslon ni kameru i ne radi ništa izvan svog prozora. Popis „Nikad” ostaje; ova provjera se upisuje kao izričita iznimka koja ne obuhvaća ništa više od dva broja.

## 5. Što P-3 ne može

- **Uređaj koji se predstavlja kao tipkovnica.** Mikrokontroler preko USB-a sustav vidi kao pravu tipkovnicu. R-5 ga ne vidi. To traži hardver i trud, pa podiže cijenu, ali nije jamstvo.
- **Izmijenjena aplikacija.** Klijent je na računalu studenta; tko izmijeni ili zamijeni desktop aplikaciju, može slati lažne brojeve. Bez potvrde integriteta aplikacije (atestacija) R-5 je i dalje izjava klijenta, kao i oznake izvora (red-team, ductura/Institution_server PR #511).
- **Prepisivanje rukom.** Osoba koja sama tipka AI tekst šalje prave tipke.
- **Drugi uređaj.** Ništa izvan Ducture.

Zbog toga je R-5 samo jedan od signala za razgovor. Odlučnog studenta i dalje razotkrivaju kontrolna točka uživo (D-55), razgovor o vlastitom tekstu uz reprodukciju i nastajanje rada kroz više dana uz komentare mentora.

## 6. Izmijenjene odredbe

### Popis „Nikad”

**Predloženo, dodaje se:**
> Izuzetak od zabrane nadzora računala: desktop aplikacija Ducture smije, samo dok je njezin prozor u prvom planu i samo u zadatku za koji je nastavnik zadatka odabrao desktop aplikaciju, brojati tipke koje su u editor stigle s uređaja i tipke koje je poslao program. Ne bilježi se koja je tipka, kad je pritisnuta ni koji je program poslao tipku.

### N-4 Oznaka „za pregled”

**Predloženo, dodaje se:**
> Pravilo R-5 ne okida studentu s odobrenom prilagodbom. Student koji koristi pomoćnu tehnologiju koja šalje tipke to može prijaviti bez obrazloženja zdravstvenog stanja.

### C-3 Obavijest

**Predloženo, dodaje se:**
> U zadatku za desktop aplikaciju obavijest navodi da aplikacija broji tipke s uređaja i tipke koje šalje program, da se ne bilježi koja je tipka ni kad je pritisnuta, i kako prijaviti pomoćnu tehnologiju.

## 7. Pitanja za pravno mišljenje (uz P-1 N-3 i P-2 §9)

1. Je li brojanje tipki od programa u prozoru aplikacije „nadzor računala” u smislu Ustava i propisa o radu na računalu, i je li izričita iznimka dovoljna?
2. Pomoćne tehnologije šalju tipke istim putem kao napadač. Je li prijava pomoćne tehnologije bez obrazloženja zdravstvenog stanja dovoljna zaštita od posredne diskriminacije i od obrade podataka o zdravlju (čl. 9 GDPR-a)?
3. Smije li nastavnik zadatka propisati desktop aplikaciju za zadatak, i što s studentom koji je ne može instalirati (vlastito računalo, druga platforma)?

## 8. Pitanja za Daniela

1. Potvrđuješ li R-5 i granice iz odjeljka 4?
2. Smije li nastavnik zadatka odabrati pisanje u desktop aplikaciji, ili to odlučuje fakultet?
3. Kad se macOS aplikacija sustigne, vrijedi li isto pravilo i tamo (izvor događaja umjesto Raw Inputa)?

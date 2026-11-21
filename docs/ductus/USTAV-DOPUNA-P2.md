# Dopuna Ustava P-2: Oznaka unosa za pregled

**Status: PRIJEDLOG, ČEKA DANIELOVU POTVRDU TEKSTA.** Ovo nije upisana izmjena. Do potvrde vrijede Ustav i P-1 kakvi jesu, a dijelovi P-2 se ne grade izvan demoa i testova s izmišljenim podacima.

## 1. Polazište

- **Nalaz.** Red-team test u `ductura/Institution_front_web_chrome` (grana `redteam/ai-tipkac`, `src/components/editor/redteam/browser/`) pokazao je da Ductura tekst koji je napisao AI, a unio program kroz prave događaje tipkovnice, bilježi kao `editor`, jednako kao tipkanje osobe: 504 od 504 promjene. Lijepljenje, unos bez tipki i skripte Ductura označava ispravno. To je poznata granica iz `docs/spikes/M3.5-P01.md` („Poznate granice”).
- **P-1 to ne rješava.** P-1 ritam samo prikazuje nastavniku i izričito zabranjuje da se iz njega išta računa (pravilo 4, N-2). Nastavnik bi ritam programa morao prepoznati golim okom, u svakom radu posebno.
- **Odluka.** Daniel 21. 11. 2026.: Ductura treba imati zaštitu protiv takvog unosa; prvo napad, zatim zaštita (opcija B).
- **Ovisnost.** P-2 se naslanja na P-1 (ritam unosa kao klasa podataka, izvještaj „Podrijetlo teksta”). Bez potvrđenog P-1 nema ni P-2.

## 2. Što P-2 uvodi, u jednoj rečenici

Ductura smije po unaprijed objavljenim, fiksnim pravilima označiti dio zapisa oznakom **„za pregled”** s navedenim razlogom, kad se način unosa ne slaže s načinom na koji osobe pišu; oznaka nije tvrdnja o autoru, ne blokira ništa, a zaključak donosi čovjek.

## 3. Pravila oznake (prijedlog)

Svako pravilo je fiksno, objavljeno studentu prije prve rečenice i provjerljivo: za svaku oznaku izvještaj pokazuje koje je pravilo okinulo i na kojem dijelu zapisa. Nema modela, klasifikatora ni rezultata koji se uči na radovima.

| Oznaka | Pravilo | Podatak |
|---|---|---|
| R-1 Automatizirani preglednik | Preglednik je za vrijeme pisanja javio da ga upravlja program (`navigator.webdriver`). | jedna logička vrijednost po sesiji |
| R-2 Dugi nalet bez stanke | Nalet tipkanja dulji od praga znakova bez ijedne stanke dulje od praga sekundi. | ritam unosa (P-1) |
| R-3 Linearni nalet | Nalet dulji od praga znakova bez ijednog povratka na raniji dio teksta (pomak kursora unatrag izvan zadnje riječi, označavanje, brisanje više od praga znakova). | zapis promjena (već postoji) |
| R-4 Ritam izvan raspona | Razmaci u naletu izlaze iz raspona izmjerenog na uzorcima pisanja osoba (odjeljak 5). | ritam unosa (P-1) |

Pragovi za R-2, R-3 i R-4 se ne izmišljaju: postavljaju se iz uzoraka (odjeljak 5) tako da na uzorcima osoba oznaka gotovo nikad ne okine, a objavljuju se s verzijom. Fakultet ih ne može pooštriti ispod vrijednosti koju uzorci opravdavaju.

## 4. Granice koje vrijede uvijek

- Oznaka „za pregled” je činjenica o zapisu i pravilu, a ne tvrdnja da je tekst napisao AI ili program. Uz svaku oznaku stoji: „Pravilo je okinulo na načinu unosa. To nije nalaz o autoru ni o prekršaju.”
- Student vidi iste oznake, istim tekstom, istom funkcijom (pravilo 5). Može uz oznaku ostaviti napomenu.
- Oznaka ne blokira predaju (pravilo 11), ne šalje obavijest, ne pokreće postupak, ne ulazi u ocjenu, izvoz, predajni paket ni sažetak procesa.
- Nema zbroja oznaka u ocjenu, rangiranja ni usporedbe studenata.
- Ritam se i dalje ne koristi za prepoznavanje ili potvrdu osobe (biometrija ostaje na popisu „Nikad”). Pravila R-2 i R-4 uspoređuju ritam s fiksnim pragom, ne s profilom osobe.
- Ako je nastavnik zadatka isključio bilježenje ritma (P-1, C-14), R-2 i R-4 se ne računaju, a izvještaj to kaže. Isključen ritam nije razlog za oznaku.
- Pomoćne tehnologije (diktat, zaslonska tipkovnica, uređaji za prebacivanje) već se bilježe kao `keyless-input` i nisu predmet R-1 do R-4. Student s prilagodbom (`work_accommodation`) može imati isključena pravila koja bi ga pogrešno označila; to odlučuje fakultet, a ne nastavnik.

## 5. Uzorci pisanja osoba (preduvjet za R-2 do R-4)

- Članovi tima i dobrovoljci pišu **izmišljene** tekstove u Ductura editoru, na stranici za uzorke (`src/components/editor/uzorci/browser/`). Sprema se samo ritam i struktura unosa (razmaci, duljine naleta, povratci unatrag, brisanja), nikad tekst.
- Cilj prije uključenja: barem 30 osoba, različite brzine i tipkovnice, laptop i stolno računalo. Za svako pravilo izvještava se koliko uzoraka osoba ono pogrešno označi; prag se bira tako da taj broj bude objavljen i prihvatljiv.
- Uzorci nisu studentski radovi i ne smiju to postati (CLAUDE.md, „Nikad ne koristi stvarne studentske radove”).

## 6. Izmijenjene odredbe

### Pravilo 13 i N-2 Bez AI analize

**Sada (P-1):** Nijedan model, klasifikator ni statistička procjena ne ocjenjuje proces pisanja ni podrijetlo teksta.

**Predloženo:**
> Nijedan model ni klasifikator ne ocjenjuje proces pisanja ni podrijetlo teksta. Izvještaj „Podrijetlo teksta” smije prikazati oznaku „za pregled” po fiksnim, objavljenim pravilima nad zabilježenim događajima (P-2). Pragovi pravila postavljaju se iz uzoraka pisanja osoba i objavljuju s verzijom. Oznaka nije automatska odluka i nije tvrdnja o autoru.

### C-14 Što se bilježi

**Predloženo, dodaje se:**
> Uz ritam unosa bilježi se i je li preglednik javio da ga upravlja program, kao jedna logička vrijednost po sesiji pisanja.

### C-3 Obavijest

**Predloženo, dodaje se:**
> Obavijest prije prve rečenice navodi pravila oznake „za pregled”, njihove pragove i da oznaka nije nalaz o autoru ni o prekršaju.

### C-9 i C-10 Autorstvo

**Predloženo, dodaje se:**
> Ni oznaka „za pregled” nije tvrdnja o autoru. Ductura ne tvrdi da je tekst unio program.

## 7. Što P-2 ne može

- Ne vidi ništa izvan Ducture: tekst koji student prepiše s drugog uređaja, tipkajući sam, izgleda kao pisanje osobe. To ostaje posao razgovora i usmene provjere (D-55, kontrolna točka uživo).
- R-1 vidi samo automatizaciju koju preglednik sam prijavi. U red-team testu R-1 okida i zato što testno okruženje (Playwright) samo postavlja tu vrijednost: to je svojstvo testa, ne dokaz da zaštita radi. Red-team rezultat za R-1 se zato ne iskazuje kao „uhvaćeno”, a zapis stvarnog scenarija pokusa nikad ne smije biti ulaz pravila.
- Napad koji se prilagodi objavljenim pravilima može ih zaobići. Pravila se zato objavljuju kao granice za pregled, ne kao jamstvo, a red-team test se nakon svake promjene pravila ponovno pokreće.

## 8. Pitanja za Daniela i odgovori (21. 11. 2026.)

1. Potvrđuješ li pravila R-1 do R-4 i granice iz odjeljka 4? **Da.**
2. Je li R-1 dovoljan za demo dok se ne skupe uzorci, a R-2 do R-4 tek nakon kalibracije? **Da.**
3. Koliko pogrešnih oznaka na uzorcima osoba prihvaćaš? **Daniel nije znao odrediti; prijedlog:** najviše 1 od 1000 sesija pisanja osoba smije dobiti ijednu oznaku R-2 do R-4. Mjeri se po sesiji, ne po naletu, jer student oznaku doživljava po radu. Razlog za stroži broj: uz 1 na 100 i 10.000 predaja bilo bi oko 99 pogrešno označenih poštenih radova, pa bi većina oznaka mogla biti pogrešna i uz naizgled visoku točnost. Ako uzorci pokažu da se to ne može postići, pravilo se ne uključuje, a ne popušta se prag. Broj potvrđuje Daniel prije uključenja R-2 do R-4.
4. Smije li fakultet isključiti pojedino pravilo? **Da.**
5. Tko vidi oznaku? **Samo nastavnik zadatka, odnosno mentor kod kojeg student piše rad**, i student (pravilo 5). Isto kao izvještaj P-1.

## 9. Pitanja za pravno mišljenje (uz N-3 iz P-1)

1. **Akt o umjetnoj inteligenciji, Prilog III.** Prilog navodi sustave za praćenje i otkrivanje zabranjenog ponašanja studenata tijekom testova. P-2 ne koristi model, ali automatski označava način unosa za pregled. Spada li Ductura s P-2 u tu kategoriju, i koje obveze iz toga slijede?
2. **GDPR čl. 22.** Oznaka ne donosi odluku i ne blokira ništa (odjeljak 4). Je li to dovoljno da obrada nije odluka koja se temelji isključivo na automatiziranoj obradi?
3. **GDPR čl. 35 (DPIA).** Ritam unosa je po zadanom uključen i student ga ne može isključiti (P-1, odgovor 3). Koja je pravna osnova, i treba li studentu dati mogućnost prigovora?
4. **Biometrija.** Pravila uspoređuju ritam s fiksnim pragom, a ne s profilom osobe. Potvrđuje li pravno mišljenje da to nije obrada biometrijskih podataka u smislu čl. 9?

## 10. Razdvojena pitanja (načelo)

Ductura razlikuje četiri pitanja i ne miješa ih: (1) kako je tekst ušao u dokument, (2) je li primljeni zapis naknadno promijenjen, (3) uz koji je račun rad nastajao i (4) tko je osmislio sadržaj. P-2 odgovara samo na dio prvog pitanja. Na četvrto Ductura ne odgovara; to ostaje nastavniku i razgovoru sa studentom. Način unosa, autorstvo sadržaja i dopuštenost pomoći ocjenjuju se odvojeno: diktat je program koji unosi studentove misli, a ručno prepisivanje AI teksta je čovjek koji tipka tuđe.

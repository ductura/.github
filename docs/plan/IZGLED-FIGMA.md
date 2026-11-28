# Plan izgleda aplikacije: Figma izgled, sve funkcije s localhosta

Nacrt, 27. 11. 2026. Design Studio.

**Cilj (vlasnik, 27. 11.):** cijela aplikacija dobiva izgled iz Figme „Ductura – popis ekrana po valovima” (VbHBDniZLi9LAIzpYsTLUz) i staklo, a zadržava sve funkcije koje danas ima na localhostu. Ono što Figma ne prikazuje nije uklonjeno; samo nije nacrtano.

**Redoslijed rada**
1. Ovaj plan: za svaki ekran gdje u Figma rasporedu stoji svaka postojeća funkcija. Ekrani kojih nema u Figmi dobivaju raspored po uzoru na najbliži nacrtani ekran.
2. Ponovno crtanje u Figmi po planu, sa staklom, u obje teme i na širinama 390 i 1440.
3. Izvedba u kodu, ekran po ekran, PR-ovi do oko 400 redaka. Funkcije i testovi ostaju; mijenja se raspored.

## Karta: ruta i Figma ekran

### Student
| Ruta | Figma |
| --- | --- |
| `/zadaci`, `/zadaci/kolegiji` | S-02 Moji zadaci i kolegiji |
| `/zadaci/radovi` | S-04 Moji radovi |
| `/upis`, `/upis/kolegij/[courseId]` | S-05 Upis u kolegij |
| `/zadatak/[id]` | S-06 Obavijest o zadatku |
| `/rad/[assignmentId]` | S-07 Radni prostor |
| `/rad/[assignmentId]/predaja` (izjava, pregled, slanje, potvrda) | S-08 Predaja |
| `/rad/[assignmentId]/dnevnik-pristupa` | S-42 Dnevnik pristupa |
| `/zadaci/upitnici`, `/zadaci/kodiranje`, `/zadaci/gradivo-kodiranja`, `/zadaci/kodiranje-izvoz` | V18 Upitnici i kodiranje |
| `/zadaci/dnevnik-prakse`, `/zadatak/[id]/tim`, `/zadatak/[id]/recenzija` (primljene, rad) | V19 Praksa, timovi i recenzija |
| `/analiza` | V15 Statistička analiza |
| `/zadaci/mentorstvo`, `/rad` | nema; po uzoru na S-02 i S-04 |
| `/rad/[assignmentId]/podrijetlo`, `/razgovor`, `/reprodukcija`, `/nastavnik` | nema; po uzoru na S-42 i N-10 |
| `/profil`, `/moja-prava` | nema; po uzoru na S-42 |

### Nastavnik
| Ruta | Figma |
| --- | --- |
| `/nastavnik` | N-00 Moji kolegiji |
| `/nastavnik/kolegiji` | N-01 Kolegiji i kodovi za upis |
| `/nastavnik/kolegiji/[courseId]/studenti` | N-02 Studenti |
| `/nastavnik/mentorstva` | N-03 Radovi uz mentora |
| `/nastavnik/rad/[id]/predaja` | N-04 Predaja rada |
| `/nastavnik/zadatak/novi` | N-05 Novi kolegij i zadatak |
| `/nastavnik/zadatak/[id]/merlin` | N-06 Merlin |
| `/nastavnik/zadatak/[id]/produljenje` | N-07 Produljenje roka |
| `/nastavnik/brz-put` | N-08 Brz put |
| `/nastavnik/zbirni` | N-09 Zbirni pregled |
| `/nastavnik/rad/[id]` | N-10 Pregled rada |
| `/nastavnik/rad/[id]/konzultacije` | N-11 Konzultacije |
| `/nastavnik/rad/[id]/priprema-razgovora` | N-14 Priprema za razgovor |
| `/nastavnik/zadatak/[id]/testovi` | V21 Kostur, formule, kod i testovi |
| `/nastavnik/mentorstva/dnevnik-prakse`, `/zadatak/[id]/timovi`, `/zadatak/[id]/recenzija` | V19 |
| `/nastavnik/upitnici/[id]/izvoz` | V18 |
| `/nastavnik/kolegiji/[courseId]/isvu-ocjene` | V22 ISVU |
| `/nastavnik/kolegiji/[courseId]/zbirno` | nema; po uzoru na N-09 |
| `/nastavnik/zadatak/[id]/uredi` | nema; po uzoru na N-05 |
| `/nastavnik/zadatak/[id]/predaje` | nema; po uzoru na N-02 |
| `/nastavnik/zadatak/[id]/rad/[documentId]/jezik` | nema; po uzoru na N-10 |
| `/nastavnik/rad/[id]/pregled`, `/reprodukcija`, `/sazetak`, `/usporedba` | nema; po uzoru na N-10 |

### Ustanova, operater i javno
| Ruta | Figma |
| --- | --- |
| `/ustanova/kolegiji` | U-01 Kolegiji |
| `/ustanova/etape`, `/ustanova/zavrsni-radovi` | V16 Završni rad |
| `/ustanova/predlozak-rada` | V17 Kriteriji i predlošci |
| `/ustanova/isvu`, `/ulaz/studomat` | V22 ISVU |
| `/ustanova`, `/ustanova/{korisnici,postavke,postavke/asistent,pravila,pragovi,cuvanje,izvoz-podataka}` | nema; po uzoru na U-01 |
| `/operater/*` (6 ekrana) | nema; po uzoru na U-01 i J-01 |
| `/stanje` | J-01 Stanje sustava |
| `/provjera` | J-02 Provjera potvrde |
| `/`, `/naslovnica`, `/prijava` | koncept naslovnice u `pregled/koncepti` (izvor istine, DAN-1573) |
| `/kako-radi`, `/o-aplikaciji`, `/pristupacnost`, `/nema-ovlasti`, `/izvoz-podataka/[token]`, nepostojeća stranica | nema; po uzoru na J-01 |

## Provjera potpunosti (27. 11.): student i nastavnik

Izvori: kod na 3001 (graf uvoza od ruta), Ductus `docs/design/EKRANI.md`, Figma VbHB. Popis funkcija po ruti: `[IZGLED-FIGMA-INVENTAR.md](IZGLED-FIGMA-INVENTAR.md)`.

### Postoji u kodu, korisnik ne dolazi do toga
- Student, ruta bez ijedne poveznice (samo URL): `/zadaci/mentorstvo` (zahtjev za mentorstvo), `/rad/[id]/razgovor` (studentova strana razgovora), `/analiza` (i poslužiteljski prekidač). `/moja-prava` nije u navigaciji.
- Student, napravljeno, a nigdje uključeno: „Prenosivi zapis” (`student/portable-record`, kartica uz potvrdu predaje; samo katalog i testovi).
- Student i nastavnik: „Povijest dokumenta” (`shared/document-history`, popis uvezenih DOCX/PDF; samo testovi).
- Nastavnik: `/nastavnik/kolegiji/[c]/isvu-ocjene` prikazuje samo naslov (čeka WEB-V22-OCJENE-EKRAN), nema poveznice. Figma V22 ga ima.
- Nastavnik: izravne izmjene vidljive, ali samo za čitanje (`TEACHER_EDIT_WRITABLE = false`, čeka poslužitelj).
- Nastavnik: `/nastavnik/kolegiji` samo preusmjerava; Figma N-01 je zaseban ekran (vlasnik dopustio razdvajanje).

**Odluka vlasnika 27. 11.:** „treba sve”. Uključuju se:
- „Prenosivi zapis” uz potvrdu predaje;
- „Povijest dokumenta” za studenta i nastavnika;
- poveznice u navigaciji za studentsko mentorstvo, analizu i „Moja prava”;
- poveznica na studentov razgovor.

Izvodi se u fazi koda, svaka stavka u svom PR-u.

### U specifikaciji (EKRANI.md), na localhostu ga nema kao zaseban ekran
- S-40 Komentari na mobitelu (`/rad/[id]/komentari`): ruta ne postoji; EKRANI kaže da se ne crta ponovno (#1091).
- S-44 Izvoz vlastitih podataka: student ga ne može sam pokrenuti; ide preko ustanove i poveznice `/izvoz-podataka/[token]`.
- S-06 Planer rada: postoji kao „Planer pisanja” u lijevoj ploči uređivača, odjeljak „Napredak” (`editor/chapter-length/WorkPlanner.tsx`). Računa riječi po poglavlju i riječi dnevno do roka. Vlastite rokove student upisuje u odjeljku „Rokovi”. Plana koraka s datumima, kakav opisuje specifikacija, nema.
- S-07 Pravopis: u kodu ga nema. Radi samo pravopis preglednika. Ne crta se jer na localhostu ne postoji.
- S-09 PDF izvori u bilježnici: „Bilježnica izvora” postoji u kodu (`editor/source-notebook/SourceNotebookHost.tsx`), ali nije uključena nigdje. Ima bilješke uz izvor (izvor, citat, stranica, bilješka) te „Umetni kao citat” i „Umetni navod”. Čitanja PDF-a i označavanja u njemu nema.
- Svjesno se ne gradi: N-19 AI pomoć nastavniku (prijedlog), N-15 (uvjet U-2), S-18 i S-46 (uvjet U-5), N-14 (uvjet U-3, ali ruta postoji).

### Figma: ekrani koji postoje u aplikaciji, a nisu nacrtani
- Student: `/zadaci/mentorstvo`, `/rad`, `/rad/[id]/podrijetlo`, `/razgovor`, `/reprodukcija`, `/nastavnik`, `/profil`, `/moja-prava`, `/zadaci/kolegiji` zasebno, bočne ploče uređivača.
- Nastavnik: `/kolegiji/[c]/zbirno`, `/zadatak/[a]/uredi`, `/predaje`, `/timovi`, `/recenzija`, `/rad/[d]/jezik`, `/rad/[id]/pregled`, `/reprodukcija`, `/sazetak`, `/usporedba`, `/mentorstva/dnevnik-prakse`, paneli Nastavni tim i Upitnici na kartici kolegija.
- Ljuska: obavijesti, Prijavi problem, Odjava, Postavke profila.
- V13 Slajdovi, V14 Tablica i V20 Čitanje naglas su načini uređivača, ne zasebne rute.

## Ekrani: funkcije i mjesto u Figma rasporedu

Opće pravilo za svaki ekran: Figma daje kostur, a funkcija bez mjesta u Figmi ide u najbliži Figma blok iste vrste, ne u novi uzorak. Svaki ekran se crta u obje teme, na 390 i 1440, sa svim stanjima koja Figma već ima (prazno, učitavanje, nedostupno, prijava istekla, 403).

**Sastav kartice (vlasnik, 28. 11.).** Sve kartice su složene jednako: nadnaslov, naslov i činjenice u jednoj skupini s razmakom 6, radnja desno na širinama od 834 naviše i ispod na 390, unutarnji razmak 24, radijus 10, staklo kao kartica rada na S-04. Donji redovi u uskim stupcima idu u stupac.

**Završni prolaz (vlasnik, 28. 11.).** Svaki ekran se prvo nacrta do kraja s tim sastavom. Dodatna uljepšavanja se zapisuju na popis i rade jednom, preko svih ekrana u Figmi, prije PR-ova koda, da se kod piše jednom.

### Zajedničko: ljuska (bočna traka)
Figma: oznaka D, „Glavna navigacija” s pet stavki, razmak, podnožje (Obavijesti s brojem, ◐, Odjava). Sadržaj je širok 880, a obavijest o zadatku 640.
- **Navigacija studenta:** Figma ima pet glavnih stavki (Moji zadaci, Moji kolegiji, Moji radovi, Radni prostor, Upis u kolegij). Ispod razdjelnika bez naslova dolazi druga skupina istog izgleda: Upitnici, Gradivo za kodiranje, Izvoz kodiranja, Dnevnik prakse, Zahtjev za mentorstvo, Statistička analiza. Prema odluci vlasnika, mentorstvo i analiza ulaze u navigaciju. Analiza se prikazuje samo kad je poslužitelj uključi.
- **Navigacija nastavnika:** Moji kolegiji, Kolegiji i kodovi za upis (N-01 kao zaseban ekran), Brz put, Radovi uz mentora, Zbirni pregled.
- **Podnožje:** prema Figmi su Obavijesti, ◐ i Odjava gumbi bočne trake. Između ◐ i Odjave dolazi gumb „Više”. On otvara stakleni izbornik (Knjižnica, komponenta „Izbornik ljuske”). U izborniku su naziv ustanove, Postavke profila, Moja prava (odluka vlasnika), Kako Ductura radi, Izjava o pristupačnosti i Prijavi problem. Tekstualni redci ne stanu u traku širine 64, pa su u izborniku.
- **Bočna traka po ulozi:** u Knjižnici je skup varijanti „Bocna traka” s Uloga = student, nastavnik, ustanova, operater. Druga skupina stoji ispod razdjelnika. Područje navigacije se pomiče okomito (kao `overflow-y: auto` u kodu), a podnožje ostaje na mjestu. Ustanova ima 12 stavki i na visini 900 se pomiče. Nastavnik u drugoj skupini ima Statistička analiza, jer je ruta otvorena i nastavniku. Nazivi su iz kataloga koda (`locales/hr.ts`, `messages.hr.ts`).
- **Dijalozi ljuske** (popis obavijesti, Prijavi problem, Odjava) nisu nacrtani. Crtaju se kao stakleni Popover ili Dialog.
- **Stanja ljuske** (učitavanje, sesija nedostupna, bez uloge, stranica ne postoji) crtaju se po uzoru na S-02 Z3, Z4 i Z6.

### Student

**S-02 Z1 `/zadaci`.** Figma redom: zaglavlje (nadnaslov „Vaš studentski prostor”, naslov, gumb „+ Upiši kolegij kodom”), naslov „Moji kolegiji”, mreža kartica kolegija (kolegij, godina, nastavnici, zadaci s rokom i radnjom).
- Kartica „Nastavak rada”: između zaglavlja i mreže, kao istaknuta kartica iste vrste kao kartica kolegija.
- Poredak (Po roku, Po kolegiju): segmentni prekidač desno od naslova „Moji kolegiji”, stakleni prekidač. Po roku: popis zadataka sa skupinama Uskoro, Kasnije i Predano, redak kao redak zadatka u kartici. Po kolegiju: Figma mreža.
- Oznake u retku (produljeni rok, prvo pročitajte obavijest, blizu roka, probni zadatak): uz red roka, kao u Figmi „Produljeni rok”.
- „Dodaj rokove u kalendar” (.ics): tihi gumb u zaglavlju uz „+ Upiši kolegij kodom”.
- Obrazac koda na dnu ostaje samo u praznom stanju Z2, sa „Što slijedi nakon upisa?”. Inače ga zamjenjuje gumb u zaglavlju.

**S-02 K1 `/zadaci/kolegiji`.** Figma: zaglavlje i ista mreža kartica.
- Seminarska grupa i mentor zadatka: dodatni red u kartici, ispod nastavnika.
- Povijest produljenog roka (prethodni rok, razlog): otvara se ispod oznake „Produljeni rok”.

**S-04 R1 `/zadaci/radovi`.** Figma: zaglavlje, filtar (pretraga, akademska godina, Prikaži), popis radova (kolegij, godina, naslov, stanje, rok, radnja).
- Filtar Stanje: treće polje u istom redu filtra. „Poništi odabir” je tiha poveznica uz Prikaži.
- „Moj rad u brojkama”: ploča desno od popisa na 1440 (sadržaj 880 se dijeli u popis i ploču), a ispod popisa na 390.

**S-05 U1 `/upis`.** Figma pokriva sve funkcije: kartica upisa, kod, Upiši, svih 11 stanja. Treba samo crtanje u staklu.

**S-06 N1 `/zadatak/[id]`.** Figma: povratak, nadnaslov kolegija, zaglavlje (vrsta, opseg, rok), uporaba alata, što se bilježi, ne bilježi i vidi nastavnik, potvrda.
- „Ukratko” (dopušteno, Asistent, Moj tim, Recenzija radova): poveznice Moj tim i Recenzija idu u zaglavlje kao oznake ispod roka, a red o Asistentu u blok „Uporaba alata”.
- Tablica „Što se promijenilo (v1 → v2)”: stanje N8 je već nacrtano; tablica ide na vrh, ispod zaglavlja.
- Pravilo fakulteta na rasklapanje: Figma prikazuje cijeli tekst, na rasklapanje ostaje samo izvor.

**S-07 `/rad/[id]` (uređivač).** Figma E1 je mirni način pisanja: zaglavlje (povratak, naslov, kolegij, vrsta i rok, Predaja rada), list i statusna traka. Odluka: E1 je zadani izgled, a ostale funkcije su na dohvat, ne trajno otvorene.
- Zaglavlje: desno od naslova, uz Predaja rada (sa značkom), dolaze ikonski gumbi Pisanje ili Kako vidi nastavnik (stakleni prekidač), Povijest, Prečaci i izbornik Raspored. Bijeli ili tamni list ide u izbornik Prikaz.
- Alatna traka: plutajuća staklena traka iznad lista, a ne drugi red zaglavlja. Pokazuje se kad je pokazivač u listu, s istim izbornicima (Umetni, Pretvori, Prikaz, Izvezi, Više).
- Lijeva ploča Struktura i desna ploča (Izvori, Komentari, Pregled, Mentor, Asistent): staklene ploče koje se otvaraju ikonama na rubu (postojeći način „Ikone uz rub”), na 1440 zatvorene po zadanom. Postavke širine i izgleda ploča ostaju.
- Statusna traka: lijevo „Spremljeno na poslužitelju.” kao u Figmi, desno opseg i stranice tihim tekstom.
- Stanja E2 do E7 su nacrtana. Sukob, zadržani tekst i čarobnjak „Započnite rad” crtaju se kao stakleni Dialog.
- Slajdovi (V13), tablica (V14) i čitanje naglas (V20) slijede svoje Figma stranice.
- Nacrtano 28. 11.: radnje zaglavlja (na 390 u drugom redu „Prikaz”), plutajuća alatna traka (široka i uska varijanta), odjeljak E8 s otvorenim pločama (lijevo Struktura s Napretkom, Rokovima i Poviješću dokumenta; desno Izvori s Bilježnicom izvora) i odjeljak E9 sa staklenim dijalozima (Sukob, Kopija teksta, Započnite rad). Statusna traka pokazuje i opseg odabira.

**S-08 `/rad/[id]/predaja`.** Figma: koraci (Tekst, Izjava, Prije predaje, Predaja, Potvrda) i kartice.
- Izjava I1: Figma ima samo zabilježeno i potvrdu. Studentova izjava (vanjski alati, svrha, faza rada, ljudska pomoć), prilozi razgovora i pitanje nastavnika ulaze u karticu „Vaša izjava”, iznad gumba „Potvrđujem izjavu”.
- Potvrda K1: ispod bloka „Način unosa teksta” dolaze kartice Sačuvaj potvrdu (PDF s QR kodom), Prenosivi zapis (odluka vlasnika) i Moje predaje (povlačenje, potvrda povlačenja). Poveznice „Provjeri stanje predaje”, „Na početnu” i „Otvori radni prostor” idu na dno.
- Osporavanje događaja u sažetku procesa: unutar sklopivog „Sažetak procesa”.

**S-42 A1 `/rad/[id]/dnevnik-pristupa`.** Figma pokriva sve funkcije.

**Ekrani bez Figme, po uzoru**
- `/rad` (popis radnog prostora): po uzoru na S-04 R1, bez filtra.
- `/rad/[id]/podrijetlo`, `/reprodukcija`, `/nastavnik`, `/razgovor`: po uzoru na S-42 (naslov, „Natrag na rad”, sadržaj 880). Reprodukcija koristi kontrole kao N-10, a „Kako vidi nastavnik” list kao N-10 P8.
- `/zadaci/mentorstvo`: po uzoru na S-02 (zaglavlje, kartica „Moje mentorstvo”, kartica obrasca, popis zahtjeva kao popis S-04).
- `/zadaci/upitnici`, `/gradivo-kodiranja`, `/kodiranje`, `/kodiranje-izvoz`: V18.
- `/zadaci/dnevnik-prakse`, `/zadatak/[id]/tim`, `/recenzija`: V19.
- `/analiza`: V15.
- `/profil`, `/moja-prava`: po uzoru na S-42 (jedan stupac 880, kartice).
- Povijest dokumenta (odluka vlasnika): odjeljak u lijevoj ploči uređivača, uz postojeću „Povijest dokumenta”. Kod nastavnika ide u pregled rada.
- Bilježnica izvora: ulazi po istom načelu „treba sve”, kao kartica u desnoj ploči „Izvori”. Pretraga i „Nova bilješka” su u zaglavlju kartice, a „Umetni kao citat” u retku bilješke. Uključuje se u fazi koda, u zasebnom PR-u.
- Planer pisanja ostaje u odjeljku „Napredak” lijeve ploče, ispod traka napretka po poglavlju.

### Nastavnik

Svi nastavnički Figma ekrani imaju iznad sadržaja put (mrvice), na primjer „Početna / Moji kolegiji”. Na localhostu puta nema. Uvodi se kao dio Figma rasporeda, samo kod nastavnika, i nijednu funkciju ne zamjenjuje.

**N-00 H1 `/nastavnik`.** Figma: zaglavlje (naslov, opis s poretkom, gumb „Novi kolegij i zadatak”), za svaki kolegij odjeljak (naziv, godina, „Novi zadatak u kolegiju”), a u njemu retci zadataka (naslov, vrsta, rok, broj studenata, Brz put, Nova verzija).
- Prekinuta objava (nastavak započetog zadatka): obavijest ispod zaglavlja, kao kartica „Nastavak rada” kod studenta.
- Podaci kolegija (uloga, upisano, sljedeći rok, broj u doradi): jedan red tihog teksta ispod naziva i godine.
- Kod za upis (kopiraj, novi s rokom valjanosti, opozovi): na ovom ekranu ostaje samo gumb „Kod za upis”, koji otvara isti dijalog kao N-01 K4. Puni posao s kodovima je na N-01.
- Poveznice kolegija (Popis studenata, Zbirni pregled, Produljenje, Izvoz za Merlin, ISVU ocjene, Zbirno po kolegiju): tihi redak poveznica ispod zaglavlja odjeljka, uz „Novi zadatak u kolegiju”. ISVU ocjene dolaze tek kad ekran V22 bude izveden.
- Izbornik zadatka (Predaje, Uredi, Kopiraj, Produljenje, Izvoz): izbornik „Više” na kraju retka zadatka, iza „Nova verzija”, kao stakleni Popover. Brz put i Nova verzija ostaju vidljivi, kao u Figmi.
- Postavka ritma tipkanja: u izborniku „Više” kolegija, a otvara se kao dijalog.
- Nastavni tim i grupe, Upitnici (izrada, objava, zatvaranje, ručni unos, izvoz): sklopivi pododjeljci na dnu odjeljka kolegija, zatvoreni po zadanom, u izgledu Figma kartice.
- Stanja H2 do H6 su nacrtana.

**N-01 K1 `/nastavnik/kolegiji`.** Prema odluci vlasnika to je zaseban ekran, a ne preusmjeravanje. Figma: kolegiji po akademskoj godini, redak (naziv, AI pomoć, broj zadataka, Kod za upis) i dijalog K4 do K9.
- Izvodi se kao nova ruta s postojećim dijalogom koda. Funkcije koda prelaze ovamo, a na N-00 ostaje prečac.

**N-05 `/nastavnik/zadatak/novi`.** Figma: kartica kolegija, pet koraka (Osnovno, Rok i opseg, Pomoć, Što se bilježi, Pregled i objava), Nastavi ili Natrag, a na kraju „Objavi zadatak” i svi ishodi Z1 do Z20.
- Danas je obrazac na jednoj stranici, a Figma ga dijeli na korake. Polja ostaju ista, samo se raspoređuju po koracima: pravila predaje i jezik rada idu u korak 2, Asistent i alati u korak 3.
- Novi kolegij (kad nastavnik nema kolegija): korak 0 po uzoru na Z3 i Z4.

**`/nastavnik/zadatak/[id]/uredi`** (nema u Figmi): isti koraci kao N-05. Na vrhu je obavijest „Nova verzija” s poljem „Što se mijenja”. Pitanje uz izjavu ide u korak 4. „Kopiraj” je tihi gumb u zaglavlju.

**N-02 S1 `/nastavnik/kolegiji/[c]/studenti`.** Figma: naslov kolegija, prekidač „Prikaz” (Svi, grupe) i popis studenata sa stanjem po zadatku i poveznicom na rad.
- Poredak: drugi segmentni prekidač uz „Prikaz”.
- „Ukloni” i „Dopusti povratak”: izbornik „Više” u retku studenta, a potvrda je stakleni Dialog.

**N-03 M1 `/nastavnik/mentorstva`.** Figma: zaglavlje, kartica „Zahtjevi za mentorstvo” (Odobri, Odbij i dijalog odbijanja M6 do M9) i odjeljak „Radovi” (abecedno, Otvori rad).
- Novo mentorstvo: gumb u zaglavlju, a obrazac je stakleni Dialog.
- Moji studenti, pregled runde, dogovoreni zadaci, radne bilješke i vremenska crta: kad se otvori rad iz popisa, redak se rasklapa u karticu s tim blokovima. Etape i predložak su tu, kao Figma N-15 E1 do E3.
- ThesisPanel i WorksList čine Figma odjeljak „Radovi”.
- Dnevnik prakse: tiha poveznica u zaglavlju.

**`/nastavnik/mentorstva/dnevnik-prakse`, `/zadatak/[id]/timovi`, `/zadatak/[id]/recenzija`:** V19.

**N-08 B7 `/nastavnik/brz-put`.** Figma: odabir zadatka, mreža 230 px + 1fr (studenti po prezimenu, desno stanje, zadnja promjena, lijepljenja bez izvora, stanje zapisa, kartice Tekst rada i Sažetak procesa), Prethodni, Sljedeći, Otvori rad, dnevnik dorade. Figma pokriva sve funkcije.

**N-09 Z4 `/nastavnik/zbirni`.** Figma: zaglavlje, odabir zadatka, Prikaži, Produlji rok i tablica (Student, Stanje, Vrijeme predaje, Nakon roka, Stanje zapisa), poredak po stupcu.
- Kartice po zadatku (današnji prikaz bez tablice): stanje Z3, a nakon odabira tablica Z4.
- Filtri Stanje i Grupa: u istom redu kao odabir zadatka, kao filtar S-04.
- Radnje u retku (Otvori rad, Predaja): zadnji stupac tablice.

**`/nastavnik/kolegiji/[c]/zbirno`** (nema u Figmi): po uzoru na N-09, s anonimnim udjelima kao tablicom, grafikonom ispod nje i pragom kao napomenom ispod naslova.

**`/nastavnik/zadatak/[id]/predaje`** (nema u Figmi): po uzoru na N-09 Z4. Tablica predanih verzija; skupno preuzimanje (PDF, DOCX, ZIP) kao gumbi u zaglavlju; povijest i dopuštenje povlačenja u staklenom Dialogu retka.

**N-07 P1 `/nastavnik/zadatak/[id]/produljenje`.** Figma: kartica „Novo produljenje” (Za koga, Student, Novi rok, Razlog, Zabilježi) i kartica „Produljeni rokovi”. Iznimke idu u tablicu kao oznaka retka. Figma pokriva sve funkcije.

**N-06 M1 `/nastavnik/zadatak/[id]/merlin`.** Figma: zaglavlje, kartica „Popis (CSV)”, otisci i paket M5 do M12. Figma pokriva sve funkcije.

**N-04 P1 `/nastavnik/rad/[id]/predaja`.** Figma: potvrda (vrijeme, rok, verzija, otisak i međuspremnik, UTC na rasklapanje, sažetak procesa) i „Način unosa teksta”.
- PDF potvrde: gumb u zaglavlju, uz povratnu poveznicu „Rad uživo”.

**N-10 `/nastavnik/rad/[id]`.** Figma P8 i P10: ime studenta, Prethodni i Sljedeći rad, glavni stupac s tekstom i ljepljivi desni stupac (Sažetak procesa, Mentor, Stanje rada, Etape, Vremenska crta, Moji studenti) te dijalozi B5, B6, C6 do C8 i ploče A do D (Poruke).
- Slijed i dorada (okvir na vrhu): obavijest ispod imena, kao „Rad još nije predan.” u P8.
- Komentari na odabir, komentari i prijedlozi, banka i skice komentara, kriteriji, prijedlozi izmjene, promjene od zadnjeg pregleda, literatura, karta podrijetla, granice zapisa i izravne izmjene (samo za čitanje dok poslužitelj ne dopusti pisanje): dodatne sklopive ploče u istom desnom stupcu, ispod „Moji studenti”, svaka u izgledu Figma ploče. Zadano su otvorene Sažetak procesa i Stanje rada.
- Povijest dokumenta (odluka vlasnika): ploča u istom stupcu.
- Tablica i slajdovi: V14 i V13.
- Poveznice na Pregled, Konzultacije, Pripremu razgovora i Predaju: redak poveznica ispod imena studenta.

**`/nastavnik/rad/[id]/pregled`, `/reprodukcija`, `/sazetak`, `/usporedba`** (nema u Figmi): raspored N-10 P10. Kartice Tekst, Sažetak, Podrijetlo, Reprodukcija, Usporedba i Izjava su stakleni prekidač iznad glavnog stupca. Izvoz i ispis su gumbi u zaglavlju. Zasebne rute zadržavaju isti okvir.

**`/nastavnik/zadatak/[id]/rad/[d]/jezik`** (nema u Figmi): po uzoru na N-10, jedna kartica u glavnom stupcu.

**N-11 K8 `/nastavnik/rad/[id]/konzultacije`.** Figma: povratak, tablica zapisa, „Novi zapis konzultacije”, obrazac i dopune K9 do K22. Figma pokriva sve funkcije.

**N-14 P1 `/nastavnik/rad/[id]/priprema-razgovora`.** Figma: pet kartica, Izvezi PDF, Pošalji studentu poziv i stanja P2 do P4. Figma pokriva sve funkcije.

**`/nastavnik/zadatak/[id]/testovi`:** V21. **`/nastavnik/upitnici/[id]/izvoz`:** V18. **`/nastavnik/kolegiji/[c]/isvu-ocjene`:** V22. Danas se prikazuje samo naslov, pa je izvedba ekrana posebna stavka.

### Ustanova, operater i javno (sažeto)
- **Ustanova:** `/ustanova/kolegiji` prema U-01. Ostali ekrani ustanove imaju raspored U-01: zaglavlje, sadržaj 880 i kartice ili tablica. Pravila (verzije, razlika, objava) i čuvanje (klase, pravna zadržavanja) idu u kartice, a dijalozi su stakleni. `/postavke` ostaje mreža kartica s poveznicama. Prema odluci vlasnika od 27. 11. u navigaciju ustanove ulaze i `/postavke`, `/etape`, `/pragovi`, `/predlozak-rada` i `/zavrsni-radovi`. Dolaze kao druga skupina ispod razdjelnika, isto kao kod studenta.
- **Operater:** šest ekrana prema U-01, a stanje sustava prema J-01. Prema odluci vlasnika od 27. 11. navigacija operatera dobiva šest stavki: Mjerila pilota, Dnevnik radnji, Događaji, Prijave problema, Sigurnosni ključ i Stanje sustava.
- **Javno:** `/stanje` prema J-01, `/provjera` prema J-02. Naslovnica i prijava slijede koncept (DAN-1573) i ne dobivaju staklenu ljusku. Ostale javne stranice imaju raspored J-01.

## Odluke vlasnika
- 27. 11.: izgled iz Figme, a sve funkcije ostaju kakve su na localhostu. N-00 i N-01 smiju biti dva ekrana.
- 27. 11.: „treba sve”. Napravljeno, a nevidljivo, uključuje se.
- 27. 11.: ustanova dobiva pet stavki navigacije, a operater šest.

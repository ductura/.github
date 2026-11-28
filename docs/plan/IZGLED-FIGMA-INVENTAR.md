# Inventar funkcija po ruti (localhost 3001, wt-ostatak), 27. 11. 2026.

Podloga za [IZGLED-FIGMA.md](IZGLED-FIGMA.md). Sažeto iz izvještaja triju agenata.

## Student
- /zadaci (home/HomePage): uvod; kartica „Nastavak rada”; „Moji zadaci” s poretkom Po roku (Uskoro/Kasnije/Predano) i Po kolegiju; redak: radnja, oznake roka, produljeni rok, „Prvo pročitajte obavijest”, oznaka probnog zadatka; „Dodaj rokove u kalendar” (.ics); obrazac koda „Imate kod novog kolegija?”; prazno stanje s 3 koraka; greška, odjava, zabrana.
- /zadaci/kolegiji: kartica kolegija (godina, seminarska grupa, zadaci s vrstom i mentorom, poveznica na radnju), produljeni rok s poviješću; prazno, greška.
- /zadaci/radovi: filtar (pretraga, godina, stanje), popis radova sa stanjem, ploča „Moj rad u brojkama” (verzije, dani, dani do roka, poglavlja i koraci).
- /zadaci/mentorstvo: „Moje mentorstvo” (mentor, tema, vremenska crta); obrazac „Novi zahtjev” (nastavnik, vrsta rada); „Moji zahtjevi” (stanja, povlačenje, drugi mentor).
- /zadaci/upitnici: popis otvorenih, obrazac upitnika (5 vrsta pitanja), napomena o anonimnosti.
- /zadaci/dnevnik-prakse: moje prakse, novi zapis (datum, sati, opis), ispravak, zapisi po datumu, potpisi mentora.
- /zadaci/gradivo-kodiranja: moje gradivo (intervju/bilješka), pregled, brisanje, novo gradivo.
- /zadaci/kodiranje: šifrarnik (dodaj, gore/dolje, uredi, obriši), tekst gradiva po retcima, označavanje, označeni odlomci.
- /zadaci/kodiranje-izvoz: odabir gradiva, brojači po šifri, JSON i dva CSV-a.
- /upis: obrazac koda, ishodi. /upis/kolegij/[id]: preusmjerava na obavijest.
- /zadatak/[id]: „Ukratko” (rok, opseg, dopušteno, Asistent, Moj tim, Recenzija), „Prije prve rečenice”, tablica promjena verzija, pravilo FPZG čl. 8, što se bilježi/ne bilježi/vidi nastavnik, potvrda i „Potvrdi i otvori editor”; poslije potvrde sažeto; još nije otvoren; nova verzija.
- /zadatak/[id]/tim: moj tim, osnuj, pridruži se, članovi, napusti, tablica zabilježenog.
- /zadatak/[id]/recenzija (+ rad, primljene): radovi za recenziju, obrazac recenzije s kriterijima, primljene recenzije.
- /rad/[id] (uređivač): gornja traka (natrag, naslov, kolegij/vrsta/rok, bijeli/tamni list, Predaja rada sa značkom); Pisanje / Kako vidi nastavnik; Prečaci; Povijest; izbornik Raspored; alatna traka (stil, oblikovanje, Umetni, Pretvori, posebni znak, Prikaz, Izvezi, Više, veličina, mobilni brzi alati); lijeva ploča Struktura (stanja poglavlja, radnje, Zahtjevi, Prikazi i fusnote, Odloženo, Napredak, Rokovi, Nit rada, Povijest dokumenta); desna ploča (Izvori, Komentari, Pregled: Nacrt s čitanjem naglas, Pojmovnik, Provjere, Oblik rečenica; Mentor; Asistent; Način fokusa); traka stanja (spremanje, opseg, stranice); sukob, bez mreže, čarobnjak „Započnite rad”, predano samo za čitanje, slajdovi i tablica.
- /rad/[id]/predaja/izjava: zabilježeno u Ducturi, vaša izjava (alati, svrha, faza, ljudska pomoć), prilozi razgovora, pitanje nastavnika, potvrda, Dalje/Natrag, ispravak nakon predaje.
- /predaja/pregled, /predaja/slanje: prije predaje, rok i kašnjenje, slanje.
- /predaja/potvrda: predano kada, što je predano, otisak, točna vremena UTC, sažetak procesa, PDF s QR kodom, provjera stanja, moje predaje i povlačenje.
- /rad/[id]/dnevnik-pristupa, /reprodukcija, /podrijetlo, /razgovor, /nastavnik; /rad (popis); /profil; /moja-prava; /analiza.

## Nastavnik
- /nastavnik: Moji kolegiji; „Novi kolegij i zadatak”; prekinuta objava; kartica: uloga, upisano, sljedeći rok, zadaci, dorada; kod za upis (kopiraj, novi s rokom valjanosti, opozovi); poveznice Popis studenata, Dodaj zadatak, Zbirni pregled, Brz put, Produljenje, Izvoz za Merlin; izbornik zadatka (Predaje, Uredi, Kopiraj, Produljenje, Izvoz); ritam tipkanja; Nastavni tim i grupe; Upitnici (izrada, objava, zatvaranje, ručni unos, izvoz). /nastavnik/kolegiji preusmjerava.
- /nastavnik/brz-put: odabir zadatka, prethodni/sljedeći, stanje, zadnja promjena, lijepljenja bez izvora.
- /nastavnik/zbirni: kartica po zadatku, tablica predaja, filtri stanje/grupa, radnje.
- /nastavnik/mentorstva: zahtjevi (odobri/odbij), novo mentorstvo, moji studenti, pregled runde, etape i predložak, dogovoreni zadaci, radne bilješke, vremenska crta, ThesisPanel, WorksList, poveznica na dnevnik prakse.
- /mentorstva/dnevnik-prakse: prakse, započni praksu, zapisi, potpis do datuma, povijest potpisa.
- /kolegiji/[id]/studenti: filtri, poredak, stanje po zadatku, ukloni/dopusti povratak.
- /kolegiji/[id]/zbirno: anonimni udjeli, grafikon, prag.
- /kolegiji/[id]/isvu-ocjene: ocjene 1–5, pregled, potvrda i slanje.
- /zadatak/novi: obrazac (osnovno, rok i opseg, Asistent i alati, pravila predaje, što se bilježi), pregled i objava.
- /zadatak/[id]/uredi: nova verzija, što se mijenja, jezik rada, pravila predaje, pitanje uz izjavu, kopiraj.
- /zadatak/[id]/predaje: tablica predanih verzija, modal, skupno preuzimanje PDF/DOCX/ZIP, povijest, dopuštenje povlačenja.
- /zadatak/[id]/produljenje: novo produljenje (jedan/svi, rok, razlog), popis, iznimke.
- /zadatak/[id]/merlin: CSV popis, otisci, paket.
- /zadatak/[id]/recenzija: postavka kruga, kriteriji, dodjela, povlačenje.
- /zadatak/[id]/testovi: testovi JSON, pregled kako vidi student.
- /zadatak/[id]/timovi: postavka tima, timovi, studenti bez tima.
- /zadatak/[id]/rad/[doc]/jezik: jezik jednog rada.
- /rad/[id]: okvir (prethodni/sljedeći, slijed, dorada), tekst uživo, komentari na odabir; ploče: mentor, izravne izmjene, komentari i prijedlozi, banka i skice komentara, kriteriji, prijedlozi izmjene, promjene od zadnjeg pregleda, literatura, sažetak procesa, karta podrijetla, granice zapisa; tablica i slajdovi.
- /rad/[id]/pregled: kartice Tekst, Sažetak, Podrijetlo, Reprodukcija, Usporedba, Izjava; stanje zapisa, sastav teksta, važna mjesta, AI, izvoz i ispis.
- /rad/[id]/predaja: vrijeme, rok, verzija, otisak, provjera, PDF.
- /rad/[id]/konzultacije, /priprema-razgovora, /reprodukcija, /sazetak, /usporedba.
- /upitnici/[id]/izvoz: prag, pitanja, slobodni tekst, JSON/CSV.

## Ljuska (SideShell)
- Bočna navigacija po ulozi. Student: Moji zadaci, Moji kolegiji, Moji radovi, Radni prostor, Upis u kolegij, Upitnici, Gradivo za kodiranje, Izvoz kodiranja, Dnevnik prakse. Nastavnik: Moji kolegiji, Brz put, Radovi uz mentora, Zbirni pregled. Ustanova: 7 stavki. Operater: bez stavki.
- U navigaciji nema: studentu /zadaci/mentorstvo, /analiza, /moja-prava; ustanovi /postavke, /etape, /pragovi, /predlozak-rada, /zavrsni-radovi.
- Podnožje: ustanova, Obavijesti (zvono, popis), Kako Ductura radi, Izjava o pristupačnosti, Prijavi problem (dijalog), tema, Postavke profila, Odjava (dijalog, i iz svih sesija).
- Nema gornje trake ni puta (breadcrumbs).
- Stanja: učitavanje, provjera sesije nije uspjela, bez uloge, stranica ne postoji.

## Ustanova, operater, javno (sažeto)
- /ustanova pregled (brojke), korisnici (potvrdi/opozovi ulogu), kolegiji (godina, grupe, novi kolegij), pravila (pravilo na snazi, verzije, razlika, objava; postavke ustanove), cuvanje (klase, pravna zadržavanja), izvoz-podataka (zahtjev, provjera identiteta, popis), isvu (probni izvor, CSV uvoz), postavke (kartice s poveznicama), postavke/asistent, etape (predložak etapa), pragovi, predlozak-rada, zavrsni-radovi (tablica, povjerenstvo).
- /operater: mjerila-pilota, dnevnik-radnji, dogadaji, prijave-problema, sigurnosni-kljuc, stanje-sustava.
- Javno: /naslovnica, /prijava (stanja), /ulaz/studomat, /provjera, /stanje, /analiza (čarobnjak u 3 koraka), /kako-radi, /o-aplikaciji, /pristupacnost, /nema-ovlasti (3 vrste), /izvoz-podataka/[token], /[...path].

## Specifikacija: Ductus docs/design/EKRANI.md (brojevi se razlikuju od Figme)
Student: S-01 Prijava, S-02 Početna, S-03 Moji kolegiji, S-04 Upis, S-05 Obavijest, S-06 Planer rada, S-07 Pravopis, S-08 DOI/ISBN, S-09 PDF izvori, S-10 Editor (+10.1–10.7), S-11 Upute i provjera oblika, S-12 Komentari studenta, S-13 Literatura i bilježnica, S-14 Struktura, S-15 Panel Rad, S-16 Asistent, S-17 Kako vidi nastavnik, S-18 Vlastita povijest (uvjet U-5), S-19 Uvoz, S-20 Izvoz A4, S-30 Pregled prije predaje, S-31 Izjava, S31-AI, S-32 Potvrda, S-33 Sažetak procesa, S-34 Reprodukcija, S-40 Komentari na mobitelu, S-41 Obavijesti, S-42 Dnevnik pristupa, S-43 Napomene i osporavanje, S-44 Izvoz vlastitih podataka, S-45 Prvi ulazak i vodič, S-46 Paket zaštite (U-5), S-47 Moj rad u brojkama.
Nastavnik: N-01 Moji kolegiji, N-02 Novi kolegij i zadatak, N-03 Čarobnjak zadatka, N-04 Popis studenata, N-05 Brz put, N-06 Rad uživo, N-07 Pregled rada, N-08 Komentari/prijedlozi/dorada, N-09 Reprodukcija, N-10 Sažetak i karta podrijetla, N-11 Usporedba, N-12 Konzultacije, N-13 Produljenje, N-14 Priprema za razgovor (U-3), N-15 Etape/rubrika/ocjena (U-2, ne gradi se u M6), N-16 Radovi uz mentora, N-17 Zbirni, N-18 Izvoz i Merlin, N-19 AI pomoć nastavniku (prijedlog, ne gradi se), N-AI-ATT.

# Priručnik za administratora ustanove

Stanje: 26. 11. 2026. Opisuje samo ono što postoji na migracijskim bazama WEB (`migracija/kopija-ductus-front`) i SRV (`migracija/kopija-ductus-backend`). Što još ne radi, označeno je **u izradi**. Svi primjeri koriste izmišljene podatke.

## 1. Vaša uloga

Administrator ustanove (koordinator, odluka A-5) je osoba koja:

- potvrđuje i opoziva **ulogu nastavnika** na ustanovi;
- vidi **brojke ustanove** i popis kolegija (bez radova studenata);
- vidi i podešava **pravila fakulteta** (predlošci, etape, pragovi);
- prima **prijave problema** vezane uz račune i upute;
- pokreće **izvoz podataka studenta** po zahtjevu referade.

Administrator **ne vidi sadržaj studentskih radova**. Pojedine osobe i kolegiji u pregledu ustanove ne prikazuju se imenom.

## 2. Prijava

Isključivo AAI@EduHr. Račun administratora ustanova imenuje kroz postupak imenovanja administratora. Ako se prijavite, a prostor se ne otvara, račun još nema ulogu.

Navigacija: **Pregled ustanove**, **Korisnici**, **Kolegiji**, **Pravila fakulteta**, **Čuvanje podataka**, **Izvoz podataka studenta**.

## 3. Pregled ustanove

Brojke samo za vašu ustanovu, računaju se pri otvaranju stranice:

- potvrđeni nastavnici;
- čekaju potvrdu uloge (zadnja prijava preko AAI@EduHr dala je pravo nastavnika);
- nastavnici bez prava pri zadnjoj prijavi (uloga ostaje potvrđena);
- kolegiji;
- studenti (upisani u barem jedan kolegij, svaka osoba jednom).

## 4. Korisnici i uloge (potvrda nastavnika)

Tu radite najvažniji posao prije probe.

1. Otvorite **Korisnici**. Dva popisa: „Čekaju potvrdu uloge” i „Potvrđeni nastavnici”.
2. Osoba se pojavi u prvom popisu nakon prijave koja joj daje pravo nastavnika.
3. Kliknite **Potvrdi ulogu**. U prozoru pročitajte posljedice: osoba može stvarati kolegije i zadatke; ulogu možete opozvati; potvrda se upisuje u revizijski trag s vama kao izvršiteljem.
4. **Opozovi ulogu**: od sljedećeg zahtjeva osoba više ne radi kao nastavnik. Kolegiji i zadaci ostaju. Ako je nositelj kolegija, ostaje upisan dok ga netko ne zamijeni.
5. Oznaka **Za pregled** znači da zadnja prijava nije dala pravo nastavnika. Uloga nije opozvana dok vi ne odlučite.
6. Ako veza pukne prije odgovora, piše da je ishod nepoznat. Kliknite **Provjeri stanje** prije novog pokušaja.

## 5. Kolegiji

**Kolegiji i akademske godine:** kolegiji ustanove po godini, s nastavnim timom, nositeljem i seminarskim grupama, brojem upisanih. Samo čitanje. Kolegij stvara nastavnik s potvrđenom ulogom.

## 6. Pravila i postavke fakulteta

- **Pravila fakulteta:** polazno pravilo za svaku vrstu rada i sve objavljene verzije. Objavljena verzija se ne mijenja; nova verzija dolazi uz nju. Nastavnik na kolegiju smije pravilo AI-ja pooštriti ili ublažiti.
- **Postavke fakulteta:** jedno mjesto za pravila, pragove i čuvanje podataka. Ovdje se samo čita; promjene se rade na karticama.
- **Pragovi po vrsti podrijetla:** za svaku vrstu podrijetla teksta fakultet može upisati prag u postotcima. Nema zadanih pragova; vrsta bez praga nema oznaku.
- **Predložak etapa:** novo mentorstvo dobiva etape iz zadnje spremljene verzije. Promjena se sprema kao nova verzija.
- **Predložak rada:** naslovna stranica i kostur odjeljaka po vrsti rada. Isto verzioniranje.
- **Postavke asistenta:** samo čitanje; asistent je u pilotu isključen.

## 7. Čuvanje podataka i izvoz

- **Čuvanje podataka:** razredi podataka i pravne zadrške.
- **Izvoz podataka studenta:** referada traži izvoz za pojedinog studenta, a vi ga pokrećete. Student dobiva jednokratnu poveznicu za preuzimanje (poveznica je jedini ključ).
- **Moja prava:** javna pomoć koju vidi svaki prijavljeni korisnik.

## 8. Prijave problema i dnevnik radnji

- **Prijave problema:** studentske prijave usmjerene onome tko ih rješava. Vama dolaze prijave o prijavi AAI@EduHr i o uputama ili roku, ovisno o kategoriji (vidi [POMOC.md](POMOC.md)).
- **Dnevnik radnji:** zapis radnji administratora.

## 9. Probno povezivanje s ISVU-om

Povezivanje s ISVU-om je **probni izvor** (popis studenata). Ne oslanjajte se na njega za stvarne upise u pilotu: **u izradi**.

## 10. Što još ne radi (u izradi)

- AI pomoćnik je u pilotu isključen.
- Obavijesti e-poštom: odgođeno do nakon pilota.
- Sa stvarnim studentima ništa ne kreće prije pravnog mišljenja i DPIA; do tada samo proba s izmišljenim podacima.
- Ekran koji piše „Ovaj prikaz još nije spojen na poslužitelj ustanove” u izradi je.

## 11. Kontrolni popis prije probe

1. Račun administratora se prijavljuje i vidi „Pregled ustanove”.
2. Nastavnički računi probe potvrđeni u „Korisnici”.
3. Kolegiji i kodovi za upis pripremljeni (kodove izdaje nastavnik).
4. Pravila fakulteta za vrste rada objavljena.
5. Zna se kome idu prijave problema (POMOC.md, odjeljak 3).

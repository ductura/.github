# Politika privatnosti Ducture (nacrt)

> **PRIJEDLOG — konačno odlučuju Daniel i pravnik.** Nacrt nije pravni savjet ni pravno mišljenje. Opisuje što kod i planovi rade, ne ocjenjuje zakonitost. Sva mjesta označena **[PRAVNIK]** čekaju pravnika. Stanje izvora: `ductura/Institution_server`, grana `migracija/kopija-ductus-backend`, 26. 11. 2026.

## 1. Tko obrađuje podatke

- Voditelj obrade: **[PRAVNIK]** fakultet/ustanova koja uvodi Ducturu, ili Ductura kao samostalni voditelj, po svakoj obradi (vidi EVIDENCIJA-OBRADA.md). Naziv, adresa i kontakt: **[PRAVNIK: upisati]**.
- Službenik za zaštitu podataka ustanove: **[PRAVNIK: upisati kontakt]**.
- Ductura djeluje kao izvršitelj obrade ustanove ondje gdje to potvrdi pravnik (UGOVOR-O-OBRADI-FAKULTET.md).

## 2. Koje podatke obrađujemo i zašto

| Skupina | Podaci | Svrha | Pravna osnova |
|---|---|---|---|
| Prijava | identifikator iz AAI@EduHr (`hrEduPersonUniqueID`), oznaka ustanove, ime i prezime, sesije. E-pošta i OIB se ne preuzimaju. | prijava, odjava, zaštita sesije | **[PRAVNIK]** |
| Nastava | kolegiji, članstvo, uloge, mentorstva, zadaci, pravila fakulteta, obavijesti | organizacija nastave | **[PRAVNIK]** |
| Rad studenta | tekst rada, revizije, kontrolne točke, odsječci evidencije nastanka, potvrde i sažetci (hash) | pisanje i dokaz nastanka rada | **[PRAVNIK]** |
| Predaja i povratna informacija | predani rad, potvrda predaje, komentari, zahtjevi za doradu | predaja i ocjena | **[PRAVNIK]** |
| Zapis pristupa | tko je i kada čitao rad (nastavnik, mentor) | transparentnost prema studentu | **[PRAVNIK]** |
| Tehnički zapisi | događaji prijave i rada sustava, skraćene IP adrese (/24, /48) **[provjeriti što se sprema]** | sigurnost i rad sustava | **[PRAVNIK]** |
| Prijava problema | opis problema i zatvoreni tehnički kontekst, bez teksta rada | podrška | **[PRAVNIK]** |
| AI pomoćnik | odlomak koji student sam pošalje, izjava o pomoći AI-ja | pomoć pri pisanju | **[PRAVNIK]**; za prave studente isključen dok nema pravnog mišljenja (C15, C16) |
| Evaluacija pilota | ankete, razgovori | ocjena pilota | **[PRAVNIK]** |

Ductura ne koristi podatke za oglašavanje i ne prodaje ih. Oznake o izvoru teksta, ritmu unosa i podudaranju s AI odgovorom nisu dokaz autorstva, ne blokiraju predaju i ne ulaze u ocjenu (Ustav C-6).

## 3. Primatelji

Nastavnik zadatka, mentor i administrator ustanove vide samo ono što im odnos prema radu dopušta. Izvršitelji (hosting, pohrana, AI pružatelj) navedeni su u EVIDENCIJA-OBRADA.md; nijedan još nije ugovoren (stanje 22. 11. 2026., `DPIA-OBRADE.md`).

## 4. Prijenos izvan EU-a

Baze su predviđene u Frankfurtu (Render). Matične grupe izvršitelja i prijenos preko AI pružatelja ocjenjuje pravnik (DPIA-OPENAI.md). **[PRAVNIK]**

## 5. Rokovi čuvanja

Određen je samo rok sesija (30 dana nakon kraja). Ostalo je prijedlog (ROKOVI-CUVANJA.md). Tekst politike ne smije objaviti rok koji nije potvrđen.

## 6. Prava ispitanika

Pristup, ispravak, brisanje, ograničenje, prigovor i prenosivost (čl. 15. do 22.). Student u aplikaciji može zatražiti izvozni paket svojih podataka (24 sata valjanosti poveznice, D-273). Ostvarivanje prava prema ustanovi: **[PRAVNIK: postupak i rok odgovora]**. Pritužba nadzornom tijelu: Agencija za zaštitu osobnih podataka (AZOP).

## 7. Kolačići

Vidi KOLACICI.md.

## Otvorena pitanja za pravnika

1. Voditelj ili izvršitelj, po obradi; tko je kontakt prema ispitaniku.
2. Pravna osnova svake obrade (O-1 do O-16).
3. Maloljetni studenti i dob za AI pomoćnika.
4. Jesu li hashevi i potvrde osobni podatak i koliko se čuvaju.
5. Obavijest o automatiziranom pregledu ("za pregled"): potpada li pod čl. 22.
6. Točan tekst za zapis pristupa i vrijeme po promjeni (D-55, D-142, D-143).

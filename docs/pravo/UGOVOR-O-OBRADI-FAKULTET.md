# Ugovor o obradi osobnih podataka s fakultetom, čl. 28. GDPR (nacrt)

> **PRIJEDLOG — konačno odlučuju Daniel i pravnik.** Nacrt nije pravni savjet ni pravno mišljenje. Opisuje što kod i planovi rade, ne ocjenjuje zakonitost. Sva mjesta označena **[PRAVNIK]** čekaju pravnika. Stanje izvora: `ductura/Institution_server`, grana `migracija/kopija-ductus-backend`, 26. 11. 2026.

Predložak za ugovor između fakulteta (voditelj) i Ductura (izvršitelj). Uloge nisu potvrđene: ako pravnik zaključi da je Ductura samostalni voditelj za neku obradu, ta se obrada izuzima. Nazivi stranaka, OIB-ovi i potpisnici: **[PRAVNIK: upisati]**.

## 1. Predmet i trajanje

Ductura obrađuje osobne podatke za fakultet isključivo radi pružanja usluge pisanja, evidencije nastanka i predaje radova. Trajanje: **[PRAVNIK]** (pilot, pa produljenje). Obrade, kategorije podataka i ispitanici su u Prilogu 1 (EVIDENCIJA-OBRADA.md, O-1 do O-18).

## 2. Obveze izvršitelja (čl. 28. st. 3.)

1. Obrada samo prema dokumentiranim uputama fakulteta.
2. Osobe ovlaštene za obradu vezane su povjerljivošću.
3. Mjere sigurnosti iz Priloga 2 (pristup iz odnosa, RLS, revizijski trag, šifriran prijenos, tajne izvan repozitorija).
4. Podizvršitelji: samo uz prethodno odobrenje fakulteta; popis u Prilogu 3; obavijest o promjeni **[PRAVNIK: rok za prigovor]**. Isti uvjeti prenose se na podizvršitelja.
5. Pomoć fakultetu pri zahtjevima ispitanika (pristup, ispravak, brisanje, izvoz).
6. Pomoć pri sigurnosti, obavijesti o povredi (**[PRAVNIK: rok, npr. bez odgode i najkasnije u dogovorenom roku]**), DPIA i prethodnom savjetovanju.
7. Brisanje ili vraćanje podataka po prestanku usluge, uključujući kopije, u roku iz ROKOVI-CUVANJA.md.
8. Dostava informacija za dokazivanje usklađenosti i omogućavanje revizije.

## 3. Prijenos izvan EU/EEA

Zadani smještaj: Frankfurt. Svaki prijenos (matične grupe izvršitelja, AI pružatelj) traži odobrenje fakulteta i pravni mehanizam (SCC ili odluka o primjerenosti): **[PRAVNIK]**.

## 4. AI pomoćnik

Obrada preko OpenAI-ja nije obuhvaćena dok fakultet ne potvrdi DPIA-OPENAI.md i pravno mišljenje; za prave studente ostaje isključena (C15, C16).

## 5. Odgovornost, nadzor, raskid

Odgovornost i naknada štete: **[PRAVNIK]**. Mjerodavno pravo i nadležnost: **[PRAVNIK]**.

## Prilozi

- **Prilog 1:** opis obrade (EVIDENCIJA-OBRADA.md).
- **Prilog 2:** tehničke i organizacijske mjere.
- **Prilog 3:** podizvršitelji: Render, Vercel, pružatelj S3, AWS KMS, OpenAI (uvjetno), status svakog u EVIDENCIJA-OBRADA.md §3.

## Otvorena pitanja za pravnika

1. Je li Ductura izvršitelj za sve obrade ili samostalni voditelj za neke.
2. Je li Srce (AAI@EduHr) izvršitelj, zasebni voditelj ili primatelj.
3. Rokovi: obavijest o povredi, prigovor na podizvršitelja, brisanje po raskidu.
4. Pravni mehanizam za prijenos preko matičnih grupa izvršitelja.
5. Jedan ugovor po fakultetu ili okvirni ugovor s prilogom po fakultetu.

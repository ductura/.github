# Prijedlozi 26. 11. 2026.: nove sesije i teme prije probe

**Izvor:** Daniel je 26. 11. u Graditelj sesiji odobrio Graditeljev prijedlog („doslovno ti napravi sve što si mi rekao, pošalji te pisa koji si rekao…”). Nalog je Ductus#2055 c.7182294468. Odobrenje je proslijedio Graditelj. Orkestrator ga je primijenio unutar postojećih granica: bez deploya, bez staginga prije F4, bez spajanja u `main`, samo izmišljeni podaci.

**Zašto:** od 955 zadataka 882 je spojeno, ali A01–A10 još nisu izvršeni na stvarnom stogu. Od 26. 11. vlakovi ulaze bez pregleda prije spajanja.

## Sesije

| ID | Tko | Stanje | Napomena |
|---|---|---|---|
| PRIHVAT-A01-A10 | graditelj, lokalno | radi | Tablica PROLAZ/PAD/NEPROVEDENO je na #2052. Svaki PAD postaje zadatak za oblak. |
| REGRESIJA-BAZE-WEB / -SRV | oblak, jednokratno po vlaku | pokreće se | Nakon svakog SPOJENO iz `vlak-auto`: puni e2e i `test:sistem` na bazi. PAD se javlja s commitom vlaka. Nije cron. |
| SIGURNOST-KUMULATIVNO | oblak | uvjetno | Nalazi idu samo u privatni `ductura/sigurnosni-nalazi`. Kreće tek kad pisac ima taj izvor. Priprema F4-PREGLED-SRV/WEB. |
| PRAVO-PRIVATNOST | oblak, samo dokumenti | pokreće se | Nacrti: politika privatnosti, uvjeti korištenja, kolačići, evidencija obrada, ugovor o obradi s fakultetom, rokovi čuvanja i DPIA za OpenAI. To su prijedlozi; konačno odlučuju Daniel i pravnik. Preduvjet za D7. |
| PILOT-KORISNICI | oblak, samo dokumenti | pokreće se | Priručnici za studenta, nastavnika i admina ustanove, česta pitanja, kanal za pomoć i scenarij probe 22. 2. 2027. s demo-* računima. |

## Teme

| ID | Stanje | Razlog |
|---|---|---|
| JEZIK-POJMOVNIK | pokreće se | Pojmovnik i popis nalaza lekture. Izmjena teksta sučelja je poseban zadatak. |
| F5-LICENCE | ranije (`drzi` maknut) | Popis licenci i ranjivosti, bez izmjene koda. |
| Q-10 u STANJE.md | uz .github#103 i #95 | P-1/D-316 su u #103. STANJE.md uskladiti nakon spajanja tih PR-ova. |
| OPS-NADZOR | samo prijedlog | Dokument s usporedbom alata. Izbor alata i nove rute odlučuje Daniel. |
| OPS-OPTEREĆENJE | zadržano | Treba staging, a staging tek nakon F4. Scenarij se smije napisati unaprijed. |
| P-OPORAVAK ranije | zadržano | Kreće čim staging radi (P-STAGING). |
| WCAG ručno (DAN-428/755) | zadržano | Chrome provjeru radi Graditelj, odmah iza A01–A10. |
| Arhiviranje starih sesija | samo popis | Orkestrator složi popis. Ništa se ne gasi bez Danielovog „da”. |

Granice: bez deploya, bez spajanja u `main`, tajne upisuje samo Daniel.

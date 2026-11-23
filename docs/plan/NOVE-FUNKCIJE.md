# Nove funkcije: pregled dio po dio

Danielova odluka 23. 11. 2026. („Može da”): uz paritet s prototipom detaljno pregledati može li svaki dio aplikacije dobiti dodatne funkcije, dio po dio.

## Pravila

- Pregled je samo dokumentacija (`docs/nalazi/nove-funkcije-<dio>.md` u Institution_front_web_chrome); kod se ne mijenja.
- Gradnja nekog dijela čeka da paritet tog dijela bude zatvoren (V3-VIZ, uvjet 6).
- Prototip ostaje izvor istine. Prijedlog koji Daniel stavi „za pilot” najprije ulazi u prototip i INVENTAR, tek onda postaje zadatak u redu.
- Rok funkcija pilota (15. 1. 2027.) se ne pomiče zbog novih funkcija; što ne stane, ide „nakon pilota”.
- Server se ne izmišlja: prijedlog koji traži novo API polje to izričito navodi.

## Dijelovi i redoslijed

| # | Dio | Zadatak | Stanje |
| --- | --- | --- | --- |
| 1 | Student: zadaci, obavijesti, upis | NF-1 | Odlučeno 23. 11. |
| 2 | Radni prostor i editor | NF-2 | Odlučeno 23. 11. |
| 3 | Predaja i potvrda | NF-3 | U radu |
| 4 | Nastavnik: kolegiji i zadaci | NF-4 | Čeka NF-3 |
| 5 | Nastavnik: pregled rada, sažetak, karta podrijetla, reprodukcija | NF-5 | Čeka NF-4 |
| 6 | Mentorstvo i konzultacije | NF-6 | Čeka NF-5 |
| 7 | Operater i administracija | NF-7 | Čeka NF-6 |

Dijelovi idu jedan po jedan, da Daniel svaki pročita i odluči prije sljedećeg.

## Sadržaj svakog pregleda

1. Što korisnik u tom dijelu radi od početka do kraja (koraci, ekrani, stanja), prema prototipu, INVENTAR-u i aplikaciji danas.
2. Gdje zapinje: suvišni koraci, nejasna stanja, pristupačnost, rad na mobitelu, greške i oporavak.
3. Što nude slični alati (opisno, bez kopiranja tuđeg izgleda) i što traže pilot, privatnost i pravila o AI izjavi.
4. Numerirani prijedlozi: opis, korist, veličina (S/M/L), rizik, treba li server, dodiruje li prototip.
5. Popis za Danielovu odluku: svaka stavka „za pilot”, „nakon pilota” ili „ne”.

## Nakon pregleda

Orkestrator Danielove odluke upisuje u ovaj dokument; stavke „za pilot” idu najprije kao izmjena prototipa i INVENTAR-a, zatim kao zadaci u redu. Sljedeći dio kreće kad Daniel odluči o prethodnom.

## Odluke

### NF-1, student (23. 11. 2026.)

Pregled: `docs/nalazi/nove-funkcije-1-student-zadaci.md` (WEB #551). Daniel: „Ja bih sve u pilot.”

Svih 17 prijedloga (P-1 … P-17) ide u pilot, uključivo i one koje je pregled preporučio za „nakon pilota” (P-2, P-5, P-6, P-7, P-14, P-16).

Daniel 23. 11. („1. A 2. Da, neka uđe u pilot.”):

- P-9: varijanta (a). Prije potvrde ništa se ne bilježi; automatski `notice-read` pri učitavanju se uklanja, kao u prototipu.
- P-17 (obavijest e-poštom ili push) ulazi u pilot. Time Daniel mijenja odluku 2147 za ovaj kanal; izvedba ide kroz pregled privatnosti (sadržaj obavijesti bez osobnih podataka iz rada, pristanak i odjava).

Otvoreno prije gradnje:

- P-6 i P-16 traže serverske zadatke (`submittedAt`, nova ruta za verzije obavijesti); P-1 i P-2 traže provjeru stvara li server zapise `deadline_reminder` i `assignment_version`.
- P-7 (povijest produljenja s razlogom) ide kroz pravni pregled teksta.

Redoslijed: najprije izmjene prototipa i INVENTAR-a za studenta, zatim zadaci u redu; gradnja čeka zatvaranje pariteta studenta (PAR2-S).

### NF-2, radni prostor i editor (23. 11. 2026.)

Pregled: `docs/nalazi/nove-funkcije-2-radni-prostor-editor.md` (WEB #555). Daniel: „Sve u pilot. 1. Da 2. Da 3. Uz prvi rad 4. Da 5. U pilotu”.

Svih 26 prijedloga (P-1 … P-26) ide u pilot, uključivo i one koje je pregled preporučio za „nakon pilota”: P-12 (izjava o AI-ju kao dijalog u editoru, odluka 2165), P-3 u cijelosti (odluka o sukobu verzija u sučelju, ne samo tekst), P-19 (uvoz DOCX/PDF), P-24 (stilovi citiranja po ustanovi), P-25 (tablica, slika, formula; shema v4) i P-26 (poruka o drugom uređaju).

Odgovori na pitanja pregleda:

1. Asistent (OC-1) je u pilotu isključen. Kartica Asistent (P-9, P-10) prikazuje pravila uporabe alata iz zadatka i iskreno stanje, a ne pomoćnika.
2. Numerirani popis (G-6) ulazi u pilot; ne čeka shemu v3.
3. Vodič „Prvi koraci” (P-20) prikazuje se uz prvi rad.
4. „Predaja rada” i prebacivač lista u zaglavlju editora (WEB-23) su potvrđeni i upisuju se u INVENTAR-editor §1.2.
5. Zapisnik konzultacija i „Dokle sam stao” ulaze u pilot; pojedinosti (privatni ili zajednički zapis) dolaze s NF-6.

Otvoreno prije gradnje:

- Serverske rute: sukob verzija (P-3), zatražene potvrde i izvori za studenta (P-8), dohvat DOI/ISBN (P-7), stanje izjave s poslužitelja (P-11); provjeru radi orkestrator, a nedostajuće rute postaju SRV zadaci.
- P-25 (shema v4) i P-19 (uvoz) su velike stavke; ako ugroze rok 15. 1. 2027., orkestrator to javlja Danielu prije nego što ih odgodi.

Redoslijed: najprije izmjene prototipa i INVENTAR-a za editor (NF-2-PROTO), zatim zadaci u redu; gradnja čeka zatvaranje pariteta editora (PAR2-E).

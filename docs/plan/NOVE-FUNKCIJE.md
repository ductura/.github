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
| 3 | Predaja i potvrda | NF-3 | Odlučeno 23. 11. |
| 4 | Nastavnik: kolegiji i zadaci | NF-4 | Odlučeno 23. 11. |
| 5 | Nastavnik: pregled rada, sažetak, karta podrijetla, reprodukcija | NF-5 | U radu |
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

1. ~~Asistent (OC-1) je u pilotu isključen.~~ **Promijenjeno 23. 11. uz NF-4:** asistent u pilotu radi (vidi odjeljak NF-4). Kartica Asistent (P-9, P-10) uz pomoćnika i dalje prikazuje pravila uporabe alata iz zadatka.
2. Numerirani popis (G-6) ulazi u pilot; ne čeka shemu v3.
3. Vodič „Prvi koraci” (P-20) prikazuje se uz prvi rad.
4. „Predaja rada” i prebacivač lista u zaglavlju editora (WEB-23) su potvrđeni i upisuju se u INVENTAR-editor §1.2.
5. Zapisnik konzultacija i „Dokle sam stao” ulaze u pilot; pojedinosti (privatni ili zajednički zapis) dolaze s NF-6.

Otvoreno prije gradnje:

- Serverske rute: sukob verzija (P-3), zatražene potvrde i izvori za studenta (P-8), dohvat DOI/ISBN (P-7), stanje izjave s poslužitelja (P-11); provjeru radi orkestrator, a nedostajuće rute postaju SRV zadaci.
- P-25 (shema v4) i P-19 (uvoz) su velike stavke; ako ugroze rok 15. 1. 2027., orkestrator to javlja Danielu prije nego što ih odgodi.

Redoslijed: najprije izmjene prototipa i INVENTAR-a za editor (NF-2-PROTO), zatim zadaci u redu; gradnja čeka zatvaranje pariteta editora (PAR2-E).

### NF-3, predaja i potvrda (23. 11. 2026.)

Pregled: `docs/nalazi/nove-funkcije-3-predaja.md` (WEB #557). Daniel: „Sve u pilot. 1 Pdf s kodom 2. Pilot 3. Da, ali nastavnik smije odobriti iznimno.”

Svih 21 prijedlog (PR-1 … PR-21) ide u pilot, uključivo i one koje je pregled preporučio za „nakon pilota” ili za vlasnikovu odluku: PR-15 (povijest pokušaja), PR-5 (izjava kao dijalog, ide s P-12 iz NF-2), PR-14 (ispravak izjave nakon predaje; tekst ide kroz pravni pregled), PR-20 (pitanje nastavnika uz izjavu) i PR-21 (razgovori uz izjavu, dijalog „Razgovor N”).

Odgovori na pitanja:

1. Na potvrdi predaje student u pilotu dobiva samo PDF s QR kodom; paket za referadu i prenosivi zapis se ne prikazuju studentu.
2. Pitanje nastavnika uz izjavu (R-33, PR-20) ulazi u pilot.
3. Zadatak smije zabraniti predaju nakon roka; nastavnik iznimno smije odobriti kasnu predaju pojedinom studentu.

Otvoreno prije gradnje:

- Server: PR-20 i PR-21 traže ugovor i rute (pitanje nastavnika, prilozi razgovora uz declaration-v1 imaju `maxItems 0`); PR-21 ovisi i o Q-10 (pomoćnik je u pilotu isključen, pa se do odluke prikazuje pošteno prazno stanje). Pravilo „zabrana kasne predaje uz iznimno odobrenje” traži polje zadatka i nastavničku radnju (veza s NF-4 i NF-5). Orkestrator provjerava razlog nemogućeg povlačenja (PR-13), operaciju „pošalji doradu” (PR-16) i oblik `createdAt` kod napomena (PR-6).
- PR-14 i tekst PR-20 idu kroz pravni pregled.

Redoslijed: najprije izmjene prototipa i INVENTAR-a za predaju (NF-3-PROTO), zatim zadaci u redu; gradnja čeka zatvaranje pariteta studenta (PAR2-S, dijelovi C i D).

### NF-4, nastavnik: kolegiji i zadaci (23. 11. 2026.)

Pregled: `docs/nalazi/nove-funkcije-4-nastavnik-kolegiji-zadaci.md` (WEB #558). Daniel: „1 da 2. asistent u pilotu radi 3. Da 4. Oboje 5. Da 6. Smije isključiti”, zatim „Asistent radi u pilotu i sve stavke NZ idu u pilot”.

Svih 18 prijedloga (NZ-1 … NZ-18) ide u pilot, uključivo NZ-14 (nastavnici i mentori na kolegiju), NZ-15 (pitanje nastavnika uz izjavu) i NZ-9 (obavijest e-poštom ili push, sa slanjem).

Odgovori na pitanja:

1. Obavijest e-poštom (NZ-9, NF-1 P-17) ulazi u pilot. To je iznimka od odluke 2147 („obavijest samo u aplikaciji”) i ide uz DPIA; poruka bez naslova rada i bez rada, student se može odjaviti.
2. **Asistent u pilotu radi.** Ovo mijenja odluku NF-2 br. 1 (OC-1 isključen). Opcija „samo sažimanje” (`aiSummaryOnly`) u obrascu zadatka postaje stvarna postavka. Pružatelja i model bira Daniel (Q-10); orkestrator i pisci ih ne biraju niti imenuju u tekstu.
3. Zabranu predaje nakon roka nastavnik smije mijenjati i nakon objave zadatka (uz dijalog o izmjeni pravila koja su studenti vidjeli, NZ-7).
4. Iznimka kasne predaje: oboje. Varijanta A (produljenje za jednog studenta, postojeći ugovor) odmah, varijanta B (posebna iznimka s vlastitim zapisom) traži server.
5. Produljenje roka nudi se i za zadatak kojem je rok prošao.
6. Nastavnik smije isključiti obaveznu izjavu po zadatku (`teacher.declaration-required.put`).

Otvoreno prije gradnje:

- **Q-10: pružatelj i model asistenta (Daniel).** Do odluke asistent se gradi bez imena pružatelja ili modela.
- Asistent u pilotu mijenja i provedene odluke: NF-2 P-9/P-10 (kartica Asistent u editoru), NF-3 PR-21 (razgovori uz izjavu), NF-1 i NF-3 tekstovi koji kažu „asistent isključen”. Orkestrator otvara dopunu prototipa.
- Server: NZ-4a (polje „predaja nakon roka nije dopuštena”), NZ-5 B (iznimka sa zapisom), NZ-9 (slanje e-pošte, odjava), NZ-15 (pitanje uz izjavu), NZ-12 (skupno čitanje dorada), NZ-8 (potvrda obavijesti po studentu, provjeriti), NZ-3 (obrada `groupIds`, `externalToolsAllowed`, `aiSummaryOnly`, provjeriti).
- NZ-9 i tekst NZ-15 idu kroz pravni pregled i DPIA.

Redoslijed: najprije izmjene prototipa nastavnika i `INVENTAR-nastavnik.md` (NF-4-PROTO) i dopuna asistenta u prototipu editora (ASIST-PROTO), zatim zadaci u redu; gradnja čeka zatvaranje pariteta nastavnika (PAR2-N).

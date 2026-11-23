# V3 vizualni paritet: plan

Stanje 23. 11. 2026. Snimka Claude Doca (https://claude.ai/artifact/42ZpGSuVfoDsXX1jNRxBHG); ova datoteka je mjerodavna kopija u repou.

## Cilj i kriterij gotovosti

V3 je gotov kad svaki ekran iz prototipa izgleda identično u aplikaciji, s odstupanjem od najviše 2 % na širinama 390, 768, 1100 i 1280 px, i kad provjera to ruši u CI-ju. Danielova riječ od 22. 11.: „Želim i da izgleda identično i da ima sve funkcije.”

Izvor istine su prototipovi u `docs/prototip/` (Ductura_student.html, Ductura_nastavnik.html, editor/) i popisi ekrana i tokena u INVENTAR-student.md, INVENTAR-nastavnik.md i INVENTAR-editor.md. Izgled se prepisuje iz CSS-a prototipa, ne preoblikuje po uzoru. Faze nakon V2 dogovorene su u ductura/.github#58.

V3 je zatvoren kad vrijedi svih pet uvjeta:

1. Tablica pokrivenosti ima redak za svaki ekran prototipa: ruta, ljuska, scenarij podataka i postotak odstupanja na četiri širine.
2. Svaki redak je ≤ 2 %, ili ima zapisanu preostalu razliku i razlog.
3. Workflow viz-usporedba radi s uključenim vratima (`vrata=true`) i prolazi.
4. axe prolazi na svakom ekranu; kontrast se popravlja tokenom, nikad gašenjem provjere.
5. Ručna WCAG matrica (VIZ-WCAG) zapisana je u `docs/nalazi/`.

## Stanje zadataka

Od 22 VIZ zadatka 16 je spojeno; preostalo je 6 (stanje 23. 11. u 20:25).

| Zadatak | Područje | Stanje | Tko radi |
| --- | --- | --- | --- |
| VIZ-CSS | Zajednički CSS i tokeni iz prototipa | U radu | Pisac u oblaku |
| VIZ-PODACI | Scenariji lažnog servera | PR #544, sukob riješen, čeka pregled | Orkestrator |
| VIZ-SNIMKE | Osnovne snimke svih ruta | U radu | Pisac u oblaku |
| VIZ-E1 | Editor: kostur, alatna i statusna traka, traženje | PR #449 | Pregled orkestratora |
| VIZ-S4b | Predaja studenta bez ljuske | Čeka VIZ-CSS i VIZ-PODACI | Orkestrator ga pokreće |
| VIZ-WCAG | Ručna WCAG matrica | Slobodno | Graditelj (nakon Docker zadataka) |
| VIZ-PRAG | Jedan prolaz usporedbe, prag 2 % | Spojeno (#543, 23. 11.) | — |
| VIZ-CI | Workflow viz-usporedba | Spojeno | — |
| VIZ-0 | Temelj: tokeni i komponente @ductura/ui | Spojeno | — |
| VIZ-S1–S4 | Student: ljuska, prijava, zadaci, upis, radni prostor, predaja | Spojeno | — |
| VIZ-E2–E4 | Editor: paneli, tipografija, fusnote, izvori, komentari, mentor | Spojeno | — |
| VIZ-N1–N6 | Nastavnik: N-01 do N-18 | Spojeno | — |

## Preostali zadaci i prihvaćanje

Svaki preostali zadatak ima točan opseg i uvjet prihvaćanja u svom PR-u; orkestrator ga spaja tek nakon neovisnog pregleda i zelenog `ci-ok`.

**VIZ-CSS: jedan zajednički CSS iz prototipa**

- Doslovno iz CSS-a prototipa: boje, fontovi, radijusi, razmaci, širine kolona, najveća širina kontejnera, grid i prijelomi ≤640 / 641–1050 / 1051–1250 / >1250 px. App to uvozi umjesto lokalnih vrijednosti.
- Zapis ljuske po ekranu (bočna traka ili bez ljuske, kontejner) za sve ekrane; Host.tsx ga čita.
- Fontovi iz istih datoteka kao prototip; snimka tek nakon `document.fonts.ready`.
- U PR-u: tablica pravilo prototipa → token u appu, i tablica odstupanja prije/poslije na svim ekranima.

**VIZ-PODACI: isti podaci kao prototip**

- Scenarij „puno” jednak prototipu (Kolegij A, sesije, razgovori, lijepljenja, AI, napomene, sažetak procesa, povlačenje), plus prazno, učitavanje, greška i dugi tekst s č ć đ š ž.
- Fiksni datum i vrijeme da snimke budu stabilne. Samo izmišljeni podaci.
- Odabir scenarija preko `VIZ_SCENARIJ`; postojeći scenariji i testovi ostaju.

**VIZ-SNIMKE: osnovne snimke**

- Parovi prototip ↔ app na 390/768/1100/1280 px za sve rute iz INVENTAR-a, izvještaj u viz-usporedba.yml. Tokeni se ne diraju.

**VIZ-E1: okvir editora (PR #449)**

- Kostur stranice i mjere regija, alatna traka, traka traženja, statusna traka, načini prikaza (INVENTAR-editor §1).

**VIZ-S4b: predaja studenta kao u prototipu**

1. Predaja (izjava, pregled, slanje, potvrda) bez bočne trake.
2. Traka „Natrag na rad” preko cijele širine uz vrh.
3. E-8 na 1280 px u dvije kolone, oko 440 + 606 px.
4. Na 390 px bez dvostrukog uvlaka, koraci u jednom redu, gumbi Dalje/Natrag 50/50.

U PR-u tablica pokrivenosti za svaki ekran, interaktivna stanja (hover, fokus, onemogućeno, otvoren dijalog, greške forme) i snimke bez animacija.

**VIZ-WCAG: ručna provjera pristupačnosti**

- Tipkovnica, fokus, čitač zaslona i mobilni raspored po DAN-755; rezultat kao dokument u `docs/nalazi/`.

## Redoslijed i ovisnosti

Tri zadatka idu odmah i usporedno; VIZ-S4b i uključivanje vrata čekaju njih.

1. **Sada, usporedno u oblaku:** VIZ-CSS, VIZ-SNIMKE (ovisi o VIZ-PRAG, koji je spojen) i VIZ-PODACI #544 (sukob s #543 u `e2e/viz` riješen). VIZ-E1 #449 ide na pregled čim je zelen.
2. **Nakon VIZ-CSS i VIZ-PODACI:** VIZ-S4b (ovisi i o INT-10, koji je spojen).
3. **Nakon svih šest:** novi prolaz viz-usporedbe; svaki ekran ≤ 2 % ili zapisan razlog.
4. **Zatim:** orkestrator uključuje vrata (`vrata=true`), pa svaki budući PR koji pokvari izgled pada.
5. **Usporedno, kad graditelj završi Docker zadatke:** VIZ-WCAG ručna matrica.
6. **Zatvaranje V3:** kad vrijedi svih pet uvjeta iz prvog dijela.

## Pravila za sve VIZ zadatke

Svi VIZ pisci rade po istih osam pravila; ona su upisana u svaki nalog.

- Stil samo iz tokena i komponenti @ductura/ui. Ono čega nema dodaje se kao komponenta ili varijanta u packages/ui s kataloškim unosom svih pet stanja, nikad kao lokalni stil na stranici.
- Funkcije i testovi se ne mijenjaju osim koliko traži izgled; test koji traži stari tekst usklađuje se s prototipom.
- Usporedba u Playwrightu na 390/768/1100/1280 px, svako stanje (prazno, učitavanje, greška, varijante).
- Snimke bez animacija i treptanja kursora, s učitanim fontovima i fiksnim datumom. Snimke se ne commitaju.
- U PR-u: popis ekrana i stanja, za svako „identično” ili točna preostala razlika i razlog.
- Kad prototipovi odstupaju međusobno: za editor vrijedi editor, za ostalo student/nastavnik.
- axe se nikad ne gasi; kontrast se popravlja tokenom.
- Promjene CI datoteka spaja samo orkestrator; spajanje u main samo na Danielovo „Spoji n”.

## Otvoreno i rizici

Najveći rizik je da brojke ne padnu ispod 2 % ni nakon VIZ-CSS; zato vrata ostaju isključena dok se ne smire.

- **Stvarne brojke danas.** Ekran „student: moji zadaci” odstupa 10,0 / 6,5 / 4,8 / 4,1 % na 390 / 768 / 1100 / 1280 px (mjereno u #543, prije VIZ-CSS i VIZ-PODACI).
- **Vrata.** Uključuju se kad svi ekrani budu ispod praga; do tada viz-usporedba samo izvještava.
- **Mjera.** Razlika se računa po pikselima s tolerancijom 24 po kanalu, zadana tema je svijetla. Tamna tema još nema svoj prolaz.
- **Ekrani bez para.** Neki ekrani s mape (npr. N-04, N-07) nemaju par u pairs.ts; vide se u tablici pokrivenosti i treba ih dodati.
- **Lokalni RAM.** Graditelj na računalu orkestratora radi preostale Docker provjere (A07, pgTAP dio A09), pa VIZ rad ide samo u oblak. VIZ-WCAG graditelj radi nakon toga.
- **Otvoreno pitanje za Daniela:** treba li i tamna tema prolaziti isti prag od 2 % prije zatvaranja V3?

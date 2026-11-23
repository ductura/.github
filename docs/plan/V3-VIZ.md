# V3 vizualni paritet: plan

Stanje 23. 11. 2026. Snimka Claude Doca (https://claude.ai/artifact/42ZpGSuVfoDsXX1jNRxBHG); ova datoteka je mjerodavna kopija u repou.

## Cilj i kriterij gotovosti

V3 je gotov kad svaki ekran iz prototipa izgleda identično u aplikaciji, s odstupanjem od najviše 2 % na širinama 390, 768, 1100 i 1280 px, u svijetloj i u tamnoj temi, i kad provjera to ruši u CI-ju. Danielova riječ od 22. 11.: „Želim i da izgleda identično i da ima sve funkcije.”

Izvor istine su prototipovi u `docs/prototip/` (Ductura_student.html, Ductura_nastavnik.html, editor/) i popisi ekrana i tokena u INVENTAR-student.md, INVENTAR-nastavnik.md i INVENTAR-editor.md. Izgled se prepisuje iz CSS-a prototipa, ne preoblikuje po uzoru. Faze nakon V2 dogovorene su u ductura/.github#58.

V3 je zatvoren kad vrijedi svih šest uvjeta:

1. Tablica pokrivenosti ima redak za svaki ekran prototipa: ruta, ljuska, scenarij podataka i postotak odstupanja na četiri širine.
2. Svaki redak je ≤ 2 % u obje teme, ili ima zapisanu preostalu razliku i razlog.
3. Workflow viz-usporedba radi s uključenim vratima (`vrata=true`) i prolazi.
4. axe prolazi na svakom ekranu; kontrast se popravlja tokenom, nikad gašenjem provjere.
5. Ručna WCAG matrica (VIZ-WCAG) zapisana je u `docs/nalazi/`.
6. Nove revizije pariteta funkcija (PAR2-S, PAR2-E, PAR2-N) nemaju otvorenih stavki „nedostaje”: svaka je spojena kao zadatak ili ju je Daniel izričito odgodio („nakon pilota”).

## Stanje zadataka

Svi VIZ zadaci iz prve skupine su spojeni, uključivo VIZ-WCAG (#548). Otvoreno je pet novih zadataka (stanje 23. 11., 21 h).

| Zadatak | Područje | Stanje | Tko radi |
| --- | --- | --- | --- |
| VIZ-WCAG-POPRAVAK | Popravci nalaza N1–N5 iz VIZ-WCAG | U radu (nalog 23. 11.) | Graditelj |
| VIZ-TAMNA | Prolaz tamne teme, parovi za ekrane bez para, tablica pokrivenosti | U radu | Pisac u oblaku |
| PAR2-S | Nova revizija pariteta funkcija: student | U radu | Pisac u oblaku |
| PAR2-E | Nova revizija pariteta funkcija: editor | U radu | Pisac u oblaku |
| PAR2-N | Nova revizija pariteta funkcija: nastavnik | U radu | Pisac u oblaku |
| VIZ-0, S1–S4b, E1–E4, N1–N6 | Tokeni, komponente i svi ekrani triju uloga | Spojeno | — |
| VIZ-CSS, PODACI, SNIMKE, PRAG, CI | CSS prototipa, scenariji, snimke, prag 2 %, workflow | Spojeno | — |
| VIZ-WCAG | Ručna WCAG matrica, 55 ekrana | Spojeno (#548) | — |
| WEB-21xx | Zadaci iz revizija pariteta 22. 11. (#340, #341, #343) | 56 od 57 spojeno | — |

## Preostali zadaci i prihvaćanje

Svaki preostali zadatak ima točan opseg i uvjet prihvaćanja u svom PR-u; orkestrator ga spaja tek nakon neovisnog pregleda i zelenog `ci-ok`. Opseg već spojenih zadataka (VIZ-CSS, PODACI, SNIMKE, E1, S4b, WCAG) je u njihovim PR-ovima.

**VIZ-WCAG-POPRAVAK: popravci nalaza iz VIZ-WCAG (graditelj)**

- N1 „Predaja zadatka” na 320/390 px (1.4.10), N2 cilj PDF/DOCX od 20 px (2.5.8), N3 skok naslova h1→h3, N5 ekrani i rute koje nedostaju u `screens.ts`; N4 poveznica za preskakanje po želji.

**VIZ-TAMNA: tamna tema i ekrani bez para**

- viz-usporedba dobiva prolaz tamne teme uz svijetlu, isti prag 2 % i iste širine.
- Par u pairs.ts za svaki ekran prototipa koji ga nema (npr. N-04, N-07).
- Izvještaj je tablica pokrivenosti iz uvjeta 1, u obje teme. Vrata se u ovom PR-u ne uključuju.

**PAR2-S, PAR2-E, PAR2-N: nove revizije pariteta funkcija**

- Samo dokumentacija: `docs/nalazi/paritet-<uloga>-2.md`, kod se ne mijenja.
- Polazište su revizije od 22. 11. (#340 student, #341 editor, #343 nastavnik). Za svaku njihovu stavku „nedostaje” ili „odstupa” stanje danas, plus nova stanja.
- Provjera u aplikaciji (lažni poslužitelj, scenarij „puno”), ne samo čitanjem koda.
- Na kraju prijedlog zadataka (jedan PR svaki) i popis stavki za Danielovu odluku.

**Nakon revizija:** orkestrator svaku stavku „nedostaje” i „odstupa” pretvara u zadatak u redu, ili je stavlja Danielu na popis za odgodu.

## Redoslijed i ovisnosti

Pet zadataka ide odmah i usporedno; vrata i zatvaranje čekaju njih.

1. **Sada, usporedno:** VIZ-TAMNA i PAR2-S/E/N u oblaku, VIZ-WCAG-POPRAVAK kod graditelja.
2. **Nakon VIZ-TAMNA i VIZ-WCAG-POPRAVAK:** novi prolaz viz-usporedbe u obje teme; svaki ekran ≤ 2 % ili zapisan razlog. Što ne prolazi, postaje zadatak po ekranu.
3. **Nakon revizija PAR2:** zadaci za stavke „nedostaje” i „odstupa”; Daniel bira što ide nakon pilota.
4. **Kad su svi ekrani ispod praga:** orkestrator uključuje vrata (`vrata=true`), pa svaki budući PR koji pokvari izgled pada.
5. **Zatvaranje V3:** kad vrijedi svih šest uvjeta iz prvog dijela.

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
- **Mjera.** Razlika se računa po pikselima s tolerancijom 24 po kanalu, zadana tema je svijetla. Tamna tema još nema svoj prolaz; treba ga dodati u viz-usporedbu.
- **Ekrani bez para.** Neki ekrani s mape (npr. N-04, N-07) nemaju par u pairs.ts; vide se u tablici pokrivenosti i treba ih dodati.
- **Lokalni RAM.** VIZ rad pisaca ide samo u oblak; graditelj lokalno radi VIZ-WCAG.
- **Odluka Daniela 23. 11.:** „Da, i tamna tema neka prođe prag od 2 %.” Prolaz tamne teme dodaje se u viz-usporedbu prije uključivanja vrata.

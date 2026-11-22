# Prototipovi Ducture

Ovo su prototipovi ciljne slike Ducture koje je vlasnik odobrio 19. 11. 2026. Služe piscima kao predložak za izgradnju sučelja. Nisu proizvodni kod.

## Sadržaj

- `nastavnik/`: prototip nastavničkog sučelja (`Ductura_nastavnik.html`) i kartice ekrana s odlukama (`Ductura_nastavnik_kartice.html`).
- `student/`: prototip studentskog sučelja (`Ductura_student.html`) i kartice ekrana (`Ductura_student_kartice.html`).
- `editor/`: prototip editora. Otvara se kroz `editor/index.html` s lokalnog poslužitelja (npr. `npx serve editor`), jer učitava datoteke preko `fetch`. Pravila oblikovanja su u `editor/rules/`, primjer rada u `editor/samples/`, a tuđe biblioteke u `editor/vendor/`.
- `inventar/`: popisi svega što prototipovi sadrže, po ekranima i funkcijama (editor, student, nastavnik).
- `plan/`: plan valova izgradnje (`PLAN-VALOVA.md`), zadaci za prve valove (`ZADACI-VAL-1-2-4.md`) i vlasnikovi odgovori na otvorena pitanja (`ODGOVORI-DANIEL-2026-11-19.md`).

## Podaci

Svi podaci u prototipovima su izmišljeni: studenti, nastavnici, kolegiji, radovi, izvori i datumi. Primjer rada u editoru je `editor/samples/primjer-izmisljeni.json`, izmišljeni rad o izmišljenom gradu. Testovi, fixturei i drugi repoi koriste samo taj primjer.

## Tuđe biblioteke

Mapa `editor/vendor/` sadrži gotove pakete tuđih biblioteka (Tiptap, KaTeX, PDF.js, Hunspell) i hrvatski rječnik za provjeru pravopisa. Popis i stanje licenci su u `editor/vendor/LICENCE-TRECIH-STRANA.md`. Za te datoteke vrijede njihove licence, ne licenca ovog repoa.

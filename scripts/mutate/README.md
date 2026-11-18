# Mutacijsko testiranje (DAN-1090)

Pisac ga pokreće prije „Spreman za review” nad datotekama koje PR mijenja. Za svaki mutant (mala promjena izvora) pokrene testove; mutant koji testovi i dalje propuštaju je **preživio** i znači da test ne bi primijetio takav kvar. Alat nije u gateu ni obvezni status. Ne treba ovisnosti ni mrežu, samo Node.

```sh
node scripts/mutate/mutate.mjs <datoteke…> -- <naredba testova…>
# iz drugog repoa, nad datotekama koje PR mijenja:
node ../.github/scripts/mutate/mutate.mjs $(git diff --name-only --diff-filter=d origin/main...HEAD) -- pnpm vitest run
```

| Izlaz | Značenje |
|---|---|
| `0` | svaki mutant je ubijen |
| `1` | barem jedan preživjeli, ispisan kao `survived <datoteka>:<redak>:<stupac> '<iz>' -> '<u>'` |
| `2` uz `unjudged` | nijedan preživjeli, ali barem jedan mutant nije prosuđen: testove je prekinuo signal koji nije poslao rok alata (npr. OS zbog memorije), ispisan kao `unjudged … (<signal>)`; kod 129–192 iz ljuske znači isto |
| `2` | ništa se ne može tvrditi: nema datoteka ili naredbe, datoteka nije čitljiva, nijedan mutant, naredba se ne pokreće, testovi padaju i bez mutanta, testovi mijenjaju ili brišu datoteku koja se mutira |

- Mutira samo `.js .mjs .cjs .ts .mts .cts`; testne datoteke (`*.test.*`, `*.spec.*`), deklaracije (`*.d.ts`) i ostalo ispiše kao `skipped`. Ista datoteka pod drugim imenom ili kroz poveznicu mutira se jednom.
- Mutacije: `===`↔`!==`, `==`↔`!=`, `<`↔`<=`, `>`↔`>=`, `&&`↔`||`, `+`↔`-`, `true`↔`false`. Komentari, hashbang, nizovi, brojevi (predznak eksponenta u `1e-8`), cijeli template literali (sadržaj `${…}` čita isti lekser, pa ga regex s `{` ili navodnikom ne zbunjuje) i regex literali se ne mutiraju. Kraj retka je svaki JS terminator (LF, CR, U+2028, U+2029; CRLF je jedan), za komentar, regex i redak:stupac. Regex od dijeljenja lekser razlikuje stogom zagrada: iza `}` bloka i iza `)` od `if`/`while`/`for`/`with` slijedi regex, iza `}` objekta, funkcijskog ili klasnog izraza dijeljenje; iza rezervirane riječi koja nije vrijednost (`return`, `debugger`, `else`…) regex, iza `this`, `null`, `true`, imena i broja dijeljenje; najdulji operator pobjeđuje (`>>>=` nikad nije `>`); `true` kao dio imena ili svojstva (`x.true`) i TS modifikatori `-readonly`, `-?` nisu mutanti.
- Naredba se pokreće bez ljuske. Svaki mutant ima rok od trostrukog trajanja prolaza bez mutanta plus 2 s; istek se broji kao ubijen i na POSIX-u ubija cijelu grupu procesa.
- Nakon svakog mutanta izvor se vraća bajt po bajt. Na svakom izlazu (i 2, i iznimka) te na SIGINT, SIGTERM i SIGHUP (izlaz 128 + broj signala) vraća se **svaka** datoteka koja se mutira, a ne samo ona pod mutantom. Na kraju se bajtovi provjere; razlika daje izlaz 2.

Poznate granice: mutacije su leksičke, ne AST. Mutant koji se ne može parsirati (npr. TS generički `<T>`) broji se kao ubijen, pa rezultat može biti bolji nego što jest. Preživjeli može biti lažan kad mutant ne mijenja izvođenje: `true`/`false` u TS tipu (`{ ok: true }` u `type`) i ekvivalentni mutanti; takav preživjeli pisac obrazloži. HTML-komentar `<!--` čita se kao kod. U TS-u `>>` koji zatvara generike čita se kao pomak, a regex u novom retku iza `type T = {…}` kao dijeljenje. Kontekstualne riječi (`of`, `let`, `yield`, `await`) uzimaju se kao ključne riječi i kad su imena varijabli u ne-strogom kodu. Rok je iz jednog osnovnog prolaza, pa spori preživjeli može isteći i brojati se kao ubijen. SIGKILL samog alata usred mutanta ostavlja mutiranu datoteku; dva istodobna pokretanja nad istom datotekom se gaze. Proces koji izađe iz grupe (`setsid`) ne ubija se. Na Windowsu se ubija samo izravni potproces, a `pnpm` traži `pnpm.cmd`. Testovi su u `scripts/mutate.test.mjs`, fixture u `fixtures/mutate/`.

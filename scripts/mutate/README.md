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
| `2` | ništa se ne može tvrditi: nema datoteka ili naredbe, datoteka nije čitljiva, nijedan mutant, naredba se ne pokreće, testovi padaju i bez mutanta, testovi mijenjaju datoteku koja se mutira |

- Mutira samo `.js .mjs .cjs .ts .mts .cts`; testne datoteke (`*.test.*`, `*.spec.*`), deklaracije (`*.d.ts`) i ostalo ispiše kao `skipped`. Ista datoteka pod drugim imenom ili kroz poveznicu mutira se jednom.
- Mutacije: `===`↔`!==`, `==`↔`!=`, `<`↔`<=`, `>`↔`>=`, `&&`↔`||`, `+`↔`-`, `true`↔`false`. Komentari, hashbang, nizovi, cijeli template literali (sadržaj `${…}` čita isti lekser, pa ga regex s `{` ili navodnikom ne zbunjuje) i regex literali se ne mutiraju; najdulji operator pobjeđuje (`>>>=` nikad nije `>`); `true` kao dio imena ili svojstva (`x.true`) i TS modifikatori `-readonly`, `-?` nisu mutanti.
- Naredba se pokreće bez ljuske. Svaki mutant ima rok od trostrukog trajanja prolaza bez mutanta plus 2 s; istek se broji kao ubijen i na POSIX-u ubija cijelu grupu procesa.
- Izvor se nakon svakog mutanta vraća bajt po bajt, i na SIGINT, SIGTERM i SIGHUP (izlaz 128 + broj signala).

Poznate granice: mutacije su leksičke, ne AST. Mutant koji se ne može parsirati (npr. TS generički `<T>`) broji se kao ubijen, pa rezultat može biti bolji nego što jest. Preživjeli može biti lažan kad mutant ne mijenja izvođenje: `true`/`false` u TS tipu (`{ ok: true }` u `type`) i ekvivalentni mutanti; takav preživjeli pisac obrazloži. Regex iza `)` (`if (x) /re/.test(y)`) čita se kao dijeljenje, a HTML-komentar `<!--` kao kod. Rok je iz jednog osnovnog prolaza, pa spori preživjeli može isteći i brojati se kao ubijen. SIGKILL samog alata usred mutanta ostavlja mutiranu datoteku; dva istodobna pokretanja nad istom datotekom se gaze. Proces koji izađe iz grupe (`setsid`) ne ubija se. Na Windowsu se ubija samo izravni potproces, a `pnpm` traži `pnpm.cmd`. Testovi su u `scripts/mutate.test.mjs`, fixture u `fixtures/mutate/`.

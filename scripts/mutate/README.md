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
| `2` | ništa se ne može tvrditi: nema datoteka ili naredbe, datoteka ne postoji, nijedan mutant, testovi padaju i bez mutanta, izvor nije vraćen |

- Mutira samo `.js .mjs .cjs .ts .mts .cts`; testne datoteke (`*.test.*`, `*.spec.*`) i ostalo ispiše kao `skipped`.
- Mutacije: `===`↔`!==`, `==`↔`!=`, `<`↔`<=`, `>`↔`>=`, `&&`↔`||`, `+`↔`-`, `true`↔`false`. Komentari, nizovi, cijeli template literali i regex literali se ne mutiraju; najdulji operator pobjeđuje (`>>>=` nikad nije `>`).
- Naredba se pokreće bez ljuske. Svaki mutant ima rok od trostrukog trajanja prolaza bez mutanta plus 2 s; istek se broji kao ubijen i na POSIX-u ubija cijelu grupu procesa.
- Izvor se nakon svakog mutanta vraća bajt po bajt (i na SIGINT/SIGTERM) i na kraju provjerava.

Poznate granice: mutacije su leksičke, ne AST; mutant koji se ne može parsirati (npr. TS generički `<T>`) broji se kao ubijen, pa rezultat može biti bolji nego što jest, ali preživjeli nije lažan. Regex iza `)` (`if (x) /re/.test(y)`) čita se kao dijeljenje. SIGKILL samog alata usred mutanta ostavlja mutiranu datoteku. Na Windowsu se ubija samo izravni potproces, a `pnpm` traži `pnpm.cmd`. Testovi su u `scripts/mutate.test.mjs`, fixture u `fixtures/mutate/`.

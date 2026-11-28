# Ductura: pravila rada

Stanje: 19. 11. 2026. · Izvor: nacrt koji je Daniel odobrio 19. 11. 2026. („Slažem se s tobom”, „Može tako, da, slažem se.”; [Ductus#2028 c.6996417757](https://github.com/danielrisavi77-create/Ductus/issues/2028#issuecomment-6996417757)).

Ovo je jedini dokument pravila za Ducturu. Vrijedi u svim repoima organizacije `ductura`. `AGENTS.md` i `CLAUDE.md` u repou daju samo naredbe i putanje tog repoa, nikad nova pravila. Ako se nešto ne slaže s ovim dokumentom, vrijedi ovaj dokument, a pitanje ide Danielu.

Ductus (`danielrisavi77-create/Ductus`) je arhiva. Iz njega se samo čita; ništa novo se u njemu ne gradi.

| Što | Gdje |
|---|---|
| Pravila | ovaj dokument |
| Trenutna faza, otvoreno, čeka Daniela | [STANJE.md](STANJE.md) |
| Odluke vlasnika | [ODLUKE.md](ODLUKE.md) |
| Proizvod | [proizvod/](proizvod/) |
| Dizajn | [dizajn/DESIGN-SYSTEM.md](dizajn/DESIGN-SYSTEM.md) |
| Repoi i tko s kim razgovara | [ARHITEKTURA.md](ARHITEKTURA.md) |
| Plan migracije | [plan/PLAN-MIGRACIJE.md](plan/PLAN-MIGRACIJE.md) |
| Zadaci: popis, prioritet, status | Linear, projekt Ductura (`DAN-xxx`) |
| Javljanje pisaca | koordinacijski issue u `ductura/.github`; dok se ne otvori, Ductus#2028 |

## 1. Što gradimo

Ductura bilježi kako studentski rad nastaje i daje dokaze o tome. Ductura nikad ne tvrdi tko je napisao rad ni je li AI korišten nedopušteno. Zaključak donosi čovjek (D-01).

Opis proizvoda je u [proizvod/PRODUCT.md](proizvod/PRODUCT.md). Repoi i uloga svakog su u [ARHITEKTURA.md](ARHITEKTURA.md).

## 2. Tvrda pravila proizvoda

Ova pravila se ne mijenjaju bez Danielove odluke.

- **Prijava.** Studenti i svi računi ustanove prijavljuju se samo kroz AAI@EduHr (D-09, D-16). Lažni OIDC pružatelj radi samo lokalno i u CI-ju. Drugi način prijave se ne dodaje, ni privremeno. Administrator platforme u `Aplication_*` je zaseban sustav (vidi ARHITEKTURA).
- **Pristup.** Uloga sama ne daje pristup sadržaju. Pristup nastaje samo iz odnosa: student u kolegiju, nastavnik zadatka, mentor rada (Ustav C-23).
- **Sučelje.** Riječi iz rječnika zabranjenih izraza ([proizvod/PRODUCT.md](proizvod/PRODUCT.md) §5) nikad se ne pojavljuju u sučelju. Tekst sučelja je na hrvatskom.
- **Dokazi (B-8).** Kanonski oblik je JCS, a sažetak SHA-256. Nepoznata polja se odbijaju. Commit i rezervacija su atomski. Granica veličine vrijedi i na klijentu i na serveru (D-96).
- **Sinkronizacija.** Stanje SYNCED prikazuje se tek uz potpisanu potvrdu servera.
- **Baza.** Svaka tablica ima RLS i retke u pgTAP matrici pristupa. Klijent u tablice evidencije, predaje i revizijskog traga piše samo kroz RPC.
- **Front i podaci.** Front nikad ne čita bazu. Podatke dobiva samo od Institution_servera preko `/api/v1`.
- **Testni podaci.** Nikad stvarni studentski radovi ni osobni podaci u testovima i fixtureima. Svi podaci su izmišljeni.
- **Tajne i produkcija.** Tajne nikad u repou. Migracije se ne primjenjuju na produkciju iz agenta.
- **Izgled.** Vizualni smjer je „papir i grafit” (D-188, [dizajn/DESIGN-SYSTEM.md](dizajn/DESIGN-SYSTEM.md)).

## 3. Faze

Migracija ide u pet faza. Pojedinosti su u [plan/PLAN-MIGRACIJE.md](plan/PLAN-MIGRACIJE.md), odjeljak „Pet faza”.

| Faza | Što | Vrata |
|---|---|---|
| 1. Kopija | Doslovna kopija Ductusa na grane migracije | gotovo |
| 2. Osposobljavanje na granama | tsc bez grešaka, zeleni testovi, gradnja | lokalni test orkestratora |
| 3. Lokalna integracija | server, baza i frontovi zajedno, lažni OIDC, tokovi redom | svi tokovi prolaze |
| 4. Grana → `main` | repo po repo, Preloader zadnji | zeleni CI i jedan pregled kritičnih dijelova po repou |
| 5. Objava | serveri na Renderu, frontovi na Vercelu | samo Danielova riječ |

Nakon faze 3 kreću valovi funkcija 11–18. Rokovi se ne mijenjaju: kontrolne točke 30. 11. 2026. i 15. 1. 2027., proba 22. 2. 2027.

## 4. Uloge

- **Daniel:** odluke, objava, `main` Preloadera.
- **Orkestrator** (lokalno, `D:\Ductura`): dodjeljuje zadatke, testira PR-ove lokalno, spaja u granu migracije, vodi Linear i [STANJE.md](STANJE.md).
- **Pisac** (oblak): jedan zadatak, jedan PR prema zadanoj grani. Sam mjeri tsc, testove i gradnju. Javlja se u koordinacijski issue.
- **Pregled kritičnih dijelova** (samo faza 4): jedna sesija po repou prije `main`.

## 5. Kako pisac radi

1. Na početku pročitaj ovaj dokument, [STANJE.md](STANJE.md) i `AGENTS.md` repoa.
2. Zadatak dolazi od orkestratora i ima oznaku `DAN-xxx`. Nalog navodi zadanu granu.
3. Granu napravi iz zadane grane. Javi `POČETAK <grana>`.
4. PR ide prema zadanoj grani. Prema `main` ne ide dok ne počne faza 4. Iznimka: `ductura/.github` nema objavu, pa njegov PR ide prema `main`.
5. PR ima najviše oko 300 promijenjenih redaka. Doslovna kopija smije biti veća, uz napomenu u opisu.
6. Prije predaje sam izmjeri instalaciju, tsc, testove i gradnju. Rezultat i puni SHA upiši u opis PR-a.
7. Ne spajaš. Javi `SPREMAN <PR> <sha>`, a na kraju `GOTOVO <PR-ovi>`.
8. Kad ne možeš dalje, javi `BLOK <razlog>`. Kad trebaš odluku, javi `PITANJE` i navedi mogućnosti.
9. Ne gradi na odluci koja je samo prijedlog ako bi njezina promjena bila skupa. Stani i javi `PITANJE`.

Oblik javljanja: `OBLAK <slot> · <VRSTA> <pojedinosti>`.

Git:

- `git add <putanje>`, nikad `git add -A`.
- Bez force pusha i bez `--no-verify`.
- Commit na engleskom, s prefiksom `feat:`, `fix:`, `test:`, `docs:` ili `chore:`.
- Bez tajni, e-mail adresa i osobnih podataka u kodu, PR-u i komentarima.

## 6. Kako se spaja

- Spaja samo orkestrator. PR spaja u granu migracije tek nakon lokalnog testa: instalacija, tsc, testovi, gradnja.
- Rezultat lokalnog testa orkestrator piše u PR prije spajanja.
- Spajanje je squash.

## 7. Testovi

- Test se ne briše, ne preskače i ne stavlja u karantenu bez jednakovrijedne zamjene.
- Testovi su zeleni prije svakog commita.

## 8. Prije `main` (faza 4)

- Vrata su zeleni CI i jedan pregled kritičnih dijelova po repou.
- Pregled pokriva dokaze i forenziku (B-8), predaju, prijavu (D-09, D-16) i RLS.
- Repoi idu na `main` jedan po jedan. Preloader ide zadnji, jer njegov `main` objavljuje ductura.org. Prije toga se zamjenjuju hostovi `.invalid`.

## 9. Objava (faza 5)

- Serveri idu na Render, frontovi na Vercel.
- Objava je samo na Danielovu riječ. Bez nje nema stvaranja resursa, pusha slike u registry ni deploya.
- Već postoji jedna automatska objava: svaki push na `main` Preloadera objavljuje se na ductura.org ([Ductus#2012 c.6991711540](https://github.com/danielrisavi77-create/Ductus/issues/2012#issuecomment-6991711540)).

## 10. Sigurnost

- Svi repoi organizacije su javni. Pojedinosti sigurnosnog nalaza nikad ne idu u repo, PR, issue ni komentar.
- U javnom javljanju piše se samo da nalaz postoji (`BLOK sigurnost`). Pojedinosti idu orkestratoru, a on ih predaje Danielu.

## 11. Jezik

- Sučelje i dokumenti su na hrvatskom.
- Kod, identifikatori i commitovi su na engleskom.
- Kratke rečenice. Isti pojam za istu stvar.

## Što više ne vrijedi

Iz Ductusova procesa namjerno se ne prenose: review i QA po PR-u, predprovjera, retci verdikta, D-97 i „Spoji n”, Codex, Grok botovi, alat za red spajanja, heartbeat, Planer, nadzor, granica od 80 redaka za STATE i gate skripte Ductusa. Za faze 2 i 4 vrata su opisana u poglavljima 6 i 8.

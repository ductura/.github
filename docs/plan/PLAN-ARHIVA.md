# Ductura — arhiva plana

Povijesni dijelovi `PLAN-MIGRACIJE.md` (raniji plan A–E). Ne vrijede kao upute; trenutno stanje je u `STANJE.md`, pravila u `PLAN-MIGRACIJE.md`.

## 4. Redoslijed i faze (raniji plan A–E, povijest)

**Od 19. 11. 2026. vrijedi odjeljak „Pet faza”.** Tablica niže je raniji plan s fazama A–E i valovima 1–10; ostaje zbog poveznica iz ostalih dokumenata (V-1b, „Faza E · aktivacija desktop razvoja”). Odjeljci §4a do §4c pisani su za taj redoslijed. Proizvodna pravila iz njih (VS-1b kao uvjet za rad sa stvarnim podacima, R-1 do R-10) ostaju na snazi dok orkestrator i Daniel ne odluče drukčije.

| Faza | Što | Ulaz | Izlaz | Tvoje radnje |
|---|---|---|---|---|
| **A** priprema, val 0 | Repo servera s CI-jem, gateom i botovima; prijenos temelja (S-0.1 … S-0.21) | V-0, V-1 | Jedan pravi PR prošao cijeli gate u `Ductura/server`; ledger migracija jednak Ductusovu; skripte orkestratora vide repo | V-0 domena i e-pošta; V-1 organizacija i repozitoriji; V-2 zaštita grane; V-3 botovi i Codex; V-4 tajne |
| **B** server, valovi 1–10 | Sve od S-1A do S-1I | Faza A gotova | Testni server objavljen kao Docker slika; S-1H.8 prolazi; `@ductura/contracts` objavljen u verziji 0.x | V-5 zahtjev Srcu; V-7 račun admina aplikacije |
| **C** preloader i web-chrome | Preloader (2.0), info stranica (2.1), web-chrome od komponenata; izdvajanje standarda (T-0); selidba `editor-core` u web-chrome po uvjetima iz §2d | VS-1 prošao; S-1M, S-1N, S-1H.7 i `@ductura/contracts` dostupni | Prvi cijeli prolaz „domena → preloader → web-chrome → server” na sistemskom stogu; glavni tok u web-chromeu (otvori, piši, spremi, osvježi, bez veze, predaj) | V-1b (web i preloader, odobreno 14. 11., ne čeka fazu C); V-3 u njima; odluka o zamrzavanju Ductusa (ne prije 20. 12. 2026., §4d) |
| **D** web-mobile i web-other | Ista funkcija, druga sučelja | `@ductura/ui` i `@ductura/editor-core` u verziji 1.0; skup scenarija pariteta | Paritet zelen u sva tri weba; matrica preloadera zelena; domena prebačena na novi stog | V-1b za ta dva repoa; potvrda prebacivanja produkcije |
| **E** desktop | Tanka ljuska oko istog web paketa za Windows i macOS | Odluka o ljusci i broju repozitorija (odluke 8 i 12); Apple račun; potpis za Windows; odgovor Srca (V-5) | Potpisani paketi; instalacija i pokretanje na čistom Windowsu i Macu; gumbi preloadera vode na prava izdanja | Apple Developer račun; certifikat za Windows; **Faza E · aktivacija desktop razvoja** (zasebna radnja, ne dio V-1b) |

**Napomena o redoslijedu:** tvoje pravilo je „prvo server”. Predlažem dvije iznimke:
1. Čista logika preloadera (P-0.1, P-0.2). Ne treba server, mala je i dobro se testira tablicom. Radi se samo kad je pisac slobodan.
2. **Vertikalni presjek (VS-1, VS-2), prijedlog.**

### 4a. Vertikalni presjek (prijedlog)

Cilj: što ranije dokazati da sedam repozitorija stvarno radi zajedno, prije nego što izgradimo sve valove servera.

- **VS-1:** preloader + web-chrome + server. Korisnik se prijavi (lažni AAI@EduHr), otvori rad, spremi jednu rečenicu, osvježi stranicu i vidi rečenicu.
- **Ulaz VS-1:** od servera samo prijava i spremanje rada, ne svi valovi: S-1E-a (prijava), S-1D-d (kolačić i odjava), S-1M-a (zdravlje s verzijom) i uski rez servera (§4c; ranije S-M-5). **O-3 (Ductus#87 c.6880835493):** otvaranje, spremanje i ponavljanje evidencije dolaze iz uskog reza servera odmah iza S-0.19, ne čekaju valove 1 do 5 ni val 6. Od Ductusa: `@ductura/editor-core` 0.x (E-0.2).
- **Kriterij prihvata VS-1 (ispravak 14. 11.):** sintetički student se prijavi kroz lažni OIDC, spremi rečenicu i nakon osvježavanja stranice vidi tu rečenicu. Ovisi o DAN-758 (sheme i vektori za otvaranje i spremanje), DAN-759 (minimalni lokalni stog, umjesto S-1H.7) i DAN-760 (kriterij prihvata).
- **Izlaz VS-1:** test „prijava → otvori → spremi → osvježi” prolazi na sistemskom stogu, sa zapisanim SHA svakog repoa. Preloader i web-chrome imaju samo onoliko koda koliko presjek traži.
- **VS-1b (O-2):** zaseban, bezuvjetan nastavak VS-1; vidi §4a-1.
- **VS-2:** isti rad otvara se na mobitelu (web-mobile ili, ako je odluka 13 tako, web-chrome u mobilnom prikazu). Spremljena rečenica je ondje.
- Ostatak faza B i C nastavlja se nakon presjeka. Ako presjek pokaže da je razdvajanje preskupo, vidi se rano (prijedlog 17).

### 4a-1. Ovisnosti i prihvat VS-1 i VS-2 (Daniel 14. 11.)

Danielov tekst iz analize arhitekture, odobren za umetanje 14. 11. 2026. („Tekst za umetanje može”). Gdje se razlikuje od starijih redaka u §4a, vrijedi ovaj odjeljak.

**Ovisnosti do prvog spremljenog rada.** Za svaku rutu bilježimo tri odvojena prolaza. Nakon prihvaćene sheme klijent može graditi poziv i stanja sučelja. Nakon vektora uspjeha i grešaka te funkcionalnog lažnog servera može provjeriti ugovorno ponašanje. Nakon U10 integrira objavljenu verziju paketa. Sistemski prolaz izvodi se nad stvarnim handlerima, sesijom, trajnom bazom, objektnom pohranom i potpisnikom. DAN-758 određuje pozivatelja, handler i test za svaku rutu VS-1. Rani stog DAN-759 može se pripremati odmah, a njegov završetak čeka te handlere. Puni testni server S-1H.7 ostaje za kasniju provjeru pariteta.

**Prihvat VS-1 (izmjena prema O-2, Ductus#87 c.6880835493).** VS-1 se prihvaća s potpisom u istom odgovoru (protokol 1), **isključivo nad sintetičkim podacima u lokalnom i CI stogu**. U tom stogu sintetički student ulazi kroz `/`, prijavljuje se preko lokalnog OIDC pružatelja, vraća se u isti web pod `/app/` i otvara vlastiti postojeći rad s objavljenim `editor-coreom` 0.x. Upisuje jedinstvenu rečenicu. Nakon uspješnog lokalnog upisa editor prikazuje „Spremljeno na uređaju”. Odgovor servera nosi potpis u istom odgovoru; „Spremljeno na poslužitelju” prikazuje se tek kad klijent provjeri potpis za poslanu transakciju, dokument i reviziju. Nakon osvježavanja student vidi rečenicu. Čisti kontekst bez lokalnog dnevnika iz servera dobiva isti `documentId`, reviziju, hash i tekst. Test izgubljenog odgovora dokazuje da isti ključ i isti bajtovi daju jednu reviziju. Drugi student ne može pročitati ni izmijeniti taj rad. Uz prolaz se bilježe SHA preloadera, weba i servera, verzije paketa i rezultat provjera nad sintetičkim podacima.

Uz tvrdnje VS-1 (numeracija VS-1.x prema DAN-760) vrijede dvije dopune iz iste odluke:

- **VS-1.13 (nova tvrdnja):** nakon VS-1.7 proces servera (i radnika, ako postoji) gasi se i ponovno podiže, zatim se ponavlja VS-1.9. Isti dokument, ista revizija, isti hash i isti tekst moraju se vratiti iz trajne baze, ne iz memorije procesa.
- **Zabrana administratorske veze na bazu kao dokaza čitanja:** tvrdnje o čitanju (VS-1.9 i VS-1.13) dokazuju se kroz API servera kao student i kroz ulogu aplikacije s RLS-om. Čitanje preko administratorske ili vlasničke veze na bazu ne računa se kao dokaz.

**VS-1b (nova stavka, O-2).** Slijedi odmah nakon VS-1, **bezuvjetna je** i **uvjet je za osnovicu 20. 12. 2026. i za svaki rad sa stvarnim podacima (D-71)**. Sadržaj: odgovor `202 pending_signature`, worker koji potpisuje, red poslova, oporavak nakon prekida (worker, red i proces), te prikaz „Spremljeno na poslužitelju” tek nakon provjere potpisa. Protokol 1 nad stvarnim podacima nikad (D-71, R-1, §8a); prolaz VS-1b ne otvara protokol 1. VS-1b je `critical`, a ovisi o VS-1.

**Prihvat VS-2.** Isti student u novom mobilnom kontekstu kroz isti web otvara rad iz VS-1 i s poslužitelja dobiva istu potvrđenu reviziju i rečenicu. Rezultat navodi uređaj ili emulaciju i preglednički motor. Produkcijski AAI, objava desktop paketa i prijelaz postojećih studentskih radova imaju zasebne uvjete prihvata.

### 4b. Vremenska crta (procjena, NEPROVJERENO; raniji plan A–E, povijest)

Procjena vrijedi za raniji plan A–E. Za pet faza vrijede kontrolne točke 30. 11. i 15. 1. i proba 22. 2. 2027.

Migracija počinje onog dana kad postoji **V-1** (organizacija i repozitoriji). Dan 1 je prvi radni dan nakon toga.

Mjera su radni dani uz današnji tempo: oko 35–40 PR-ova dnevno preko svih pisaca. Novi repo u početku ide sporije od tog prosjeka. Razlozi su ograničenje od tri kodna PR-a po repou, migracije redom, `critical` gate i ovisnosti među zadacima. Vanjska čekanja (Srce, Apple, certifikat za Windows, tvoje odluke) nisu uračunata.

| Faza | Procjena (radni dani) | Okvirno od–do | Napomena |
|---|---|---|---|
| A (val 0) | 3–6 | dan 1 – dan 6 | NEPROVJERENO. Gate se tek postavlja, pa su prvi PR-ovi sporiji. |
| B (valovi 1–10) | 8–15 | dan 4 – dan 20 | NEPROVJERENO. Oko 95 zadataka; usporedni rad počinje u valu 5. |
| Uski rez servera (O-3) | prema PR-ovima | od završetka S-0.19, usporedno s valovima 1–5 | NEPROVJERENO. Zasebni `critical` PR-ovi redom (§4c). Nije izdanje. |
| VS-1 i VS-2 | 2–4 | otprilike dan 10 – dan 16 | NEPROVJERENO. Kreće čim su gotovi S-1E-a, S-1D-d, S-1M-a i uski rez (§4c; ranije S-M-5), usred faze B. VS-1 samo nad sintetičkim podacima. |
| VS-1b | nakon VS-1 | prije osnovice 20. 12. 2026. | Bezuvjetan (O-2). Uvjet za osnovicu 20. 12. i za rad sa stvarnim podacima. |
| C (preloader i web-chrome) | 10–20 | dan 14 – dan 35 | NEPROVJERENO. Najveći dio prijenosa sučelja; preklapa se s krajem faze B. |
| D (mobile i other) | 5–10 | dan 30 – dan 45 | NEPROVJERENO. Kraće ako je `web-other` tanak ili ga nema (odluka 13). |
| E (desktop) | 8–15 | dan 40 – dan 60 | NEPROVJERENO. Plus vanjska čekanja na Apple račun, certifikat i Srce. |
| **Ukupno** | **oko 35–60 radnih dana** | | NEPROVJERENO. Prva provjera procjene nakon faze A, iz mjera M-0.1. |

**Prezentacija 16. 11.** radi na Ductusu. Ništa iz ovog plana ne dira kod Ductusa prije toga, osim dokumenata (S-0.1, S-0.2) i spikea (S-0.3).

### 4c. Uski rez servera za VS-1 (O-3)

Odluka vlasnika (Ductus#87 c.6880835493, točka 3; mijenja D-306 t. 15; stari unos ostaje u povijesti).

- **Što:** sesija, `open`, `commit` i `replay` grade se **odmah iza S-0.19**, usporedno s valovima 1 do 5.
- **Kako:** svaki dio je zaseban `critical` PR, redom, **bez ugniježđenih PR-ova**; nad pravim PostgreSQL-om s RLS-om i pgTAP-om; u mapama područja iz server `docs/PLAN.md` §3.
- **Uvjet početka:** S-0.19 spojen; prije svakog dijela plan napada (`ductus-attack-plan`); stalna granica od tri kodna PR-a po repou vrijedi i za rez.
- **Rez nije izdanje.** Valovi 1 do 5 ostaju uvjet za pilot. Rez služi samo da VS-1 (i VS-1b) ne čekaju sve valove.
- Novi D-unos koji navodi što mijenja (D-306 t. 15) i izmjena server `docs/PLAN.md` idu zasebnim docs PR-ovima kroz gate; ovaj dokument samo bilježi odluku.

### 4d. Pilot na jednom sustavu (O-1)

Odluka vlasnika (Ductus#87 c.6880835493, točka 1). Ovdje su „faze A i B pilota” faze pilota, ne faze migracije A–E iz §4.

- Faze A i B pilota rade na **jednom sustavu**. Bira ga vlasnik prije faze A pilota, **na kontrolnoj točki 20. 12. 2026.**, uz mjerenje osnovice M3 na sustavu koji ide u pilot.
- **Do izbora Ductus ostaje spreman za pilot; zamrzavanje iz D-295 ne nastupa prije izbora.** Ovo ima prednost pred „zamrzavanjem” u §8 točka 4 i §9 redak 10.
- Proba povrata (M11.2-P04) ostaje GO uvjet prije stvarnih studenata (R-8).

---


## 10. Prva dva tjedna (raniji plan, povijest)

Raspored niže pisan je za raniji plan A–E. Za pet faza vidi odjeljak „Pet faza”.

Pretpostavka: početak u ponedjeljak 17. 11., nakon prezentacije. Dokumenti i spike mogu i ranije.

### 10a. Što se mijenja u postojećim zadacima

| Zadatak | Izmjena |
|---|---|
| S-0.1 | D-zapis navodi `preloader` kao sedmi repo umjesto `shared-core`. Dodaje odluke iz §9 koje potvrdiš (usmjeravanje, paketi, pomoćni repo, botovi). |
| S-0.6 | Adapteri pravila nastaju tako da ih T-0.4 kasnije može kopirati u druge repozitorije. Sadržaj isti. |
| S-0.9 | Gradi se u serveru kao danas. Piše se tako da ga T-0.2 kasnije izdvoji bez promjene ponašanja. |
| S-0.20 | **Ukinuto 17. 11.** Spajanje ide po pravilu iz §7. |
| S-0.10-a, S-0.10-b | Pišu se u `.github` (kao T-0.2), ne u serveru; server ih poziva punim SHA-om. |
| S-0.11 | Ovisi i o prijenosu aplikacije botova u organizaciju (V-3). Labele dolaze iz zajedničkog popisa kad postoji T-0.1. |
| S-0.19 | Briše se „Otvoreno: prelazi u shared-core”. `server/domain` ostaje u serveru i objavljuje se u `@ductura/contracts`. Time je pitanje shared-corea zatvoreno (zamijenjeno paketima, KARTA §4). |
| S-0.21 | Popis praćenih repozitorija ima svih sedam plus Ductus. Proširenje preko repozitorija je T-0.6. |
| S-1L.1 | Briše se „dugoročno mjesto lokala je shared-core”. Serverske lokale ostaju u serveru. Lokale sučelja idu u `@ductura/ui`. Test u `@ductura/ui` provjerava da svaki kod greške iz ugovora ima tekst. |
| S-1M-c | Katalog grešaka objavljuje se u `@ductura/contracts`, jer ga preloader treba. |
| S-1H.4, S-1H.8 | Vektori i scenariji objavljuju se u `@ductura/contracts`. Potrošači su preloader i web repozitoriji, ne shared-core. |
| §6 i §7 popisa | „Testovi shared-core” zamjenjuju testovi preloadera. Desktop gradi nad paketima i OpenAPI-jem, ne nad shared-coreom. |

### 10b. Novi zadaci

| ID | Što | Repo | Ovisi o | Risk |
|---|---|---|---|---|
| T-0.1 | Pomoćni repo: profil organizacije, predlošci issuea i PR-a, zajednički popis labela | `.github` (ili server) | V-1, odluka 3 | standard |
| T-0.2 | Zajednički workflowi: CI osnova s `ci-ok`, gate, tajne, ovisnosti; S-0.10-a/b se pišu ovdje, ne u serveru | `.github` | U2, S-0.9 | critical |
| T-0.3 | **Ukinuto 17. 11.** (bila su zajednička pravila spajanja; spajanje ide po pravilu iz §7) | `.github` | — | — |
| T-0.4 | Generator početnih datoteka novog repoa | `.github` | S-0.6, T-0.2 (uključuje S-0.10-a) | standard |
| T-0.5 | Objava paketa: verzije, zapisi promjena, objava iz Actionsa | server | S-1H.1-b, odluka 2 | critical |
| T-0.6 | Skripte orkestratora za sedam repozitorija, preklapanje preko repozitorija | Ductus | S-0.21 | critical |
| T-0.7 | Tjedna provjera razilaženja postavki (samo čitanje) | `.github` | T-0.2 | standard |
| P-0.1 | Kostur preloadera (statična izgradnja, proračun veličine) | preloader | V-1b, T-0.4 ili ručno | standard |
| P-0.2 | Dvije odluke kao čiste funkcije, s tablicom iz plana prvog vala; ulaz su client hints i provjera mogućnosti, niz preglednika samo kao zamjena | preloader | P-0.1 | standard |
| P-0.3 | Ručni izbor prikaza i paketa, pamćenje izbora | preloader | P-0.2 | standard |
| P-0.4 | Provjera servera i verzije API-ja | preloader | S-1M-a | standard |
| P-0.5 | Stranice grešaka iz kataloga | preloader | S-1M-c | standard |
| P-0.6 | Traka kolačića i ekran pristanka | preloader | S-1N-d | critical |
| P-0.7 | Ulaz u prijavu AAI@EduHr; FIDO2 za mrežnog inženjera | preloader | S-1E-a, S-1E-g | critical |
| P-0.8 | Slanje konteksta klijenta | preloader | S-1M-b | standard |
| P-0.9 | Info stranica, javni pravni tekstovi, stranica za preuzimanje | preloader | S-1N-c, S-1H.5 | standard |
| P-0.10 | Proxy na domeni i lokalni sistemski stog | preloader | S-1H.7 | critical |
| P-0.11 | Matrica preloadera u Playwrightu (tri motora) | preloader | P-0.3 | standard |
| D-0.1 | Spike desktop ljuske (WebView2, WKWebView, Tauri) s istom web izgradnjom | Ductus `spikes/` | kraj faze B | low |
| E-0.1 | Granica paketa `editor-core` u Ductusu: `packages/editor-core`, bez Next.js-a, transport kao parametar; isti testovi prije i poslije | Ductus | nakon 16. 11. | critical |
| E-0.2 | Objava `@ductura/editor-core` 0.x iz Ductusa | Ductus | E-0.1, odluka 2 | critical |
| E-0.3 | Selidba paketa u web-chrome po uvjetima izlaza (§2d) | web-chrome | VS-1, zamrzavanje Ductusa | critical |
| Uski rez | Sesija, `open`, `commit`, `replay` kao zasebni `critical` PR-ovi redom (O-3, §4c); ID-eve dodjeljuje orkestrator | server | S-0.19 | critical |
| VS-1 | Vertikalni presjek: prijava, otvori, spremi rečenicu, osvježi; samo sintetički podaci; uključuje VS-1.13 (O-2) | preloader, web-chrome, server | S-1E-a, S-1D-d, S-1M-a, uski rez (ranije S-M-5), E-0.2, P-0.1 | critical |
| VS-1b | `202 pending_signature`, worker, red poslova, oporavak; uvjet za osnovicu 20. 12. 2026. i za stvarne podatke (O-2) | server, web-chrome | VS-1 | critical |
| VS-2 | Isti rad otvoren na mobitelu | web-mobile ili web-chrome | VS-1, odluka 13 | standard |
| M-0.1 | Mjere razdvajanja i DORA u `orch:metrics` (repozitorija po promjeni, čekanje na drugi repo, vrijeme do testiranog izdanja) | Ductus | S-0.21 | standard |

### 10c. Raspored

**Tjedan 1 (17.–21. 11.)**
- Ti: V-0 e-pošta (domena odlučena 17. 11.: `ductura.org`). V-1 organizacija i repozitoriji. Odgovori na odluke 1–6, 11 i 14–16.
- U Ductusu odmah: S-0.1 (s izmjenom iz 10a), S-0.2, S-0.3, S-0.21.
- Nakon V-1: S-0.4, zatim S-0.5, S-0.7 i S-0.16 usporedno.

**Tjedan 2 (24.–28. 11.)**
- Ti: V-2 zaštita grane, V-3 prijenos i instalacija aplikacije botova i Codex, V-4 tajne.
- Server: S-0.6, S-0.8, S-0.12, zatim S-0.9, S-0.11, S-0.13, S-0.14.
- `.github`: T-0.2 (u sklopu kojeg se pišu S-0.10-a i S-0.10-b, nakon S-0.9). Redoslijed V-2 (§7): S-0.9 i S-0.10-b dokažu prolaz i očekivani pad prije nego V-2 dopiše statuse.
- T-0.6 i M-0.1 u Ductusu, nakon S-0.21. Mjere počinju s prvim PR-om u serveru.
- E-0.1 u Ductusu (granica paketa editora), nakon prezentacije i uz pisca koji poznaje `src/editor`.
- Ako je pisac slobodan: P-0.1 i P-0.2 (bez servera).

**Izlaz iz dva tjedna:** `Ductura/server` ima CI s `ci-ok`, gate i botove, a jedan pravi PR prošao je cijeli gate. Migracije su prenesene s istim ledgerom. Orkestrator prati server iz svojih skripti. Odluke 1–6, 11 i 14–16 su zapisane na #87.

Ostatak vala 0 (S-0.15, S-0.17, S-0.18, S-0.19) i T-0.1, T-0.4 i T-0.7 ide u treći tjedan. **Uski rez servera (O-3, §4c) počinje odmah iza S-0.19**, dakle u trećem tjednu, kao zasebni `critical` PR-ovi redom, usporedno s valovima 1 do 5. Uvjeti početka: S-0.19 spojen, plan napada za svaki dio, ne više od tri kodna PR-a po repou. VS-1 i VS-1b slijede iza reza (§4a-1), a kontrolna točka 20. 12. 2026. traži VS-1b i izbor sustava za pilot (§4d). T-0.2 (s S-0.10-a/b) je u drugom tjednu jer je preduvjet za T-0.4, T-0.7 i za V-2.

<a id="katalog-zadataka"></a>


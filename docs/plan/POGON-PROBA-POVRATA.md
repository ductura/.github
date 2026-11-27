# Pogon prije pilota: proba povrata baze i rollbacka (PRIJEDLOG)

**Izvor:** Daniel je 27. 11. 2026. potvrdio redoslijed nakon F4: prvo backup i proba povrata, zatim rollback, pa nadzor. U Graditelj sesiji je istog dana na pitanje o pripremi plana odgovorio „Može”. Ovo je samo plan. Zadatke u `red.json` otvara orkestrator tek nakon F4, na Danielovu riječ.

**Granice:** bez deploya, bez produkcije, bez novih tajni i računa. Račune i plan baze na Renderu bira Daniel. Lokalno se rade samo izmišljeni podaci (seed `redovni`).

## Zašto

U `docs/ductus/backend/baza-i-pogon.md` §4.7 piše: „Backup postoji tek kad je restore dokazan.” Danas povrat nije dokazan ni jednom:

| Što postoji | Stanje |
|---|---|
| `server/backup` (SRV) | prazno područje (S-1A-a), bez logike |
| `scripts/operations/restore-drill` (SRV, M11.2-P04) | provjera vraćene baze i bucketa nad izvozom; provjerena samo testovima nad izmišljenim podacima |
| M10.Z2, stvarna proba | nije izvršena: traži staging i račune |
| `render.staging.yaml` | dvije baze PostgreSQL 17 (`ductus`, `ductus_logs`), plan baze nije zadan |
| Migracije | samo naprijed (`docs/BACKEND.md` §6), `migrate:down` je prazan |
| DAN-889 (PLAN-MIGRACIJE, „Pilot, operacije”) | traži povrat u čisti stog, mjerenje vremena i istu sintetičku reviziju |

## Faza L: lokalno, prije staginga

Radi Graditelj na lokalnom stogu. Ne treba nijedan račun, pa može krenuti odmah nakon F4.

**L1. Povrat baze**
1. Stog s `stog.py start --seed redovni` (port 54329).
2. `pg_dump -Fc` baza `ductus_redovni`, `ductus_logs` i `ductus_legal` u mapu izvan repoa. Uz `--seed redovni` server i seed rade nad `ductus_redovni` (`stog.py`, `BAZA_REDOVNI`), ne nad `ductus`, pa je ona izvor glavne baze.
3. Povrat u novu bazu istog kontejnera, npr. `ductus_proba_povrata`. Nikad u postojeće baze, i nikad u `ductus_pr693_2511`.
4. Izmjeri vrijeme izvoza i povrata. To je prva lokalna točka za RTO.

**L2. Isti podaci nakon povrata**
- broj redaka po tablici jednak izvoru;
- ista zadnja verzija migracije;
- pgTAP `000-rls-everywhere.sql` i `002-matrix-coverage.sql` prolaze nad vraćenom bazom, jer `pg_dump` mora vratiti RLS, politike i uloge;
- server pokrenut nad vraćenom bazom: ista sintetička revizija rada daje isti hash i potpis (DAN-889).

**L2b. Niža revizija nakon povrata (R-8)**

PLAN-MIGRACIJE R-8 traži da proba uključi nižu reviziju na poslužitelju nakon povrata (Ductus#87 c.6880906459, varijanta A).
1. Backup uzeti dok demo student ima rad na reviziji N.
2. Nakon backupa u Chromeu napisati još koraka, tako da poslužitelj i lokalni dnevnik klijenta budu na N+k.
3. Vratiti bazu iz backupa. Poslužitelj je sada na N, a klijent na N+k.
4. Provjeriti: klijent ponovno šalje lokalne korake kao nove revizije s novim potpisanim potvrdama, lanac dokaza nosi oznaku „obnovljeno iz lokalne kopije nakon povrata”, i nijedan korak nije izgubljen ni udvostručen.
5. Ako klijent ili poslužitelj to još ne podržavaju, korak je PAD i postaje zadatak za pisca.

**L3. `restore-drill` nad pravim izvozom**
- Pokrenuti `scripts/operations/restore-drill/cli.ts` s metom `http://localhost:4000` i izmišljenom ustanovom `5d5d5d5d-…`.
- Ako alat za izvoz `checkpoint.json`, `tombstones.json`, `copy.json` i `bucket.json` iz vraćene baze ne postoji, to je zadatak za pisca (POGON-IZVOZ-PROBE niže). Ručni izvoz se ne radi.

**L4. Rollback poslužitelja**

Migracije su samo naprijed, pa rollback znači vratiti kod na reviziju N−1 nad bazom koja je već na N.
1. Baza na glavi migracijske grane.
2. Pokrenuti server s prethodnog vlaka.
3. Provjeriti: pokreće li se, prolazi li `GET /api/v1/health`, i rade li prijava i predaja s demo računima u Chromeu.
4. Svaki pad je nalaz. Ili migracija nije unatrag kompatibilna (pravilo širi pa suzi), ili rollback mora zabraniti tu kombinaciju.

**L5. Pohrana objekata**
- Utvrditi što lokalni stog koristi za pohranu sadržaja.
- Isti postupak: kopija, povrat, usporedba hasheva preko `restore-drill`.
- Ako lokalno nema pohrane objekata, L5 se lokalno bilježi kao NEPROVEDENO; povrat bucketa svejedno je obavezan u fazi S (S2b).

**Rezultat:** jedan komentar na Ductus#2059 po koraku, u obliku `GRADITELJ · PROBA POVRATA L<n> PROLAZ|PAD <sha>`. Uz komentar idu izmjerena vremena i broj redaka, bez vrijednosti iz baze.

## Faza S: staging (nakon P-STAGING)

Kreće čim staging radi. Ovo je stavka „P-OPORAVAK” iz PRIJEDLOZI-2611.

**S1. Daniel odabire plan baze na Renderu**
- Treba odgovoriti ima li plan točku povrata u vremenu (PITR) i koliko dana.
- Konačno odgovoriti na §4.7: je li dovoljna kopija kod Rendera ili treba i dnevni šifrirani `pg_dump` kod drugog dobavljača.
- §4.7 još spominje UpCloud; od odluke o hostingu 26. 11. sve je na Renderu, pa §4.7 treba uskladiti.

**S2. Proba povrata**
1. Povrat staging baze u novu instancu.
2. Staging server privremeno usmjeren na nju; varijable mijenja Daniel.
3. Ponoviti L2, L2b i L3.
4. Izmjeriti RTO od odluke do prve uspješne prijave, s DNS-om i tajnama.

**S2b. Povrat bucketa**

Obavezan, bez obzira na L5. Provjera hasheva nad postojećim bucketom ne dokazuje da se kopija može vratiti.
1. Vratiti repliku bucketa (§4.7, `rclone sync` na drugi račun) u novi, privremeni bucket.
2. Staging server privremeno usmjeriti na vraćeni bucket i vraćenu bazu; varijable mijenja Daniel.
3. `restore-drill` nad vraćenom bazom i vraćenim bucketom: hashevi objekata i potvrde se slažu.
4. Preduvjet: izabran dobavljač pohrane (D-08). Dok nije, staging commit rada vraća 503 `storage`, pa S2b čeka D-08 i ostaje otvorena stavka.

**S3. Rollback na stagingu**
- Ručni deploy prethodnog commita u Renderu (`autoDeployTrigger: "off"`). Deploy radi Daniel.
- Zatim provjera iz L4.

**S4. Zapis**
- RPO i RTO kao izmjerene brojke, ne kao ciljevi.
- Rokovi čuvanja svake vrste kopije (§4.7, „Brisanje po roku i kopije”).

## Faza M: mjesečno

Nakon prve uspješne S2 i S2b proba se ponavlja jednom mjesečno, kako §4.7 traži: povrat i baze i bucketa u privremeno okruženje, L2b i `ductus verify` nad uzorkom. Zapis ide u `OPERATIONS.md` u SRV-u. Prozor održavanja baze upisuje se izvan rokova predaje (D-69).

## Predloženi zadaci (otvara orkestrator nakon F4)

| ID | Tko | Ovisi o | Opis |
|---|---|---|---|
| POGON-POVRAT-LOK | Graditelj | F4 | L1, L2, L2b i L5 na lokalnom stogu, zapis na #2059 |
| POGON-IZVOZ-PROBE | pisac SRV | — | Izvoz ulaza za `restore-drill` iz vraćene baze (samo izmišljena ustanova, zatvoreni kodovi u ispisu), uz test |
| POGON-DRILL-LOK | Graditelj | POGON-POVRAT-LOK, POGON-IZVOZ-PROBE | L3 |
| POGON-ROLLBACK-LOK | Graditelj | F4 | L4. Svaki PAD postaje zadatak za pisca. |
| POGON-POVRAT-STG | Graditelj + Daniel | P-STAGING, S1, D-08 (za S2b) | S2, S2b, S3 i S4 |
| DOC-4.7-RENDER | pisac (dokumenti) | S1 | Uskladiti §4.7 s odlukom o hostingu od 26. 11. |

## Odluke koje čekaju Daniela

1. Plan baze na Renderu i PITR (S1).
2. Treba li uz Renderovu kopiju i druga, kod drugog dobavljača.
3. Ciljni RPO i RTO za pilot. Proba daje brojke, a cilj bira Daniel.
4. Tko pokreće mjesečnu probu nakon pilota.

Nadzor grešaka i dostupnosti treći je korak plana i ima zaseban dokument (OPS-NADZOR, PRIJEDLOZI-2611).

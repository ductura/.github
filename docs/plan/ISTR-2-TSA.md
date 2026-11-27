# ISTR-2: žig vremena RFC 3161 za dnevnu kontrolnu točku (nacrt stavke plana, B5)

**Status: U PLANU (M3.9a), odluke O-1 do O-6 donesene 27. 11. 2026.** Daniel je odluke prepustio orkestratoru („to ti odluči”); zapis je u §8. Ovo je dokument, bez koda.

Kartica: [ISTR-2 `tsa-rfc3161-pkijs`](ISTRAZIVANJE-2511.md#istr-2-tsa-rfc3161-pkijs-srv-dio-b5). Repo izvedbe: `ductura/Institution_server` (SRV).

## 1. Izvori

- **D-72 i D-209** ([DECISIONS.md](../ductus/DECISIONS.md)), ODLUČENO 2. 11. 2026.: dnevnu kontrolnu točku žigosavaju dva neovisna besplatna TSA-a, **DigiCert i Sectigo**. FINA dolazi tek kad postoji obrt ili kad FPZG bude ugovorna strana, i nije GO preduvjet. Prvi neovisni primatelj objave je Internet Archive.
- **M3.9** ([PLAN-MIGRACIJE.md](PLAN-MIGRACIJE.md), M3): „Specifikacija i izvedba dnevnog korijena i žiga s CLI verifikatorom (B5, D-72, D-93)”. Tiketi su DAN-55 (specifikacija) i DAN-391 (izvedba). Prema D-203 C2 puni B5 dolazi prije nastavnog pilota.
- **`docs/BACKEND.md` §8** ([BACKEND.md](../ductus/BACKEND.md)) upućuje na povijesni program backenda. U njemu B5 nosi redak „Dnevni korijen i žig, CLI verifikator (D-72)”, procijenjen na 4 do 5 jedinica. Uvjet završetka M3 traži da B5 prođe known-answer vektor i negativne slučajeve iz §8.
- **ADR [dnevnik potvrda po domeni](../ductus/adr/2026-11-02-dnevnik-potvrda-po-domeni.md):**
  - §5 t. 5 određuje dva RFC 3161 zahtjeva nad SHA-256 cijele potpisane bilješke. Barem jedan valjan žig znači uspjeh dana, a dan bez žiga je alarm.
  - §7 t. 7 do 9 opisuje redoslijed rezervacija, potpis, žig, pohrana i objava. Dan bez novih listova dobiva novi žig nad istim potpisom.
  - §9 propisuje objavu `.tsr` uz bilješku.
  - §10 t. 1 navodi što žig dokazuje.
- **Stanje u SRV-u (26. 11. 2026., grana `migracija/kopija-ductus-backend`):**
  - `pnpm evidence:verify` (`scripts/evidence-verify/`) bez mreže provjerava potpisani dnevni korijen i prenosivi zapis. Njegov README kaže: „Vanjski žig vremena (RFC 3161) nije dio ovog koraka.”
  - `server/external/tsa` ne postoji, a PKI.js nije ovisnost.
  - `packages/test-fakes` ima lažne servise (`oidc`, `clock`, `fido2` i druge), ali ne i TSA.

## 2. Razlika prema kartici: što se žigosava

Kartica ISTR-2 kaže da se `TimeStampReq` gradi „iz SHA-256 dnevnog korijena”. ADR §5 t. 5 traži žig nad **SHA-256 cijele potpisane bilješke**, dakle nad tekstom i potpisnim retkom. **Ovaj nacrt prati ADR.**

Razlog: žig nad samim korijenom ne veže vrijeme za potpis ključa kontrolne točke, ni za `tree_size` i ishodište. Žig nad bilješkom veže sve troje.

Dodatna razlika, otvorena u O-6: SRV danas sprema dnevni zapis kao objekt `evidence-daily-root` (`{ day, root, count, keyId, signature }`), a ne kao C2SP bilješku iz ADR-a §5. Koji se točno bajtovi žigosavaju, ovisi o tome kojim se redom ta dva oblika usklađuju.

## 3. Predloženi redak plana

Predlaže se dodati u tablicu M3 u `PLAN-MIGRACIJE.md`, odmah ispod M3.9:

| Korak | Naziv | Uloga | Ovisi o | Tiket |
| --- | --- | --- | --- | --- |
| M3.9a | Žig vremena dnevne kontrolne točke: port RFC 3161 (PKI.js), lažni TSA u `packages/test-fakes`, provjera spremljenog žiga u `evidence:verify` bez mreže (ISTR-2; D-72, D-209) | B | M3.2, ISTR-1, O-6 | novo, uz DAN-391 |

Risk: prema donjoj granici standard, a predlaže se **critical**, jer je ovo lanac povjerenja evidencije.

## 4. Opseg: četiri koraka, svaki u svom PR-u

1. **Port `server/external/tsa`.**
   - Gradi `TimeStampReq`:
     - SHA-256 imprint ulaza iz §2;
     - nov slučajni nonce od najmanje 64 bita za svaki pokušaj;
     - `certReq = true`.
   - Parsira `TimeStampResp` PKI.js-om i `asn1js`-om, na točnim verzijama. Provjerava:
     - status (`granted` ili `grantedWithMods`);
     - algoritam i vrijednost `TSTInfo.messageImprint`;
     - nonce;
     - `genTime`;
     - `ESSCertIDv2` certifikata koji potpisuje;
     - EKU `timeStamping`;
     - lanac do sidra povjerenja (O-3) u trenutku `genTime`.
   - Pozivatelju vraća tipizirani rezultat s kodom razloga i ne baca grešku.
   - Dva TSA-a (DigiCert, Sectigo) zovu se neovisno, a popis TSA-ova dolazi iz konfiguracije.
2. **Lažni TSA u `packages/test-fakes/tsa`.**
   - Testni CA i TSA certifikat nastaju u testu, bez tajni u repou.
   - Golden odgovori, po jedan za svaki način:
     - ispravan;
     - `rejection`;
     - krivi imprint;
     - krivi nonce;
     - istekao certifikat;
     - krivi EKU;
     - neispravan DER;
     - istek veze.
   - Lažni TSA bilježi svaki primljeni zahtjev i odbija sve što nije ispravan `TimeStampReq` s imprintom od 32 bajta.
3. **Žig u dnevnom poslu workera** (ADR §7 t. 7 do 9).
   - DER bajtovi `.tsr` spremaju se točno kako su primljeni, uz dnevni zapis i lanac potreban za provjeru bez mreže (O-5).
   - Dan s barem jednim valjanim žigom je uspjeh.
   - Dan bez valjanog žiga je alarm i zapisana praznina, a ne greška koja ruši posao.
4. **CLI `evidence:verify`** dobiva provjeru spremljenog žiga, na primjer `--tsr <datoteka> --tsa-anchors <pem>`.
   - Bez mreže i bez baze provjerava `.tsr` prema SHA-256 bajtova iz §2 i prema sidrima.
   - Izlaz je u postojećem obliku (`ISPRAVNO` / `NEISPRAVNO: <kod>`) i nikad ne ispisuje ulaz.
   - Provjera žiga u prenosivom zapisu (`--record`, M7.10) nije dio ove stavke.

## 5. Granice

- TSA-u ide samo hash. Nikad ne ide sadržaj, identifikator, ime ni drugi osobni podatak.
- Testovi i CI ne zovu mrežu, nego samo lažni TSA. Stvarni pozivi DigiCertu i Sectigu idu samo iz workera u okolini koja ima mrežu.
- Jedine nove ovisnosti su `pkijs` i `asn1js`, na točnim verzijama. Licencu provjerava `dependency-review`.
- Tvrdnja ostaje ograničena (`BACKEND.md` §4.2, ADR §10 t. 1): žig pokazuje da su ti bajtovi postojali najkasnije u `genTime`. Ne govori ništa o sadržaju, autorstvu ni potpunosti dnevnika.
- Format bilješke, inclusion i consistency dokaza određuje M3.9-P05 i P07 (ADR §5). Ova stavka ga ne mijenja.
- Nijedan postojeći test se ne briše ni ne preskače.

## 6. Gotovo kad

- Svaka dnevna kontrolna točka ima dva žiga ili zapisanu prazninu s kodom razloga.
- `evidence:verify` provjerava spremljeni žig bez mreže.
- Koraci 1 do 4 spojeni su, svaki sa zelenim CI-jem.

## 7. Testovi prihvata

- Golden odgovori lažnog TSA-a iz koraka 2 daju točno očekivani kod razloga.
- Property test: promjena jednog bajta ulaza iz §2 ruši provjeru.
- Lažni TSA nikad ne primi ništa osim ispravnog `TimeStampReq` s imprintom od 32 bajta.
- Dan u kojem oba TSA-a padnu daje alarm i zapisanu prazninu, a posao ne baca grešku.
- Dan bez novih listova daje isti potpis i nov žig (ADR §7 t. 9).
- CLI prolazi kao stvarni proces bez mreže, na ispravnom žigu i na svakom negativnom slučaju.

## 8. Odluke (27. 11. 2026.)

Daniel je 27. 11. 2026. u chatu orkestratora odluke prepustio orkestratoru („ove odluke za O01 do O06 to ti odluči”). Orkestrator je izabrao opcije koje najbolje čuvaju provjeru bez mreže i najmanje lome postojeći ADR. Ako Daniel kasnije odluči drukčije, mijenja se samo konfiguracija (O-1, O-2, O-4) ili se otvara nova stavka (O-3, O-5, O-6).

| Pitanje | Odluka | Razlog |
| --- | --- | --- |
| **O-1. FINA** | **(b)** U pilotu je nema. Uvodi se kao **treći** TSA (uz DigiCert i Sectigo) kad postoji obrt ili kad FPZG postane ugovorna strana. | Prati D-72 i D-209. Popis TSA-ova je u konfiguraciji, pa nema promjene koda. Treći TSA dodaje neovisnost i ništa ne oduzima. |
| **O-2. Rezervni TSA** | **(c)** Nema rezervnog TSA-a. Dan bez valjanog žiga daje alarm i zapisanu prazninu, a idući dan se ponovno žigosava nad istim potpisom. | Ostaje u okviru ADR-a §5 t. 5 i §7 t. 9 (dan bez novih listova dobiva nov žig nad istim potpisom). Ne uvodi trećeg javnog pružatelja bez provjere. |
| **O-3. Sidra povjerenja** | **(a)** Korijenski certifikati obaju TSA-ova fiksirani su u repou i mijenjaju se samo kroz PR. | Provjera je ponovljiva bez mreže i ne ovisi o spremištu stroja. Ne lomi se pri rotaciji certifikata TSA-a, za razliku od (c). |
| **O-4. Ponovni pokušaji** | **(a)** Više pokušaja s eksponencijalnim backoffom unutar dnevnog prozora, svaki s novim nonceom. Što ostane bez žiga, pokriva O-2 (c). | Kratki ispadi ne stvaraju praznine. Gornja granica pokušaja ide u konfiguraciju. |
| **O-5. Lanac za provjeru bez mreže** | **(b)** Uz `.tsr` (s `certReq = true`) spremaju se i objavljuju posrednički i korijenski certifikat **te CRL ili OCSP odgovor iz trenutka žiga**. | Žig ostaje provjerljiv i nakon isteka ili opoziva certifikata TSA-a. To je smisao evidencije koja mora vrijediti godinama. |
| **O-6. Točni bajtovi** | **(a)** Prvo se SRV zapis uskladi s bilješkom iz ADR-a (M3.9-P05), pa se žigosavaju bajtovi cijele potpisane bilješke. | Jedan known-answer vektor umjesto dva i nijedan stvarni žig nad oblikom koji se napušta. Koraci 1 i 2 ne čekaju ovu odluku. |

Posljedica za redoslijed: koraci 1 i 2 kreću odmah. Korak 3 čeka M3.2 i M3.9-P05 (O-6). Korak 4 čeka korak 3.

## 9. Redoslijed

Korak 1 i korak 2 neovisni su o O-1 do O-6 i mogu krenuti čim je stavka u planu. ISTR-1 ide prije ISTR-2 (kartica, „Redoslijed”). Korak 3 čeka M3.2 te odgovore na O-4, O-5 i O-6. Korak 4 čeka O-3, O-5 i O-6.

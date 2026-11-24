# Faza 3: provjere A01–A10 na stvarnom stogu

Izvori: komentari na Ductus#2055 (oznaka „c.” + ID komentara), `D:\Ductura\_raspored\red.json` i `stanje.json` (stanje 24. 11. 2026.) te PR-ovi u `ductura/Institution_server` (SRV), `ductura/Institution_front_web_chrome` (WEB) i `ductura/Preloader` (PRE). Za svaku tvrdnju naveden je izvor. Gdje izvor nešto ne kaže, piše „nije utvrđeno”.

## Uvod

- **Što je faza 3:** deset scenarija A01–A10 provjereno je na stvarnom stogu. Stog čine PostgreSQL, lažni OIDC, Institution_server, Aplication_server i Aplication_front te front institucije iza edgea :8000, a podiže ga `pnpm sve` u Preloaderu (c.7105362824). Izlazni uvjet F3b: A01–A10 imaju PROLAZ na istim SHA-ovima, a tablica je objavljena na ploči (c.7108359156).
- **Tko je radio:** lokalni graditelj na Danielovu odluku od 23. 11. 2026. („Možeš ti preuzimaš fazu 3 lokalno”, c.7105362824). Dok je provjera trajala, na računalu nije bilo lokalnih pisaca ni paralelnih testova. Popravci su išli kao graditelj PR-ovi u migracijske baze, nikad u `main` (c.7105362824). Veće popravke (INT-15-SRV i INT-15-WEB) radili su pisci u oblaku (c.7108318301, c.7109775542).
- **Kada:** 23. 11. 2026. Početak je u 15:18 UTC (c.7105362824). Prva tablica objavljena je u 17:36 (c.7108913164), završna u 18:56 (c.7110879950), a lokalni ponovni prolaz s A07/A09 u 19:22 (c.7111506458). Orkestrator je fazu 3 proglasio gotovom u 19:26 (c.7111608336).
- **SHA-ovi završne tablice** (c.7110879950, c.7111506458):
  - WEB `bc2e5f1a`: squash commit WEB #542 (INT-15-WEB);
  - SRV `ffb96c57`: squash commit SRV #665 (INT-15-SRV). Spojen je nakon SRV #666 (d122f696), pa ga uključuje;
  - Preloader `0fadb6dd`: squash commit Preloader #59.

  Sva tri su glave migracijskih baza `migracija/kopija-ductus-front`, `migracija/kopija-ductus-backend` i `migracija/nextjs` (podaci PR-ova).
- **Tablice:**
  - završna tablica: <https://github.com/danielrisavi77-create/Ductus/issues/2055#issuecomment-7110879950>;
  - lokalni ponovni prolaz s Dockerom (A07/A09 i lokalno PROLAZ): <https://github.com/danielrisavi77-create/Ductus/issues/2055#issuecomment-7111506458>;
  - prva tablica, na SHA WEB `9ed7bab6`, SRV `c30ff3ea`, PRE `0fadb6dd`: c.7108913164.
- **Gdje se provjeravalo:**
  - lokalno: Windows 10, `pnpm sve`, produkcijski build fronta, nova čista baza na zasebnom PG16 klasteru :5433, stara baza netaknuta. Rezultat: `pnpm test:sistem` 13/13 PROLAZ (c.7110879950, c.7111506458);
  - lokalno s Dockerom: A07/A09 `integration-pg` 6/6 PROLAZ na compose bazama (c.7111506458);
  - CI: WEB `sistem.yml` 13/13 PROLAZ. SRV ima zelen `ci-ok`, a A07/A09 se izvode u poslu „PostgreSQL i pgTAP” (c.7110879950). Broj CI runa za završne SHA-ove komentar ne navodi: nije utvrđeno. Na SHA-ovima prve tablice to su WEB run 45227612832 i SRV run 45221859779 (c.7108913164). Sistemski run 45238656523 zelen je nakon INT-15 (c.7110355858).

## Tablica A01–A10

Ishod je prepisan iz c.7110879950, a stupac „lokalno” dopunjen je iz c.7111506458.

| A | Što se provjerava | Ishod (CI / lokalno) | Dokaz | Popravci koji su iz nje nastali |
|---|---|---|---|---|
| A01 | Korisnik s početne adrese preko Preloadera stiže na pravu aplikaciju. | PROLAZ / PROLAZ. Lokalno 24/24 (c.7107314928). | VS-1, koraci do 1.12 (c.7110879950) | Nema posebnog popravka. Za stog na Windowsu: SRV #661, SRV #662 (vidi niže). |
| A02 | Administrator ustanove postavlja kolegij i nastavnika (provisioning). | PROLAZ / PROLAZ | INT-05 (c.7110879950); A02/A03 lokalno PROLAZ i kroz INT-06 (c.7107314928) | Nije utvrđen popravak nastao u fazi 3. |
| A03 | Prijava preko lažnog OIDC-a, koji postoji samo lokalno i u CI-ju, radi za sve uloge. | PROLAZ / PROLAZ | VS-1 i svi sistemski testovi (c.7110879950) | Nije utvrđen poseban popravak. |
| A04 | Svaka uloga nakon prijave dobiva svoj početni zaslon. | PROLAZ / PROLAZ. U prvoj tablici lokalno je prošao samo INT-05 (c.7108913164). | INT-05, INT-04 (c.7110879950) | Lokalni pad INT-04 nije bio kvar u kodu (vidi A08). |
| A05 | Student piše u editoru, a poslužitelj potvrđuje spremanje. | PROLAZ / PROLAZ | WEB-14 ×3, WEB-15 ×2, axe ×2, INT-03 (c.7110879950) | WEB #538: naziv trake „Alati za oblikovanje” u WEB-15 (c.7107314928, c.7107782888). SRV #663: obrazac izjave za `demo-fakultet` (c.7107632468). WEB #539: INT-03 čeka h1 koraka izjave (c.7108258259). |
| A06 | Nakon ponovnog pokretanja servera i u svježem pregledniku vraćaju se isti documentId, revizija i hash. | PROLAZ (Linux) / PROLAZ (Windows, kroz nadzornika) | VS-1.13 (c.7110879950). Lokalni dokaz: PID 19344 → 6764, TerminateProcess, health 200 (c.7109088110, c.7109235752). | SRV #666 (nadzornik u `pnpm lokalno`) i WEB #540 (VS-1.13 na Windowsu). Prije toga NEPROVEDENO, jer na Windowsu nema `ss` ni `/proc` (c.7107314928, c.7108913164). |
| A07 | Kad se izgubi odgovor ili radnik padne usred potpisa, nastaje točno jedna revizija i jedna potvrda. | PROLAZ / u c.7110879950 NEPROVEDENO (Docker se lokalno nije pokretao), u c.7111506458 PROLAZ | SRV `a07-jedna-potvrda.pg` 3/3 (c.7110879950); lokalno `integration-pg` na compose bazi u Dockeru (c.7111506458) | Nema popravka koda. Lokalno je čekalo da Windows (WinNAT) oslobodi portove 54329/54330 (c.7111425930). |
| A08 | Student predaje rad, a nastavnik ga vidi, pregledava i komentira. | PROLAZ / PROLAZ | INT-03, INT-04, INT-15 (c.7110879950) | INT-15-SRV (SRV #665) i INT-15-WEB (WEB #541 izvadak, WEB #542): komentar nastavnika vezan je uz reviziju, pa INT-15 više nije `test.fail` (c.7108278536, c.7110355858). SRV #663 i WEB #539 (izjava, vidi A05). |
| A09 | Tuđi rad i druga ustanova odbijeni su kroz HTTP i kroz stvarnu ulogu u bazi (RLS). | PROLAZ / u c.7110879950 dio s INT-04 PROLAZ, a pgTAP dio NEPROVEDENO; u c.7111506458 PROLAZ | SRV `a09-pristup.pg` 3/3 i INT-04 „drugi kolegij” (c.7110879950); lokalno `integration-pg` (c.7111506458) | Kao A07, nema popravka koda. |
| A10 | Dvije kartice istog preglednika: nakon odjave u jednoj, druga ne vidi lokalni dnevnik ni scope prve. | PROLAZ / PROLAZ | INT-20 (c.7110879950) | Preloader #59 i WEB #538: front dobiva `OIDC_ISSUER`, pa CSP `form-action` više ne zaustavlja odjavu (c.7107314928, c.7107632468). |

Raniji lokalni padovi INT-04 i INT-15 imali su tri uzroka, a nijedan nije bio kvar u kodu (c.7110879950, c.7111506458):

- stara baza s ostacima prijašnjih pokretanja: četiri ista odlomka iz ranijih INT-03, pa je lokator bio dvosmislen (c.7108913164);
- lokalni SRV prije #665;
- neučitan `e2e/sistem/seed-int04.sql`. Na Windowsu ga je učitao zasebni klaster s `unix_socket_directories`.

Uz to, lokalni PostgreSQL od 15:55 UTC nije odgovarao (`write_failed`), pa su rezultati INT-03, INT-04 i INT-15 iz tog vremena bili nevažeći (c.7107314928).

## Popravci i dodatni zadaci

### PR-ovi nastali tijekom provjere A01–A10 (23. 11. 2026.)

| PR | Zadatak / svrha | Što je popravio | Stanje |
|---|---|---|---|
| SRV #661 | LOK-WIN-sjeme | Lokalno sjeme za potpis drži se izvan checkouta na Windowsu (c.7107314928). | Spojen 16:01 UTC, squash 5013dc84 (c.7106506221) |
| SRV #662 | LOK-WIN-sitno | Dorade nakon pregleda #661: pričuva za `HOME`, napomena o sjemenu i vlastiti `__proto__` u property testu (c.7107632468). | Spojen, c30ff3ea (c.7108258259). Neovisni pregled ODOBRENO (c.7107895273). |
| SRV #663 | LOK-demo-izjava | Izmišljeni obrazac izjave za `demo-fakultet`, koji je bio uzrok pada INT-03, INT-04 i INT-15 (c.7107632468). | Spojen 16:51 UTC, 4a547842, na Danielovu naredbu prije neovisnog pregleda (c.7107782888). Pregled ODOBRENO stigao je u 16:55 (c.7107895273). |
| Preloader #59 | INT-20 / LOK | `OIDC_ISSUER` za front institucije u `pnpm sve` (c.7107632468). | Spojen u `migracija/nextjs`, 0fadb6dd |
| WEB #538 | INT-20, WEB-15 | `OIDC_ISSUER` za front u sistemskom CI-ju i zadržan naziv trake alata (c.7107314928, c.7107782888). | Spojen, 0e35bad3. Pregled ODOBRENO (c.7107895273). |
| WEB #539 | INT-03 | Sistemski test čeka vlastiti naslov koraka izjave (c.7108258259). | Spojen, 9ed7bab6 |
| SRV #666 | A06 Windows | Nadzornik u `pnpm lokalno` ponovno pokreće server kad test to najavi (c.7109088110). | Spojen, d122f696, na Danielov „spoji 666”, bez neovisnog pregleda (c.7109235752) |
| WEB #540 | A06 Windows | VS-1.13 na Windowsu ide kroz nadzornika (Get-NetTCPConnection, TerminateProcess) (c.7109088110). | Spojen, 8447e2d9 (c.7109235752) |
| SRV #665 | INT-15-SRV | Komentar nastavnika vezan je uz reviziju rada (ugovor, migracija, RLS, pgTAP) (red.json INT-15-SRV, c.7108278536). | Spojen, ffb96c57 (c.7109775542) |
| SRV #664 | INT-15-SRV (duplikat) | Drugi pisac je paralelno radio isti zadatak (c.7109775542). | Zatvoren, nije spojen |
| WEB #541 | izvadak ugovora | Izvadak ugovora sa servera ffb96c57, s poljem `revision` (c.7109775542). | Spojen, 466dcde9 |
| WEB #542 | INT-15-WEB | Panel nastavnika šalje reviziju i ispisuje „uz verziju V{n}”, a iz INT-15 je uklonjen `test.fail` (red.json INT-15-WEB). | Spojen, bc2e5f1a. Sistemski run 45238656523 zelen (c.7110355858). |

Ostali sistemski runovi iz tog dijela posla:

- 45213564111: potvrda WEB-15 na Linuxu (c.7107314928);
- 45219151604: grana #538 (c.7107632468);
- 45223438214: zelen, 12 testova prolazi, a INT-15 je tada još `test.fail` (c.7108258259).

### Zadaci u red.json koji su podloga za A01–A10

Ovi zadaci su ranije uneseni u red.json. U fazi 3 služe kao dokaz u tablici. Svi su u red.json označeni kao „spojeno”:

- INT-01: lokalni stog jednom naredbom;
- INT-02: VS-1;
- INT-03: tok predaje;
- INT-04: nastavnik i RLS;
- INT-05: administrator;
- INT-06;
- LOK-2: `pnpm sve` u Preloaderu;
- INT-08 i INT-09: `sistem.yml` u WEB-u i Preloaderu;
- INT-10;
- INT-15: sistemski test;
- INT-17: A06;
- INT-18: A07;
- INT-19: A09;
- INT-19b;
- INT-20: A10;
- INT-20c do INT-20g;
- LOK-SRV-1;
- LOK-WEB-1 do LOK-WEB-7, LOK-WEB-9 i LOK-WEB-20 do LOK-WEB-26.

Brojevi PR-ova za te ranije zadatke ovdje nisu prikupljeni: nije utvrđeno, osim brojeva koje navodi sam red.json. Taj navodi WEB #469 (INT-20c) te SRV #635, #636, #638, #639 i #640 (pregledi INT-19 i INT-20).

### Povezani rad istog dana, izvan A01–A10 (v3 u upaljenoj aplikaciji)

Prije faze 3, 23. 11., graditelj je radio INT-22. Rezultat je završni nalaz c.7102492123. Iz njega su nastali zadaci za oblak (c.7103473278). To nije dio tablice A01–A10, ali je isti dan i isti način rada:

| Zadatak | PR | Stanje |
|---|---|---|
| LOK-SRV-V3 (lažni server daje rad sheme 3) | SRV #654 | Spojen, e54f3a8d (c.7102234410) |
| INT-27 (lažni server navodi sve verzije) | SRV #657 | Spojen, 2f1c37f0 (c.7104067837) |
| INT-23 (reprodukcija v3) | WEB #536 | Spojen, fa3e05ce |
| INT-24 (vidljiva oznaka fusnote) | WEB #535 | Spojen |
| INT-25 (fusnota u kopiranom tekstu) | WEB #534 | Spojen |
| INT-26 (uživo za v3) | WEB #537 | Spojen, 1cc96465 |

## Što je ostalo otvoreno

- **LOK-PREGLED-LAPTOP:** trajni stog na laptopu za Danielov ručni pregled. Prema red.json kreće najranije 25. 11. u 09:48 i nije spojeno.
- **Zadaci faze 3 koji u red.json nisu označeni kao spojeni:**
  - INT-07: Preloader VS-2, usmjeravanje po uređaju;
  - INT-12: parseri nad ugovornim vektorima;
  - LOK-WEB-8: `/ustanova`, `/ustanova/korisnici` i `/ustanova/kolegiji` bez API poziva.

  Ti zadaci nisu bili dokaz u tablici A01–A10. Imaju li otvoren PR, nije utvrđeno.
- **INT-20g:** u opisu piše „Kasnije, nije hitno”: server sam provjerava starost pokušaja prijave, test spajanja više zaglavlja Cookie i donja tolerancija `auth_time` nakon mjerenja na stagingu. U red.json je ipak „spojeno”. Je li dio s mjerenjem na stagingu napravljen, nije utvrđeno.
- **Neblokirajući nalazi iz pregleda tijekom faze 3:**
  - c.7106506221: `auth.integration.test.ts:316` je vjerojatno nestabilan;
  - c.7107895273:
    - netočna napomena o ACL-u u `evidence.ts:61-63`;
    - `vs1.ts:93` procesima djeci šalje `HOME ?? ""`;
    - pričuva za `HOME` nema test;
    - nestabilan `legal-hold.pg.integration.test.ts:125`;
    - `EditorToolbarHost.tsx:36-37` gubi `label` kad je zadan `behaviour`;
    - JSDoc komentar `KEPT_LABELS` u `StudentToolbar.tsx` ostao je bez konstante;
    - Docker slika SRV-a nema nijedan obrazac izjave, što treba riješiti prije prvog staginga.

  U naslovima PR-ova u SRV-u i WEB-u otvorenih od 23. 11. u 12:00 nije nađen PR koji ih popravlja. Jesu li riješeni, nije utvrđeno.
- **Crvena SRV baza:** test `reconcile-pending-receipts` (istodobno potpisivanje) vratio je `already_signed` umjesto `signed`, a ponovni pokušaj je bio u tijeku (c.7108359156). Završna tablica za SRV navodi zelen `ci-ok` (c.7110879950). Je li test kasnije popravljen ili je bio nestabilan, nije utvrđeno.
- **Spajanja bez neovisnog pregleda:** SRV #666 je spojen bez neovisnog pregleda, jer Codex pregled nije uspio zbog limita (c.7109235752). Naknadni pregled nije utvrđen. SRV #663 je pregled ODOBRENO dobio tek nakon spajanja (c.7107782888, c.7107895273).
- **Neusklađen red.json:** u red.json INT-15-SRV, INT-15-WEB i INT-23 do INT-26 nemaju oznaku „spojeno”, iako su njihovi PR-ovi spojeni (SRV #665, WEB #542, WEB #534 do #537). Za tablicu A01–A10 to nije otvoren posao.

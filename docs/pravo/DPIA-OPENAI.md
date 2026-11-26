# DPIA: AI pomoćnik preko OpenAI-ja (nacrt)

> **PRIJEDLOG — konačno odlučuju Daniel i pravnik.** Nacrt nije pravni savjet ni pravno mišljenje. Opisuje što kod i planovi rade, ne ocjenjuje zakonitost. Sva mjesta označena **[PRAVNIK]** čekaju pravnika. Stanje izvora: `ductura/Institution_server`, grana `migracija/kopija-ductus-backend`, 26. 11. 2026.

Odluka D-316 (plan `plan/p1-q10-2611`, .github#103): AI pružatelj je OpenAI; model računa po `PLAN.md` Q-10/C15; konkretni model bira samo Daniel. Ovaj nacrt nadopunjuje `docs/plan/DPIA-OBRADE.md` (obrada O-10) i **ne mijenja odluke**. Konačnu DPIA radi ustanova s pravnikom i službenikom za zaštitu podataka.

## 1. Opis obrade

- Student sam šalje odlomak teksta AI pomoćniku; pomoćnik odgovara. Zahtjevi idu kroz RPC sheme `assistant` (zahtjev, poruka, knjiga troška, brojači). Zapis prijenosa (`ductus-ai-transfer-v1`) nosi samo hash, ne sadržaj razgovora.
- Prema planu (Q-10, C15) student se spaja **svojim ChatGPT računom** ("Sign in with ChatGPT"), bez kredita koje plaća Ductura ili fakultet. Uvjete tog programa pisac provjerava prije gradnje; nisu provjereni u ovom dokumentu. **[PRAVNIK]**
- Stanje: za prave studente `ai_disabled` dok ne stigne pravno mišljenje (C15, C16). Rad s izmišljenim podacima u demou je dopušten.
- Osim pomoćnika, AI izlaz se uspoređuje s tekstom rada deterministički (8+ riječi, bez modela); to nije slanje OpenAI-ju (O-9).

## 2. Podaci koji idu pružatelju

Odlomak koji student sam pošalje i njegov kontekst zahtjeva; po zadanom bez identiteta. Studentov ChatGPT račun je odnos studenta i OpenAI-ja po njihovim uvjetima, ne naš izvršitelj: **tko je voditelj za taj tok: **[PRAVNIK]**. Tekst rada izvan odlomka ne šalje se.

## 3. Prijenos izvan EU-a

Prema `docs/AI-PRUZATELJI-MATRICA.md` (Ductus, 10. 11. 2026.) [OA-1]:

- Obrada u Europi (EEA i Švicarska) bira se kao postavka novog projekta i koristi `eu.api.openai.com`; traži odobrenje kontrola nadzora zloupotrebe i dodatak "Modified Retention".
- "Support for regional storage does not imply support for regional processing"; `/v1/files` i `/v1/vector_stores` nemaju regionalnu obradu. Obrada isključivo u EU: **nije potvrđena**.
- Ako se koristi studentov osobni račun, regionalne postavke projekta ne vrijede nužno; razlog D-77 (osobni računi ne mogu jamčiti obradu u EU) i dalje se odnosi na taj slučaj. **[PRAVNIK]**
- Sjedište, DPA i popis podizvršitelja OpenAI-ja nisu pročitani (stranice su vratile HTTP 403) [OA-2], [OA-3]: **neprovjereno**.
- Pravni mehanizam prijenosa (SCC, EU-US okvir) i procjena učinka prijenosa: **[PRAVNIK]**.

## 4. DPA

Za varijantu s API-jem i projektom ustanove potreban je DPA s OpenAI-jem (čl. 28.) prije ikakvih stvarnih podataka. Za varijantu s osobnim ChatGPT računom DPA ne postoji između ustanove i OpenAI-ja; to je razlog zasebne pravne ocjene. **[PRAVNIK]**

## 5. Zadržavanje i treniranje

Zadano se zapisi nadzora zloupotrebe čuvaju do 30 dana; ZDR i izmijenjeno zadržavanje traže prethodno odobrenje OpenAI-ja [OA-1]. Izvor navodi da se podaci API-ja ne koriste za treniranje; za osobne ChatGPT račune pravila su druga i **nisu provjerena**. Ductura sa svoje strane čuva zapis pomoćnika (klasa 24) i izjavu o AI-ju (klasa 17); rok nije odlučen (Q-10). **[PRAVNIK]**

## 6. Smještaj u EU

EU opcija postoji samo uz uvjete iz odjeljka 3 i samo za API projekt, ne za osobne račune. Ako ustanova ne dobije EU obradu, alternativa je ostaviti pomoćnika isključenim (C16). Izbor drugog pružatelja je Danielova odluka (Q-10) i ovdje se ne predlaže.

## 7. Rizici i mjere

| Rizik | Mjera u dizajnu | Ostaje |
|---|---|---|
| Osobni podaci u odlomku | student šalje sam; upozorenje u sučelju | **[PRAVNIK]** |
| Prijenos izvan EU | isključen za prave studente | odluka o mehanizmu |
| Pokušaj da se izlaz koristi kao dokaz autorstva | oznake "nisu dokaz autorstva", ne blokiraju, ne ocjenjuju (Ustav C-6) | — |
| Prekoračenje troška | brojači i proračun (`assistant.budget_counter`) | — |
| Nepoznati uvjeti OpenAI-ja | nisu pročitani | pročitati DPA, podizvršitelje, uvjete "Sign in with ChatGPT" |
| Maloljetni studenti | — | dobna granica, **[PRAVNIK]** |

## Otvorena pitanja za pravnika

1. Tko je voditelj za tok odlomka kad student koristi vlastiti ChatGPT račun.
2. Je li prijenos dopušten i kojim mehanizmom; je li EU obrada dovoljna za ustanovu.
3. Treba li DPA i s kime, ovisno o varijanti (API projekt ustanove ili osobni račun).
4. Pravna osnova i rok čuvanja zapisa pomoćnika i izjave o AI-ju.
5. Dob korisnika i roditeljska privola za maloljetne studente.
6. Zadržavanje kod OpenAI-ja i treniranje za osobne račune.
7. Je li potrebno prethodno savjetovanje s nadzornim tijelom (čl. 36.).

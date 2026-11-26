# Rokovi čuvanja (nacrt)

> **PRIJEDLOG — konačno odlučuju Daniel i pravnik.** Nacrt nije pravni savjet ni pravno mišljenje. Opisuje što kod i planovi rade, ne ocjenjuje zakonitost. Sva mjesta označena **[PRAVNIK]** čekaju pravnika. Stanje izvora: `ductura/Institution_server`, grana `migracija/kopija-ductus-backend`, 26. 11. 2026.

Ovaj dokument **ne određuje rokove**. Prenosi stanje: što je odlučeno, što je prijedlog i što je nepoznato (D-30 je PRIJEDLOG, Q-16 i Q-3 otvoreni). Klase su iz `docs/ductus/privacy/06-klase-podataka.md`, prijedlozi iz `07-prijedlog-rokova-cuvanja.md`. Kod ne smije brisati ništa bez broja dana u katalogu.

## 1. Stanje u kodu

`server/domain/retention/catalog.ts` (Institution_server) ima šest ključeva: `sessions` (klasa 3), `live-state` (15), `versions` (13, 14), `change-times` (22), `access-log` (25) i `receipts` (27).

- Jedino `sessions` ima rok: **30 dana nakon kraja**, način `execute` (brisanje izgrađeno, `app.purge_ended_sessions`).
- Ostale klase imaju `retentionDays: null` i rade samo kao brojanje (`dry-run`, izvještaj `institution.retention.get`). Tip dopušta brisanje samo uz broj dana.
- `receipts` (hashevi i potvrde, klasa 27) nikad se ne brišu i ne broje se (`erasable: false`, D-272 MQ06). **[PRAVNIK]**
- Postoje i dry-run migracije za zaostale podatke o radu (`retention_orphan_work_data`).

## 2. Određeno, prijedlog, nepoznato

| Klasa | Naziv | Određeno | Prijedlog | Nepoznato |
|---|---|---|---|---|
| 3 | Sesije | 30 dana nakon kraja (D-273 MQ08) | — | — |
| 20 | Izvozni paket | 24 sata (D-173, D-273) | — | — |
| 23 | Odbačeni privremeni objekti | brišu se prije D-30 | — | trajanje |
| 13 | Revizije dokumenta | — | do kraja akademske godine | potvrda |
| 16, 18, 19, 21 | Predani rad, komentari, dorade, odsječci | — | prema pravilniku fakulteta | koji pravilnik i koji rok |
| 25 | Zapis pristupa radu | — | dulje od predaje | koliko dulje |
| 27 | Hashevi i potvrde | — | rok klase 16 uz rok za prigovor | rok za prigovor; osobni podatak? |
| 8 | Evaluacija pilota | — | do kraja evaluacije | je li dovoljno |
| 22 | Vrijeme po promjeni | — | — | rok; D-143 traži kraći od ostale evidencije |
| 15 | Prikaz uživo | — | — | rok; briše se pri kraju rada |
| 17, 24 | Izjava o AI-ju, zapis pomoćnika | — | — | rok (Q-10) |
| ostalo | klase 1, 2, 4 do 7, 9 do 11, 14, 26, 28 | — | — | rok |
| 29 | Kopije | — | — | rok po vrsti kopije (D-12); PITR 3 dana je tehnička postavka |
| 30 | Lokalni dnevnik | — | — | rok trajanja prije pilota (D-118, D-122) |

Ustav v1.9 (P-3): ako se ikad bilježi sadržaj tipki u editoru, briše se nakon izračuna pravila "za pregled", najkasnije 30 dana nakon predaje. To je odluka vlasnika, ali se ne gradi prije pilota i sa stvarnim studentima traži novo pravno mišljenje i DPIA.

## 3. Kopije i brisanje

Brisanje u kopijama traži vlastiti rok po vrsti kopije (D-12). Do tada izbrisani podatak ostaje u kopijama do isteka njihova roka; to mora stajati u politici privatnosti. **[PRAVNIK]**

## Otvorena pitanja za pravnika

1. Rok za svaku klasu iz tablice (D-30).
2. Jesu li hashevi i potvrde osobni podatak, koliko se čuvaju i koji je rok za prigovor na predaju.
3. Rok čuvanja dokaza prvog administratora ustanove (D-262 Q04).
4. Rok za zapis pristupa i za vrijeme po promjeni (razmjernost, D-55, D-142, D-143).
5. Treba li izričito pravilo o brisanju nakon odjave studenta s kolegija ili ispisa.
6. Pravni temelj za zadržavanje pod pravnom zadrškom (tablica `evidence.legal_hold` postoji u shemi).

# Kolačići i lokalna pohrana (nacrt)

> **PRIJEDLOG — konačno odlučuju Daniel i pravnik.** Nacrt nije pravni savjet ni pravno mišljenje. Opisuje što kod i planovi rade, ne ocjenjuje zakonitost. Sva mjesta označena **[PRAVNIK]** čekaju pravnika. Stanje izvora: `ductura/Institution_server`, grana `migracija/kopija-ductus-backend`, 26. 11. 2026.

Izvor: `server/http/auth-flow.ts` i inventar tokova (`docs/privacy/08`, Institution_server). Popis opisuje kod; pravnik ocjenjuje je li potrebna privola.

## 1. Kolačići

| Naziv | Svrha | Trajanje | Atributi | Kategorija |
|---|---|---|---|---|
| `__Host-ductus_login` | stanje prijave dok traje prelazak na AAI@EduHr (nasumični parametri, bez identiteta) | 300 s | HttpOnly, Secure, SameSite=Lax, Path=/ | nužan |
| `__Secure-ductus_signed_out` | znak izričite odjave: sljedeća prijava traži ponovnu prijavu kod AAI@EduHr; vrijednost je konstanta, ništa o osobi | 300 s | HttpOnly, Secure, SameSite=Lax, Path=/api/v1/auth | nužan |
| `__Host-ductus_session` | drži prijavljenu sesiju (neprozirni znak) | do odjave; zapis sesije briše se 30 dana nakon kraja | `__Host-` (Secure, Path=/, bez Domain); ostale atribute **[provjeriti u kodu prije objave]** | nužan |

Nema kolačića za oglašavanje, praćenje ni analitiku. Ductura ne koristi alate trećih strana za analitiku (stanje koda: nema takvog sloja **[PRAVNIK: potvrditi prije objave]**).

## 2. Lokalna pohrana u pregledniku

| Spremnik | Sadržaj | Rok |
|---|---|---|
| IndexedDB (lokalni dnevnik) | tekst rada dok se ne sinkronizira (klasa 30) | do sinkronizacije ili odjave; rok otvoren (D-118, D-122) |
| localStorage | hashirane oznake sesije (SessionObserver) i odabrani jezik sučelja | do odjave **[provjeriti]** |

## 3. Pravna ocjena

Samo nužni kolačići i pohrana nužna za uslugu koju korisnik traži: **[PRAVNIK: potvrditi da obavijest bez bannera za privolu zadovoljava čl. 5. st. 3. ePrivacy / ZEK]**.

## Otvorena pitanja za pravnika

1. Je li dovoljna obavijest (bez privole) za sva tri kolačića i lokalnu pohranu.
2. Ako se doda analitika ili praćenje grešaka (DAN-586), nova ocjena i banner.
3. Je li lokalni dnevnik "nužan" ili traži posebnu obavijest zbog teksta rada.

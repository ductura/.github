# Prijedlozi iz pregleda 24. 11. 2026.

> **Status: PRIJEDLOG.** Ništa ovdje nije odluka ni zadatak. Svaka stavka čeka vlasnikovu odluku (C-n). Ovaj dokument ne mijenja PLAN.md, NOVE-FUNKCIJE.md ni red zadataka. Prema stavkama „nakon pilota” ne pokreće se nijedan pisac.

## 1. Za pilot: samo dokumenti, bez koda

| Stavka | Što | Odluka | Napomena |
|---|---|---|---|
| K1 | Ugovorna klauzula i prijedlog internog akta: zapis nije samostalan dokaz | prijedlog, čeka C18 | Učvršćuje D-01. Nacrt teksta postoji. |
| K2 | Kriteriji uspjeha pilota dogovoreni s fakultetom prije faze A | prijedlog, čeka C18 | Nadovezuje se na Q-12. |
| K4 | Zabranjeni i odobreni rječnik za sučelje, prezentacije i obavijest studentima | prijedlog, čeka C13 | Prvo samo tekst. Provjera rječnika u kodu je zaseban zadatak. |
| K5 | Alternativa bez zapisa za studente koji se protive, za fazu B | prijedlog, čeka C19 | Ide uz D-04. |
| K6 | Klauzula: podaci se ne koriste za treniranje modela | prijedlog, čeka C18 | Točka o podizvršiteljima ovisi o Q-10. |
| K7 | Paket za službenika za zaštitu podataka: DPIA na hrvatskom, ručni postupak za zahtjeve ispitanika, popis podizvršitelja | prijedlog, čeka C18 | Pokriva razdoblje dok OA-4 nije izgrađen. |
| K8 | Uputa: student izvozi svoj zapis i prilaže ga u svoju korist | prijedlog, čeka C18 | Izvoz već postoji. |
| K3 | Okvir „Što Ductura ne vidi” uz reprodukciju i u PDF-u | prijedlog, čeka C13 | **Pozor:** tekst je dokument, ali za prikaz uz reprodukciju i u PDF-u treba kod. Zato se ovdje predaje samo tekst. Gradnja je posebna odluka. |

## 2. Nakon pilota

Iz NF-1…NF-7 (veličine su iz `docs/nalazi/nove-funkcije-*.md` u WEB repou):

| Stavka | Naslov | Vel. | Odluka |
|---|---|---|---|
| NF-1 P-14 | Izvoz rokova u kalendar (ICS) | M | prijedlog, čeka C12 |
| NF-1 P-16 | Razlika verzija obavijesti | L | prijedlog, čeka C12 |
| NF-1 P-17 | Obavijest e-poštom ili push | L | prijedlog, čeka C12 (D-241: u pilotu samo obavijesti u aplikaciji) |
| NF-2 P-19 | Uvoz teksta iz DOCX ili PDF datoteke na poslužitelj | M–L | prijedlog, čeka C12 |
| NF-2 P-24 | Stil citiranja po ustanovi | L | prijedlog, čeka C12 |
| NF-2 P-25 | Tablica, slika, formula (shema v4) | L | prijedlog, čeka C12 |
| NF-3 PR-21 | Razgovori uz izjavu (PD-2) | L | prijedlog, čeka C12 |
| NF-4 NZ-9 | Postavka nastavnika za e-poštu | L | prijedlog, čeka C12 (D-241) |
| NF-6 MK-12 | Obrasci i zahtjevi fakulteta za završni rad | M–L | prijedlog, čeka C12 |
| NF-6 MK-14 | Nakon predaje i obrana | L | prijedlog, čeka C12 |
| NF-7 OA-4 | Zahtjev ispitanika s evidencijom | L | već je nakon pilota; do tada vrijedi K7 |
| NF-7 OA-8 | Obavijest o prekidu i održavanju | M | prijedlog, čeka C12 |
| NF-7 OA-11 | Nova akademska godina | L | već je nakon pilota |

Ostale ideje:

| Stavka | Što | Odluka | Uvjet prije gradnje |
|---|---|---|---|
| A2 | Provjera postoje li navedeni izvori (DOI, ISBN, URL) | prijedlog, čeka C2 | Ne govori ništa o autorstvu, pa je u skladu s D-01. |
| A3 | Integracija s Merlinom (LTI 1.3) | prijedlog, čeka C4 | Uvjeti Srca za registraciju alata. |
| A4 | Dodatak za Word | prijedlog | Nova površina zapisa, treba DPIA. |
| A5 | Usporedba sličnosti preko postojećeg nacionalnog servisa | prijedlog, čeka C1 | Odgovor Srca. |
| A6 | Udio više autora u grupnom radu | prijedlog | D-78: S-12 je izvan pilota. |
| A7 | Priprema nastavnika za razgovor o radu | prijedlog | Bez AI analize procesa (pravilo 13). |
| D2.1 | Predaja završnih radova u Dabar | prijedlog | Fakultet i knjižnica. |
| D2.2 | ISVU: upisi i ocjene | prijedlog | Pristup traži Srce i fakultet. |
| D2.3 | Recenzija kolega | prijedlog | Anonimnost i vidljivost. |
| D2.4 | Ispitni način uz Safe Exam Browser | prijedlog, čeka C6 | Pravno mišljenje (D-55) i DPIA. |
| D2.5 | Kvalificirani vremenski žig (eIDAS) | prijedlog, čeka C7 | Izbor pružatelja. |
| D2.6 | Sučelje na engleskom | prijedlog | Proturječje D-70 i PROGRAM.md treba razriješiti. |
| K9 | Kontekst uz zalijepljeni tekst | prijedlog | Nova funkcija. |

## 3. Zadržano do odluke

| Stavka | Zašto | Odluka |
|---|---|---|
| NF-5 t. 4: ritam po dijelu teksta u pregledu nastavnika | Sadašnje pravilo 4 to ne dopušta. P-1-NACRT bi dopustio samo sirovi prikaz, bez mjere. U redu je kao NF5-Q4-RITAM-PREGLED s oznakom `drzi`. | čeka C13 |
| A1: oznaka mogućeg skriptiranog unosa | To je mjera iz vremena (pravilo 4), a kao ML ili AI analiza krši i pravilo 13. Čita se kao tvrdnja o autorstvu (D-01). U redu je kao A1-AUTOTIPKAC-ZASTAVICA s oznakom `drzi`. | čeka C9 i C14 |
| Lab S12–S34 (otpornost zapisa) | **Ne ulazi u plan.** Lab danas cilja stari Ductus i rutu `/rad` (`Lab/server/targets.ts:9,42`), a ne isporučeni `packages/app` iza Preloadera. Rezultati ne bi vrijedili za proizvod. | čeka C22 (preusmjeriti Lab) |

## 4. Predloženo za odbijanje, s razlozima

Ništa od ovoga još nije odbijeno. Svaka stavka čeka odluku.

| Ideja | Razlog | Odluka |
|---|---|---|
| A8: biometrija tipkanja (provjera je li pisac isti) | To su biometrijski podaci (GDPR čl. 9), a provjera bi bila tvrdnja o autorstvu (D-01). | prijedlog, čeka C3 |
| A9: AI detektor za hrvatski kao značajka | Izravno se sukobljava s D-01, jer Ductura ne tvrdi je li AI korišten. Proizvod nije detektor. | prijedlog, čeka C3 |
| A1 kao model strojnog učenja | Pravilo 13. Uz to bi sustav mogao postati visokorizični prema Aktu o UI-ju (obrazovanje). | prijedlog, čeka C9 |
| Ocjenjivanje u Ducturi | Ocjena ostaje u Merlinu (NF-5, PG-10). PLAN §1 „ocjenjuje” treba uskladiti. | prijedlog, čeka vlasnika |

## 5. Rez opsega (sažetak)

- **Ukupna procjena:** 126 NF stavki. Jedinica je jedna večer rada, a raspon je procjena iz veličina u danima.

| Stupac | Stavki | Jedinica (raspon) |
|---|---|---|
| Nužno za probu | 40 | 87–165 |
| Može nakon 15. 1. | 73 | 186–359 |
| Nakon pilota | 13 | 88–138 |

- Prijedlog: do 15. 1. samo popravci mrtvih ili neistinitih tokova probe. Čeka C12.

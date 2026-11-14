**Što:** <jednom ili dvjema rečenicama, što se mijenja, običnim jezikom>

**Zašto:** <koji problem rješava ili koju odluku provodi>

**Rizik i provjera:** <što bi moglo poći krivo i kako je to provjereno>

<!-- Tri retka iznad pišu se za ljude. Strojni redci su ispod, u bloku za agente. -->

<details>
<summary>Detalji za agente</summary>

## Engineering metadata

Agent: <claude|codex|chatgpt>:<slot>:<role>
Risk: <low|standard|critical>
Task: <DAN-xxx ili poveznica na izvor>

Closes #<n>

## Opseg

**Ulazi:**
- 

**Ne ulazi:**
- 

## Ugovor

Invarijanta: <što mora vrijediti; obvezno za critical>
Poznate granice: <granica jamstva i izvor odobrenja ako je ugovor sužen>
Što bi ovaj PR moglo oboriti na QA-i?: <konkretan scenarij>

## Dokaz

- [ ] testovi su zeleni na punom testiranom SHA (lokalno i u CI-ju)
- [ ] grana je provjerena prema aktualnom `main`
- [ ] nema tajni ni stvarnih osobnih podataka
- [ ] svaka akcija u workflowima prikvačena je na puni SHA

## IZVJEŠTAJ

Napravljeno:
- 

Testovi:
- <puni SHA; naredba; rezultat; lokalno ili CI>
- Neizvedeno: <izričito ili „ništa”>

Otvoreno ili blokira: ništa

</details>

# Ductura

Ductura je alat za pisanje studentskih radova koji čuva povijest nastanka teksta. Student piše u pregledniku ili u aplikaciji na računalu. Mentor vidi kako je rad nastajao, a ne samo konačnu verziju.

## Repozitoriji

| Repozitorij | Što sadrži |
|---|---|
| [`server`](https://github.com/ductura/server) | zajednički API: prijava, ovlasti, baza i pozadinski poslovi |
| [`.github`](https://github.com/ductura/.github) | zajednički CI workflowi, preseti alata i predlošci |

Ostali repozitoriji (web, aplikacije za računalo i preloader) dodaju se kad počne njihov rad.

## Načela

- Studenti se prijavljuju isključivo kroz AAI@EduHr.
- U repozitorijima nema tajni ni stvarnih osobnih podataka. Testovi koriste samo izmišljene podatke.
- Svaka promjena ide kroz pull request s neovisnim pregledom i zelenim CI-jem.

## Sigurnost

Ranjivost nemojte prijavljivati javnim issueom. Koristite privatnu prijavu ranjivosti (GitHub „Report a vulnerability”) u repozitoriju na koji se odnosi.

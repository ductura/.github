# Ductura

Ductura je alat za pisanje studentskih radova koji čuva povijest nastanka teksta. Student piše u pregledniku ili u aplikaciji na računalu. Mentor vidi kako je rad nastajao, a ne samo konačnu verziju.

## Repozitoriji

| Repozitorij | Što sadrži |
|---|---|
| [`Institution_server`](https://github.com/ductura/Institution_server) | zajednički API za sva sučelja: prijava AAI@EduHr, ovlasti, baza i pozadinski poslovi |
| [`Preloader`](https://github.com/ductura/Preloader) | ulaz na `ductura.org`: prepoznaje uređaj i preglednik, otvara odgovarajuće sučelje i nudi paket za računalo |
| [`Institution_front_web_chrome`](https://github.com/ductura/Institution_front_web_chrome) | prioritetno sučelje za Google Chrome na računalu |
| [`Web_other`](https://github.com/ductura/Web_other) | sučelje za Firefox, Safari, Edge, Operu i ostale preglednike na računalu |
| [`Institution_web_mobile`](https://github.com/ductura/Institution_web_mobile) | sučelje za mobitele i tablete |
| [`Desktop_macos`](https://github.com/ductura/Desktop_macos) | aplikacija i instalacijski paket za macOS |
| [`Desktop_windows`](https://github.com/ductura/Desktop_windows) | aplikacija i instalacijski paket za Windows |
| [`Aplication_server`](https://github.com/ductura/Aplication_server) | aplikacijski poslužitelj platforme (administracija) |
| [`Aplication_front`](https://github.com/ductura/Aplication_front) | administratorska aplikacija platforme (sučelje) |
| [`.github`](https://github.com/ductura/.github) | zajednički CI workflowi, preseti alata, predlošci i plan migracije |

## Načela

- Studenti se prijavljuju isključivo kroz AAI@EduHr.
- U repozitorijima nema tajni ni stvarnih osobnih podataka. Testovi koriste samo izmišljene podatke.
- Svaka promjena ide kroz pull request s neovisnim pregledom i zelenim CI-jem.

## Sigurnost

Ranjivost nemojte prijavljivati javnim issueom. Koristite privatnu prijavu ranjivosti (GitHub „Report a vulnerability”) u repozitoriju na koji se odnosi.

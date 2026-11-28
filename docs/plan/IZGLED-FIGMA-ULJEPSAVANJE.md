# Izgled u Figmi: popis za završni prolaz i fazu PR-a

Skupljeno iz izvještaja crtača 27. i 28. 11. 2026. Stavke označene s Kod (faza PR-a) idu u PR-ove po ekranu, stavke Knjižnica u prvi val završnog prolaza, a ostalo u drugi val po stranicama.
# Popis za završni prolaz uljepšavanja (Figma)

- S-06: razmak između skupina naslova u kartici „Što se bilježi”.
- S-07 E8: polje „Pretraži bilješke” ima istu oznaku i rezervirani tekst; oznaku sakriti ili rezervirani tekst skratiti.
- S-07 E8: strelice sklopljenih odjeljaka (▸) su sitne; zamijeniti ikonom iz knjižnice.
- S-07 E8: na 390 kartice desne ploče prelaze u drugi red (Asistent).
- S-07 E9: polje „Naslov rada” u dijalogu „Započnite rad” na 1440 je uže od dijaloga.
- S-07 E9: zatamnjenje u svijetlom modu je jako tamno; provjeriti prozirnost Zatamnjenja.
- S-07 E9: dijalozi na 390 su odvojeni od komponente (radnje u stupcu); u knjižnici dodati Dialog varijantu za usko.
- S-07 E6/E9: statusna traka u sukobu treba „Sukob: tekst ostaje na uređaju.”.
- S-07: Prečaci na uskom zaglavlju idu u Više; nacrtati izbornik Više.
- S-08 K1: na 390 „Dopuni opis” i „Ospori opis” u jedan red; gumbi bez okvira u „Moje predaje” lijevo, ne centrirano.
- S-08: nacrtati dijalog „Povući predaju?” (withdraw dialogTitle, explain).
- Knjižnica: nedostaju Steps, Disclosure/Details, zamjena za QR, oznaka osporavanja (sad Tag warn + tekst).
- S-08 I1: stari tekst „Potvrda se ne šalje poslužitelju…” proturječi katalogu (confirmSaved); uskladiti.
- Kod (faza PR-a): katalog student submission history/summary sadrži „·” (historyText.attempt, afterDeadline, summaryText.pastes.item).
- S-47: razmak potvrdnih okvira u „Obavijestima u aplikaciji” na 1440 veći nego drugdje.
- S-03: ghost radnje u retku zahtjeva na 390 ujednačiti; Prošlo/Predstoji uskladiti s nastavničkim KeyDates.
- S-03/S-04b/S-47: nacrtati učitavanje, poruke nakon slanja zahtjeva, isteklu prijavu i loadFailed na profilu.
- Kod (faza PR-a): routes.ts /zadaci/mentorstvo current „/zadaci” -> „/zadaci/mentorstvo” (stavka u navigaciji, odluka vlasnika). „·” u MentorshipRequestPage (redak zahtjeva, Select), KeyDates.forMentor, WorkIndex redak.
- Profil i Moja prava nisu u bočnoj traci namjerno: idu u izbornik „Više” (plan, Podnožje).
- S-06: „Moj tim” i „Recenzija radova” zamijeniti s Poveznica 208:22536 umjesto Taga (u kodu su poveznice). N7 zadržava red o Asistentu.
- S-06: nacrtati stanja Asistenta summaryOnly i unavailable.
- S-06: snimiti 834/1920 i N1 na 390 (agent nije snimio).
- S-42 A8: nacrtano po današnjem kodu (DeniedState 403, notFound 404), u skladu s „Kod ostaje” iz odluke 27. 11.; provjeriti tekst u Napomenama 190:7555 da ne proturječi.
- S-45: preimenovati stranicu u „S-45 Reprodukcija Vašeg rada” (naslov iz koda).
- S-44/S-46: poveznica na /rad/[id]/razgovor (odluka vlasnika) iz S-07 zaglavlja ili S-04 kartice rada; nacrtati.
- Knjižnica: TextArea s prelamanjem oznake, Klizač (range), Polje za datoteku.
- S-45: podloga dirnutog odlomka u Tamnoj slabo vidljiva; onemogućeni Select na 1440 Tamna gotovo kao zadani; napomena na S-42 kao kartica.
- Kod (faza PR-a): „·” u S-43 (oznaka i postotak) i S-44 (naslov i termin); replay position mrtav kod; S-44 onChooseSlot se ne predaje (gumb „Odaberi termin” skriven).
- U-01..U-09: bočne trake zamijenjene instancom Bocna traka Uloga=ustanova (142 mjesta). Na nižim okvirima 1440 (npr. U-01 K1) stavke se režu ispod „Završni i diplomski radovi”; u komponenti dodati pomicanje ili skupljanje stavki.
- U-09: UUID studenta vidljiv u polju referade; ljuska referade nedefinirana; „·” u katalozima ustanove.
- V22: stanja pogreške CSV uvoza, nepodudarni ID-ovi; okvir 1440 Svijetla možda prekratak.
- N-02: dijalog „Dopusti povratak” i sadržaj izbornika „Više” po retku; gusti gumbi na 390 (padding).
- N-01: provjeriti K4 do K8 na 390.
- N-00: „Demo ·” u Napomenama očistiti.
- Knjižnica: Notice s naslovom i radnjom, Dialog s utorom za sadržaj, Više popover, StateTag.
- Knjižnica: Button bez varijante „zauzet” (O-05, J-07 B glume prozirnošću 60 %); TextField ne ispunjava širinu kartice; Dialog padding 20 prema karticama 24.
- J-04: naslovi uloga u kodu h3, nacrtani UI/ui jako; mjesta za snimke prazni okviri. J-03: ploče 1152 prema uvodu 640.
- Kod (faza PR-a): „·” u PilotMetrics asOf i landing.eyebrow; tekst skraćenog popisa prijava problema za male brojeve; ActionLog/Events bez teksta učitavanja; redoslijed operaterske bočne trake prema navigaciji stranice; J-05 formatDate dvostruka točka.
- Redoslijed stranica: J-01 iza J-02 (zamijeniti).
- N-09: prazno zaglavlje stupca „Otvori rad”; na 834 Grupa i Prikaži u drugom redu; tablica na 390 odrezana. „Predaja” bez teksta u katalogu, ne crta se.
- N-10/N-11: završne snimke P9–P12, P15, B5–C8 nisu napravljene; redak poveznica na 390 bez prelamanja.
- N-04: odluka o staklu za receipt i „Način unosa teksta”.
- L-01: Knjižnica nema „Izbornik ljuske” ni stakleni Popover (Više i Obavijesti nacrtani lokalno); staklo dijaloga na Zatamnjenju; centriranje E1/E2.
- L-01: Odjava, redoslijed gumba: kod ima „Odjavi se” prvi, Dialog komponenta sekundarni lijevo. Odluka: na 1440 redoslijed komponente (primarni desno), na 390 stupac s primarnim prvim. Ujednačiti u kodu i komponenti u fazi PR-a.
- L-01: mobilni „Izbornik” (ladica) nacrtan približno; format datuma u Obavijestima uskladiti s formatDate.
- N-10 P15 pretvara se u predani rad (banner praznina samo uz predan rad).
- ZA VLASNIKA (promjena ruta): /kako-radi i 404 u hostu za neprijavljenog vode na prijavu AAI@EduHr (routes.ts bez public:true). Javni J-03 A i J-08 crtani su po starom src/app. Figma prati kod: vrijedi inačica u ljusci (J-03 B, L-01 E4); javne inačice ostaju samo ako vlasnik odluči rutu učiniti javnom.
- RIJEŠENO 28. 11. (vlasnik): /kako-radi javna; J-03 A i B oba vrijede. Kod: routes.ts public:true (PR faza). J-08 javna inačica: 404 neprijavljenog ostaje kako je u hostu, J-08 Napomene uskladiti u završnom prolazu.
- S-03 M4/M7: kostur jedva vidljiv u Svijetloj; okviri viši od sadržaja. Nove poruke grešaka (S-03, S-47) običan tekst, ujednačiti s uputom za poruke.
- N-10: 1440 snimke P10 i P15 pogledati očima (agent provjerio samo programski).
- N-20 Q8 (Izjava): oznaku „Izjava potvrđena …” zamijeniti običnim retkom kao u kodu; nacrtati dijalog „Razgovor n, datum” (Zatvori); 1440 pregledati očima. Imena N stranica u Figmi ne prate inventar (N-06 Merlin, N-07 Produljenje, pregled rada N-10 i N-20): uskladiti inventar ili imena u završnom prolazu.
- N-10 R1–R6: R1 i R3 bez naslova, u R3 suvišna traka „Rad još nije predan.”; nazivi okvira uskladiti („Racunalo”); 834 i 1920 nisu crtani; R5 i svijetle varijante R2/R4/R6 nisu pregledane. Četiri samostalna „·” na N-10 R6 uklonio sam; provjera cijele datoteke: nema „·” izvan Napomena.
- S-06 N12: svijetla 1440 i 390 nisu pregledane.
- Knjižnica (fn): Dialog utor za tijelo (N-16 kopiranje, N-17 P2 odvojeni); Checkbox i Radio onemoguceno; Prekidac s više opcija; Details/Disclosure (N-20 glumljen „›”); DiffView (dodano podcrtano accent-soft, uklonjeno precrtano error-soft); Slider za reprodukciju.
- N-16..N-24: breadcrumb uvijek „Početna > Moji kolegiji”, uskladiti s kodom (N-20 headingOf); duga Select vrijednost na 390 lomi (N-22, N-23); naslovi kartica h4 prema cardTitle 17 px (N-23, N-24); MarkedText N-20 i dirnuti odlomak N-23 bez accent-soft; N-24 razmak Radio stavki, poruka spremanja kao Notice.
- N-16..N-24 bočna traka: aktivna „Moji kolegiji”, N-18 „Zbirni pregled”; provjeriti prema routes.ts.
- Odluka (plan prema kodu): N-17 postavka povlačenja iznad tablice i povijest kao sekcija, N-18 grafikon pa popis, kako je u kodu (kod ostaje). Plan uskladiti.
- Nenacrtana stanja (fn, popisana u Napomenama): N-16 Checkbox onemogućen; N-21 notFound; N-22 compareError, notFound; N-23 praznina u tekstu, Zaustavi, obrisani odlomak; N-24 notFound, invalid/unauthorized/forbidden/unavailable, „Spremanje…”.
- Kod (faza PR-a): „·” u katalogu n11 (redak trenutne verzije i opcije).

## Val 1, nalazi (28. 11.)
- Riješeno 28. 11.: bočna traka ustanova (234:261) ima stavke min 44 i padding 6 kao ostale uloge; manji su samo razmaci (skupine 2, navigacija 6, varijanta 6/8). Svi U okviri 1440 su visoki 900 ili više, 12 stavki stane uz 52 px zalihe.
- Napomene U-02 do U-09 kažu da bočna traka nema stavke Postavke, Etape, Pragovi, Predložak rada, Završni radovi, ISVU; to je zastarjelo, varijanta ustanova ih sad ima. Val 2: ispraviti napomene.
- Dialog je sad set 327:101460 (Prikaz=Siroko/Uski, BOOLEAN Sadrzaj, INSTANCE_SWAP Utor sadrzaj, Utor 327:100952). Val 2: 390 okviri prelaze na Uski. Ghost Zatvori u uskom stupcu: tekst lijevo, uljepšati.
- Dialog uski: Figma stupac, primarni prvi, visina 44; kod (Dialog.module.css) redak s wrap, primarni zadnji. Za PR koda: column-reverse ispod 640 (izgled iz Figme).
- Riješeno 28. 11.: aktivna stavka bočne trake prema routes.ts. N-18 Moji kolegiji (current /nastavnik); N-20 do N-23 (/nastavnik/rad/[id]/*) bez aktivne stavke, kao i N-10.
- Riješeno 28. 11.: J-08 napomena prema odluci vlasnika (404 neprijavljenog ide na prijavu, sekcija A samo crtež kartice).
- Kontrole (val 1): Button Stanje=zauzet (izgled kao zadano, tekst „Objavljujem…”, kod nema spinner); Checkbox i Radio novi prop Onemoguceno (ne/da), prihvaćeno jer Stanje nosi označenost; TextField unutarnji dijelovi FILL; Prekidac BOOLEAN Treca opcija i Cetvrta opcija. Val 2: Onemoguceno=da i Stanje=zauzet gdje kod to prikazuje.
- Za PR koda (ustanova): Figma ima 6 dodatnih stavki bočne trake (treba sve). Uz njih u routes.ts current mora biti vlastita putanja: /ustanova/postavke i /postavke/asistent -> /ustanova/postavke, /ustanova/pragovi -> /ustanova/pragovi, etape, predlozak-rada, zavrsni-radovi isto. U-04, U-05, U-07 u Figmi već tako.
- Val 1 B: DiffView 328:192367, Klizač reprodukcije 328:214875, Polje za datoteku 328:216898, QR 328:216899, TextArea oznaka se prelama. Oznaka osporavanja = Tag Ton=warn (bez nove komponente, odlučeno). Val 2: pogledati TextArea instance; N-22 usporedba i N-23 reprodukcija na nove komponente.

## Val 2, N-20 do N-24 (prvi krug)
- N-20: PanelTabs (28) i Disclosure (4) su instance; padding 24 na 390. N-21: Disclosure (4). N-22: DiffView je odvojen u 4 okvira U1 (333:60026, 333:60135, 333:60244, 333:60353), jer komponenta nema utor ni broj riječi.
- N-23 R1: klizač ostaje lokalan. Instanca Klizač reprodukcije 328:214875 nema „Skok na”, a oznake joj nisu kao u kodu (ReplayPage.tsx: „Prethodna promjena”, „Pokreni”, „Sljedeća promjena”). Za knjižnicu: oznake prema kodu, „Skok na” i redoslijed kao u ReplayPage.tsx.
- Za knjižnicu: DiffView treba utor za Dio. Disclosure ima strelicu kao znak „▸”; provjeriti što kod crta.
- Na 390 PanelTabs odreže „Izjava”, jer se traka u kodu vodoravno pomiče. To ostaje tako.
- N-20 Q8 (drugi krug): „Izjava potvrđena” je sada običan tekst (TeacherAiAttachments.tsx, p.meta). Dijalog „Razgovor n” postoji samo kod studenta, a nastavnik otvara razgovor u istoj stranici. Napomenu 319:12866 treba dopuniti tom rečenicom.
- N-24: Notice za spremanje i Radio Onemoguceno ostaju isključeni, jer za njih nije nađena komponenta u kodu.
- Ostaje za završni prolaz preko svih stranica: pravilo kartice; snimke 390 u tamnoj temi (N-20 Q2 do Q7, N-21, N-23); MarkedText; okviri grešaka Q7, S2, R3; mrvica na N-24.

## Val 2, U i V22 (prvi krug)
- U-01 do U-09: kartice na 390 imaju padding 24 i okvire koji prate visinu. Na U-03 je 6 dijaloga prebačeno na Uski. Na U-09 je UUID uklonjen iz „Oznaka studenta” (E10, E11).
- V22: nove sekcije CSV 3 Greške unosa (333:88007) i CSV 4 Upis nije uspio (333:88606), u dijalogu prema CsvImport.tsx:180.
- Za knjižnicu: Alert nema varijantu Širina=FILL, pa je u utoru Dialoga ručno prilagođen.
- Ostaje: snimke 1440 i svijetla tema za U-02, U-03, U-05 do U-08; zamjena lokalnih crteža na U stranicama.

## Val 2, N-10 i N-17 (prvi krug)
- N-10: 78 dijaloga je sada instanca Dialog s utorima („Sadržaj dijaloga (utori)” na dnu stranice). Oko 1080 zatvorenih Details je postalo Disclosure. „Pogledi na rad” su poveznice (nav) kao u WorkFrame.tsx, ne PanelTabs. Moja odluka: ostaju poveznice.
- N-17: 4 dijaloga „Povijest predaja” su instance. Tablica je nanovo složena prema history/messages.hr.ts.
- Za knjižnicu: Disclosure u otvorenom stanju s bogatim sadržajem (otvoreni Details na N-10 ostaju lokalni). Alert ima varijantu FILL.
- Na N-10 nazivi slojeva sadrže „·” (meta). Ljudi ih ne vide, ali ih u završnom prolazu treba preimenovati.

## Val 2, S (prvi krug)
- S-08: 272 Steps, 24 Dialoga, 48 StateTag, 32 Disclosure i 8 QR su instance. Nova sekcija K8 „Povući predaju?” (333:79370), tekst iz withdraw/messages.hr.ts. Redak potvrde slijedi confirmSaved iz declaration/messages.hr.ts.
- S-07: 4 dijaloga E9 su Uski. Traka sukoba ima Ton=warn.
- Za PR koda: na S-08 tekst PD-3 ima malo slovo „verzija na poslužitelju” (provjeriti katalog); historyText.attempt u katalogu još ima „·”.
- Za knjižnicu: Steps ima fiksnih 5 oznaka. Izbornik Više ima fiksnih 5 stavki ustanove, pa nema izbornika Prečaci.

## Val 2, L, J i O (prvi krug)
- L-01: izbornik Više (D), Popover (A2, A3) i Dialog (C1, C2, B) su instance; utori su 333:58867 i 333:59795. A1 popover s bogatim sadržajem ostaje lokalan.
- J-04: naslovi uloga 17px, 600. J-07 i O-05 B: Button zauzet (StudentDataExport.tsx:238, SecurityKeyPage.tsx:35).
- O-01 do O-06: padding 24 na 390 (132 kartice).
- Za knjižnicu: Dialog Uski bi trebao imati gumbe FILL i širinu 358. Izbornik Više nema varijantu 358. Popover nema utor. Nema stila teksta Newsreader 17/600.

## Val 2, N-00 do N-03 i N-09 (prvi krug)
- N-02: dijalozi na 390 su Uski. 208 oznaka stanja je postalo StateTag. N-09: 64 StateTag i 32 Select „Zadatak”; širine stupaca podešene.
- Za PR koda: na N-02 (CourseStudents.tsx) i N-09 (Overview.tsx) stanje je u kodu običan tekst, a Figma (prije Tag) pokazuje StateTag. Moja odluka: kod prelazi na StateTag.
- N-01: K4 do K6 su instance. Treća radnja odstupa od koda i ide na ispravak (dva dijaloga). K6 „Izdajem…” je zauzet (AssignmentCards.tsx).
- N-03: dijalozi M6 do M9 i M15 su lokalni, gumbi na 390 su u stupcu.
- Za knjižnicu: Steps nema inačicu s proizvoljnim nazivima (čarobnjak N-05, 112 lokalnih). U Tablici/Celiji nedostaje naziv stupca radnje.

## Val 2, V i L dopuna
- V18: dijalozi B11 i C9 na 390 su Uski. V13: 10 dijaloga na 390 su Uski; redoslijed hinta i potvrdnog okvira na P10 ide na ispravak preko utora.
- V15, V16, V17, V20, V21: lokalni Koraci, StepSection, dijalozi „Prikaz i čitanje” i izbornici s kvačicom ostaju, jer zamjena mijenja raspored.
- Za knjižnicu: okomiti Steps s 3 koraka na 390; Izbornik Više s kvačicom na stavci.
- V22: stara sekcija 29:1784 crta Alert ispod tablice, a kod ga ima u dijalogu potvrde (IsvuPage.tsx:175-183). Mjerodavna je nova sekcija CSV 4.
- L-01 Odjava: dodaje se „Odjavi me iz svih” (SignOut.tsx:62-64). J-07 B: zauzet je ispravan (StudentDataDownloadPage.tsx). E1 i E2 su centrirani. Na O-01 skupina Naslov i činjenice ima razmak 6.
- L-01 Odjava: treća radnja „Odjavi sve sesije” (text.ts:16, SignOut.tsx:63, tone quiet). „Ostani” je ghost. Provjereno u kodu.
- S-06: Tag „Moj tim” i „Recenzija radova” sada su Poveznice (160). S-45 je preimenovan. S-44 i S-46 imaju napomenu o /rad/[id]/razgovor. S-07 E8: polje bez placeholdera.
- Za knjižnicu: ghost Button nema poravnanje uz tekst (pomak 10 px u „Moje predaje”). Kostur u svijetloj temi je slabo vidljiv (varijabla 6:165), a to je token, koji se ne mijenja.
- N-16: 44 Steps su instance s oznakama iz koda; dijalozi na 390 su Uski. N-15: 64 dijaloga su instance s utorima. „Spremam…” ostaje onemogućen, a zauzet nije uključen jer izvor nije potvrđen.
- Završni prolaz za nastavnika: N-18, N-11, N-14; pravilo kartice na N-15, N-16, N-17; TextArea na N-10, N-15, N-16; snimke svijetle teme na N-10.
- S-07 „Započnite rad”: instance su 560 široke, Tekst je u utoru iza koraka (assist/messages.hr.ts:225). Pregledano očima.
- S-42 A8: kod daje DeniedState za „denied” (index.tsx:93), a za 403 i 404 dnevnika notFound(), što je opća 404 (read.ts:64, index.tsx:130). Ključ accessLog.notFound se u hostu ne koristi. Moja odluka: Figma prati kod. A8 je DeniedState, a 404 je J-08. Ništa ne čeka vlasnika; ključ accessLog.notFound treba javiti kao mrtvi ključ u PR-u koda.
- N-01: izdavanje je K4 do K8, a opoziv je novi K10 (AssignmentCards.tsx:282-300); Treća radnja je isključena. Tekstovi K4 do K8 se usklađuju s katalogom (ne čekaju vlasnika). K7 i K8 te N-03 M6 do M9 i M15 ostaju lokalni.
- N-07 na 390: stupac „Zabilježeno” nedostaje; provjerava se u kodu.
- N-01 K4 do K10: tekstovi su usklađeni s assignment-card/messages.hr.ts (dialogTitle, dialogLead, validUntilLabel, issue, issuing, cancel, revokeTitle, revokeLead, revokeCode, codeOnce, errors.unavailable).
- Za PR koda: N-07 „Produljeni rokovi” se u kodu (n13/Extensions.tsx) prikazuje kao redovi s meta tekstom, a Figma ima tablicu s vodoravnim pomicanjem (Tko, Novi rok, Stari rok, Razlog, Zabilježeno). Moja odluka: kod slijedi Figmu.
- V13 P10: utor ima potvrdni okvir pa hint (SubmitStep.tsx:333-334). P9 do P13 na 1440 ostaju lokalni (520/16 prema Siroko 480/24).
- N-01 K7: u kodu se dijalog nakon izdavanja zatvara, a kod se prikazuje na kartici kolegija (AssignmentCards.tsx:198-203 i 257-266: codeOnce, codeHowTo, copyCode). Figma prikazuje kod u dijalogu s gumbom „Kopiraj kod”. Za završni prolaz: K7 prekrojiti u stanje kartice prema kodu (naslov dijaloga ondje nije iz koda).

### Val 2, N-18, N-11 i N-14 (završni prolaz)
- N-18: padding 24 na 10 kartica na 390.
- N-11: bez izmjena.
- N-14: dijalozi na P4 postali instance (Uski na 390, Siroko na 560, Zatamnjenje instanca 208:22542); prvi stupac tablice na 390 s 76 na 96.
- Rupe knjižnice: komponenta zaglavlja kartice; onemogućeni TextArea (N-11 K14 i K19 još ručno crtani).

### Val 2, N-01 K7 (prekrojeno)
- K7 (8 okvira): dijalog i Zatamnjenje skriveni; kartica kolegija prikazuje kod, codeOnce, codeHowTo i gumb „Kopiraj kod”, pa „Kod za upis” (AssignmentCards.tsx:198-203, 257-266). Kod označen kao izmišljeni podatak. Okviri 390 visine 1111.
- Stanje „Kod je kopiran.” nije nacrtano (opcionalno, za završni prolaz).
- Lokalno za završni prolaz: N-03 dijalozi M6 do M9 i M15; N-01 K8 (nema utora za grešku ni ispis); Steps na N-05; N-00 odjeljci „Nastavni tim i grupe” i „Upitnici”; točka stanja na N-08.

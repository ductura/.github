# Komponente trećih strana u `editor/vendor/`

Datoteke u ovoj mapi nisu dio Ducture. To su gotovi paketi tuđih biblioteka, umetnuti u prototip bez zaglavlja s licencom. Prije javne objave uz svaku komponentu treba priložiti puni tekst njezine licence i obavijest o autorskom pravu iz uzvodnog izvora.

| Datoteka | Komponenta (prepoznata iz sadržaja) | Verzija u datoteci | Očekivana licenca (provjeriti uzvodno) | Stanje |
|---|---|---|---|---|
| `tiptap.js` | Tiptap s ProseMirror modulima | nije zapisana | MIT | treba priložiti tekst licence |
| `katex.js` | KaTeX | 0.19.1 | MIT | treba priložiti tekst licence |
| `pdf.js` | PDF.js (`pdfjs-dist`) | 3.11.174 | Apache 2.0 | treba priložiti licencu i NOTICE |
| `spell.js` | Hunspell preveden u WebAssembly, s JS omotačem | nije zapisana | omotač vjerojatno MIT; Hunspell MPL 1.1 / GPL 2.0 / LGPL 2.1 | treba utvrditi točan paket i priložiti licence |
| `hr-aff.txt`, `hr-dic.txt` | hrvatski rječnik za Hunspell | nije zapisana | nepoznato | **čeka potvrdu podrijetla; ne objavljivati dok se ne utvrdi izvor i licenca** |

Napomena: licence u tablici prepoznate su prema nazivu biblioteke, a ne prema zaglavlju u datoteci (zaglavlja su uklonjena pri pakiranju). Mjerodavan je tekst licence u uzvodnom repou za navedenu verziju.

## Hrvatski rječnik

Datoteke `hr-aff.txt` i `hr-dic.txt` nisu objavljene: izvor i licenca nisu utvrđeni. Provjera pravopisa u prototipu bez njih ne radi.

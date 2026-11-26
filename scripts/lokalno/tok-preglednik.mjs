// tok: pokreće jedan korak iz koraci.mjs. Izlaz: 0 korak prošao do kraja, 1 greška u koraku,
// 2 nepoznat korak, 3 prijava nije uspjela (nije pad proizvoda). Zapis: izlaz/korak.txt, slika greške: izlaz/greska.png.
import { writeFileSync } from 'node:fs';
import { BASE, IZLAZ, OUT, PrijavaError, chromium, log } from './tok-lib.mjs';
import { steps } from './koraci.mjs';

const ime = process.argv[2];
writeFileSync(OUT, '');
if (!(ime in steps)) {
  console.log(`nepoznat korak ${ime}; postoje: ${Object.keys(steps).join(', ')}`);
  process.exit(2);
}
const browser = await chromium().launch();
const page = await (await browser.newContext({ baseURL: BASE })).newPage();
let kod = 0;
try {
  await steps[ime](page);
} catch (e) {
  kod = e instanceof PrijavaError ? 3 : 1;
  log((kod === 3 ? 'PRIJAVA ' : 'GREŠKA ') + String(e).slice(0, 400));
  await page.screenshot({ path: IZLAZ + 'greska.png' }).catch(() => {});
}
await browser.close();
process.exit(kod);

// tok: zajednički dio koraka u pregledniku (Playwright), izmišljeni podaci, samo lokalni stog.
import { createRequire } from 'node:module';
import { appendFileSync, mkdirSync } from 'node:fs';

// Stabla i zapisi su izvan repoa (DUCTURA_LOKALNO), isto kao u stog.py.
export const LOKALNO = (process.env.DUCTURA_LOKALNO ?? 'D:/Ductura/_lokalno').replaceAll('\\', '/');
export const WEB = process.env.TOK_WEB ?? LOKALNO + '/g-teza-web';
export const IZLAZ = LOKALNO + '/_alati/izlaz/';
mkdirSync(IZLAZ, { recursive: true });
export const OUT = IZLAZ + 'korak.txt';
export const BASE = 'http://localhost:8000';
export const H = { Origin: BASE, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' };
/** Playwright iz WEB stabla, tek kad zatreba (testovi i CI ga nemaju). */
export const chromium = () => createRequire(WEB + '/package.json')('@playwright/test').chromium;
// Tokeni poveznica nikad u zapis.
export const log = (s) => appendFileSync(OUT, String(s).replace(/token=[^&\s"']+/g, 'token=…') + '\n');

/** Pad prijave (Preloader, lažni OIDC), ne proizvoda: tok.py ga javlja zasebnim izlazom 3. */
export class PrijavaError extends Error {}

export async function signIn(page, account) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(BASE + '/');
      const link = page.getByRole('link', { name: 'Prijava preko AAI@EduHr', exact: true });
      await link.waitFor({ timeout: 20000 });
      // Izravno na href: klik na poveznicu na sporom računalu zapinje na „stabilnosti” elementa.
      await page.goto(BASE + (await link.getAttribute('href')));
      await page.locator(`button[name="account"][value="${account}"]`).click({ timeout: 20000 });
      await page.waitForURL((u) => u.origin === BASE && u.pathname.startsWith('/app/web/'), { timeout: 30000 });
      log(`prijava ${account}: pokušaj ${i + 1} uspio`);
      return;
    } catch (e) {
      log(`prijava pokušaj ${i + 1}: ${String(e.message).split('\n')[0].slice(0, 100)}`);
    }
  }
  throw new PrijavaError(`prijava ${account} nije uspjela u 3 pokušaja`);
}

export async function skipGuide(page) {
  const b = page.getByRole('button', { name: 'Preskoči vodič', exact: true });
  if (await b.isVisible().catch(() => false)) await b.click();
}

export async function snap(page, label, n = 3000) {
  const aria = (await page.locator('body').ariaSnapshot()).split('\n').filter((l) => !l.includes('/url')).join('\n');
  log(`=== ${label} ${page.url()}\n${aria.slice(0, n)}`);
}

/** Bilježi API odgovore kao `RESP <metoda> <put> <status> <bajtova>`. */
export function pratiApi(page) {
  page.on('response', async (r) => {
    const u = r.url();
    if (!u.includes('/api/')) return;
    const n = (await r.body().catch(() => Buffer.alloc(0))).length;
    log(`RESP ${r.request().method()} ${u.split('/api')[1].replace(/token=[^&]+/, 'token=…')} ${r.status()} ${n}`);
  });
}

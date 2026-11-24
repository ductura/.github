// tok: koraci INT-31 u pregledniku (izmišljeni podaci, demo računi lažnog OIDC-a). Novi korak = nova metoda u `steps`.
import { BASE, H, IZLAZ, log, signIn, skipGuide, snap } from './tok-lib.mjs';

export const TEZA = '8081cb0a-8a6f-4296-a97d-e1efa6df9be8';
const DOC = 'd3a030b6-8780-4950-bff7-23d71f7ff17d';
// Visit pages (optionally following /nastavnik/ links); log heading, alerts and API calls that fail.
async function obidi(page, pocetak, max, slijedi = true) {
  const red = [...pocetak], vidjeno = new Set(), los = [];
  const dobri = new Set();
  page.on('response', (r) => { const u = r.url(); if (u.includes('/api/') && r.status() < 300 && r.request().method() === 'GET') dobri.add(u.split('/api')[1]); });
  page.on('response', (r) => { const u = r.url(); if (u.includes('/api/') && r.status() >= 400) los.push(`${r.status()} ${r.request().method()} ${u.split('/api')[1].slice(0, 120)}`); });
  while (red.length && vidjeno.size < max) {
    const u = red.shift(); if (vidjeno.has(u)) continue; vidjeno.add(u); los.length = 0;
    await page.goto(u).catch(() => {}); await page.waitForTimeout(5000); await skipGuide(page);
    const h1 = await page.locator('h1').first().innerText({ timeout: 2000 }).catch(() => '-');
    const al = (await page.getByRole('alert').allInnerTexts().catch(() => [])).join(' | ').slice(0, 200);
    log(`STR ${u.replace(BASE + '/app/web', '')} h1="${h1.slice(0, 60)}" alert="${al}" api4xx5xx=[${[...new Set(los)].join('; ')}]`);
    if (slijedi) for (const h of await page.locator('a[href*="/nastavnik/"]').evaluateAll((as) => as.map((a) => a.href.split('#')[0]))) if (!vidjeno.has(h) && !red.includes(h)) red.push(h);
  }
  page.dobri = [...dobri];
  return [...vidjeno];
}
export const steps = {
  async portfelj(page) {
    const SEM = '9ff97f5f-3ebc-40bc-822a-0223b482b7e2';
    await signIn(page, 'demo-student-2');
    page.on('response', async (r) => { const u = r.url(); if (u.includes('/api/')) log(`RESP ${r.request().method()} ${u.split('/api')[1]} ${r.status()} ${(await r.body().catch(() => Buffer.alloc(0))).length}`); });
    await page.goto(`${BASE}/app/web/rad/${SEM}/predaja/potvrda`); await page.waitForTimeout(6000);
    log('--- klik portfelj');
    await page.getByRole('link', { name: 'Izvoz za portfelj' }).click(); await page.waitForTimeout(5000);
    log(`URL ${page.url()}`);
    await page.waitForTimeout(4000);
    const sec = page.locator('section[aria-labelledby="portfolio-title"]');
    log('TEKST ' + (await sec.innerText({ timeout: 10000 }).catch(e => 'nema: ' + e.message.slice(0, 80))).slice(0, 1200));
    for (const name of ['Preuzmi PDF', 'Preuzmi paket', 'Preuzmi provjerljivi paket']) {
      const ctl = sec.getByRole('button', { name }).or(sec.getByRole('link', { name })).first();
      if (!(await ctl.isVisible().catch(() => false))) { log(`NEMA ${name}`); continue; }
      const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
      await ctl.click(); const d = await dl; await page.waitForTimeout(2000);
      log(`KLIK ${name} -> ${d ? d.suggestedFilename() : 'nema preuzimanja'}`);
      log('NAKON ' + (await sec.innerText().catch(() => '')).split(String.fromCharCode(10)).filter((l) => /nije|ne može|greš|Pokušaj/i.test(l)).join(' | '));
    }
    {
      const a = sec.getByRole('link', { name: 'Preuzmi paket' });
      log('POVEZNICA ' + (await a.getAttribute('href', { timeout: 5000 }).catch(() => 'nema')));
      const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
      await a.click({ timeout: 5000 }).catch(() => {});
      const d = await dl;
      if (d) { const f = IZLAZ + 'paket.bin'; await d.saveAs(f); log(`PAKET ${d.suggestedFilename()} ${(await import('node:fs')).statSync(f).size} B`); }
      else log('PAKET nema preuzimanja');
    }
    log('VRSTA ' + await page.evaluate(async () => {
      const r = await fetch('/api/v1/student/submissions/857f4f02-8dc9-4ce2-9ff4-062199a5d54b/package-link', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'package' }) });
      if (r.status !== 201) return 'link ' + r.status + ' ' + (await r.text()).slice(0, 120);
      const j = await r.json();
      const g = await fetch(j.downloadPath, { credentials: 'include' });
      const b = await g.arrayBuffer();
      return `link 201 get ${g.status} ${g.headers.get('content-type')} ${g.headers.get('content-disposition')} ${b.byteLength} B`;
    }));
    for (const b of await sec.locator('a, button').all()) log('KONTROLA ' + (await b.innerText().catch(() => '?')));
    await page.screenshot({ path: IZLAZ + 'portfelj.png', fullPage: true });
  },
  async potvrda(page) {
    const SEM = '9ff97f5f-3ebc-40bc-822a-0223b482b7e2';
    await signIn(page, 'demo-student-2');
    page.on('response', async (r) => { const u = r.url(); if (/pdf|portable|package|export/.test(u)) log(`RESP ${r.request().method()} ${u.split('/api')[1]} ${r.status()} ${r.headers()['content-type']} ${(await r.body().catch(() => Buffer.alloc(0))).length}`); });
    const pdf = await page.request.get(`/api/v1/student/assignments/${SEM}/submission/pdf`); log(`PDF ${pdf.status()} ${(await pdf.text()).slice(0, 120)}`);
    await page.goto(`${BASE}/app/web/rad/${SEM}/predaja/potvrda`); await page.waitForTimeout(6000);
    for (const name of ['Preuzmi zapis (PDF s QR kodom)', 'Izvoz za portfelj']) {
      const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
      await page.getByRole('link', { name }).click(); const d = await dl; await page.waitForTimeout(3000);
      log(`KLIK ${name} → download=${d ? d.suggestedFilename() : 'nema'} url=${page.url()}`);
      log((await page.getByRole('region', { name: /Predano/ }).ariaSnapshot().catch(e => e.message)).split('\n').filter(l => /alert|status|paragraph|Preuz|Izvoz/.test(l)).join('\n').slice(0, 800));
    }
  },
  async predajtezu(page) {
    await signIn(page, 'demo-student-2');
    const r = await page.request.post('/api/v1/submission/v2', { headers: { ...H, 'ductus-protocol': '1' }, data: { documentId: DOC, revision: 1 } });
    log(`TEZA submit ${r.status()} ${(await r.text()).slice(0, 400)}`);
  },
  async predaj(page) {
    const SEM = '9ff97f5f-3ebc-40bc-822a-0223b482b7e2';
    await signIn(page, 'demo-student-2');
    page.on('response', async (r) => { if (r.url().includes('/submission')) log(`RESP ${r.request().method()} ${r.url().split('/api')[1]} ${r.status()} ${(await r.text().catch(() => '')).slice(0, 400)} REQ ${r.request().postData()}`); });
    await page.goto(`${BASE}/app/web/rad/${SEM}/predaja/slanje`); await page.waitForTimeout(5000);
    await page.getByRole('button', { name: 'Predaj rad' }).click(); await page.waitForTimeout(1500);
    await page.getByRole('dialog').getByRole('button', { name: 'Predaj rad' }).click(); await page.waitForTimeout(8000);
    log(`=== nakon klika ${page.url()}\n${(await page.locator('main').first().ariaSnapshot()).slice(0, 3000)}`);
    await page.screenshot({ path: IZLAZ + 'sem-potvrda.png', fullPage: true });
    const pdf = await page.request.get(`/api/v1/student/assignments/${SEM}/submission/pdf`);
    log(`PDF ${pdf.status()} ${pdf.headers()['content-type']} ${(await pdf.body()).length}`);
    const wr = await page.request.get('/api/v1/student/works'); const wt = await wr.text(); log(`WORKS ${wr.status()} ${wt.slice(0, 500)}`);
    const doc = (JSON.parse(wt).works || []).find(a => a.assignmentId === SEM); log(`WORK ${JSON.stringify(doc).slice(0, 300)}`);
    if (doc?.workId) { const d = await page.request.get(`/api/v1/works/${doc.workId}/export?format=docx`); log(`DOCX ${d.status()} ${d.headers()['content-type']} ${(await d.body()).length} sha=${d.headers()['x-export-snapshot-sha256']}`); }
  },
  async predaja(page) {
    const SEM = '9ff97f5f-3ebc-40bc-822a-0223b482b7e2';
    await signIn(page, 'demo-student-2');
    for (const k of ['pregled', 'izjava', 'slanje', 'potvrda']) {
      await page.goto(`${BASE}/app/web/rad/${SEM}/predaja/${k}`); await page.waitForTimeout(5000);
      log(`=== ${k} ${page.url()}\n${(await page.locator('main').first().ariaSnapshot().catch(e => 'ERR ' + e.message)).slice(0, 2500)}`);
    }
  },
  async etape2(page) {
    await signIn(page, 'demo-student-2');
    const st = await page.request.get(`/api/v1/works/${DOC}/milestone-states`);
    const ms = (await st.json()).milestones; log(`STUDENT stanja ${st.status()} ${JSON.stringify(ms).slice(0, 300)}`);
    const r = await page.request.post(`/api/v1/works/${DOC}/milestones/${ms[0].id}/submit`, { headers: H });
    log(`STUDENT submit ${r.status()} ${(await r.text()).slice(0, 300)}`);
    const teacher = await (await page.context().browser().newContext({ baseURL: BASE })).newPage();
    await signIn(teacher, 'demo-teacher');
    for (const u of [`/api/v1/works/${DOC}/milestones`, `/api/v1/works/${DOC}/consultation-slots`, `/api/v1/works/${DOC}/messages`]) {
      const g = await teacher.request.get(u); log(`NASTAVNIK GET ${u.split('/').pop()} ${g.status()} ${(await g.text()).slice(0, 400)}`);
    }
  },
  async etape(page) {
    const teacher = await (await page.context().browser().newContext({ baseURL: BASE })).newPage();
    await signIn(teacher, 'demo-teacher');
    for (const m of [{ title: 'Izmišljena tema i plan rada', dueAt: '2026-12-15T22:59:00.000Z', submits: 'topic_text' }, { title: 'Izmišljena prva verzija poglavlja', dueAt: '2027-02-01T22:59:00.000Z', submits: 'current_version' }]) {
      const r = await teacher.request.post(`/api/v1/works/${DOC}/milestone-plan/milestones`, { headers: H, data: m });
      log(`NASTAVNIK etapa ${r.status()} ${(await r.text()).slice(0, 300)}`);
    }
    await signIn(page, 'demo-student-2');
    await page.goto(`${BASE}/app/web/rad/${TEZA}`); await page.waitForTimeout(6000); await skipGuide(page);
    await page.getByRole('tab', { name: /Mentor/ }).click(); await page.waitForTimeout(2000);
    const panel = page.getByRole('tabpanel', { name: 'Mentor' });
    const etape = panel.getByRole('group').filter({ hasText: /^Etape/ }).first();
    await etape.click().catch(() => {}); await page.waitForTimeout(1000);
    log(`=== etape\n${(await etape.ariaSnapshot()).slice(0, 3000)}`);
    await page.screenshot({ path: IZLAZ + 'teza-etape.png', fullPage: true });
  },
  async konz2(page) {
    page.on('response', (r) => { if (r.url().includes('/api/v1/') && r.request().method() === 'GET' && r.status() !== 200) log(`HTTP GET ${r.url().replace(/^.*\/api\/v1/, '')} ${r.status()}`); });
    await signIn(page, 'demo-student-2');
    await page.goto(`${BASE}/app/web/rad/${TEZA}`); await page.waitForTimeout(6000); await skipGuide(page);
    await page.getByRole('tab', { name: /Mentor/ }).click(); await page.waitForTimeout(2000);
    const panel = page.getByRole('tabpanel', { name: 'Mentor' });
    await panel.getByRole('button', { name: 'Zatraži konzultacije' }).click(); await page.waitForTimeout(800);
    const when = panel.getByRole('textbox', { name: 'Predloženi termin' });
    log('termin type=' + await when.getAttribute('type') + ' placeholder=' + await when.getAttribute('placeholder'));
    await when.fill('2026-12-10T10:00').catch(async () => { await when.fill('10. 12. 2026. 10:00'); });
    await panel.getByRole('button', { name: 'Pošalji mentoru' }).click(); await page.waitForTimeout(3000);
    log(`=== konzultacije nakon\n${(await panel.getByRole('region', { name: /Konzultacije/ }).ariaSnapshot()).slice(0, 1200)}`);
    const poruke = panel.getByRole('group').filter({ hasText: /^Poruke/ }).first();
    await poruke.click().catch(() => {}); await page.waitForTimeout(800);
    await poruke.getByRole('textbox', { name: 'Poruka mentoru' }).fill('Izmišljena poruka mentoru o diplomskom radu.');
    await poruke.getByRole('button', { name: 'Pošalji' }).click(); await page.waitForTimeout(3000);
    log(`=== poruke nakon\n${(await poruke.ariaSnapshot()).slice(0, 1200)}`);
  },
  async konz(page) {
    await signIn(page, 'demo-student-2');
    await page.goto(`${BASE}/app/web/rad/${TEZA}`); await page.waitForTimeout(6000); await skipGuide(page);
    await page.getByRole('tab', { name: /Mentor/ }).click(); await page.waitForTimeout(2000);
    const panel = page.getByRole('tabpanel', { name: 'Mentor' });
    await panel.getByRole('button', { name: 'Zatraži konzultacije' }).click(); await page.waitForTimeout(1500);
    log(`=== obrazac konzultacija\n${(await panel.ariaSnapshot()).split('\n').filter((l) => !l.includes('/url')).join('\n').slice(0, 3000)}`);
    const poruke = panel.getByRole('group').filter({ hasText: /^Poruke/ }).first();
    await poruke.click().catch(() => {}); await page.waitForTimeout(1000);
    log(`=== poruke\n${(await poruke.ariaSnapshot().catch(() => 'nema')).slice(0, 1500)}`);
  },
  async mentor(page) {
    await signIn(page, 'demo-student-2');
    await page.goto(`${BASE}/app/web/rad/${TEZA}`); await page.waitForTimeout(6000); await skipGuide(page);
    const tabs = await page.getByRole('tab').allTextContents(); log('TABS ' + JSON.stringify(tabs));
    const btns = await page.getByRole('button').allTextContents(); log('BUTTONS ' + JSON.stringify(btns.map((b) => b.trim()).filter(Boolean)));
    const m = page.getByRole('tab', { name: /Mentor/ }).or(page.getByRole('button', { name: /^Mentor/ })).first();
    if (await m.count()) { await m.click(); await page.waitForTimeout(3000); }
    const panel = page.getByRole('tabpanel').or(page.locator('aside')).first();
    log(`=== mentor\n${(await page.locator('body').ariaSnapshot()).split('\n').filter((l) => !l.includes('/url')).join('\n').slice(0, 9000)}`);
    await page.screenshot({ path: IZLAZ + 'teza-mentor.png', fullPage: true });
  },
  async api(page) {
    await signIn(page, 'demo-student-2');
    for (const p of ['student/assignment-work', 'student/mentored-assignments', 'student/mentorships']) {
      const r = await page.request.get(`/api/v1/${p}`); log(`=== API ${p} ${r.status()}
${(await r.text()).slice(0, 1500)}`);
    }
    page.on('requestfinished', (r) => { if (r.url().includes('/api/v1/')) log(`REQ ${r.method()} ${r.url().replace(/^.*\/api\/v1/, '')}`); });
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log('CONSOLE ' + m.text().slice(0, 300)); });
    await page.goto(`${BASE}/app/web/rad/${TEZA}`); await page.waitForTimeout(8000); await skipGuide(page);
    await snap(page, 'rad', 1500);
  },
  async sazetak(page) {
    // INT-31: process-summary for the student's own unsubmitted thesis document and the submitted one.
    await signIn(page, 'demo-student-2');
    await page.goto(`${BASE}/app/web/zadaci`); await page.waitForTimeout(3000);
    for (const id of [DOC, '857f4f02-8dc9-4ce2-9ff4-062199a5d54b']) {
      const r = await page.request.post('/api/v1/process-summary', { data: { documentId: id }, headers: { origin: BASE } });
      log(`SAZETAK ${id.slice(0, 8)} ${r.status()} ${(await r.text()).slice(0, 300)}`);
    }
  },
  async dorada(page) {
    // INT-31 "Slanje dorade": the teacher returns the submitted seminar, the student sees the request.
    const SEM = '9ff97f5f-3ebc-40bc-822a-0223b482b7e2';
    const SEM_DOC = '5c441836-0ff9-4570-950e-97c5b7585a09';
    await signIn(page, 'demo-teacher');
    const r = await page.request.post(`/api/v1/works/${SEM_DOC}/return-for-revision`, {
      data: { comment: 'Izmišljeni zahtjev za doradu (INT-31).', revisionDueAt: '2099-12-01T10:00:00.000Z' }, headers: { origin: BASE },
    });
    log(`VRATI ${r.status()} ${(await r.text()).slice(0, 300)}`);
    await page.context().clearCookies();
    await signIn(page, 'demo-student-2');
    const n = await page.request.get('/api/v1/notifications/returned-for-revision');
    log(`OBAVIJEST ${n.status()} ${(await n.text()).slice(0, 400)}`);
    await page.goto(`${BASE}/app/web/rad/${SEM}`); await page.waitForTimeout(8000); await skipGuide(page);
    log('RAD ' + (await page.locator('main').innerText().catch(() => '')).split(String.fromCharCode(10)).filter((l) => /dorad|Predaj|vrać/i.test(l)).slice(0, 8).join(' | '));
    await snap(page, 'dorada', 1000);
  },
  async usporedi(page) {
    // INT-31: is the editor toolbar of the returned seminar locked, compared with the unsubmitted thesis?
    await signIn(page, 'demo-student-2');
    const w = await page.request.get('/api/v1/student/assignment-work');
    log(`STANJE ${(await w.text()).slice(0, 600)}`);
    for (const id of ['9ff97f5f-3ebc-40bc-822a-0223b482b7e2', TEZA]) {
      await page.goto(`${BASE}/app/web/rad/${id}`); await page.waitForTimeout(8000); await skipGuide(page);
      const ed = page.locator('[contenteditable]').first();
      log(`UREDIVAC ${id.slice(0, 8)} contenteditable=${await ed.getAttribute('contenteditable').catch(() => 'nema')}`);
      await ed.click({ timeout: 5000 }).catch(() => {});
      log(`PODEBLJANO ${id.slice(0, 8)} disabled=${await page.getByRole('button', { name: 'Podebljano' }).isDisabled().catch(() => 'nema')}`);
    }
  },
  async izvoz(page) {
    // INT-31 data export, student side: the own list and an unknown one-time link (no clerk exists in the seed).
    await signIn(page, 'demo-student-2');
    const l = await page.request.get('/api/v1/institution/student-data-exports');
    log(`POPIS ${l.status()} ${(await l.text()).slice(0, 300)}`);
    const t = await page.request.get('/api/v1/student/data-export/' + 'A'.repeat(43));
    log(`POVEZNICA ${t.status()} ${(await t.text()).slice(0, 200)}`);
    const z = await page.request.post('/api/v1/institution/student-data-exports', { data: { studentId: '18e08064-79d1-465c-acb0-da4af79ad3d3', identityCheckedBy: 'student_card', note: 'INT-31' }, headers: { origin: BASE } });
    log(`ZAHTJEV-STUDENT ${z.status()} ${(await z.text()).slice(0, 200)}`);
  },
  async nastavnik(page) {
    // INT-32: crawl every teacher page linked from the course list as demo-teacher; record URLs for the negative pass.
    await signIn(page, 'demo-teacher');
    const urls = await obidi(page, [`${BASE}/app/web/nastavnik/kolegiji`], 30);
    (await import('node:fs')).writeFileSync(IZLAZ + 'nastavnik-urls.json', JSON.stringify(urls, null, 1));
    (await import('node:fs')).writeFileSync(IZLAZ + 'nastavnik-api.json', JSON.stringify(page.dobri, null, 1)); log(`API GET 2xx: ${page.dobri.length}`);
  },
  async nastavnikRad(page) {
    // INT-32: the sub-pages of each work demo-teacher reached in the crawl.
    await signIn(page, 'demo-teacher');
    const radovi = ['e9ddf3d0-f590-4be3-a528-e51761009a9a', 'd3a030b6-8780-4950-bff7-23d71f7ff17d', '5c441836-0ff9-4570-950e-97c5b7585a09'];
    const pod = ['pregled', 'konzultacije', 'sazetak', 'usporedba', 'reprodukcija', 'priprema-razgovora', 'predaja'];
    await obidi(page, radovi.flatMap((r) => pod.map((x) => `${BASE}/app/web/nastavnik/rad/${r}/${x}`)), 21, false);
  },
  async nastavnikPise(page) {
    // INT-32: the mentor writes on the thesis (slot, consultation record, message, stage, note); the student reads it; another teacher is refused.
    const MENT = 'e755883d-4840-49b5-870c-4af67ec4c87d';
    const W = `/api/v1/works/${DOC}`;
    const o = { headers: { origin: BASE } };
    const pokazi = async (oznaka, r) => log(`${oznaka} ${r.status()} ${(await r.text()).slice(0, 220).replace(/\s+/g, ' ')}`);
    await signIn(page, 'demo-teacher');
    const oznaka = `INT-32 ${Date.now()}`;
    await pokazi('TERMIN', await page.request.post(`${W}/consultation-slots`, { ...o, data: { startsAt: '2099-12-04T12:00:00.000Z' } }));
    const ver = await (await page.request.get(`${W}/versions`)).json().catch(() => ({ versions: [] }));
    const rev = Math.max(1, ...(ver.versions || []).map((v) => v.revision || 0));
    await pokazi('ZAPIS', await page.request.post(`${W}/consultation-records`, { ...o, data: { heldOn: '2026-11-24', revision: rev, topic: `Izmišljena tema (${oznaka})`, agreement: 'Izmišljeni dogovor.' } }));
    await pokazi('PORUKA', await page.request.post(`${W}/messages`, { ...o, data: { text: `Izmišljena poruka mentora (${oznaka}).` } }));
    await pokazi('ETAPA-GET', await page.request.get(`${W}/thesis-stage`));
    await pokazi('ETAPA-PUT', await page.request.put(`${W}/thesis-stage`, { ...o, data: { stage: 'defense_scheduled', defenseAt: '2099-12-15T09:00:00.000Z' } }));
    await pokazi('BILJESKA', await page.request.post(`/api/v1/mentorships/${MENT}/notes`, { ...o, data: { body: `Izmišljena bilješka (${oznaka}).` } }));
    await pokazi('TIM', await page.request.get('/api/v1/courses/87087218-38ac-4df9-bd46-ccde4018b7ad/team'));
    await page.goto(`${BASE}/app/web/nastavnik/rad/${DOC}/konzultacije`); await page.waitForTimeout(6000); await skipGuide(page);
    log('UI-KONZ ' + ((await page.locator('main').innerText().catch(() => '')).includes(oznaka) ? 'zapis vidljiv' : 'zapis NIJE vidljiv'));
    await page.context().clearCookies(); await signIn(page, 'demo-student-2');
    const poruke = await (await page.request.get(`${W}/messages`)).text();
    log(`STUDENT-PORUKA ${poruke.includes(oznaka) ? 'vidi' : 'NE vidi'}`);
    log(`STUDENT-ZAPIS ${(await (await page.request.get(`${W}/consultation-records`)).text()).includes(oznaka) ? 'vidi' : 'NE vidi'}`);
    log(`STUDENT-TERMIN ${(await (await page.request.get(`${W}/consultation-slots`)).text()).includes('2099-12-04') ? 'vidi' : 'NE vidi'}`);
    await pokazi('STUDENT-ETAPA', await page.request.get(`${W}/thesis-stage`));
    const bil = await page.request.get(`/api/v1/mentorships/${MENT}/notes`);
    log(`STUDENT-BILJESKE ${bil.status()} ${(await bil.text()).includes(oznaka) ? 'VIDI mentorovu bilješku' : 'ne vidi bilješku'}`);
    await pokazi('STUDENT-OBAVIJESTI', await page.request.get('/api/v1/notifications'));
    await page.context().clearCookies(); await signIn(page, 'demo-teacher-2');
    await pokazi('TUDJI-PORUKA', await page.request.post(`${W}/messages`, { ...o, data: { text: 'Ne smije proći.' } }));
    await pokazi('TUDJI-TERMIN', await page.request.post(`${W}/consultation-slots`, { ...o, data: { startsAt: '2099-12-05T12:00:00.000Z' } }));
    await pokazi('TUDJI-ETAPA', await page.request.put(`${W}/thesis-stage`, { ...o, data: { stage: 'defense_scheduled', defenseAt: '2099-12-16T09:00:00.000Z' } }));
    await pokazi('TUDJI-BILJESKE', await page.request.get(`/api/v1/mentorships/${MENT}/notes`));
  },
  async nastavnikTermin(page) {
    // INT-32: the student requests a consultation slot (student_owner); the mentor sees it and can change it.
    const W = `/api/v1/works/${DOC}`;
    const o = { headers: { origin: BASE } };
    await signIn(page, 'demo-student-2');
    const r = await page.request.post(`${W}/consultation-slots`, { ...o, data: { startsAt: '2099-12-04T12:00:00.000Z' } });
    log(`STUDENT-TRAZI ${r.status()} ${(await r.text()).slice(0, 200)}`);
    await page.context().clearCookies(); await signIn(page, 'demo-teacher');
    const t = await (await page.request.get(`${W}/consultation-slots`)).text();
    log(`MENTOR-VIDI ${t.includes('2099-12-04') ? 'da' : 'NE'} ${t.slice(0, 200)}`);
    await page.goto(`${BASE}/app/web/nastavnik/rad/${DOC}/konzultacije`); await page.waitForTimeout(6000); await skipGuide(page);
    log(`UI-TERMIN ${(await page.locator('main').innerText().catch(() => '')).slice(0, 400).replace(/\s+/g, ' ')}`);
  },
  async nastavnikPolja(page) {
    // INT-32: list the controls of each teacher form, so the save steps can fill them by label.
    await signIn(page, 'demo-teacher');
    const A = '9ff97f5f-3ebc-40bc-822a-0223b482b7e2';
    for (const u of ['novi?kolegij=87087218-38ac-4df9-bd46-ccde4018b7ad', `${A}/uredi`, `${A}/uredi?kopiraj=1`, `${A}/produljenje`, `${A}/merlin`]) {
      await page.goto(`${BASE}/app/web/nastavnik/zadatak/${u}`); await page.waitForTimeout(5000); await skipGuide(page);
      const polja = await page.evaluate(() => [...document.querySelectorAll('main input, main select, main textarea, main button, main [role=radio], main [role=checkbox]')].map((e) => {
        const l = (e.labels && e.labels[0] && e.labels[0].innerText) || e.getAttribute('aria-label') || e.innerText || e.getAttribute('name') || '';
        return `${e.tagName.toLowerCase()}${e.type ? ':' + e.type : ''}${e.disabled ? '(x)' : ''}=${l.trim().replace(/\s+/g, ' ').slice(0, 50)}`;
      }));
      log(`OBRAZAC ${u} :: ${polja.join(' | ').slice(0, 1500)}`);
    }
  },
  async nastavnikSpremi(page) {
    // INT-32: fill and save each teacher form in the browser, then check what the student sees.
    const A = '9ff97f5f-3ebc-40bc-822a-0223b482b7e2';
    const K = '87087218-38ac-4df9-bd46-ccde4018b7ad';
    const oznaka = `INT-32 ${Date.now()}`;
    const dt = (dana) => { const d = new Date(Date.now() + dana * 864e5); d.setMinutes(0, 0, 0); return d.toISOString().slice(0, 16); };
    page.on('response', async (r) => { const m = r.request().method(); if (r.url().includes('/api/') && m !== 'GET' && !r.url().includes('client-context')) { log(`  ${m} ${r.status()} ${r.url().split('/api')[1].slice(0, 110)}`); if (r.status() >= 400) log(`    REQ ${(r.request().postData() ?? '').slice(0, 500)} RESP ${(await r.text().catch(() => '')).slice(0, 300)}`); } });
    const stanje = async (n) => { await page.waitForTimeout(4000); log(`${n} url=${page.url().split('/app/web')[1]} h1="${(await page.locator('h1').first().innerText().catch(() => '')).slice(0, 60)}" alert="${(await page.locator('[role=alert],[role=status]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ').slice(0, 200)}"`); };
    const idi = async (u) => { await page.goto(`${BASE}/app/web/nastavnik/zadatak/${u}`); await page.waitForTimeout(5000); await skipGuide(page); };
    const prviIzbor = async (l) => { const s = page.getByLabel(l, { exact: true }); const v = await s.locator('option').evaluateAll((o) => o.map((x) => x.value).filter(Boolean)); if (v.length) await s.selectOption(v[0]); return v; };
    await signIn(page, 'demo-teacher');

    await idi(`novi?kolegij=${K}`);
    await page.getByLabel('Naslov zadatka', { exact: true }).fill(`Izmišljeni zadatak (${oznaka})`);
    await prviIzbor('Vrsta rada');
    await page.getByLabel('Opis zadatka', { exact: true }).fill('Izmišljeni opis zadatka za lokalnu provjeru.');
    await page.getByLabel('Otvaranje', { exact: true }).fill(dt(1));
    await page.getByLabel('Rok', { exact: true }).fill(dt(30));
    await page.getByRole('button', { name: 'Pregled i objava' }).click();
    await stanje('NOVI-PREGLED');
    const objavi = page.getByRole('button', { name: /^Objavi/ }).first();
    if (await objavi.count()) { await objavi.click(); await stanje('NOVI-OBJAVA'); } else log('NOVI nema gumba Objavi: ' + (await page.locator('main button').allInnerTexts()).join(' | ').slice(0, 300));

    await idi(`${A}/uredi`);
    const n = page.getByLabel('Naslov', { exact: true });
    await n.fill(`${await n.inputValue()} · v2`);
    const v2 = page.getByRole('button', { name: /Objavi verziju/ });
    log(`VERZIJA gumb ${await v2.isEnabled().catch(() => 'nema')}`);
    if (await v2.isEnabled().catch(() => false)) { await v2.click(); await stanje('VERZIJA'); const p2 = page.getByRole('button', { name: /^Objavi|^Potvrdi/ }).first(); if (await p2.isEnabled().catch(() => false)) { await p2.click(); await stanje('VERZIJA-POTVRDA'); } }

    await idi(`${A}/uredi?kopiraj=1`);
    const odr = await prviIzbor('Odredišni kolegij');
    log(`KOPIJA kolegiji ${odr.join(',')}`);
    await page.getByRole('button', { name: 'Stvori kopiju' }).click().catch((e) => log('KOPIJA klik ' + e.message.slice(0, 120)));
    await stanje('KOPIJA');

    await idi(`${A}/produljenje`);
    await page.getByLabel('Jedan student', { exact: true }).check();
    const st = await prviIzbor('Student');
    await page.getByLabel('Novi rok', { exact: true }).fill(dt(80));
    await prviIzbor('Razlog');
    log(`PRODULJENJE studenti ${st.length}`);
    await page.getByRole('button', { name: 'Zabilježi produljenje' }).click();
    await stanje('PRODULJENJE');

    await idi(`${A}/merlin`);
    await prviIzbor('Zadatak');
    await page.waitForTimeout(3000);
    const prazno = await page.getByText('Nema predanih radova').count();
    let mst = '';
    for (let i = 0; i < 20 && !prazno; i++) { mst = (await page.getByTestId('merlin-status').innerText().catch(() => '')).replace(/\s+/g, ' '); if (await page.getByRole('button', { name: /Preuzmi/i }).count()) break; await page.waitForTimeout(3000); }
    const csv = await page.getByRole('region', { name: 'CSV popis' }).locator('tr').count();
    log(`MERLIN prazno=${prazno} status="${mst.slice(0, 200)}" preuzmi=${await page.getByRole('button', { name: /Preuzmi/i }).count()} csvRedaka=${csv}`);

    await page.context().clearCookies(); await signIn(page, 'demo-student-2');
    const z = await (await page.request.get('/api/v1/student/assignments')).text();
    log(`STUDENT novi zadatak ${z.includes(oznaka) ? 'VIDI' : 'ne vidi'}; v2 ${z.includes('· v2') ? 'VIDI' : 'ne vidi'}`);
  },
  async nastavnikApi(page) {
    // INT-32 negative at the API: every GET that answered demo-teacher with 2xx, replayed as other accounts.
    const api = JSON.parse((await import('node:fs')).readFileSync(IZLAZ + 'nastavnik-api.json', 'utf8'));
    for (const racun of ['demo-b-teacher', 'demo-teacher-2', 'demo-student-2']) {
      await page.context().clearCookies(); await signIn(page, racun);
      const tuzno = [];
      for (const a of api) {
        const r = await page.request.get('/api' + a); const t = await r.text();
        if (r.status() < 300) tuzno.push(`${r.status()} ${a.slice(0, 110)} ${t.slice(0, 90).replace(/\s+/g, ' ')}`);
      }
      log(`=== ${racun}: ${api.length} poziva, 2xx: ${tuzno.length}`); for (const t of tuzno) log('  2XX ' + t);
    }
  },
  async nastavnikTudji(page) {
    // INT-32 negative: a teacher of another institution and a student open demo-teacher's pages.
    const urls = JSON.parse((await import('node:fs')).readFileSync(IZLAZ + 'nastavnik-urls.json', 'utf8'));
    for (const racun of ['demo-b-teacher', 'demo-student-2']) {
      await page.context().clearCookies(); await signIn(page, racun); log(`=== ${racun}`);
      await obidi(page, urls, urls.length, false);
    }
  },
  async teza(page) {
    await signIn(page, 'demo-student-2');
    await page.goto(`${BASE}/app/web/rad/${TEZA}`); await page.waitForTimeout(4000); await skipGuide(page);
    const start = page.getByRole('button', { name: /Započni rad/ });
    if (await start.count()) { await start.first().click(); await page.waitForTimeout(4000); await skipGuide(page); }
    await snap(page, 'nakon zapocni', 2000);
    const editor = page.getByRole('textbox', { name: 'Tekst rada', exact: true });
    const chip = page.locator('footer[aria-label="Stanje rada"]').getByRole('status');
    const sentence = `Izmišljena rečenica diplomskog rada ${Date.now()}.`;
    await editor.click(); await page.keyboard.press('Control+End'); await page.keyboard.insertText(` ${sentence}`);
    await chip.filter({ hasText: 'Spremljeno na poslužitelju' }).waitFor({ timeout: 60000 }).then(() => log('PROLAZ spremljeno na poslužitelju'), () => log('PAD chip: ' + 'nije „Spremljeno na poslužitelju”'));
    await page.reload(); await page.waitForTimeout(5000); await skipGuide(page);
    await snap(page, 'nakon osvjezi', 2000);
    log((await editor.textContent().catch(() => '')).includes(sentence) ? 'PROLAZ rečenica nakon osvježavanja' : 'PAD rečenica nije nakon osvježavanja');
    await page.screenshot({ path: IZLAZ + 'teza-rad.png' });
  },
};

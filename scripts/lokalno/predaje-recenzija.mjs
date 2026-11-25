// INT-35: gives one assignment enough submitted works for a peer-review round (V19 needs
// max(5, 2k+1)). It goes through the real API like `pnpm lokalno:predaje` (seed-predaja.ts of the
// stack's SRV tree): simulator sign-in, enrolment code, one saved revision, submission. Invented
// accounts only (sim:student:demo-recenzent-N@demo.ductus.test); nothing touches the database.
// A rerun is idempotent (same revision, same receipt).
//
// Use (cwd = SRV tree): node predaje-recenzija.mjs . [count=6] [zadatak=seminar|hidro|danas]
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const [tree = '.', n = '6', which = 'seminar'] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(resolve(tree, p)).href);
const seed = await imp('scripts/lokalno/seed-predaja.ts');
const { ISSUER, assertLocal, stackOptions } = await imp('scripts/lokalno/config.ts');
const { closePools } = await imp('server/database/index.ts');
const fp = await imp('server/domain/notice/fingerprint.ts');
const { canonicalizeJcs } = await imp('server/domain/forensics/jcs.ts');

export const ZADACI = {
  seminar: { code: 'UPIS2026DEMO', course: 'Izmišljeni seminar iz ekologije grada', title: 'Seminarski rad: kućno kompostiranje', afterDeadline: false },
  hidro: { code: 'HIDRO2026DEMO', course: 'Izmišljeni seminar iz urbane hidrologije', title: 'Kratki osvrt: gradski vrtovi', afterDeadline: true },
  // Made by novi-zadatak.mjs (INT-35, second run on 25. 11.) in the seminar course, due later the same day.
  danas: { code: 'UPIS2026DEMO', course: 'Izmišljeni seminar iz ekologije grada', title: 'Recenzija danas: gradsko zelenilo', afterDeadline: false },
};
const zadatak = ZADACI[which];
if (!zadatak) throw new Error(`nepoznat zadatak ${which}`);

// seed-predaja.ts hashes every notice field except four, so the newer `purposeCatalogVersion` makes
// the server answer 409 notice_changed. Enrol and acknowledge here with the server's own field
// list first; seedSubmission then skips both because the course is there and acknowledgedAt is set.
async function acknowledge(api) {
  const list = async () => (await (await api('student/assignments')).json()).courses ?? [];
  if (!(await list()).some((c) => c.name === zadatak.course))
    await (await api('student/enrollments', { code: zadatak.code })).body?.cancel();
  const id = (await list()).find((c) => c.name === zadatak.course)?.assignments.find((a) => a.title === zadatak.title)?.id;
  if (!id) throw new Error(`nema zadatka „${zadatak.title}”`);
  const n = await (await api(`student/assignments/${id}/notice`)).json();
  if (n.acknowledgedAt) return;
  const input = Object.fromEntries(fp.NOTICE_FINGERPRINT_FIELDS.map((k) => [k, n[k]]));
  const fingerprint = createHash('sha256').update(`${fp.NOTICE_FINGERPRINT_FORMAT_V1}\n${canonicalizeJcs(fp.noticeFingerprintPayload(input))}`).digest('hex');
  for (const [path, body] of [[`student/assignments/${id}/notice-read`, { versionNo: n.versionNo }], [`institution/assignments/${id}/acknowledgment`, { versionNo: n.versionNo, fingerprint }]]) {
    const r = await api(path, body);
    if (r.status !== 200) throw new Error(`/api/v1/${path}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
    await r.body?.cancel();
  }
}

assertLocal(process.env);
const { origin } = stackOptions(false);
const TOPICS = ['kompostiranje u vrtiću', 'kompostiranje na balkonu', 'gradski kompostni otoci', 'glistenjak u stanu', 'kompost i školski vrt', 'zajednički komposter zgrade'];
let fails = 0;
for (let i = 1; i <= Number(n); i++) {
  const api = await seed.signIn(origin, ISSUER, `sim:student:demo-recenzent-${i}@demo.ductus.test`);
  try {
    await acknowledge(api);
    await seed.seedSubmission(api, {
      ...zadatak,
      text: `Izmišljeni rad recenzenta ${i}: ${TOPICS[(i - 1) % TOPICS.length]}. Tekst služi samo za lokalnu provjeru recenzije.`,
    });
    console.log(`demo-recenzent-${i} (${which}): predano`);
  } catch (e) {
    fails++;
    console.log(`demo-recenzent-${i} (${which}): PAD ${e instanceof Error ? e.message : e}`);
  } finally {
    await (await api('auth/logout', {})).body?.cancel();
  }
}
await closePools();
process.exitCode = fails ? 1 : 0;

// INT-35: V19 anonymous peer review end to end on the real stack, API only (no WEB screen mounts it yet).
// Needs the submitted works of predaje-recenzija.mjs (sim:student:demo-recenzent-1..6) on the chosen
// assignment. Allocation is once per round, so a rerun reads the allocated round and goes on; the round
// must be open (opensAt in the past) for the student part. Invented data only.
// Use (cwd = SRV tree): node int35.mjs . [hidro|seminar]   (prints PROLAZ/PAD lines and a sum)
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [tree = '.', which = 'hidro'] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(resolve(tree, p)).href);
const seed = await imp('scripts/lokalno/seed-predaja.ts');
const { ISSUER, assertLocal, stackOptions } = await imp('scripts/lokalno/config.ts');
assertLocal(process.env);
const { origin } = stackOptions(false);

// seed-predaja's api() sends GET, or POST when there is a body. The round is set with PUT, so a body
// that carries `__method` is sent with that method instead (local tool, our own requests only).
const plainFetch = globalThis.fetch;
globalThis.fetch = (url, init = {}) => {
  if (init.method === 'POST' && typeof init.body === 'string' && init.body.includes('"__method"')) {
    const { __method, ...body } = JSON.parse(init.body);
    init = { ...init, method: __method, body: JSON.stringify(body) };
  }
  return plainFetch(url, init);
};

const COURSE = { hidro: 'Izmišljeni seminar iz urbane hidrologije', seminar: 'Izmišljeni seminar iz ekologije grada' }[which];
const N = 6, K = 2;
const R = (i) => `sim:student:demo-recenzent-${i}@demo.ductus.test`;
const sum = { PROLAZ: 0, PAD: 0 };
const sessions = new Map();
const as = async (who) => sessions.get(who) ?? sessions.set(who, await seed.signIn(origin, ISSUER, who)).get(who);
const short = (who) => who.replace(/^sim:student:|@demo\.ductus\.test$/g, '');

const A = (await (await (await as(R(1)))('student/assignments')).json()).courses.find((c) => c.name === COURSE)?.assignments[0]?.id;
if (!A) throw new Error(`recenzent 1 nije upisan u ${COURSE}; prvo predaje-recenzija.mjs`);
const T = `teacher/assignments/${A}/peer-review`, S = `student/assignments/${A}/peer-review`;
console.log(`zadatak ${which}: ${A}`);

async function call(who, method, path, body, ok, note = '') {
  const api = await as(who);
  const r = method === 'GET' ? await api(path) : await api(path, method === 'POST' ? body ?? {} : { ...body, __method: method });
  const t = await r.text();
  const pass = ok === true ? r.status >= 200 && r.status < 300 : ok === false ? r.status === 403 || r.status === 404 : ok(r.status, t);
  sum[pass ? 'PROLAZ' : 'PAD']++;
  console.log(`${pass ? 'PROLAZ' : 'PAD'} ${ok === false ? 'NEG' : 'POZ'} ${short(who)} ${r.status} ${method} ${path.replace(A, 'A')} ${note}${pass ? '' : ' ' + t.slice(0, 200)}`);
  try { return JSON.parse(t); } catch { return null; }
}
const is = (st, c) => (s, t) => s === st && (!c || t.includes(c));
// Nothing of a person, a work, an assignment or a course in an anonymous answer.
const anonymous = (t) => !/givenName|familyName|reviewer|author|assignmentId|courseId|documentId|userId|Simulirani/.test(t);
const rubrics = [{ key: 'jasnoca', label: 'Izmišljena jasnoća argumenta' }, { key: 'izvori', label: 'Izmišljeni izvori' }];
const review = (i, n) => ({ byRubric: [{ key: 'jasnoca', text: `Izmišljena recenzija ${i}.${n}: argument je jasan.` }, { key: 'izvori', text: `Izmišljena recenzija ${i}.${n}: dodaj izvor.` }], general: 'Izmišljeni opći komentar.' });

console.log('=== nastavnik: krug (otvoren od danas) i dodjela');
const round = { opensAt: '2026-11-25T00:00:00.000Z', dueAt: '2026-12-10T22:00:00.000Z', reviewsPerStudent: K, rubrics };
const before = await call('demo-teacher', 'GET', T, undefined, true);
const works = before?.submittedWorks ?? 0;
console.log(`predanih radova ${works}, najmanje ${before?.minSubmissions}, stanje ${before?.state}`);
if (!before?.round?.allocatedAt) {
  await call('demo-teacher', 'PUT', T, round, true, `krug k=${K}`);
  await call('demo-teacher', 'GET', T, undefined, is(200, '"not_allocated"'), 'krug spremljen');
  await call('demo-teacher', 'POST', `${T}/allocations`, undefined, is(201, `"allocated":${works * K}`), `dodjela ${works}×${K}`);
} else console.log(`(krug je već dodijeljen ${before.round.allocatedAt}; nastavljam)`);
await call('demo-teacher', 'GET', T, undefined, is(200, '"open"'), 'krug otvoren');
await call('demo-teacher', 'POST', `${T}/allocations`, undefined, is(409, 'already_allocated'), 'druga dodjela');
await call('demo-teacher', 'PUT', T, round, is(409, 'already_allocated'), 'izmjena nakon dodjele');
await call('demo-teacher', 'GET', `${T}/overview`, undefined, (s, t) => s === 200 && JSON.parse(t).allocations.length === works * K && t.includes('givenName'), `${works * K} dodjela, obje strane imenom`);

console.log('=== recenzenti: zadaci, anonimni rad, recenzija');
const tasks = {};
for (let i = 1; i <= N; i++) {
  const r = await call(R(i), 'GET', `${S}/tasks`, undefined, (s, t) => s === 200 && t.includes('"open"') && JSON.parse(t).tasks.length === K && anonymous(t), `${K} zadatka, open, bez podataka o radu`);
  tasks[i] = (r?.tasks ?? []).map((x) => x.taskId);
}
for (let i = 1; i <= N; i++) {
  for (const [n, id] of tasks[i].entries()) {
    if (n === 0) await call(R(i), 'GET', `student/peer-review/tasks/${id}/work`, undefined, (s, t) => s === 200 && t.includes('Izmišljena jasnoća') && t.includes('"blocks"') && anonymous(t), 'rad bez autora');
    if (i === 1 && n === 1) {
      await call(R(i), 'POST', `student/peer-review/tasks/${id}/review`, { byRubric: [{ key: 'krivi', text: 'Izmišljeno.' }] }, is(422), 'krivi ključ rubrike');
      await call(R(i), 'POST', `student/peer-review/tasks/${id}/review`, { byRubric: [{ key: 'jasnoca', text: 'Izmišljeno.' }] }, is(422), 'nedostaje rubrika');
    }
    await call(R(i), 'POST', `student/peer-review/tasks/${id}/review`, review(i, n + 1), (s, t) => s === 201 || (s === 409 && t.includes('already_reviewed')), 'recenzija');
  }
}
await call(R(1), 'POST', `student/peer-review/tasks/${tasks[1][0]}/review`, review(1, 9), is(409, 'already_reviewed'), 'druga recenzija istog zadatka');
await call(R(1), 'GET', `${S}/tasks`, undefined, (s, t) => s === 200 && !t.includes('"pending"'), 'oba zadatka submitted');

console.log('=== NEG: tuđi zadatak (uključuje autora), strani računi');
const t1 = tasks[1][0];
for (let j = 2; j <= N; j++) await call(R(j), 'GET', `student/peer-review/tasks/${t1}/work`, undefined, false, 'tuđi zadatak');
await call(R(2), 'POST', `student/peer-review/tasks/${t1}/review`, review(2, 9), false, 'recenzija tuđeg zadatka');
await call(R(1), 'GET', T, undefined, false, 'student na ruti nastavnika');
await call(R(1), 'GET', `${T}/overview`, undefined, false, 'student na pregledu nastavnika');
await call('demo-student-2', 'GET', `${S}/tasks`, undefined, false, 'student izvan kolegija');
await call('demo-student-2', 'GET', `${S}/received`, undefined, false, 'student izvan kolegija');
await call('demo-student-2', 'GET', `student/peer-review/tasks/${t1}/work`, undefined, false, 'student izvan kolegija, zadatak');
await call('demo-teacher-2', 'GET', T, undefined, false, 'nastavnik drugog kolegija');
await call('demo-teacher-2', 'GET', `${T}/overview`, undefined, false, 'nastavnik drugog kolegija');
await call('demo-teacher-2', 'POST', `${T}/allocations`, undefined, false, 'nastavnik drugog kolegija');

console.log('=== autor: primljene recenzije, povlačenje');
const rec = await call(R(1), 'GET', `${S}/received`, undefined, (s, t) => s === 200 && JSON.parse(t).reviews.length >= 1 && t.includes('Izmišljena jasnoća') && anonymous(t), 'primljene recenzije bez recenzenta');
const got = rec?.reviews?.length ?? 0;
const rid = rec?.reviews?.[0]?.reviewId ?? '00000000-0000-4000-8000-000000000001';
await call(R(1), 'POST', `${T}/reviews/${rid}/withdrawal`, { reason: 'Student sam sebi.' }, false, 'student povlači');
await call('demo-teacher-2', 'POST', `${T}/reviews/${rid}/withdrawal`, { reason: 'Tuđi kolegij.' }, false, 'nastavnik drugog kolegija povlači');
await call('demo-teacher', 'POST', `${T}/reviews/${rid}/withdrawal`, { reason: '   ' }, is(422), 'prazan razlog');
await call('demo-teacher', 'POST', `${T}/reviews/${rid}/withdrawal`, { reason: 'Izmišljeni razlog povlačenja.' }, is(201, rid), 'povlačenje');
await call('demo-teacher', 'POST', `${T}/reviews/${rid}/withdrawal`, { reason: 'Opet.' }, is(409, 'conflict'), 'drugo povlačenje');
await call(R(1), 'GET', `${S}/received`, undefined, (s, t) => s === 200 && JSON.parse(t).reviews.length === got - 1 && !t.includes(rid), 'povučena se ne vidi');
await call('demo-teacher', 'GET', `${T}/overview`, undefined, (s, t) => {
  const st = JSON.parse(t).allocations.map((a) => a.state);
  return s === 200 && st.filter((x) => x === 'withdrawn').length === 1 && st.filter((x) => x !== 'pending').length === N * K;
}, 'nastavnik vidi 1 withdrawn i sve recenzije recenzenata');

for (const api of sessions.values()) await (await api('auth/logout', {})).body?.cancel();
console.log(`ZBROJ PROLAZ=${sum.PROLAZ} PAD=${sum.PAD}`);
process.exit(sum.PAD ? 1 : 0);

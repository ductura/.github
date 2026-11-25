// INT-32 row "Novi zadatak" again (was 422 before SRV#717): the teacher creates an assignment through
// institution.course-assignments.post with the body the WEB form sends (AssignmentBody + requestKey,
// incl. externalToolsAllowed and aiSummaryOnly), then reads it back. Invented data only.
// Use (cwd = SRV tree): node novi-zadatak.mjs . <courseId> "<title>" [opensAt] [dueAt]
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const [tree = '.', courseId, title, opensAt, dueAt] = process.argv.slice(2);
if (!courseId || !title) throw new Error('courseId i naslov su obavezni');
const imp = (p) => import(pathToFileURL(resolve(tree, p)).href);
const seed = await imp('scripts/lokalno/seed-predaja.ts');
const { ISSUER, assertLocal, stackOptions } = await imp('scripts/lokalno/config.ts');
assertLocal(process.env);
const { origin } = stackOptions(false);

const hour = 3600_000;
const body = {
  title,
  instructions: 'Izmišljeni zadatak za lokalnu provjeru. Nema stvarnih podataka.',
  workType: 'seminar_paper',
  opensAt: opensAt ?? new Date(Date.now() - hour).toISOString(),
  dueAt: dueAt ?? new Date(Date.now() + 2 * hour).toISOString(),
  aiPolicy: 'partially_allowed',
  aiPurposes: [],
  evidenceProfile: 'basic',
  importAllowed: false,
  wordMin: 300,
  wordMax: 3000,
  externalToolsAllowed: true,
  aiSummaryOnly: true,
  requestKey: randomUUID(),
};
const api = await seed.signIn(origin, ISSUER, 'demo-teacher');
const r = await api(`institution/courses/${courseId}/assignments`, body);
const text = await r.text();
console.log(`POST stvaranje: HTTP ${r.status} ${text.slice(0, 200)}`);
if (r.status === 201) {
  const again = await api(`institution/courses/${courseId}/assignments`, body);
  console.log(`isti requestKey ponovno: HTTP ${again.status} ${(await again.text()).slice(0, 200)}`);
}
process.exit(r.status === 201 ? 0 : 1);

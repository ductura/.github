// Tests for the local builder tools in scripts/lokalno (stack itself is not needed: no browser, no database).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('./lokalno/', import.meta.url));
const lokalno = mkdtempSync(join(tmpdir(), 'lokalno-'));
process.env.DUCTURA_LOKALNO = lokalno;

test('log never writes link tokens', async () => {
  const { log, OUT } = await import('./lokalno/tok-lib.mjs');
  log('GET /api/v1/x?token=1111111111111.izmisljeniToken-x&kind=package 200');
  log({ toString: () => 'href=/p?token=abc"' });
  const text = readFileSync(OUT, 'utf8');
  assert.doesNotMatch(text, /1111111111111|izmisljeniToken|abc/);
  assert.match(text, /token=…&kind=package/);
});

test('an unknown step exits 2 without loading the browser', () => {
  const r = spawnSync(process.execPath, [join(dir, 'tok-preglednik.mjs'), 'nema-takvog-koraka'], {
    env: { ...process.env, DUCTURA_LOKALNO: lokalno, TOK_WEB: join(lokalno, 'nema-weba') },
    encoding: 'utf8',
  });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stdout, /nepoznat korak nema-takvog-koraka; postoje: .*portfelj/);
});

test('known-failure patterns are valid and explained', () => {
  const known = JSON.parse(readFileSync(join(dir, 'poznati-padovi.json'), 'utf8'));
  assert.ok(known.length > 0);
  for (const k of known) {
    assert.doesNotThrow(() => new RegExp(k.uzorak));
    assert.ok(k.razlog.length > 10, k.uzorak);
  }
});

for (const tool of ['graditelj.py', 'ci.py']) test(`${tool} pure functions pass their self-test`, (t) => {
  const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
  const r = spawnSync(python, [join(dir, tool), 'samotest'], {
    env: { ...process.env, DUCTURA_LOKALNO: lokalno, PYTHONIOENCODING: 'utf-8' },
    encoding: 'utf8',
  });
  if (r.error?.code === 'ENOENT') return t.skip(`${python} not found`);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /samotest prolazi/);
});

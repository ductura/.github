import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { parseDocument } from "yaml";
import { extractRun } from "./extract-run.mjs";

const workflow = readFileSync(new URL("../.github/workflows/ci-ok.yml", import.meta.url), "utf8");
const script = extractRun(workflow, "ci-ok");

function run(results, allowSkipped = "") {
  const r = spawnSync("bash", ["-c", script], {
    env: { PATH: process.env.PATH, RESULTS: results, ALLOW_SKIPPED: allowSkipped },
    encoding: "utf8",
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

const needs = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { result: v, outputs: {} }])));

const cases = [
  ["all success", needs({ a: "success", b: "success" }), "", 0],
  ["one failure", needs({ a: "success", b: "failure" }), "", 1],
  ["cancelled", needs({ a: "cancelled" }), "", 1],
  ["unknown result", needs({ a: "neutral" }), "", 1],
  ["skipped without permission", needs({ a: "success", b: "skipped" }), "", 1],
  ["skipped with permission", needs({ a: "success", b: "skipped" }), "b", 0],
  ["allowed job that failed", needs({ b: "failure" }), "b", 1],
  ["allow list with newlines and spaces", needs({ a: "skipped", b: "skipped", c: "success" }), " a\n\tb \n", 0],
  ["allow list names a job not in needs", needs({ a: "success" }), "typo", 1],
  ["empty needs", "{}", "", 1],
  ["empty string", "", "", 1],
  ["invalid JSON", "{a:", "", 1],
  ["array instead of object", "[]", "", 1],
  ["null", "null", "", 1],
  ["job without result", JSON.stringify({ a: { outputs: {} } }), "", 1],
  ["job value is a string", JSON.stringify({ a: "success" }), "", 1],
  ["result is a number", JSON.stringify({ a: { result: 1 } }), "", 1],
  ["job name with a space and quote", needs({ 'we"ird name': "success" }), "", 0],
  ["failure with a space in the name", needs({ "x y": "failure" }), "", 1],
];

for (const [name, results, allow, code] of cases) {
  test(`ci-ok ${code === 0 ? "passes" : "fails"}: ${name}`, () => {
    const r = run(results, allow);
    assert.equal(r.code, code, r.out);
  });
}

test("names the failing job in an error annotation", () => {
  const r = run(needs({ good: "success", bad: "failure" }));
  assert.match(r.out, /::error::.*bad.*failure/);
  assert.doesNotMatch(r.out, /::error::.*good/);
});

// Workflows are read with a real YAML parser, so quoting, escapes, flow style
// and anchors cannot hide a job or a trigger (DAN-885).
const isMap = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

// Parses one workflow; fails on any YAML error, duplicate key or a document
// that is not a mapping.
function workflowOf(text) {
  const doc = parseDocument(text, { uniqueKeys: true, merge: true });
  assert.equal(doc.errors.length, 0, doc.errors.map((e) => e.message).join('; '));
  const value = doc.toJS({ maxAliasCount: 100 });
  assert.ok(isMap(value), 'workflow is a mapping');
  return value;
}

// Event names of a workflow. `on` may also arrive as the key "true" (YAML 1.1
// reads on as a boolean); exactly one of the two must be present.
function eventsOf(wf) {
  const keys = ['on', 'true'].filter((k) => Object.hasOwn(wf, k));
  assert.equal(keys.length, 1, 'workflow has exactly one on key');
  const on = wf[keys[0]];
  if (typeof on === 'string') return [on];
  if (Array.isArray(on)) {
    assert.ok(on.length > 0 && on.every((e) => typeof e === 'string'), 'on list holds event names');
    return on;
  }
  assert.ok(isMap(on) && Object.keys(on).length > 0, 'on is a name, a list or a mapping');
  return Object.keys(on);
}

// Jobs of a workflow as a name -> job mapping.
function jobsOf(wf) {
  assert.ok(isMap(wf.jobs) && Object.keys(wf.jobs).length > 0, 'workflow has jobs');
  for (const [name, job] of Object.entries(wf.jobs)) assert.ok(isMap(job), `job ${name} is a mapping`);
  return wf.jobs;
}

const needsOf = (job) => (typeof job.needs === 'string' ? [job.needs] : job.needs ?? []);

// Events another workflow may have: the engineering gate callers and events
// that never run on a pull request. Anything else (pull_request, push,
// merge_group, pull_request_review, ...) would run jobs ci-ok cannot see.
const ALLOWED = new Set(['workflow_call', 'workflow_dispatch', 'schedule', 'pull_request_target', 'issue_comment']);
const strayEvents = (text) => eventsOf(workflowOf(text)).filter((e) => !ALLOWED.has(e));

const dir = new URL("../.github/workflows/", import.meta.url);
const selfTest = workflowOf(readFileSync(new URL("self-test.yml", dir), "utf8"));
// The one job that is skipped on purpose: only red-aggregate may need it (DAN-971).
const SKIPPED = "node-skipped";
const allowSkipped = "${{ github.event_name != 'pull_request' && 'dependency-review' || '' }}";

// Workflows another PR could add: each must be refused by the trigger check.
const strays = [
  ['double-quoted on', '"on": pull_request\njobs: { x: { runs-on: u } }\n', ['pull_request']],
  ['single-quoted on with a list', "'on': [push]\njobs: { x: { runs-on: u } }\n", ['push']],
  ['escaped event name in a list', 'on: ["\\u0070ull_request"]\njobs: { x: { runs-on: u } }\n', ['pull_request']],
  ['escaped event name as a string', 'on: "pull\\u005frequest"\njobs: { x: { runs-on: u } }\n', ['pull_request']],
  ['true key (YAML 1.1 on)', 'true: push\njobs: { x: { runs-on: u } }\n', ['push']],
  ['mapping after jobs', 'jobs: { x: { runs-on: u } }\non:\n  merge_group: {}\n', ['merge_group']],
  ['review event', 'on: [pull_request_review]\njobs: { x: { runs-on: u } }\n', ['pull_request_review']],
  ['anchor and alias', 'x-ev: &ev pull_request\non: [*ev]\njobs: { x: { runs-on: u } }\n', ['pull_request']],
  ['gate callers stay allowed', 'on: [pull_request_target, issue_comment]\njobs: { x: { runs-on: u } }\n', []],
  ['reusable and scheduled stay allowed', 'on:\n  workflow_call: { inputs: {} }\n  schedule: [{ cron: "0 5 * * 1" }]\n  workflow_dispatch:\njobs: { x: { runs-on: u } }\n', []],
];
for (const [name, text, found] of strays) {
  test(`trigger check ${found.length ? 'refuses' : 'allows'}: ${name}`, () => {
    assert.deepEqual(strayEvents(text), found);
  });
}

const unreadable = [
  ['no on key', 'jobs: { x: { runs-on: u } }\n'],
  ['both on and true', 'on: push\ntrue: push\njobs: { x: { runs-on: u } }\n'],
  ['duplicate on key', 'on: workflow_call\non: push\njobs: { x: { runs-on: u } }\n'],
  ['on is a number', 'on: 1\njobs: { x: { runs-on: u } }\n'],
  ['on list with a mapping', 'on: [{ push: {} }]\njobs: { x: { runs-on: u } }\n'],
  ['empty on mapping', 'on: {}\njobs: { x: { runs-on: u } }\n'],
  ['invalid YAML', 'on: [push\njobs: {}\n'],
  ['document is a list', '- on: push\n'],
];
for (const [name, text] of unreadable) {
  test(`trigger check fails closed: ${name}`, () => {
    assert.throws(() => strayEvents(text));
  });
}

// Jobs that a line-based reader missed are plain jobs to the parser.
test('jobs are read in any YAML spelling', () => {
  const wf = workflowOf("on: push\njobs:\n  a: { runs-on: u }\n  'qa-extra':\n    runs-on: u\n  \"b\": { runs-on: u, needs: a }\n  c: &c { runs-on: u }\n  d: *c\n");
  assert.deepEqual(Object.keys(jobsOf(wf)), ['a', 'qa-extra', 'b', 'c', 'd']);
  assert.deepEqual(needsOf(jobsOf(wf).b), ['a']);
  const crlf = workflowOf('on: push\r\njobs: # all\r\n  a: # first\r\n    runs-on: u\r\n  b:\r\n    needs:\r\n      - a\r\n');
  assert.deepEqual(Object.keys(jobsOf(crlf)), ['a', 'b']);
  assert.deepEqual(needsOf(jobsOf(crlf).b), ['a']);
  assert.throws(() => jobsOf(workflowOf('on: push\njobs:\n  a: { runs-on: u }\n  a: { runs-on: v }\n')));
  assert.throws(() => jobsOf(workflowOf('on: push\njobs:\n\ta: { runs-on: u }\n')));
  assert.throws(() => jobsOf(workflowOf('on: push\njobs:\n  a: run\n')));
});

// The required status is the plain job ci-ok: a reusable workflow caller would
// show up as "ci-ok / ci-ok". It needs every other job, so a new job cannot be
// added without the aggregate seeing it, and runs the block that ci-ok.yml ships.
test("self-test ci-ok is a plain job named ci-ok over every other job", () => {
  const jobs = jobsOf(selfTest);
  const ok = jobs["ci-ok"];
  assert.ok(isMap(ok), "self-test has a ci-ok job");
  assert.equal(ok.name, "ci-ok");
  assert.ok(ok["runs-on"], "ci-ok runs on a runner");
  assert.equal(ok.uses, undefined, "ci-ok is not a reusable workflow call");
  assert.equal(ok.if, "${{ always() }}");
  assert.deepEqual([...needsOf(ok)].sort(), Object.keys(jobs).filter((j) => j !== "ci-ok" && j !== SKIPPED).sort());
  const step = ok.steps.find((s) => typeof s.run === "string" && s.run.includes("node scripts/extract-run.mjs .github/workflows/ci-ok.yml ci-ok"));
  assert.ok(step, "ci-ok runs the block that ci-ok.yml ships");
  assert.equal(step.env?.RESULTS, "${{ toJSON(needs) }}");
  // On pull requests nothing may be skipped; the empty branch must come last.
  assert.equal(step.env?.ALLOW_SKIPPED, allowSkipped);
});

// The reusable ci-ok.yml stays covered by a real call over the same jobs.
test("self-test ci-ok-reusable calls ci-ok.yml over every job but ci-ok", () => {
  const jobs = jobsOf(selfTest);
  const reusable = jobs["ci-ok-reusable"];
  assert.ok(isMap(reusable), "self-test has a ci-ok-reusable job");
  assert.equal(reusable.uses, "./.github/workflows/ci-ok.yml");
  assert.equal(reusable.if, "${{ always() }}");
  assert.deepEqual([...needsOf(reusable)].sort(), Object.keys(jobs).filter((j) => !j.startsWith("ci-ok") && j !== SKIPPED).sort());
  assert.equal(reusable.with?.results, "${{ toJSON(needs) }}");
  assert.equal(reusable.with?.["allow-skipped"], allowSkipped);
});

test("self-test.yml itself runs on pull requests", () => {
  assert.ok(eventsOf(selfTest).includes("pull_request"));
});

// needs cannot see another workflow, so self-test.yml is the only one that runs
// on a pull request, push or merge queue.
test("no other workflow runs jobs that ci-ok cannot see", () => {
  const others = readdirSync(dir).filter((f) => /\.ya?ml$/i.test(f) && f !== "self-test.yml");
  assert.ok(others.length > 0);
  for (const file of others) {
    assert.deepEqual(strayEvents(readFileSync(new URL(file, dir), "utf8")), [], file);
  }
});

// Jobs that pass expect-failure to a reusable workflow, as "file:job".
function expectFailureCallers(files) {
  return Object.entries(files).flatMap(([file, text]) =>
    Object.entries(jobsOf(workflowOf(text)))
      .filter(([, job]) => isMap(job.with) && Object.hasOwn(job.with, "expect-failure"))
      .map(([name]) => `${file}:${name}`));
}

const callerCases = [
  ["another workflow", { "a.yml": "on: push\njobs:\n  x: { uses: ./c.yml, with: { expect-failure: false } }\n" }, ["a.yml:x"]],
  ["quoted key", { "a.yml": 'on: push\njobs:\n  x: { uses: ./c.yml, with: { "expect-failure": true } }\n' }, ["a.yml:x"]],
  ["merge key", { "a.yml": "on: push\nw: &w { expect-failure: true }\njobs:\n  x: { uses: ./c.yml, with: { <<: *w } }\n" }, ["a.yml:x"]],
  ["NBSP in the key is another input", { "a.yml": "on: push\njobs:\n  x: { uses: ./c.yml, with: { expect-failure\u00a0: true } }\n" }, []],
  ["no with", { "a.yml": "on: push\njobs:\n  x: { uses: ./c.yml }\n" }, []],
];
for (const [name, files, found] of callerCases) {
  test(`expect-failure caller check: ${name}`, () => assert.deepEqual(expectFailureCallers(files), found));
}

// expect-failure exists only for the self-test; no real caller may set it.
test("only self-test.yml node-fail sets expect-failure", () => {
  const files = Object.fromEntries(readdirSync(dir).filter((f) => /\.ya?ml$/i.test(f)).map((f) => [f, readFileSync(new URL(f, dir), "utf8")]));
  assert.deepEqual(expectFailureCallers(files), ["self-test.yml:node-fail"]);
});

test("self-test runs ci-ok over a failed fixture and a skipped job", () => {
  const jobs = jobsOf(selfTest);
  assert.deepEqual(jobs["node-fail"].with, { "working-directory": "fixtures/node-fail", scripts: "test", "expect-failure": true });
  assert.equal(jobs["node-fail"].uses, "./.github/workflows/ci-node.yml");
  // A plain false: zizmor reads `${{ false }}` as obfuscation (DAN-1078).
  assert.equal(jobs[SKIPPED].if, false);
  const red = jobs["red-aggregate"];
  assert.deepEqual(needsOf(red), ["node-fail", SKIPPED]);
  assert.equal(red.if, "${{ always() }}");
  assert.deepEqual(Object.keys(jobs).filter((j) => needsOf(jobs[j]).includes(SKIPPED)), ["red-aggregate"]);
  for (const j of ["ci-ok", "ci-ok-reusable"]) assert.ok(needsOf(jobs[j]).includes("red-aggregate"), j);
  const step = red.steps.find((s) => typeof s.run === "string" && s.run.includes("# red-aggregate:begin"));
  assert.ok(step, "red-aggregate runs its tested block");
  assert.doesNotMatch(step.run, /\$\{\{/, "values reach the block only through env");
  assert.match(step.run, /extract-run\.mjs \.github\/workflows\/ci-ok\.yml ci-ok/);
  assert.deepEqual(step.env, { RESULTS: "${{ toJSON(needs) }}", SCRIPTS_RESULT: "${{ needs.node-fail.outputs.scripts-result }}" });
});

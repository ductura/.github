// ISTR-3: scorecard.yml is a reusable OpenSSF Scorecard that keeps its results
// in the caller's Code scanning. It must never publish to OpenSSF
// (publish_results false), asks for the least permissions, runs weekly and
// stays outside ci-ok. The workflow is read with a real YAML parser; the
// mutated copies below show that each rule refuses what it should.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDocument } from "yaml";

const dir = new URL("../.github/workflows/", import.meta.url);
const workflow = readFileSync(new URL("scorecard.yml", dir), "utf8");

const SHA_REF = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/;
const SCORECARD = /^ossf\/scorecard-action@/i;
const UPLOAD = /^github\/codeql-action\/upload-sarif@/i;
const CHECKOUT = /^actions\/checkout@/i;
const PERMISSIONS = { "security-events": "write", contents: "read", actions: "read" };

const isMap = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
// GitHub reads input names in any case (INPUT_<NAME>), so every spelling counts.
const keysLike = (node, name) => (isMap(node) ? Object.keys(node).filter((k) => k.toLowerCase() === name) : []);

function parse(text) {
  const doc = parseDocument(text, { uniqueKeys: true, merge: false });
  if (doc.errors.length > 0) throw new Error(doc.errors.map((e) => e.code).join(", "));
  return doc.toJS({ maxAliasCount: 100 });
}

// Problems with the one Scorecard step: publishing must be the literal false.
export function publishProblems(text) {
  const wf = parse(text);
  const steps = Object.values(wf.jobs ?? {}).flatMap((job) => (Array.isArray(job.steps) ? job.steps : []));
  const scorecard = steps.filter((s) => typeof s.uses === "string" && SCORECARD.test(s.uses));
  if (scorecard.length !== 1) return [`expected one scorecard step, found ${scorecard.length}`];
  const [step] = scorecard;
  const problems = [];
  const keys = keysLike(step.with, "publish_results");
  if (keys.length !== 1) problems.push(`publish_results given ${keys.length} times`);
  else if (step.with[keys[0]] !== false) problems.push(`publish_results is ${JSON.stringify(step.with[keys[0]])}`);
  for (const where of [wf, ...Object.values(wf.jobs), step]) {
    for (const key of keysLike(where, "env")) {
      for (const name of Object.keys(where[key] ?? {})) {
        if (/^input_/i.test(name)) problems.push(`env ${name} can set an input`);
      }
    }
  }
  for (const name of ["internal_publish_base_url", "fail_on_publish_error", "repo_token", "internal_default_token"]) {
    if (keysLike(step.with, name).length > 0) problems.push(`${name} is set`);
  }
  return problems;
}

test("the Scorecard step never publishes to OpenSSF", () => {
  assert.deepEqual(publishProblems(workflow), []);
});

const base = (withBlock, extra = "") =>
  `on: workflow_call\njobs:\n  s:\n    runs-on: u\n${extra}    steps:\n      - uses: ossf/scorecard-action@${"a".repeat(40)}\n        with:\n${withBlock}`;
const refused = [
  ["publish_results: true", base("          publish_results: true\n"), /publish_results is true/],
  ['publish_results: "true"', base('          publish_results: "true"\n'), /publish_results is "true"/],
  ['publish_results: "false" (a string, not the literal)', base('          publish_results: "false"\n'), /publish_results is "false"/],
  ["publish_results from an expression", base("          publish_results: ${{ inputs.publish }}\n"), /publish_results is "\$\{\{ inputs\.publish \}\}"/],
  ["publish_results left to the default", base("          results_format: sarif\n"), /publish_results given 0 times/],
  ["a second spelling of the input", base("          publish_results: false\n          Publish_Results: true\n"), /publish_results given 2 times/],
  ["env sets the input", base("          publish_results: false\n", "    env: { INPUT_PUBLISH_RESULTS: 'true' }\n"), /env INPUT_PUBLISH_RESULTS/],
  ["another publish URL", base("          publish_results: false\n          internal_publish_base_url: https://example.invalid\n"), /internal_publish_base_url is set/],
  ["a token other than the job's own", base("          publish_results: false\n          repo_token: x\n"), /repo_token is set/],
  ["no Scorecard step", "on: workflow_call\njobs:\n  s:\n    runs-on: u\n    steps: [{ run: 'true' }]\n", /found 0/],
];
for (const [name, text, message] of refused) {
  test(`publish check refuses: ${name}`, () => {
    const problems = publishProblems(text);
    assert.ok(problems.some((p) => message.test(p)), JSON.stringify(problems));
  });
}

const wf = parse(workflow);
const jobs = Object.entries(wf.jobs);
const steps = jobs.flatMap(([, job]) => job.steps);

test("runs weekly, by hand or from a caller; never on pull requests or pushes", () => {
  assert.deepEqual(Object.keys(wf.on).sort(), ["schedule", "workflow_call", "workflow_dispatch"]);
  assert.equal(wf.on.schedule.length, 1);
  const fields = wf.on.schedule[0].cron.trim().split(/\s+/);
  assert.equal(fields.length, 5);
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  assert.match(minute, /^\d+$/);
  assert.match(hour, /^\d+$/);
  assert.deepEqual([dayOfMonth, month], ["*", "*"]);
  assert.match(dayOfWeek, /^[0-6]$/, "once a week");
});

test("least permissions: nothing for the file, three scopes for the one job", () => {
  assert.deepEqual(wf.permissions, {});
  assert.equal(jobs.length, 1);
  assert.deepEqual(jobs[0][1].permissions, PERMISSIONS);
});

test("only checkout, Scorecard and the SARIF upload, each pinned to a full SHA", () => {
  assert.deepEqual(steps.map((s) => s.uses.split("@")[0]), ["actions/checkout", "ossf/scorecard-action", "github/codeql-action/upload-sarif"]);
  for (const step of steps) assert.match(step.uses, SHA_REF);
  for (const step of steps) assert.equal(step.run, undefined);
  assert.equal(steps.find((s) => CHECKOUT.test(s.uses)).with["persist-credentials"], false);
});

test("the SARIF Scorecard writes is the file uploaded to Code scanning", () => {
  const scorecard = steps.find((s) => SCORECARD.test(s.uses));
  const upload = steps.find((s) => UPLOAD.test(s.uses));
  assert.equal(scorecard.with.results_format, "sarif");
  assert.equal(upload.with.sarif_file, scorecard.with.results_file);
});

test("no secrets, no expressions and no ignored failures", () => {
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /\$\{\{/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test("stays outside ci-ok: neither self-test.yml nor ci-ok.yml runs or needs it", () => {
  for (const file of ["self-test.yml", "ci-ok.yml"]) {
    assert.doesNotMatch(readFileSync(new URL(file, dir), "utf8"), /scorecard/i, file);
  }
});

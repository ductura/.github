import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
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

// Job blocks of a workflow: keys indented by exactly two spaces under `jobs:`.
function jobBlocks(text) {
  const lines = text.split(/\r\n|\r|\n/).map((l) => l.replace(/\s+#.*$/, ""));
  const start = lines.indexOf("jobs:");
  assert.ok(start >= 0, "workflow has jobs:");
  const blocks = new Map();
  let name;
  for (const line of lines.slice(start + 1)) {
    const key = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line)?.[1];
    if (key) blocks.set((name = key), []);
    else if (/^\S/.test(line)) break;
    else if (name) blocks.get(name).push(line);
  }
  return new Map([...blocks].map(([k, v]) => [k, v.join("\n")]));
}

// `needs: [a, b]` on one line or `needs:` followed by `- a` lines.
function needsOf(block) {
  const inline = /^    needs:\s*\[([^\]]*)\]/m.exec(block);
  if (inline) return inline[1].split(",").map((s) => s.trim()).filter(Boolean);
  const list = /^    needs:\s*\n((?:      - .*\n?)+)/m.exec(block);
  return list ? list[1].split("\n").map((l) => l.replace(/^\s*- /, "").trim()).filter(Boolean) : [];
}

const selfTest = readFileSync(new URL("../.github/workflows/self-test.yml", import.meta.url), "utf8");
const allowSkipped = "${{ github.event_name != 'pull_request' && 'dependency-review' || '' }}";

test("job parser reads CRLF, comments and multi-line needs", () => {
  const jobs = jobBlocks("on: push\r\njobs:\r\n  a: # first\r\n    runs-on: x\r\n  b:\r\n    needs:\r\n      - a\r\n      - c\r\n  c:\r\n    needs: [ a , b ]\r\n");
  assert.deepEqual([...jobs.keys()], ["a", "b", "c"]);
  assert.deepEqual(needsOf(jobs.get("b")), ["a", "c"]);
  assert.deepEqual(needsOf(jobs.get("c")), ["a", "b"]);
  assert.deepEqual(needsOf(jobs.get("a")), []);
});

// The required status is the plain job ci-ok: a reusable workflow caller would
// show up as "ci-ok / ci-ok". It needs every other job, so a new job cannot be
// added without the aggregate seeing it, and runs the block that ci-ok.yml ships.
test("self-test ci-ok is a plain job named ci-ok over every other job", () => {
  const jobs = jobBlocks(selfTest);
  const ok = jobs.get("ci-ok");
  assert.ok(ok, "self-test has a ci-ok job");
  assert.match(ok, /^    name: ci-ok$/m);
  assert.match(ok, /^    runs-on: /m);
  assert.doesNotMatch(ok, /^    uses: /m);
  assert.match(ok, /^    if: \$\{\{ always\(\) \}\}$/m);
  assert.deepEqual(needsOf(ok).sort(), [...jobs.keys()].filter((j) => j !== "ci-ok").sort());
  assert.match(ok, /node scripts\/extract-run\.mjs \.github\/workflows\/ci-ok\.yml ci-ok/);
  assert.match(ok, /RESULTS: \$\{\{ toJSON\(needs\) \}\}/);
  // On pull requests nothing may be skipped; the empty branch must come last.
  assert.ok(ok.includes(`ALLOW_SKIPPED: ${allowSkipped}`));
});

// The reusable ci-ok.yml stays covered by a real call over the same jobs.
test("self-test ci-ok-reusable calls ci-ok.yml over every job but ci-ok", () => {
  const jobs = jobBlocks(selfTest);
  const reusable = jobs.get("ci-ok-reusable");
  assert.ok(reusable, "self-test has a ci-ok-reusable job");
  assert.match(reusable, /^    uses: \.\/\.github\/workflows\/ci-ok\.yml$/m);
  assert.match(reusable, /^    if: \$\{\{ always\(\) \}\}$/m);
  assert.deepEqual(needsOf(reusable).sort(), [...jobs.keys()].filter((j) => !j.startsWith("ci-ok")).sort());
  assert.ok(reusable.includes(`allow-skipped: ${allowSkipped}`));
});

// needs cannot see another workflow, so self-test.yml is the only one that runs
// on pull_request, push or merge_group. Gate callers (pull_request_target,
// issue_comment), workflow_call, schedule and workflow_dispatch are allowed.
test("no other workflow runs on pull_request, push or merge_group", () => {
  const dir = new URL("../.github/workflows/", import.meta.url);
  const others = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f) && f !== "self-test.yml");
  assert.ok(others.length > 0);
  for (const file of others) {
    const text = readFileSync(new URL(file, dir), "utf8");
    const on = /^on:([\s\S]*?)^(?=\S)/m.exec(text + "\nend:")?.[1] ?? "";
    assert.doesNotMatch(on, /\b(pull_request|push|merge_group)\b(?!_)/, file);
  }
});

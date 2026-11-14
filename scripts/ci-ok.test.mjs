import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

// Every job of self-test.yml must be in the needs of its ci-ok job, so a new
// job cannot be added without the aggregate seeing it.
test("self-test ci-ok needs every other job", () => {
  const text = readFileSync(new URL("../.github/workflows/self-test.yml", import.meta.url), "utf8");
  const body = text.split(/\r?\n/);
  const start = body.indexOf("jobs:");
  const jobs = body.slice(start + 1).map((l) => /^  ([A-Za-z0-9_-]+):/.exec(l)?.[1]).filter(Boolean);
  assert.ok(jobs.includes("ci-ok"), "self-test has a ci-ok job");
  const okStart = body.indexOf("  ci-ok:");
  const okEnd = body.findIndex((l, i) => i > okStart && /^  [A-Za-z0-9_-]+:/.test(l));
  const okBlock = body.slice(okStart, okEnd === -1 ? undefined : okEnd).join("\n");
  const listed = /needs:\s*\[([^\]]*)\]/.exec(okBlock)?.[1].split(",").map((s) => s.trim()) ?? [];
  assert.deepEqual([...listed].sort(), jobs.filter((j) => j !== "ci-ok").sort());
  assert.match(okBlock, /if:\s*\$\{\{\s*always\(\)\s*\}\}/);
});

// Static guards of the reusable mutate.yml (DAN-1090). The mutation run itself
// is tested in scripts/mutate (`npm test` there); this file only reads YAML.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

const text = readFileSync(new URL("../.github/workflows/mutate.yml", import.meta.url), "utf8");
const wf = parse(text);
const job = wf.jobs.mutate;

test("mutate.yml is only a reusable workflow: never a status of a pull request or push", () => {
  assert.deepEqual(Object.keys(wf.on), ["workflow_call"]);
  assert.deepEqual(Object.keys(wf.jobs), ["mutate"]);
});

test("mutate.yml reads only: contents: read on the file and on the job", () => {
  assert.deepEqual(wf.permissions, { contents: "read" });
  assert.deepEqual(job.permissions, { contents: "read" });
});

test("no input reaches a shell through an expression; inputs go through env", () => {
  for (const step of job.steps.filter((s) => typeof s.run === "string")) {
    assert.doesNotMatch(step.run, /\$\{\{/, step.name);
  }
});

test("the tool is this repository at tool-sha, never the caller's code", () => {
  const tool = job.steps.find((s) => s.with?.path === "tool");
  assert.equal(tool.with.repository, "ductura/.github");
  assert.equal(tool.with.ref, "${{ inputs.tool-sha }}");
  assert.equal(tool.with["persist-credentials"], false);
  const install = job.steps.find((s) => s["working-directory"] === "tool/scripts/mutate");
  assert.match(install.run, /^npm ci --ignore-scripts\b/);
  assert.match(job.steps.at(-1).run, /node tool\/scripts\/mutate\/mutate\.mjs /);
});

test("no debug logging (stryker-js#6272) and no cache that a run could poison", () => {
  assert.doesNotMatch(text, /logLevel|debug/i);
  for (const step of job.steps) assert.equal(step.with?.cache, undefined, step.uses);
});

test("every checkout drops its credentials", () => {
  const checkouts = job.steps.filter((s) => s.uses?.startsWith("actions/checkout@"));
  assert.equal(checkouts.length, 2);
  for (const c of checkouts) assert.equal(c.with["persist-credentials"], false);
});

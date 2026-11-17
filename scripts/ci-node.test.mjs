import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractRun } from "./extract-run.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const scriptsBlock = extractRun(read("../.github/workflows/ci-node.yml"), "ci-node-scripts");
const redBlock = extractRun(read("../.github/workflows/self-test.yml"), "red-aggregate");
const root = new URL("..", import.meta.url).pathname;

// Runs a block with a fake pnpm whose `run <name>` fails for names in FAIL.
function runBlock(block, env) {
  const dir = mkdtempSync(join(tmpdir(), "ci-node-"));
  try {
    const pnpm = join(dir, "pnpm");
    writeFileSync(pnpm, '#!/bin/sh\necho "ran $2" >> "$LOG"\ncase " $FAIL " in *" $2 "*) exit 1;; esac\n');
    chmodSync(pnpm, 0o755);
    const files = { LOG: join(dir, "log"), GITHUB_OUTPUT: join(dir, "out") };
    for (const f of Object.values(files)) writeFileSync(f, "");
    const r = spawnSync("bash", ["-c", block], {
      cwd: root,
      env: { PATH: `${dir}:${process.env.PATH}`, RUNNER_TEMP: dir, FAIL: "", ...files, ...env },
      encoding: "utf8",
    });
    return { code: r.status, out: r.stdout + r.stderr, ran: readFileSync(files.LOG, "utf8"), output: readFileSync(files.GITHUB_OUTPUT, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const scripts = (SCRIPTS, EXPECT_FAILURE, FAIL = "") => runBlock(scriptsBlock, { SCRIPTS, EXPECT_FAILURE, FAIL });

// expect-failure must never turn a passing or empty run green (DAN-971).
test("expect-failure fails when every script passed", () => {
  const r = scripts("typecheck test", "true");
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /::error::expect-failure is set, but every script passed/);
  assert.equal(r.output, "scripts-result=success\n");
});
test("expect-failure does not excuse an empty scripts input", () => {
  for (const s of ["", " \n\t\r\n"]) assert.equal(scripts(s, "true").code, 1);
});
for (const value of ["TRUE", " true", "true\r", "1", "yes", "", "false"]) {
  test(`only the exact string true expects failure: ${JSON.stringify(value)}`, () => {
    const r = scripts("typecheck test", value, "typecheck");
    assert.equal(r.code, 1, r.out);
    assert.equal(r.ran, "ran typecheck\n", "stops at the first failed script");
    assert.equal(r.output, "scripts-result=failure\n");
  });
}
test("expect-failure passes when a script failed", () => {
  const r = scripts("typecheck test", "true", "test");
  assert.equal(r.code, 0, r.out);
  assert.equal(r.output, "scripts-result=failure\n");
  assert.doesNotMatch(r.out, /::error::/);
});
test("without expect-failure every script runs and passes", () => {
  for (const list of ["typecheck test", "typecheck\ntest\n", "typecheck\r\ntest\r\n", "\ttypecheck\ttest"]) {
    const r = scripts(list, "false");
    assert.equal(r.code, 0, r.out);
    assert.equal(r.ran, "ran typecheck\nran test\n", JSON.stringify(list));
    assert.equal(r.output, "scripts-result=success\n");
  }
});

// red-aggregate in self-test.yml: green only when ci-ok is red for the right reason.
const needs = (nodeFail, skipped = "skipped") =>
  JSON.stringify({ "node-fail": { result: nodeFail, outputs: {} }, "node-skipped": { result: skipped, outputs: {} } });
const red = (RESULTS, SCRIPTS_RESULT) => runBlock(redBlock, { RESULTS, SCRIPTS_RESULT });
const redCases = [
  ["the fixture passed", needs("success"), "success"],
  ["no scripts-result", needs("success"), ""],
  ["node-fail itself failed", needs("failure"), "failure"],
  ["node-fail was skipped", needs("skipped"), "failure"],
  ["node-skipped ran", needs("success", "success"), "failure"],
  ["node-skipped missing", JSON.stringify({ "node-fail": { result: "success" } }), "failure"],
];
for (const [name, results, outcome] of redCases) {
  test(`red-aggregate fails: ${name}`, () => assert.equal(red(results, outcome).code, 1));
}
test("red-aggregate passes when ci-ok is red over the failed test and the skipped job", () => {
  const r = red(needs("success"), "failure");
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /ci-ok is red over node-fail result: failure/);
  assert.match(r.out, /ci-ok is red over node-skipped result: skipped/);
  assert.doesNotMatch(r.out, /^::error::/m, "expected errors must not become annotations");
});

// The fixture must fail in its test, not for a missing script or a broken file.
test("fixtures/node-fail fails in its test", () => {
  const dir = join(root, "fixtures/node-fail");
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.packageManager, "pnpm@10.33.0");
  assert.deepEqual(pkg.scripts, { test: "node --test fail.test.mjs" });
  assert.ok(existsSync(join(dir, "fail.test.mjs")));
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "fail.test.mjs"], { cwd: dir, env: { PATH: process.env.PATH }, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /^not ok 1 - fails on purpose/m);
  assert.match(r.stdout, /node-fail fixture: this assertion fails on purpose/);
});

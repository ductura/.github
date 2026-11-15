// The self-test harness and the input guard of engineering-gate.yml, run with
// the same cases and inputs as the self-test.yml matrix. Invented data only.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { extractRun } from "../extract-run.mjs";
import { compare, type Fixture, runFixture } from "./self-test.ts";

const root = new URL("../../", import.meta.url);
const fixtureDir = new URL("fixtures/gate/", root);
const read = (url: URL) => readFileSync(url, "utf8");
const fixture = (name: string) => JSON.parse(read(new URL(`${name}.json`, fixtureDir))) as Fixture;

/** The engineering-gate matrix of self-test.yml: case → inputs, defaults as in its `with:`. */
function matrix(): Map<string, NodeJS.ProcessEnv> {
  const job = /\n {2}engineering-gate:\n([\s\S]*?)\n\n/.exec(
    read(new URL(".github/workflows/self-test.yml", root)),
  )?.[1];
  assert.ok(job, "engineering-gate job in self-test.yml");
  const cases = new Map<string, Record<string, string>>();
  for (const name of /case: \[([^\]]+)\]/.exec(job)?.[1]?.split(",") ?? []) cases.set(name.trim(), {});
  for (const [, body] of job.matchAll(/- \{ (case: [^}]+) \}/g)) {
    const fields = Object.fromEntries((body ?? "").split(", ").map((pair) => pair.split(": ") as [string, string]));
    cases.set(fields.case ?? "", fields);
  }
  return new Map(
    [...cases].map(([name, f]) => [
      name,
      {
        GATE_OWNER_LOGIN: "owner-x",
        GATE_MINIMUM_RISK: f.risk ?? "standard",
        GATE_FLOOR_SHA: f.floor ?? "c".repeat(40),
        GATE_TRUSTED_LOGINS: f.trusted ?? "",
      },
    ]),
  );
}

test("the matrix runs every fixture and only fixtures", () => {
  const files = readdirSync(fixtureDir).map((f) => f.replace(/\.json$/, ""));
  assert.deepEqual([...matrix().keys()].sort(), files.sort());
  assert.equal(files.length, 12);
});

for (const [name, env] of matrix()) {
  test(`fixture ${name} gives the expected exit and statuses`, async () => {
    const f = fixture(name);
    assert.deepEqual(compare(f, await runFixture(f, env)), []);
    if (!name.startsWith("pass-")) assert.ok(f.expect.statuses.every((s) => s.state !== "success"));
  });
}

test("the harness fails when the runner does something else", async () => {
  const f = fixture("pass-standard");
  const env = matrix().get("pass-standard");
  const wrong: Fixture = { ...f, expect: { exit: 0, statuses: [f.expect.statuses[0]!] } };
  assert.match(compare(wrong, await runFixture(wrong, env)).join("\n"), /^statuses /);
  // Another floor input turns the same fixture into pending, so inputs reach the runner.
  const stale = { ...env, GATE_FLOOR_SHA: "b".repeat(40) };
  assert.notDeepEqual(compare(f, await runFixture(f, stale)), []);
});

const guard = extractRun(read(new URL(".github/workflows/engineering-gate.yml", root)), "gate-inputs");
const runGuard = (env: Record<string, string>) =>
  spawnSync("bash", ["-euo", "pipefail", "-c", guard], { env: { PATH: process.env.PATH, ...env }, encoding: "utf8" });
const sha = "a".repeat(40);

for (const [label, env, error] of [
  ["a short gate-sha", { GATE_SHA: "abc1234", SELF_TEST: "", REPOSITORY: "ductura/.github" }, /full 40-character/],
  ["a branch as gate-sha", { GATE_SHA: "main", SELF_TEST: "", REPOSITORY: "acme/app" }, /full 40-character/],
  ["an upper-case gate-sha", { GATE_SHA: sha.toUpperCase(), SELF_TEST: "", REPOSITORY: "acme/app" }, /40-character/],
  ["self-test in another repo", { GATE_SHA: sha, SELF_TEST: "pass-standard", REPOSITORY: "acme/app" }, /only in/],
  ["a path as self-test", { GATE_SHA: sha, SELF_TEST: "../x", REPOSITORY: "ductura/.github" }, /name a case/],
] as const) {
  test(`the input guard rejects ${label}`, () => {
    const result = runGuard(env);
    assert.equal(result.status, 1);
    assert.match(result.stdout, error);
  });
}

test("the input guard accepts a caller and the self-test here", () => {
  assert.equal(runGuard({ GATE_SHA: sha, SELF_TEST: "", REPOSITORY: "acme/app" }).status, 0);
  assert.equal(runGuard({ GATE_SHA: sha, SELF_TEST: "pass-standard", REPOSITORY: "ductura/.github" }).status, 0);
});

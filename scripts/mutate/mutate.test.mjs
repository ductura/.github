// Tests of the mutate command (DAN-1090): `npm test` in scripts/mutate.
// The two acceptance fixtures run real Stryker over real Vitest.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { UsageError, checkBase, describe, globLiteral, parseArgs, selectFiles, strykerOptions, survivors } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "mutate.mjs");

function run(args, env = {}) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env: { ...process.env, MUTATE_FILES: "", ...env } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

// A copy of a fixture next to the tool, so its tests still resolve vitest.
function copyOf(fixture) {
  const dir = mkdtempSync(path.join(here, ".tmp-"));
  cpSync(path.join(here, "fixtures", fixture), dir, { recursive: true });
  return dir;
}

test("acceptance: a weak test leaves surviving mutants and the exit code is not 0", () => {
  const r = run(["--project", path.join(here, "fixtures/weak"), "src/adult.ts"]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /::error::surviving mutant src\/adult\.ts:3:\d+ Survived /);
  assert.match(r.out, /mutate: 5 mutant\(s\), [1-9] surviving/);
});

test("acceptance: a test with the boundary and a negative case kills every mutant, exit 0", () => {
  const r = run(["--project", path.join(here, "fixtures/strong"), "src/adult.ts"]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /mutate: 5 mutant\(s\), 0 surviving/);
  assert.doesNotMatch(r.out, /surviving mutant/);
});

// As in mutate.yml: the project and the tool side by side, the project with
// its own node_modules (here a link to the tool's, for its vitest).
test("a project outside the tool directory uses its own vitest", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mutate-project-"));
  try {
    cpSync(path.join(here, "fixtures/weak"), dir, { recursive: true });
    symlinkSync(path.join(here, "node_modules"), path.join(dir, "node_modules"), "dir");
    const r = run(["--project", dir, "src/adult.ts"]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /::error::surviving mutant src\/adult\.ts:3:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Codex review on #110: Stryker reads mutate as globs; [id] is a literal name.
test("a file name with glob characters is mutated as that exact file", () => {
  const dir = copyOf("weak");
  try {
    renameSync(path.join(dir, "src/adult.ts"), path.join(dir, "src/[id].ts"));
    writeFileSync(path.join(dir, "src/i.ts"), "export const i = 1 + 1;\n");
    const testFile = path.join(dir, "src/adult.test.ts");
    writeFileSync(testFile, readFileSync(testFile, "utf8").replace("./adult.ts", "./[id].ts"));
    const r = run(["--project", dir, "src/[id].ts"]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /mutate: 5 mutant\(s\), [1-9] surviving/);
    assert.match(r.out, /::error::surviving mutant src\/\[id\]\.ts:3:/);
    assert.doesNotMatch(r.out, /src\/i\.ts:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--base mutates only the sources changed since the base", () => {
  const dir = copyOf("weak");
  try {
    const git = (...a) => execFileSync("git", ["-C", dir, "-c", "user.name=CI", "-c", "user.email=ci@example.invalid", ...a], { encoding: "utf8" });
    git("init", "-q");
    git("add", "package.json");
    git("commit", "-qm", "base");
    const base = git("rev-parse", "HEAD").trim();
    git("add", "src/adult.test.ts");
    git("commit", "-qm", "test only");
    const testOnly = run(["--project", dir, "--base", base]);
    assert.equal(testOnly.code, 0, testOnly.out);
    assert.match(testOnly.out, /no changed source files/);
    git("add", "src/adult.ts");
    git("commit", "-qm", "source");
    const r = run(["--project", dir, "--base", base]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /mutate: 1 file\(s\)\n {2}src\/adult\.ts\n/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a stryker config in the project is never read", () => {
  const dir = copyOf("strong");
  try {
    // Invalid for Stryker's schema: read, it would fail the run.
    writeFileSync(path.join(dir, "stryker.config.json"), '{ "timeoutMS": "never", "logLevel": "debug" }\n');
    const r = run(["--project", dir], { MUTATE_FILES: "src/adult.ts" });
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /DEBUG/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a failing initial test run is an error (2), never a pass", () => {
  const dir = copyOf("strong");
  try {
    writeFileSync(path.join(dir, "src/adult.test.ts"), 'import { expect, test } from "vitest";\ntest("red", () => expect(1).toBe(2));\n');
    const r = run(["--project", dir, "src/adult.ts"]);
    assert.equal(r.code, 2, r.out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bad input exits 2 without running Stryker", () => {
  const strong = path.join(here, "fixtures/strong");
  for (const [args, msg] of [
    [["--project", strong, "../x.ts"], /path leaves the project/],
    [["--project", strong, "/etc/x.ts"], /relative to the project/],
    [["--project", strong, "src/missing.ts"], /no such file/],
    [["--project", strong, "--base", "--output=/tmp/x"], /not a git ref/],
    [["--project", strong, "--base", "a..b"], /not a git ref/],
    [["--project", strong, "--logLevel", "debug"], /unknown option: --logLevel/],
    [["--project", strong, "--concurrency", "0", "src/adult.ts"], /concurrency must be/],
    [["--project", path.join(strong, "nope")], /not a directory/],
    [["--project"], /needs a value/],
  ]) {
    const r = run(args);
    assert.equal(r.code, 2, `${args.join(" ")}\n${r.out}`);
    assert.match(r.out, msg);
    assert.doesNotMatch(r.out, /Instrumenter/);
  }
});

test("nothing to mutate is a pass with a message", () => {
  const r = run(["--project", path.join(here, "fixtures/strong"), "src/adult.test.ts", "README.md"]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /no changed source files/);
});

test("selectFiles keeps JS/TS sources and drops tests and declarations", () => {
  assert.deepEqual(
    selectFiles(["src/a.ts", "./src/a.ts", "b.mjs", "c.tsx", "d.cts", "a.test.ts", "x/e.spec.tsx", "__tests__/f.ts", "g.d.ts", "h.d.mts", "README.md", "node_modules/x/i.js", "j.json"]),
    ["b.mjs", "c.tsx", "d.cts", "src/a.ts"],
  );
  assert.throws(() => selectFiles(["src/../../x.ts"]), UsageError);
  assert.throws(() => selectFiles(["C:/x.ts"]), UsageError);
});

test("globLiteral makes every glob character literal and refuses braces", () => {
  assert.equal(globLiteral("src/a-b_c.d.ts"), "src/a-b_c.d.ts");
  assert.equal(globLiteral("app/(group)/[id]/*?.tsx"), "app/[(]group[)]/[[]id[]]/[*][?].tsx");
  assert.equal(globLiteral("!x.ts"), "./!x.ts");
  assert.throws(() => globLiteral("src/{a,b}.ts"), UsageError);
});

// The escaped patterns go through the same minimatch Stryker uses.
test("an escaped path matches only itself in Stryker's matcher", async () => {
  const { minimatch } = await import("minimatch");
  const files = ["/p/[id].ts", "/p/i.ts", "/p/d.ts", "/p/(g)/a.ts", "/p/g/a.ts", "/p/a*b?.ts", "/p/axb1.ts", "/p/+(x).ts", "/p/x.ts", "/p/@(y)!.ts", "/p/y.ts"];
  for (const file of ["/p/[id].ts", "/p/(g)/a.ts", "/p/a*b?.ts", "/p/+(x).ts", "/p/@(y)!.ts"]) {
    assert.deepEqual(files.filter((f) => minimatch(f, globLiteral(file))), [file], file);
  }
});

test("checkBase accepts refs and SHAs only", () => {
  for (const ok of ["main", "origin/main", "0123456789abcdef0123456789abcdef01234567", "v1.2.3"]) assert.equal(checkBase(ok), ok);
  for (const bad of ["-x", "--output=f", "a..b", "a b", "", "@{-1}", "HEAD~1"]) assert.throws(() => checkBase(bad), UsageError, bad);
});

test("Stryker options: vitest runner, no bail, never debug logging, the given files only", () => {
  const o = strykerOptions({ files: ["src/a.ts"], configFile: "/tmp/c.json" });
  assert.equal(o.testRunner, "vitest");
  assert.equal(o.disableBail, true);
  assert.equal(o.logLevel, "info");
  assert.equal(o.fileLogLevel, "off");
  assert.deepEqual(o.mutate, ["src/a.ts"]);
  assert.deepEqual(strykerOptions({ files: ["app/[id]/page.tsx"], configFile: "c" }).mutate, ["app/[[]id[]]/page.tsx"]);
  assert.equal(o.configFile, "/tmp/c.json");
  assert.equal(o.thresholds.break, null);
  assert.deepEqual(o.ignorePatterns, [".stryker-tmp"]);
  assert.equal("concurrency" in o, false);
  assert.equal(strykerOptions({ files: ["a.ts"], configFile: "c", concurrency: "2" }).concurrency, 2);
  assert.deepEqual(strykerOptions({ files: ["a.ts"], configFile: "c", vitestConfig: "vitest.unit.config.ts" }).vitest, { configFile: "vitest.unit.config.ts" });
  assert.throws(() => strykerOptions({ files: [], configFile: "c" }), UsageError);
});

test("Survived and NoCoverage count as surviving; killed, timeout and errors do not", () => {
  const statuses = ["Killed", "Survived", "NoCoverage", "Timeout", "CompileError", "RuntimeError", "Ignored", "Pending"];
  const results = statuses.map((status) => ({ status }));
  assert.deepEqual(survivors(results).map((r) => r.status), ["Survived", "NoCoverage"]);
});

test("describe prints file:line:column, status, mutator and the replacement", () => {
  const r = { fileName: "/p/src/a.ts", status: "Survived", mutatorName: "EqualityOperator", replacement: "age >\n 18", location: { start: { line: 3, column: 10 }, end: { line: 3, column: 19 } } };
  assert.equal(describe(r, "/p"), "src/a.ts:3:11 Survived EqualityOperator: age > 18");
});

test("parseArgs takes the files and the options", () => {
  assert.deepEqual(parseArgs(["--project", "srv", "--base", "origin/main", "--vitest-config", "./v.ts", "a.ts", "b.ts"]), {
    project: "srv", base: "origin/main", vitestConfig: "v.ts", files: ["a.ts", "b.ts"],
  });
  assert.throws(() => parseArgs(["--vitest-config", "../v.ts"]), UsageError);
});

test("Stryker and its Vitest runner are pinned to exactly 10.1.1", () => {
  const pkg = JSON.parse(readFileSync(path.join(here, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(path.join(here, "package-lock.json"), "utf8"));
  for (const name of ["@stryker-mutator/core", "@stryker-mutator/vitest-runner"]) {
    assert.equal(pkg.dependencies[name], "10.1.1", name);
    assert.equal(lock.packages[`node_modules/${name}`].version, "10.1.1", name);
  }
});

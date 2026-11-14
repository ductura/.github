// Tests for scripts/new-repo/generate.mjs. Every repository is generated into a
// fresh temporary folder; nothing touches GitHub. Lives next to the other
// scripts tests so the existing `node --test scripts/*.test.mjs` step runs it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL,
  PRESETS,
  ROOT,
  checkRiskTable,
  render,
  renderRepo,
  validateOptions,
  writeRepo,
} from "./new-repo/generate.mjs";
import { checkText } from "./pin-check.mjs";
import { checkLabels } from "./labels.mjs";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "new-repo", "generate.mjs");
const SHA = "0123456789abcdef0123456789abcdef01234567";
const OPTS = { name: "primjer", preset: "node", codeowner: "@ductura/vlasnici", ref: SHA };
const COMMON = [
  ".github/CODEOWNERS",
  ".github/labels.yml",
  ".github/pull_request_template.md",
  ".github/risk-paths.json",
  ".github/workflows/ci.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
];
const NODE_ONLY = [".npmrc", ".nvmrc", ".prettierignore", "eslint.config.ts", "package.json", "tsconfig.json"];

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), "new-repo-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split("\\").join("/"))
    .sort();
}

const snapshot = (dir) =>
  Object.fromEntries(
    listFiles(dir).map((path) => [path, [readFileSync(join(dir, path), "utf8"), statSync(join(dir, path)).mtimeMs]]),
  );

const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });

// --- what a new repository gets ----------------------------------------------

for (const [preset, expected] of [
  ["generic", COMMON],
  ["node", [...COMMON, ...NODE_ONLY]],
]) {
  test(`preset ${preset} writes exactly its files`, (t) => {
    const dir = tempDir(t);
    const result = writeRepo(dir, { ...OPTS, preset });
    assert.deepEqual(result.conflicts, []);
    assert.deepEqual([...result.created].sort(), [...expected].sort());
    assert.deepEqual(listFiles(dir), [...expected].sort());
  });

  test(`preset ${preset}: ci.yml pins every call, runs ci-ok always and over every job`, () => {
    const ci = renderRepo({ ...OPTS, preset }).get(".github/workflows/ci.yml");
    assert.deepEqual(checkText(ci, "ci.yml"), []);
    const uses = [...ci.matchAll(/uses: (\S+) # (\S+)/g)];
    assert.ok(uses.length >= 3);
    for (const [, ref, label] of uses) {
      assert.match(ref, new RegExp(`^ductura/\\.github/\\.github/workflows/[a-z-]+\\.yml@${SHA}$`));
      assert.equal(label, "ci-v1");
    }
    for (const [, ref] of uses)
      assert.ok(readdirSync(join(ROOT, ".github/workflows")).includes(ref.split("/").pop().split("@")[0]), ref);
    const jobs = [...ci.matchAll(/^  ([a-z-]+):$/gm)].map((m) => m[1]);
    const ciOk = ci.slice(ci.indexOf("  ci-ok:"));
    assert.match(ciOk, /if: \$\{\{ always\(\) \}\}/);
    assert.match(ciOk, /results: \$\{\{ toJSON\(needs\) \}\}/);
    const needs = /needs: \[([^\]]*)\]/
      .exec(ciOk)[1]
      .split(",")
      .map((s) => s.trim());
    assert.deepEqual(needs.sort(), jobs.filter((job) => job !== "ci-ok").sort());
    if (preset === "node") assert.ok(jobs.includes("node"));
  });
}

test("PR template, labels and .nvmrc are verbatim copies of this repository", () => {
  const files = renderRepo(OPTS);
  assert.equal(
    files.get(".github/pull_request_template.md"),
    readFileSync(join(ROOT, "PULL_REQUEST_TEMPLATE.md"), "utf8"),
  );
  assert.equal(files.get(".github/labels.yml"), readFileSync(join(ROOT, "labels.yml"), "utf8"));
  assert.equal(files.get(".nvmrc"), readFileSync(join(ROOT, ".nvmrc"), "utf8"));
  assert.doesNotThrow(() => checkLabels(files.get(".github/labels.yml")));
});

test("rule adapters only point to every canonical document and are the same in every repository", () => {
  const a = renderRepo(OPTS);
  const b = renderRepo({ ...OPTS, name: "drugi", preset: "generic" });
  for (const file of ["AGENTS.md", "CLAUDE.md"]) {
    const text = a.get(file);
    for (const [, url] of CANONICAL) assert.ok(text.includes(`](${url})`), `${file} misses ${url}`);
    assert.ok(text.split("\n").length <= 20, `${file} is not thin`);
    assert.match(text, /ne sadrži nijedno pravilo/);
    assert.equal(b.get(file), text.replaceAll("primjer", "drugi"));
  }
});

test("CODEOWNERS names the given owner for the whole repository", () => {
  assert.match(renderRepo(OPTS).get(".github/CODEOWNERS"), /^\* @ductura\/vlasnici$/m);
});

test("risk table is valid and keeps workflows and adapters critical", () => {
  const table = JSON.parse(renderRepo(OPTS).get(".github/risk-paths.json"));
  const risk = Object.fromEntries(table.rules.map((rule) => [rule.pattern, rule.risk]));
  assert.equal(table.default, "standard");
  for (const path of [".github/**", "AGENTS.md", "CLAUDE.md", ".claude/**"]) assert.equal(risk[path], "critical", path);
});

test("risk table check rejects bad tables", () => {
  const good = { version: 1, default: "standard", rules: [{ pattern: "a/**", risk: "low", reason: "r" }] };
  const bad = [
    { ...good, version: 2 },
    { ...good, default: "high" },
    { ...good, rules: [] },
    { ...good, rules: [{ pattern: "a", risk: "medium", reason: "r" }] },
    { ...good, rules: [{ pattern: "a", risk: "low", reason: "" }] },
    { ...good, rules: [{ pattern: "", risk: "low", reason: "r" }] },
    { ...good, rules: [good.rules[0], good.rules[0]] },
  ];
  assert.doesNotThrow(() => checkRiskTable(JSON.stringify(good)));
  for (const table of bad)
    assert.throws(() => checkRiskTable(JSON.stringify(table)), /risk table/, JSON.stringify(table));
});

test("node package.json uses the presets and the tool versions this repository tests", () => {
  const pkg = JSON.parse(renderRepo(OPTS).get("package.json"));
  const fixture = JSON.parse(readFileSync(join(ROOT, "fixtures/lint-presets/package.json"), "utf8"));
  assert.equal(pkg.name, "@ductura/primjer");
  assert.equal(pkg.private, true);
  assert.equal(pkg.packageManager, fixture.packageManager);
  assert.deepEqual(Object.keys(pkg.scripts).sort(), ["format", "lint", "test", "typecheck"]);
  for (const dir of ["eslint-config", "prettier-config", "tsconfig"]) {
    const preset = JSON.parse(readFileSync(join(ROOT, "packages", dir, "package.json"), "utf8"));
    assert.equal(pkg.devDependencies[preset.name], preset.version);
  }
  for (const dep of ["eslint", "prettier", "typescript", "@types/node"])
    assert.equal(pkg.devDependencies[dep], fixture.devDependencies[dep]);
});

test("no file keeps a placeholder, a secret-looking value or a token", () => {
  for (const preset of Object.keys(PRESETS)) {
    for (const [path, text] of renderRepo({ ...OPTS, preset })) {
      assert.doesNotMatch(text, /%%/, path);
      assert.doesNotMatch(text, /_authToken|ghp_|github_pat_/, path);
    }
  }
});

// --- idempotence and conflicts -----------------------------------------------

test("second run changes nothing: same content and same modification time", (t) => {
  const dir = tempDir(t);
  writeRepo(dir, OPTS);
  const before = snapshot(dir);
  const again = writeRepo(dir, OPTS);
  assert.deepEqual(again.created, []);
  assert.deepEqual(again.conflicts, []);
  assert.equal(again.unchanged.length, Object.keys(before).length);
  assert.deepEqual(snapshot(dir), before);
});

test("a differing file is a conflict and nothing at all is written", (t) => {
  const dir = tempDir(t);
  writeFileSync(join(dir, "README.md"), "vlastiti README\n");
  const result = writeRepo(dir, OPTS);
  assert.deepEqual(result.conflicts, ["README.md"]);
  assert.deepEqual(result.created, []);
  assert.deepEqual(listFiles(dir), ["README.md"]);
  assert.equal(readFileSync(join(dir, "README.md"), "utf8"), "vlastiti README\n");
});

test("a file in place of a parent folder is a conflict and nothing is written", (t) => {
  const dir = tempDir(t);
  writeFileSync(join(dir, ".github"), "datoteka\n");
  const result = writeRepo(dir, { ...OPTS, preset: "generic" });
  assert.deepEqual(result.conflicts, [".github"]);
  assert.deepEqual(result.created, []);
  assert.deepEqual(listFiles(dir), [".github"]);
});

test("a folder in place of a file fails without writing", (t) => {
  const dir = tempDir(t);
  mkdirSync(join(dir, "README.md"));
  assert.throws(() => writeRepo(dir, OPTS));
  assert.deepEqual(listFiles(dir), []);
});

// --- options and templates ---------------------------------------------------

test("invalid options are rejected before anything is rendered", () => {
  const bad = [
    { name: "../izvan" },
    { name: "Velika" },
    { name: "" },
    { name: undefined },
    { preset: "dotnet" },
    { preset: "toString" },
    { codeowner: "vlasnik" },
    { codeowner: "@a/b c" },
    { ref: "v4" },
    { ref: SHA.slice(1) },
    { ref: SHA.toUpperCase() },
    { ref: "main" },
    { refLabel: "ci v1" },
    { refLabel: "" },
  ];
  for (const change of bad) assert.throws(() => validateOptions({ ...OPTS, ...change }), Error, JSON.stringify(change));
  assert.equal(validateOptions(OPTS).refLabel, "ci-v1");
  assert.equal(validateOptions({ ...OPTS, refLabel: "gate-v2" }).refLabel, "gate-v2");
});

test("render fails on a missing or unused value and leaves GitHub expressions alone", () => {
  assert.equal(render("a %%x%% ${{ always() }}", { x: "1" }), "a 1 ${{ always() }}");
  assert.throws(() => render("%%x%%", {}), /no value for %%x%%/);
  assert.throws(() => render("%%x%%", { x: "1", y: "2" }), /unused value\(s\) y/);
  assert.throws(() => render("%%x%", {}), /malformed placeholder/);
});

// --- CLI ---------------------------------------------------------------------

test("CLI writes, then reports unchanged, then exits 1 on a conflict", (t) => {
  const dir = tempDir(t);
  const args = ["--name", "primjer", "--preset", "generic", "--codeowner", "@ductura/vlasnici", "--ref", SHA, dir];
  const first = run(...args);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /created {3}\.github\/workflows\/ci\.yml/);
  const second = run(...args);
  assert.equal(second.status, 0, second.stderr);
  assert.doesNotMatch(second.stdout, /created/);
  writeFileSync(join(dir, "CLAUDE.md"), "drukčije\n");
  const third = run(...args);
  assert.equal(third.status, 1);
  assert.match(third.stderr, /conflict {2}CLAUDE\.md/);
});

test("CLI exits 2 on bad input and writes nothing", (t) => {
  const dir = tempDir(t);
  for (const args of [
    ["--name", "primjer", "--preset", "node", "--codeowner", "@ductura/vlasnici", "--ref", "v4", dir],
    ["--name", "primjer", "--preset", "node", "--codeowner", "@ductura/vlasnici", "--ref", SHA],
    ["--name", "primjer", "--preset", "node", "--codeowner", "@ductura/vlasnici", "--ref", SHA, "--force", dir],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 2, args.join(" "));
    assert.match(result.stderr, /^new-repo: /);
  }
  assert.deepEqual(listFiles(dir), []);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GROUPS, REQUIRED_LABELS, checkLabels, missingRequired, parseLabels, validateLabels } from "./labels.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LABELS = join(ROOT, "labels.yml");
const CLI = join(ROOT, "scripts", "labels.mjs");

const entry = ({ name = "bug", color = "d73a4a", description = "Opis", group = "bot" } = {}) =>
  [`  - name: ${name}`, `    color: ${color}`, `    description: ${description}`, `    group: ${group}`];
const q = (s) => JSON.stringify(s);
const doc = (...entries) => ["version: 1", "labels:", ...entries.flat()].join("\n") + "\n";
const ok = (opts = {}) =>
  entry({ name: q(opts.name ?? "bug"), color: q(opts.color ?? "d73a4a"), description: q(opts.description ?? "Opis"), group: opts.group ?? "bot" });

// --- the real file -----------------------------------------------------------

test("labels.yml parses and has no structural problems", () => {
  const { labels } = parseLabels(readFileSync(LABELS, "utf8"));
  assert.ok(labels.length > 0);
  assert.deepEqual(validateLabels(labels), []);
});

test("labels.yml covers every label the gate, bots and orchestrator use", () => {
  const { labels } = parseLabels(readFileSync(LABELS, "utf8"));
  assert.deepEqual(missingRequired(labels), []);
});

test("every required label names its source", () => {
  for (const r of REQUIRED_LABELS) assert.ok(r.source.trim().length > 0, r.name);
  assert.equal(new Set(REQUIRED_LABELS.map((r) => r.name)).size, REQUIRED_LABELS.length);
});

test("required set includes the labels named by DAN-746", () => {
  const names = REQUIRED_LABELS.map((r) => r.name);
  for (const n of ["risk:low", "risk:standard", "risk:critical", "ready-for-claude", "claude:in-progress",
    "plan-napada", "bug", "security", "pitanje-za-grok"]) assert.ok(names.includes(n), n);
  for (const g of ["area", "role", "state"]) assert.ok(REQUIRED_LABELS.some((r) => r.group === g), g);
});

test("CLI accepts labels.yml and prints JSON with --json", () => {
  const r = spawnSync(process.execPath, [CLI, "--json", LABELS], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.version, 1);
  assert.ok(out.labels.every((l) => Object.keys(l).sort().join() === "color,description,group,name"));
});

// --- negative fixtures on disk must fail -------------------------------------

for (const [file, pattern] of [["duplicate.yml", /duplicate/], ["bad-color.yml", /color/]]) {
  test(`CLI rejects fixtures/labels/${file}`, () => {
    const r = spawnSync(process.execPath, [CLI, join(ROOT, "fixtures", "labels", file)], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, pattern);
  });
}

test("CLI rejects a file missing a required label", () => {
  const problems = checkLabels(doc(ok()));
  assert.ok(problems.some((p) => /missing required label "security"/.test(p)), problems.join("\n"));
});

// --- structural classes (validateLabels) -------------------------------------

const valid = { name: "bug", color: "d73a4a", description: "Opis", group: "bot" };
const structural = [
  ["accepts a valid label", [valid], null],
  ["accepts a prefixed label in its group", [{ ...valid, name: "area:db", group: "area" }], null],
  ["duplicate name", [valid, valid], /duplicate/],
  ["duplicate differing only in case", [valid, { ...valid, name: "BUG" }], /duplicate/],
  ["colour with #", [{ ...valid, color: "#d73a4a" }], /color/],
  ["three-digit colour", [{ ...valid, color: "d7a" }], /color/],
  ["non-hex colour", [{ ...valid, color: "zz3a4a" }], /color/],
  ["uppercase colour", [{ ...valid, color: "D73A4A" }], /color/],
  ["seven-digit colour", [{ ...valid, color: "d73a4a0" }], /color/],
  ["empty description", [{ ...valid, description: "" }], /description/],
  ["blank description", [{ ...valid, description: "   " }], /description/],
  ["description over 100 characters", [{ ...valid, description: "x".repeat(101) }], /description/],
  ["empty name", [{ ...valid, name: "" }], /name/],
  ["name over 50 characters", [{ ...valid, name: "x".repeat(51) }], /name/],
  ["name with surrounding space", [{ ...valid, name: " bug" }], /name/],
  ["unknown group", [{ ...valid, group: "misc" }], /group/],
  ["prefix in the wrong group", [{ ...valid, name: "area:db", group: "role" }], /group/],
  ["group prefix without the prefix", [{ ...valid, name: "db", group: "area" }], /group/],
  ["uppercase prefix outside its group", [{ ...valid, name: "AREA:auth", group: "bot" }], /group/],
  ["uppercase prefix in its group", [{ ...valid, name: "Area:auth", group: "area" }], null],
];

for (const [name, labels, pattern] of structural) {
  test(`structure: ${name}`, () => {
    const problems = validateLabels(labels);
    if (pattern === null) assert.deepEqual(problems, []);
    else assert.ok(problems.some((p) => pattern.test(p)), problems.join("\n") || "no problems");
  });
}

test("every group is reachable", () => {
  assert.deepEqual([...GROUPS].sort(), ["area", "bot", "risk", "role", "state"]);
});

// --- syntax classes (parseLabels) --------------------------------------------

const syntax = [
  ["accepts comments, blank lines and CRLF", doc("# c", "", ok()).replace(/\n/g, "\r\n"), null],
  ["accepts escaped quote in description", doc(ok({ description: 'Reci "da"' })), null],
  ["wrong version", doc(ok()).replace("version: 1", "version: 2"), /version/],
  ["no space after the version colon (not a YAML mapping entry)", doc(ok()).replace("version: 1", "version:1"), /version/],
  ["missing version", doc(ok()).replace("version: 1\n", ""), /version/],
  ["empty label list", "version: 1\nlabels:\n", /no labels/],
  ["unknown key", doc([...ok(), "    owner: x"]), /unknown key/],
  ["missing key", doc(ok().slice(0, 3)), /missing/],
  ["repeated key", doc([...ok(), `    color: "000000"`]), /repeated/],
  ["unquoted name", doc(entry({ color: q("d73a4a"), description: q("x") })), /quoted/],
  ["unquoted colour (YAML would read 000000 as a number)", doc(entry({ name: q("bug"), color: "000000", description: q("x") })), /quoted/],
  ["quoted group", doc(entry({ name: q("bug"), color: q("d73a4a"), description: q("x"), group: q("bot") })), /group/],
  ["single-quoted string", doc(entry({ name: "'bug'", color: q("d73a4a"), description: q("x") })), /quoted/],
  ["unsupported escape", doc(ok()).replace('"Opis"', '"a\\nb"'), /escape/],
  ["trailing text after value", doc(ok()).replace('"Opis"', '"Opis" extra'), /quoted/],
  ["trailing comment after value", doc(ok()).replace('"Opis"', '"Opis" # c'), /quoted/],
  ["tab indentation", doc(ok()).replace("    group", "\tgroup"), /unexpected line/],
  ["wrong indentation", doc(ok()).replace("    group", "   group"), /unexpected line/],
  ["unexpected top-level key", doc(ok()) + "extra: 1\n", /unexpected line/],
  ["flow sequence", "version: 1\nlabels: []\n", /unexpected line/],
];

for (const [name, text, pattern] of syntax) {
  test(`syntax: ${name}`, () => {
    if (pattern === null) {
      const { labels } = parseLabels(text);
      assert.equal(labels.length, 1);
      assert.deepEqual(validateLabels(labels), []);
    } else {
      assert.throws(() => parseLabels(text), pattern);
    }
  });
}

test("parse errors name the line", () => {
  assert.throws(() => parseLabels(doc([...ok(), "    owner: x"])), /line 7/);
});

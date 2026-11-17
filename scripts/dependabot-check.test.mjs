// DAN-922: .github/dependabot.yml must match the pinned SchemaStore schema and
// the repository rule (weekly npm and github-actions updates, each grouped).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { checkDependabot, loadSchema, SCHEMA_SHA256 } from "./dependabot-check.mjs";

const schemaBytes = readFileSync(new URL("dependabot/dependabot-2.0.json", import.meta.url));
const schema = loadSchema(schemaBytes);

const entry = (eco, extra = "") =>
  `  - package-ecosystem: ${eco}\n    directory: /\n    schedule: { interval: weekly }\n    groups: { all: { patterns: ["*"] } }\n${extra}`;
const VALID = `version: 2\nupdates:\n${entry("npm")}${entry("github-actions")}`;

const bad = [
  ["unknown top-level key", `${VALID}schedual: {}\n`],
  ["unknown key in an entry", `version: 2\nupdates:\n${entry("npm", "    schedual: { interval: weekly }\n")}${entry("github-actions")}`],
  ["version is missing", VALID.replace("version: 2\n", "")],
  ["version is 1", VALID.replace("version: 2", "version: 1")],
  ["version is a string", VALID.replace("version: 2", 'version: "2"')],
  ["package-ecosystem is missing", VALID.replace("  - package-ecosystem: npm\n    directory", "  - directory")],
  ["unknown ecosystem", VALID.replace("ecosystem: npm", "ecosystem: npmx")],
  ["hourly interval (schema)", VALID.replace("interval: weekly", "interval: hourly")],
  ["daily interval (repository rule)", VALID.replace("interval: weekly", "interval: daily")],
  ["groups is a list", VALID.replace('groups: { all: { patterns: ["*"] } }', "groups: [all]")],
  ["groups is empty", VALID.replace('groups: { all: { patterns: ["*"] } }', "groups: {}")],
  ["an entry has no group", VALID.replace('    groups: { all: { patterns: ["*"] } }\n', "")],
  ["npm is missing", `version: 2\nupdates:\n${entry("github-actions")}`],
  ["github-actions is missing", `version: 2\nupdates:\n${entry("npm")}`],
  ["duplicate key", `version: 2\n${VALID}`],
  ["two YAML documents", `${VALID}---\n${VALID}`],
  ["empty file", ""],
  ["invalid YAML", "version: [2\n"],
  ["document is a list", "- version: 2\n"],
];
for (const [name, text] of bad) {
  test(`refuses: ${name}`, () => {
    assert.ok(checkDependabot(text, schema).length > 0, name);
  });
}

test("refuses a schema whose sha256 differs, even by one byte", () => {
  const changed = Buffer.from(schemaBytes);
  changed[changed.length - 2] ^= 1;
  assert.throws(() => loadSchema(changed), /sha256/);
  assert.match(SCHEMA_SHA256, /^[0-9a-f]{64}$/);
});

test("accepts a minimal valid configuration", () => {
  assert.deepEqual(checkDependabot(VALID, schema), []);
});

test("the repository's .github/dependabot.yml passes, also through the CLI", () => {
  const file = new URL("../.github/dependabot.yml", import.meta.url);
  assert.deepEqual(checkDependabot(readFileSync(file, "utf8"), schema), []);
  execFileSync(process.execPath, [new URL("dependabot-check.mjs", import.meta.url).pathname, file.pathname]);
});

test("the CLI exits 1 on an invalid file", () => {
  const script = new URL("dependabot-check.mjs", import.meta.url).pathname;
  assert.throws(() => execFileSync(process.execPath, [script, "/dev/null"], { stdio: "pipe" }), (e) => e.status === 1);
});

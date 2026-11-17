import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkText } from "./permissions-check.mjs";

const found = (text) => checkText(text, "w.yml").map((p) => `${p.job ?? "-"}: ${p.kind}`);
const JOB = "jobs:\n  a:\n    runs-on: u\n";

// Missing permissions (DAN-970, criterion 1).
const missing = [
  ["no key in file or job", "on: push\n" + JOB, ["a: missing"]],
  ["null at file level", "on: push\npermissions:\n" + JOB, ["a: missing"]],
  ["null at job level", "on: push\njobs:\n  a:\n    permissions:\n    runs-on: u\n", ["a: missing"]],
  ["only one of two jobs", "on: push\njobs:\n  a: { runs-on: u, permissions: {} }\n  b: { runs-on: u }\n", ["b: missing"]],
  ["reusable caller without any key", "on: push\njobs:\n  a: { uses: ./.github/workflows/x.yml }\n", ["a: missing"]],
  ["inherited job names", "on: push\njobs:\n  toString: { runs-on: u }\n  __proto__: { runs-on: u }\n  constructor: { runs-on: u }\n", ["toString: missing", "__proto__: missing", "constructor: missing"]],
  ["permissions under __proto__", "on: push\n__proto__: { permissions: {} }\n" + JOB, ["a: missing"]],
  ["NBSP in the key", "on: push\npermissions\u00a0: {}\n" + JOB, ["a: missing"]],
  ["DEL in the key", "on: push\npermissions\u007f: {}\n" + JOB, ["a: missing"]],
  ["CRLF without a key", "on: push\r\njobs:\r\n  a:\r\n    runs-on: u\r\n", ["a: missing"]],
];
const present = [
  ["file level list", "on: push\npermissions:\n  contents: read\n" + JOB],
  ["file level empty map", "on: push\npermissions: {}\n" + JOB],
  ["job level only", "on: push\njobs:\n  a: { runs-on: u, permissions: { contents: read } }\n"],
  ["reusable caller inherits the file", "on: push\npermissions: { contents: read }\njobs:\n  a: { uses: ./.github/workflows/x.yml }\n"],
  ["quoted key", 'on: push\n"permissions": {}\n' + JOB],
  ["anchor and alias", "on: push\nx: &p { contents: read }\njobs:\n  a: { runs-on: u, permissions: *p }\n"],
  ["CRLF with a key", "on: push\r\npermissions: {}\r\njobs:\r\n  a:\r\n    runs-on: u\r\n"],
];
// Broad permissions (DAN-970, criterion 2): only a plain mapping or exactly
// read-all; every occurrence on the file and on each job is a finding.
const broadValues = [
  ["write-all", "write-all"], ["write", "write"], ["read", "read"],
  ["READ-ALL", "READ-ALL"], ["Read-All", "Read-All"], ["quoted read-all with a space", '"read-all "'],
  ["read-all with NBSP", "read-all\u00a0"], ["empty string", '""'], ["true", "true"], ["number", "1"],
  ["list", "[contents]"], ["binary (Buffer)", "!!binary aGk="],
];
const yaml11 = [["set", "!!set { write-all }"], ["omap", "!!omap [ { contents: read } ]"], ["date", "2001-12-14"]];
const broad = [
  ...broadValues.map(([name, v]) => [`file ${name}`, `on: push\npermissions: ${v}\n` + JOB, ["-: broad"]]),
  ...broadValues.map(([name, v]) => [`job ${name}`, `on: push\npermissions: {}\njobs:\n  a:\n    runs-on: u\n    permissions: ${v}\n`, ["a: broad"]]),
  ...yaml11.map(([name, v]) => [`YAML 1.1 ${name}`, `%YAML 1.1\n---\non: push\npermissions: ${v}\n` + JOB, ["-: broad"]]),
  ["alias to write-all", "on: push\nx: &w write-all\njobs:\n  a: { runs-on: u, permissions: *w }\n", ["a: broad"]],
  ["file write-all although every job has a list", "on: push\npermissions: write-all\njobs:\n  a: { runs-on: u, permissions: {} }\n", ["-: broad"]],
  ["one job of two", "on: push\njobs:\n  a: { runs-on: u, permissions: {} }\n  b: { runs-on: u, permissions: write-all }\n", ["b: broad"]],
  ["reusable caller", "on: push\npermissions: {}\njobs:\n  a: { uses: ./.github/workflows/x.yml, permissions: write-all }\n", ["a: broad"]],
  ["file and job", "on: push\npermissions: write-all\njobs:\n  a: { runs-on: u, permissions: write }\n", ["-: broad", "a: broad"]],
  ["write-all job without file permissions", "on: push\njobs:\n  a: { runs-on: u, permissions: write-all }\n  b: { runs-on: u }\n", ["a: broad", "b: missing"]],
];
const notBroad = [
  ["read-all", "on: push\npermissions: read-all\n" + JOB],
  ["read-all with a comment", "on: push\npermissions: read-all   # c\n" + JOB],
  ["write for one scope is a list", "on: push\npermissions: { contents: write }\n" + JOB],
  ["alias to a mapping", "on: push\nx: &p { contents: write }\npermissions: *p\n" + JOB],
  ["CRLF with read-all", "on: push\r\npermissions: read-all\r\njobs:\r\n  a:\r\n    runs-on: u\r\n"],
];

// Anything the parser cannot read the way GitHub does fails closed.
const unreadable = [
  ["lone CR", "on: push\rpermissions: {}\rjobs:\r  a:\r    runs-on: u\r"],
  // A job hidden after a comment for a reader that breaks lines there.
  ...[["lone CR", "\r"], ["NEL", "\u0085"], ["LS", "\u2028"], ["PS", "\u2029"]].map(([name, br]) => [
    `${name} ends a comment in an LF file`,
    `on: push\njobs:\n  safe: { permissions: {}, runs-on: u }\n# note${br}  hidden: { runs-on: u }\n`,
  ]),
  ["lone CR inside a quoted value", 'on: push\npermissions: {}\njobs:\n  a: { runs-on: "u\rv" }\n'],
  ["tab indentation", "on: push\npermissions: {}\njobs:\n\ta: { runs-on: u }\n"],
  ["invalid YAML", "on: [push\npermissions: {}\n" + JOB],
  ["duplicate permissions", "on: push\npermissions: {}\npermissions: {}\n" + JOB],
  ["duplicate job", "on: push\npermissions: {}\njobs:\n  a: { runs-on: u }\n  a: { runs-on: v }\n"],
  ["two documents", "on: push\npermissions: {}\n" + JOB + "---\non: push\n" + JOB],
  ["empty file", ""],
  ["comment only", "# nothing\n"],
  ["document is a list", "- on: push\n"],
  ["no jobs", "on: push\npermissions: {}\n"],
  ["jobs is a list", "on: push\npermissions: {}\njobs: [a]\n"],
  ["empty jobs", "on: push\npermissions: {}\njobs: {}\n"],
  ["job is a string", "on: push\npermissions: {}\njobs:\n  a: run\n"],
  ["merge key at file level", "on: push\nx: &x { permissions: {} }\n<<: *x\n" + JOB],
  ["merge key in a job", "on: push\nx: &x { permissions: {} }\njobs:\n  a: { <<: *x, runs-on: u }\n"],
];

for (const [name, text, expected] of missing) {
  test(`missing permissions fail: ${name}`, () => assert.deepEqual(found(text), expected));
}
for (const [name, text] of present) {
  test(`permissions present pass: ${name}`, () => assert.deepEqual(found(text), []));
}
for (const [name, text, expected] of broad) {
  test(`broad permissions fail: ${name}`, () => assert.deepEqual(found(text), expected));
}
for (const [name, text] of notBroad) {
  test(`not broad: ${name}`, () => assert.deepEqual(found(text), []));
}
for (const [name, text] of unreadable) {
  test(`unreadable fails closed: ${name}`, () => assert.deepEqual(found(text), ["-: unreadable"]));
}

const workflows = new URL("../.github/workflows/", import.meta.url);
test("every workflow of this repository passes", () => {
  const files = readdirSync(workflows).filter((f) => /\.ya?ml$/i.test(f));
  assert.ok(files.length > 0);
  for (const f of files) assert.deepEqual(checkText(readFileSync(new URL(f, workflows), "utf8"), f), [], f);
});

const cli = new URL("./permissions-check.mjs", import.meta.url).pathname;
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

test("CLI: the fixture fails, the workflows pass", () => {
  const bad = run(new URL("../fixtures/permissions/missing.yml", import.meta.url).pathname);
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stderr, /missing\.yml: job build: no permissions in the job or the file/);
  const wide = run(new URL("../fixtures/permissions/write-all.yml", import.meta.url).pathname);
  assert.equal(wide.status, 1, wide.stdout + wide.stderr);
  assert.match(wide.stderr, /write-all\.yml: permissions of the file: broad \("write-all"\)/);
  const good = run(workflows.pathname);
  assert.equal(good.status, 0, good.stdout + good.stderr);
});

test("CLI: no arguments, no workflow files or a missing path exit 2", () => {
  const dir = mkdtempSync(join(tmpdir(), "permissions-check-"));
  try {
    writeFileSync(join(dir, "notes.txt"), "x");
    assert.equal(run().status, 2);
    assert.equal(run(dir).status, 2);
    assert.equal(run(join(dir, "absent.yml")).status, 2);
    writeFileSync(join(dir, "W.YAML"), "on: push\n" + JOB);
    assert.equal(run(dir).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mutantsOf } from "./mutate/mutate.mjs";

const root = new URL("..", import.meta.url).pathname;
const MUTATE = join(root, "scripts/mutate/mutate.mjs");

// A copy of fixtures/mutate in a temporary directory; the repo is never mutated.
function inCopy(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), "mutate-"));
  try {
    cpSync(join(root, "fixtures/mutate"), dir, { recursive: true });
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
// Plain node scripts and only PATH: no nested node --test (NODE_TEST_CONTEXT).
const run = (dir, args) =>
  spawnSync(process.execPath, [MUTATE, ...args], { cwd: dir, env: { PATH: process.env.PATH }, encoding: "utf8", timeout: 60_000, killSignal: "SIGKILL" });
const check = (name) => ["--", process.execPath, name];

test("usage and file errors exit 2 before any mutant", () =>
  inCopy({ "x.test.mjs": "1 < 2", "plain.mjs": "export const a = 1;\n" }, (dir) => {
    for (const args of [[], ["src.mjs"], ["--", "node"], ["src.mjs", "--"], ["missing.mjs", ...check("strong.check.mjs")], ["x.test.mjs", "README.md", ...check("strong.check.mjs")], ["plain.mjs", ...check("strong.check.mjs")], ["src.mjs", "--", "no-such-command-1090"]]) {
      const r = run(dir, args);
      assert.equal(r.status, 2, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
      assert.doesNotMatch(r.stdout, /survived/);
    }
  }));

test("tests that fail without a mutant exit 2", () =>
  inCopy({ "bad.check.mjs": "process.exit(1);\n" }, (dir) => {
    const r = run(dir, ["src.mjs", ...check("bad.check.mjs")]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /fail without any mutant/);
  }));

test("weak check: survivors listed, exit 1", () =>
  inCopy({}, (dir) => {
    const before = readFileSync(join(dir, "src.mjs"));
    const r = run(dir, ["src.mjs", ...check("weak.check.mjs")]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^survived src\.mjs:2:50 '&&' -> '\|\|'$/m);
    assert.match(r.stdout, /^survived src\.mjs:2:57 '>=' -> '>'$/m);
    assert.match(r.stdout, /2 mutants, 0 killed, 2 survived/);
    assert.deepEqual(readFileSync(join(dir, "src.mjs")), before);
  }));

test("strong check: every mutant killed, exit 0", () =>
  inCopy({}, (dir) => {
    const r = run(dir, ["src.mjs", "src.mjs", ...check("strong.check.mjs")]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /2 mutants, 2 killed, 0 survived/);
  }));

// i + 1 -> i - 1 never ends: the timeout kills it and the BOM/CRLF/NBSP source comes back byte for byte.
test("a hanging mutant is killed by the timeout and the source is restored", () => {
  const src = "﻿export function spin() {\r\n\tlet i = 0; while (i < 3) i = i + 1;\r\n  return i;\r\n}\r\n";
  const chk = 'import assert from "node:assert/strict";\nimport { spin } from "./spin.mjs";\nassert.equal(spin(), 3);\n';
  inCopy({ "spin.mjs": src, "spin.check.mjs": chk }, (dir) => {
    const r = run(dir, ["spin.mjs", ...check("spin.check.mjs")]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /2 mutants, 2 killed, 0 survived/);
    assert.equal(readFileSync(join(dir, "spin.mjs"), "utf8"), src);
  });
});

// SIGTERM while a mutant hangs: the tests are killed and the source comes back.
test("an interrupt restores the file under a mutant", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mutate-"));
  try {
    const src = "export function spin() {\n  let i = 0;\n  while (i < 3) i = i + 1;\n  return i;\n}\n";
    writeFileSync(join(dir, "spin.mjs"), src);
    writeFileSync(join(dir, "spin.check.mjs"), 'import { spin } from "./spin.mjs";\nif (spin() !== 3) process.exit(1);\n');
    const child = spawn(process.execPath, [MUTATE, "spin.mjs", ...check("spin.check.mjs")], { cwd: dir, env: { PATH: process.env.PATH }, stdio: "ignore" });
    const exited = new Promise((done) => child.on("exit", (code) => done(code)));
    for (let n = 0; readFileSync(join(dir, "spin.mjs"), "utf8") === src; n++) {
      assert.ok(n < 400, "no mutant was written");
      await new Promise((r) => setTimeout(r, 25));
    }
    child.kill("SIGTERM");
    assert.equal(await exited, 130);
    assert.equal(readFileSync(join(dir, "spin.mjs"), "utf8"), src);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const ops = (src) => mutantsOf(src).map((m) => `${m.from}>${m.to}`);
const none = [
  ["line comment", "// a < b && c"],
  ["block comment", "/* a === b */"],
  ["quotes with escapes", "x('a \\' < b', \"c \\\" + d\")"],
  ["template with nested braces", "`a < ${`b && ${c ? '}' : d}`} > e`"],
  ["regex at the start", "/a+b/.test(x)"],
  ["regex after =", "r = /a<b/g"],
  ["regex after return", "return /a-b/"],
  ["regex after (", "f(/a&&b/)"],
  ["slash in a regex class", "r = /[/+]/"],
  ["arrow and shifts", "f = (a) => a >> 1 >>> 2 << 3"],
  ["compound operators", "a >>>= 1; b <<= 2; c **= 3; d &&= e; f ||= g; h ?? i; j?.k; [...l]; m++; n--; o += 1; p -= 2; q >>= 1"],
  ["boolean as part of a name", "$true; true_; x.true; y?.false"],
];
for (const [name, src] of none) test(`no mutant: ${name}`, () => assert.deepEqual(ops(src), []));

const some = [
  ["strict equality", "a === b !== c", ["===>!==", "!==>==="]],
  ["loose equality", "a == b != c", ["==>!=", "!=>=="]],
  ["relational", "a < b <= c > d >= e", ["<><=", "<=><", ">>>=", ">=>>"]],
  ["logical", "a && b || c", ["&&>||", "||>&&"]],
  ["division stays division", "a / b + 2 / c - (d) / e", ["+>-", "->+"]],
  ["booleans", "x = true || false", ["true>false", "||>&&", "false>true"]],
];
for (const [name, src, want] of some) test(`mutants: ${name}`, () => assert.deepEqual(ops(src), want));

test("line and column survive CRLF, tab, NBSP and DEL", () => {
  const at = (src) => mutantsOf(src).map((m) => `${m.line}:${m.col}`);
  assert.deepEqual(at("a\r\n\tb < c"), ["2:4"]);
  assert.deepEqual(at("\u007fa < b"), ["1:4"]);
});

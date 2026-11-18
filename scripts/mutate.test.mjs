import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  inCopy({ "x.test.mjs": "1 < 2", "plain.mjs": "export const a = 1;\n", "t.d.ts": "declare const flag: true;\n" }, (dir) => {
    for (const args of [[], ["src.mjs"], ["--", "node"], ["src.mjs", "--"], ["missing.mjs", ...check("strong.check.mjs")], ["x.test.mjs", "README.md", ...check("strong.check.mjs")], ["plain.mjs", ...check("strong.check.mjs")], ["src.mjs", "--", "no-such-command-1090"], ["src.mjs", "--", ""], ["t.d.ts", ...check("strong.check.mjs")]]) {
      const r = run(dir, args);
      assert.equal(r.status, 2, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
      if (args.length < 3 || args.at(-1) === "") assert.match(r.stderr, /^usage:/, args.join(" "));
      assert.doesNotMatch(r.stdout, /survived/);
    }
  }));

test("tests that fail without a mutant exit 2", () =>
  inCopy({ "bad.check.mjs": "process.exit(1);\n" }, (dir) => {
    const r = run(dir, ["src.mjs", ...check("bad.check.mjs")]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /fail without any mutant/);
  }));

test("tests that rewrite a file under test exit 2", () =>
  inCopy({ "fmt.check.mjs": 'import { readFileSync, writeFileSync } from "node:fs";\nwriteFileSync("src.mjs", readFileSync("src.mjs", "utf8") + "\\n");\n' }, (dir) => {
    const r = run(dir, ["src.mjs", ...check("fmt.check.mjs")]);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /the tests change a file under test/);
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

// The command starts for the baseline, then is gone: a mutant it never ran is not a kill.
test("a command that cannot start for a mutant exits 2", { skip: process.platform === "win32" && "a POSIX shell script" }, () =>
  inCopy({ "once.sh": `#!/bin/sh\nrm -- "$0"\nexec "${process.execPath}" strong.check.mjs\n` }, (dir) => {
    chmodSync(join(dir, "once.sh"), 0o755);
    const r = run(dir, ["src.mjs", "--", "./once.sh"]);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /did not start for a mutant/);
    assert.doesNotMatch(r.stdout, /killed/);
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

// A killed process nobody reaps (no init in a container) stays a zombie: dead, but kill(pid, 0) finds it.
function running(pid) {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  try {
    return readFileSync(`/proc/${pid}/stat`, "utf8").split(") ").at(-1)[0] !== "Z";
  } catch {
    return true;
  }
}
// The tests run under a shell; the timeout must kill the node it started too.
test("a timeout kills the whole process group", { skip: process.platform === "win32" && "POSIX process groups" }, () => {
  const src = "export function spin() {\n  let i = 0;\n  while (i < 3) i = i + 1;\n  return i;\n}\n";
  const chk = 'import { appendFileSync } from "node:fs";\nimport { spin } from "./spin.mjs";\nappendFileSync("pids", process.pid + "\\n");\nif (spin() !== 3) process.exit(1);\n';
  inCopy({ "spin.mjs": src, "spin.check.mjs": chk }, (dir) => {
    const r = run(dir, ["spin.mjs", "--", "/bin/sh", "-c", `"${process.execPath}" spin.check.mjs; exit $?`]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const pids = readFileSync(join(dir, "pids"), "utf8").trim().split("\n").map(Number);
    assert.equal(pids.length, 3);
    for (const pid of pids) assert.ok(!running(pid), `process ${pid} still runs`);
  });
});

// A signal while a mutant runs: the tests are killed and the source comes back.
for (const [signal, status] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]])
test(`${signal} restores the file under a mutant`, { skip: process.platform === "win32" && "POSIX signals" }, async () => {
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
    child.kill(signal);
    assert.equal(await exited, status);
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
  ["comment inside a template interpolation", "x = `${/* } ` a && b ` */ 1}`; y = `${1 // } a < b\n}`"],
  ["hashbang", "#!/usr/bin/env -S node --no-warnings\nx"],
  ["hashbang with operators", "#! a < b && c - d\nx"],
  ["TS mapped-type modifiers", "type M = { -readonly [k in K]-?: T[k] }; type P = { +readonly [k in K]+?: T[k] }"],
  ["boolean after an astral identifier character", "const \u{1d499}true = 1; o.\u{1d499}true"],
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

// Whatever is skipped ends exactly where it should: the code after it is mutated, at its own column.
const at = (src) => mutantsOf(src).map((m) => `${m.from}@${m.line}:${m.col}`);
// The expected place: the last occurrence of the operator, on the last line.
const last = (src, op) => {
  const i = src.lastIndexOf(op);
  return `${op}@${src.slice(0, i).split("\n").length}:${i - src.lastIndexOf("\n", i)}`;
};
const after = [
  ["single quotes with an escape", "'a\\'' < b", "<"],
  ["double quotes", '"a" < b', "<"],
  ["template", "`a` < b", "<"],
  ["template with a regex holding braces and quotes", "x = `${s.replace(/[{`'\"]/g, '{')}`; y = a && b", "&&"],
  ["template with an escaped brace in a regex", "x = `<td>${s.replace(/\\{/g, '&#123;')}</td>`; a < b", "<"],
  ["regex with a class and flags", "r = /[/]a/gi < b", "<"],
  ["block comment", "/* a < b */ c > d", ">"],
  ["line comment", "// a < b\nc > d", ">"],
  ["member named like a keyword", "x.in / 2 + 1", "+"],
  ["line comment after a newline", "a\n// x\nb < c", "<"],
  ["block comment after a newline", "a\n/* x */ b < c", "<"],
  ["regex whose flags are longer than its tail", "r = /a+b/gimsuy < c", "<"],
  ["object literal inside an interpolation", "x = `${ {a: 1}.a } a < b`; c > d", ">"],
];
for (const [name, src, op] of after) test(`mutated after: ${name}`, () => assert.deepEqual(at(src), [last(src, op)]));

test("line and column survive CRLF, tab, NBSP and DEL", () => {
  const at = (src) => mutantsOf(src).map((m) => `${m.line}:${m.col}`);
  assert.deepEqual(at("a\r\n\tb < c"), ["2:4"]);
  assert.deepEqual(at("\u007fa < b"), ["1:4"]);
});

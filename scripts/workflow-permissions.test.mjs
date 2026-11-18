// zizmor's obfuscation and undocumented-permissions over this repository's
// workflows, and the permissions of main 8ee8b88 kept as they were (DAN-1078-1a).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { isAlias, isMap, isScalar, parseDocument, visit } from "yaml";

const DIR = new URL("../.github/workflows/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f)).sort();
const read = (f) => readFileSync(new URL(f, DIR), "utf8");
const keyOf = (pair) => (isScalar(pair.key) ? String(pair.key.value) : undefined);
// GitHub reads workflow keys in any case (permissions-check.mjs does the same).
const is = (pair, name) => keyOf(pair)?.toLowerCase() === name;

function parse(text) {
  if (/\r(?!\n)|[\u0085\u2028\u2029]/.test(text)) throw new Error("line break other than LF or CRLF");
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`YAML errors: ${doc.errors.map((e) => e.code).join(", ")}`);
  visit(doc, { Alias() { throw new Error("YAML alias in a workflow"); } });
  return doc;
}

// Every permissions node: [""] for the file, then [job] for each job that has one.
// Walks the document's pairs, so __proto__ or toString are names like any other.
function blocks(text) {
  const out = [];
  const top = parse(text).contents;
  for (const pair of isMap(top) ? top.items : []) {
    if (is(pair, "permissions")) out.push(["", pair.value]);
    if (!is(pair, "jobs") || !isMap(pair.value)) continue;
    for (const job of pair.value.items)
      for (const p of isMap(job.value) ? job.value.items : [])
        if (is(p, "permissions")) out.push([keyOf(job), p.value]);
  }
  return out;
}

export const permissionsOf = (text) => blocks(text).map(([job, node]) => [job, node?.toJSON() ?? null]);

// A comment counts only on the line where the value (or a flow map) ends, with a
// letter, digit, punctuation or symbol in it: zizmor 1.32.0 rejects a comment
// above the key, one on the next line and an empty "#". Stricter than zizmor on
// purpose: read-all and write-all need one too, and a multi-line flow map needs
// it after its closing brace.
function documented(text, node) {
  if (!node?.range) return false;
  const rest = /^[ \t]*#(.*)/.exec(text.slice(node.range[1]).split(/\r?\n/, 1)[0]);
  return rest !== null && /[\p{L}\p{N}\p{P}\p{S}]/u.test(rest[1]);
}
const exempt = (pair) => is(pair, "contents") && isScalar(pair.value) && pair.value.value === "read";

export function undocumented(text) {
  const out = [];
  for (const [job, node] of blocks(text)) {
    if (isScalar(node) && node.value != null && !documented(text, node)) out.push(`${job}:${node.value}`);
    if (!isMap(node)) continue;
    for (const pair of node.items)
      if (!exempt(pair) && !documented(text, node.flow ? node : pair.value)) out.push(`${job}:${keyOf(pair)}`);
  }
  return out;
}

// The inside of each ${{ }}; a "}}" in a string literal does not end it.
function* expressions(s) {
  for (let i = s.indexOf("${{"); i !== -1; i = s.indexOf("${{", i)) {
    let j = i + 3;
    for (let quoted = false; j < s.length && (quoted || !s.startsWith("}}", j)); j++) if (s[j] === "'") quoted = !quoted;
    yield s.slice(i + 3, j);
    i = j + 2;
  }
}

// What zizmor reports as obfuscation: an expression that cannot depend on the
// run (no context and no status function once string literals are out), a
// constant part of a larger one, and "." or ".." in a uses path. A constant
// part is !literal, a call with literal arguments only, or two literals around
// an operator that neither a tighter operator nor the same one on the left
// (they group left to right) takes first: `cond && 'a' || 'b'` is not one.
const RUNTIME = /\b(?:github|inputs|matrix|needs|steps|env|vars|secrets|jobs?|runner|strategy)\b|\b(?:always|success|failure|cancelled|hashFiles)\s*\(/;
const L = String.raw`(?:''|true|false|null|[-+]?(?:0x[0-9a-f]+|\d+(?:\.\d+)?(?:e[-+]?\d+)?))`;
const CMP = String.raw`(?:[=!]=|[<>]=?)`;
const PART = new RegExp(
  [String.raw`!\s*${L}`, String.raw`\b(?!hashFiles\b)[a-z]\w*\(\s*${L}\s*(?:,\s*${L}\s*)*\)`,
    String.raw`(?<!${CMP}\s*)${L}\s*${CMP}\s*${L}(?!\s*${CMP})`,
    String.raw`(?<!(?:${CMP}|&&|\|\|)\s*)${L}\s*\|\|\s*${L}(?!\s*(?:${CMP}|&&))`,
    String.raw`(?<!(?:${CMP}|&&)\s*)${L}\s*&&\s*${L}(?!\s*${CMP})`].join("|"), "i");
export function obfuscated(text) {
  const out = [];
  visit(parse(text), {
    Pair(_, pair) {
      const v = isScalar(pair.value) ? pair.value.value : undefined;
      if (is(pair, "uses") && typeof v === "string" && v.split("@")[0].split("/").some((seg, i) => seg === ".." || (seg === "." && i > 0)))
        out.push(v);
    },
    Scalar(_, node) {
      if (typeof node.value !== "string") return;
      for (const inner of expressions(node.value)) {
        const bare = inner.replace(/'(?:[^']|'')*'/g, "''");
        if (!RUNTIME.test(bare) || PART.test(bare)) out.push(inner.trim());
      }
    },
  });
  return out;
}

// Permissions per workflow and job on main 8ee8b88. Comments may be added; a
// value, a key or a block may not change, appear or go.
const MAIN = {
  "ci-node.yml": [["", { contents: "read", packages: "read" }]],
  "ci-ok.yml": [["", {}]],
  "dependency-review.yml": [["", { contents: "read" }]],
  "drift-check.yml": [["", {}], ["scan", { contents: "read" }], ["report", { contents: "read" }], ["deliver", { contents: "read", issues: "write" }]],
  "engineering-gate.yml": [["", {}], ["gate", { contents: "read", issues: "read", "pull-requests": "read", statuses: "write" }]],
  "osv-scan.yml": [["", { contents: "read" }]],
  "secret-scan.yml": [["", { contents: "read" }]],
  "self-test.yml": [
    ["", { contents: "read" }],
    ["engineering-gate", { contents: "read", issues: "read", "pull-requests": "read", statuses: "write" }],
    ["tests-table", { contents: "read", "pull-requests": "read" }],
    ...["node-ok", "node-ok-multiline", "node-fail", "lint-presets"].map((j) => [j, { contents: "read", packages: "read" }]),
  ],
  "tests-table.yml": [["", {}], ["tests-table", { contents: "read", "pull-requests": "read" }]],
};

const W = "on: push\npermissions: {}\njobs:\n  a:\n    runs-on: u\n";
const base = [["", {}], ["a", { contents: "read", issues: "read" }]];
const job = (perms) => `${W}    permissions:\n${perms}`;

test("permissionsOf: a widened, added, moved or replaced permission differs from main", () => {
  assert.deepEqual(permissionsOf(job("      contents: read\n      issues: read # x\n")), base);
  for (const [name, text] of [
    ["read to write", job("      contents: read\n      issues: write # x\n")],
    ["one more key", job("      contents: read\n      issues: read\n      actions: read\n")],
    ["file level block gone", W.replace("permissions: {}\n", "") + "    permissions: { contents: read, issues: read }\n"],
    ["file level read-all", W.replace("{}", "read-all") + "    permissions: { contents: read, issues: read }\n"],
    ["job level write-all", `${W}    permissions: write-all\n`],
    ["block on a job that had none", job("      contents: read\n      issues: read\n") + "  b:\n    runs-on: u\n    permissions: {}\n"],
    ["key in another case", job("      contents: read\n      issues: read\n") + "  b:\n    runs-on: u\n    Permissions: { issues: write }\n"],
  ])
    assert.notDeepEqual(permissionsOf(text), base, name);
  // GitHub reads keys in any case, so these are found, not skipped.
  assert.deepEqual(permissionsOf(job("      contents: read\n      issues: read\n").replace("permissions: {}", "PERMISSIONS: { issues: write }")), [["", { issues: "write" }], base[1]]);
  assert.deepEqual(permissionsOf(job("      contents: read\n      issues: write\n").replace("jobs:", "Jobs:")), [base[0], ["a", { contents: "read", issues: "write" }]]);
  assert.throws(() => permissionsOf(job("      issues: read\n") + "    permissions: { issues: write }\n"), /DUPLICATE_KEY/);
  assert.throws(() => permissionsOf(`x: &p { issues: write }\n${W}    permissions: *p\n`), /alias/);
  for (const br of ["\r", "\u0085", "\u2028", "\u2029"])
    assert.throws(() => permissionsOf(job(`      issues: read # x${br}      actions: write\n`)), /line break/, JSON.stringify(br));
});

test("every workflow keeps the permissions of main; a new one needs its row (DAN-1078-1a)", () => {
  assert.deepEqual(FILES, Object.keys(MAIN).sort());
  for (const file of FILES) assert.deepEqual(permissionsOf(read(file)), MAIN[file], file);
});

test("undocumented: every permission but contents: read needs a visible comment on its line", () => {
  const bad = [
    ["block without a comment", job("      contents: read\n      issues: read\n"), ["a:issues"]],
    ["flow map without a comment", `${W}    permissions: { contents: read, issues: read }\n`, ["a:issues"]],
    ["comment only above the key", job("      contents: read\n      # why\n      issues: read\n"), ["a:issues"]],
    ["comment on the next line, deeper", job("      issues: read\n        # why\n"), ["a:issues"]],
    ["no value", job("      issues:\n"), ["a:issues"]],
    ["explicit key, no value", job("      ? issues\n"), ["a:issues"]],
    ["empty #", job("      issues: read #\n"), ["a:issues"]],
    ["only spaces, tab, NBSP, U+2003, U+3000 or DEL", job("      a: read #  \n      b: read #\t\n      c: read #\u00a0\n      d: read #\u2003\u3000\n      e: read #\u007f\n"), ["a:a", "a:b", "a:c", "a:d", "a:e"]],
    ["contents: write", job("      contents: write\n"), ["a:contents"]],
    ["inherited names", job("      __proto__: read\n      toString: read\n      constructor: write\n"), ["a:__proto__", "a:toString", "a:constructor"]],
    ["CRLF", job("      contents: read\n      issues: write\n").replaceAll("\n", "\r\n"), ["a:issues"]],
    ["scalar read-all", W.replace("{}", "read-all"), [":read-all"]],
    ["file level block", "on: push\npermissions:\n  packages: read\njobs: {}\n", [":packages"]],
  ];
  for (const [name, text, want] of bad) assert.deepEqual(undocumented(text), want, name);
  const good = [
    ["commented block", job("      contents: read\n      issues: write # one report comment\n")],
    ["commented flow map", `${W}    permissions: { contents: read, issues: read } # verdict lines\n`],
    ["CRLF with a comment", job("      issues: read # x\n").replaceAll("\n", "\r\n")],
    ["contents: read alone", job("      contents: read\n")],
    ["empty map", W],
    ["digits, punctuation or a symbol only", job("      a: read # 2\n      b: read # \u2014\n      c: read # \u2713\n")],
  ];
  for (const [name, text] of good) assert.deepEqual(undocumented(text), [], name);
});

test("obfuscated: ${{ }} that cannot depend on the run is obfuscation, in any value", () => {
  const inner = ["false", "true", "null", "0", "-1.5", "0x10", "'x'", "'it''s'", "!false", "1 == 1", "fromJSON('false')", "format('{0}', 'github')",
    "github.ref == format('{0}', 'x')", "inputs.a && !false", "github.ref == 'x' || 1 == 1", "'a' == 'a' && github.ref",
    "format('{0} ${{ github }}', 'x')", "'x' || 'y' || inputs.a"];
  for (const e of ["${{false}}", "${{\n false }}", ...inner.map((c) => `\${{ ${c} }}`)]) {
    const text = `on: push\njobs:\n  a:\n    name: ${JSON.stringify(`n-${e}`)}\n    if: ${JSON.stringify(e)}\n    env: { X: ${JSON.stringify(e)} }\n    steps:\n      - if: ${JSON.stringify(e)}\n        with: { x: ${JSON.stringify(`a-${e}`)} }\n      - run: ${JSON.stringify(`echo ${e}`)}\n`;
    assert.equal(obfuscated(text).length, 6, e);
  }
  const fine = ["true && always()", "matrix.case", "inputs.flag == 'true'", "hashFiles('a')", "github.ref == 'refs/heads/main'", "env.A", "secrets.B", "strategy.job-index",
    "success()", "failure()", "cancelled()", "github.event_name != 'pull_request' && 'dependency-review' || ''", "inputs.a == 'x' && 'y' || 'z'", "'}}' == github.ref", "inputs.a || 'x' || 'y'", "inputs.a && 'x' && 'y'", "inputs.a == 1 == 2"];
  for (const e of fine) assert.deepEqual(obfuscated(`on: push\njobs:\n  a:\n    if: false\n    steps:\n      - if: ${JSON.stringify(`\${{ ${e} }}`)}\n`), [], e);
  for (const u of ["actions/checkout/./@abc", "actions/checkout/../checkout@abc", "./.github/../.github/workflows/x.yml"])
    assert.deepEqual(obfuscated(`on: push\njobs:\n  a:\n    steps:\n      - uses: ${u}\n`), [u], u);
  assert.deepEqual(obfuscated("on: push\njobs:\n  a:\n    uses: ./.github/workflows/x.yml\n    steps:\n      - uses: actions/checkout@abc\n"), []);
});

test("no workflow of this repository has an undocumented permission or obfuscation", () => {
  assert.ok(FILES.length >= Object.keys(MAIN).length);
  for (const file of FILES) {
    assert.deepEqual(undocumented(read(file)), [], file);
    assert.deepEqual(obfuscated(read(file)), [], file);
  }
});

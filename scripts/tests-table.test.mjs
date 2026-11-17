import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { checkTestsTable, isDocsOnly, listFiles, run } from "./tests-table.mjs";

const HEAD = "| Kriterij | Test | Pada bez promjene |\n|---|---|---|\n";
const body = (rows, heading = "## Testovi prihvata") => `Opis\n\n${heading}\n\n${HEAD}${rows}\nOstalo\n`;
const GOOD = body("| Prazan unos pada | scripts/a.test.mjs „prazan” | da |");
const CODE = [{ filename: "src/a.ts", status: "modified" }];
const DOCS = [{ filename: "docs/PLAN.md", status: "modified" }];

// Negative cases first: a PR that changes code without a filled table fails.
const failing = [
  ["null body", null],
  ["empty body", ""],
  ["no heading", `Opis\n\n${HEAD}| a | b | da |\n`],
  ["heading, no table", "## Testovi prihvata\n\nnešto\n"],
  ["header and separator only", body("")],
  ["template row untouched", body("| <kriterij prihvata> | <test> | da |")],
  ["empty cell", body("| a |  | da |")],
  ["tab-only cell", body("| a |\t| da |")],
  ["NBSP-only cell", body("| a | | da |")],
  ["zero-width-only cell", body("| a |​| da |")],
  ["third cell ne", body("| a | b | ne |")],
  ["third cell empty", body("| a | b | |")],
  ["third cell bold", body("| a | b | **da** |")],
  ["two columns", "## Testovi prihvata\n\n| Kriterij | Test |\n|---|---|\n| a | b |\n"],
  ["four cells in a row", body("| a | b | da | x |")],
  ["escaped pipe makes two cells", body("| a | b \\| da |")],
  ["row without outer pipes", body("a | b | da")],
  ["row without the closing pipe", body("| a | b | da")],
  ["table only in an HTML comment", `<!--\n${body("| a | b | da |")}-->\n`],
  ["table only in a code fence", "```\n" + body("| a | b | da |") + "```\n"],
  ["table under another heading", body("| a | b | da |", "## Dokaz")],
  ["level 3 heading", body("| a | b | da |", "### Testovi prihvata")],
  ["heading without space", body("| a | b | da |", "##Testovi prihvata")],
  ["duplicate heading", body("| a | b | da |") + "\n## Testovi prihvata\n"],
  ["one good, one bad row", body("| a | b | da |\n| c | d | ne |")],
  ["wrong header names", "## Testovi prihvata\n\n| A | B | C |\n|---|---|---|\n| a | b | da |\n"],
  ["no separator row", "## Testovi prihvata\n\n| Kriterij | Test | Pada bez promjene |\n| a | b | da |\n"],
  ["table after the next heading", "## Testovi prihvata\n\n## Dokaz\n\n" + HEAD + "| a | b | da |\n"],
  ["table in an indented code block", "## Testovi prihvata\n\n    " + (HEAD + "| a | b | da |").split("\n").join("\n    ") + "\n"],
  ["table in a tab-indented code block", "## Testovi prihvata\n\n\t" + (HEAD + "| a | b | da |").split("\n").join("\n\t") + "\n"],
  ["table after an indented heading", "## Testovi prihvata\n\n   ## Dokaz\n\n" + HEAD + "| a | b | da |\n"],
  ["HTML table", "## Testovi prihvata\n\n<table><tr><td>a</td><td>b</td><td>da</td></tr></table>\n"],
];
for (const [name, text] of failing) {
  test(`code PR fails: ${name}`, () => {
    const r = checkTestsTable(text, CODE);
    assert.equal(r.ok, false, r.message);
    assert.ok(r.message.length > 0);
  });
}

const passing = [
  ["filled table", GOOD],
  ["CRLF body", GOOD.replace(/\n/g, "\r\n")],
  ["issue reference before the table", body("| a | b | da |").replace("## Testovi prihvata\n", "## Testovi prihvata\n#1836\n")],
  ["lone CR body", GOOD.replace(/\n/g, "\r")],
  ["text before the table", body("| a | b | da |").replace("## Testovi prihvata\n", "## Testovi prihvata\nUvod.\n")],
  ["Da with spaces and tabs", body("|  a \t| b |  Da  |")],
  ["several rows", body("| a | b | da |\n| c | d | DA |")],
  ["escaped pipe inside a cell", body("| a \\| b | c | da |")],
  ["heading with trailing spaces", body("| a | b | da |", "## Testovi prihvata  ")],
  ["table inside the details block", `<details>\n<summary>x</summary>\n\n${body("| a | b | da |")}</details>\n`],
];
for (const [name, text] of passing) {
  test(`code PR passes: ${name}`, () => assert.equal(checkTestsTable(text, CODE).ok, true));
}

const code = [
  ["no files", []],
  ["workflow", [{ filename: ".github/workflows/x.yml", status: "added" }]],
  ["docs and code", [...DOCS, { filename: "README.MD" }, { filename: "a.ts" }]],
  [".mdx", [{ filename: "docs-site/a.mdx" }]],
  ["Windows-style path", [{ filename: "docs\\x.ts" }]],
  ["removed code file", [{ filename: "src/a.ts", status: "removed" }]],
  ["code renamed to docs", [{ filename: "docs/a.md", previous_filename: "src/a.ts", status: "renamed" }]],
  ["file named docs", [{ filename: "docs" }]],
  ["DOCS in upper case", [{ filename: "DOCS/a.ts" }]],
  ["CLAUDE.md", [{ filename: "pkg/CLAUDE.md" }]],
  ["AGENTS.md", [{ filename: "AGENTS.md" }]],
  ["PR template", [{ filename: "PULL_REQUEST_TEMPLATE.md" }]],
  ["markdown under .github", [{ filename: ".github/x.md" }]],
  ["markdown under .claude", [{ filename: ".claude/uloge/a.md" }]],
  ["issue template", [{ filename: "ISSUE_TEMPLATE/greska.md" }]],
  [".markdown", [{ filename: "a.markdown" }]],
  ["empty segment", [{ filename: "docs//a.ts" }]],
  ["docs renamed from an excluded path", [{ filename: "docs/a.md", previous_filename: "CLAUDE.md" }]],
  ["nested docs folder", [{ filename: "pkg/docs/a.ts" }]],
  ["traversal out of docs", [{ filename: "docs/../a.ts" }]],
  ["entry without filename", [{ status: "added" }]],
  ["filename not a string", [{ filename: 1 }]],
  ["null entry", [null]],
];
for (const [name, files] of code) {
  test(`changes code: ${name}`, () => {
    assert.equal(isDocsOnly(files), false);
    assert.equal(checkTestsTable("", files).ok, false);
  });
}

const docs = [
  ["docs folder", DOCS],
  ["markdown anywhere, any case", [{ filename: "README.MD" }, { filename: "a/b/notes.Md" }]],
  ["code-looking file under docs", [{ filename: "docs/x.ts" }]],
  ["image under docs", [{ filename: "docs/design/a.png" }]],
  ["removed doc", [{ filename: "docs/old.md", status: "removed" }]],
  ["doc renamed to doc", [{ filename: "docs/b.md", previous_filename: "notes.md", status: "renamed" }]],
];
for (const [name, files] of docs) {
  test(`docs PR passes without a table: ${name}`, () => {
    assert.equal(isDocsOnly(files), true);
    assert.equal(checkTestsTable(null, files).ok, true);
  });
}

// listFiles over a fake fetch: every page is read, and any doubt is an error.
function fakeFetch(pages) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const page = Number(new URL(url).searchParams.get("page"));
    const p = pages[page - 1] ?? [];
    if (p instanceof Error) throw p;
    if (typeof p === "number") return { ok: false, status: p, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => p };
  };
  return { fn, calls };
}
const many = (n, name) => Array.from({ length: n }, (_, i) => ({ filename: name(i) }));

test("listFiles reads past the first page, so code on page 2 is seen", async () => {
  const { fn, calls } = fakeFetch([many(100, (i) => `docs/${i}.md`), [{ filename: "src/a.ts" }]]);
  const files = await listFiles({ repo: "o/r", number: 7, token: "t", fetch: fn });
  assert.equal(files.length, 101);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /^https:\/\/api\.github\.com\/repos\/o\/r\/pulls\/7\/files\?per_page=100&page=1$/);
  assert.equal(isDocsOnly(files), false);
});

for (const [name, pages] of [
  ["HTTP 500", [500]],
  ["HTTP 403", [403]],
  ["network error", [new Error("reset")]],
  ["not an array", [{ message: "x" }]],
  ["error on page 2", [many(100, (i) => `${i}.md`), 500]],
]) {
  test(`listFiles throws on ${name}`, async () => {
    await assert.rejects(listFiles({ repo: "o/r", number: 7, token: "t", fetch: fakeFetch(pages).fn }));
  });
}

test("listFiles throws at the API limit of 3000 files instead of guessing", async () => {
  const full = Array.from({ length: 31 }, () => many(100, (i) => `${i}.md`));
  await assert.rejects(listFiles({ repo: "o/r", number: 7, token: "t", fetch: fakeFetch(full).fn }), /3000/);
});

test("the shared PR template has the table, and its untouched row fails", () => {
  const template = readFileSync(new URL("../PULL_REQUEST_TEMPLATE.md", import.meta.url), "utf8");
  const r = checkTestsTable(template, CODE);
  assert.equal(r.ok, false);
  assert.match(r.message, /predložak/);
  assert.equal(checkTestsTable(template.replace("| <…> | <…> | da |", "| a | b | da |"), CODE).ok, true);
});

test("no message repeats body text, so the body cannot inject workflow commands", () => {
  for (const evil of ["::stop-commands::x", "::error::x", "%0A::warning::x"]) {
    for (const text of [body(`| ${evil} | b | ne |`), body(`| a | ${evil} | |`), `${evil}\n`, body(`| ${evil} |`, `## ${evil}`)]) {
      const r = checkTestsTable(text, CODE);
      assert.equal(r.ok, false);
      assert.doesNotMatch(r.message, /::|%0A|stop-commands|warning/);
    }
  }
});

// run(): the PR and its files are read fresh from the API; any doubt throws.
const SHA = "a".repeat(40);
const EVENT = { pull_request: { number: 7, head: { sha: SHA } } };
function api({ pr = {}, files = CODE, status = 200 } = {}) {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === "/repos/o/r/pulls/7") {
      const data = { head: { sha: SHA }, body: GOOD, changed_files: files.length, ...pr };
      return { ok: status === 200, status, json: async () => data };
    }
    if (u.pathname === "/repos/o/r/pulls/7/files") return { ok: true, status: 200, json: async () => files };
    throw new Error(`unexpected ${url}`);
  };
}
const go = (opts, event = EVENT) => run({ event, repo: "o/r", token: "t", fetch: api(opts) });

for (const [name, opts, event] of [
  ["event without a PR", {}, { ref: "refs/heads/main" }],
  ["event with a string number", {}, { pull_request: { number: "7", head: { sha: SHA } } }],
  ["head moved after the event", { pr: { head: { sha: "b".repeat(40) } } }],
  ["changed_files differs from the list", { pr: { changed_files: 5 } }],
  ["PR request fails", { status: 404 }],
]) {
  test(`run throws: ${name}`, async () => assert.rejects(go(opts, event)));
}
test("run fails a code PR whose fresh body has no table", async () => {
  assert.equal((await go({ pr: { body: null } })).ok, false);
});
test("run passes a code PR with a table and a docs PR without one", async () => {
  assert.equal((await go()).ok, true);
  assert.equal((await go({ pr: { body: "" }, files: DOCS })).ok, true);
});

test("workflow shape: callable only, read-only, own repo at tool-sha, no expression in run", () => {
  const wf = parse(readFileSync(new URL("../.github/workflows/tests-table.yml", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(wf.on), ["workflow_call"]);
  assert.deepEqual(wf.permissions, {});
  const jobs = Object.values(wf.jobs);
  assert.equal(jobs.length, 1);
  assert.deepEqual(jobs[0].permissions, { contents: "read", "pull-requests": "read" });
  const steps = jobs[0].steps;
  const checkout = steps.filter((s) => String(s.uses).startsWith("actions/checkout@"));
  assert.equal(checkout.length, 1);
  assert.deepEqual(checkout[0].with, { repository: "ductura/.github", ref: "${{ inputs.tool-sha }}", "persist-credentials": false });
  for (const s of steps.filter((s) => s.run)) assert.doesNotMatch(s.run, /\$\{\{/);
  assert.ok(steps.some((s) => s.run?.includes("^[0-9a-f]{40}$") && s.env?.TOOL_SHA === "${{ inputs.tool-sha }}"));
  assert.ok(steps.some((s) => s.run === "node scripts/tests-table.mjs"));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { compare, runFixture } from "./tests-table-self-test.mjs";
import { checkRenderedTable, isDocsOnly, listFiles, run } from "./tests-table.mjs";

const CODE = [{ filename: "src/a.ts", status: "modified" }];
const DOCS = [{ filename: "docs/PLAN.md", status: "modified" }];
// Hand-made HTML in the shape of GitHub's body_html (see the captured
// fixtures in fixtures/tests-table for the real thing).
const TH = "<thead>\n<tr>\n<th>Kriterij</th>\n<th>Test</th>\n<th>Pada bez promjene</th>\n</tr>\n</thead>\n";
const tr = (...cells) => `<tr>\n${cells.map((c) => `<td>${c}</td>`).join("\n")}\n</tr>\n`;
const table = (rows, head = TH) => `<markdown-accessiblity-table><table role="table">\n${head}<tbody>\n${rows}</tbody>\n</table></markdown-accessiblity-table>\n`;
const page = (inner, heading = '<h2 dir="auto">Testovi prihvata</h2>') =>
  `<p dir="auto">Opis.</p>\n${heading}\n${inner}<h2 dir="auto">Dokaz</h2>\n<p dir="auto">x</p>\n`;
const GOOD = page(table(tr("a", "b", "da")));

// Negative cases first: a code PR without a table GitHub displays fails.
const failing = [
  ["null body_html", null],
  ["empty body_html", ""],
  ["no heading", table(tr("a", "b", "da"))],
  ["heading only", page("")],
  ["h3 heading", page(table(tr("a", "b", "da")), '<h3 dir="auto">Testovi prihvata</h3>')],
  ["two headings", GOOD + '<h2 dir="auto">Testovi prihvata</h2>\n'],
  ["table under the next heading", page("") + table(tr("a", "b", "da"))],
  ["table in a code block", page('<pre class="notranslate"><code>| Kriterij | Test | Pada bez promjene |\n|---|---|---|\n| a | b | da |\n</code></pre>\n')],
  ["wrong header names", page(table(tr("a", "b", "da"), "<thead><tr><th>A</th><th>B</th><th>C</th></tr></thead>"))],
  ["two header cells", page(table(tr("a", "b"), "<thead><tr><th>Kriterij</th><th>Test</th></tr></thead>"))],
  ["no thead (raw table, th in tbody)", page("<table><tbody><tr><th>Kriterij</th><th>Test</th><th>Pada bez promjene</th></tr>" + tr("a", "b", "da") + "</tbody></table>")],
  ["no tbody", page('<table role="table">\n' + TH + "</table>\n")],
  ["two cells in a row", page(table(tr("a", "da")))],
  ["four cells in a row", page(table(tr("a", "b", "da", "x")))],
  ["th in a body row", page(table("<tr><th>a</th><td>b</td><td>da</td></tr>"))],
  ["tfoot", page(table(tr("a", "b", "da")).replace("</tbody>", "</tbody><tfoot><tr><td>x</td></tr></tfoot>"))],
  ["caption", page(table(tr("a", "b", "da")).replace("<thead>", "<caption>x</caption><thead>"))],
  ["nested table", page(table(tr("<table><tr><td>x</td></tr></table>", "b", "da")))],
  ["colspan", page(table('<tr><td colspan="2">a</td><td>da</td></tr>'))],
  ["rowspan", page(table('<tr><td rowspan="2">a</td><td>b</td><td>da</td></tr>'))],
  ["COLSPAN in upper case after another attribute", page(table('<tr><td align="left" COLSPAN=2>a</td><td>da</td></tr>'))],
  ["empty cell", page(table(tr("a", "", "da")))],
  ["&nbsp; cell", page(table(tr("a", "&nbsp;", "da")))],
  ["<br> cell", page(table(tr("a", "<br>", "da")))],
  ["U+034F cell", page(table(tr("a", "͏", "da")))],
  ["U+200B cell", page(table(tr("a", "&#x200B;", "da")))],
  ["U+3164 cell", page(table(tr("a", "ㅤ", "da")))],
  ["U+2800 cells", page(table(tr("⠀", "⠀", "da")))],
  ["punctuation-only cell", page(table(tr("a", "—.-", "da")))],
  ["attribute text is not cell text", page(table(tr("a", '<img alt="x>abc">', "da")))],
  ["template placeholder", page(table(tr("&lt;…&gt;", "&lt;…&gt;", "da")))],
  ["decoded placeholder", page(table(tr("&lt;opis&gt;", "b", "da")))],
  ["math in a cell", page(table(tr('<math-renderer class="js-inline-math">$\\phantom{x}$</math-renderer>', "b", "da")))],
  ["third cell ne", page(table(tr("a", "b", "ne")))],
  ["third cell Cyrillic da", page(table(tr("a", "b", "да")))],
  ["third cell da.", page(table(tr("a", "b", "da.")))],
  ["third cell struck out", page(table(tr("a", "b", "<del>da</del>")))],
  ["one good, one bad row", page(table(tr("a", "b", "da") + tr("c", "d", "ne")))],
];
for (const [name, html] of failing) {
  test(`code PR fails: ${name}`, () => {
    const r = checkRenderedTable(html, CODE);
    assert.equal(r.ok, false, r.message);
  });
}

// HTML GitHub never sends, and broken entities, fail closed (a thrown error).
for (const [name, html] of [
  ["comment", page("<!-- x -->" + table(tr("a", "b", "da")))],
  ["CDATA", page("<![CDATA[x]]>" + table(tr("a", "b", "da")))],
  ["processing instruction", page("<?x?>" + table(tr("a", "b", "da")))],
  ["script", page("<script>x</script>" + table(tr("a", "b", "da")))],
  ["unclosed tag", page(table(tr("a", "b", "da"))) + "<td"],
  ["unclosed quote", page(table(tr('a<img alt="x>', "b", "da")))],
  ["unknown entity", page(table(tr("a&bogus;", "b", "da")))],
  ["&#0;", page(table(tr("a&#0;", "b", "da")))],
  ["surrogate", page(table(tr("a&#xD800;", "b", "da")))],
  ["above U+10FFFF", page(table(tr("a&#x110000;", "b", "da")))],
]) {
  test(`unreadable HTML throws: ${name}`, () => assert.throws(() => checkRenderedTable(html, CODE)));
}

const passing = [
  ["filled table", GOOD],
  ["code, strong and &amp; in cells", page(table(tr("a &amp; b", '<code class="notranslate">x.test.ts</code> <strong>y</strong>', "<strong>Da</strong>")))],
  ["&amp;lt;x&amp;gt; is text, not a placeholder", page(table(tr("&amp;lt;x&amp;gt;", "b", "da")))],
  ["align attributes", page(table('<tr><td align="left">a</td><td align="center">b</td><td align="right">da</td></tr>'))],
  ["colspan only inside a link", page(table(tr("a", '<a href="https://example.org/?colspan=2&amp;rowspan=3" rel="nofollow">test</a>', "da")))],
  ["colspan only inside an attribute value", page(table('<tr><td title="colspan=2">a</td><td data-x=\'rowspan = 2\'>b</td><td>da</td></tr>'))],
  ["digits only", page(table(tr("1", "2", "da")))],
  ["several rows and tbodies", page(table(tr("a", "b", "da")) + "").replace("</tbody>", "</tbody><tbody>" + tr("c", "d", "DA") + "</tbody>")],
  ["new heading shape with an anchor", page(table(tr("a", "b", "da")), '<div class="markdown-heading" dir="auto"><h2 class="heading-element" dir="auto">Testovi prihvata</h2><a id="user-content-testovi-prihvata" class="anchor" aria-label="Permalink: Testovi prihvata" href="#testovi-prihvata"><svg class="octicon"><path d="M7"></path></svg></a></div>')],
  ["text before the table", page('<p dir="auto">Uvod.</p>\n' + table(tr("a", "b", "da")))],
];
for (const [name, html] of passing) {
  test(`code PR passes: ${name}`, () => {
    const r = checkRenderedTable(html, CODE);
    assert.equal(r.ok, true, r.message);
  });
}

test("no message repeats body text, so the body cannot inject workflow commands", () => {
  for (const evil of ["::stop-commands::x", "::error::x", "%0A::warning::x"]) {
    for (const html of [page(table(tr(evil, "b", "ne"))), page(table(tr("a", evil, ""))), page(evil), page(table(tr(evil, "b", "da")), `<h2>${evil}</h2>`)]) {
      const r = checkRenderedTable(html, CODE);
      assert.doesNotMatch(r.message, /::|%0A|stop-commands|warning/);
    }
  }
});

test("linear time over about 1 MB of HTML", () => {
  const start = Date.now();
  checkRenderedTable(page(table(tr("a", "b", "da").repeat(20000))) + "<p>x</p>".repeat(30000), CODE);
  checkRenderedTable("<p>" + "&amp;".repeat(200000) + "</p>", CODE);
  assert.ok(Date.now() - start < 2000);
});

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
    assert.equal(checkRenderedTable("", files).ok, false);
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
    assert.equal(checkRenderedTable(null, files).ok, true);
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


test("listFiles asks for JSON, and run asks pulls/<n> for rendered HTML", async () => {
  const accepts = {};
  const fetchFn = async (url, init) => {
    const u = new URL(url);
    accepts[u.pathname] = init.headers.accept;
    const data = u.pathname.endsWith("/files") ? CODE : { head: { sha: SHA }, body_html: GOOD, changed_files: 1 };
    return { ok: true, status: 200, json: async () => data };
  };
  await run({ event: EVENT, repo: "o/r", token: "t", fetch: fetchFn });
  assert.equal(accepts["/repos/o/r/pulls/7"], "application/vnd.github.html+json");
  assert.equal(accepts["/repos/o/r/pulls/7/files"], "application/vnd.github+json");
});

// run(): the PR and its files are read fresh from the API; any doubt throws.
const SHA = "a".repeat(40);
const EVENT = { pull_request: { number: 7, head: { sha: SHA } } };
function api({ pr = {}, files = CODE, status = 200 } = {}) {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === "/repos/o/r/pulls/7") {
      const data = { head: { sha: SHA }, body_html: GOOD, changed_files: files.length, ...pr };
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
  ["body_html missing on a code PR", { pr: { body_html: undefined, body: "x" } }],
]) {
  test(`run throws: ${name}`, async () => assert.rejects(go(opts, event)));
}
test("run fails a code PR whose rendered body has no table", async () => {
  assert.equal((await go({ pr: { body_html: "" } })).ok, false);
});
test("run passes a code PR with a table, and a docs PR without body_html", async () => {
  assert.equal((await go()).ok, true);
  assert.equal((await go({ pr: { body_html: null }, files: DOCS })).ok, true);
});

// Captured fixtures: GitHub's own rendering of invented bodies. A fixture
// must say where it came from, and every non-docs fixture holds real HTML.
const FIXTURES = new URL("../fixtures/tests-table/", import.meta.url);
const fixtureNames = readdirSync(FIXTURES).filter((f) => f.endsWith(".json"));
test("captured fixtures carry their source and cover the template and #28's cases", () => {
  const names = fixtureNames.map((f) => f.slice(0, -5));
  for (const want of ["template", "filled-template", "code-fence", "zero-rows", "comment-only", "math-cell", "mixed-indent", "fence-between", "line-separator", "cdata"]) {
    assert.ok(names.includes(want), want);
  }
  for (const f of fixtureNames) {
    const fx = JSON.parse(readFileSync(new URL(f, FIXTURES), "utf8"));
    assert.equal(typeof fx.source, "string", f);
    if (f !== "docs-only.json") assert.match(fx.source, /^Verbatim body_html, captured \d{4}-\d{2}-\d{2}/, f);
  }
  const template = JSON.parse(readFileSync(new URL("template.json", FIXTURES), "utf8"));
  assert.equal(template.markdown, readFileSync(new URL("../PULL_REQUEST_TEMPLATE.md", import.meta.url), "utf8"));
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
  const real = steps.find((s) => s.run === "node scripts/tests-table.mjs");
  assert.equal(real?.if, "${{ inputs.self-test == '' }}");
  assert.equal(real?.env?.GITHUB_TOKEN, "${{ github.token }}");
  const self = steps.find((s) => s.run?.startsWith("node scripts/tests-table-self-test.mjs"));
  assert.equal(self?.if, "${{ inputs.self-test != '' }}");
  assert.equal(JSON.stringify(self?.env ?? {}).includes("token"), false, "the self-test gets no token");
});

// The self-test over fixtures/tests-table: each fixture gives its expected
// outcome, and a fixture with the opposite expectation is reported, so the
// self-test job cannot stay green when the runner's verdict flips.
for (const name of readdirSync(FIXTURES).filter((f) => f.endsWith(".json"))) {
  test(`self-test fixture ${name}: runner matches, flipped expectation is caught`, async () => {
    const fixture = JSON.parse(readFileSync(new URL(name, FIXTURES), "utf8"));
    const outcome = await runFixture(fixture);
    assert.deepEqual(compare(fixture, outcome), []);
    const flipped = { ...fixture, expect: { ...fixture.expect, exit: 1 - fixture.expect.exit } };
    assert.notDeepEqual(compare(flipped, outcome), []);
  });
}

test("self-test.yml runs tests-table.yml over every fixture, at least one passing and one failing", () => {
  const wf = parse(readFileSync(new URL("../.github/workflows/self-test.yml", import.meta.url), "utf8"));
  const job = wf.jobs["tests-table"];
  assert.equal(job.uses, "./.github/workflows/tests-table.yml");
  assert.equal(job.with["self-test"], "${{ matrix.case }}");
  const cases = job.strategy.matrix.case;
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  assert.deepEqual([...cases].sort(), files.sort());
  const exits = files.map((f) => JSON.parse(readFileSync(new URL(`${f}.json`, FIXTURES), "utf8")).expect.exit);
  assert.ok(exits.includes(0) && exits.includes(1));
});

// The template and the check agree both ways (DAN-948-3): the untouched
// template fails (fixture template), and the template with only its
// placeholder row filled passes. Both fixtures hold the current template's
// markdown, so a template change without a new capture fails here.
const PLACEHOLDER_ROW = /^\| <…> \| <…> \| da \|\n/gm;
function fillTemplate(template, row) {
  const found = template.match(PLACEHOLDER_ROW)?.length ?? 0;
  if (found !== 1) throw new Error(`the template needs exactly one placeholder row, found ${found}`);
  return template.replace(PLACEHOLDER_ROW, row);
}
const FILLED_ROW = "| popunjen predložak prolazi provjeru | `scripts/tests-table.test.mjs` „filled template” | da |\n";
const PLACEHOLDER_CELLS = "<td>&lt;…&gt;</td>\n<td>&lt;…&gt;</td>\n<td>da</td>";
const FILLED_CELLS = '<td>popunjen predložak prolazi provjeru</td>\n<td><code class="notranslate">scripts/tests-table.test.mjs</code> „filled template”</td>\n<td>da</td>';
const TEMPLATE = readFileSync(new URL("../PULL_REQUEST_TEMPLATE.md", import.meta.url), "utf8");
const readFixture = (name) => JSON.parse(readFileSync(new URL(name, FIXTURES), "utf8"));
// Problems that tie the two template captures to the current template and to
// each other; empty when they agree. The filled capture must be the untouched
// one with only the placeholder cells filled, so neither HTML can go stale alone.
function templateCaptureProblems(template, untouched, filled) {
  const problems = [];
  if (untouched.markdown !== template) problems.push("untouched markdown is not the template");
  if (filled.markdown !== fillTemplate(template, FILLED_ROW)) problems.push("filled markdown is not the template with its row filled");
  const separators = template.match(/^\|(?: *:?-{3,}:? *\|)+ *$/gm)?.length ?? 0;
  if (untouched.pr.body_html.split("<table").length - 1 !== separators) problems.push("untouched HTML has another number of tables than the template");
  if (untouched.pr.body_html.split(PLACEHOLDER_CELLS).length !== 2) problems.push("untouched HTML lacks exactly one placeholder row");
  if (filled.pr.body_html !== untouched.pr.body_html.replace(PLACEHOLDER_CELLS, FILLED_CELLS)) problems.push("filled HTML is not the untouched HTML with its row filled");
  return problems;
}

test("filled template: a template without, or with two, placeholder rows is refused", () => {
  const row = "| <…> | <…> | da |\n";
  for (const bad of [TEMPLATE.replace(row, ""), TEMPLATE.replace(row, row + row), TEMPLATE.replace(row, row.replace("\n", "\r\n")), TEMPLATE.replace(row, `  ${row}`), TEMPLATE.replace(row, row.replace("…", "..."))]) {
    assert.throws(() => fillTemplate(bad, FILLED_ROW), /exactly one placeholder row/);
  }
});
test("filled template: captures that drift from the template or from each other are refused", () => {
  const untouched = readFixture("template.json");
  const filled = readFixture("filled-template.json");
  const pr = (fx, body_html) => ({ ...fx, pr: { ...fx.pr, body_html } });
  const extraTable = TEMPLATE.replace("## Dokaz\n", "| a | b |\n|---|---|\n| c | d |\n\n## Dokaz\n");
  const cases = [
    ["markdown changed outside the row", TEMPLATE, untouched, { ...filled, markdown: filled.markdown.replace("**Što:**", "**Sto:**") }],
    ["template changed, markdown not recaptured", TEMPLATE.replace("## Dokaz\n", "## Dokazi\n"), untouched, filled],
    ["template and markdown changed, HTML stale", extraTable, { ...untouched, markdown: extraTable }, { ...filled, markdown: fillTemplate(extraTable, FILLED_ROW) }],
    ["forged filled HTML", TEMPLATE, untouched, pr(filled, `<h2 dir="auto">Testovi prihvata</h2>\n<table><thead><tr><th>Kriterij</th><th>Test</th><th>Pada bez promjene</th></tr></thead><tbody><tr>${FILLED_CELLS}</tr></tbody></table>`)],
    ["filled HTML differs outside the row", TEMPLATE, untouched, pr(filled, filled.pr.body_html.replace("<h2 dir=\"auto\">Dokaz</h2>", "<h2 dir=\"auto\">Dokazi</h2>"))],
  ];
  for (const [name, template, u, f] of cases) assert.notDeepEqual(templateCaptureProblems(template, u, f), [], name);
});
test("filled template is the template with only its placeholder row filled, and passes", () => {
  const untouched = readFixture("template.json");
  const filled = readFixture("filled-template.json");
  assert.deepEqual(templateCaptureProblems(TEMPLATE, untouched, filled), []);
  assert.ok(!filled.pr.body_html.includes("&lt;…&gt;</td>"));
  assert.equal(isDocsOnly(filled.files), false);
  assert.deepEqual(checkRenderedTable(filled.pr.body_html, filled.files), { ok: true, message: "Tablica testova ima 1 popunjen(ih) redak(a)." });
  assert.equal(checkRenderedTable(untouched.pr.body_html, untouched.files).ok, false);
});

// A broken check must turn the self-test step red (DAN-948-2). Each mutant
// copies the runner and the self-test into a temp dir (the self-test finds
// the runner next to itself), replaces one exported function of the copy
// and runs the self-test script over every captured fixture as the
// workflow step does. The exported name must occur exactly once, so a
// mutant is never the unchanged check.
const SCRIPTS = new URL("./", import.meta.url);
const fixtureCases = fixtureNames.map((f) => {
  const fx = JSON.parse(readFileSync(new URL(f, FIXTURES), "utf8"));
  return { path: fileURLToPath(new URL(f, FIXTURES)), fixture: fx, code: !isDocsOnly(fx.files) };
});
function copy(mutate = {}, selfTest = (s) => s) {
  // Real path: the copied self-test runs only when argv[1] is its own path.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "tests-table-mutant-")));
  let runner = readFileSync(new URL("tests-table.mjs", SCRIPTS), "utf8");
  for (const [name, body] of Object.entries(mutate)) {
    const signature = `export function ${name}(`;
    assert.equal(runner.split(signature).length, 2, `${signature} occurs exactly once`);
    runner = runner.replace(signature, `function original_${name}(`) + `\nexport function ${name}() { ${body} }\n`;
  }
  writeFileSync(join(dir, "tests-table.mjs"), runner);
  writeFileSync(join(dir, "tests-table-self-test.mjs"), selfTest(readFileSync(new URL("tests-table-self-test.mjs", SCRIPTS), "utf8")));
  return dir;
}
const selfTestExit = (dir, path) => {
  const r = spawnSync(process.execPath, [join(dir, "tests-table-self-test.mjs"), path], { encoding: "utf8", timeout: 20_000, killSignal: "SIGKILL" });
  assert.equal(r.error, undefined, "the self-test finished in time");
  return { exit: r.status, output: r.stdout };
};
const withCopy = (dir, fn) => {
  try {
    fn();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const MUTANTS = [
  ["always passes", { checkRenderedTable: 'return { ok: true, message: "ok" };' }, (c) => c.fixture.expect.exit === 1],
  ["always fails", { checkRenderedTable: 'return { ok: false, message: "x" };' }, (c) => c.fixture.expect.exit === 0],
  ["throws", { checkRenderedTable: 'throw new Error("mutant");' }, () => true],
  ["treats every PR as docs", { isDocsOnly: "return true;" }, (c) => c.code && c.fixture.expect.exit === 1],
];

test("unbroken copy passes the self-test step over every fixture", () => {
  const dir = copy();
  withCopy(dir, () => {
    for (const c of fixtureCases) {
      const { exit, output } = selfTestExit(dir, c.path);
      assert.equal(exit, 0, c.path);
      assert.match(output, /: exit [01] as expected\n$/, c.path);
    }
  });
});
for (const [name, mutate, caught] of MUTANTS) {
  test(`broken check fails the self-test step: ${name}`, () => {
    const dir = copy(mutate);
    const hit = fixtureCases.filter(caught);
    assert.ok(hit.length > 0);
    withCopy(dir, () => {
      for (const c of hit) {
        const { exit, output } = selfTestExit(dir, c.path);
        assert.equal(exit, 1, c.path);
        // A failing fixture exits 1 either way; the output comparison catches it.
        if (name === "throws") assert.equal(output.includes(`> ${c.fixture.expect.output}`), false, c.path);
      }
    });
  });
}
// The tests above can fail: a self-test that compares nothing lets every mutant through.
test("a self-test that compares nothing lets every mutant through", () => {
  const blind = (s) => {
    const signature = "export function compare(fixture, outcome) {";
    assert.equal(s.split(signature).length, 2);
    return s.replace(signature, `${signature}\n  return [];`);
  };
  for (const [name, mutate] of MUTANTS) {
    const dir = copy(mutate, blind);
    withCopy(dir, () => {
      for (const c of fixtureCases) assert.equal(selfTestExit(dir, c.path).exit, 0, `${name}: ${c.path}`);
    });
  }
});
// A red self-test step reaches ci-ok: needs and always() are in ci-ok.test.mjs.
test("tests-table failure is never softened: no continue-on-error, fail-fast off, not allowed to skip", () => {
  const read = (f) => parse(readFileSync(new URL(`../.github/workflows/${f}`, import.meta.url), "utf8"));
  const reusable = read("tests-table.yml");
  const selfTest = read("self-test.yml");
  const job = selfTest.jobs["tests-table"];
  // The step runs exactly the script the mutant tests run, over its own case, and nothing swallows its exit.
  const [own] = Object.values(reusable.jobs);
  assert.equal(own["timeout-minutes"], 5);
  const step = own.steps.find((s) => s.if === "${{ inputs.self-test != '' }}");
  assert.equal(step.run, 'node scripts/tests-table-self-test.mjs "fixtures/tests-table/$SELF_TEST.json"');
  assert.equal(step.shell, undefined);
  assert.deepEqual(step.env, { SELF_TEST: "${{ inputs.self-test }}" });
  for (const j of [...Object.values(reusable.jobs), job]) assert.equal(j["continue-on-error"], undefined);
  for (const s of Object.values(reusable.jobs).flatMap((j) => j.steps)) assert.equal(s["continue-on-error"], undefined);
  assert.equal(job.strategy["fail-fast"], false);
  const skips = [selfTest.jobs["ci-ok-reusable"].with["allow-skipped"], ...selfTest.jobs["ci-ok"].steps.map((s) => s.env?.ALLOW_SKIPPED)];
  for (const v of skips.filter((v) => v !== undefined)) assert.doesNotMatch(String(v), /tests-table/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { checkRenderedTable, checkTestsTable, isDocsOnly } from "./tests-table.mjs";

// fixtures/tests-table/rendered.html is GitHub's own HTML, unchanged: body_html
// of GET repos/danielrisavi77-create/Ductus/issues/comments/6954800312
// (Accept: application/vnd.github.full+json), 17. 11. 2026. Each CASE-<name>
// block there was Markdown that GitHub rendered into this HTML.
const CAPTURE = readFileSync(new URL("../fixtures/tests-table/rendered.html", import.meta.url), "utf8");
test("capture is unchanged", () => {
  const sha = createHash("sha256").update(CAPTURE).digest("hex");
  assert.equal(sha, "3806567191bcdc8cae0e9a7451952c90ab833e9ad4184433d66ce53e4306afa1");
});
const cased = (name) => {
  const m = new RegExp(`CASE-${name}-START</p>([\\s\\S]*?)<p dir="auto">CASE-${name}-END`).exec(CAPTURE);
  assert.ok(m, `missing capture ${name}`);
  return m[1];
};
// The "rows" capture is one table with many rows; one row at a time with its header.
const ROWS = cased("rows");
const [HEAD, TAIL] = [ROWS.slice(0, ROWS.indexOf("<tbody>") + 7), ROWS.slice(ROWS.lastIndexOf("</tbody>"))];
const ROW = [...ROWS.matchAll(/<tr>[\s\S]*?<\/tr>/g)].slice(1).map((m) => m[0]);
const row = (...n) => HEAD + n.map((k) => ROW[k]).join("\n") + TAIL;
const CODE = [{ filename: "src/a.ts", status: "modified" }];
const DOCS = [{ filename: "docs/PLAN.md", status: "modified" }];

// Negative cases first: a code PR without a shown, filled table fails.
const failing = [
  ["null body", null],
  ["empty body", ""],
  // Classes that broke the text parser of #28: GitHub shows no table of ours here.
  ...["fenced", "tilde", "indent4", "indenttab", "indentspacetab", "pre", "comment", "fencebetween", "twocols"]
    .map((n) => [`no table of ours in the rendered HTML: ${n}`, cased(n)]),
  // CDATA is not kept: GitHub shows the table with "]]>" as one more, empty row.
  ["CDATA: the closing ]]> becomes an empty row", cased("cdata")],
  ["header only", cased("headeronly")],
  ...[[1, "empty"], [2, "NBSP"], [3, "&nbsp;"], [4, "U+200B"], [5, "U+034F"], [6, "U+3164"], [7, "U+2800"], [8, "U+FEFF U+00AD"],
    [9, "punctuation only"], [10, "emoji only"], [11, "<br>"], [12, "template row <…>"], [13, "third cell ne"], [14, "da."],
    [15, "Cyrillic да"], [16, "third cell empty"], [18, "&#x200B;"], [21, "missing third cell"]]
    .map(([k, n]) => [`row: ${n}`, row(k)]),
  ["a good row, then a bad one", row(0, 1)],
  ["a good table and a bad one", cased("aligned") + row(13)],
  ["raw table without thead", cased("rawnothead")],
];
for (const [name, html] of failing) {
  test(`code PR fails: ${name}`, () => {
    const r = checkTestsTable(html, CODE);
    assert.equal(r.ok, false, r.message);
    assert.ok(r.message.length > 0);
  });
}

// Hand-made HTML for what the renderer would never emit, so the reader fails closed.
const T = (body) => `<table><thead><tr><th>Kriterij</th><th>Test</th><th>Pada bez promjene</th></tr></thead><tbody>${body}</tbody></table>`;
const handMade = [
  ["<!--> before a bad table", `<!-->${T("<tr><td></td><td>b</td><td>da</td></tr>")}-->${T("<tr><td>a</td><td>b</td><td>da</td></tr>")}`],
  ["<!---> anywhere", `<!--->${T("<tr><td>a</td><td>b</td><td>da</td></tr>")}`],
  ["<? anywhere", `<?x?>${T("<tr><td>a</td><td>b</td><td>da</td></tr>")}`],
  ["uppercase tags", T("<tr><td>a</td><td>b</td><td>da</td></tr>").toUpperCase().replace(/>DA</g, ">da<")],
  ["<br/>", T("<tr><td>a<br/></td><td>b</td><td>da</td></tr>")],
  ["single-quoted attribute", T("<tr><td align='left'>a</td><td>b</td><td>da</td></tr>")],
  ["hidden", T("<tr><td><span hidden>a</span></td><td>b</td><td>da</td></tr>").replace("span hidden", "em hidden").replace("/span", "/em")],
  ["aria-hidden", T('<tr><td><strong aria-hidden="true">a</strong></td><td>b</td><td>da</td></tr>')],
  ["th colspan with our header", T("<tr><td>a</td><td>b</td><td>da</td></tr>").replace("<th>Kriterij</th>", '<th colspan="1">Kriterij</th>')],
  ["one decoding pass: &amp;#100;&amp;#97; is not da", T("<tr><td>a</td><td>b</td><td>&amp;#100;&amp;#97;</td></tr>")],
  ["bare &", T("<tr><td>&</td><td>b</td><td>da</td></tr>")],
  ["huge numeric entity", T("<tr><td>a&#99999999999;</td><td>b</td><td>da</td></tr>")],
  ["tag outside the inline list", T("<tr><td><img src=x>a</td><td>b</td><td>da</td></tr>")],
  ["details in a cell", T("<tr><td><details><summary></summary>a</details></td><td>b</td><td>da</td></tr>")],
  ["nested table", T(`<tr><td>${T("<tr><td>a</td><td>b</td><td>da</td></tr>")}</td><td>b</td><td>da</td></tr>`)],
  ["colspan", T('<tr><td colspan="3">a b da</td></tr>')],
  ["text between rows", T("<tr><td>a</td><td>b</td><td>da</td></tr>x")],
  ["attribute with > hides nothing", T('<tr><td><a title="a>b"></a></td><td>b</td><td>da</td></tr>')],
  ["outer table with ours in a cell", `<table><tbody><tr><td>${T("<tr><td></td><td>b</td><td>da</td></tr>")}</td></tr></tbody></table>`],
  ["&amp; alone", T("<tr><td>&amp;</td><td>b</td><td>da</td></tr>")],
  ["inherited key as entity: &constructor;", T("<tr><td>a</td><td>&constructor;</td><td>da</td></tr>")],
  ["inherited key as attribute: constructor", T('<tr><td constructor="x">a</td><td>b</td><td>da</td></tr>')],
  ["inherited key as attribute: __proto__", T('<tr><td __proto__="x">a</td><td>b</td><td>da</td></tr>')],
  ["DEL-only cell", T("<tr><td>a</td><td>\u007f</td><td>da</td></tr>")],
  ["tab and CR only cell", T("<tr><td>a</td><td>\t\r\n</td><td>da</td></tr>")],
  ["unknown named entity", T("<tr><td>a&zwnj;</td><td>b</td><td>da</td></tr>")],
  ...["&#0;", "&#xD800;", "&#x110000;"].map((e) => [`entity ${e}`, T(`<tr><td>a${e}</td><td>b</td><td>da</td></tr>`)]),
  ["unclosed table", T("<tr><td>a</td><td>b</td><td>da</td></tr>").replace("</tbody></table>", "")],
  ["stray <", T("<tr><td>a</td><td>b</td><td>da</td></tr>") + "<"],
  ["style on a cell", T('<tr><td style="display:none">a</td><td>b</td><td>da</td></tr>')],
  ["table only in a comment", `<!-- ${T("<tr><td>a</td><td>b</td><td>da</td></tr>")} -->`],
  ["<tablex> is not a table", T("<tr><td>a</td><td>b</td><td>da</td></tr>").replace("<table>", "<tablex>").replace("</table>", "</tablex>")],
  ["not a string", 7],
];
for (const [name, html] of handMade) {
  test(`code PR fails (hand-made): ${name}`, () => assert.equal(checkTestsTable(html, CODE).ok, false));
}

const passing = [
  ["one filled row", row(0)],
  ["code, strong, link, & and Da", row(17, 19)],
  ["aligned columns", cased("aligned")],
  ["inside <details>", cased("details")],
  ["raw HTML table in GFM shape", cased("rawtable")],
  // GitHub joins lines split by U+2028 or U+2029 into a table, so they pass.
  ["rows split by U+2028", cased("u2028")],
  ["rows split by U+2029", cased("u2029")],
  ["a fourth cell GitHub drops", row(20)],
  ["CRLF line ends", cased("aligned").replace(/\n/g, "\r\n")],
  ["numeric entities decode once: &#100;&#97;", T("<tr><td>a</td><td>b</td><td>&#100;&#x61;</td></tr>")],
];
for (const [name, html] of passing) {
  test(`code PR passes: ${name}`, () => {
    const r = checkTestsTable(html, CODE);
    assert.equal(r.ok, true, r.message);
  });
}

test("docs PR passes without a table", () => {
  assert.equal(checkTestsTable(null, DOCS).ok, true);
  assert.equal(checkTestsTable("", [{ filename: "README.md", status: "added" }]).ok, true);
});

// isDocsOnly is ported verbatim from ductura/.github#28 (52af3a3) with its cases.
test("isDocsOnly: code or doubt is never docs", () => {
  for (const files of [
    [], null, "docs/a.md", [null], [{}], [{ filename: "" }],
    [{ filename: "src/a.ts" }], [{ filename: "docs/a.md" }, { filename: "src/a.ts" }],
    [{ filename: "a.mdx" }], [{ filename: "docs\\x.ts" }], [{ filename: "docs/../src/a.ts" }],
    [{ filename: "docs/./a.ts" }], [{ filename: "docs//a.ts" }], [{ filename: "docs" }],
    [{ filename: "pkg/docs/a.ts" }], [{ filename: "DOCS/a.ts" }], [{ filename: "CLAUDE.md" }],
    [{ filename: "x/AGENTS.md" }], [{ filename: "PULL_REQUEST_TEMPLATE.md" }], [{ filename: ".github/x.md" }],
    [{ filename: ".claude/x.md" }], [{ filename: "ISSUE_TEMPLATE/bug.md" }],
    [{ filename: "docs/a.md", previous_filename: "src/a.ts" }], [{ filename: "docs/a.md", previous_filename: null }],
  ]) assert.equal(isDocsOnly(files), false, JSON.stringify(files));
});

test("isDocsOnly: docs/ and Markdown outside the rule files are docs", () => {
  for (const files of [
    [{ filename: "docs/PLAN.md" }], [{ filename: "docs/x.ts" }], [{ filename: "README.md" }],
    [{ filename: "a/b/NOTES.MD" }], [{ filename: "docs/b.md", previous_filename: "docs/a.md" }],
  ]) assert.equal(isDocsOnly(files), true, JSON.stringify(files));
});

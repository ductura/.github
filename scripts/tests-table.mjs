// DAN-948: a PR that changes code must carry a filled tests table
// (Kriterij | Test | Pada bez promjene: da); a docs-only PR needs none.
// The check never parses Markdown: it reads the HTML GitHub's own renderer
// (POST /markdown, mode gfm) made of the PR body, so only what GitHub really
// shows as a table can pass. Pure functions, nothing is printed; anything the
// reader does not recognise fails (fail closed). Tests: tests-table.test.mjs.

const NOT_DOCS_MD = /^(?:\.github|\.claude|ISSUE_TEMPLATE)\/|(?:^|\/)(?:CLAUDE|AGENTS|PULL_REQUEST_TEMPLATE)\.md$/i;

function isDocsPath(p) {
  if (typeof p !== "string" || p === "" || p.includes("\\")) return false;
  if (p.split("/").some((s) => s === "" || s === "." || s === "..")) return false;
  return p.startsWith("docs/") || (/\.md$/i.test(p) && !NOT_DOCS_MD.test(p));
}

export function isDocsOnly(files) {
  return (
    Array.isArray(files) &&
    files.length > 0 &&
    files.every(
      (f) =>
        f !== null && typeof f === "object" && isDocsPath(f.filename) &&
        (f.previous_filename === undefined || isDocsPath(f.previous_filename)),
    )
  );
}

const HEADER = ["kriterij", "test", "pada bez promjene"];
// Inline tags GitHub keeps in a cell, each with the only attributes it may carry.
const INLINE = {
  a: { href: /^/, rel: /^/ }, b: {}, br: {}, code: { class: /^notranslate$/ }, del: {}, em: {}, i: {}, ins: {},
  kbd: {}, s: {}, strong: {}, sub: {}, sup: {}, "g-emoji": { class: /^g-emoji$/, alias: /^/, "fallback-src": /^/ },
};
const BASIC = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };
// GitHub serialises lowercase tags with name="value" attributes; anything else
// ("<!", "<?", uppercase, "<br/>", a bare "<") is not its output and fails.
const TOKEN = /<(\/?)([a-z][a-z0-9-]*)((?:\s+[a-z][a-z0-9:-]*(?:="[^"]*")?)*)\s*>|([^<]+)|(<)/g;

function tokens(html) {
  const out = [];
  for (const m of html.matchAll(TOKEN)) {
    if (m[5] !== undefined) return null;
    if (m[4] !== undefined) out.push({ text: m[4] });
    else {
      const attrs = Object.fromEntries([...m[3].matchAll(/([a-z][a-z0-9:-]*)(?:="([^"]*)")?/g)].map((a) => [a[1], a[2] ?? ""]));
      out.push({ close: m[1] === "/", name: m[2], attrs });
    }
  }
  return out;
}

// Visible text: entities decoded in one pass (anything doubtful gives null),
// invisible and ignorable code points removed, blanks collapsed, lower case.
function norm(text) {
  let bad = false;
  const decoded = text.replace(/&(?:(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-z0-9#]+);)?/g, (_, e) => {
    if (e !== undefined && Object.hasOwn(BASIC, e)) return BASIC[e];
    const n = e === undefined || e[0] !== "#" ? NaN : e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    if (n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)) return String.fromCodePoint(n);
    bad = true;
    return "";
  });
  if (bad) return null;
  return decoded.replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "").replace(/\s+/gu, " ").trim().toLowerCase();
}

// Lenient header: the text of each cell of the first row, any tags dropped.
function headerOf(t, at) {
  let i = at + 1;
  while (t[i] && !(t[i].name === "tr" && !t[i].close)) i += 1;
  const cells = [];
  for (i += 1; t[i] && !(t[i].name === "tr" && t[i].close); i += 1) {
    if ((t[i].name === "th" || t[i].name === "td") && !t[i].close) cells.push("");
    else if (t[i].text !== undefined && cells.length > 0) cells[cells.length - 1] += t[i].text;
  }
  return cells.map(norm);
}

// Strict reader of the table GFM emits, from the `<table>` token at `at`:
// table > thead > tr > th{3}, tbody > (tr > td{3})+. Rows, or null on any deviation.
function readRows(t, at) {
  let i = at + 1;
  const skip = () => { while (t[i]?.text !== undefined && t[i].text.trim() === "") i += 1; };
  const tag = (name, close) => {
    skip();
    const k = t[i];
    if (!k || k.name !== name || k.close !== close || Object.keys(k.attrs).length > 0) return false;
    i += 1;
    return true;
  };
  const allowed = (k, spec) => Object.entries(k.attrs).every(([a, v]) => Object.hasOwn(spec, a) && spec[a].test(v));
  const cell = (name) => {
    skip();
    const k = t[i];
    if (!k || k.name !== name || k.close || !allowed(k, { align: /^(?:left|center|right)$/ })) return null;
    let text = "";
    for (i += 1; t[i] && !(t[i].name === name && t[i].close); i += 1) {
      if (t[i].text !== undefined) text += t[i].text;
      else if (!Object.hasOwn(INLINE, t[i].name) || !allowed(t[i], INLINE[t[i].name])) return null;
    }
    if (!t[i]) return null;
    i += 1;
    return norm(text);
  };
  const row = (name) => {
    if (!tag("tr", false)) return null;
    const cells = [cell(name), cell(name), cell(name)];
    return cells.includes(null) || !tag("tr", true) ? null : cells;
  };
  if (!tag("thead", false) || !row("th") || !tag("thead", true) || !tag("tbody", false)) return null;
  const rows = [];
  for (let r = row("td"); r; r = row("td")) rows.push(r);
  return tag("tbody", true) && tag("table", true) ? rows : null;
}

const fail = (message) => ({ ok: false, message });

// Never throws: an unexpected error is a failure too (fail closed).
export function checkRenderedTable(html) {
  try {
    return readTables(html);
  } catch {
    return fail("HTML opisa PR-a nije čitljiv.");
  }
}

function readTables(html) {
  if (typeof html !== "string" || html === "") return fail("Opis PR-a je prazan; PR koji mijenja kod treba tablicu testova.");
  const t = tokens(html);
  if (t === null) return fail("HTML opisa PR-a nije čitljiv.");
  let tables = 0;
  for (let at = 0; at < t.length; at += 1) {
    if (t[at].name !== "table" || t[at].close || headerOf(t, at).join("|") !== HEADER.join("|")) continue;
    tables += 1;
    const where = `Tablica testova ${tables}`;
    const rows = readRows(t, at);
    if (rows === null) return fail(`${where} nije u obliku koji GitHub daje tablici (zaglavlje, pa retci s točno tri ćelije).`);
    if (rows.length === 0) return fail(`${where} nema nijedan redak.`);
    for (const [n, row] of rows.entries()) {
      // Filled means at least one letter or digit; blanks of any kind are empty.
      if (row.some((c) => !/[\p{L}\p{N}]/u.test(c))) return fail(`${where}, redak ${n + 1}: ćelija je prazna.`);
      if (row[2] !== "da") return fail(`${where}, redak ${n + 1}: „Pada bez promjene” mora biti „da”.`);
    }
  }
  if (tables === 0) return fail("Opis PR-a nema prikazanu tablicu | Kriterij | Test | Pada bez promjene |.");
  return { ok: true, message: `Tablica testova je popunjena (tablica: ${tables}).` };
}

export function checkTestsTable(html, files) {
  if (isDocsOnly(files)) return { ok: true, message: "Samo dokumentacija: tablica testova nije potrebna." };
  return checkRenderedTable(html);
}

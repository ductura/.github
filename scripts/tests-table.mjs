// DAN-948-1: a PR that changes code must carry a filled "Testovi prihvata"
// table (kriterij → test → pada bez promjene: da); a docs-only PR needs none.
// The check never parses Markdown: it reads body_html, GitHub's own rendering
// of the PR description, so only a table GitHub displays counts (#28 showed
// that a Markdown parser always leaves inputs GitHub renders differently).
// It fails closed: HTML GitHub never sends, a broken entity or any API doubt
// is an error. Messages are fixed texts with row numbers only; no body text
// is ever printed, so the body cannot inject workflow commands.
// Run by .github/workflows/tests-table.yml; tests in tests-table.test.mjs.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MAX_PAGES = 30; // the files API stops at 3000 files without an error
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


// Only these messages are printed; any other error gets a fixed text, because
// a parser error may quote the event or the API response, which hold the body.
class CheckError extends Error {}
const fail = (message) => ({ ok: false, message });
const HEADER = ["kriterij", "test", "pada bez promjene"];
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// Tags and text of body_html. A tag ends at the first ">" outside quotes;
// attributes are never text. Comments, CDATA, processing instructions,
// script, style, template, a bare "<" and an unclosed tag or quote are not
// in GitHub's sanitized output, so they are errors. Linear in the input.
function tokenize(html) {
  const tokens = [];
  for (let i = 0; i < html.length; ) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      tokens.push({ text: html.slice(i) });
      break;
    }
    if (lt > i) tokens.push({ text: html.slice(i, lt) });
    let j = lt + 1;
    for (let quote = null; j < html.length; j += 1) {
      const c = html[j];
      if (quote) quote = c === quote ? null : quote;
      else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    if (j >= html.length) throw new CheckError("Opis PR-a sadrži nezatvorenu HTML oznaku");
    const tag = /^(\/?)([a-z][a-z0-9-]*)(?=[\s/]|$)/i.exec(html.slice(lt + 1, j));
    if (!tag || /^(?:script|style|template)$/i.test(tag[2])) throw new CheckError("Opis PR-a sadrži HTML koji GitHub ne šalje");
    tokens.push({ tag: tag[2].toLowerCase(), close: tag[1] === "/", attrs: html.slice(lt + 1 + tag[0].length, j) });
    i = j + 1;
  }
  return tokens;
}

// Entities decoded exactly once; unknown names and invalid code points are errors.
function decode(text) {
  return text.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*)?;?/g, (m, e) => {
    if (e === undefined || !m.endsWith(";")) throw new CheckError("Opis PR-a sadrži neispravan HTML entitet");
    if (e[0] !== "#") {
      if (!Object.hasOwn(NAMED, e)) throw new CheckError("Opis PR-a sadrži nepoznat HTML entitet");
      return NAMED[e];
    }
    const n = /^#[xX]/.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    if (!(n > 0 && n <= 0x10ffff) || (n >= 0xd800 && n <= 0xdfff)) throw new CheckError("Opis PR-a sadrži neispravan HTML entitet");
    return String.fromCodePoint(n);
  });
}

// Visible text between two token indexes: tags removed, entities decoded,
// invisible and default-ignorable characters removed, spaces collapsed.
function textOf(tokens, from, to) {
  const raw = tokens.slice(from, to).filter((t) => "text" in t).map((t) => decode(t.text)).join("");
  return raw.replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "").replace(/\s+/g, " ").trim();
}

// Index of the tag that closes the one opened at `at` (same name, nesting counted).
function closeOf(tokens, at) {
  const { tag } = tokens[at];
  for (let i = at + 1, depth = 1; i < tokens.length; i += 1) {
    if (tokens[i].tag !== tag) continue;
    depth += tokens[i].close ? -1 : 1;
    if (depth === 0) return i;
  }
  throw new CheckError("Opis PR-a sadrži nezatvorenu HTML oznaku");
}

// Indexes of opening `name` tags strictly between `from` and `to` (only that range is read).
function opens(tokens, from, to, name) {
  const found = [];
  for (let i = from + 1; i < to; i += 1) if (tokens[i].tag === name && !tokens[i].close) found.push(i);
  return found;
}

export function checkRenderedTable(html, files) {
  if (isDocsOnly(files)) return { ok: true, message: "Samo dokumentacija: tablica testova nije potrebna." };
  if (typeof html !== "string" || html === "") return fail("Opis PR-a je prazan; PR koji mijenja kod treba odjeljak „Testovi prihvata”.");
  const tokens = tokenize(html);
  const all = [-1, tokens.length];
  const headings = opens(tokens, ...all, "h2").filter((i) => textOf(tokens, i + 1, closeOf(tokens, i)) === "Testovi prihvata");
  if (headings.length !== 1) return fail(`Odjeljak „Testovi prihvata” mora postojati točno jednom (nađeno: ${headings.length}).`);
  const start = closeOf(tokens, headings[0]);
  const next = tokens.findIndex((t, i) => i > start && !t.close && /^h[1-6]$/.test(t.tag ?? ""));
  const [at] = opens(tokens, start, next === -1 ? tokens.length : next, "table");
  if (at === undefined) return fail("Odjeljak „Testovi prihvata” nema tablicu koju GitHub prikazuje.");
  const end = closeOf(tokens, at);
  const inside = tokens.slice(at + 1, end);
  if (inside.some((t) => ["table", "tfoot", "caption"].includes(t.tag) || /\b(?:colspan|rowspan)\s*=/i.test(t.attrs ?? "")))
    return fail("Tablica testova ima nedopušten oblik (tfoot, caption, ugniježđena tablica, colspan ili rowspan).");
  const [thead] = opens(tokens, at, end, "thead");
  const theadEnd = thead === undefined ? -1 : closeOf(tokens, thead);
  const headRows = opens(tokens, thead ?? end, theadEnd, "tr");
  const names = headRows.length === 1 ? opens(tokens, headRows[0], closeOf(tokens, headRows[0]), "th") : [];
  if (names.length !== 3 || names.some((i, k) => textOf(tokens, i + 1, closeOf(tokens, i)).toLowerCase() !== HEADER[k]))
    return fail("Tablica testova nema zaglavlje Kriterij | Test | Pada bez promjene.");
  const rows = opens(tokens, at, end, "tr").filter((i) => i < thead || i > theadEnd);
  if (rows.length === 0) return fail("Tablica testova nema nijedan redak; PR koji mijenja kod treba barem jedan.");
  for (const [n, row] of rows.entries()) {
    const where = `Redak ${n + 1} tablice testova`;
    const rowEnd = closeOf(tokens, row);
    const cells = opens(tokens, row, rowEnd, "td").map((i) => [i, closeOf(tokens, i)]);
    if (cells.length !== 3 || opens(tokens, row, rowEnd, "th").length > 0) return fail(`${where} nema točno tri ćelije <td>.`);
    if (cells.some(([a, b]) => opens(tokens, a, b, "math-renderer").length > 0)) return fail(`${where} sadrži formulu.`);
    const texts = cells.map(([a, b]) => textOf(tokens, a + 1, b));
    if (texts.some((c) => /^<[^>]*>$/.test(c))) return fail(`${where} je još predložak <…>; zamijeni ga.`);
    // Filled means at least one letter or digit, so blanks of any kind are empty.
    if (texts.some((c) => !/[\p{L}\p{N}]/u.test(c))) return fail(`${where} ima praznu ćeliju.`);
    const [a, b] = cells[2];
    const plain = tokens.slice(a + 1, b).every((t) => !t.tag || ["strong", "em", "code"].includes(t.tag));
    if (!plain || texts[2].toLowerCase() !== "da") return fail(`${where}: „Pada bez promjene” mora biti „da”.`);
  }
  return { ok: true, message: `Tablica testova ima ${rows.length} popunjen(ih) redak(a).` };
}

async function getJson(fetchFn, url, token, accept = "application/vnd.github+json") {
  let res, data;
  try {
    res = await fetchFn(url, { headers: { authorization: `Bearer ${token}`, accept, "x-github-api-version": "2022-11-28" } });
    data = res.ok ? await res.json() : null;
  } catch {
    throw new CheckError("GitHub API nije dostupan ili je vratio neispravan JSON");
  }
  if (!res.ok) throw new CheckError(`GitHub API vratio je ${Number(res.status)}`);
  return data;
}

export async function listFiles({ api = "https://api.github.com", repo, number, token, fetch: fetchFn }) {
  const files = [];
  for (let page = 1; ; page += 1) {
    if (page > MAX_PAGES) throw new CheckError("PR ima 3000 ili više datoteka; popis nije potpun");
    const batch = await getJson(fetchFn, `${api}/repos/${repo}/pulls/${number}/files?per_page=100&page=${page}`, token);
    if (!Array.isArray(batch)) throw new CheckError("Popis datoteka PR-a nije polje");
    files.push(...batch);
    if (batch.length < 100) return files;
  }
}


// One evaluation of the PR named by the event; any doubt is an error (fail
// closed). body_html comes with the head and changed_files in one response.
export async function run({ event, repo, token, api = "https://api.github.com", fetch: fetchFn }) {
  const number = event?.pull_request?.number;
  const head = event?.pull_request?.head?.sha;
  if (!Number.isInteger(number) || typeof head !== "string") throw new CheckError("Događaj nije pull request");
  const pr = await getJson(fetchFn, `${api}/repos/${repo}/pulls/${number}`, token, "application/vnd.github.html+json");
  if (pr?.head?.sha !== head) throw new CheckError("Head PR-a promijenio se nakon događaja; provjeru radi novije pokretanje");
  const files = await listFiles({ api, repo, number, token, fetch: fetchFn });
  if (files.length !== pr.changed_files) throw new CheckError("Popis datoteka ne odgovara broju promijenjenih datoteka PR-a");
  if (!isDocsOnly(files) && pr.body_html === undefined) throw new CheckError("GitHub nije vratio iscrtani opis PR-a");
  return checkRenderedTable(pr.body_html, files);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_API_URL } = process.env;
  try {
    const event = JSON.parse(readFileSync(GITHUB_EVENT_PATH ?? "", "utf8"));
    const r = await run({ event, repo: GITHUB_REPOSITORY, token: GITHUB_TOKEN, api: GITHUB_API_URL, fetch });
    console.log(r.ok ? r.message : `::error::${r.message}`);
    process.exitCode = r.ok ? 0 : 1;
  } catch (e) {
    console.log(`::error::Provjera tablice testova nije uspjela: ${e instanceof CheckError ? e.message : "neočekivana greška"}`);
    process.exitCode = 1;
  }
}

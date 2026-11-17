// DAN-948: a PR that changes code must carry a filled "## Testovi prihvata"
// table (kriterij → test → pada bez promjene: da); a docs-only PR needs none.
// The check is strict and fails closed: anything it cannot read is a failure.
// Messages are fixed texts with row numbers only; no body text or file name
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

// Lines outside fenced blocks and HTML comments; an unclosed one hides the rest.
function activeLines(body) {
  const kept = [];
  let fence = null;
  for (const line of body.split(/\r\n|\r|\n|\u2028|\u2029/)) {
    if (fence) {
      const close = /^ {0,3}(`+|~+)\s*$/.exec(line)?.[1];
      if (close && close[0] === fence[0] && close.length >= fence.length) fence = null;
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (open) fence = open;
    else kept.push(line);
  }
  return kept.join("\n").replace(/<!--[\s\S]*?(?:-->|$)/g, "").split("\n");
}

// Cells of a row that starts and ends with an unescaped pipe, or null.
// Four spaces or a tab of indent make an indented code block, not a row.
function cells(line) {
  if (/^(?: {4}|\t)/.test(line)) return null;
  const t = line.trim();
  if (!t.startsWith("|") || !/(?:^|[^\\])\|$/.test(t) || t.length < 2) return null;
  return t.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.replace(/\p{Cf}/gu, "").replace(/\\\|/g, "|").trim());
}

// Only these messages are printed; any other error gets a fixed text, because
// a parser error may quote the event or the API response, which hold the body.
class CheckError extends Error {}
const fail = (message) => ({ ok: false, message });
const HEADER = ["kriterij", "test", "pada bez promjene"];

export function checkTestsTable(body, files) {
  if (isDocsOnly(files)) return { ok: true, message: "Samo dokumentacija: tablica testova nije potrebna." };
  if (typeof body !== "string") return fail("Opis PR-a je prazan; PR koji mijenja kod treba odjeljak „## Testovi prihvata”.");
  const lines = activeLines(body);
  const at = lines.flatMap((l, i) => (/^## Testovi prihvata[ \t]*$/.test(l) ? [i] : []));
  if (at.length !== 1) return fail(`Odjeljak „## Testovi prihvata” mora postojati točno jednom (nađeno: ${at.length}).`);
  let i = at[0] + 1;
  // The next ATX heading ends the section; `#1836` alone is not a heading.
  const end = lines.findIndex((l, j) => j > at[0] && /^ {0,3}#{1,6}(?:[ \t]|$)/.test(l));
  const stop = end === -1 ? lines.length : end;
  while (i < stop && cells(lines[i]) === null) i += 1;
  const head = i < stop ? cells(lines[i]) : null;
  if (!head || head.length !== 3 || head.some((c, k) => c.toLowerCase() !== HEADER[k]))
    return fail("Odjeljak „## Testovi prihvata” nema zaglavlje | Kriterij | Test | Pada bez promjene |.");
  const sep = i + 1 < stop ? cells(lines[i + 1]) : null;
  if (!sep || sep.length !== 3 || !sep.every((c) => /^:?-+:?$/.test(c)))
    return fail("Ispod zaglavlja tablice testova nedostaje red razdjelnika |---|---|---|.");
  let rows = 0;
  for (let j = i + 2; j < stop && cells(lines[j]) !== null; j += 1) {
    rows += 1;
    const row = cells(lines[j]);
    const where = `Redak ${rows} tablice testova`;
    if (row.length !== 3) return fail(`${where} nema točno tri ćelije.`);
    if (row.some((c) => c === "")) return fail(`${where} ima praznu ćeliju.`);
    if (row.some((c) => /<[a-z/!]|&#?\w+;/i.test(c))) return fail(`${where} sadrži HTML ili entitet.`);
    if (row.some((c) => /^<[^>]*>$/.test(c))) return fail(`${where} je još predložak <…>; zamijeni ga.`);
    if (row[2].toLowerCase() !== "da") return fail(`${where}: „Pada bez promjene” mora biti „da”.`);
  }
  if (rows === 0) return fail("Tablica testova nema nijedan redak; PR koji mijenja kod treba barem jedan.");
  return { ok: true, message: `Tablica testova ima ${rows} popunjen(ih) redak(a).` };
}

async function getJson(fetchFn, url, token) {
  let res, data;
  try {
    res = await fetchFn(url, { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" } });
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

// One evaluation of the PR named by the event; any doubt is an error (fail closed).
export async function run({ event, repo, token, api = "https://api.github.com", fetch: fetchFn }) {
  const number = event?.pull_request?.number;
  const head = event?.pull_request?.head?.sha;
  if (!Number.isInteger(number) || typeof head !== "string") throw new CheckError("Događaj nije pull request");
  const pr = await getJson(fetchFn, `${api}/repos/${repo}/pulls/${number}`, token);
  if (pr?.head?.sha !== head) throw new CheckError("Head PR-a promijenio se nakon događaja; provjeru radi novije pokretanje");
  const files = await listFiles({ api, repo, number, token, fetch: fetchFn });
  if (files.length !== pr.changed_files) throw new CheckError("Popis datoteka ne odgovara broju promijenjenih datoteka PR-a");
  return checkTestsTable(pr.body ?? null, files);
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

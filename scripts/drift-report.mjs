// Delivers the outcome of the drift scan (scripts/drift.mjs) to the
// coordination issue (docs/PLAN.md §6, T-0.7, DAN-749). This is the only part
// of the drift check that writes, and it writes at most once per run: one
// comment on the open report issue that github-actions[bot] opened, or one new
// issue with that title, in the repository the workflow runs in. It never
// edits, labels or closes anything.
// decide() maps the scan job's result to what is posted: a clean scan posts
// nothing, a drift report is posted as is, and anything else (scan failed,
// cancelled, missing or foreign output) posts "state unknown", so an
// unreadable state never looks like "no drift".
// Usage: node scripts/drift-report.mjs [expected.json]
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/name), GITHUB_API_URL,
//      GITHUB_SERVER_URL, GITHUB_RUN_ID, SCAN_RESULT, SCAN_STATUS, REPORT.
// Exit: 0 nothing to report, 1 drift or unknown state (posted), 2 delivery failed.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { clip, makeClient } from "./drift.mjs";

export const BOT = "github-actions[bot]";
export const DEFAULT_TITLE = "Razilaženje postavki (drift-check)";
const HEADER = "## Razilaženje postavki";
// owner/name; "." and ".." are never names, so the path cannot climb out of /repos/.
const REPO = /^(?!\.{1,2}\/)[A-Za-z0-9_-][A-Za-z0-9_.-]*\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$/;

/** Text posted when the scan did not finish with a report we can trust. */
export function unknownText(reason, runUrl) {
  return [
    `${HEADER}: provjera nije dovršena`,
    "",
    "Stanje postavki nije poznato. Ovo nije potvrda da nema razilaženja.",
    "",
    `Razlog: ${reason}.`,
    ...(runUrl ? ["", `Pokretanje: ${runUrl}`] : []),
    "",
  ].join("\n");
}

/**
 * What the report job does for a scan outcome.
 * scanResult: needs.scan.result; status: scan output "clean" | "drift"; report: scan output.
 * Returns { outcome: "clean" | "drift" | "unknown", post: string | null, exit }.
 */
export function decide({ scanResult, status, report, runUrl } = {}) {
  const text = typeof report === "string" ? report : "";
  const ours = text.startsWith(HEADER);
  const unknown = (reason) => ({ outcome: "unknown", post: unknownText(reason, runUrl), exit: 1 });
  if (scanResult !== "success") return unknown(`posao skeniranja završio je kao „${scanResult || "bez rezultata"}”`);
  if (!ours) return unknown("izvještaj skeniranja nedostaje ili nije prepoznat");
  if (status === "clean") {
    // Clean only when the report itself says so and names nothing unreadable.
    if (/^Nema razilaženja/m.test(text) && !/^Nečitljivo:/m.test(text) && !text.includes("| razilaženje |")) {
      return { outcome: "clean", post: null, exit: 0 };
    }
    return unknown("status „clean” ne odgovara izvještaju");
  }
  if (status === "drift") return { outcome: "drift", post: text, exit: 1 };
  return unknown(`nepoznat status skeniranja „${status || ""}”`);
}

const isIssue = (i) => i !== null && typeof i === "object" && Number.isInteger(i.number) && typeof i.title === "string";

/** Number of the open report issue among listed issues, or null. Pull requests and other authors never match. */
export function findReportIssue(issues, title) {
  const hit = issues.filter((i) => i.state === "open" && !i.pull_request && i.title === title && i.user?.login === BOT);
  return hit.length ? Math.min(...hit.map((i) => i.number)) : null;
}

// Mentions in label names or repository names must not notify anyone.
const quiet = (s) => s.replace(/@/g, "@\u200b");

/**
 * Posts body to the report issue of repo with exactly one write; returns { action, number }.
 * Throws before writing when the issue list cannot be read in full, and on a non-2xx write.
 */
export async function publishReport({
  fetchImpl = globalThis.fetch,
  token,
  base = "https://api.github.com",
  repo,
  title,
  body,
}) {
  if (!REPO.test(repo ?? "")) throw new Error(`invalid repository ${JSON.stringify(repo)}`);
  if (typeof title !== "string" || title.length === 0 || title.length > 256) throw new Error("invalid issue title");
  if (typeof body !== "string" || body.length === 0) throw new Error("empty report");
  const [owner, name] = repo.split("/");
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  // Read with the GET-only client: every page, or an error; a partial list could open a duplicate issue.
  const list = await makeClient({ fetchImpl, token, base }).get(
    `${path}/issues?state=open&creator=${encodeURIComponent(BOT)}&per_page=100`,
    { paginate: true },
  );
  if (list.status !== 200 || list.error !== undefined || !Array.isArray(list.body) || !list.body.every(isIssue)) {
    throw new Error(`issue list unreadable (${list.error ?? `HTTP ${list.status}`}); nothing posted`);
  }
  const number = findReportIssue(list.body, title);
  const text = clip(quiet(body));
  const [url, payload] =
    number === null ? [`${path}/issues`, { title, body: text }] : [`${path}/issues/${number}/comments`, { body: text }];
  const headers = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "ductura-drift-check",
    "content-type": "application/json",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  // One POST, never retried: a retry after a lost answer could post twice.
  const res = await fetchImpl(`${base.replace(/\/$/, "")}${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status < 200 || res.status > 299) throw new Error(`POST ${url}: HTTP ${res.status}`);
  if (number !== null) return { action: "comment", number };
  let created = null;
  try {
    created = await res.json();
  } catch {
    // The issue was created; only its number is unknown.
  }
  return { action: "create", number: Number.isInteger(created?.number) ? created.number : null };
}

/** Issue title from expected.json; falls back to DEFAULT_TITLE so a broken file can still be reported. */
export function readTitle(file) {
  try {
    const t = JSON.parse(readFileSync(file, "utf8"))?.reportIssue;
    if (typeof t === "string" && t.length > 0 && t.length <= 256) return t;
  } catch {
    // Unreadable file: fall back to the default title.
  }
  return DEFAULT_TITLE;
}

export function runUrlFrom(env) {
  const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: id } = env;
  if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(server ?? "") || !REPO.test(repo ?? "") || !/^\d+$/.test(id ?? ""))
    return null;
  return `${server}/${repo}/actions/runs/${id}`;
}

export async function main(args = process.argv.slice(2), env = process.env, fetchImpl = globalThis.fetch) {
  if (args.length > 1 || args.some((a) => a.startsWith("--"))) {
    console.error("usage: node scripts/drift-report.mjs [expected.json]");
    return 2;
  }
  const decision = decide({
    scanResult: env.SCAN_RESULT,
    status: env.SCAN_STATUS,
    report: env.REPORT,
    runUrl: runUrlFrom(env),
  });
  console.log(`drift-report: ${decision.outcome}`);
  if (decision.post === null) return decision.exit;
  const file = args[0] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "drift", "expected.json");
  try {
    const result = await publishReport({
      fetchImpl,
      token: env.GITHUB_TOKEN,
      base: env.GITHUB_API_URL || undefined,
      repo: env.GITHUB_REPOSITORY,
      title: readTitle(file),
      body: decision.post,
    });
    console.log(`drift-report: ${result.action} issue #${result.number ?? "?"}`);
  } catch (error) {
    console.error(`::error title=drift-report::${String(error?.message ?? error).replace(/[\r\n%]/g, " ")}`);
    return 2;
  }
  return decision.exit;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`drift-report: ${error?.message ?? error}`);
      process.exit(2);
    },
  );
}

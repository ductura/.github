// Delivers a drift report from scripts/drift.mjs to one coordination issue in
// this repository (docs/PLAN.md §6: the finding goes to a coordination issue).
// It is the only writing part of the drift check and runs in its own job with
// `issues: write` on this repository alone: it comments on the open issue with
// the configured title that github-actions[bot] opened, or opens that issue.
// Usage: node scripts/drift-report.mjs <report.md> [expected.json]
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY (owner/name), GITHUB_API_URL.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const BOT = "github-actions[bot]";
// owner/name; "." and ".." are never names, so the path cannot climb out of /repos/.
const REPO = /^(?!\.{1,2}\/)[A-Za-z0-9_-][A-Za-z0-9_.-]*\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$/;
const MAX_BODY = 60_000; // GitHub rejects issue bodies and comments over 65 536 characters.

/** Number of the open report issue among listed issues, or null. Pull requests and other authors never match. */
export function findReportIssue(issues, title) {
  const hit = (Array.isArray(issues) ? issues : []).filter(
    (i) => i?.state === "open" && !i.pull_request && i.title === title && i.user?.login === BOT,
  );
  return hit.length ? Math.min(...hit.map((i) => i.number)) : null;
}

/** Cuts an over-long report at a line break and says so. */
export function clip(body) {
  if (body.length <= MAX_BODY) return body;
  const cut = body.lastIndexOf("\n", MAX_BODY);
  return `${body.slice(0, cut > 0 ? cut : MAX_BODY)}\n\n_Izvještaj je skraćen; cijeli je u sažetku posla._\n`;
}

/** Posts body to the report issue of repo; returns { action, number }. Throws on any non-2xx answer. */
export async function publishReport({ fetchImpl = globalThis.fetch, token, base = "https://api.github.com", repo, title, body }) {
  if (!REPO.test(repo ?? "")) throw new Error(`invalid repository ${JSON.stringify(repo)}`);
  if (typeof title !== "string" || title.length === 0) throw new Error("missing issue title");
  const api = `${base.replace(/\/$/, "")}/repos/${repo}`;
  const headers = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "ductura-drift-check" };
  if (token) headers.authorization = `Bearer ${token}`;
  const call = async (method, url, payload) => {
    const res = await fetchImpl(url, {
      method,
      headers: payload ? { ...headers, "content-type": "application/json" } : headers,
      body: payload ? JSON.stringify(payload) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status < 200 || res.status > 299) throw new Error(`${method} ${url}: HTTP ${res.status}`);
    return res.json();
  };
  const issues = await call("GET", `${api}/issues?state=open&creator=${encodeURIComponent(BOT)}&per_page=100`);
  const number = findReportIssue(issues, title);
  const text = clip(body);
  if (number !== null) {
    await call("POST", `${api}/issues/${number}/comments`, { body: text });
    return { action: "comment", number };
  }
  const created = await call("POST", `${api}/issues`, { title, body: text });
  return { action: "create", number: created?.number ?? null };
}

async function main() {
  const [reportFile, expectedFile, ...rest] = process.argv.slice(2);
  if (!reportFile || rest.length) {
    console.error("usage: node scripts/drift-report.mjs <report.md> [expected.json]");
    return 2;
  }
  const expected = JSON.parse(
    readFileSync(expectedFile ?? join(dirname(fileURLToPath(import.meta.url)), "..", "drift", "expected.json"), "utf8"),
  );
  const result = await publishReport({
    token: process.env.GITHUB_TOKEN,
    base: process.env.GITHUB_API_URL || undefined,
    repo: process.env.GITHUB_REPOSITORY,
    title: expected.reportIssue,
    body: readFileSync(reportFile, "utf8"),
  });
  console.log(`drift-report: ${result.action} issue #${result.number}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`drift-report: ${error.message ?? error}`);
      process.exit(1);
    },
  );
}

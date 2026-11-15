// Delivers the outcome of the drift scan to the coordination issue (docs/PLAN.md §6, T-0.7, DAN-749).
// The only part of the drift check that writes, and only behind the repository variable
// DRIFT_DELIVERY == "true" (off by default). The issue is given by number (DRIFT_REPORT_ISSUE):
// it is never looked up, listed or opened here. One run sends at most one GET
// <api>/repos/ductura/.github/issues/<N> and at most one POST <that>/comments, never retried.
// Every response passes validateResponse() before anything in it is read; a response that fails
// it ends the run with exit 2, and after a failed GET nothing is posted.
// decide() from drift-report.mjs maps the scan job's result: clean posts nothing, drift posts the
// report and anything else posts "state unknown". The scan output is validated before that.
// Usage: node scripts/drift-deliver.mjs [expected.json]
// Env: DRIFT_DELIVERY, DRIFT_REPORT_ISSUE, GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_API_URL,
//      GITHUB_EVENT_NAME, GITHUB_REF, GITHUB_SERVER_URL, GITHUB_RUN_ID, SCAN_RESULT, SCAN_STATUS, REPORT.
// Exit: 0 delivered, nothing to deliver or delivery off; 2 bad input or delivery failed.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MAX_REPORT_BYTES, clip } from "./drift.mjs";
import { decide, runUrlFrom } from "./drift-report.mjs";

export const REPO = "ductura/.github";
export const MAX_BODY_BYTES = 1024 * 1024;
const ISSUE = /^[1-9][0-9]{0,8}$/;
const EVENTS = new Set(["schedule", "workflow_dispatch"]);
const SCAN_RESULTS = new Set(["success", "failure", "cancelled", "skipped"]);
const SCAN_STATUSES = new Set(["clean", "drift", ""]);
const HEADER = "## Razilaženje postavki";

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isPositiveInt = (v) => Number.isSafeInteger(v) && v > 0;
// Mentions in label or repository names must not notify anyone.
const quiet = (s) => s.replace(/@/g, "@​");

/** API base: an https origin with an optional path prefix (GHES /api/v3), nothing that could reroute a path. */
export function apiBase(base) {
  let u = null;
  try {
    u = new URL(base);
  } catch {}
  const root = String(base).replace(/\/$/, "");
  // A base that URL parsing would rewrite (dot segments, ?, #, credentials) is refused rather than normalised.
  if (!u || u.protocol !== "https:" || u.href.replace(/\/$/, "") !== root || /[?#@]/.test(base))
    throw new Error(`invalid API base ${JSON.stringify(base)}`);
  return root;
}

/** The only URLs this script may request or accept. */
export function urlsFor(root, number) {
  const repoUrl = `${root}/repos/${REPO}`;
  const issueUrl = `${repoUrl}/issues/${number}`;
  return { repoUrl, issueUrl, commentsUrl: `${issueUrl}/comments` };
}

/** True only for the media type application/json, with or without parameters. */
export function isJsonType(value) {
  // Only ASCII space or tab may precede the parameters; any other character (also U+00A0) is another type.
  return typeof value === "string" && /^application\/json(?:[ \t]*;.*)?$/i.test(value);
}

/**
 * The one check of a whole response, run before anything in it is read.
 * kind: "issue" (GET) or "comment" (POST); expect: { url, number, title, repoUrl, issueUrl }.
 * Returns the parsed body; throws on any status, origin, header, size or schema mismatch.
 */
export async function validateResponse(kind, expect, res) {
  const fail = (why) => {
    throw new Error(`${kind === "issue" ? "GET" : "POST"} ${expect.url}: ${why}`);
  };
  if (!isObject(res)) fail("no response");
  const want = kind === "issue" ? 200 : 201;
  if (!Number.isInteger(res.status) || res.status !== want) fail(`HTTP ${res.status}, expected ${want}`);
  if (res.redirected !== false) fail("redirected");
  if (res.url !== expect.url) fail(`answered from ${JSON.stringify(res.url)}`);
  const headers = res.headers;
  if (typeof headers?.get !== "function") fail("no headers");
  if (!isJsonType(headers.get("content-type"))) fail(`content-type ${JSON.stringify(headers.get("content-type"))}`);
  // One issue and one comment are never paginated, so any Link header means this is not the answer asked for.
  if (headers.get("link") !== null) fail("unexpected Link header");
  let bytes;
  try {
    const buf = await res.arrayBuffer();
    if (!(buf instanceof ArrayBuffer)) throw new Error();
    bytes = Buffer.from(buf);
  } catch {
    fail("unreadable body");
  }
  if (bytes.length > MAX_BODY_BYTES) fail("body too large");
  let body;
  try {
    body = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("invalid JSON");
  }
  if (!isObject(body)) fail("body is not an object");
  if (kind === "issue") {
    if (body.number !== expect.number) fail("another issue number");
    if (body.title !== expect.title) fail("another title");
    if (body.state !== "open") fail("issue is not open");
    if (body.pull_request !== undefined) fail("a pull request, not an issue");
    if (body.locked !== false) fail("issue is locked");
    if (body.url !== expect.issueUrl) fail("another issue url");
    if (body.repository_url !== expect.repoUrl) fail("another repository");
  } else {
    if (!isPositiveInt(body.id)) fail("comment without id");
    if (body.issue_url !== expect.issueUrl) fail("comment on another issue");
  }
  return body;
}

/** Validates the scan job's output before decide(); returns an error string or null. */
export function inputError(env) {
  if (!SCAN_RESULTS.has(env.SCAN_RESULT ?? "")) return `unknown scan result ${JSON.stringify(env.SCAN_RESULT)}`;
  if (!SCAN_STATUSES.has(env.SCAN_STATUS ?? "")) return `unknown scan status ${JSON.stringify(env.SCAN_STATUS)}`;
  const report = env.REPORT ?? "";
  if (typeof report !== "string" || Buffer.byteLength(report) > MAX_REPORT_BYTES) return "report over the size limit";
  return null;
}

/** Issue title from expected.json, or null when the file cannot be read. */
export function readTitle(file) {
  try {
    const t = JSON.parse(readFileSync(file, "utf8"))?.reportIssue;
    if (typeof t === "string" && t.length > 0 && t.length <= 256) return t;
  } catch {}
  return null;
}

const headersFor = (token) => ({
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  "user-agent": "ductura-drift-check",
  ...(token ? { authorization: `Bearer ${token}` } : {}),
});

export async function main(args = process.argv.slice(2), env = process.env, fetchImpl = globalThis.fetch) {
  const error = (msg) => {
    console.error(`::error title=drift-deliver::${String(msg).replace(/[\r\n%]/g, " ")}`);
    return 2;
  };
  if (env.DRIFT_DELIVERY !== "true") {
    console.log("drift-deliver: dostava isključena");
    return 0;
  }
  if (args.length > 1 || args.some((a) => a.startsWith("--"))) return error("usage: drift-deliver.mjs [expected.json]");
  if (env.GITHUB_REPOSITORY !== REPO)
    return error(`repository ${JSON.stringify(env.GITHUB_REPOSITORY)} is not ${REPO}`);
  if (!EVENTS.has(env.GITHUB_EVENT_NAME) || env.GITHUB_REF !== "refs/heads/main")
    return error(`event ${JSON.stringify(env.GITHUB_EVENT_NAME)} on ${JSON.stringify(env.GITHUB_REF)} cannot deliver`);
  if (!ISSUE.test(env.DRIFT_REPORT_ISSUE ?? "")) return error("DRIFT_REPORT_ISSUE is not an issue number");
  const number = Number(env.DRIFT_REPORT_ISSUE);
  const title = readTitle(args[0] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "drift", "expected.json"));
  if (title === null) return error("reportIssue in expected.json is unreadable");
  let root;
  try {
    root = apiBase(env.GITHUB_API_URL || "https://api.github.com");
  } catch (e) {
    return error(e.message);
  }
  const bad = inputError(env);
  if (bad) return error(bad);
  const decision = decide({
    scanResult: env.SCAN_RESULT,
    status: env.SCAN_STATUS,
    report: env.REPORT,
    runUrl: runUrlFrom(env),
  });
  if (!["clean", "drift", "unknown"].includes(decision.outcome) || !decision.text.startsWith(HEADER))
    return error("unrecognised decision");
  console.log(`drift-deliver: ${decision.outcome}`);
  if (decision.outcome === "clean") return 0;
  const { repoUrl, issueUrl, commentsUrl } = urlsFor(root, number);
  const expect = { number, title, repoUrl, issueUrl };
  const headers = headersFor(env.GITHUB_TOKEN);
  try {
    const opts = { redirect: "error", signal: AbortSignal.timeout(30_000) };
    const got = await fetchImpl(issueUrl, { method: "GET", headers, ...opts });
    await validateResponse("issue", { ...expect, url: issueUrl }, got);
    // One POST, never retried: a retry after a lost answer could post twice.
    const posted = await fetchImpl(commentsUrl, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ body: clip(quiet(decision.text)) }),
      ...opts,
    });
    const comment = await validateResponse("comment", { ...expect, url: commentsUrl }, posted);
    console.log(`drift-deliver: comment ${comment.id} on #${number}`);
  } catch (e) {
    return error(e?.message ?? e);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(`drift-deliver: ${e?.message ?? e}`);
      process.exit(2);
    },
  );
}

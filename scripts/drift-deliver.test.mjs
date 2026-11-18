import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDrift, formatReport, MAX_REPORT_BYTES } from "./drift.mjs";
import { MAX_BODY_BYTES, isJsonType, main } from "./drift-deliver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = join(ROOT, ".github", "workflows", "drift-check.yml");
const TITLE = JSON.parse(readFileSync(join(ROOT, "drift", "expected.json"), "utf8")).reportIssue;
const API = "https://api.example.test";
const REPO_URL = `${API}/repos/ductura/.github`;
const ISSUE_URL = `${REPO_URL}/issues/7`;
const COMMENTS_URL = `${ISSUE_URL}/comments`;
const DRIFT =
  "## Razilaženje postavki (primjer-org), 2026-11-16\n\nRazilaženja: 1.\n\n| alfa | razilaženje | višak labele | x |\n";
const CLEAN = "## Razilaženje postavki (primjer-org), 2026-11-16\n\nNema razilaženja.\n";

const ENV = {
  DRIFT_DELIVERY: "true",
  DRIFT_REPORT_ISSUE: "7",
  GITHUB_TOKEN: "test-token",
  GITHUB_REPOSITORY: "ductura/.github",
  GITHUB_API_URL: API,
  GITHUB_EVENT_NAME: "schedule",
  GITHUB_REF: "refs/heads/main",
  GITHUB_SERVER_URL: "https://github.com",
  GITHUB_RUN_ID: "42",
  SCAN_RESULT: "success",
  SCAN_STATUS: "drift",
  REPORT: DRIFT,
};

const ISSUE = { number: 7, title: TITLE, state: "open", locked: false, url: ISSUE_URL, repository_url: REPO_URL };
const COMMENT = { id: 99, issue_url: ISSUE_URL };

/** A fetch-like response; url defaults to the request URL. */
const reply =
  ({
    status = 200,
    body = ISSUE,
    raw,
    url,
    redirected = false,
    headers = { "content-type": "application/json; charset=utf-8" },
  } = {}) =>
  (requestUrl) => ({
    status,
    url: url ?? requestUrl,
    redirected,
    headers: new Headers(headers),
    arrayBuffer: async () => new TextEncoder().encode(raw ?? JSON.stringify(body)).buffer,
  });
const created = (patch = {}) => reply({ status: 201, body: COMMENT, ...patch });

// Every request any test sends, checked once at the end.
const runs = [];
after(() => {
  for (const calls of runs) {
    for (const c of calls) {
      assert.equal(c.redirect, "error");
      assert.ok(
        (c.method === "GET" && c.url === ISSUE_URL) || (c.method === "POST" && c.url === COMMENTS_URL),
        `request outside the contract: ${c.method} ${c.url}`,
      );
    }
    assert.ok(calls.filter((c) => c.method === "GET").length <= 1);
    assert.ok(calls.filter((c) => c.method === "POST").length <= 1);
    assert.ok(!calls.some((c) => c.method === "POST" && /\/issues$/.test(c.url)), "never opens an issue");
  }
});

/** Runs main with scripted responses (a function or an Error to throw per call); returns { code, calls }. */
async function run(env, answers = [reply(), created()], args = []) {
  const calls = [];
  runs.push(calls);
  const fetchImpl = async (url, init = {}) => {
    calls.push({
      url: String(url),
      method: init.method,
      redirect: init.redirect,
      body: init.body,
      headers: init.headers,
    });
    const a = answers[calls.length - 1];
    if (!a) throw new Error("no more answers");
    if (a instanceof Error) throw a;
    return a(String(url));
  };
  const code = await main(args, env, fetchImpl);
  return { code, calls };
}
const posts = (calls) => calls.filter((c) => c.method === "POST");

test("an open report issue gets exactly one comment", async () => {
  const { code, calls } = await run(ENV);
  assert.equal(code, 0);
  assert.deepEqual(
    calls.map((c) => `${c.method} ${c.url}`),
    [`GET ${ISSUE_URL}`, `POST ${COMMENTS_URL}`],
  );
  assert.equal(calls[1].headers["content-type"], "application/json");
  assert.equal(JSON.parse(calls[1].body).body, DRIFT);
});

test("unknown state is posted; a clean scan sends no request", async () => {
  const failed = await run({ ...ENV, SCAN_RESULT: "failure", SCAN_STATUS: "", REPORT: "" });
  assert.equal(failed.code, 0);
  assert.match(JSON.parse(posts(failed.calls)[0].body).body, /Stanje postavki nije poznato/);
  const clean = await run({ ...ENV, SCAN_STATUS: "clean", REPORT: CLEAN }, []);
  assert.deepEqual([clean.code, clean.calls], [0, []]);
});

test("flag: delivery is off unless DRIFT_DELIVERY is exactly true, and then no fetch at all", async () => {
  for (const value of [undefined, "", "false", "1", "TRUE", " true", "true\n"]) {
    const env = { ...ENV, DRIFT_DELIVERY: value };
    if (value === undefined) delete env.DRIFT_DELIVERY;
    const { code, calls } = await run(env, []);
    assert.deepEqual([code, calls], [0, []], `DRIFT_DELIVERY=${value}`);
  }
});

test("bad issue number, repository, event, ref, API base or title: no fetch, exit 2", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "drift-deliver-"));
  const broken = join(tmp, "expected.json");
  writeFileSync(broken, "{");
  const cases = [
    ...["", "0", "-1", "1e3", "12a", "1/../2", "07", "1234567890", " 7", "7\n", "\u0667", "\uff17"].map((n) => [
      { DRIFT_REPORT_ISSUE: n },
    ]),
    [{ DRIFT_REPORT_ISSUE: undefined }],
    [{ GITHUB_REPOSITORY: "primjer-org/drugi" }],
    [{ GITHUB_REPOSITORY: "Ductura/.github" }],
    ...["pull_request", "pull_request_target", "push", "", undefined, "schedule\n", "Schedule"].map((e) => [
      { GITHUB_EVENT_NAME: e },
    ]),
    ...["refs/heads/feature", "refs/pull/1/merge", "refs/tags/v1", "", "refs/heads/main\n", "refs/heads/Main"].map(
      (r) => [{ GITHUB_REF: r }],
    ),
    ...[
      "http://a/../b",
      "https://a.test?x=1",
      "https://u:p@a.test",
      "https://a.test#x",
      "ftp://a.test",
      "http://api.example.test",
    ].map((b) => [{ GITHUB_API_URL: b }]),
    [{}, [broken]],
    [{}, ["--x"]],
  ];
  for (const [patch, args] of cases) {
    const { code, calls } = await run({ ...ENV, ...patch }, [], args);
    assert.deepEqual([code, calls], [2, []], JSON.stringify(patch));
  }
});

test("scan input is validated before deciding: unknown result or status, or an oversized report, posts nothing", async () => {
  for (const patch of [
    { SCAN_RESULT: "succes" },
    { SCAN_RESULT: undefined },
    { SCAN_STATUS: "dirty" },
    { SCAN_STATUS: "Drift" },
    { REPORT: DRIFT + "x".repeat(MAX_REPORT_BYTES) },
  ]) {
    const { code, calls } = await run({ ...ENV, ...patch }, []);
    assert.deepEqual([code, calls], [2, []], JSON.stringify(patch));
  }
});

// --- validateResponse: GET ---------------------------------------------------------

const getFails = async (answer, label) => {
  const { code, calls } = await run(ENV, [answer, created()]);
  assert.equal(code, 2, label);
  assert.deepEqual(posts(calls), [], label);
  assert.equal(calls.length, 1, label);
};

test("status: anything but exactly 200 on the GET, or a network error, posts nothing", async () => {
  for (const status of [201, 204, 301, 304, 404, 500, "200", 200.5])
    await getFails(reply({ status }), `status ${status}`);
  await getFails(new Error("ECONNRESET"), "network");
  await getFails(() => null, "null response");
});

test("origin: a redirect or an answer from another URL posts nothing", async () => {
  await getFails(reply({ redirected: true }), "redirected");
  await getFails((u) => ({ ...reply()(u), redirected: undefined }), "redirected missing");
  for (const url of [
    "",
    "https://drugi.example/repos/ductura/.github/issues/7",
    `${REPO_URL}/issues/8`,
    `${ISSUE_URL}/`,
    `${ISSUE_URL}?page=2`,
  ])
    await getFails(reply({ url }), `url ${url}`);
});

test("any Link header makes the response unreadable: no write, exit 2", async () => {
  // QA 1 and 2 (same host, foreign repository, empty foreign page), QA 4 (other origin, same repository).
  for (const link of [
    `<${API}/repos/primjer-org/drugi/issues?page=2>; rel="next"`,
    `<https://drugi.example/repos/ductura/.github/issues/7>; rel="next"`,
    `<${ISSUE_URL}?page=2>; rel="next"`,
    "",
  ]) {
    await getFails(reply({ headers: { "content-type": "application/json", link } }), `link ${link}`);
  }
});

test("content-type: application/json with or without parameters passes, anything else posts nothing", async () => {
  for (const t of ["application/json", "application/json; charset=utf-8", "Application/JSON ; charset=UTF-8"]) {
    assert.equal(isJsonType(t), true, t);
    const { code, calls } = await run(ENV, [reply({ headers: { "content-type": t } }), created()]);
    assert.deepEqual([code, posts(calls).length], [0, 1], t);
  }
  for (const t of [
    "text/html",
    "application/json-x",
    "application/jsonp",
    "application/vnd.github+json",
    "",
    " ",
    "application/json\u00a0",
    "application/json\u00a0;x=1",
    "application/json,text/html",
  ]) {
    assert.equal(isJsonType(t), false, t);
    await getFails(reply({ headers: { "content-type": t } }), `content-type ${t}`);
  }
  await getFails(reply({ headers: {} }), "content-type missing");
});

test("body: invalid JSON, an array, or over the size limit posts nothing", async () => {
  await getFails(reply({ raw: "{" }), "invalid JSON");
  await getFails(reply({ raw: `\ufeff${JSON.stringify(ISSUE)}` }), "BOM");
  await getFails(reply({ raw: JSON.stringify(ISSUE).replace(/}$/, ',"state":"closed"}') }), "duplicate key closes it");
  await getFails((u) => ({ ...reply()(u), arrayBuffer: async () => JSON.stringify(ISSUE) }), "not an ArrayBuffer");
  await getFails(reply({ raw: "" }), "empty");
  await getFails(reply({ body: [] }), "empty array (QA 2)");
  await getFails(reply({ body: [ISSUE] }), "array of issues");
  await getFails(reply({ body: null }), "null");
  await getFails(reply({ raw: JSON.stringify({ ...ISSUE, pad: "x".repeat(MAX_BODY_BYTES) }) }), "too large");
});

test("issue field: missing, wrong type or wrong value posts nothing (QA 3)", async () => {
  const bad = {
    number: [undefined, "7", 8, 7.5, null],
    title: [undefined, "Drugi naslov", null, ` ${TITLE}`],
    state: [undefined, "closed", "OPEN", null],
    locked: [undefined, true, "false", null],
    url: [undefined, `${REPO_URL}/issues/8`, `https://drugi.example/repos/ductura/.github/issues/7`, null],
    repository_url: [undefined, `${API}/repos/primjer-org/drugi`, `${API}/repos/Ductura/.github`, null],
  };
  for (const [field, values] of Object.entries(bad)) {
    for (const value of values) {
      const body = { ...ISSUE, [field]: value };
      if (value === undefined) delete body[field];
      await getFails(reply({ body }), `${field}=${JSON.stringify(value)}`);
    }
  }
  for (const pr of [{}, { url: "x" }, null, false])
    await getFails(reply({ body: { ...ISSUE, pull_request: pr } }), "pull request");
});

// --- validateResponse: POST ----------------------------------------------------------

test("a refused or unconfirmed write fails with exit 2 and is never retried", async () => {
  for (const answer of [
    reply({ status: 200, body: COMMENT }),
    reply({ status: 202, body: COMMENT }),
    reply({ status: 403, body: {} }),
    reply({ status: 422, body: {} }),
    reply({ status: "201", body: COMMENT }),
    new Error("timeout"),
    created({ body: { ...COMMENT, issue_url: `${REPO_URL}/issues/8` } }),
    created({ body: { issue_url: ISSUE_URL } }),
    created({ body: { ...COMMENT, id: "99" } }),
    created({ body: { ...COMMENT, id: 0 } }),
    created({ headers: { "content-type": "application/json", link: `<${COMMENTS_URL}?page=2>; rel="next"` } }),
    created({ headers: { "content-type": "text/html" } }),
    created({ url: `${API}/repos/primjer-org/drugi/issues/7/comments` }),
    created({ redirected: true }),
    created({ body: [COMMENT] }),
  ]) {
    const { code, calls } = await run(ENV, [reply(), answer, created()]);
    assert.equal(code, 2);
    assert.equal(posts(calls).length, 1);
  }
});

test("mentions are neutralised and the posted body stays within the clip limit", async () => {
  // Just under the limit before mentions are neutralised, over it after: the posted body is clipped again.
  const row = "| @r | razilaženje | a | b |\n";
  const long = `${DRIFT}${row.repeat(Math.floor((MAX_REPORT_BYTES - 200) / Buffer.byteLength(row)))}`;
  assert.ok(Buffer.byteLength(long) <= MAX_REPORT_BYTES);
  const { code, calls } = await run({ ...ENV, REPORT: long });
  assert.equal(code, 0);
  const sent = JSON.parse(posts(calls)[0].body).body;
  assert.ok(!/@(?!​)/.test(sent));
  assert.ok(Buffer.byteLength(sent) <= MAX_REPORT_BYTES);
});

test("PLAN §6: no protection, no ci-ok and an extra label reach the coordination issue as one comment", async () => {
  const expected = { org: "primjer-org", branch: "main", requiredChecks: ["ci-ok"], repos: [{ name: "alfa" }] };
  const findings = checkDrift(expected, ["bug"], {
    alfa: {
      repo: { status: 200, body: { default_branch: "main" } },
      branch: { status: 200, body: { protected: false } },
      rules: { status: 200, body: [] },
      labels: { status: 200, body: [{ name: "bug" }, { name: "višak" }] },
    },
  });
  const report = formatReport(findings, { org: "primjer-org", date: "2026-11-16" });
  const { code, calls } = await run({ ...ENV, REPORT: report });
  assert.equal(code, 0);
  assert.equal(posts(calls).length, 1);
  assert.equal(JSON.parse(posts(calls)[0].body).body, report);
});

test("drift-check.yml: write scope only in deliver, behind the flag, this repository, main and the two events", () => {
  const yml = readFileSync(WORKFLOW, "utf8");
  const [top, jobs] = yml.split(/^jobs:\n/m);
  assert.match(top, /^permissions: \{\}$/m);
  assert.match(top, /^on:\n {2}schedule:\n.*\n {4}- cron: .*\n {2}workflow_dispatch:\n(?=\S)/m);
  const deliver = jobs.slice(jobs.indexOf("\n  deliver:\n"));
  assert.ok(jobs.indexOf("\n  deliver:\n") > 0);
  assert.equal(yml.match(/\bwrite\b/g).length, 1);
  assert.match(deliver, /\n {4}permissions:\n {6}contents: read\n {6}issues: write(?: #[^\n]*)?\n {4}steps:/);
  assert.match(
    deliver,
    /\n {4}if: \$\{\{ always\(\) && vars\.DRIFT_DELIVERY == 'true' && github\.repository == 'ductura\/\.github' && \(github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch'\) && github\.ref == 'refs\/heads\/main' \}\}\n/,
  );
  assert.match(deliver, /DRIFT_DELIVERY: \$\{\{ vars\.DRIFT_DELIVERY \}\}\n/);
  assert.match(deliver, /DRIFT_REPORT_ISSUE: \$\{\{ vars\.DRIFT_REPORT_ISSUE \}\}\n/);
  assert.match(deliver, /SCAN_RESULT: \$\{\{ needs\.scan\.result \}\}\n/);
  assert.match(deliver, /run: node scripts\/drift-deliver\.mjs\n/);
  assert.doesNotMatch(yml, /secrets\.|pull_request|write-all/);
  // The API base comes from the runner only.
  assert.doesNotMatch(yml, /GITHUB_API_URL/);
});

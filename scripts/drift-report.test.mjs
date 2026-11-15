import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDrift, formatReport } from "./drift.mjs";
import {
  BOT,
  DEFAULT_TITLE,
  decide,
  findReportIssue,
  main,
  publishReport,
  readTitle,
  runUrlFrom,
} from "./drift-report.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.example.test";
const REPO = "primjer-org/.github";
const TITLE = "Razilaženje postavki (drift-check)";
const LIST = `${API}/repos/primjer-org/.github/issues?state=open&creator=${encodeURIComponent(BOT)}&per_page=100`;
const DRIFT =
  "## Razilaženje postavki (primjer-org), 2026-11-16\n\nRazilaženja: 1.\n\n| alfa | razilaženje | višak labele | x |\n";
const CLEAN = "## Razilaženje postavki (primjer-org), 2026-11-16\n\nNema razilaženja.\n";

// Invented issues only.
const REPO_URL = `${API}/repos/primjer-org/.github`;
const issue = (number, extra = {}) => ({
  number,
  title: TITLE,
  state: "open",
  user: { login: BOT },
  repository_url: REPO_URL,
  ...extra,
});

/** Fake GitHub: routes for GET by URL, every call recorded; POST answers with postStatus. */
function fakeApi({ routes = {}, postStatus = 201, postBody = { number: 77 } } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({
      url,
      method: init.method,
      body: init.body ? JSON.parse(init.body) : undefined,
      redirect: init.redirect,
    });
    if (init.method === "POST") return { status: postStatus, json: async () => postBody, headers: { get: () => null } };
    const route = routes[url];
    if (!route) return { status: 404, json: async () => ({ message: "Not Found" }), headers: { get: () => null } };
    if (route.reject) throw new TypeError("fetch failed");
    const json = route.raw !== undefined ? async () => JSON.parse(route.raw) : async () => route.body;
    return { status: route.status ?? 200, json, headers: { get: (h) => (h === "link" ? (route.link ?? null) : null) } };
  };
  return { impl, calls, posts: () => calls.filter((c) => c.method === "POST") };
}
const publish = (api, body = DRIFT) =>
  publishReport({ fetchImpl: api.impl, token: "t", base: API, repo: REPO, title: TITLE, body });

// --- decide: an unknown state is never "no drift" ---------------------------------

test("decide: clean posts nothing, drift posts the report, everything else posts state unknown", () => {
  const cases = [
    // [scanResult, status, report, outcome]
    ["success", "clean", CLEAN, "clean"],
    [
      "success",
      "clean",
      "## Razilaženje postavki\n\nNema razilaženja; samo napomene.\n\n| beta | napomena | repo još ne postoji | x |\n",
      "clean",
    ],
    ["success", "drift", DRIFT, "drift"],
    ["failure", "", "", "unknown"],
    ["failure", "clean", CLEAN, "unknown"],
    ["cancelled", "", "", "unknown"],
    ["skipped", "", "", "unknown"],
    ["", "", "", "unknown"],
    [undefined, undefined, undefined, "unknown"],
    ["success", "", CLEAN, "unknown"],
    ["success", "weird", DRIFT, "unknown"],
    ["success", "clean", "", "unknown"],
    ["success", "drift", "", "unknown"],
    ["success", "clean", "Nema razilaženja.\n", "unknown"],
    ["success", "clean", "## Razilaženje postavki\n\nRazilaženja: 2.\n", "unknown"],
    ["success", "clean", `${CLEAN}\nNečitljivo: 1; za te repoe stanje nije poznato.\n`, "unknown"],
    ["success", "clean", `${CLEAN}| alfa | razilaženje | nije čitljivo | x |\n`, "unknown"],
  ];
  for (const [scanResult, status, report, outcome] of cases) {
    const d = decide({ scanResult, status, report, runUrl: "https://github.com/primjer-org/.github/actions/runs/1" });
    const label = JSON.stringify([scanResult, status, report]);
    assert.equal(d.outcome, outcome, label);
    assert.equal(d.exit, outcome === "clean" ? 0 : 1, label);
    if (outcome === "clean") assert.equal(d.post, null, label);
    if (outcome === "drift") assert.equal(d.post, report, label);
    if (outcome === "unknown") {
      assert.match(d.post, /provjera nije dovršena/, label);
      assert.match(d.post, /Ovo nije potvrda da nema razilaženja/, label);
      assert.match(d.post, /actions\/runs\/1/, label);
    }
  }
});

test("a report with unreadable repositories says so and is never clean", () => {
  const findings = [
    { repo: "alfa", kind: "unreadable", detail: "repo: mreža: TypeError", level: "drift" },
    { repo: "alfa", kind: "unreadable", detail: "labele: HTTP 500", level: "drift" },
    { repo: "beta", kind: "unreadable", detail: "grana: HTTP 502", level: "drift" },
  ];
  const report = formatReport(findings, { org: "primjer-org" });
  assert.match(report, /^Nečitljivo: 2; za te repoe stanje nije poznato\.$/m);
  assert.doesNotMatch(report, /Nema razilaženja/);
  assert.equal(decide({ scanResult: "success", status: "clean", report }).outcome, "unknown");
  assert.equal(decide({ scanResult: "success", status: "drift", report }).outcome, "drift");
});

// --- publishReport: exactly one write, only to the report issue -----------------

test("an open report issue gets exactly one comment", async () => {
  const api = fakeApi({ routes: { [LIST]: { body: [issue(5), issue(3)] } } });
  assert.deepEqual(await publish(api), { action: "comment", number: 3 });
  assert.deepEqual(
    api.posts().map((c) => c.url),
    [`${API}/repos/primjer-org/.github/issues/3/comments`],
  );
  assert.deepEqual(Object.keys(api.posts()[0].body), ["body"]);
  assert.ok(api.calls.every((c) => c.redirect === "error"));
});

test("closed issues, pull requests, other authors and other titles never match: one new issue", async () => {
  const listed = [
    issue(1, { state: "closed" }),
    issue(2, { pull_request: { url: "x" } }),
    issue(4, { user: { login: "netko-drugi" } }),
    issue(6, { title: "Drugi naslov" }),
  ];
  assert.equal(findReportIssue(listed, TITLE), null);
  const api = fakeApi({ routes: { [LIST]: { body: listed } } });
  assert.deepEqual(await publish(api), { action: "create", number: 77 });
  assert.equal(api.posts().length, 1);
  assert.equal(api.posts()[0].url, `${API}/repos/primjer-org/.github/issues`);
  assert.deepEqual(api.posts()[0].body, { title: TITLE, body: DRIFT });
});

test("the issue list is read across pages before deciding", async () => {
  const page2 = `${LIST}&page=2`;
  const api = fakeApi({
    routes: {
      [LIST]: { body: [issue(9, { title: "x" })], link: `<${page2}>; rel="next"` },
      [page2]: { body: [issue(12)] },
    },
  });
  assert.deepEqual(await publish(api), { action: "comment", number: 12 });
  assert.deepEqual(
    api.calls.map((c) => c.method),
    ["GET", "GET", "POST"],
  );
});

test("an unreadable issue list posts nothing, so no duplicate issue is opened", async () => {
  const page2 = `${LIST}&page=2`;
  const bad = [
    { [LIST]: { status: 500, body: {} } },
    { [LIST]: { status: 403, body: { message: "x" } } },
    { [LIST]: { reject: true } },
    { [LIST]: { raw: "{" } },
    { [LIST]: { body: { items: [] } } },
    { [LIST]: { body: [null] } },
    { [LIST]: { body: [{ number: "3", title: TITLE }] } },
    { [LIST]: { body: [{ number: 3 }] } },
    { [LIST]: { body: [issue(3, { repository_url: undefined })] } },
    { [LIST]: { body: [issue(3, { repository_url: `${API}/repos/primjer-org/drugi` })] } },
    // QA finding on 4b3d0f1: a same-host page link into another repository must not pick the issue.
    {
      [LIST]: { body: [], link: `<${API}/repos/primjer-org/drugi/issues?page=2>; rel="next"` },
      [`${API}/repos/primjer-org/drugi/issues?page=2`]: {
        body: [issue(3, { repository_url: `${API}/repos/primjer-org/drugi` })],
      },
    },
    { [LIST]: { body: [issue(1)], link: `<${page2}>; rel="next"` }, [page2]: { status: 502, body: {} } },
    { [LIST]: { body: [issue(1)], link: `<https://elsewhere.test/x>; rel="next"` } },
  ];
  for (const routes of bad) {
    const api = fakeApi({ routes });
    await assert.rejects(publish(api), /nothing posted/, JSON.stringify(routes));
    assert.equal(api.posts().length, 0, JSON.stringify(routes));
  }
});

test("a refused write fails and is never retried", async () => {
  for (const postStatus of [403, 404, 422, 500]) {
    const api = fakeApi({ routes: { [LIST]: { body: [] } }, postStatus });
    await assert.rejects(publish(api), new RegExp(`HTTP ${postStatus}`));
    assert.equal(api.posts().length, 1);
  }
});

test("every request stays inside the configured repository; bad input writes nothing", async () => {
  const api = fakeApi({ routes: { [LIST]: { body: [issue(3)] } } });
  await publish(api);
  assert.ok(api.calls.every((c) => c.url.startsWith(`${API}/repos/primjer-org/.github/issues`)));
  for (const repo of ["", "a", "../x", "a/..", "a/b/c", "a/b?x=1", undefined]) {
    const bad = fakeApi();
    await assert.rejects(
      publishReport({ fetchImpl: bad.impl, base: API, repo, title: TITLE, body: DRIFT }),
      /invalid repository/,
    );
    assert.equal(bad.calls.length, 0);
  }
  for (const [title, body] of [
    ["", DRIFT],
    ["x".repeat(257), DRIFT],
    [TITLE, ""],
  ]) {
    const bad = fakeApi();
    await assert.rejects(publishReport({ fetchImpl: bad.impl, base: API, repo: REPO, title, body }));
    assert.equal(bad.calls.length, 0);
  }
});

test("mentions are neutralised and the posted body stays within the clip limit", async () => {
  const api = fakeApi({ routes: { [LIST]: { body: [] } } });
  await publish(api, `${DRIFT}| alfa | razilaženje | višak labele | @netko |\n${"| a | b |\n".repeat(20_000)}`);
  const text = api.posts()[0].body.body;
  assert.ok(!/@(?!\u200b)/.test(text));
  assert.ok(Buffer.byteLength(text) <= 60_000);
});

// --- end to end: docs/PLAN.md §6 case through the CLI entry point ---------------

test("PLAN §6: no protection, no ci-ok and an extra label reach the coordination issue as one comment", async () => {
  const labels = [{ name: "bug", color: "d73a4a", description: "Greška", group: "bot" }];
  const expected = {
    version: 1,
    org: "primjer-org",
    branch: "main",
    requiredChecks: ["ci-ok"],
    labels: "labels.yml",
    reportIssue: TITLE,
    repos: [{ name: "alfa" }],
  };
  const observed = {
    alfa: {
      repo: { status: 200, body: { default_branch: "main" } },
      branch: { status: 200, body: { protected: false } },
      rules: { status: 200, body: [] },
      labels: {
        status: 200,
        body: [
          { name: "bug", color: "d73a4a", description: "Greška" },
          { name: "visak", color: "ffffff", description: null },
        ],
      },
    },
  };
  const report = formatReport(checkDrift(expected, labels, observed), { org: "primjer-org" });
  const dir = mkdtempSync(join(tmpdir(), "drift-report-"));
  writeFileSync(join(dir, "expected.json"), JSON.stringify(expected));
  const api = fakeApi({ routes: { [LIST]: { body: [issue(8)] } } });
  const env = {
    GITHUB_TOKEN: "t",
    GITHUB_API_URL: API,
    GITHUB_REPOSITORY: REPO,
    GITHUB_SERVER_URL: "https://github.com",
    GITHUB_RUN_ID: "42",
    SCAN_RESULT: "success",
    SCAN_STATUS: "drift",
    REPORT: report,
  };
  assert.equal(await main([join(dir, "expected.json")], env, api.impl), 1);
  assert.equal(api.posts().length, 1);
  const body = api.posts()[0].body.body;
  assert.match(body, /grana nije zaštićena/);
  assert.match(body, /nedostaje obvezni status \| ci-ok/);
  assert.match(body, /višak labele \| visak/);
  // The scan never wrote: only the report job's single POST exists.
  assert.deepEqual(
    api.calls.map((c) => c.method),
    ["GET", "POST"],
  );

  const clean = fakeApi();
  assert.equal(
    await main([join(dir, "expected.json")], { ...env, SCAN_STATUS: "clean", REPORT: CLEAN }, clean.impl),
    0,
  );
  assert.equal(clean.calls.length, 0);

  const failed = fakeApi({ routes: { [LIST]: { body: [] } } });
  assert.equal(
    await main(
      [join(dir, "expected.json")],
      { ...env, SCAN_RESULT: "failure", SCAN_STATUS: "", REPORT: "" },
      failed.impl,
    ),
    1,
  );
  assert.match(
    failed.posts()[0].body.body,
    /Stanje postavki nije poznato[\s\S]*https:\/\/github\.com\/primjer-org\/\.github\/actions\/runs\/42/,
  );

  const refused = fakeApi({ routes: { [LIST]: { body: [] } }, postStatus: 403 });
  assert.equal(await main([join(dir, "expected.json")], env, refused.impl), 2);
  assert.equal(await main(["a", "b"], env, fakeApi().impl), 2);
});

test("title comes from expected.json, with a fallback when the file is broken", () => {
  assert.equal(
    readTitle(join(ROOT, "drift", "expected.json")),
    JSON.parse(readFileSync(join(ROOT, "drift", "expected.json"), "utf8")).reportIssue,
  );
  const dir = mkdtempSync(join(tmpdir(), "drift-title-"));
  for (const [name, content] of [
    ["broken.json", "{"],
    ["empty.json", "{}"],
    ["long.json", JSON.stringify({ reportIssue: "x".repeat(300) })],
  ]) {
    writeFileSync(join(dir, name), content);
    assert.equal(readTitle(join(dir, name)), DEFAULT_TITLE);
  }
  assert.equal(readTitle(join(dir, "missing.json")), DEFAULT_TITLE);
});

test("run link is built only from well-formed values", () => {
  const ok = { GITHUB_SERVER_URL: "https://github.com", GITHUB_REPOSITORY: REPO, GITHUB_RUN_ID: "7" };
  assert.equal(runUrlFrom(ok), "https://github.com/primjer-org/.github/actions/runs/7");
  for (const patch of [
    { GITHUB_SERVER_URL: "http://x" },
    { GITHUB_SERVER_URL: "https://x/y" },
    { GITHUB_REPOSITORY: "../x" },
    { GITHUB_RUN_ID: "7a" },
    { GITHUB_RUN_ID: undefined },
  ]) {
    assert.equal(runUrlFrom({ ...ok, ...patch }), null);
  }
});

// --- workflow: permissions per job, the write token only in the report job ---------

test("drift-check.yml: read-only scan, write scope only in the report job, report runs after any scan outcome", () => {
  const yml = readFileSync(join(ROOT, ".github", "workflows", "drift-check.yml"), "utf8");
  const [top, jobs] = yml.split(/^jobs:\n/m);
  assert.match(top, /^permissions: \{\}$/m);
  const scan = jobs.slice(jobs.indexOf("  scan:"), jobs.indexOf("  report:"));
  const report = jobs.slice(jobs.indexOf("  report:"));
  assert.match(scan, /permissions:\n {6}contents: read\n {4}outputs:/);
  assert.doesNotMatch(scan, /write/);
  assert.match(report, /permissions:\n {6}contents: read\n {6}issues: write\n {4}steps:/);
  assert.match(report, /if: \$\{\{ always\(\) \}\}/);
  assert.match(report, /SCAN_RESULT: \$\{\{ needs\.scan\.result \}\}/);
  assert.doesNotMatch(yml, /secrets\./);
  assert.doesNotMatch(report, /run: .*\$\{\{/);
});

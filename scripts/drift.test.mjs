import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDrift, formatReport, loadExpected, makeClient, observe, validateExpected } from "./drift.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Invented test data only: a made-up org and two labels.
const LABELS = [
  { name: "bug", color: "d73a4a", description: "Greška", group: "bot" },
  { name: "risk:low", color: "0e8a16", description: "Niski rizik", group: "risk" },
];
const EXPECTED = {
  version: 1,
  org: "primjer-org",
  branch: "main",
  requiredChecks: ["ci-ok"],
  labels: "labels.yml",
  repos: [{ name: "alfa" }],
};
const r = (status, body) => ({ status, body });
const healthy = () => ({
  repo: r(200, { default_branch: "main", archived: false }),
  branch: r(200, { protected: true, protection: { enabled: true, required_status_checks: { contexts: ["ci-ok"], checks: [] } } }),
  rules: r(200, []),
  labels: r(200, LABELS.map(({ name, color, description }) => ({ name, color, description }))),
});
const run = (patch, expected = EXPECTED) => checkDrift(expected, LABELS, { alfa: { ...healthy(), ...patch } });
const kinds = (findings) => findings.map((f) => `${f.kind}:${f.detail}`);

// --- the real configuration --------------------------------------------------

test("drift/expected.json is valid and its labels file loads", () => {
  const { expected, labels } = loadExpected(join(ROOT, "drift", "expected.json"));
  assert.equal(expected.org, "ductura");
  assert.ok(expected.requiredChecks.includes("ci-ok"));
  assert.ok(labels.length > 0);
});

test("validateExpected rejects bad configurations", () => {
  assert.deepEqual(validateExpected(EXPECTED), []);
  assert.match(validateExpected({ ...EXPECTED, version: 2 }).join(), /version/);
  assert.match(validateExpected({ ...EXPECTED, repos: [] }).join(), /non-empty/);
  assert.match(validateExpected({ ...EXPECTED, repos: [{ name: "a" }, { name: "A" }] }).join(), /twice/);
  assert.match(validateExpected({ ...EXPECTED, repos: [{ name: "../x/y" }] }).join(), /invalid name/);
  assert.match(validateExpected({ ...EXPECTED, requiredChecks: [""] }).join(), /requiredChecks/);
  assert.match(validateExpected({ ...EXPECTED, repos: [{ name: "a", optional: "da" }] }).join(), /optional/);
});

// --- checkDrift over fake API responses ----------------------------------------

test("a repository that matches gives no findings", () => {
  assert.deepEqual(run({}), []);
});

test("required checks from a ruleset count the same as classic protection", () => {
  const rules = r(200, [{ type: "required_status_checks", parameters: { required_status_checks: [{ context: "ci-ok" }] } }]);
  assert.deepEqual(run({ branch: r(200, { protected: false }), rules }), []);
});

test("check-run style required checks are read", () => {
  const branch = r(200, { protected: true, protection: { required_status_checks: { contexts: [], checks: [{ context: "ci-ok", app_id: 1 }] } } });
  assert.deepEqual(run({ branch }), []);
});

test("repository without branch protection: unprotected and ci-ok missing", () => {
  assert.deepEqual(kinds(run({ branch: r(200, { protected: false }) })), ["unprotected:main", "check-missing:ci-ok"]);
});

test("protected branch without the required ci-ok status", () => {
  const branch = r(200, { protected: true, protection: { required_status_checks: { contexts: ["lint"], checks: [] } } });
  assert.deepEqual(kinds(run({ branch })), ["check-missing:ci-ok"]);
});

test("extra, missing and changed labels are each a finding", () => {
  const labels = r(200, [
    { name: "BUG", color: "D73A4A", description: "Drugi opis" },
    { name: "wontfix", color: "ffffff", description: "" },
  ]);
  assert.deepEqual(kinds(run({ labels })), ["label-description:bug", "label-missing:risk:low", "label-extra:wontfix"]);
  const colour = r(200, [{ name: "bug", color: "000000", description: "Greška" }, { name: "risk:low", color: "0e8a16", description: "Niski rizik" }]);
  assert.deepEqual(kinds(run({ labels: colour })), ["label-color:bug: 000000 umjesto d73a4a"]);
});

test("missing repository is drift, a missing optional one is only a note", () => {
  const missing = checkDrift(EXPECTED, LABELS, { alfa: { repo: r(404, null) } });
  assert.deepEqual(missing.map((f) => [f.kind, f.level]), [["repo-missing", "drift"]]);
  const optional = checkDrift({ ...EXPECTED, repos: [{ name: "alfa", optional: true }] }, LABELS, { alfa: { repo: r(404, null) } });
  assert.deepEqual(optional.map((f) => [f.kind, f.level]), [["repo-absent", "note"]]);
});

test("unreadable responses are reported, never treated as a match", () => {
  assert.deepEqual(kinds(run({ repo: r(403, null) })), ["unreadable:repo: HTTP 403"]);
  assert.deepEqual(kinds(run({ branch: r(500, null) })), ["unreadable:grana: HTTP 500"]);
  assert.deepEqual(kinds(run({ rules: undefined })), ["unreadable:pravila: HTTP bez odgovora"]);
  assert.deepEqual(kinds(run({ labels: r(200, { message: "x" }) })), ["unreadable:labele: HTTP 200"]);
  assert.deepEqual(kinds(checkDrift(EXPECTED, LABELS, {})), ["unreadable:repo: HTTP bez odgovora"]);
});

test("wrong default branch, missing branch and archived repository", () => {
  assert.deepEqual(kinds(run({ repo: r(200, { default_branch: "master", archived: true }), branch: r(404, null) })), [
    "archived:repo je arhiviran",
    "default-branch:master umjesto main",
    "branch-missing:main",
  ]);
});

// --- report ------------------------------------------------------------------------

test("report says there is no drift, or lists one row per finding", () => {
  assert.match(formatReport([], { org: "primjer-org" }), /Nema razilaženja\./);
  const out = formatReport(run({ branch: r(200, { protected: false }) }), { org: "primjer-org", date: "2026-11-16" });
  assert.match(out, /Razilaženja: 2\./);
  assert.match(out, /\| alfa \| razilaženje \| grana nije zaštićena \| main \|/);
  const note = formatReport([{ repo: "beta", kind: "repo-absent", detail: "x", level: "note" }]);
  assert.match(note, /samo napomene/);
});

test("report escapes table and markup characters from label names", () => {
  const out = formatReport([{ repo: "alfa", kind: "label-extra", detail: "a|b\n<img>`x`", level: "drift" }]);
  const row = out.split("\n").find((l) => l.startsWith("| alfa"));
  assert.equal(row, "| alfa | razilaženje | višak labele | a\\|b \\<img\\>\\`x\\` |");
});

// --- read-only client --------------------------------------------------------------

function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, method: init.method, auth: init.headers.authorization });
    const route = routes[url];
    if (!route) return { status: 404, json: async () => ({ message: "Not Found" }), headers: { get: () => null } };
    return { status: route.status ?? 200, json: async () => route.body, headers: { get: (h) => (h === "link" ? route.link ?? null : null) } };
  };
  return { impl, calls };
}

test("observe sends only GET requests and follows label pagination", async () => {
  const api = "https://api.example.test";
  const p = `${api}/repos/primjer-org/alfa`;
  const { impl, calls } = fakeFetch({
    [p]: { body: { default_branch: "main" } },
    [`${p}/branches/main`]: { body: { protected: true, protection: { required_status_checks: { contexts: ["ci-ok"] } } } },
    [`${p}/rules/branches/main`]: { body: [] },
    [`${p}/labels?per_page=100`]: { body: [LABELS[0]], link: `<${p}/labels?per_page=100&page=2>; rel="next"` },
    [`${p}/labels?per_page=100&page=2`]: { body: [LABELS[1]] },
  });
  const observed = await observe(makeClient({ fetchImpl: impl, token: "test-token", base: api }), EXPECTED);
  assert.deepEqual(checkDrift(EXPECTED, LABELS, observed), []);
  assert.equal(calls.length, 5);
  assert.ok(calls.every((c) => c.method === "GET" && c.auth === "Bearer test-token"));
});

test("observe stops at a missing repository", async () => {
  const { impl, calls } = fakeFetch({});
  const observed = await observe(makeClient({ fetchImpl: impl, base: "https://api.example.test" }), EXPECTED);
  assert.equal(observed.alfa.repo.status, 404);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].auth, undefined);
});

test("client refuses paths outside /repos/ and cross-origin pagination", async () => {
  const api = "https://api.example.test";
  const { impl } = fakeFetch({ [`${api}/repos/o/r/labels`]: { body: [], link: '<https://evil.example.test/x>; rel="next"' } });
  const client = makeClient({ fetchImpl: impl, base: api });
  await assert.rejects(client.get("/orgs/o/installations"), /outside \/repos\//);
  await assert.rejects(client.get("/repos/o/r/labels", { paginate: true }), /another origin/);
});

// --- workflow --------------------------------------------------------------------------

test("drift-check workflow is weekly, read-only and runs the script", () => {
  const wf = readFileSync(join(ROOT, ".github", "workflows", "drift-check.yml"), "utf8");
  assert.match(wf, /schedule:\n(?: +#.*\n)? +- cron: "[^"]+"/);
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /^permissions:\n {2}contents: read\n/m);
  assert.doesNotMatch(wf, /: write\b/);
  assert.doesNotMatch(wf, /pull_request_target|secrets\./);
  assert.match(wf, /node scripts\/drift\.mjs/);
});

test("loadExpected rejects an invalid file", () => {
  const dir = mkdtempSync(join(tmpdir(), "drift-"));
  mkdirSync(join(dir, "drift"));
  const file = join(dir, "drift", "expected.json");
  writeFileSync(file, JSON.stringify({ ...EXPECTED, repos: [] }));
  assert.throws(() => loadExpected(file), /repos must be a non-empty list/);
});

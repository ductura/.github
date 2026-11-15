import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDrift, formatReport } from "./drift.mjs";
import { decide, main, runUrlFrom, writeReport } from "./drift-report.mjs";

// Delivery to the coordination issue and its tests moved to the branch feat/dan-749-drift-delivery;
// they return with the delivery PR under DAN-749. This file covers the read-only report.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "drift-report.mjs");
const WORKFLOW = join(ROOT, ".github", "workflows", "drift-check.yml");
const REPO = "primjer-org/.github";
const TITLE = "Razilaženje postavki (drift-check)";
const DRIFT =
  "## Razilaženje postavki (primjer-org), 2026-11-16\n\nRazilaženja: 1.\n\n| alfa | razilaženje | višak labele | x |\n";
const CLEAN = "## Razilaženje postavki (primjer-org), 2026-11-16\n\nNema razilaženja.\n";

const ENV = {
  GITHUB_REPOSITORY: REPO,
  GITHUB_SERVER_URL: "https://github.com",
  GITHUB_RUN_ID: "42",
  SCAN_RESULT: "success",
  SCAN_STATUS: "drift",
  REPORT: DRIFT,
};

/** Runs main in a fresh directory; returns the exit code and what reached the summary and the report file. */
function run(env, { args, summary = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "drift-report-"));
  const summaryFile = join(dir, "summary.md");
  const reportFile = join(dir, "drift-report.md");
  const code = main(args ?? ["--report-file", reportFile], {
    ...env,
    ...(summary ? { GITHUB_STEP_SUMMARY: summaryFile } : {}),
  });
  const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : null);
  return { code, summary: read(summaryFile), file: read(reportFile) };
}

// --- decide: an unknown state is never "no drift" ---------------------------------

test("decide: clean and drift report the scan as is, everything else reports state unknown", () => {
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
    if (outcome !== "unknown") assert.equal(d.text, report, label);
    if (outcome === "unknown") {
      assert.match(d.text, /provjera nije dovršena/, label);
      assert.match(d.text, /Ovo nije potvrda da nema razilaženja/, label);
      assert.match(d.text, /actions\/runs\/1/, label);
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

// --- the report: job summary and the artifact file ------------------------------

test("PLAN §6: no protection, no ci-ok and an extra label reach the job summary and the report file", async () => {
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
  const out = run({ ...ENV, REPORT: report });
  assert.equal(out.code, 1);
  for (const text of [out.summary, out.file]) {
    assert.match(text, /grana nije zaštićena/);
    assert.match(text, /nedostaje obvezni status \| ci-ok/);
    assert.match(text, /višak labele \| visak/);
  }
  assert.equal(out.summary, out.file);
  assert.ok(expected.reportIssue === TITLE);
});

test("the report is written to the summary and the file for every outcome, with the decision's exit code", () => {
  const clean = run({ ...ENV, SCAN_STATUS: "clean", REPORT: CLEAN });
  assert.deepEqual(clean, { code: 0, summary: CLEAN, file: CLEAN });

  const drift = run(ENV);
  assert.deepEqual(drift, { code: 1, summary: DRIFT, file: DRIFT });

  const failed = run({ ...ENV, SCAN_RESULT: "failure", SCAN_STATUS: "", REPORT: "" });
  assert.equal(failed.code, 1);
  assert.equal(failed.summary, failed.file);
  assert.match(
    failed.file,
    /Stanje postavki nije poznato[\s\S]*https:\/\/github\.com\/primjer-org\/\.github\/actions\/runs\/42/,
  );

  // Without GITHUB_STEP_SUMMARY (a local run) the file is still written.
  const local = run(ENV, { summary: false });
  assert.equal(local.code, 1);
  assert.equal(local.file, DRIFT);
});

test("a long report is clipped to the same limit in the summary and the file", () => {
  const long = `${DRIFT}${"| beta | razilaženje | višak labele | y |\n".repeat(3000)}`;
  const out = run({ ...ENV, REPORT: long });
  assert.equal(out.code, 1);
  assert.ok(Buffer.byteLength(out.file) <= 60_000);
  assert.equal(out.summary, out.file);
  assert.match(out.file, /Izvještaj je skraćen/);
});

test("bad usage or an unwritable report file exits 2", () => {
  for (const args of [[], ["--report-file"], ["x.md"], ["--report-file", "a.md", "b.md"], ["--other", "a.md"]]) {
    assert.equal(run(ENV, { args }).code, 2, JSON.stringify(args));
  }
  const dir = mkdtempSync(join(tmpdir(), "drift-report-"));
  assert.equal(main(["--report-file", join(dir, "missing", "r.md")], ENV), 2);
  assert.throws(() => writeReport(DRIFT, { reportFile: join(dir, "missing", "r.md") }));
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

// --- no write path: the script and the workflow only read --------------------------

test("drift-report.mjs has no request that could write: no fetch, no write method, no API client", () => {
  const src = readFileSync(SCRIPT, "utf8");
  assert.doesNotMatch(src, /\b(POST|PATCH|PUT|DELETE)\b/i);
  assert.doesNotMatch(src, /\bfetch\b|makeClient|https?:\/\/api\.|node:https?|child_process/);
  assert.doesNotMatch(src, /publishReport|findReportIssue|isIssueOf/);
});

test("main sends no request for any outcome: a fake fetch fails every method except GET", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    calls.push({ url: String(url), method });
    if (method !== "GET") throw new Error(`write attempted: ${method} ${url}`);
    return new Response("[]", { status: 200 });
  });
  for (const env of [
    ENV,
    { ...ENV, SCAN_STATUS: "clean", REPORT: CLEAN },
    { ...ENV, SCAN_RESULT: "failure", SCAN_STATUS: "", REPORT: "" },
    { ...ENV, SCAN_RESULT: "cancelled" },
  ]) {
    run({ ...env, GITHUB_TOKEN: "t", GITHUB_API_URL: "https://api.example.test" });
  }
  assert.deepEqual(
    calls.filter((c) => c.method !== "GET"),
    [],
  );
  // Not even a read: the report job has nothing to ask the API.
  assert.deepEqual(calls, []);
});

test("drift-check.yml: every job only reads, the report runs after any scan outcome and is uploaded", () => {
  const yml = readFileSync(WORKFLOW, "utf8");
  // (a) no write scope anywhere, in any form.
  assert.doesNotMatch(yml, /\bwrite\b/);
  assert.doesNotMatch(yml, /write-all|read-all/);
  const [top, jobs] = yml.split(/^jobs:\n/m);
  assert.match(top, /^permissions: \{\}$/m);
  const scan = jobs.slice(jobs.indexOf("  scan:\n"), jobs.indexOf("\n  report:\n"));
  const report = jobs.slice(jobs.indexOf("\n  report:\n"));
  assert.ok(scan.length > 0 && report.length > 0);
  // Each job grants exactly contents: read.
  assert.match(scan, /\n {4}permissions:\n {6}contents: read\n {4}outputs:/);
  assert.match(report, /\n {4}permissions:\n {6}contents: read\n {4}steps:/);
  assert.equal(yml.match(/^ +permissions:/gm).length, 2);
  assert.match(report, /if: \$\{\{ always\(\) \}\}/);
  assert.match(report, /SCAN_RESULT: \$\{\{ needs\.scan\.result \}\}/);
  // The report job has no token at all.
  assert.doesNotMatch(report, /GITHUB_TOKEN|github\.token|secrets\./);
  assert.doesNotMatch(yml, /secrets\.|pull_request_target/);
  assert.doesNotMatch(report, /run: .*\$\{\{/);
  // (c) the report file is the uploaded artifact, pinned to a full SHA, uploaded after any outcome.
  assert.match(report, /run: node scripts\/drift-report\.mjs --report-file "\$RUNNER_TEMP\/drift-report\.md"\n/);
  assert.match(
    report,
    /- name: Upload the report\n {8}if: \$\{\{ always\(\) \}\}\n {8}uses: actions\/upload-artifact@[0-9a-f]{40} # v\S+\n {8}with:\n {10}name: drift-report\n {10}path: \$\{\{ runner\.temp \}\}\/drift-report\.md\n {10}if-no-files-found: error\n/,
  );
});

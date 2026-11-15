// Turns the outcome of the drift scan (scripts/drift.mjs) into the run's report
// (docs/PLAN.md §6, T-0.7, DAN-749): the job summary (GITHUB_STEP_SUMMARY) and
// one Markdown file that the workflow uploads as an artifact. It never calls
// the GitHub API and sends no request at all; delivery to the coordination
// issue is a separate PR under DAN-749 (branch feat/dan-749-drift-delivery).
// decide() maps the scan job's result to the report: a clean scan is reported
// as clean, a drift report as is, and anything else (scan failed, cancelled,
// missing or foreign output) as "state unknown", so an unreadable state never
// looks like "no drift".
// Usage: node scripts/drift-report.mjs --report-file report.md
// Env: GITHUB_STEP_SUMMARY, GITHUB_REPOSITORY (owner/name), GITHUB_SERVER_URL,
//      GITHUB_RUN_ID, SCAN_RESULT, SCAN_STATUS, REPORT.
// Exit: 0 clean, 1 drift or unknown state, 2 bad usage or the report could not be written.
import { appendFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { clip } from "./drift.mjs";

const HEADER = "## Razilaženje postavki";
// owner/name; "." and ".." are never names.
const REPO = /^(?!\.{1,2}\/)[A-Za-z0-9_-][A-Za-z0-9_.-]*\/(?!\.{1,2}$)[A-Za-z0-9_.-]+$/;

/** Report text when the scan did not finish with a report we can trust. */
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
 * What the report job reports for a scan outcome.
 * scanResult: needs.scan.result; status: scan output "clean" | "drift"; report: scan output.
 * Returns { outcome: "clean" | "drift" | "unknown", text, exit }.
 */
export function decide({ scanResult, status, report, runUrl } = {}) {
  const text = typeof report === "string" ? report : "";
  const ours = text.startsWith(HEADER);
  const unknown = (reason) => ({ outcome: "unknown", text: unknownText(reason, runUrl), exit: 1 });
  if (scanResult !== "success") return unknown(`posao skeniranja završio je kao „${scanResult || "bez rezultata"}”`);
  if (!ours) return unknown("izvještaj skeniranja nedostaje ili nije prepoznat");
  if (status === "clean") {
    // Clean only when the report itself says so and names nothing unreadable.
    if (/^Nema razilaženja/m.test(text) && !/^Nečitljivo:/m.test(text) && !text.includes("| razilaženje |")) {
      return { outcome: "clean", text, exit: 0 };
    }
    return unknown("status „clean” ne odgovara izvještaju");
  }
  if (status === "drift") return { outcome: "drift", text, exit: 1 };
  return unknown(`nepoznat status skeniranja „${status || ""}”`);
}

/** Writes text to the job summary (when set) and to reportFile, both clipped to the same limit. */
export function writeReport(text, { summaryFile, reportFile }) {
  const body = clip(text);
  if (summaryFile) appendFileSync(summaryFile, body);
  writeFileSync(reportFile, body);
}

export function runUrlFrom(env) {
  const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: id } = env;
  if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(server ?? "") || !REPO.test(repo ?? "") || !/^\d+$/.test(id ?? ""))
    return null;
  return `${server}/${repo}/actions/runs/${id}`;
}

export function main(args = process.argv.slice(2), env = process.env) {
  if (args.length !== 2 || args[0] !== "--report-file" || !args[1] || args[1].startsWith("--")) {
    console.error("usage: node scripts/drift-report.mjs --report-file report.md");
    return 2;
  }
  const decision = decide({
    scanResult: env.SCAN_RESULT,
    status: env.SCAN_STATUS,
    report: env.REPORT,
    runUrl: runUrlFrom(env),
  });
  console.log(`drift-report: ${decision.outcome}`);
  try {
    writeReport(decision.text, { summaryFile: env.GITHUB_STEP_SUMMARY, reportFile: args[1] });
  } catch (error) {
    console.error(`::error title=drift-report::${String(error?.message ?? error).replace(/[\r\n%]/g, " ")}`);
    return 2;
  }
  return decision.exit;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = main();
}

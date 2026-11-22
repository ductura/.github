// Izvještaj o nestabilnom CI-ju i pravilo „3 zelena ci-ok zaredom” (PLAN-MIGRACIJE.md,
// „Faze nakon V2”, F4). Samo čita GitHub API preko `gh api`; ništa ne mijenja.
//
// Nestabilan posao: na istom SHA jednom je pao, a jednom prošao (ponovljeni pokušaj
// istog runa ili drugi run istog workflowa na istom commitu).
// Pravilo: zadnja 3 završena runa na grani imaju zeleni posao `ci-ok`. Run koji je
// otkazan (npr. concurrency ga je zamijenio novijim) ne broji se ni kao zelen ni
// kao crven; svaki drugi ishod osim `success` je crven, i kad posla `ci-ok` nema.
//
// Upotreba:
//   node scripts/ci-nestabilni.mjs --repo ductura/Institution_front_web_chrome \
//     --branch migracija/kopija-ductus-front [--workflow CI] [--runs 30] [--json] [--strogo]
// --strogo: izlaz 1 ako pravilo nije ispunjeno (za skripte); inače izlaz 0.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const ZAREDOM = 3;
export const CI_OK = "ci-ok";

const ghApi = (path) =>
  JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

export function parseArgs(argv) {
  const opts = { workflow: "CI", runs: 30, json: false, strogo: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} traži vrijednost`);
      return v;
    };
    if (a === "--repo") opts.repo = val();
    else if (a === "--branch") opts.branch = val();
    else if (a === "--workflow") opts.workflow = val();
    else if (a === "--runs") opts.runs = Number(val());
    else if (a === "--json") opts.json = true;
    else if (a === "--strogo") opts.strogo = true;
    else throw new Error(`nepoznat argument ${a}`);
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(opts.repo ?? "")) throw new Error("--repo mora biti vlasnik/ime");
  if (!opts.branch) throw new Error("--branch je obvezan");
  if (!Number.isInteger(opts.runs) || opts.runs < 1 || opts.runs > 100) throw new Error("--runs mora biti cijeli broj 1–100");
  return opts;
}

/** Workflow po imenu, putanji ili imenu datoteke. */
export function findWorkflow(workflows, wanted) {
  const hits = workflows.filter((w) => w.name === wanted || w.path === wanted || w.path.endsWith(`/${wanted}`));
  if (hits.length !== 1) throw new Error(`workflow „${wanted}” nađen ${hits.length} puta`);
  return hits[0];
}

/**
 * Čista analiza. `runs`: runovi s API-ja (najnoviji prvi). `jobsOf(run, attempt)`:
 * poslovi tog pokušaja. Vraća nestabilne poslove i stanje pravila.
 */
export function analyze(runs, jobsOf, prRuns = []) {
  const completed = runs.filter((r) => r.status === "completed");
  const seen = new Set(completed.map((r) => r.id));
  const prCompleted = prRuns.filter((r) => r.status === "completed" && !seen.has(r.id));
  const records = [];
  for (const run of [...completed, ...prCompleted]) {
    for (let attempt = 1; attempt <= (run.run_attempt ?? 1); attempt++) {
      for (const job of jobsOf(run, attempt)) {
        records.push({
          sha: run.head_sha,
          run: run.id,
          attempt,
          event: run.event,
          job: job.name,
          conclusion: job.conclusion,
          failedSteps: (job.steps ?? []).filter((s) => s.conclusion === "failure").map((s) => s.name),
          url: job.html_url,
        });
      }
    }
  }

  // Nestabilno: isti SHA i isti posao, barem jedan pad i barem jedan prolaz.
  const groups = new Map();
  for (const r of records) {
    const key = `${r.sha}\u0000${r.job}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const flaky = [];
  for (const list of groups.values()) {
    const failed = list.filter((r) => r.conclusion === "failure" || r.conclusion === "timed_out");
    const passed = list.filter((r) => r.conclusion === "success");
    if (failed.length && passed.length) {
      flaky.push({
        job: list[0].job,
        sha: list[0].sha,
        failed: failed.map(({ run, attempt, failedSteps, url }) => ({ run, attempt, failedSteps, url })),
        passed: passed.map(({ run, attempt }) => ({ run, attempt })),
      });
    }
  }
  const byJob = new Map();
  for (const f of flaky) byJob.set(f.job, (byJob.get(f.job) ?? 0) + 1);

  // Padovi po poslu u zadnjem pokušaju runova grane (otkazani se ne broje).
  const failuresByJob = new Map();
  for (const run of completed) {
    if (run.conclusion === "cancelled") continue;
    for (const j of jobsOf(run, run.run_attempt ?? 1)) {
      if (j.name === CI_OK || !(j.conclusion === "failure" || j.conclusion === "timed_out")) continue;
      failuresByJob.set(j.name, (failuresByJob.get(j.name) ?? 0) + 1);
    }
  }

  // Pravilo: zadnji pokušaj svakog završenog runa, najnoviji prvi.
  const sorted = [...completed].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const counted = [];
  let cancelled = 0;
  for (const run of sorted) {
    if (run.conclusion === "cancelled") {
      cancelled++;
      continue;
    }
    const job = jobsOf(run, run.run_attempt ?? 1).find((j) => j.name === CI_OK);
    counted.push({
      run: run.id,
      sha: run.head_sha,
      created: run.created_at,
      ciOk: job?.conclusion ?? "nema",
      green: job?.conclusion === "success",
      url: run.html_url,
    });
  }
  let streak = 0;
  while (streak < counted.length && counted[streak].green) streak++;
  const last = counted.slice(0, ZAREDOM);
  return {
    runsSeen: runs.length,
    completed: completed.length,
    prRunsSeen: prCompleted.length,
    cancelledSkipped: cancelled,
    flaky,
    flakyByJob: Object.fromEntries([...byJob].sort((a, b) => b[1] - a[1])),
    failuresByJob: Object.fromEntries([...failuresByJob].sort((a, b) => b[1] - a[1])),
    rule: { needed: ZAREDOM, streak, last, ok: last.length === ZAREDOM && last.every((r) => r.green) },
  };
}

export function formatReport(opts, workflow, result) {
  const lines = [];
  lines.push(`# CI izvještaj: ${opts.repo} @ ${opts.branch}`);
  lines.push(`Workflow: ${workflow.name} (${workflow.path}); runova grane: ${result.runsSeen}, završenih: ${result.completed}, otkazanih (ne broje se u pravilu): ${result.cancelledSkipped}; završenih runova PR-ova prema grani: ${result.prRunsSeen}.`);
  lines.push("");
  lines.push(`## Pravilo „${ZAREDOM} zelena ci-ok zaredom”: ${result.rule.ok ? "ISPUNJENO" : "NIJE ISPUNJENO"}`);
  lines.push(`Zelenih zaredom od najnovijeg: ${result.rule.streak}.`);
  for (const r of result.rule.last) lines.push(`- ${r.created} ${r.sha.slice(0, 7)} run ${r.run}: ci-ok ${r.ciOk}`);
  lines.push("");
  lines.push(`## Nestabilni poslovi (pad i prolaz na istom SHA): ${result.flaky.length}`);
  if (!result.flaky.length) lines.push("Nema ih u pregledanim runovima.");
  for (const f of result.flaky) {
    const fail = f.failed.map((x) => `run ${x.run}/${x.attempt}${x.failedSteps.length ? ` [${x.failedSteps.join("; ")}]` : ""}`).join(", ");
    const pass = f.passed.map((x) => `run ${x.run}/${x.attempt}`).join(", ");
    lines.push(`- ${f.job} @ ${f.sha.slice(0, 7)}: pao ${fail}; prošao ${pass}`);
  }
  if (Object.keys(result.flakyByJob).length) {
    lines.push("");
    lines.push("Po poslu: " + Object.entries(result.flakyByJob).map(([j, n]) => `${j} ×${n}`).join(", "));
  }
  lines.push("");
  lines.push("## Padovi po poslu na grani (zadnji pokušaj, bez ci-ok i otkazanih)");
  const fails = Object.entries(result.failuresByJob);
  lines.push(fails.length ? fails.map(([j, n]) => `${j} ×${n}`).join(", ") : "Nema padova.");
  return lines.join("\n");
}

export function main(argv, api = ghApi, out = console.log) {
  const opts = parseArgs(argv);
  const wfs = api(`repos/${opts.repo}/actions/workflows?per_page=100`).workflows;
  const workflow = findWorkflow(wfs, opts.workflow);
  const runs = api(
    `repos/${opts.repo}/actions/workflows/${workflow.id}/runs?branch=${encodeURIComponent(opts.branch)}&per_page=${opts.runs}`,
  ).workflow_runs;
  // Runovi PR-ova kojima je baza ova grana: tamo se pokušaji najčešće ponavljaju.
  const prRuns = api(
    `repos/${opts.repo}/actions/workflows/${workflow.id}/runs?event=pull_request&per_page=${opts.runs}`,
  ).workflow_runs.filter((r) => (r.pull_requests ?? []).some((p) => p.base?.ref === opts.branch));
  const cache = new Map();
  const jobsOf = (run, attempt) => {
    const key = `${run.id}/${attempt}`;
    if (!cache.has(key)) {
      cache.set(key, api(`repos/${opts.repo}/actions/runs/${run.id}/attempts/${attempt}/jobs?per_page=100`).jobs);
    }
    return cache.get(key);
  };
  const result = analyze(runs, jobsOf, prRuns);
  out(opts.json ? JSON.stringify({ repo: opts.repo, branch: opts.branch, workflow: workflow.path, ...result }, null, 2) : formatReport(opts, workflow, result));
  return opts.strogo && !result.rule.ok ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(`ci-nestabilni: ${e.message}`);
    process.exitCode = 2;
  }
}

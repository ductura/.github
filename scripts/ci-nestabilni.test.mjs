// scripts/ci-nestabilni.mjs: nestabilni poslovi na istom SHA i pravilo
// „3 zelena ci-ok zaredom” (PLAN-MIGRACIJE.md, „Faze nakon V2”).
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, findWorkflow, main, parseArgs } from "./ci-nestabilni.mjs";

const job = (name, conclusion, failedStep) => ({
  name,
  conclusion,
  steps: failedStep ? [{ name: failedStep, conclusion: "failure" }] : [{ name: "ok", conclusion: "success" }],
});
const green = () => [job("ui", "success"), job("ci-ok", "success")];
const red = () => [job("ui", "failure", "axe"), job("ci-ok", "failure", "Every needed job succeeded")];
const run = (id, sha, created, conclusion, attempts = 1) => ({
  id, head_sha: sha, created_at: created, status: "completed", conclusion, run_attempt: attempts, event: "push",
});
const jobsFrom = (table) => (r, a) => table[`${r.id}/${a}`] ?? [];

test("tri zelena zaredom ispunjavaju pravilo; otkazani se preskaču", () => {
  const runs = [
    run(5, "e", "2026-11-22T05:00:00Z", "success"),
    run(4, "d", "2026-11-22T04:00:00Z", "cancelled"),
    run(3, "c", "2026-11-22T03:00:00Z", "success"),
    run(2, "b", "2026-11-22T02:00:00Z", "success"),
    run(1, "a", "2026-11-22T01:00:00Z", "failure"),
  ];
  const r = analyze(runs, jobsFrom({ "5/1": green(), "4/1": [], "3/1": green(), "2/1": green(), "1/1": red() }));
  assert.equal(r.rule.ok, true);
  assert.equal(r.rule.streak, 3);
  assert.equal(r.cancelledSkipped, 1);
  assert.deepEqual(r.rule.last.map((x) => x.run), [5, 3, 2]);
});

test("crveni ci-ok ili posao koji nedostaje prekida niz", () => {
  const runs = [
    run(3, "c", "2026-11-22T03:00:00Z", "success"),
    run(2, "b", "2026-11-22T02:00:00Z", "failure"),
    run(1, "a", "2026-11-22T01:00:00Z", "success"),
  ];
  const r = analyze(runs, jobsFrom({ "3/1": green(), "2/1": red(), "1/1": green() }));
  assert.equal(r.rule.ok, false);
  assert.equal(r.rule.streak, 1);
  const noCiOk = analyze(runs, jobsFrom({ "3/1": [job("ui", "success")], "2/1": green(), "1/1": green() }));
  assert.equal(noCiOk.rule.ok, false);
  assert.equal(noCiOk.rule.last[0].ciOk, "nema");
});

test("manje od tri završena runa ne ispunjava pravilo", () => {
  const runs = [run(2, "b", "2026-11-22T02:00:00Z", "success"), run(1, "a", "2026-11-22T01:00:00Z", "success")];
  assert.equal(analyze(runs, jobsFrom({ "2/1": green(), "1/1": green() })).rule.ok, false);
});

test("pravilo gleda zadnji pokušaj; pad pa prolaz na istom SHA je nestabilan posao", () => {
  const runs = [run(7, "f", "2026-11-22T07:00:00Z", "success", 2)];
  const r = analyze(runs, jobsFrom({ "7/1": red(), "7/2": green() }));
  assert.equal(r.rule.last[0].green, true);
  assert.deepEqual(r.flaky.map((f) => f.job).sort(), ["ci-ok", "ui"]);
  const ui = r.flaky.find((f) => f.job === "ui");
  assert.deepEqual(ui.failed[0].failedSteps, ["axe"]);
  assert.deepEqual(ui.passed, [{ run: 7, attempt: 2 }]);
});

test("dva runa na istom SHA s različitim ishodom su nestabilna; različiti SHA nisu", () => {
  const same = [run(2, "x", "2026-11-22T02:00:00Z", "success"), run(1, "x", "2026-11-22T01:00:00Z", "failure")];
  assert.equal(analyze(same, jobsFrom({ "2/1": green(), "1/1": red() })).flaky.length, 2);
  const diff = [run(2, "y", "2026-11-22T02:00:00Z", "success"), run(1, "x", "2026-11-22T01:00:00Z", "failure")];
  assert.equal(analyze(diff, jobsFrom({ "2/1": green(), "1/1": red() })).flaky.length, 0);
});

test("nezavršeni runovi se ne broje", () => {
  const runs = [{ ...run(9, "z", "2026-11-22T09:00:00Z", null), status: "in_progress" }];
  const r = analyze(runs, () => assert.fail("ne traži poslove nezavršenog runa"));
  assert.equal(r.completed, 0);
  assert.equal(r.rule.ok, false);
});

test("argumenti i workflow se provjeravaju", () => {
  assert.throws(() => parseArgs(["--branch", "b"]), /--repo/);
  assert.throws(() => parseArgs(["--repo", "a/b"]), /--branch/);
  assert.throws(() => parseArgs(["--repo", "a/b", "--branch", "x", "--runs", "500"]), /--runs/);
  assert.throws(() => parseArgs(["--repo", "a/b", "--branch", "x", "--nesto"]), /nepoznat/);
  const wfs = [{ id: 1, name: "CI", path: ".github/workflows/ci.yml" }, { id: 2, name: "Sistem", path: ".github/workflows/sistem.yml" }];
  assert.equal(findWorkflow(wfs, "CI").id, 1);
  assert.equal(findWorkflow(wfs, "sistem.yml").id, 2);
  assert.throws(() => findWorkflow(wfs, "nema"), /0 puta/);
});

test("main: --strogo vraća 1 kad pravilo nije ispunjeno, putanje API-ja su točne", () => {
  const calls = [];
  const api = (p) => {
    calls.push(p);
    if (p.includes("/actions/workflows?")) return { workflows: [{ id: 11, name: "CI", path: ".github/workflows/ci.yml" }] };
    if (p.includes("/workflows/11/runs?event=pull_request")) {
      return {
        workflow_runs: [
          { ...run(3, "p", "2026-11-22T03:00:00Z", "success", 2), event: "pull_request", pull_requests: [{ base: { ref: "migracija/x" } }] },
          { ...run(4, "q", "2026-11-22T04:00:00Z", "failure"), event: "pull_request", pull_requests: [{ base: { ref: "main" } }] },
        ],
      };
    }
    if (p.includes("/workflows/11/runs?branch=")) return { workflow_runs: [run(1, "a", "2026-11-22T01:00:00Z", "failure")] };
    if (p.endsWith("/runs/3/attempts/1/jobs?per_page=100")) return { jobs: red() };
    if (p.endsWith("/runs/3/attempts/2/jobs?per_page=100")) return { jobs: green() };
    if (p.endsWith("/runs/1/attempts/1/jobs?per_page=100")) return { jobs: red() };
    throw new Error(`neočekivan poziv ${p}`);
  };
  const out = [];
  const args = ["--repo", "o/r", "--branch", "migracija/x", "--runs", "5"];
  assert.equal(main([...args, "--strogo"], api, (s) => out.push(s)), 1);
  assert.equal(main(args, api, (s) => out.push(s)), 0);
  assert.ok(calls.includes("repos/o/r/actions/workflows/11/runs?branch=migracija%2Fx&per_page=5"));
  assert.match(out[0], /NIJE ISPUNJENO/);
  // PR prema grani daje nestabilan posao; PR prema drugoj bazi se ne čita, a ne ulazi ni u pravilo.
  assert.match(out[0], /ui @ p: pao run 3\/1 \[axe\]; prošao run 3\/2/);
  assert.ok(!calls.some((c) => c.includes("/runs/4/")));
  assert.match(out[0], /Padovi po poslu[^\n]*\nui ×1/);
});

test("padovi po poslu broje zadnji pokušaj runova grane, bez ci-ok i otkazanih", () => {
  const runs = [
    run(3, "c", "2026-11-22T03:00:00Z", "failure"),
    run(2, "b", "2026-11-22T02:00:00Z", "cancelled"),
    run(1, "a", "2026-11-22T01:00:00Z", "failure"),
  ];
  const r = analyze(runs, jobsFrom({ "3/1": red(), "2/1": red(), "1/1": red() }));
  assert.deepEqual(r.failuresByJob, { ui: 2 });
});

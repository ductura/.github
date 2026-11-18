// DAN-1078-1: the zizmor job of self-test.yml scans .github/workflows with a
// pinned zizmor and fails closed. The shipped block runs here with a fake
// python3 (venv with a fake pip and zizmor), so exit codes, arguments and the
// environment are tested without network; the real tool runs in self-test.yml.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, parseDocument } from "yaml";
import { extractRun } from "./extract-run.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const selfTestText = read(".github/workflows/self-test.yml");
const selfTest = parse(selfTestText);
const script = extractRun(selfTestText, "zizmor");

const CLEAN = "No findings to report. Good job! (28 ignored)";

function run({ status = 0, out = CLEAN, pipExit = 0, input } = {}) {
  const root = mkdtempSync(join(tmpdir(), "zizmor-"));
  const bin = join(root, "bin");
  mkdirSync(bin);
  mkdirSync(join(root, "workflows"));
  const venvBin = (name, body) => `cat > "$d/bin/${name}" <<'EOF'\n#!/usr/bin/env bash\n${body}\nEOF\nchmod +x "$d/bin/${name}"\n`;
  writeFileSync(
    join(bin, "python3"),
    `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${root}/python3.args"\nd="\${@: -1}"\nmkdir -p "$d/bin"\n` +
      venvBin("python", `printf '%s\\n' "$@" > "${root}/pip.args"\nexit ${pipExit}`) +
      venvBin("zizmor", `printf '%s\\n' "$@" > "${root}/zizmor.args"\nenv > "${root}/zizmor.env"\nprintf '%s\\n' ${JSON.stringify(out)}\nexit ${status}`),
  );
  chmodSync(join(bin, "python3"), 0o755);
  const r = spawnSync("bash", ["-c", script], {
    encoding: "utf8",
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      RUNNER_TEMP: root,
      ...(input === null ? {} : { ZIZMOR_INPUT: input ?? join(root, "workflows") }),
      GH_TOKEN: "fake-gh",
      GITHUB_TOKEN: "fake-github",
      ZIZMOR_GITHUB_TOKEN: "fake-zizmor",
      ZIZMOR_CONFIG: "other.yml",
    },
  });
  const lines = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), "utf8").trimEnd().split("\n") : null);
  return { status: r.status, out: r.stdout + r.stderr, python3: lines("python3.args"), pip: lines("pip.args"), zizmor: lines("zizmor.args"), env: lines("zizmor.env"), root };
}

// Negative cases first: every one must end red with its own message.
for (const code of [10, 11, 12, 13, 14]) {
  test(`zizmor exit ${code} (findings) fails the block`, () => {
    const r = run({ status: code, out: "1 finding: 0 informational, 1 low, 0 medium, 0 high" });
    assert.equal(r.status, 1, r.out);
    assert.ok(r.zizmor, "zizmor ran");
    assert.ok(r.out.includes(`::error::zizmor found findings in ${join(r.root, "workflows")} (exit ${code})`), r.out);
  });
}

// Every code but 0 and 10-14 is a tool error (3: no inputs collected).
test("every other zizmor exit code (tool error) fails the block", () => {
  for (let code = 1; code < 256; code++) {
    if (code >= 10 && code <= 14) continue;
    const r = run({ status: code, out: "fatal: no inputs collected" });
    assert.equal(r.status, 1, `exit ${code}: ${r.out}`);
    assert.ok(r.zizmor, "zizmor ran");
    assert.ok(r.out.includes(`::error::zizmor did not complete (exit ${code})`), r.out);
  }
});

for (const out of ["No findings to report. Good job! (3 suppressed)", "No findings (29 ignored, 1 suppressed)", "2 findings (2 suppressed): 0 informational, 0 low, 0 medium, 0 high"]) {
  test(`exit 0 with suppressed findings fails the block: ${out}`, () => {
    const r = run({ status: 0, out });
    assert.equal(r.status, 1, r.out);
    assert.ok(r.zizmor, "zizmor ran");
    assert.ok(r.out.includes("::error::zizmor suppressed findings"), r.out);
  });
}

// Exit 0 counts only with zizmor's own clean report at the start of a line
// (QA on ductura/.github#37): an empty or foreign output is red.
for (const out of ["", " \n", "done", "2 findings: 0 informational, 2 low, 0 medium, 0 high", "x No findings to report. Good job!"]) {
  test(`exit 0 without the clean report fails the block: ${JSON.stringify(out)}`, () => {
    const r = run({ status: 0, out });
    assert.equal(r.status, 1, r.out);
    assert.ok(r.zizmor, "zizmor ran");
    assert.ok(r.out.includes("::error::zizmor reported no clean result"), r.out);
  });
}

for (const input of [null, "", "missing-folder"]) {
  test(`input ${JSON.stringify(input)} that is unset or missing fails before zizmor runs`, () => {
    const r = run({ input });
    assert.equal(r.status, 1, r.out);
    assert.equal(r.pip, null, "pip must not run");
    assert.ok(r.out.includes("::error::zizmor input"), r.out);
  });
}

test("a failed pip install fails the block before zizmor runs", () => {
  const r = run({ pipExit: 1 });
  assert.notEqual(r.status, 0, r.out);
  assert.ok(r.pip, "pip ran");
  assert.equal(r.zizmor, null, "zizmor must not run");
});

test("a clean scan passes with the exact install, call and no token", () => {
  const r = run();
  assert.equal(r.status, 0, r.out);
  // Isolated Python (-I): a venv.py or pip/ in the checkout cannot shadow the standard modules.
  assert.deepEqual(r.python3, ["-I", "-m", "venv", r.python3[3]]);
  assert.ok(r.python3[3].startsWith(join(r.root, "zizmor.")));
  assert.deepEqual(r.pip, ["-I", "-m", "pip", "install", "--quiet", "--disable-pip-version-check", "--require-hashes", "--no-deps", "--only-binary", ":all:", "-r", "scripts/zizmor/requirements.txt"]);
  // A filter (--min-severity, --no-exit-codes, a persona below auditor,
  // another config) would hide findings: only zizmor.yml may set one aside.
  // --collect=all: a .gitignore in the checkout cannot hide a workflow from the scan.
  assert.deepEqual(r.zizmor, ["--offline", "--config", "zizmor.yml", "--strict-collection", "--collect=all", "--persona", "auditor", "--format", "plain", "--color", "never", "--no-progress", join(r.root, "workflows")]);
  for (const name of ["GH_TOKEN", "GITHUB_TOKEN", "ZIZMOR_GITHUB_TOKEN", "ZIZMOR_CONFIG"]) {
    assert.equal(r.env.some((l) => l.startsWith(`${name}=`)), false, `${name} reaches zizmor`);
  }
});

test("the venv line of the block ignores a venv.py in the working directory (real python3)", () => {
  const cwd = mkdtempSync(join(tmpdir(), "zizmor-cwd-"));
  writeFileSync(join(cwd, "venv.py"), `open(${JSON.stringify(join(cwd, "shadowed"))}, "w").write("x")\n`);
  const line = script.split("\n").filter((l) => /\bpython3\b.*-m venv/.test(l));
  assert.equal(line.length, 1);
  const r = spawnSync("bash", ["-c", `set -e; venv="$1"; ${line[0]}`, "bash", join(cwd, "v")], { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(join(cwd, "shadowed")), false, "venv.py from the checkout ran");
  assert.ok(existsSync(join(cwd, "v", "bin", "python")));
});

// The job and every step always run: an `if` or `continue-on-error` would
// leave a green job that scanned nothing (QA on ductura/.github#35).
test("the zizmor job runs only its block, unconditionally, inside ci-ok", () => {
  const job = selfTest.jobs.zizmor;
  assert.ok(Object.hasOwn(selfTest.on, "pull_request"));
  // Exact keys: a container, working-directory or condition would scan something else or nothing.
  assert.deepEqual(Object.keys(job).sort(), ["runs-on", "steps", "timeout-minutes"]);
  assert.equal(job["runs-on"], "ubuntu-latest");
  for (const step of job.steps) {
    for (const key of ["if", "continue-on-error"]) assert.equal(Object.hasOwn(step, key), false, `step has ${key}`);
  }
  // BASH_ENV or a shell default could replace python3 before the block runs.
  for (const scope of [selfTest, job]) for (const key of ["env", "defaults"]) assert.equal(Object.hasOwn(scope, key), false, `${key} around the job`);
  assert.equal(job.steps.length, 2);
  assert.match(job.steps[0].uses, /^actions\/checkout@[0-9a-f]{40}$/);
  assert.deepEqual(job.steps[0].with, { "persist-credentials": false });
  const runs = job.steps.slice(1);
  assert.deepEqual(Object.keys(job.steps[0]).sort(), ["uses", "with"]);
  assert.deepEqual(Object.keys(runs[0]).sort(), ["env", "name", "run", "shell"]);
  assert.equal(runs[0].shell, "bash");
  assert.deepEqual(runs[0].env, { ZIZMOR_INPUT: ".github/workflows" });
  assert.equal(runs[0].run, `# zizmor:begin\n${script}# zizmor:end\n`);
  assert.doesNotMatch(script, /\$\{\{|\|\|\s*(true|:)\b/);
  for (const aggregate of ["ci-ok", "ci-ok-reusable"]) assert.ok(selfTest.jobs[aggregate].needs.includes("zizmor"), aggregate);
  assert.doesNotMatch(JSON.stringify(selfTest.jobs["ci-ok-reusable"].with) + JSON.stringify(selfTest.jobs["ci-ok"].steps.map((st) => st.env ?? {})), /zizmor/, "zizmor may never be skipped");
});

test("zizmor is pinned to an exact version, every wheel by sha256", () => {
  const lines = read("scripts/zizmor/requirements.txt").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  assert.match(lines[0], /^zizmor==\d+\.\d+\.\d+ \\$/);
  assert.ok(lines.length > 1);
  const hashes = lines.slice(1).map((l) => /[0-9a-f]{64}/.exec(l)?.[0]);
  assert.equal(new Set(hashes).size, hashes.length, "unique hashes");
  lines.slice(1).forEach((l, i) => assert.match(l, i === lines.length - 2 ? /^ {4}--hash=sha256:[0-9a-f]{64}$/ : /^ {4}--hash=sha256:[0-9a-f]{64} \\$/));
});

test("exceptions live only in zizmor.yml, each with a reason and existing files", () => {
  const files = readdirSync(new URL("../.github/workflows/", import.meta.url));
  for (const f of files) assert.doesNotMatch(read(`.github/workflows/${f}`), /zizmor\s*:\s*ignore/i, f);
  const doc = parseDocument(read("zizmor.yml"), { uniqueKeys: true });
  assert.deepEqual(doc.errors, []);
  assert.deepEqual(Object.keys(doc.toJS()), ["rules"]);
  const rules = doc.get("rules");
  assert.ok(rules.items.length > 0);
  rules.items.forEach((pair, i) => {
    const name = String(pair.key.value);
    // The parser hangs the comment above the first rule on the map itself.
    const reason = pair.key.commentBefore ?? (i === 0 ? rules.commentBefore : undefined);
    assert.match(reason ?? "", /^ ?Reason: \S/, `${name} has a reason`);
    assert.deepEqual(Object.keys(pair.value.toJS(doc)), ["ignore"], `${name} only ignores`);
    for (const entry of pair.value.toJS(doc).ignore) {
      const [file, ...at] = String(entry).split(":");
      assert.ok(files.includes(file), `${name}: ${entry} names a workflow`);
      assert.ok(at.length <= 2 && at.every((n) => /^[1-9]\d*$/.test(n)), `${name}: ${entry} is file[:line[:column]]`);
    }
  });
});

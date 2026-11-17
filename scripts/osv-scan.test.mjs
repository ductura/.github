// DAN-921: osv-scan.yml ships a pinned osv-scanner that fails closed. The
// shipped block runs here with a fake `docker`, so exit-code handling and the
// path guard are tested without network; the real image runs in self-test.yml.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDocument } from "yaml";
import { extractRun } from "./extract-run.mjs";

const workflow = readFileSync(new URL("../.github/workflows/osv-scan.yml", import.meta.url), "utf8");
const script = extractRun(workflow, "osv-scan");

function run(scanPath, dockerExit = 0) {
  const root = mkdtempSync(join(tmpdir(), "osv-"));
  const ws = join(root, "ws");
  const bin = join(root, "bin");
  mkdirSync(join(ws, "app"), { recursive: true });
  mkdirSync(join(root, "outside"));
  mkdirSync(bin);
  // escape -> a real folder outside the workspace; inner -> a folder inside it.
  symlinkSync(join(root, "outside"), join(ws, "escape"));
  symlinkSync(join(ws, "app"), join(ws, "inner"));
  writeFileSync(join(bin, "docker"), `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${root}/args"\nexit ${dockerExit}\n`);
  chmodSync(join(bin, "docker"), 0o755);
  const r = spawnSync("bash", ["-c", script], {
    encoding: "utf8",
    env: { PATH: `${bin}:${process.env.PATH}`, GITHUB_WORKSPACE: ws, SCAN_PATH: scanPath },
  });
  let args = null;
  try {
    args = readFileSync(join(root, "args"), "utf8").trim().split("\n");
  } catch {}
  return { status: r.status, out: r.stdout + r.stderr, args, ws };
}

test("image is pinned to a version and a sha256 digest", () => {
  const images = [...script.matchAll(/ghcr\.io\/google\/osv-scanner\S*/g)].map((m) => m[0]);
  assert.equal(images.length, 1);
  assert.match(images[0], /^ghcr\.io\/google\/osv-scanner:v\d+\.\d+\.\d+@sha256:[0-9a-f]{64}$/);
});

test("block takes no expressions and never swallows the scanner's status", () => {
  assert.doesNotMatch(script, /\$\{\{/);
  assert.doesNotMatch(script, /\|\|\s*true/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test("workflow and job only read contents", () => {
  const doc = parseDocument(workflow).toJS();
  assert.deepEqual(doc.permissions, { contents: "read" });
  for (const job of Object.values(doc.jobs)) assert.ok(job.permissions === undefined || job.permissions.contents === "read");
});

for (const [code, message] of [
  [1, "::error::osv-scanner found known vulnerabilities"],
  [128, "::error::osv-scanner found no lockfile to scan"],
  [127, "::error::osv-scanner did not complete (exit 127)"],
  [2, "::error::osv-scanner did not complete (exit 2)"],
]) {
  test(`scanner exit ${code} fails the job`, () => {
    const r = run("app", code);
    assert.equal(r.status, 1);
    assert.ok(r.out.includes(message), r.out);
  });
}

for (const bad of ["../x", "a/../..", "a:b", "/etc", "a b", "a\nb", "a\tb", "a\u00a0b", "a\u007fb", "C:\\x", "", "missing", "escape", "escape/", "app/../escape"]) {
  test(`path ${JSON.stringify(bad)} is refused before docker runs`, () => {
    const r = run(bad, 0);
    assert.equal(r.status, 1, r.out);
    assert.equal(r.args, null, "docker must not run");
    assert.match(r.out, /::error::path /);
  });
}

test("clean scan passes and mounts the resolved directory read-only", () => {
  for (const ok of ["app", ".", "./app/", "inner"]) {
    const r = run(ok, 0);
    assert.equal(r.status, 0, r.out);
    const mount = r.args[r.args.indexOf("-v") + 1];
    assert.match(mount, /^\/.+:\/src:ro$/);
    assert.ok(mount.startsWith(r.ws), mount);
    assert.deepEqual(r.args.slice(-4), ["scan", "source", "-r", "/src"]);
    assert.ok(r.args.includes("HOME=/tmp"));
  }
});

test("a symlink out of the workspace is refused by the realpath check", () => {
  for (const p of ["escape", "escape/"]) {
    const r = run(p, 0);
    assert.equal(r.status, 1, r.out);
    assert.equal(r.args, null, "docker must not run");
    assert.ok(r.out.includes("::error::path resolves outside the repository"), r.out);
  }
  const inner = run("inner", 0);
  assert.equal(inner.args[inner.args.indexOf("-v") + 1], `${join(inner.ws, "app")}:/src:ro`);
});

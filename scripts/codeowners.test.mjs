// Guards .github/CODEOWNERS (DAN-1527): the file must exist, every rule must use
// a valid owner and match a real tracked path, and the four areas the audit named
// (workflows, scripts/, drift/, docs/plan/) must each have their own rule, so a
// future "*"-only or emptied file fails here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = /^@[A-Za-z0-9][A-Za-z0-9-]*(\/[A-Za-z0-9_.-]+)?$/;

const rules = readFileSync(join(ROOT, ".github", "CODEOWNERS"), "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "" && !line.startsWith("#"))
  .map((line) => {
    const [pattern, ...owners] = line.split(/\s+/);
    return { pattern, owners };
  });

const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

// Only the pattern shapes this file uses: "*" and "/dir/" prefixes.
const matches = (pattern, path) =>
  pattern === "*" || (pattern.startsWith("/") && pattern.endsWith("/") && path.startsWith(pattern.slice(1)));

test("every rule has at least one valid owner", () => {
  assert.ok(rules.length > 0);
  for (const { pattern, owners } of rules) {
    assert.ok(owners.length > 0, `no owner for ${pattern}`);
    for (const owner of owners) assert.match(owner, OWNER, `bad owner ${owner} for ${pattern}`);
  }
});

test("every rule matches at least one tracked file (no dead rules)", () => {
  for (const { pattern } of rules) {
    assert.ok(tracked.some((path) => matches(pattern, path)), `dead rule: ${pattern}`);
  }
});

test("workflows, scripts, drift and docs/plan have their own rule", () => {
  const patterns = rules.map((rule) => rule.pattern);
  for (const dir of ["/.github/", "/scripts/", "/drift/", "/docs/plan/"]) {
    assert.ok(patterns.includes(dir), `missing rule for ${dir}`);
  }
  for (const path of [".github/workflows/ci-ok.yml", "scripts/gate/risk-floor.ts", "drift/expected.json", "docs/plan/PLAN.md"]) {
    const hit = rules.filter((rule) => rule.pattern !== "*" && matches(rule.pattern, path));
    assert.ok(hit.length > 0, `${path} is covered only by the default rule`);
  }
});

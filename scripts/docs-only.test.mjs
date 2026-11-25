// docs-only.mjs: which pull requests may skip the fixture jobs of self-test.yml.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { docsOnly } from "./docs-only.mjs";

const cases = [
  [["docs/plan/a.md"], true],
  [["docs/plan/a.md", "docs/plan/b/c.json"], true],
  [[], false],
  [["docs/plan/a.md", ".github/workflows/self-test.yml"], false],
  [["README.md"], false],
  [[".github/pull_request_template.md"], false],
  [["fixtures/tests-table/template.json"], false],
  [["scripts/tests-table.mjs"], false],
  [["docsx/a.md"], false],
  [["docs"], false],
  [["docs/../scripts/a.mjs"], false],
  [["x/docs/a.md"], false],
];
for (const [files, want] of cases) {
  test(`docs-only ${JSON.stringify(files)} → ${want}`, () => {
    assert.equal(docsOnly(files), want);
  });
}

test("docs-only CLI prints the output line and fails closed on empty input", () => {
  const run = (input) =>
    spawnSync(process.execPath, [fileURLToPath(new URL("docs-only.mjs", import.meta.url))], { input, encoding: "utf8" });
  assert.equal(run("docs/plan/a.md\r\ndocs/b.md\n").stdout, "fixtures=false\n");
  assert.equal(run("docs/plan/a.md\nscripts/x.mjs\n").stdout, "fixtures=true\n");
  assert.equal(run("").stdout, "fixtures=true\n");
});

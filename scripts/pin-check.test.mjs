import { test } from "node:test";
import assert from "node:assert/strict";
import { checkText } from "./pin-check.mjs";

const SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const DIGEST = "a".repeat(64);

const cases = [
  ["full SHA", `      - uses: actions/checkout@${SHA} # v7.0.1`, true],
  ["full SHA with sub-path", `    uses: github/codeql-action/init@${SHA}`, true],
  ["double-quoted full SHA", `      - uses: "actions/checkout@${SHA}"`, true],
  ["local reusable workflow", "    uses: ./.github/workflows/ci-node.yml", true],
  ["local action", "      - uses: ./actions/setup", true],
  ["docker with digest", `      - uses: docker://alpine@sha256:${DIGEST}`, true],
  ["major tag", "      - uses: actions/checkout@v4", false],
  ["exact tag", "      - uses: actions/checkout@v4.2.2", false],
  ["branch", "      - uses: actions/checkout@main", false],
  ["short SHA", "      - uses: actions/checkout@3d3c42e", false],
  ["uppercase SHA", `      - uses: actions/checkout@${SHA.toUpperCase()}`, false],
  ["41 hex characters", `      - uses: actions/checkout@${SHA}0`, false],
  ["no ref", "      - uses: actions/checkout", false],
  ["quoted tag", "      - uses: 'actions/checkout@v4'", false],
  ["remote reusable workflow on tag", "    uses: ductura/.github/.github/workflows/ci-node.yml@ci-v1", false],
  ["docker tag", "      - uses: docker://alpine:3.20", false],
  ["docker short digest", "      - uses: docker://alpine@sha256:abc", false],
];

for (const [name, line, ok] of cases) {
  test(`${ok ? "accepts" : "rejects"}: ${name}`, () => {
    const problems = checkText(line, "x.yml");
    assert.equal(problems.length, ok ? 0 : 1, JSON.stringify(problems));
  });
}

test("ignores comments and non-uses keys", () => {
  const text = ["# uses: actions/checkout@v4", "  name: uses actions@v4", "  run: echo uses: x@v1"].join("\n");
  assert.deepEqual(checkText(text, "x.yml"), []);
});

test("reports file and line number", () => {
  const text = `steps:\n  - uses: actions/checkout@${SHA}\n  - uses: actions/setup-node@v4\n`;
  assert.deepEqual(checkText(text, "w.yml"), [
    { file: "w.yml", line: 3, ref: "actions/setup-node@v4" },
  ]);
});

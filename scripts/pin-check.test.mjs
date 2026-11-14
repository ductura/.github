import { test } from "node:test";
import assert from "node:assert/strict";
import { checkText, countUses } from "./pin-check.mjs";

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
  ["space before colon", "      - uses : actions/checkout@v4", false],
  ["single-quoted key", "      - 'uses': actions/checkout@v4", false],
  ["double-quoted key", '      - "uses": actions/checkout@v4', false],
  ["value on the next line", "      - uses:", false],
  ["quoted key with full SHA", `      - "uses": actions/checkout@${SHA}`, true],
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

const eolCases = [
  ["CRLF unpinned", "steps:\r\n  - uses: actions/checkout@v4\r\n", [2]],
  ["CRLF pinned", `steps:\r\n  - uses: actions/checkout@${SHA}\r\n`, []],
  ["lone CR unpinned", "steps:\r  - uses: actions/checkout@v4\r", [2]],
  ["mixed endings keep line numbers", `a:\n  - uses: x/y@${SHA}\r\n  - uses: x/y@main\r  - uses: x/y@v1\n`, [3, 4]],
];

for (const [name, text, lines] of eolCases) {
  test(`line endings: ${name}`, () => {
    assert.deepEqual(checkText(text, "x.yml").map((p) => p.line), lines);
  });
}

test("countUses sees uses lines with any line ending", () => {
  assert.equal(countUses(`- uses: a/b@${SHA}\r\n- uses: ./x\r- run: echo\n`), 2);
});

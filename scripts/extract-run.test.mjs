import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRun } from "./extract-run.mjs";

const yml = [
  "jobs:",
  "  x:",
  "    steps:",
  "      - run: |",
  "          echo before",
  "          # demo:begin",
  "          if true; then",
  "            echo inside",
  "          fi",
  "          # demo:end",
  "          echo after",
].join("\n");

test("returns the dedented lines between the markers", () => {
  assert.equal(extractRun(yml, "demo"), "if true; then\n  echo inside\nfi\n");
});

test("accepts CRLF line endings", () => {
  assert.equal(extractRun(yml.replaceAll("\n", "\r\n"), "demo"), "if true; then\n  echo inside\nfi\n");
});

for (const [name, text] of [
  ["missing begin", "# demo:end\n"],
  ["missing end", "# demo:begin\necho x\n"],
  ["end before begin", "# demo:end\n# demo:begin\n"],
  ["duplicate begin", "# demo:begin\n# demo:begin\n# demo:end\n"],
  ["empty block", "# demo:begin\n# demo:end\n"],
  ["marker name is a prefix", "# demo-x:begin\necho x\n# demo-x:end\n"],
]) {
  test(`throws: ${name}`, () => {
    assert.throws(() => extractRun(text, "demo"));
  });
}

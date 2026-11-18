// Guards the zizmor jobs of self-test.yml (DAN-1078): the tool stays pinned,
// the negative job runs the exact block of the zizmor job over the fixture,
// and exceptions live only in zizmor.yml, each with a reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parse, parseDocument } from "yaml";
import { extractRun } from "./extract-run.mjs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const selfTestText = read(".github/workflows/self-test.yml");
const jobs = parse(selfTestText).jobs;
const runs = (job) => jobs[job].steps.filter((s) => typeof s.run === "string");

test("zizmor is installed at an exact version with a sha256 for every file", () => {
  const lines = read("scripts/zizmor/requirements.txt").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  assert.match(lines[0], /^zizmor==\d+\.\d+\.\d+ \\$/);
  const hashes = lines.slice(1);
  assert.ok(hashes.length > 0);
  for (const l of hashes) assert.match(l, /^ {4}--hash=sha256:[0-9a-f]{64}( \\)?$/);
  const block = extractRun(selfTestText, "zizmor");
  assert.match(block, /--require-hashes --no-deps --only-binary :all: -r scripts\/zizmor\/requirements\.txt/);
  // The exact call: a filter flag (--min-severity, --min-confidence,
  // --no-exit-codes, another persona or config) would hide findings.
  const call = block.split("\n").filter((l) => /zizmor"? --|^\s+--/.test(l)).map((l) => l.trim()).join(" ");
  assert.equal(call, '"$venv/bin/zizmor" --offline --config zizmor.yml --strict-collection \\ --persona regular --format plain --color never --no-progress "$ZIZMOR_INPUT" || status=$?');
  assert.doesNotMatch(block, /--(min-severity|min-confidence|no-exit-codes|no-config|collect|no-ignores)\b/);
});

test("the zizmor job scans .github/workflows with its block", () => {
  const [step] = runs("zizmor");
  assert.equal(step.env?.ZIZMOR_INPUT, ".github/workflows");
  // Nothing around the block: the negative job runs only what is between the markers.
  assert.ok(step.run.startsWith("# zizmor:begin\n"), "the step starts with the block");
  assert.ok(step.run.trimEnd().endsWith("\n# zizmor:end"), "the step ends with the block");
  assert.doesNotMatch(step.run, /\$\{\{/, "values reach the block only through env");
});

test("zizmor-negative runs that block over the template-injection fixture", () => {
  const [step] = runs("zizmor-negative");
  assert.match(step.run, /node scripts\/extract-run\.mjs \.github\/workflows\/self-test\.yml zizmor > /);
  assert.match(step.run, /fixture=fixtures\/zizmor\/template-injection\.yml\n/);
  const lines = step.run.split("\n").map((l) => l.trim());
  for (const want of [
    'expect_fail "$fixture" "::error::zizmor found findings in $fixture"',
    'if [ "$ids" != "[template-injection] " ]; then',
    'echo "::error::expected only [template-injection] in $fixture, got: ${ids:-none}"',
  ]) assert.ok(lines.includes(want), `negative step has: ${want}`);
  assert.doesNotMatch(step.run, /\b(true|false)\b|\|\|\s*:/, "no check is switched off");
  assert.doesNotMatch(step.run, /\$\{\{/);
  const fixture = parse(read("fixtures/zizmor/template-injection.yml"));
  const inRun = Object.values(fixture.jobs).flatMap((j) => j.steps).map((s) => s.run ?? "");
  assert.ok(inRun.some((r) => r.includes("${{ github.event.pull_request.title }}")));
});

test("exceptions are only in zizmor.yml, each rule with a reason", () => {
  for (const f of readdirSync(new URL(".github/workflows/", root))) {
    assert.doesNotMatch(read(`.github/workflows/${f}`), /zizmor:\s*ignore/i, f);
  }
  const doc = parseDocument(read("zizmor.yml"), { uniqueKeys: true });
  assert.equal(doc.errors.length, 0);
  const rules = doc.get("rules");
  assert.ok(rules?.items?.length > 0);
  rules.items.forEach((pair, i) => {
    // The parser hangs the comment above the first rule on the map itself.
    const reason = pair.key.commentBefore ?? (i === 0 ? rules.commentBefore : undefined);
    assert.match(reason ?? "", /^ ?Reason: \S/, `rule ${pair.key.value} has a reason`);
    assert.notEqual(pair.value.get("disable"), true, `rule ${pair.key.value} is not disabled outright`);
  });
});

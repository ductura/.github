// Risk floor from a repository's risk-paths.json (S-0.10-a, DAN-1004).
// The glob assertions follow ductura/Institution_server scripts/engineering/risk-floor.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { minimumRisk, parseRiskTable } from "./risk-floor.ts";

const TEMPLATE = readFileSync(
  new URL("../new-repo/templates/common/risk-paths.json", import.meta.url),
  "utf8",
);
const rule = (pattern: string, risk = "low") => ({ pattern, risk, reason: "r" });
const table = (rules: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ version: 1, default: "standard", rules, ...extra });

test("template table: docs and workflows are critical, docs alone low", () => {
  const t = parseRiskTable(TEMPLATE);
  assert.equal(minimumRisk(t, ["docs/a.md", ".github/x.yml"]), "critical");
  assert.equal(minimumRisk(t, [".github/x.yml", "docs/a.md"]), "critical");
  assert.equal(minimumRisk(t, ["docs/a.md"]), "low");
  assert.equal(minimumRisk(t, ["src/unknown.ts"]), "standard");
});

test("unknown path gets the default of the table", () => {
  for (const level of ["low", "standard", "critical"]) {
    const t = parseRiskTable(table([rule("docs/**", "low")], { default: level }));
    assert.equal(minimumRisk(t, ["src/x.ts"]), level);
  }
});

test("the default applies per path, also in a mixed list", () => {
  const template = parseRiskTable(TEMPLATE);
  const lowered = parseRiskTable(table([rule("docs/**", "low")], { default: "critical" }));
  for (const [t, path, expected] of [
    [template, "src/unknown.ts", "standard"],
    [lowered, "src/x.ts", "critical"],
  ] as const) {
    assert.equal(minimumRisk(t, ["docs/a.md", path]), expected);
    assert.equal(minimumRisk(t, [path, "docs/a.md"]), expected);
  }
});

test("the highest matching level wins whatever the order", () => {
  const rules = [rule("docs/**", "low"), rule("docs/gate/**", "critical")];
  for (const list of [rules, [...rules].reverse()])
    assert.equal(minimumRisk(parseRiskTable(table(list)), ["docs/gate/a.md"]), "critical");
});

test("globs: ** is whole segments (also none), * stays in one segment", () => {
  const cases: [string, string, boolean][] = [
    ["a/**/b", "a/b", true],
    ["a/**/b", "a/x/y/b", true],
    ["**", "x/y/z.md", true],
    ["**/*.md", "a.md", true],
    ["*", "a.md", true],
    ["*", "d/a.md", false],
    ["docs/*.md", "docs/x/a.md", false],
    ["docs/**", "docs", false],
    ["docs/**", "docs-x/a.md", false],
    ["a.md", "aXmd", false],
    ["docs/**", "docs/a\u00a0b.md", true],
    ["docs/**", "docs/a\u2028b.md", true],
    ["db/**/migrations/**", "db/x/migrations/1.sql", true],
    ["a+b", "aab", false],
    ["a+b", "a+b", true],
    ["@x/*", "@x/a", true],
    ["**/**/a", "x/a", true],
    ["a/**/b/**/c/**", "a/b/c/d", true],
    ["*a*b*", "xaybz", true],
    ["*a*b*", "xbya", false],
  ];
  for (const [pattern, path, match] of cases) {
    const t = parseRiskTable(table([rule(pattern, "critical")]));
    assert.equal(minimumRisk(t, [path]), match ? "critical" : "standard", `${pattern} ~ ${path}`);
  }
});

test("letter case never lowers the floor", () => {
  const t = parseRiskTable(TEMPLATE);
  assert.equal(minimumRisk(t, [".GitHub/x.yml"]), "critical");
  assert.equal(minimumRisk(t, ["Claude.MD"]), "critical");
  assert.equal(minimumRisk(t, ["Docs/a.md"]), "standard");
  assert.equal(minimumRisk(t, ["readme.md"]), "standard");
  // A case variant must not escape a higher rule and fall to a lower one.
  for (const level of ["low", "standard", "critical"]) {
    const rules = [rule("docs/**", "low"), rule("docs/protected/**", "critical")];
    const nested = parseRiskTable(table(rules, { default: level }));
    for (const path of ["docs/protected/a.md", "docs/Protected/a.md", "DOCS/PROTECTED/a.md"])
      assert.equal(minimumRisk(nested, [path]), "critical", `${level}: ${path}`);
    assert.equal(minimumRisk(nested, ["docs/a.md"]), "low");
  }
});

const BAD_LEVELS: unknown[] = [
  ...["medium", "Low", "low ", "\tlow", "low\u00a0", "toString", "__proto__", "constructor"],
  ...["", 1, null],
];
const BAD_PATTERNS: unknown[] = [
  ...["", " a", "a ", "a\r", "a\nb", "a\tb", "a\u00a0b", "a\u007f", "a\\b", "\u010d/**"],
  ...["a?b", "a[b]", "{a,b}", "!a", "/a", "a/", "./a", "a//b", "a/./b", "a/../b", ".."],
  ...["docs**", "**.md", "***", "a/**b", 1],
];
const BAD_PATHS = [
  ...["docs\\a.md", "/a", "a/", "./a", "a//b", "a/./b", "docs/../.github/x"],
  ...["a\rb", "a\nb", "a\tb", "a\u007fb", "a\u0085b"],
];

test("bad tables are rejected", () => {
  const bad: string[] = [
    "{",
    "\ufeff" + table([rule("a")]),
    "[]",
    "null",
    table([rule("a")], { version: 2 }),
    table([rule("a")], { version: "1" }),
    table([rule("a")], { version: true }),
    JSON.stringify({ default: "low", rules: [rule("a")] }),
    table([]),
    table([rule("a")], { rules: {} }),
    table([rule("a")], { $comment: 1 }),
    table([rule("a")], { extra: 1 }),
    `{"version":1,"default":"low","rules":${JSON.stringify([rule("a")])},"__proto__":{}}`,
    table(["a"]),
    table([null]),
    table([{ ...rule("a"), patern: "b" }]),
    table([rule("a"), rule("a", "critical")]),
    table([{ ...rule("a"), reason: "" }]),
    table([{ ...rule("a"), reason: " \t" }]),
    table([{ pattern: "a", risk: "low" }]),
  ];
  for (const level of BAD_LEVELS)
    bad.push(table([rule("a")], { default: level }), table([rule("a", level as string)]));
  for (const pattern of BAD_PATTERNS) bad.push(table([rule(pattern as string)]));
  for (const text of bad) assert.throws(() => parseRiskTable(text), /risk table/, text);
});

test("bad path lists are rejected (the caller treats it as critical)", () => {
  const t = parseRiskTable(TEMPLATE);
  const bad: unknown[] = [[], "docs/a.md", [1], [null], [""], ...BAD_PATHS.map((path) => [path])];
  for (const paths of bad)
    assert.throws(() => minimumRisk(t, paths as string[]), /risk floor/, JSON.stringify(paths));
});

test("matching stays polynomial for patterns that make a RegExp backtrack", () => {
  // A RegExp took about 7 s here at five segments and grows exponentially.
  const pattern = [...Array<string>(5).fill("*a*"), "z"].join("/");
  const path = [...Array<string>(5).fill("a".repeat(40)), "q"].join("/");
  const t = parseRiskTable(table([rule(pattern, "critical")]));
  const start = performance.now();
  assert.equal(minimumRisk(t, [path]), "standard");
  assert.ok(performance.now() - start < 1000, "glob matching must not backtrack");
});

test("ASCII case folding does not join a Unicode letter to an ASCII rule", () => {
  // KELVIN SIGN (U+212A) lower-cases to "k" with toLowerCase(); foldAscii must not.
  const t = parseRiskTable(table([rule("k.md", "critical")]));
  assert.equal(minimumRisk(t, ["K.md"]), "standard");
  assert.equal(minimumRisk(t, ["K.md"]), "critical");
});

test("many rules matching one path give the highest level, without a RangeError", () => {
  // 150 000 distinct patterns over 18 segments, each segment `s` or `*`:
  // all match the same path. Spreading them into Math.max threw a RangeError.
  const depth = 18;
  const path = Array<string>(depth).fill("s").join("/");
  const patterns = Array.from({ length: 150_000 }, (_, mask) =>
    Array.from({ length: depth }, (_, bit) => ((mask >> bit) & 1 ? "*" : "s")).join("/"),
  );
  const rules = patterns.map((pattern) => rule(pattern, "low"));
  assert.equal(minimumRisk(parseRiskTable(table(rules)), [path]), "low");
  rules[rules.length - 1] = rule(patterns[patterns.length - 1] ?? "", "critical");
  assert.equal(minimumRisk(parseRiskTable(table(rules)), [path]), "critical");
});

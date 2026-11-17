// DAN-988: Ductura merges without Mergify (owner decision 17. 11. 2026., "Da za oboje").
// In docs/ exactly one line may name Mergify: the abolition note with the single
// return condition. The merge rule is pinned verbatim and stays paired with D-97.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalize } from "./plan-text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NAME = /mergify/gi;

export const RULE =
  "nadzor (glavni orkestrator, §7a) spaja PR nakon punog gatea (`--squash --match-head-commit`), u svakom repou jedan po krugu; dok je CI na mainu crven ili nečitljiv, u tom repou ne spaja";
export const D97 = "PR-ove koji po D-97 traže tvoju naredbu i dalje spaja samo tvoja naredba";
export const NOTE = "Mergify je ukinut 17. 11.";
export const RETURN =
  "Mergify se vraća ako dva PR-a zaredom slome main ili ako spajanje mora raditi bez ovog računala.";

// Each clause of the return condition, counted without the name, so a partial,
// reworded or second condition is found whatever it calls the tool.
const RETURN_CLAUSES = ["se vraća ako", "dva PR-a zaredom slome main", "spajanje mora raditi bez ovog računala"];

/** Problems with how a set of files ({path: text}) names Mergify; empty when the docs obey DAN-988. */
export const mergifyProblems = (files) => {
  const problems = [];
  const hits = [];
  for (const [path, text] of Object.entries(files)) {
    normalize(text)
      .split(/\r\n|\r|\n/)
      .forEach((line, i) => {
        if (line.match(NAME)) hits.push({ where: `${path}:${i + 1}`, line });
      });
  }
  if (hits.length !== 1) problems.push(`expected one line naming Mergify, found ${hits.length}: ${hits.map((h) => h.where).join(", ")}`);
  for (const { where, line } of hits) {
    const rest = line.replace(NOTE, "").replace(RETURN, "");
    if (rest.match(NAME)) problems.push(`${where}: Mergify outside the abolition note and the return condition`);
    if (!line.includes(NOTE)) problems.push(`${where}: no abolition note`);
  }
  const all = normalize(Object.values(files).join("\n"));
  const count = (s) => all.split(s).length - 1;
  if (count(RETURN) !== 1) problems.push(`expected the full return condition verbatim once, found ${count(RETURN)}`);
  for (const clause of RETURN_CLAUSES) {
    if (count(clause) !== 1) problems.push(`expected "${clause}" once, found ${count(clause)}`);
  }
  return problems;
};

const docs = (dir = "docs") =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? docs(join(dir, e.name)) : [[join(dir, e.name), readFileSync(join(ROOT, dir, e.name), "utf8")]],
  );

const ok = `x ${NOTE} y ${RETURN}`;

test("checker reports stray, disguised and repeated Mergify mentions", () => {
  const bad = {
    "stray line": { a: ok, b: "Gate: Mergify red." },
    "upper case": { a: ok, b: "MERGIFY" },
    "zero-width": { a: ok, b: "Merg​ify" },
    "soft hyphen": { a: ok, b: "Mer­gify" },
    fullwidth: { a: ok, b: "Ｍergify" },
    "same line": { a: `${ok} Mergify red ostaje.` },
    "CRLF line": { a: `${ok}\r\nMergify` },
    "no note": { a: `x ${RETURN}` },
    "return twice": { a: ok, b: RETURN.replace("Mergify", "Taj alat") + " " + RETURN.replace("Mergify", "Taj alat") },
    "no return": { a: `x ${NOTE}` },
    "second clause dropped, name replaced": {
      a: `x ${NOTE} Uvjet: alat se vraća ako dva PR-a zaredom slome main.`,
    },
    "second clause dropped": { a: `x ${NOTE} Mergify se vraća ako dva PR-a zaredom slome main.` },
    "first clause dropped": { a: `x ${NOTE} Mergify se vraća ako spajanje mora raditi bez ovog računala.` },
    "clauses joined by i": { a: `x ${NOTE} ${RETURN.replace(" ili ", " i ")}` },
    "extra clause elsewhere": { a: ok, b: "Alat se vraća i ako spajanje mora raditi bez ovog računala." },
    "no mention": { a: "nothing" },
  };
  for (const [name, files] of Object.entries(bad)) assert.notDeepEqual(mergifyProblems(files), [], name);
});

test("checker accepts one note with one return condition", () => {
  assert.deepEqual(mergifyProblems({ a: ok, b: "pravilo spajanja (§7)\r\n\tsquash" }), []);
});

test("docs name Mergify only in the abolition note and the return condition", () => {
  assert.deepEqual(mergifyProblems(Object.fromEntries(docs())), []);
});

test("migration plan pins the merge rule next to D-97 and abolishes T-0.3 and S-0.20", () => {
  const plan = normalize(readFileSync(join(ROOT, "docs/plan/PLAN-MIGRACIJE.md"), "utf8"));
  const para = plan.split("\n").find((l) => l.includes(RULE));
  assert.ok(para, "merge rule");
  assert.ok(para.includes(D97), "D-97 in the rule paragraph");
  for (const id of ["T-0.3", "S-0.20"]) {
    assert.match(plan, new RegExp(`^\\| ${id.replace(".", "\\.")} \\|.*Ukinuto 17\\. 11\\.`, "m"), id);
  }
  const own = normalize(readFileSync(join(ROOT, "docs/PLAN.md"), "utf8"));
  assert.match(own, /^\| T-0\.3 \|.*Ukinuto 17\. 11\./m, "T-0.3 in docs/PLAN.md");
});

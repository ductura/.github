// DAN-954: the product domain is ductura.org (owner decision 17. 11. 2026., Ductus#2012 c.6934113245).
// No tracked file may name another ductura.<tld>, and the two plan documents
// may not mention the rejected TLDs. Text is normalized first, so escapes,
// lookalike dots and zero-width characters do not hide a finding.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLAN_DOCS = ["docs/plan/PLAN-MIGRACIJE.md", "docs/plan/KARTA.md"];
const REJECTED = ["c" + "fd", "to" + "p"]; // spelled apart so this file never names them

const normalize = (text) =>
  text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\u3002\uFF0E\uFF61]/g, ".")
    .replace(/\\\./g, ".")
    .replace(/\[\.\]/g, ".")
    .replace(/[ \t]+\./g, ".");

/**
 * Every ductura domain except ductura.org itself: the whole label chain after
 * "ductura" must be ".org", so Unicode TLDs, punycode and longer
 * label chains that continue after .org are all findings.
 */
export const foreignDomains = (text) =>
  [...normalize(text).matchAll(/(?<![\p{L}\p{N}_-])ductura((?:\.[\p{L}\p{N}\p{M}-]+)+)/giu)]
    .filter((m) => m[1].toLowerCase() !== ".org")
    .map((m) => m[0]);

/** Rejected TLDs in a plan document: a whole word cfd, or `.top` as a code span. */
export const rejectedTldMentions = (text) => {
  const t = normalize(text);
  const word = new RegExp(`\\b${REJECTED[0]}\\b`, "gi");
  const span = new RegExp(`\`\\.(?:${REJECTED.join("|")})\``, "gi");
  return [...t.matchAll(word), ...t.matchAll(span)].map((m) => m[0]);
};

const tracked = () =>
  execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);

// <c> and <t> stand for the two rejected TLDs (<C>, <T> upper case), so this file never spells them out.
const spell = (s) =>
  s.replace(/<([ctCT])>/g, (_, k) => {
    const tld = REJECTED[k.toLowerCase() === "c" ? 0 : 1];
    return k === k.toUpperCase() ? tld.toUpperCase() : tld;
  });

test("checker reports every disguised foreign domain", () => {
  const bad = [
    "ductura.<c>",
    "c.ductura.<c>",
    "Ductura.<C>",
    "ductura\\.<c>",
    "ductura[.]<c>",
    "ductura .<c>",
    "ductura\u200B.<c>",
    "ductura\uFF0E<c>",
    "ductura.<t>",
    "ductura.\u0440\u0444",
    "ductura.\u4F8B\u3048",
    "ductura\u002Exn--p1ai",
    "ductura\u3002<c>",
    "ductura\uFF61<c>",
    "ductura.org.<c>",
    "c.ductura.ORG\u002Eexample",
  ].map(spell);
  for (const s of bad) assert.equal(foreignDomains(`Primjer na \`${s}\`.`).length, 1, s);
});

test("checker reports rejected TLDs in plan text", () => {
  for (const s of ["`.<t>`", "`.<T>`", "<c>", "<C> ili", "`.<c>`"].map(spell)) assert.ok(rejectedTldMentions(s).length > 0, s);
});

test("checker accepts ductura.org, package names, repo paths and prose", () => {
  const good = [
    "ductura.org",
    "c.ductura.org",
    "Domena je ductura.org.",
    "https://ductura.org/api/auth/callback",
    "@ductura/contracts",
    "ductura/.github",
    "Ductura/server",
    "Repozitorij organizacije Ductura. Zajedni\u010Dki plan",
    "https://github.com/ductura/server",
    "topologija, window.top, .top { }",
  ];
  for (const s of good) {
    assert.deepEqual(foreignDomains(s), [], s);
    assert.deepEqual(rejectedTldMentions(s), [], s);
  }
});

test("no tracked file names a ductura domain other than ductura.org", () => {
  const findings = [];
  for (const file of tracked()) {
    const text = readFileSync(join(ROOT, file), "utf8");
    if (text.includes("\0")) continue; // binary
    for (const d of foreignDomains(text)) findings.push(`${file}: ${d}`);
  }
  assert.deepEqual(findings, []);
});

test("plan documents use only ductura.org and no rejected TLD", () => {
  for (const file of PLAN_DOCS) {
    const text = readFileSync(join(ROOT, file), "utf8");
    assert.deepEqual(rejectedTldMentions(text), [], file);
    assert.ok(/`(?:[a-z0-9-]+\.)*ductura\.org`/.test(text), `${file} names ductura.org`);
  }
});

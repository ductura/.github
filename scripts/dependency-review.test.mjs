// DAN-1033 (owner decision T8): the default allow-licenses of
// dependency-review.yml admits LGPL-2.1 and no LGPL-3.0, while GPL-3.0 still
// fails. The action reads licences from GitHub's dependency graph, so it cannot
// run over a fixture; this test runs its matcher instead, the same libraries at
// the versions of the pinned action's package-lock.json, and mirrors
// getInvalidLicenseChanges (src/licenses.ts, src/spdx.ts, src/config.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDocument } from "yaml";
import parse from "spdx-expression-parse";
import spdxSatisfies from "spdx-satisfies";

const ACTION = "actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294";
const RECHECK = `re-check every pin below against the package-lock.json of ${ACTION}, together`;
// Every spdx-* package of package-lock.json, by lock path, then by name. The
// top-level parser and spdx-satisfies are the action's; spdx-compare, spdx-ranges
// and the parser nested under them are the newest releases in spdx-satisfies
// 6.0.0's ranges. Change together with ACTION, never alone.
const PATHS = {
  "node_modules/spdx-satisfies": "6.0.0",
  "node_modules/spdx-expression-parse": "4.0.0",
  "node_modules/spdx-compare": "1.0.0",
  "node_modules/spdx-ranges": "2.1.1",
  "node_modules/spdx-satisfies/node_modules/spdx-expression-parse": "3.0.1",
  "node_modules/spdx-compare/node_modules/spdx-expression-parse": "3.0.1",
};
const NAMES = { "spdx-license-ids": "3.0.23", "spdx-exceptions": "2.3.0" };
const ITEM = /^[A-Za-z0-9.+-]+(, [A-Za-z0-9.+-]+)*$/;

const workflow = readFileSync(new URL("../.github/workflows/dependency-review.yml", import.meta.url), "utf8");
const doc = parseDocument(workflow).toJS();
const raw = doc.on.workflow_call.inputs["allow-licenses"].default;

const clean = (expr) => expr.replace(/(?<![\w-])OTHER(?![\w-])/g, "LicenseRef-clearlydefined-OTHER");
const isValid = (expr) => {
  try {
    parse(clean(expr));
    return true;
  } catch {
    return false;
  }
};

// config.ts parseList + validateLicenses. ITEM already refuses every space inside
// an item, so the AND/OR items that licenses.ts drops can never get here.
function allowList(value) {
  if (!ITEM.test(value)) throw new Error(`allow-licenses is not "ID, ID, ...": ${JSON.stringify(value)}`);
  const items = value.split(",").map((x) => x.trim());
  const invalid = items.filter((x) => !isValid(x));
  if (invalid.length > 0) throw new Error(`Invalid license(s) in allow-licenses: ${invalid.join(", ")}`);
  if (new Set(items).size !== items.length) throw new Error("duplicate licence in allow-licenses");
  return items;
}

function verdict(license, allow) {
  if (license === "NOASSERTION") return "unlicensed";
  if (!isValid(license)) return "unresolved";
  try {
    return spdxSatisfies(clean(license), allow) ? "allowed" : "forbidden";
  } catch {
    return "forbidden";
  }
}

const allow = allowList(raw);

test("the default reaches the action and nothing else decides licences", () => {
  const steps = Object.values(doc.jobs).flatMap((j) => j.steps);
  const action = steps.filter((s) => String(s.uses ?? "").startsWith("actions/dependency-review-action@"));
  assert.equal(action.length, 1, "exactly one dependency-review-action step");
  assert.equal(action[0].uses, ACTION, `dependency-review-action is no longer ${ACTION}: ${RECHECK}`);
  // No deny-licenses, config-file, allow-dependencies-licenses or fixed list.
  assert.deepEqual(action[0].with, {
    "fail-on-severity": "${{ inputs.fail-on-severity }}",
    "allow-licenses": "${{ inputs.allow-licenses }}",
  });
});

test("the matcher is the one of the pinned action", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  for (const name of ["spdx-satisfies", "spdx-expression-parse"]) {
    assert.equal(pkg.devDependencies[name], PATHS[`node_modules/${name}`], `package.json ${name}: ${RECHECK}`);
  }
  const seen = new Set();
  for (const [path, entry] of Object.entries(lock.packages)) {
    const name = path.split("node_modules/").at(-1);
    if (!name.startsWith("spdx-")) continue;
    const want = Object.hasOwn(PATHS, path) ? PATHS[path] : Object.hasOwn(NAMES, name) ? NAMES[name] : undefined;
    assert.equal(entry.version, want, `${path} is ${entry.version}: ${RECHECK}`);
    seen.add(path);
  }
  for (const path of Object.keys(PATHS)) assert.ok(seen.has(path), `${path} is missing: ${RECHECK}`);
});

for (const bad of ["MIT,\r\nISC", "MIT,\tISC", "MIT,\u00a0ISC", "MIT,ISC", "MIT, ISC\u007f", "MIT,, ISC", "MIT, MIT OR ISC", "MIT, ISC, MIT", "MIT, lgpl-2.1-only", "MIT, ISC "]) {
  test(`allow list rejects ${JSON.stringify(bad)}`, () => assert.throws(() => allowList(bad)));
}

const cases = {
  forbidden: [
    // GPL-3.0 still fails (DAN-1033 acceptance), and nothing GPL comes with LGPL-2.1.
    "GPL-3.0-only", "GPL-3.0-or-later", "GPL-3.0", "GPL-3.0+", "AGPL-3.0-only", "GPL-2.0-only", "GPL-2.0-or-later", "GPL-2.0+",
    // T8 allows LGPL-2.1, not 3.0: why the list has LGPL-2.1-only and no -or-later.
    "LGPL-3.0-only", "LGPL-3.0-or-later", "LGPL-3.0",
    "LGPL-2.1-only AND GPL-3.0-only", "LGPL-2.1-only AND OTHER", "LGPL-2.1-only WITH Classpath-exception-2.0",
    "LGPL-2.1-or-later WITH Classpath-exception-2.0", "LicenseRef-LGPL-2.1", "SISSL", "LGPL-2.0-only",
    // Valid for parser 4.0.0, but spdx-satisfies' nested parser 3.0.1 throws on a lower-case "or".
    "LGPL-2.1-only or MIT", "(LGPL-2.1 or SISSL)",
  ],
  unresolved: ["lgpl-2.1-only", "LGPL-2.1-only WITH OTHER"],
  unlicensed: ["NOASSERTION"],
  allowed: [
    "LGPL-2.1-only", "LGPL-2.1-or-later", "LGPL-2.1", "LGPL-2.1+",
    "(LGPL-2.1 OR SISSL)", // dictionary-hr
    "MPL-1.1 OR GPL-2.0-or-later OR LGPL-2.1-or-later", // Hunspell
    "LGPL-2.1-only OR GPL-3.0-only", "LGPL-2.1-only OR OTHER",
    // Known limit: spdx-satisfies 6.0.0 reads any 8-character ID as "+", so the
    // deprecated LGPL-2.0 (meaning -only) passes, while LGPL-2.0-only does not.
    "LGPL-2.0", "LGPL-2.0-or-later",
  ],
};

for (const [want, licenses] of Object.entries(cases)) {
  for (const license of licenses) {
    test(`${license} is ${want}`, () => assert.equal(verdict(license, allow), want));
  }
}

test("the list is the one before T8 plus LGPL-2.1-only, nothing else", () => {
  const before = ["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "MPL-2.0", "BlueOak-1.0.0", "CC0-1.0", "CC-BY-4.0", "Python-2.0"];
  assert.deepEqual(allow, [...before, "LGPL-2.1-only"]);
  for (const id of before) assert.equal(verdict(id, allow), "allowed", id);
});

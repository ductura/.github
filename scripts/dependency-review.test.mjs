// DAN-1033 (owner decision T8): the default allow-licenses of
// dependency-review.yml admits LGPL-2.1 and nothing wider, while GPL-3.0 still
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
// From that SHA's package-lock.json. Change together with ACTION, never alone.
const MATCHER = { "spdx-satisfies": "6.0.0", "spdx-expression-parse": "4.0.0", "spdx-license-ids": "3.0.23", "spdx-exceptions": "2.3.0" };
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

// config.ts parseList + validateLicenses; licenses.ts drops AND/OR items.
function allowList(value) {
  if (!ITEM.test(value)) throw new Error(`allow-licenses is not "ID, ID, ...": ${JSON.stringify(value)}`);
  const items = value.split(",").map((x) => x.trim());
  const invalid = items.filter((x) => !isValid(x));
  if (invalid.length > 0) throw new Error(`Invalid license(s) in allow-licenses: ${invalid.join(", ")}`);
  if (new Set(items).size !== items.length) throw new Error("duplicate licence in allow-licenses");
  return items.filter((x) => !x.includes(" AND ") && !x.includes(" OR "));
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

test("the matcher is the one of the pinned action", () => {
  const uses = Object.values(doc.jobs).flatMap((j) => j.steps.map((s) => s.uses).filter(Boolean));
  assert.ok(uses.includes(ACTION), `dependency-review-action is no longer ${ACTION}: re-check MATCHER against its package-lock.json`);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(pkg.devDependencies["spdx-satisfies"], MATCHER["spdx-satisfies"]);
  assert.equal(pkg.devDependencies["spdx-expression-parse"], MATCHER["spdx-expression-parse"]);
  for (const [path, entry] of Object.entries(lock.packages)) {
    const name = path.split("node_modules/").at(-1);
    if (!(name in MATCHER)) continue;
    // spdx-satisfies and spdx-compare carry their own parser 3.0.1, as in the action.
    if (name === "spdx-expression-parse" && path !== "node_modules/spdx-expression-parse") continue;
    assert.equal(entry.version, MATCHER[name], `${path} is ${entry.version}, the action has ${MATCHER[name]}`);
  }
});

for (const bad of ["MIT,\r\nISC", "MIT,\tISC", "MIT, ISC", "MIT, ISC\u007f", "MIT,, ISC", "MIT, MIT OR ISC", "MIT, ISC, MIT", "MIT, lgpl-2.1-only", "MIT, ISC "]) {
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
  ],
  unresolved: ["lgpl-2.1-only", "LGPL-2.1-only WITH OTHER"],
  allowed: [
    "LGPL-2.1-only", "LGPL-2.1-or-later", "LGPL-2.1", "LGPL-2.1+",
    "(LGPL-2.1 OR SISSL)", // dictionary-hr
    "MPL-1.1 OR GPL-2.0-or-later OR LGPL-2.1-or-later", // Hunspell
    "LGPL-2.1-only OR GPL-3.0-only", "LGPL-2.1-only OR OTHER",
  ],
};

for (const [want, licenses] of Object.entries(cases)) {
  for (const license of licenses) {
    test(`${license} is ${want}`, () => assert.equal(verdict(license, allow), want));
  }
}

test("every licence allowed before T8 is still allowed", () => {
  for (const id of ["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "MPL-2.0", "BlueOak-1.0.0", "CC0-1.0", "CC-BY-4.0", "Python-2.0"]) {
    assert.ok(allow.includes(id), id);
    assert.equal(verdict(id, allow), "allowed", id);
  }
});

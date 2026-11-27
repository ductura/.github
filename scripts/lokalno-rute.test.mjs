// Guards the route map of the local flow (scripts/lokalno): the old web base /app/web must not
// come back, and the new base is defined once in tok-lib.mjs and used by koraci.mjs.
// It reads the sources as text: importing tok-lib.mjs would create the local output folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "lokalno");
const files = readdirSync(DIR).filter((f) => /\.(mjs|py|json)$/.test(f));
const read = (f) => readFileSync(join(DIR, f), "utf8");

test("no file in scripts/lokalno mentions the old /app/web base", () => {
  assert.ok(files.includes("koraci.mjs") && files.includes("tok-lib.mjs"));
  const bad = files.filter((f) => read(f).includes("/app/web"));
  assert.deepEqual(bad, []);
});

test("tok-lib.mjs defines the current route map once", () => {
  const lib = read("tok-lib.mjs");
  assert.match(lib, /export const APP_PATH = '\/aplikacija';/);
  assert.match(lib, /export const APP_URL = BASE \+ APP_PATH;/);
  assert.match(lib, /export const APP_LOGIN = APP_PATH \+ '\/prijava';/);
  assert.match(lib, /export const ENTRY_PATH = '\/ulaz';/);
  // sign-in starts at the Preloader entry and waits for the return under the app base
  assert.match(lib, /page\.goto\(BASE \+ ENTRY_PATH\)/);
  assert.match(lib, /startsWith\(APP_HOME\)/);
});

test("koraci.mjs takes the base from tok-lib.mjs, not a literal", () => {
  const k = read("koraci.mjs");
  assert.match(k, /import \{[^}]*\bAPP_URL\b[^}]*\} from '\.\/tok-lib\.mjs'/);
  assert.doesNotMatch(k, /\/aplikacija/);
});

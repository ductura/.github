import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ductura, type Options } from "@ductura/eslint-config";
import prettierConfig from "@ductura/prettier-config";
import { ESLint } from "eslint";
import prettier from "prettier";

// Fixtures are linted under virtual paths, so the failing ones never sit in the
// tree that `pnpm lint` and `pnpm format` check.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function lint(code: string, file: string, options?: Options): Promise<string[]> {
  const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: ductura(options) });
  const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, file) });
  return (result?.messages ?? []).map((m) => `${m.ruleId ?? "core"}:${m.messageId ?? m.message}`);
}

const AT = "server/a/b.ts";
const DEEP = [
  'import { x } from "../sib/c.ts";\n',
  'import { x } from "./sub/c.ts";\n',
  'import type { T } from "../c.ts";\n',
  'export * from "../sib/c.ts";\n',
  'const m = await import("../sib/c.ts");\n',
  'const m = require("../sib/c.ts");\n',
  'type M = typeof import("../c.ts");\n',
];

test("deep imports fail when boundaries are on", async () => {
  for (const code of DEEP) {
    assert.deepEqual(await lint(code, AT, { boundaries: true }), ["local/import-boundary:boundary"], code);
  }
});

test("deep imports pass when boundaries are off, the default", async () => {
  for (const code of DEEP) {
    assert.deepEqual(await lint(code, AT), [], code);
    assert.deepEqual(await lint(code, AT, { boundaries: false }), [], code);
  }
});

test("imports through index.ts, of a package or node: pass with boundaries on", async () => {
  for (const spec of ["../sib/index.ts", "./sub/index.ts", "./c.ts", "node:path", "eslint"]) {
    assert.deepEqual(await lint(`import { x } from "${spec}";\n`, AT, { boundaries: true }), [], spec);
  }
});

const failing: [code: string, file: string, expected: string][] = [
  ["export const a: any = 1;\n", AT, "@typescript-eslint/no-explicit-any:unexpectedAny"],
  ["export function f(x: any): void {}\n", AT, "@typescript-eslint/no-explicit-any:unexpectedAny"],
  ["export interface A { b: string }\n", AT, "@typescript-eslint/consistent-type-definitions:typeOverInterface"],
  ["export enum Mode { on }\n", AT, "no-restricted-syntax:restrictedSyntax"],
  ["export const a = 1;\n", "server/a/sessionStore.ts", "local/kebab-case-filename:kebab"],
  ["export const a = 1;\n", "server/a/b.spec.ts", "local/test-file-suffix:suffix"],
  ["export const a = 1;\n", "server/a/b.js", "local/only-ts:onlyTs"],
  ["export const user_id = 1;\n", AT, "@typescript-eslint/naming-convention:doesNotMatchFormat"],
  ["export type session_record = string;\n", AT, "@typescript-eslint/naming-convention:doesNotMatchFormat"],
];

test("each rule fails its fixture", async () => {
  for (const [code, file, expected] of failing) {
    assert.deepEqual(await lint(code, file), [expected], `${file}: ${code}`);
  }
});

test("an inline directive cannot switch a rule off", async () => {
  const messages = await lint("// eslint-disable-next-line\nexport const a: any = 1;\n", AT);
  assert.ok(messages.includes("@typescript-eslint/no-explicit-any:unexpectedAny"), messages.join());
});

test("propertyNames and methodNames allow exact names only", async () => {
  const code = "export const t = { client_id: 1, Program() {} };\n";
  const options = { propertyNames: ["client_id"], methodNames: ["Program"] };
  assert.deepEqual(await lint(code, AT, options), []);
  assert.equal((await lint(code, AT)).length, 2);
  assert.equal((await lint("export const t = { client_idx: 1 };\n", AT, options)).length, 1);
});

test("valid code passes", async () => {
  const code = [
    "const MAX_AGE_MS = 1000;",
    "type SessionRecord = { userId: string; createdAt: number };",
    "export function isExpired(record: SessionRecord, now: number): boolean {",
    "  return now - record.createdAt > MAX_AGE_MS;",
    "}",
    "",
  ].join("\n");
  assert.deepEqual(await lint(code, "server/a/session-store.property.test.ts", { boundaries: true }), []);
});

const format = (code: string): Promise<string> => prettier.format(code, { ...prettierConfig, parser: "typescript" });

test("prettier keeps the Ductus format", async () => {
  const good = [
    'import { a } from "./a.ts";',
    "",
    'export const values = [a, (x: number) => x * 2, { key: "value" }];',
    // Exactly 120 columns: the widest line that stays on one line.
    "export const long = someFunctionName(firstArgument, secondArgument, thirdArgument, fourthArgument, fifthArgumentAbcdef);",
    "",
  ].join("\n");
  assert.equal(await format(good), good);
});

test("prettier rewrites a wrong format", async () => {
  for (const bad of [
    "export const a = 'single';\n",
    'export const a = "no semicolon"\n',
    "export const f = x => x;\n",
    "export const o = {\n    four: 1,\n};\n",
    "export const o = {\n  a: 1,\n  b: 2\n};\n",
    // 121 columns.
    "export const long = someFunctionName(firstArgument, secondArgument, thirdArgument, fourthArgument, fifthArgumentAbcdefg);\n",
  ]) {
    assert.notEqual(await format(bad), bad, bad);
  }
});

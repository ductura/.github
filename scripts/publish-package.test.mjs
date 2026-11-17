import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { checkTarball, parseTag } from "./publish-package.mjs";

// A ustar archive written here, so every malformed shape can be built.
function header(path, size, { type = "0", prefix = "", sizeText } = {}) {
  const h = Buffer.alloc(512);
  Buffer.from(path, "utf8").copy(h, 0, 0, 100);
  h.write("0000644\0", 100);
  h.write(sizeText ?? `${size.toString(8).padStart(11, "0")}\0`, 124, "latin1"); // one byte per char: raw 0xA0
  h.write(type, 156);
  h.write("ustar\u000000", 257);
  Buffer.from(prefix).copy(h, 345, 0, 155);
  h.write("        ", 148);
  const sum = h.reduce((s, b) => s + b, 0);
  h.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
  return h;
}
function tarball(entries, { end = Buffer.alloc(1024), badSum = false, cut = 0 } = {}) {
  const parts = entries.map(([path, text = "x", opts]) => {
    const data = Buffer.from(text);
    const h = header(path, data.length, opts);
    if (badSum) h[136] ^= 1; // mtime: only the checksum is wrong
    return Buffer.concat([h, data, Buffer.alloc((512 - (data.length % 512)) % 512)]);
  });
  const tar = Buffer.concat([...parts, end]);
  return gzipSync(tar.subarray(0, tar.length - cut));
}

const TAG = { pkg: "eslint-config", version: "0.1.0" };
const FILE = "ductura-eslint-config-0.1.0.tgz";
const FILES = ["index.js", "index.d.ts", "rules/*.js"];
const manifest = (fields = {}) => JSON.stringify({ name: "@ductura/eslint-config", version: "0.1.0", ...fields });
const GOOD = [
  ["package/package.json", manifest()],
  ["package/README.md"],
  ["package/index.js"],
  ["package/index.d.ts"],
  ["package/rules/a.js"],
];
const check = (entries, opts, files = FILES, file = FILE) => checkTarball(tarball(entries, opts), file, files, TAG);

const rejected = [
  ["file outside files", [...GOOD, ["package/secret.env"]]],
  ["test file", [...GOOD, ["package/index.test.js"]]],
  ["other extension", [...GOOD, ["package/rules/x.ts"]]],
  ["subfolder under *", [...GOOD, ["package/rules/sub/a.js"]]],
  ["other case", [...GOOD, ["package/Index.js"]]],
  ["README in a subfolder", [...GOOD, ["package/rules/README.md"]]],
  ["LICENSE", [...GOOD, ["package/LICENSE"]]],
  ["COPYING", [...GOOD, ["package/COPYING"]]],
  ["lower-case readme", [...GOOD, ["package/readme.md"]]],
  ["dotfile matched by *", [...GOOD, ["package/rules/.x.js"]]],
  ["outside package/", [...GOOD, ["other/index.js"]]],
  ["dot-dot", [...GOOD, ["package/../index.js"]]],
  ["dot segment", [...GOOD, ["package/./index.js"]]],
  ["absolute", [...GOOD, ["/package/index.js"]]],
  ["backslash", [...GOOD, ["package/rules\\a.js"]]],
  ...["\r\n", "\n", "\t", " ", "\u007f", " "].map((c) => [`${JSON.stringify(c)} in a path`, [...GOOD, [`package/rules/a${c}.js`]]]),
  ["duplicate", [...GOOD, ["package/index.js"]]],
  ["regex dot", [...GOOD, ["package/indexXjs"]]],
  ["longer name", [...GOOD, ["package/rules/a.js.map"]]],
  ["file in a subfolder", [...GOOD, ["package/sub/index.js"]]],
  ["same path in another case", [...GOOD, ["package/rules/A.js"]]],
  ["symlink", [...GOOD, ["package/rules/l.js", "", { type: "2" }]]],
  ["hard link", [...GOOD, ["package/rules/h.js", "", { type: "1" }]]],
  // An allowed path, so only the type rejects these.
  ...["5", "x", "g", "L", "\0"].map((type) => [`type ${JSON.stringify(type)}`, [...GOOD, ["package/rules/b.js", "x", { type }]]]),
  ["ustar prefix", [...GOOD, ["package/rules/b.js", "x", { prefix: "x" }]]],
  ["NBSP in the size", [...GOOD, ["package/rules/b.js", "x", { sizeText: "\u00a000000000001" }]]],
  ["non-octal size", [...GOOD, ["package/rules/b.js", "x", { sizeText: "00000000019\0" }]]],
  ["files entry with no match", GOOD.filter(([p]) => p !== "package/index.d.ts")],
  ["no package.json", GOOD.slice(1)],
  ["package.json not JSON", [["package/package.json", "{"], ...GOOD.slice(1)]],
  ["package.json not an object", [["package/package.json", "[]"], ...GOOD.slice(1)]],
  ["other version", [["package/package.json", manifest({ version: "0.1.1" })], ...GOOD.slice(1)]],
  ["other name", [["package/package.json", manifest({ name: "@ductura/prettier-config" })], ...GOOD.slice(1)]],
];
for (const [name, entries] of rejected) {
  test(`rejects: ${name}`, () => assert.notDeepEqual(check(entries), []));
}

for (const [name, opts] of [
  ["bad header checksum", { badSum: true }],
  ["no end-of-archive block", { end: Buffer.alloc(0) }],
  ["data after the end", { end: Buffer.concat([Buffer.alloc(1024), Buffer.from("x")]) }],
  ["truncated tar", { end: Buffer.alloc(0), cut: 10 }],
]) {
  test(`rejects: ${name}`, () => assert.notDeepEqual(check(GOOD, opts), []));
}

test("rejects: truncated gzip", () => {
  const gz = tarball(GOOD);
  assert.notDeepEqual(checkTarball(gz.subarray(0, gz.length - 8), FILE, FILES, TAG), []);
});

test("rejects: tarball name that is not ductura-<pkg>-<version>.tgz", () => {
  for (const file of ["ductura-eslint-config-0.1.1.tgz", "eslint-config-0.1.0.tgz", `${FILE}\n`]) {
    assert.notDeepEqual(check(GOOD, {}, FILES, file), [], file);
  }
});

for (const files of [
  ["!index.js", ...FILES], ["rules/**/*.js"], ["rules/**"], ["{index}.js"], ["[i]ndex.js"], ["rules\\*.js"],
  ["./index.js"], ["/index.js"], ["rules/"], ["../index.js"], ["rules/./a.js"], ["*/a.js"], [""], [1], [], "index.js", null, { 0: "index.js", length: 1 },
]) {
  test(`rejects files pattern ${JSON.stringify(files)}`, () => assert.notDeepEqual(check(GOOD, {}, files), []));
}

test("accepts package.json, README.md and the files matched by files", () => {
  assert.deepEqual(check(GOOD), []);
});

for (const ref of [
  "refs/heads/eslint-config-v0.1.0", "eslint-config-v0.1.0", "refs/tags/server-v0.1.0", "refs/tags/toString-v0.1.0",
  "refs/tags/__proto__-v0.1.0", "refs/tags/constructor-v0.1.0", "refs/tags/tsconfig-v01.0.0", "refs/tags/tsconfig-v1.0",
  "refs/tags/tsconfig-v1.0.0-rc.1", "refs/tags/tsconfig-v1.0.0+b", "refs/tags/tsconfig-V1.0.0", "refs/tags/tsconfig-v1.0.0\n",
  "refs/tags/tsconfig-v1.0.0\r\n", "refs/tags/tsconfig-v1.0.0\t", "refs/tags/tsconfig-v1.0.0 ", "refs/tags/tsconfig-v1.0.0\u007f",
  "refs/tags/tsconfig-v1.0.0 ", "refs/tags/..\\tsconfig-v1.0.0", "refs/tags/eslint-config-v-v1.0.0", undefined,
]) {
  test(`rejects tag ${JSON.stringify(ref)}`, () => assert.throws(() => parseTag(ref)));
}

test("parses the three package tags", () => {
  assert.deepEqual(parseTag("refs/tags/eslint-config-v10.0.2"), { pkg: "eslint-config", version: "10.0.2" });
  assert.deepEqual(parseTag("refs/tags/tsconfig-v0.1.0"), { pkg: "tsconfig", version: "0.1.0" });
  assert.deepEqual(parseTag("refs/tags/prettier-config-v1.0.0"), { pkg: "prettier-config", version: "1.0.0" });
});

// Dry run in CI: the real npm pack of every preset, nothing published.
const SCRIPT = new URL("./publish-package.mjs", import.meta.url).pathname;
function cli(args, env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
}
const temp = () => mkdtempSync(join(tmpdir(), "publish-package-"));

for (const pkg of ["tsconfig", "eslint-config", "prettier-config"]) {
  test(`dry run: npm pack of @ductura/${pkg} passes and names its file and sha256`, () => {
    const { version } = JSON.parse(readFileSync(new URL(`../packages/${pkg}/package.json`, import.meta.url), "utf8"));
    const out = join(temp(), "out");
    const output = join(temp(), "github-output");
    const run = cli([`refs/tags/${pkg}-v${version}`, out], { GITHUB_OUTPUT: output });
    assert.equal(run.status, 0, run.stderr);
    const file = `ductura-${pkg}-${version}.tgz`;
    const sha256 = createHash("sha256").update(readFileSync(join(out, file))).digest("hex");
    assert.equal(readFileSync(output, "utf8"), `file=${file}\nsha256=${sha256}\n`);
  });
}

test("dry run: a tag with another version fails and leaves no tarball", () => {
  const out = temp();
  const run = cli(["refs/tags/tsconfig-v9.9.9", out]);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /version/);
  assert.deepEqual(readdirSync(out), []);
});

test("CLI: a bad tag or a non-empty output folder fails with 1, wrong usage with 2", () => {
  assert.equal(cli(["refs/heads/main", temp()]).status, 1);
  const full = temp();
  writeFileSync(join(full, "old.tgz"), "");
  assert.equal(cli(["refs/tags/tsconfig-v0.1.0", full]).status, 1);
  assert.deepEqual(readdirSync(full), ["old.tgz"]);
  assert.equal(cli(["refs/tags/tsconfig-v0.1.0"]).status, 2);
});

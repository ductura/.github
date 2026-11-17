import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { checkTarball, parseTag } from "./publish-package.mjs";

// A ustar archive written here, so every malformed shape can be built. The
// header holds what npm pack writes (mode 000644, the fixed mtime, devmajor and
// devminor 0, all other fields NUL); `set` overwrites raw bytes at an offset.
function header(path, size, { type = "0", prefix = "", sizeText, magic = "ustar\u000000", set = {} } = {}) {
  const h = Buffer.alloc(512);
  Buffer.from(path, "utf8").copy(h, 0, 0, 100);
  h.write("000644 \0", 100);
  h.write(sizeText ?? `${size.toString(8).padStart(11, "0")}\0`, 124, "latin1"); // one byte per char: raw 0xA0
  h.write("3560116604 \0", 136);
  h.write(type, 156);
  h.write(magic, 257, "latin1");
  h.write("000000 \0", 329);
  h.write("000000 \0", 337);
  Buffer.from(prefix).copy(h, 345, 0, 155);
  for (const [at, text] of Object.entries(set)) h.write(text, Number(at), "latin1");
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
  // node-tar may read bytes after the first NUL of a field: they must be NUL too.
  ["byte after NUL in the name", [...GOOD, ["package/rules/b.js\0\nx"]]],
  ["byte after NUL in the prefix", [...GOOD, ["package/rules/b.js", "x", { prefix: "\0x" }]]],
  ["byte after NUL in the size", [...GOOD, ["package/rules/b.js", "x", { sizeText: "0000000001\0x" }]]],
  // Only POSIX ustar ("ustar\0" and version "00"), as npm pack writes it.
  ...["\0\0\0\0\0\0\0\0", "ustar  \0", "ustar\0  ", "ustar\u000001", "USTAR\u000000"].map((magic) => [
    `magic ${JSON.stringify(magic)}`,
    [...GOOD, ["package/rules/b.js", "x", { magic }]],
  ]),
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

// Every header field npm pack leaves empty must be all NUL, and the numbers it
// writes must be what it writes: other tar readers act on each of them. An
// allowed path, so only that field rejects the entry; the problem names it.
for (const [name, at, text] of [
  ["linkname", 157, "package/index.js"],
  ["linkname", 157, "\0x"],
  ["uid", 108, "0001750 \0"],
  ["uid", 108, "0000000 \0"],
  ["gid", 116, "0001750 \0"],
  ["uname", 265, "root"],
  ["gname", 297, "root"],
  ["padding", 500, "x"],
  ["prefix", 345, "\0x"],
  ["mode", 100, "004755 \0"],
  ["mode", 100, "000755 \0"],
  ["mode", 100, "00064x \0"],
  ["mtime", 136, "\0\0\0\0\0\0\0\0\0\0\0\0"],
  ["mtime", 136, "3560116604x\0"],
  ["devmajor", 329, "000001 \0"],
  ["devmajor", 329, "\0\0\0\0\0\0\0\0"],
  ["devminor", 337, "000001 \0"],
  ["devminor", 337, "0000-1 \0"],
]) {
  test(`rejects: header field ${name} = ${JSON.stringify(text)}`, () => {
    const problems = check([...GOOD, ["package/rules/b.js", "x", { set: { [at]: text } }]]);
    assert.equal(problems.length, 1, problems.join("\n"));
    assert.match(problems[0], new RegExp(`\\b${name}\\b`));
  });
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
function cli(args, env = {}, script = SCRIPT) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
}
function cliAsync(args) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.on("close", (status) => done({ status, stdout }));
  });
}
const temp = () => mkdtempSync(join(tmpdir(), "publish-package-"));
const fresh = () => join(temp(), "out"); // the output folder must not exist yet
const versionOf = (pkg) => JSON.parse(readFileSync(new URL(`../packages/${pkg}/package.json`, import.meta.url), "utf8")).version;
const sha256Of = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

for (const pkg of ["tsconfig", "eslint-config", "prettier-config"]) {
  test(`dry run: npm pack of @ductura/${pkg} passes and names its file and sha256`, () => {
    const version = versionOf(pkg);
    const out = fresh();
    const output = join(temp(), "github-output");
    const run = cli([`refs/tags/${pkg}-v${version}`, out], { GITHUB_OUTPUT: output });
    assert.equal(run.status, 0, run.stderr);
    const file = `ductura-${pkg}-${version}.tgz`;
    assert.deepEqual(readdirSync(out), [file]);
    const lines = `file=${file}\nsha256=${sha256Of(join(out, file))}\n`;
    assert.equal(run.stdout, lines);
    assert.equal(readFileSync(output, "utf8"), lines);
  });
}

test("dry run: a tag with another version fails, prints nothing and removes the folder it made", () => {
  const out = fresh();
  const run = cli(["refs/tags/tsconfig-v9.9.9", out]);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /version/);
  assert.equal(run.stdout, "");
  assert.equal(existsSync(out), false);
});

test("CLI: a bad tag fails with 1 and makes no folder, wrong usage with 2", () => {
  const out = fresh();
  assert.equal(cli(["refs/heads/main", out]).status, 1);
  assert.equal(existsSync(out), false);
  assert.equal(cli(["refs/tags/tsconfig-v0.1.0"]).status, 2);
  assert.equal(cli([]).status, 2);
});

test("CLI: an output folder that exists, empty or not, fails with 1 and is left as it was", () => {
  const empty = temp();
  const full = temp();
  writeFileSync(join(full, "old.tgz"), "old");
  for (const out of [empty, full]) {
    const run = cli([`refs/tags/tsconfig-v${versionOf("tsconfig")}`, out]);
    assert.equal(run.status, 1, out);
    assert.equal(run.stdout, "", out);
  }
  assert.deepEqual(readdirSync(empty), []);
  assert.deepEqual(readdirSync(full), ["old.tgz"]);
  assert.equal(readFileSync(join(full, "old.tgz"), "utf8"), "old");
});

test("CLI: a second run on the same output folder fails with 1 and leaves the first tarball", () => {
  const out = fresh();
  const first = cli([`refs/tags/tsconfig-v${versionOf("tsconfig")}`, out]);
  assert.equal(first.status, 0, first.stderr);
  const [file] = readdirSync(out);
  const sha256 = sha256Of(join(out, file));
  // A wrong version of the same preset: its cleanup must not reach the first tarball.
  for (const tag of [`refs/tags/tsconfig-v${versionOf("tsconfig")}`, "refs/tags/tsconfig-v9.9.9", "refs/heads/main"]) {
    const second = cli([tag, out]);
    assert.equal(second.status, 1, tag);
    assert.equal(second.stdout, "", tag);
    assert.deepEqual(readdirSync(out), [file], tag);
    assert.equal(sha256Of(join(out, file)), sha256, tag);
  }
  assert.equal(first.stdout, `file=${file}\nsha256=${sha256}\n`);
});

test("CLI: two parallel runs on one output folder: one takes it, its tarball stays as it printed it", async () => {
  const out = fresh();
  const runs = await Promise.all(
    ["tsconfig", "eslint-config", "prettier-config"].map((pkg) => cliAsync([`refs/tags/${pkg}-v${versionOf(pkg)}`, out])),
  );
  const won = runs.filter((run) => run.status === 0);
  assert.equal(won.length, 1, JSON.stringify(runs));
  assert.deepEqual(runs.map((run) => run.status).sort(), [0, 1, 1]);
  const [file] = readdirSync(out);
  assert.deepEqual(readdirSync(out), [file]);
  assert.equal(won[0].stdout, `file=${file}\nsha256=${sha256Of(join(out, file))}\n`);
});

test("CLI started through a symlink still runs: a bad tag fails with 1, no arguments with 2", () => {
  const link = join(temp(), "publish-package.mjs");
  symlinkSync(SCRIPT, link);
  const out = fresh();
  const bad = cli(["refs/tags/tsconfig-v9.9.9", out], {}, link);
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stderr, /version/);
  assert.equal(existsSync(out), false);
  const usage = cli([], {}, link);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /usage/);
});

test("CLI: GITHUB_OUTPUT that is a folder or inside the output folder fails with 1, prints nothing and removes the folder", () => {
  const tag = `refs/tags/tsconfig-v${versionOf("tsconfig")}`;
  const file = `ductura-tsconfig-${versionOf("tsconfig")}.tgz`;
  const folder = cli([tag, fresh()], { GITHUB_OUTPUT: temp() });
  assert.equal(folder.status, 1);
  assert.equal(folder.stdout, "");
  for (const name of [file, "github-output", "."]) {
    const out = fresh();
    const run = cli([tag, out], { GITHUB_OUTPUT: join(out, name) });
    assert.equal(run.status, 1, name);
    assert.equal(run.stdout, "", name);
    assert.equal(existsSync(out), false, name);
  }
  // A link elsewhere that points at the tarball npm pack is about to write.
  const out = fresh();
  const link = join(temp(), "github-output");
  symlinkSync(join(out, file), link);
  const run = cli([tag, out], { GITHUB_OUTPUT: link });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(existsSync(out), false);
});

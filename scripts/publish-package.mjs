// Packs a preset for its public GitHub Release (DAN-1005) and checks the
// tarball: the tag refs/tags/<pkg>-vX.Y.Z names the package and the version,
// and the tarball holds only package.json, README.md and the files matched by
// `files` of the package. Usage: node scripts/publish-package.mjs <GITHUB_REF> <out-dir>
// <out-dir> must not exist yet: the run makes it and owns it. Prints file= and
// sha256= (also to $GITHUB_OUTPUT); any mismatch exits 1.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const PACKAGES = new Set(["tsconfig", "eslint-config", "prettier-config"]);
const TAG = /^refs\/tags\/([a-z-]+)-v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;
// One path segment: short ASCII, no leading dot (no dotfiles, ".", "..").
const SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
// `*` only inside the last segment of a `files` pattern, never `**`.
const LAST_SEGMENT = /^(?!.*\*\*)[A-Za-z0-9_*][A-Za-z0-9._*-]*$/;

export function parseTag(ref) {
  const match = typeof ref === "string" ? TAG.exec(ref) : null;
  if (!match || !PACKAGES.has(match[1])) throw new Error(`not a preset release tag: ${JSON.stringify(ref)}`);
  return { pkg: match[1], version: match[2] };
}

function filePatterns(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error("files must be a non-empty array");
  return files.map((pattern) => {
    const segments = typeof pattern === "string" ? pattern.split("/") : [];
    const last = segments.pop();
    if (last === undefined || !LAST_SEGMENT.test(last) || !segments.every((s) => SEGMENT.test(s))) {
      throw new Error(`unsupported files pattern: ${JSON.stringify(pattern)}`);
    }
    const body = [...segments, last].join("/").replace(/\./g, "\\.").replace(/\*/g, "[^/]*");
    return { pattern, regex: new RegExp(`^${body}$`), used: false };
  });
}

// A text field ends at its first NUL; node-tar may still read bytes after it,
// so every byte after that NUL must be NUL too.
function field(block, start, length) {
  const bytes = block.subarray(start, start + length);
  const end = bytes.indexOf(0);
  if (end !== -1 && !bytes.subarray(end).every((b) => b === 0)) throw new Error("tar: bytes after NUL in a header field");
  return bytes.subarray(0, end === -1 ? length : end).toString("latin1");
}

function octal(block, start, length, name) {
  // The whole raw field, no trim(): octal digits, then only spaces or NULs, so
  // NBSP or bytes after a NUL cannot make a field that node-tar reads differently.
  const text = block.subarray(start, start + length).toString("latin1");
  if (!/^ *[0-7]+[ \0]*$/.test(text)) throw new Error(`tar: ${name} is not an octal number: ${JSON.stringify(text)}`);
  return parseInt(text, 8);
}

// Every byte of a ustar header is checked. These fields npm pack (node-tar,
// portable) leaves empty; other tar readers act on each of them (a linkname on a
// regular file is rejected by node-tar), so all their bytes must be NUL.
const EMPTY = [["uid", 108, 8], ["gid", 116, 8], ["linkname", 157, 100], ["uname", 265, 32], ["gname", 297, 32], ["prefix", 345, 155], ["padding", 500, 12]];
// These numbers npm pack writes as fixed values; mtime is any octal number.
const NUMBERS = [["mode", 100, 8, 0o644], ["mtime", 136, 12], ["devmajor", 329, 8, 0], ["devminor", 337, 8, 0]];

// Regular files of a ustar archive. Anything else (links, folders, pax or GNU
// headers, a header field npm pack does not write) and every malformed archive throws.
export function readTarball(gz) {
  const tar = gunzipSync(gz);
  const entries = [];
  for (let at = 0; ; ) {
    if (at + 1024 > tar.length) throw new Error("tar: no end-of-archive block");
    const block = tar.subarray(at, at + 512);
    if (block.every((b) => b === 0)) {
      if (!tar.subarray(at).every((b) => b === 0)) throw new Error("tar: data after the end-of-archive block");
      return entries;
    }
    const sum = block.reduce((s, b, i) => s + (i >= 148 && i < 156 ? 32 : b), 0);
    if (octal(block, 148, 8, "checksum") !== sum) throw new Error("tar: bad header checksum");
    // POSIX ustar only (magic "ustar\0", version "00"), as npm pack writes it:
    // old and GNU headers are read differently by other tar readers.
    if (block.subarray(257, 265).toString("latin1") !== "ustar\u000000") throw new Error("tar: not a POSIX ustar header");
    const path = field(block, 0, 100);
    if (block[156] !== 0x30) throw new Error(`tar: ${JSON.stringify(path)} is not a regular file`);
    for (const [name, start, length] of EMPTY) {
      if (!block.subarray(start, start + length).every((b) => b === 0)) throw new Error(`tar: ${JSON.stringify(path)} has a ${name} field`);
    }
    for (const [name, start, length, only] of NUMBERS) {
      const value = octal(block, start, length, name);
      if (only !== undefined && value !== only) throw new Error(`tar: ${JSON.stringify(path)} has ${name} ${value.toString(8)}, not ${only.toString(8)}`);
    }
    const size = octal(block, 124, 12, "size");
    const data = tar.subarray(at + 512, at + 512 + size);
    if (data.length !== size) throw new Error("tar: truncated");
    entries.push({ path, data });
    at += 512 + Math.ceil(size / 512) * 512;
  }
}

// Every problem of a packed tarball; an empty list means it may be released.
export function checkTarball(gz, fileName, files, { pkg, version }) {
  const problems = [];
  if (fileName !== `ductura-${pkg}-${version}.tgz`) problems.push(`tarball name ${JSON.stringify(fileName)} is not ductura-${pkg}-${version}.tgz`);
  let patterns, entries;
  try {
    patterns = filePatterns(files);
    entries = readTarball(gz);
  } catch (error) {
    return [...problems, error.message];
  }
  const seen = new Set();
  let manifest;
  for (const { path, data } of entries) {
    const rel = path.startsWith("package/") ? path.slice("package/".length) : "";
    if (!rel.split("/").every((s) => SEGMENT.test(s))) problems.push(`path not allowed: ${JSON.stringify(path)}`);
    // Case-insensitive: on such a file system a.js and A.js overwrite each other.
    else if (seen.has(rel.toLowerCase())) problems.push(`duplicate entry: ${JSON.stringify(path)}`);
    seen.add(rel.toLowerCase());
    if (rel === "package.json") manifest = data;
    const matching = patterns.filter((p) => p.regex.test(rel));
    matching.forEach((p) => (p.used = true));
    if (rel !== "package.json" && rel !== "README.md" && matching.length === 0) problems.push(`not in files: ${JSON.stringify(path)}`);
  }
  for (const p of patterns) if (!p.used) problems.push(`files entry ${JSON.stringify(p.pattern)} matches nothing`);
  let json;
  try {
    json = JSON.parse(manifest?.toString("utf8") ?? "");
  } catch {
    return [...problems, "package/package.json is missing or not JSON"];
  }
  if (json?.name !== `@ductura/${pkg}`) problems.push(`name ${JSON.stringify(json?.name)} is not @ductura/${pkg}`);
  if (json?.version !== version) problems.push(`version ${JSON.stringify(json?.version)} is not the tag's ${version}`);
  return problems;
}

export function main(args, env = process.env) {
  if (args.length !== 2) {
    console.error("usage: node scripts/publish-package.mjs <GITHUB_REF> <out-dir>");
    return 2;
  }
  const out = resolve(args[1]);
  let problems;
  let made; // the folder this run made: only it may be removed
  try {
    const tag = parseTag(args[0]);
    // No `recursive`: an existing folder (or one another run just made) is EEXIST,
    // so one run alone owns the folder and no other run can clean it up.
    try {
      mkdirSync(out);
    } catch (error) {
      throw new Error(error.code === "EEXIST" ? `${out} already exists` : error.message);
    }
    made = lstatSync(out);
    const dir = new URL(`../packages/${tag.pkg}/`, import.meta.url);
    const { files } = JSON.parse(readFileSync(new URL("package.json", dir), "utf8"));
    execFileSync("npm", ["pack", "--ignore-scripts", "--pack-destination", out], { cwd: dir, stdio: ["ignore", "ignore", "inherit"] });
    const packed = readdirSync(out);
    if (packed.length !== 1) throw new Error(`npm pack wrote ${packed.length} files`);
    // One read: the bytes that are checked are the bytes that are hashed.
    const gz = readFileSync(join(out, packed[0]));
    problems = checkTarball(gz, packed[0], files, tag);
    if (problems.length === 0) {
      const sha256 = createHash("sha256").update(gz).digest("hex");
      const lines = `file=${packed[0]}\nsha256=${sha256}\n`;
      if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, lines);
      // GITHUB_OUTPUT may alias the tarball (same path, link) or sit in the folder:
      // only the checked file, byte for byte, may be left for the release.
      const after = readdirSync(out);
      const same = after.length === 1 && createHash("sha256").update(readFileSync(join(out, after[0]))).digest("hex") === sha256;
      if (!same) throw new Error("GITHUB_OUTPUT changed the output folder");
      process.stdout.write(lines);
      return 0;
    }
  } catch (error) {
    problems = [error.message];
  }
  // Nothing of a failed run stays: the folder it made goes, if it is still that folder.
  if (made) {
    const now = lstatSync(out, { throwIfNoEntry: false });
    if (now?.isDirectory() && now.dev === made.dev && now.ino === made.ino) rmSync(out, { recursive: true, force: true });
  }
  for (const problem of problems) console.error(`publish-package: ${problem}`);
  return 1;
}

// realpath: started through a symlink, the script still runs instead of exiting 0.
const started = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : "";
if (import.meta.url === started) process.exitCode = main(process.argv.slice(2));

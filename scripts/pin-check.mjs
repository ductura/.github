// Fails when a workflow references an action or reusable workflow that is not
// pinned to a full commit SHA. Local paths (./) are allowed; docker:// needs a
// sha256 digest. Usage: node scripts/pin-check.mjs <dir-or-file>...
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const USES_KEY = /^\s*(?:-\s+)?(["']?)uses\1\s*:(.*)$/;
const VALUE = /^\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))/;
const PINNED = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/;
const DOCKER_PINNED = /^docker:\/\/[^@\s]+@sha256:[0-9a-f]{64}$/;

export function isPinned(ref) {
  if (ref.startsWith("./")) return true;
  if (ref.startsWith("docker://")) return DOCKER_PINNED.test(ref);
  return PINNED.test(ref);
}

// YAML accepts CRLF and lone CR as line breaks; splitting on "\n" alone would
// leave "\r" on every line and hide each `uses:` from the key regex.
const lines = (text) => text.split(/\r\n|\r|\n/);

export function countUses(text) {
  return lines(text).filter((raw) => USES_KEY.test(raw)).length;
}

export function checkText(text, file) {
  const problems = [];
  lines(text).forEach((raw, index) => {
    const key = USES_KEY.exec(raw);
    if (!key) return;
    // A value on the next line (block scalar or continuation) is not checked: report it.
    const match = VALUE.exec(key[2] ?? "");
    const ref = match ? (match[1] ?? match[2] ?? match[3] ?? "") : "";
    if (!isPinned(ref)) problems.push({ file, line: index + 1, ref });
  });
  return problems;
}

function workflowFiles(path) {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join(path, name));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error("usage: node scripts/pin-check.mjs <dir-or-file>...");
    process.exit(2);
  }
  const files = targets.flatMap(workflowFiles);
  if (files.length === 0) {
    console.error("pin-check: no workflow files found");
    process.exit(2);
  }
  const texts = files.map((file) => [file, readFileSync(file, "utf8")]);
  const problems = texts.flatMap(([file, text]) => checkText(text, file));
  const uses = texts.reduce((sum, [, text]) => sum + countUses(text), 0);
  for (const p of problems) console.error(`${p.file}:${p.line}: not pinned to a full SHA: ${p.ref}`);
  console.log(`pin-check: ${files.length} file(s), ${uses} uses line(s), ${problems.length} unpinned reference(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}

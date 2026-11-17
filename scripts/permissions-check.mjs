// Fails when a workflow job has no permissions of its own and the file has none
// either, or when the file or a job grants more than a list or read-all
// (DAN-970). Workflows are read with a real YAML parser; anything it cannot
// read the way GitHub does (YAML errors, several documents, merge keys, missing
// jobs) is a finding, never a pass.
// Usage: node scripts/permissions-check.mjs <dir-or-file>...
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseDocument } from "yaml";

const isMap = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
// Own, non-null key only: an inherited name or `permissions:` without a value
// grants nothing to read here.
const hasPermissions = (node) => Object.hasOwn(node, "permissions") && node.permissions != null;
// Anything but a plain mapping (a list of scopes) or exactly read-all is broad:
// write-all, a bare write, other spellings, and tagged values such as
// !!binary, !!set or a date that the parser turns into other objects.
const isPlainMap = (v) => isMap(v) && Object.getPrototypeOf(v) === Object.prototype;
const isBroad = (node) => hasPermissions(node) && !isPlainMap(node.permissions) && node.permissions !== "read-all";
const shown = (v) => (Array.isArray(v) ? "list" : typeof v === "object" ? v.constructor?.name ?? "object" : JSON.stringify(v));

// The yaml parser breaks lines only on LF and CRLF. A lone CR, NEL, LS or PS
// can end a comment for another YAML reader and reveal a job this parser
// never sees, so any of them makes the file unreadable (review of #19).
const FOREIGN_BREAK = /\r(?!\n)|[\u0085\u2028\u2029]/;

function readWorkflow(text) {
  if (FOREIGN_BREAK.test(text)) return { reason: "line break other than LF or CRLF" };
  const doc = parseDocument(text, { uniqueKeys: true, merge: false });
  if (doc.errors.length > 0) return { reason: doc.errors.map((e) => e.code).join(", ") };
  const wf = doc.toJS({ maxAliasCount: 100 });
  if (!isMap(wf)) return { reason: "the document is not a mapping" };
  if (Object.hasOwn(wf, "<<")) return { reason: "merge key << at file level" };
  if (!isMap(wf.jobs) || Object.keys(wf.jobs).length === 0) return { reason: "no jobs mapping" };
  for (const [name, job] of Object.entries(wf.jobs)) {
    if (!isMap(job)) return { reason: `job ${name} is not a mapping` };
    if (Object.hasOwn(job, "<<")) return { reason: `merge key << in job ${name}` };
  }
  return { wf };
}

export function checkText(text, file) {
  let read;
  try {
    read = readWorkflow(text);
  } catch (error) {
    read = { reason: error.message };
  }
  if (read.reason) return [{ file, kind: "unreadable", message: `unreadable workflow: ${read.reason}` }];
  const { wf } = read;
  const problems = [];
  if (isBroad(wf)) problems.push({ file, kind: "broad", message: `permissions of the file: broad (${shown(wf.permissions)})` });
  for (const [job, node] of Object.entries(wf.jobs)) {
    if (isBroad(node)) problems.push({ file, job, kind: "broad", message: `job ${job}: broad permissions (${shown(node.permissions)})` });
    else if (!hasPermissions(wf) && !hasPermissions(node)) problems.push({ file, job, kind: "missing", message: `job ${job}: no permissions in the job or the file` });
  }
  return problems;
}

function workflowFiles(path) {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .filter((name) => /\.ya?ml$/i.test(name))
    .map((name) => join(path, name));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error("usage: node scripts/permissions-check.mjs <dir-or-file>...");
    process.exit(2);
  }
  let files;
  try {
    files = targets.flatMap(workflowFiles);
  } catch (error) {
    console.error(`permissions-check: ${error.message}`);
    process.exit(2);
  }
  if (files.length === 0) {
    console.error("permissions-check: no workflow files found");
    process.exit(2);
  }
  const problems = files.flatMap((file) => checkText(readFileSync(file, "utf8"), file));
  for (const p of problems) console.error(`${p.file}: ${p.message}`);
  console.log(`permissions-check: ${files.length} file(s), ${problems.length} finding(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}

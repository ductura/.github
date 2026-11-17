// Fails when a workflow job has no permissions of its own and the file has none
// either, when the file or a job grants more than a list or read-all, or when a
// pull_request_target workflow checks out what may be PR code (DAN-970).
// Workflows are read with a real YAML parser; anything it cannot read the way
// GitHub does (YAML errors, several documents, merge keys anywhere, an unusual
// on, missing jobs) is a finding, never a pass.
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

// A merge key anywhere: the parser keeps it as a plain key, GitHub would merge
// it and could hide a key such as permissions or ref (keys only, never values).
function hasMergeKey(v) {
  if (Array.isArray(v)) return v.some(hasMergeKey);
  if (!isPlainMap(v)) return false;
  return Object.keys(v).some((k) => k === "<<" || hasMergeKey(v[k]));
}

// Event names of `on` in lower case, or null when `on` is missing or not a
// name, a list of names or a non-empty mapping (under %YAML 1.1 it reads as true).
function eventsOf(wf) {
  const on = Object.hasOwn(wf, "on") ? wf.on : undefined;
  let names = null;
  if (typeof on === "string") names = [on];
  else if (Array.isArray(on) && on.length > 0 && on.every((e) => typeof e === "string")) names = on;
  else if (isPlainMap(on) && Object.keys(on).length > 0) names = Object.keys(on);
  return names && names.map((e) => e.toLowerCase());
}

const CHECKOUT = /^actions\/checkout(\/[^@]*)?@/i;
// An expression cannot be shown not to name the PR head, so it fails closed.
const UNSAFE_REF = /\$\{\{|refs\/pull\//i;
// What can set INPUT_* for a checkout, which reads its inputs from INPUT_*:
// an INPUT_* key in the env of the file, job, container, a service or a step,
// or one of those given by an expression or in another form (reviews of #22).
// Keys are matched in any case; anything not a mapping fails closed.
const valuesOf = (node, name) => (isPlainMap(node) ? Object.keys(node).filter((k) => k.toLowerCase() === name).map((k) => node[k]) : []);
const isExpression = (v) => typeof v === "string" && v.includes("${{");
function envProblems(node) {
  return valuesOf(node, "env").flatMap((env) => {
    if (env == null) return [];
    if (!isPlainMap(env)) return ["env is not a mapping"];
    return Object.keys(env).filter((k) => /^input_/i.test(k)).map((k) => `env ${k}`);
  });
}
function jobEnvProblems(job) {
  const found = envProblems(job);
  for (const container of valuesOf(job, "container")) {
    if (isExpression(container)) found.push("container from an expression");
    else found.push(...envProblems(container));
  }
  for (const services of valuesOf(job, "services")) {
    if (isExpression(services)) found.push("services from an expression");
    else if (isPlainMap(services)) {
      for (const [id, service] of Object.entries(services)) {
        if (isExpression(service)) found.push(`service ${id} from an expression`);
        else found.push(...envProblems(service).map((d) => `service ${id} ${d}`));
      }
    }
  }
  for (const step of Array.isArray(job.steps) ? job.steps : []) found.push(...envProblems(step));
  return found;
}

// Checkouts that can fetch PR code in a pull_request_target workflow
// (DAN-970, criterion 3): { reason } when the shape cannot be read.
function prtFindings(wf) {
  const found = [];
  const add = (job, detail) => found.push({ job, detail });
  for (const detail of envProblems(wf)) add(undefined, detail);
  for (const [job, node] of Object.entries(wf.jobs)) {
    const envFound = jobEnvProblems(node);
    if (envFound.length) add(job, envFound.join(", "));
    if (!Object.hasOwn(node, "steps")) continue;
    if (!Array.isArray(node.steps)) return { reason: `steps of job ${job} is not a list` };
    for (const step of node.steps) {
      if (!isPlainMap(step)) return { reason: `a step of job ${job} is not a mapping` };
      if (typeof step.uses !== "string" || !CHECKOUT.test(step.uses) || step.with == null) continue;
      if (!isPlainMap(step.with)) return { reason: `with of a checkout in job ${job} is not a mapping` };
      for (const [key, value] of Object.entries(step.with)) {
        if (!["ref", "repository"].includes(key.toLowerCase())) continue;
        if (!["string", "number", "boolean"].includes(typeof value)) return { reason: `${key} of a checkout in job ${job} is not a scalar` };
        if (UNSAFE_REF.test(String(value))) add(job, `${key}: ${value}`);
      }
    }
  }
  return { found };
}

// GitHub reads workflow keys in any case (review of #22): keys of the file,
// each job, step, container and service are compared in lower case. Two keys
// that differ only in case are unreadable. Job ids and env names stay as they
// are; fromEntries keeps __proto__ an own key.
function lowerKeys(node, where) {
  if (!isPlainMap(node)) return node;
  const keys = Object.keys(node);
  const lower = keys.map((k) => k.toLowerCase());
  if (new Set(lower).size !== keys.length) throw new Error(`keys that differ only in case in ${where}`);
  return Object.fromEntries(keys.map((k, i) => [lower[i], node[k]]));
}

function normalize(wf) {
  const out = lowerKeys(wf, "the file");
  if (!isPlainMap(out.jobs)) return out;
  out.jobs = Object.fromEntries(Object.entries(out.jobs).map(([id, raw]) => {
    const job = lowerKeys(raw, `job ${id}`);
    if (!isPlainMap(job)) return [id, job];
    if (Array.isArray(job.steps)) job.steps = job.steps.map((s) => lowerKeys(s, `a step of job ${id}`));
    job.container = lowerKeys(job.container, `the container of job ${id}`);
    if (isPlainMap(job.services)) job.services = Object.fromEntries(Object.entries(job.services).map(([s, v]) => [s, lowerKeys(v, `service ${s}`)]));
    return [id, job];
  }));
  return out;
}

function readWorkflow(text) {
  if (FOREIGN_BREAK.test(text)) return { reason: "line break other than LF or CRLF" };
  const doc = parseDocument(text, { uniqueKeys: true, merge: false });
  if (doc.errors.length > 0) return { reason: doc.errors.map((e) => e.code).join(", ") };
  const parsed = doc.toJS({ maxAliasCount: 100 });
  if (!isMap(parsed)) return { reason: "the document is not a mapping" };
  const wf = normalize(parsed);
  if (hasMergeKey(wf)) return { reason: "merge key <<" };
  const events = eventsOf(wf);
  if (!events) return { reason: "on is not an event name, a list of names or a mapping" };
  if (!isMap(wf.jobs) || Object.keys(wf.jobs).length === 0) return { reason: "no jobs mapping" };
  for (const [name, job] of Object.entries(wf.jobs)) {
    if (!isMap(job)) return { reason: `job ${name} is not a mapping` };
  }
  if (!events.includes("pull_request_target")) return { wf, prt: [] };
  const prt = prtFindings(wf);
  return prt.reason ? prt : { wf, prt: prt.found };
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
  for (const { job, detail } of read.prt) {
    const where = job === undefined ? "the file" : `job ${job}`;
    problems.push({ file, job, kind: "prt-checkout", message: `${where}: pull_request_target with a checkout that can fetch PR code (${detail})` });
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

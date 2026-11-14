// Weekly read-only check that Ductura repositories still match the expected
// settings in drift/expected.json (T-0.7, DAN-749): default branch, branch
// protection, required status checks and labels from labels.yml.
// checkDrift and formatReport are pure functions over raw REST responses; the
// client below can only send GET, so the check can never change a repository.
// Usage: node scripts/drift.mjs [expected.json]   (default: drift/expected.json)
// Env: GITHUB_TOKEN (optional for public repos), GITHUB_API_URL, GITHUB_STEP_SUMMARY.
// Exit: 0 no drift, 1 drift found, 2 bad configuration.
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseLabels, validateLabels } from "./labels.mjs";

const NAME = /^[A-Za-z0-9_.-]+$/;

/** Validates drift/expected.json; returns a list of problems ([] when valid). */
export function validateExpected(e) {
  const problems = [];
  if (e?.version !== 1) problems.push("version must be 1");
  if (typeof e?.org !== "string" || !NAME.test(e.org)) problems.push("org must be a GitHub owner name");
  if (typeof e?.branch !== "string" || e.branch.length === 0) problems.push("branch must be a non-empty string");
  if (!Array.isArray(e?.requiredChecks) || !e.requiredChecks.every((c) => typeof c === "string" && c.length > 0)) {
    problems.push("requiredChecks must be a list of non-empty strings");
  }
  if (typeof e?.labels !== "string") problems.push("labels must be a path to labels.yml");
  if (!Array.isArray(e?.repos) || e.repos.length === 0) {
    problems.push("repos must be a non-empty list");
  } else {
    const seen = new Set();
    for (const r of e.repos) {
      if (typeof r?.name !== "string" || !NAME.test(r.name)) problems.push(`repo ${JSON.stringify(r?.name)}: invalid name`);
      else if (seen.has(r.name.toLowerCase())) problems.push(`repo ${r.name}: listed twice`);
      else seen.add(r.name.toLowerCase());
      if (r?.optional !== undefined && typeof r.optional !== "boolean") problems.push(`repo ${r?.name}: optional must be true or false`);
    }
  }
  return problems;
}

const ok = (res) => res?.status === 200;

// Required check names from classic branch protection and from rulesets.
function requiredContexts(branch, rules) {
  const names = new Set();
  const rsc = branch?.protection?.required_status_checks;
  for (const c of rsc?.contexts ?? []) names.add(c);
  for (const c of rsc?.checks ?? []) if (c?.context) names.add(c.context);
  for (const rule of Array.isArray(rules) ? rules : []) {
    if (rule?.type !== "required_status_checks") continue;
    for (const c of rule.parameters?.required_status_checks ?? []) if (c?.context) names.add(c.context);
  }
  return names;
}

function isProtected(branch, rules) {
  if (branch?.protected === true) return true;
  return Array.isArray(rules) && rules.some((r) => ["pull_request", "required_status_checks", "non_fast_forward", "deletion", "update"].includes(r?.type));
}

function diffLabels(repo, want, have) {
  const findings = [];
  const byName = new Map(have.map((l) => [String(l.name).toLowerCase(), l]));
  const wanted = new Set();
  for (const w of want) {
    const key = w.name.toLowerCase();
    wanted.add(key);
    const h = byName.get(key);
    if (!h) {
      findings.push({ repo, kind: "label-missing", detail: w.name });
      continue;
    }
    if (String(h.color).toLowerCase() !== w.color) findings.push({ repo, kind: "label-color", detail: `${w.name}: ${h.color} umjesto ${w.color}` });
    if ((h.description ?? "") !== w.description) findings.push({ repo, kind: "label-description", detail: w.name });
  }
  for (const h of have) if (!wanted.has(String(h.name).toLowerCase())) findings.push({ repo, kind: "label-extra", detail: String(h.name) });
  return findings;
}

/**
 * Compares observed REST responses with the expected state.
 * observed: { [repoName]: { repo, branch, rules, labels } }, each { status, body }.
 * Returns findings { repo, kind, detail, level }; level "drift" fails the run,
 * level "note" is reported only (an optional repository that does not exist yet).
 */
export function checkDrift(expected, labels, observed) {
  const findings = [];
  const add = (f) => findings.push({ level: "drift", ...f });
  for (const { name, optional = false } of expected.repos) {
    const o = observed[name] ?? {};
    if (o.repo?.status === 404) {
      if (optional) findings.push({ repo: name, kind: "repo-absent", detail: "neobvezan repo još ne postoji", level: "note" });
      else add({ repo: name, kind: "repo-missing", detail: "repo ne postoji ili nije čitljiv" });
      continue;
    }
    if (!ok(o.repo)) {
      add({ repo: name, kind: "unreadable", detail: `repo: HTTP ${o.repo?.status ?? "bez odgovora"}` });
      continue;
    }
    if (o.repo.body?.archived === true) add({ repo: name, kind: "archived", detail: "repo je arhiviran" });
    if (o.repo.body?.default_branch !== expected.branch) {
      add({ repo: name, kind: "default-branch", detail: `${o.repo.body?.default_branch} umjesto ${expected.branch}` });
    }
    if (o.branch?.status === 404) {
      add({ repo: name, kind: "branch-missing", detail: expected.branch });
    } else if (!ok(o.branch) || !ok(o.rules)) {
      const which = !ok(o.branch) ? `grana: HTTP ${o.branch?.status ?? "bez odgovora"}` : `pravila: HTTP ${o.rules?.status ?? "bez odgovora"}`;
      add({ repo: name, kind: "unreadable", detail: which });
    } else {
      if (!isProtected(o.branch.body, o.rules.body)) add({ repo: name, kind: "unprotected", detail: expected.branch });
      const have = requiredContexts(o.branch.body, o.rules.body);
      for (const c of expected.requiredChecks) if (!have.has(c)) add({ repo: name, kind: "check-missing", detail: c });
    }
    if (!ok(o.labels) || !Array.isArray(o.labels.body)) {
      add({ repo: name, kind: "unreadable", detail: `labele: HTTP ${o.labels?.status ?? "bez odgovora"}` });
    } else {
      for (const f of diffLabels(name, labels, o.labels.body)) add(f);
    }
  }
  return findings;
}

const KIND_TEXT = {
  "repo-missing": "repo nedostaje",
  "repo-absent": "repo još ne postoji",
  unreadable: "nije čitljivo",
  archived: "arhiviran",
  "default-branch": "zadana grana",
  "branch-missing": "grana ne postoji",
  unprotected: "grana nije zaštićena",
  "check-missing": "nedostaje obvezni status",
  "label-missing": "nedostaje labela",
  "label-extra": "višak labele",
  "label-color": "boja labele",
  "label-description": "opis labele",
};

// Workflow command data: % and line breaks must be escaped (actions/toolkit).
const commandData = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const cell = (s) => String(s).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ").replace(/[<>`]/g, (c) => `\\${c}`);

/** Markdown report in Croatian; one table row per finding. */
export function formatReport(findings, { org, date } = {}) {
  const drift = findings.filter((f) => f.level === "drift");
  const head = `## Razilaženje postavki${org ? ` (${org})` : ""}${date ? `, ${date}` : ""}`;
  if (findings.length === 0) return `${head}\n\nNema razilaženja.\n`;
  const rows = findings.map((f) => `| ${cell(f.repo)} | ${f.level === "drift" ? "razilaženje" : "napomena"} | ${KIND_TEXT[f.kind] ?? f.kind} | ${cell(f.detail)} |`);
  const summary = drift.length === 0 ? "Nema razilaženja; samo napomene." : `Razilaženja: ${drift.length}.`;
  return [head, "", summary, "", "| Repo | Razina | Vrsta | Pojedinosti |", "|---|---|---|---|", ...rows, ""].join("\n");
}

/**
 * A REST client that can only read. Paths must be /repos/...; pagination
 * follows rel="next" links only on the same origin.
 */
export function makeClient({ fetchImpl = globalThis.fetch, token, base = "https://api.github.com" } = {}) {
  const origin = new URL(base).origin;
  const headers = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "ductura-drift-check" };
  if (token) headers.authorization = `Bearer ${token}`;
  const once = async (url) => {
    const res = await fetchImpl(url, { method: "GET", headers, redirect: "error" });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, body, link: res.headers?.get?.("link") ?? null };
  };
  return {
    async get(path, { paginate = false } = {}) {
      if (!path.startsWith("/repos/")) throw new Error(`refusing path outside /repos/: ${path}`);
      let res = await once(`${base.replace(/\/$/, "")}${path}`);
      if (!paginate || res.status !== 200 || !Array.isArray(res.body)) return { status: res.status, body: res.body };
      const all = [...res.body];
      for (let pages = 1; pages < 50; pages++) {
        const next = /<([^>]+)>;\s*rel="next"/.exec(res.link ?? "")?.[1];
        if (!next) break;
        if (new URL(next).origin !== origin) throw new Error(`refusing pagination link to another origin: ${next}`);
        res = await once(next);
        if (res.status !== 200 || !Array.isArray(res.body)) return { status: res.status, body: res.body };
        all.push(...res.body);
      }
      return { status: 200, body: all };
    },
  };
}

/** Reads every expected repository through the client. */
export async function observe(client, expected) {
  const out = {};
  const enc = encodeURIComponent;
  for (const { name } of expected.repos) {
    const base = `/repos/${enc(expected.org)}/${enc(name)}`;
    const repo = await client.get(base);
    if (repo.status !== 200) {
      out[name] = { repo };
      continue;
    }
    const b = enc(expected.branch);
    out[name] = {
      repo,
      branch: await client.get(`${base}/branches/${b}`),
      rules: await client.get(`${base}/rules/branches/${b}`, { paginate: true }),
      labels: await client.get(`${base}/labels?per_page=100`, { paginate: true }),
    };
  }
  return out;
}

/** Loads expected.json and its labels file; throws on any configuration problem. */
export function loadExpected(file) {
  const expected = JSON.parse(readFileSync(file, "utf8"));
  const problems = validateExpected(expected);
  if (problems.length) throw new Error(`${file}: ${problems.join("; ")}`);
  const labelsFile = resolve(dirname(file), "..", expected.labels);
  const { labels } = parseLabels(readFileSync(labelsFile, "utf8"));
  const labelProblems = validateLabels(labels);
  if (labelProblems.length) throw new Error(`${labelsFile}: ${labelProblems.join("; ")}`);
  return { expected, labels };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    console.error("usage: node scripts/drift.mjs [expected.json]");
    return 2;
  }
  let config;
  try {
    config = loadExpected(args[0] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "drift", "expected.json"));
  } catch (error) {
    console.error(`drift: ${error.message}`);
    return 2;
  }
  const client = makeClient({ token: process.env.GITHUB_TOKEN, base: process.env.GITHUB_API_URL || undefined });
  const findings = checkDrift(config.expected, config.labels, await observe(client, config.expected));
  const report = formatReport(findings, { org: config.expected.org, date: new Date().toISOString().slice(0, 10) });
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  const drift = findings.filter((f) => f.level === "drift");
  for (const f of drift) console.log(`::error title=drift ${f.repo}::${f.kind}: ${commandData(f.detail)}`);
  return drift.length > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`drift: ${error.stack ?? error}`);
      process.exit(2);
    },
  );
}

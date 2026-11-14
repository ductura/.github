// Writes the starting files of a new Ductura repository into a local folder:
// README, thin rule adapters (S-0.6), CODEOWNERS, PR template, labels, risk
// table and a CI workflow that calls the shared workflows by full SHA and ends
// in ci-ok. It never creates a GitHub repository and never overwrites a file:
// a second run changes nothing, and a file with other content is a conflict.
// Usage: node scripts/new-repo/generate.mjs --name <repo> --preset <node|generic>
//          --codeowner <@user|@org/team> --ref <40-char SHA> [--ref-label <tag>] <dir>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { checkLabels } from "../labels.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "../..");
const TEMPLATES = join(HERE, "templates");
const DUCTUS = "https://github.com/danielrisavi77-create/Ductus/blob/main";

/** Canonical documents every adapter points to; adapters add no rule of their own. */
export const CANONICAL = [
  ["CLAUDE.md", `${DUCTUS}/CLAUDE.md`, "tvrda pravila"],
  ["AGENTS.md", `${DUCTUS}/AGENTS.md`, "načini rada agenata"],
  ["ENGINEERING_SYSTEM-SAZETAK.md", `${DUCTUS}/docs/ENGINEERING_SYSTEM-SAZETAK.md`, "sažetak gatea, čitaj prvi"],
  ["ENGINEERING_SYSTEM.md", `${DUCTUS}/docs/ENGINEERING_SYSTEM.md`, "risk razine, review i QA, po odjeljcima"],
  ["SESSIONS.md", `${DUCTUS}/docs/SESSIONS.md`, "paralelni rad i predaja"],
  ["MULTI-ACCOUNT.md", `${DUCTUS}/docs/MULTI-ACCOUNT.md`, "predaja među računima"],
  ["DECISIONS.md", `${DUCTUS}/docs/DECISIONS.md`, "prihvaćene odluke"],
  ["PRODUCT.md", `${DUCTUS}/docs/PRODUCT.md`, "pravila proizvoda (§5)"],
  [
    "PLAN-MIGRACIJE.md",
    "https://github.com/ductura/.github/blob/main/docs/plan/PLAN-MIGRACIJE.md",
    "mjesto ovog repoa",
  ],
];

// target path -> template (from templates/), copy (from this repository) or build (function)
const COMMON = {
  "README.md": { template: "common/README.md" },
  "AGENTS.md": { template: "common/adapter.md", vars: { audience: "upute za AI agente" } },
  "CLAUDE.md": { template: "common/adapter.md", vars: { audience: "pravila za AI agente" } },
  ".github/CODEOWNERS": { template: "common/CODEOWNERS" },
  ".github/pull_request_template.md": { copy: "PULL_REQUEST_TEMPLATE.md" },
  ".github/labels.yml": { copy: "labels.yml", check: checkLabels },
  ".github/risk-paths.json": { template: "common/risk-paths.json", check: checkRiskTable },
};

export const PRESETS = {
  generic: { ...COMMON, ".github/workflows/ci.yml": { template: "generic/ci.yml" } },
  node: {
    ...COMMON,
    ".github/workflows/ci.yml": { template: "node/ci.yml" },
    ".nvmrc": { copy: ".nvmrc" },
    ".npmrc": { template: "node/npmrc" },
    ".prettierignore": { template: "node/prettierignore" },
    "eslint.config.ts": { template: "node/eslint.config.ts" },
    "tsconfig.json": { template: "node/tsconfig.json" },
    "package.json": { build: nodePackageJson },
  },
};

const NAME = /^[a-z][a-z0-9-]{0,62}$/;
const SHA = /^[0-9a-f]{40}$/;
const OWNER = /^@[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})(?:\/[A-Za-z0-9][A-Za-z0-9_.-]*)?$/;
const LABEL = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
const RISKS = ["low", "standard", "critical"];

/** Throws on the first invalid option; returns the options with defaults. */
export function validateOptions(options) {
  const { name, preset, codeowner, ref, refLabel = "ci-v1" } = options ?? {};
  if (typeof name !== "string" || !NAME.test(name)) throw new Error(`name must match ${NAME}: ${name}`);
  if (!Object.hasOwn(PRESETS, preset ?? ""))
    throw new Error(`unknown preset: ${preset} (${Object.keys(PRESETS).join(", ")})`);
  if (typeof codeowner !== "string" || !OWNER.test(codeowner))
    throw new Error(`codeowner must be @user or @org/team: ${codeowner}`);
  if (typeof ref !== "string" || !SHA.test(ref)) throw new Error(`ref must be a full 40-character commit SHA: ${ref}`);
  if (typeof refLabel !== "string" || !LABEL.test(refLabel))
    throw new Error(`ref-label must match ${LABEL}: ${refLabel}`);
  return { name, preset, codeowner, ref, refLabel };
}

/** Replaces every %%key%%; fails on a key without a value and on a value no placeholder used. */
export function render(text, vars, where = "template") {
  const used = new Set();
  const out = text.replace(/%%([A-Za-z]+)%%/g, (_, key) => {
    if (!Object.hasOwn(vars, key)) throw new Error(`${where}: no value for %%${key}%%`);
    used.add(key);
    return vars[key];
  });
  const unused = Object.keys(vars).filter((key) => !used.has(key));
  if (unused.length > 0) throw new Error(`${where}: unused value(s) ${unused.join(", ")}`);
  if (/%%/.test(out)) throw new Error(`${where}: malformed placeholder`);
  return out;
}

/** Checks the risk table this generator writes; the reader is the gate (S-0.10-a). */
export function checkRiskTable(text) {
  const table = JSON.parse(text);
  if (table.version !== 1) throw new Error("risk table: version must be 1");
  if (!RISKS.includes(table.default)) throw new Error(`risk table: bad default ${table.default}`);
  if (!Array.isArray(table.rules) || table.rules.length === 0)
    throw new Error("risk table: rules must be a non-empty list");
  const seen = new Set();
  for (const rule of table.rules) {
    if (typeof rule.pattern !== "string" || rule.pattern === "" || seen.has(rule.pattern))
      throw new Error(`risk table: bad or duplicate pattern ${rule.pattern}`);
    if (!RISKS.includes(rule.risk)) throw new Error(`risk table: bad risk ${rule.risk} for ${rule.pattern}`);
    if (typeof rule.reason !== "string" || rule.reason === "")
      throw new Error(`risk table: ${rule.pattern} has no reason`);
    seen.add(rule.pattern);
  }
}

const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

// Tool versions come from the presets self-test fixture and preset packages, so
// a new repository starts with the versions this repository already tests.
function nodePackageJson({ name }) {
  const fixture = readJson("fixtures/lint-presets/package.json");
  const tool = (dep) => fixture.devDependencies[dep] ?? fail(`fixture has no ${dep}`);
  const preset = (dir) => {
    const pkg = readJson(`packages/${dir}/package.json`);
    return [pkg.name, pkg.version];
  };
  const pkg = {
    name: `@ductura/${name}`,
    version: "0.0.0",
    private: true,
    type: "module",
    packageManager: fixture.packageManager,
    prettier: "@ductura/prettier-config",
    scripts: {
      typecheck: "tsc --noEmit -p tsconfig.json",
      lint: "eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts --max-warnings 0 .",
      format: "prettier --check .",
      test: "node --test",
    },
    devDependencies: Object.fromEntries([
      ...["eslint-config", "prettier-config", "tsconfig"].map(preset),
      ...["@types/node", "eslint", "prettier", "typescript"].map((dep) => [dep, tool(dep)]),
    ]),
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function fail(message) {
  throw new Error(message);
}

/** Pure: returns Map(relative path -> file content) for the options. */
export function renderRepo(options) {
  const opts = validateOptions(options);
  const canonical = CANONICAL.map(([title, url, why]) => `- [${title}](${url}): ${why}`).join("\n");
  const files = new Map();
  for (const [target, spec] of Object.entries(PRESETS[opts.preset])) {
    let text;
    if (spec.build) text = spec.build(opts);
    else if (spec.copy) text = readFileSync(join(ROOT, spec.copy), "utf8");
    else {
      const source = readFileSync(join(TEMPLATES, spec.template), "utf8");
      // Shared values go only to templates that use them; spec.vars always go,
      // so render() reports one that its template does not use.
      const keys = new Set([...source.matchAll(/%%([A-Za-z]+)%%/g)].map((m) => m[1]));
      const shared = Object.entries({ ...opts, canonical }).filter(([key]) => keys.has(key));
      text = render(source, { ...Object.fromEntries(shared), ...spec.vars }, spec.template);
    }
    spec.check?.(text);
    files.set(target, text);
  }
  return files;
}

/**
 * Writes the files into dir. Existing identical files are left untouched; if any
 * existing file differs, nothing is written and the conflicts are returned.
 */
export function writeRepo(dir, options) {
  const files = renderRepo(options);
  const root = resolve(dir);
  const result = { created: [], unchanged: [], conflicts: [] };
  for (const [path, text] of files) {
    const target = resolve(root, path);
    const rel = relative(root, target);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`path leaves the target folder: ${path}`);
    if (!existsSync(target)) result.created.push(path);
    else if (readFileSync(target, "utf8") === text) result.unchanged.push(path);
    else result.conflicts.push(path);
  }
  if (result.conflicts.length > 0) return { ...result, created: [] };
  for (const path of result.created) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, files.get(path), { flag: "wx" });
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: Object.fromEntries(
        ["name", "preset", "codeowner", "ref", "ref-label"].map((key) => [key, { type: "string" }]),
      ),
    });
    if (positionals.length !== 1) throw new Error("expected exactly one target folder");
    const { "ref-label": refLabel, ...rest } = values;
    const result = writeRepo(positionals[0], { ...rest, refLabel });
    for (const path of result.created) console.log(`created   ${path}`);
    for (const path of result.unchanged) console.log(`unchanged ${path}`);
    for (const path of result.conflicts)
      console.error(`conflict  ${path} (exists with other content; nothing written)`);
    process.exit(result.conflicts.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(`new-repo: ${error.message}`);
    process.exit(2);
  }
}

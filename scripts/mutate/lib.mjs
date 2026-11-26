// Pure logic of the mutate command (DAN-1090): which files to mutate, the
// Stryker options and which mutants survived. No I/O here; mutate.mjs runs it.
import path from "node:path";

// Mutable source files: JavaScript and TypeScript, never tests or declarations.
const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const NOT_SOURCE = [
  /\.d\.[cm]?ts$/,
  /\.(?:test|spec)\.[^/]+$/,
  /(?:^|\/)__tests__\//,
  /(?:^|\/)node_modules\//,
  /(?:^|\/)\.stryker-tmp\//,
];

// Stryker's own sandbox never goes into the copy Stryker makes.
export const IGNORE = [".stryker-tmp"];

// Mutants that no test kills. NoCoverage counts too: no test even runs it.
export const SURVIVING = new Set(["Survived", "NoCoverage"]);

export class UsageError extends Error {}

// Paths split on whitespace; each must stay inside the project.
export function splitPaths(text) {
  return String(text ?? "").split(/\s+/).filter(Boolean);
}

export function checkPath(file) {
  const posix = file.replaceAll("\\", "/");
  if (posix.startsWith("-")) throw new UsageError(`not a path: ${file}`);
  if (path.posix.isAbsolute(posix) || /^[A-Za-z]:/.test(posix)) throw new UsageError(`path must be relative to the project: ${file}`);
  const normal = path.posix.normalize(posix);
  if (normal === ".." || normal.startsWith("../")) throw new UsageError(`path leaves the project: ${file}`);
  return normal.replace(/^\.\//, "");
}

export function selectFiles(files) {
  const picked = files.map(checkPath).filter((f) => SOURCE.test(f) && !NOT_SOURCE.some((re) => re.test(f)));
  return [...new Set(picked)].sort();
}

// A diff base is a ref or SHA; never an option git could read (-x, --x).
export function checkBase(base) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(base) || base.includes("..")) throw new UsageError(`not a git ref: ${base}`);
  return base;
}

// Stryker reads `mutate` as globs; a changed file is a literal path, so
// src/routes/[id].ts must not match src/routes/i.ts. Backslash escapes do not
// survive (Stryker turns every \\ into /), so each glob character becomes a
// one-character class; that also disarms extglobs, which need "(". Braces
// cannot be escaped (brace expansion runs before classes): such a path is an
// error, never another file. A leading ! would negate the pattern.
export function globLiteral(file) {
  if (/[{}]/.test(file)) throw new UsageError(`cannot select a path with braces: ${file}`);
  return (file.startsWith("!") ? "./" : "") + file.replace(/[?*()[\]]/g, (c) => `[${c}]`);
}

// Fixed options; the caller's own stryker config is never read (configFile is
// an empty file of ours). logLevel stays info: debug crashes on Vitest 5
// (stryker-js#6272). disableBail: a bail race records killed mutants as
// Survived (#6335); the Vitest runner then passes bail: 0.
export function strykerOptions({ files, configFile, vitestConfig, concurrency }) {
  if (files.length === 0) throw new UsageError("no files to mutate");
  const options = {
    configFile,
    testRunner: "vitest",
    plugins: ["@stryker-mutator/vitest-runner"],
    mutate: files.map(globLiteral),
    coverageAnalysis: "perTest",
    disableBail: true,
    logLevel: "info",
    fileLogLevel: "off",
    reporters: ["clear-text"],
    clearTextReporter: { allowColor: false, reportTests: false, reportMutants: false, reportScoreTable: true },
    thresholds: { high: 100, low: 100, break: null },
    incremental: false,
    ignorePatterns: IGNORE,
    tempDirName: ".stryker-tmp",
    cleanTempDir: "always",
    vitest: vitestConfig ? { configFile: vitestConfig } : {},
  };
  if (concurrency !== undefined) {
    if (!/^[1-9][0-9]?$/.test(String(concurrency))) throw new UsageError(`concurrency must be 1-99: ${concurrency}`);
    options.concurrency = Number(concurrency);
  }
  return options;
}

export function survivors(results) {
  return results.filter((r) => SURVIVING.has(r.status));
}

export function describe(result, root) {
  const file = path.relative(root, result.fileName).replaceAll("\\", "/");
  const { line, column } = result.location.start;
  const replacement = String(result.replacement ?? "").replace(/\s+/g, " ").slice(0, 80);
  return `${file}:${line}:${column + 1} ${result.status} ${result.mutatorName}: ${replacement}`;
}

// Arguments: [--project dir] [--base ref] [--vitest-config file] [--concurrency n] [files...]
export function parseArgs(argv) {
  const out = { project: ".", files: [] };
  const flags = { "--project": "project", "--base": "base", "--vitest-config": "vitestConfig", "--concurrency": "concurrency" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (Object.hasOwn(flags, arg)) {
      const value = argv[++i];
      if (value === undefined || value === "") throw new UsageError(`${arg} needs a value`);
      out[flags[arg]] = value;
    } else if (arg.startsWith("-")) {
      throw new UsageError(`unknown option: ${arg}`);
    } else {
      out.files.push(arg);
    }
  }
  if (out.base !== undefined) checkBase(out.base);
  if (out.vitestConfig !== undefined) out.vitestConfig = checkPath(out.vitestConfig);
  return out;
}

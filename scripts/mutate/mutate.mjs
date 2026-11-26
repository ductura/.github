#!/usr/bin/env node
// Mutation testing of the files a change touches (DAN-1090). Not a gate.
//   node scripts/mutate/mutate.mjs [--project dir] [--base ref] [--vitest-config file] [--concurrency n] [files...]
// Files come from the arguments, from MUTATE_FILES (whitespace-separated) and,
// with --base, from `git diff <base>...HEAD` in the project; all relative to
// the project. Only JS/TS sources are mutated, never tests.
// Exit: 0 no surviving mutant (or nothing to mutate), 1 survivors, 2 error.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { UsageError, describe, parseArgs, selectFiles, splitPaths, strykerOptions, survivors } from "./lib.mjs";

function changedSince(project, base) {
  const out = execFileSync("git", ["-C", project, "diff", "--name-only", "--diff-filter=d", "--relative", "-z", `${base}...HEAD`, "--"], { encoding: "utf8" });
  return out.split("\0").filter(Boolean);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = path.resolve(args.project);
  if (!statSync(project, { throwIfNoEntry: false })?.isDirectory()) throw new UsageError(`project is not a directory: ${args.project}`);

  const named = [...args.files, ...splitPaths(process.env.MUTATE_FILES)];
  if (args.base !== undefined) named.push(...changedSince(project, args.base));
  const files = selectFiles(named);
  for (const file of files) {
    if (!statSync(path.join(project, file), { throwIfNoEntry: false })?.isFile()) throw new UsageError(`no such file in the project: ${file}`);
  }
  if (files.length === 0) {
    console.log("mutate: no changed source files to mutate");
    return 0;
  }
  console.log(`mutate: ${files.length} file(s)\n${files.map((f) => `  ${f}`).join("\n")}`);

  // An empty config of ours, so a stryker config in the project is never read.
  const scratch = mkdtempSync(path.join(tmpdir(), "ductura-mutate-"));
  try {
    const configFile = path.join(scratch, "stryker.config.json");
    writeFileSync(configFile, "{}\n");
    const options = strykerOptions({ files, configFile, vitestConfig: args.vitestConfig, concurrency: args.concurrency });
    const { Stryker } = await import("@stryker-mutator/core");
    process.chdir(project);
    const results = await new Stryker(options).runMutationTest();
    const left = survivors(results);
    console.log(`mutate: ${results.length} mutant(s), ${left.length} surviving`);
    if (left.length === 0) return 0;
    for (const r of left) console.log(`::error::surviving mutant ${describe(r, project)}`);
    return 1;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main().then(
  (code) => { process.exitCode = code; },
  (err) => {
    console.error(`::error::mutate: ${err instanceof UsageError ? err.message : err?.stack ?? err}`);
    process.exitCode = 2;
  },
);

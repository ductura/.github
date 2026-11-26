// Decides whether a pull request changes only documents under docs/, so that
// self-test.yml may skip its fixture jobs (engineering-gate, tests-table) that
// run the reusable workflows and never read docs/ (CI-BRZINA, Daniel 25. 11.
// 2026). Fails closed: any other path, an empty list or an unreadable line
// keeps every fixture job. Markdown outside docs/ is not a document here: the
// pull request template is a tests-table fixture input.
// Usage: git diff --name-only HEAD^1 HEAD | node scripts/docs-only.mjs
//        prints fixtures=true or fixtures=false
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function docsOnly(files) {
  if (!Array.isArray(files) || files.length === 0) return false;
  return files.every((f) => typeof f === "string" && /^docs\/[^\0]+$/.test(f) && !f.split("/").includes(".."));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const files = readFileSync(0, "utf8").split(/\r?\n/).filter((l) => l !== "");
  process.stdout.write(`fixtures=${docsOnly(files) ? "false" : "true"}\n`);
}

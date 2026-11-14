// Prints the shell lines between `# <name>:begin` and `# <name>:end` in a
// workflow, dedented, so tests and self-test jobs run the exact text that the
// reusable workflow ships instead of a copy.
// Usage: node scripts/extract-run.mjs <workflow.yml> <name>
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function extractRun(text, name) {
  const lines = text.split(/\r\n|\r|\n/);
  const find = (tag) => lines.flatMap((l, i) => (l.trim() === `# ${name}:${tag}` ? [i] : []));
  const begin = find("begin");
  const end = find("end");
  if (begin.length !== 1 || end.length !== 1) throw new Error(`expected one ${name}:begin and one ${name}:end marker`);
  const body = lines.slice(begin[0] + 1, end[0]);
  if (end[0] < begin[0] || body.every((l) => l.trim() === "")) throw new Error(`empty or reversed ${name} block`);
  const indent = Math.min(...body.filter((l) => l.trim() !== "").map((l) => /^ */.exec(l)[0].length));
  return body.map((l) => l.slice(indent)).join("\n") + "\n";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [file, name] = process.argv.slice(2);
  if (!file || !name) {
    console.error("usage: node scripts/extract-run.mjs <workflow.yml> <name>");
    process.exit(2);
  }
  process.stdout.write(extractRun(readFileSync(file, "utf8"), name));
}

// Mutation testing over the files a PR changes (DAN-1090): every mutant of the
// given sources runs the test command, and a mutant the tests still pass is a
// survivor. A tool for the writer before "ready for review", not a gate.
// Mutations are lexical: comments, strings, whole template literals and regex
// literals are skipped; a mutant that does not parse counts as killed.
// Usage: node scripts/mutate/mutate.mjs <file>... -- <test command>...
// Exit: 0 every mutant killed, 1 a survivor, 2 nothing could be judged.
import { spawn } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SWAP = { "===": "!==", "!==": "===", "==": "!=", "!=": "==", "<": "<=", "<=": "<", ">": ">=", ">=": ">", "&&": "||", "||": "&&", "+": "-", "-": "+", true: "false", false: "true" };
// Longest first, so >>>= is never read as >, >= or >>.
const PUNCT = [">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=", "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "<<", ">>"];
// After these keywords a slash starts a regex; after a name, number, string, ) or ] it divides.
const BEFORE_REGEX = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const WORD = /[\p{ID_Continue}$‌‍]/u;
const SOURCE = /\.[cm]?[jt]s$/i;
const TEST = /\.(test|spec)\.[cm]?[jt]s$/i;

function skipQuoted(s, i) {
  const q = s[i++];
  while (i < s.length && s[i] !== q) i += s[i] === "\\" ? 2 : 1;
  return i + 1;
}
function skipTemplate(s, i) {
  for (i++; i < s.length; ) {
    if (s[i] === "\\") i += 2;
    else if (s[i] === "`") return i + 1;
    else if (s.startsWith("${", i)) i = skipBraces(s, i + 2);
    else i++;
  }
  return i;
}
// The end of a comment (or a hashbang at the very start) at i, or -1 when none starts there.
function skipComment(s, i) {
  const to = (end, extra) => (s.indexOf(end, i + 2) < 0 ? s.length : s.indexOf(end, i + 2) + extra);
  if (s.startsWith("//", i) || (i === 0 && s.startsWith("#!"))) return to("\n", 0);
  return s.startsWith("/*", i) ? to("*/", 2) : -1;
}
function skipBraces(s, i) {
  for (let depth = 0; i < s.length; ) {
    const c = s[i];
    if (skipComment(s, i) >= 0) i = skipComment(s, i);
    else if (c === "'" || c === '"') i = skipQuoted(s, i);
    else if (c === "`") i = skipTemplate(s, i);
    else if (c === "}" && depth-- === 0) return i + 1;
    else i++, c === "{" && depth++;
  }
  return i;
}
function skipRegex(s, i) {
  for (let inClass = false, c = s[++i]; i < s.length && c !== "\n"; c = s[++i]) {
    if (c === "\\") i++;
    else if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) break;
  }
  for (i++; i < s.length && WORD.test(s[i]); ) i++;
  return i;
}

// Every mutant of a source text: { offset, from, to, line, col } (1-based).
export function mutantsOf(s) {
  const out = [];
  let prev = null;
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    let tok;
    if (/\s/u.test(c)) { i++; continue; }
    if (skipComment(s, i) >= 0) { i = skipComment(s, i); continue; }
    if (c === "'" || c === '"' || c === "`") { i = c === "`" ? skipTemplate(s, i) : skipQuoted(s, i); prev = { kind: "str" }; continue; }
    const regexMayStart = !prev || (prev.kind === "punct" && ![")", "]", "++", "--"].includes(prev.text)) || (prev.kind === "word" && BEFORE_REGEX.has(prev.text));
    if (c === "/" && regexMayStart) { i = skipRegex(s, i); prev = { kind: "str" }; continue; }
    if (WORD.test(c)) {
      let j = i;
      while (j < s.length && WORD.test(s[j])) j++;
      tok = { kind: "word", text: s.slice(i, j) };
      const member = prev?.kind === "punct" && (prev.text === "." || prev.text === "?.");
      if (member || (tok.text !== "true" && tok.text !== "false")) { prev = tok; i = j; continue; }
    } else tok = { kind: "punct", text: PUNCT.find((p) => s.startsWith(p, i)) ?? c };
    if (Object.hasOwn(SWAP, tok.text)) {
      const before = s.slice(0, i);
      const line = before.split("\n").length;
      out.push({ offset: i, from: tok.text, to: SWAP[tok.text], line, col: i - before.lastIndexOf("\n") });
    }
    prev = tok;
    i += tok.text.length;
  }
  return out;
}

// What an interrupt must undo: the running tests and the file under a mutant.
const live = { kill: () => {}, path: null, original: null };
// Runs argv without a shell; on POSIX the whole process group goes when it ends or times out.
// Resolves the exit code, -1 for a kill, or "launch" when the command did not start.
function runTests(argv, timeoutMs) {
  return new Promise((done) => {
    const group = process.platform !== "win32";
    const child = spawn(argv[0], argv.slice(1), { stdio: "ignore", detached: group });
    const kill = (live.kill = () => { try { group ? process.kill(-child.pid, "SIGKILL") : child.kill("SIGKILL"); } catch {} });
    const timer = timeoutMs ? setTimeout(kill, timeoutMs) : null;
    const end = (code) => { clearTimeout(timer); kill(); done(code); };
    child.on("error", () => end("launch"));
    child.on("exit", (code) => end(code ?? -1));
  });
}

export async function main(args, log = console.log, warn = console.error) {
  const sep = args.indexOf("--");
  const files = sep < 0 ? [] : args.slice(0, sep);
  const cmd = sep < 0 ? [] : args.slice(sep + 1);
  if (files.length === 0 || cmd.length === 0) return warn("usage: node scripts/mutate/mutate.mjs <file>... -- <test command>..."), 2;
  const targets = new Map();
  for (const f of files) {
    if (!statSync(f, { throwIfNoEntry: false })?.isFile()) return warn(`mutate: not a file: ${f}`), 2;
    if (SOURCE.test(f) && !TEST.test(f)) targets.set(resolve(f), { name: f, original: readFileSync(f) });
    else log(`skipped ${f}`);
  }
  for (const t of targets.values()) t.mutants = mutantsOf(t.original.toString("utf8"));
  if ([...targets.values()].every((t) => t.mutants.length === 0)) return warn("mutate: no mutants in the given files"), 2;
  const started = Date.now();
  const baseline = await runTests(cmd, 0);
  if (baseline === "launch") return warn(`mutate: cannot run ${cmd[0]}`), 2;
  if (baseline !== 0) return warn("mutate: the tests fail without any mutant"), 2;
  const timeoutMs = 3 * (Date.now() - started) + 2000;
  let total = 0, survived = 0, launchFailed = false;
  for (const [path, { name, original, mutants }] of targets) {
    const text = original.toString("utf8");
    for (const m of mutants) {
      if (launchFailed) break;
      total++;
      try {
        Object.assign(live, { path, original });
        writeFileSync(path, text.slice(0, m.offset) + m.to + text.slice(m.offset + m.from.length));
        const code = await runTests(cmd, timeoutMs);
        if (code === "launch") launchFailed = true;
        else if (code === 0) survived++, log(`survived ${name}:${m.line}:${m.col} '${m.from}' -> '${m.to}'`);
      } finally {
        writeFileSync(path, original);
        live.path = null;
      }
    }
  }
  for (const [path, { name, original }] of targets) if (!readFileSync(path).equals(original)) return warn(`mutate: ${name} was not restored`), 2;
  if (launchFailed) return warn(`mutate: ${cmd[0]} did not start for a mutant; nothing is judged`), 2;
  log(`mutate: ${total} mutants, ${total - survived} killed, ${survived} survived`);
  return survived === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => {
      live.kill();
      if (live.path) writeFileSync(live.path, live.original);
      process.exit(130);
    });
  process.exitCode = await main(process.argv.slice(2));
}

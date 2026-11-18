// Mutation testing over the files a PR changes (DAN-1090): every mutant of the
// given sources runs the test command, and a mutant the tests still pass is a
// survivor. A tool for the writer before "ready for review", not a gate.
// Mutations are lexical: comments, strings, whole template literals and regex
// literals are skipped; a mutant that does not parse counts as killed.
// Usage: node scripts/mutate/mutate.mjs <file>... -- <test command>...
// Exit: 0 every mutant killed, 1 a survivor, 2 nothing could be judged.
import { spawn } from "node:child_process";
import { readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { constants } from "node:os";
import { pathToFileURL } from "node:url";

const SWAP = { "===": "!==", "!==": "===", "==": "!=", "!=": "==", "<": "<=", "<=": "<", ">": ">=", ">=": ">", "&&": "||", "||": "&&", "+": "-", "-": "+", true: "false", false: "true" };
// Longest first, so >>>= is never read as >, >= or >>.
const PUNCT = [">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=", "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "<<", ">>"];
// After these keywords a slash starts a regex; after a name, number, string, ) or ] it divides.
const BEFORE_REGEX = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const WORD = /[\p{ID_Continue}$‌‍]+/uy;
const SOURCE = /\.[cm]?[jt]s$/i;
// Tests and declaration files: a mutant there says nothing about the code.
const SKIP = /\.(test|spec)\.[cm]?[jt]s$|\.d\.[cm]?ts$/i;
// A TS mapped-type modifier (-readonly, -?) is a type, not a sum.
const TYPE_MODIFIER = /\s*(readonly\b|\?(?![.?]))/y;

const wordAt = (s, i) => ((WORD.lastIndex = i), WORD.exec(s)?.[0]);
// The end of a comment (or a hashbang at the very start) at i, or -1 when none starts there.
function skipComment(s, i) {
  const to = (end, extra) => (s.indexOf(end, i + 2) < 0 ? s.length : s.indexOf(end, i + 2) + extra);
  if (s.startsWith("//", i) || (i === 0 && s.startsWith("#!"))) return to("\n", 0);
  return s.startsWith("/*", i) ? to("*/", 2) : -1;
}
function skipQuoted(s, i) {
  const q = s[i++];
  while (i < s.length && s[i] !== q) i += s[i] === "\\" ? 2 : 1;
  return i + 1;
}
// A whole template literal; each ${...} is read by the same lexer, without mutants.
function skipTemplate(s, i) {
  for (i++; i < s.length; ) {
    if (s[i] === "\\") i += 2;
    else if (s[i] === "`") return i + 1;
    else if (s.startsWith("${", i)) i = lex(s, i + 2, null);
    else i++;
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
  return i + 1 + (wordAt(s, i + 1)?.length ?? 0);
}

// Reads tokens from i and pushes mutants to out. With out null it reads one
// ${...} interpolation and returns the index after its closing brace.
function lex(s, i, out) {
  let prev = null;
  for (let depth = 0; i < s.length; ) {
    const c = s[i];
    if (/\s/u.test(c)) { i++; continue; }
    if (skipComment(s, i) >= 0) { i = skipComment(s, i); continue; }
    if (c === "'" || c === '"' || c === "`") { i = c === "`" ? skipTemplate(s, i) : skipQuoted(s, i); prev = { kind: "str" }; continue; }
    const regexMayStart = !prev || (prev.kind === "punct" && ![")", "]", "++", "--"].includes(prev.text)) || (prev.kind === "word" && BEFORE_REGEX.has(prev.text));
    if (c === "/" && regexMayStart) { i = skipRegex(s, i); prev = { kind: "str" }; continue; }
    const word = wordAt(s, i);
    const member = prev?.kind === "punct" && (prev.text === "." || prev.text === "?.");
    const tok = word ? { kind: member ? "member" : "word", text: word } : { kind: "punct", text: PUNCT.find((p) => s.startsWith(p, i)) ?? c };
    if (out === null && tok.text === "{") depth++;
    if (out === null && tok.text === "}" && depth-- === 0) return i + 1;
    const typeModifier = (tok.text === "-" || tok.text === "+") && ((TYPE_MODIFIER.lastIndex = i + 1), TYPE_MODIFIER.test(s));
    if (out && Object.hasOwn(SWAP, tok.text) && tok.kind !== "member" && !typeModifier) {
      const before = s.slice(0, i);
      out.push({ offset: i, from: tok.text, to: SWAP[tok.text], line: before.split("\n").length, col: i - before.lastIndexOf("\n") });
    }
    prev = tok;
    i += tok.text.length;
  }
  return i;
}

// Every mutant of a source text: { offset, from, to, line, col } (1-based).
export function mutantsOf(s) {
  const out = [];
  lex(s, 0, out);
  return out;
}

// What an interrupt must undo: the running tests and the file under a mutant.
const live = { kill: () => {}, path: null, original: null };
// Runs argv without a shell; on POSIX the whole process group goes when it ends or times out.
// Resolves the exit code, -1 for a kill, or "launch" when the command did not start.
function runTests(argv, timeoutMs) {
  return new Promise((done) => {
    const group = process.platform !== "win32";
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), { stdio: "ignore", detached: group });
    } catch {
      return done("launch");
    }
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
  if (files.length === 0 || cmd.length === 0 || !cmd[0]) return warn("usage: node scripts/mutate/mutate.mjs <file>... -- <test command>..."), 2;
  const targets = new Map();
  for (const f of files) {
    let real;
    try {
      real = statSync(f).isFile() && realpathSync(f);
    } catch {}
    if (!real) return warn(`mutate: not a readable file: ${f}`), 2;
    if (SOURCE.test(f) && !SKIP.test(f)) targets.set(real, { name: f, original: readFileSync(real) });
    else log(`skipped ${f}`);
  }
  for (const t of targets.values()) t.mutants = mutantsOf(t.original.toString("utf8"));
  if ([...targets.values()].every((t) => t.mutants.length === 0)) return warn("mutate: no mutants in the given files"), 2;
  // The tests must leave every target exactly as they found it, or no run can be compared.
  const untouched = (expected) => [...targets].every(([path, t]) => readFileSync(path).equals(expected.get(path) ?? t.original));
  const started = Date.now();
  const baseline = await runTests(cmd, 0);
  if (baseline === "launch") return warn(`mutate: cannot run ${cmd[0]}`), 2;
  if (baseline !== 0) return warn("mutate: the tests fail without any mutant"), 2;
  if (!untouched(new Map())) return warn("mutate: the tests change a file under test"), 2;
  const timeoutMs = 3 * (Date.now() - started) + 2000;
  let total = 0, survived = 0;
  for (const [path, { name, original, mutants }] of targets) {
    const text = original.toString("utf8");
    for (const m of mutants) {
      total++;
      try {
        Object.assign(live, { path, original });
        const mutant = Buffer.from(text.slice(0, m.offset) + m.to + text.slice(m.offset + m.from.length));
        writeFileSync(path, mutant);
        const code = await runTests(cmd, timeoutMs);
        if (code === "launch") return warn(`mutate: ${cmd[0]} did not start for a mutant; nothing is judged`), 2;
        if (!untouched(new Map([[path, mutant]]))) return warn("mutate: the tests change a file under test"), 2;
        if (code === 0) survived++, log(`survived ${name}:${m.line}:${m.col} '${m.from}' -> '${m.to}'`);
      } finally {
        writeFileSync(path, original);
        live.path = null;
      }
    }
  }
  log(`mutate: ${total} mutants, ${total - survived} killed, ${survived} survived`);
  return survived === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
    process.once(signal, () => {
      live.kill();
      if (live.path) writeFileSync(live.path, live.original);
      process.exit(128 + constants.signals[signal]);
    });
  process.exitCode = await main(process.argv.slice(2)).catch((error) => (console.error(`mutate: ${error.message}`), 2));
}

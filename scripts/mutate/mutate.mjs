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
// Reserved words after which an expression starts, so a slash opens a regex.
// The values this, super, null, true and false are left out: a slash after them divides.
const KEYWORDS = new Set("await break case catch class const continue debugger default delete do else enum export extends finally for function if import in instanceof let new of return static switch throw try typeof var void while with yield".split(" "));
// A block opened right after these is a statement; after a } that closes it a slash opens a regex.
const BLOCK_AFTER = new Set(["else", "do", "try", "catch", "finally", "static", "export", "class"]);
// A ) that closes the head of these statements is followed by a statement.
const HEADS = new Set(["if", "while", "for", "with"]);
const WORD = /[\p{ID_Continue}$‌‍]+/uy;
// A whole numeric literal, so the sign of an exponent (1e-8) is never read as a sum; 0x1e-2 is one.
const NUMBER = /0[xob][\p{ID_Continue}]*|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:e[+-]?[\d_]+)?[\p{ID_Continue}]*/iuy;
const LINE_END = /[\n\r\u2028\u2029]/g;
// CRLF is one line break.
const LINE_BREAK = /\r\n?|[\n\u2028\u2029]/g;
const SOURCE = /\.[cm]?[jt]s$/i;
// Tests and declaration files: a mutant there says nothing about the code.
const SKIP = /\.(test|spec)\.[cm]?[jt]s$|\.d\.[cm]?ts$/i;
// A TS mapped-type modifier (-readonly, -?) is a type, not a sum.
const TYPE_MODIFIER = /\s*(readonly\b|\?(?![.?]))/y;

const wordAt = (s, i) => ((WORD.lastIndex = i), WORD.exec(s)?.[0]);
// The first JS line terminator (LF, CR, LS, PS) at or after i.
const lineEnd = (s, i) => ((LINE_END.lastIndex = i), LINE_END.exec(s)?.index ?? s.length);
// The end of a comment (or a hashbang at the very start) at i, or -1 when none starts there.
function skipComment(s, i) {
  if (s.startsWith("//", i) || (i === 0 && s.startsWith("#!"))) return lineEnd(s, i);
  if (!s.startsWith("/*", i)) return -1;
  const end = s.indexOf("*/", i + 2);
  return end < 0 ? s.length : end + 2;
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
  const end = lineEnd(s, i);
  for (let inClass = false, c = s[++i]; i < end; c = s[++i]) {
    if (c === "\\") i++;
    else if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) break;
  }
  return i + 1 + (wordAt(s, i + 1)?.length ?? 0);
}

// Whether a slash after the token prev opens a regex rather than divides.
function regexAfter(prev) {
  if (!prev) return true;
  if (prev.kind === "punct") return prev.regex ?? !["++", "--"].includes(prev.text);
  return prev.kind === "word" && KEYWORDS.has(prev.text);
}
// Whether a { after prev opens a block (statement, function or class body) rather than an object literal.
function blockAfter(prev, newline) {
  if (!prev) return true;
  if (prev.kind === "word") return BLOCK_AFTER.has(prev.text) || ((prev.text === "return" || prev.text === "yield") && newline) || !KEYWORDS.has(prev.text);
  return prev.kind === "punct" && (prev.block ?? [";", "{", "}", ")", "=>"].includes(prev.text));
}

// Reads tokens from i and pushes mutants to out. With out null it reads one
// ${...} interpolation and returns the index after its closing brace.
// A stack of open brackets tells regex from division after ) and }.
function lex(s, i, out) {
  let prev = out ? null : { kind: "punct", text: "${" }, prev2 = null, end = i;
  const stack = [{ block: true, ternary: 0 }];
  for (; i < s.length; ) {
    const c = s[i];
    if (/\s/u.test(c)) { i++; continue; }
    if (skipComment(s, i) >= 0) { i = skipComment(s, i); continue; }
    if (c === "'" || c === '"' || c === "`") { i = c === "`" ? skipTemplate(s, i) : skipQuoted(s, i); [prev2, prev, end] = [prev, { kind: "str" }, i]; continue; }
    if (c === "/" && regexAfter(prev)) { i = skipRegex(s, i); [prev2, prev, end] = [prev, { kind: "str" }, i]; continue; }
    if (/\d/.test(c) || (c === "." && /\d/.test(s[i + 1] ?? ""))) {
      NUMBER.lastIndex = i;
      NUMBER.exec(s);
      [prev2, prev, i] = [prev, { kind: "num" }, NUMBER.lastIndex];
      end = i;
      continue;
    }
    const word = wordAt(s, i);
    const member = prev?.kind === "punct" && (prev.text === "." || prev.text === "?.");
    // ?. before a digit is a ? and a number (a?.5:b), never optional chaining.
    const punct = PUNCT.find((p) => s.startsWith(p, i) && !(p === "?." && /\d/.test(s[i + 2] ?? ""))) ?? c;
    const tok = word ? { kind: member ? "member" : "word", text: word } : { kind: "punct", text: punct };
    const top = stack.at(-1), newline = lineEnd(s, end) < i;
    if (tok.text === "function" || tok.text === "class") {
      // A function or class in an expression: the slash after its closing brace divides.
      const lead = prev?.text === "async" && !newline ? prev2 : prev;
      if (tok.kind === "word" && lead?.text !== "default" && regexAfter(lead) && !blockAfter(lead, false)) top.exprBody = true;
    } else if (tok.text === "(" || tok.text === "[") {
      stack.push({ close: tok.text === "(" ? ")" : "]", ternary: 0, head: tok.text === "(" && prev?.kind === "word" && (HEADS.has(prev.text) || (prev.text === "await" && prev2?.text === "for")) });
    } else if (tok.text === "{") {
      const block = top.exprBody || blockAfter(prev, newline);
      stack.push({ close: "}", ternary: 0, block, regex: block && !top.exprBody });
      top.exprBody = false;
    } else if (tok.text === ")" || tok.text === "]" || tok.text === "}") {
      if (out === null && tok.text === "}" && stack.length === 1) return i + 1;
      const open = stack.length > 1 && top.close === tok.text ? stack.pop() : {};
      tok.regex = tok.text === ")" ? !!open.head : tok.text === "}" && !!open.regex;
      tok.block = tok.text !== "]";
    } else if (tok.text === "?") top.ternary++;
    else if (tok.text === ":") tok.block = top.ternary > 0 ? (top.ternary--, false) : !!top.block;
    const typeModifier = (tok.text === "-" || tok.text === "+") && ((TYPE_MODIFIER.lastIndex = i + 1), TYPE_MODIFIER.test(s));
    if (out && Object.hasOwn(SWAP, tok.text) && tok.kind !== "member" && !typeModifier) {
      const breaks = [...s.slice(0, i).matchAll(LINE_BREAK)], last = breaks.at(-1);
      out.push({ offset: i, from: tok.text, to: SWAP[tok.text], line: breaks.length + 1, col: i - (last ? last.index + last[0].length : 0) + 1 });
    }
    [prev2, prev] = [prev, tok];
    i += tok.text.length;
    end = i;
  }
  return i;
}

// Every mutant of a source text: { offset, from, to, line, col } (1-based).
export function mutantsOf(s) {
  const out = [];
  lex(s, 0, out);
  return out;
}

// What an interrupt must undo: the running tests and every file under test.
const live = { kill: () => {}, restore: () => {} };
// Runs argv without a shell; on POSIX the whole process group goes when it ends or times out.
// Resolves the exit code, "timeout", "launch" when the command did not start, or the
// signal that ended it from outside (a shell reports one as 128 + its number).
function runTests(argv, timeoutMs) {
  return new Promise((done) => {
    const group = process.platform !== "win32";
    let child, timedOut = false;
    try {
      child = spawn(argv[0], argv.slice(1), { stdio: "ignore", detached: group });
    } catch {
      return done("launch");
    }
    const kill = (live.kill = () => { try { group ? process.kill(-child.pid, "SIGKILL") : child.kill("SIGKILL"); } catch {} });
    const timer = timeoutMs ? setTimeout(() => ((timedOut = true), kill()), timeoutMs) : null;
    const end = (code) => { clearTimeout(timer); kill(); done(code); };
    child.on("error", () => end("launch"));
    child.on("exit", (code, signal) => end(timedOut ? "timeout" : signal ? signal : code > 128 && code <= 192 ? `exit ${code}` : code));
  });
}

const same = (path, bytes) => { try { return readFileSync(path).equals(bytes); } catch { return false; } };

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
  // Whatever ends the run, every target is written back and checked byte for byte.
  live.restore = () => { for (const [path, t] of targets) if (!same(path, t.original)) writeFileSync(path, t.original); };
  let code;
  try {
    code = await judge(targets, cmd, log, warn);
  } finally {
    live.restore();
  }
  if (![...targets].every(([path, t]) => same(path, t.original))) return warn("mutate: a file under test was not restored"), 2;
  return code;
}

async function judge(targets, cmd, log, warn) {
  // The tests must leave every target exactly as they found it, or no run can be compared.
  const untouched = (path, mutant) => [...targets].every(([p, t]) => same(p, p === path ? mutant : t.original));
  const started = Date.now();
  const baseline = await runTests(cmd, 0);
  if (baseline === "launch") return warn(`mutate: cannot run ${cmd[0]}`), 2;
  if (baseline !== 0) return warn(`mutate: the tests fail without any mutant (${baseline})`), 2;
  if (!untouched()) return warn("mutate: the tests change a file under test"), 2;
  const timeoutMs = 3 * (Date.now() - started) + 2000;
  let total = 0, survived = 0, unjudged = 0;
  for (const [path, { name, original, mutants }] of targets) {
    const text = original.toString("utf8");
    for (const m of mutants) {
      total++;
      const mutant = Buffer.from(text.slice(0, m.offset) + m.to + text.slice(m.offset + m.from.length));
      writeFileSync(path, mutant);
      const code = await runTests(cmd, timeoutMs);
      if (code === "launch") return warn(`mutate: ${cmd[0]} did not start for a mutant; nothing is judged`), 2;
      if (!untouched(path, mutant)) return warn("mutate: the tests change a file under test"), 2;
      writeFileSync(path, original);
      const where = `${name}:${m.line}:${m.col} '${m.from}' -> '${m.to}'`;
      // Ended by a signal the timeout did not send: the tests never finished, so this is no kill.
      if (typeof code === "string" && code !== "timeout") unjudged++, log(`unjudged ${where} (${code})`);
      else if (code === 0) survived++, log(`survived ${where}`);
    }
  }
  log(`mutate: ${total} mutants, ${total - survived - unjudged} killed, ${survived} survived${unjudged ? `, ${unjudged} unjudged` : ""}`);
  return survived > 0 ? 1 : unjudged > 0 ? 2 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
    process.once(signal, () => {
      live.kill();
      live.restore();
      process.exit(128 + constants.signals[signal]);
    });
  process.exitCode = await main(process.argv.slice(2)).catch((error) => (console.error(`mutate: ${error.message}`), 2));
}

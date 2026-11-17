// Risk floor by path (S-0.10-a, DAN-1004): the lowest Risk a PR may declare,
// from the changed paths and the repository's own .github/risk-paths.json,
// whose format is scripts/new-repo/templates/common/risk-paths.json. The
// highest matching rule wins; a path no rule matches gets the table default.
// The glob semantics follow ductura/server scripts/engineering/risk-floor.ts
// (DAN-722, 351b158), matched by dynamic programming instead of a RegExp.
// Rules: Ductus docs/ENGINEERING_SYSTEM.md §5.
// Bad input throws; the caller turns any error into `critical` (fails closed).

export type Risk = "low" | "standard" | "critical";
export type RiskRule = { pattern: string; risk: Risk; reason: string };
export type RiskTable = { version: 1; default: Risk; rules: readonly RiskRule[] };

const RISK_RANK = new Map<string, number>([
  ["low", 0],
  ["standard", 1],
  ["critical", 2],
]);
const RISKS: readonly Risk[] = ["low", "standard", "critical"];
const TABLE_KEYS = new Set(["$comment", "version", "default", "rules"]);
const RULE_KEYS = ["pattern", "reason", "risk"];
// ASCII only: no whitespace, control characters, backslash, unsupported glob
// syntax (? [ ] { } !) and no Unicode normalisation question.
const PATTERN_RE = /^[A-Za-z0-9._/*@+-]+$/;
// C0 (CR, LF, tab ...), DEL and C1 controls.
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/;

function tableError(message: string): never {
  throw new Error(`risk table: ${message}`);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** No empty segment (leading, trailing or double slash) and no `.` or `..`. */
const canonicalSegments = (path: string): boolean =>
  path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");

function checkRisk(value: unknown, where: string): Risk {
  if (typeof value !== "string" || !RISK_RANK.has(value)) tableError(`bad risk for ${where}`);
  return value as Risk;
}

function checkPattern(value: unknown, seen: Set<string>): string {
  if (typeof value !== "string" || !PATTERN_RE.test(value) || !canonicalSegments(value))
    tableError(`bad pattern ${JSON.stringify(value)}`);
  // `**` only as a whole segment: `docs**` would cross a slash.
  if (value.split("/").some((segment) => segment.includes("**") && segment !== "**"))
    tableError(`** must be a whole segment in ${value}`);
  if (seen.has(value)) tableError(`duplicate pattern ${value}`);
  seen.add(value);
  return value;
}

/** Parses and checks a risk-paths.json text; anything unexpected throws. */
export function parseRiskTable(text: string): RiskTable {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    tableError("not valid JSON");
  }
  if (!isRecord(raw)) tableError("must be an object");
  for (const key of Object.keys(raw)) if (!TABLE_KEYS.has(key)) tableError(`unknown key ${key}`);
  if (Object.hasOwn(raw, "$comment") && typeof raw["$comment"] !== "string")
    tableError("$comment must be a string");
  if (raw["version"] !== 1) tableError("version must be 1");
  const fallback = checkRisk(raw["default"], "default");
  const list = raw["rules"];
  if (!Array.isArray(list) || list.length === 0) tableError("rules must be a non-empty list");
  const seen = new Set<string>();
  const rules = list.map((item: unknown): RiskRule => {
    if (!isRecord(item)) tableError("a rule is not an object");
    if (Object.keys(item).sort().join() !== RULE_KEYS.join())
      tableError(`a rule must have exactly ${RULE_KEYS.join(", ")}`);
    const pattern = checkPattern(item["pattern"], seen);
    const risk = checkRisk(item["risk"], pattern);
    const reason = item["reason"];
    if (typeof reason !== "string" || reason.trim() === "") tableError(`${pattern} has no reason`);
    return { pattern, risk, reason };
  });
  return { version: 1, default: fallback, rules };
}

/** `*` within one segment, by dynamic programming: no backtracking. */
function matchSegment(pattern: string, name: string): boolean {
  // row[j]: the pattern read so far matches the first j characters of name.
  let row = Array.from({ length: name.length + 1 }, (_, j) => j === 0);
  for (const char of pattern) {
    const next = Array.from({ length: name.length + 1 }, () => false);
    for (let j = 0; j <= name.length; j += 1) {
      if (char === "*") next[j] = row[j] === true || (j > 0 && next[j - 1] === true);
      else next[j] = j > 0 && row[j - 1] === true && name[j - 1] === char;
    }
    row = next;
  }
  return row[name.length] === true;
}

/**
 * Glob over path segments, by dynamic programming (polynomial for any table):
 * `**` is any number of segments, at least one when it ends the pattern (as
 * the ported `.*` after a slash), and `*` stays within one segment.
 */
function matchGlob(pattern: readonly string[], path: readonly string[]): boolean {
  // after[j]: the pattern from the next segment on matches path[j..].
  let after = Array.from({ length: path.length + 1 }, (_, j) => j === path.length);
  for (let i = pattern.length - 1; i >= 0; i -= 1) {
    const segment = pattern[i] ?? "";
    const here = Array.from({ length: path.length + 1 }, () => false);
    for (let j = path.length; j >= 0; j -= 1) {
      if (segment === "**" && i === pattern.length - 1) here[j] = j < path.length;
      else if (segment === "**") here[j] = after[j] === true || here[j + 1] === true;
      else
        here[j] = j < path.length && after[j + 1] === true && matchSegment(segment, path[j] ?? "");
    }
    after = here;
  }
  return after[0] === true;
}

// Letter case of ASCII only: no non-ASCII letter folds onto an ASCII rule.
const foldAscii = (text: string): string => text.replace(/[A-Z]/g, (c) => c.toLowerCase());

/**
 * Floor of the changed paths. Each path gets the higher of two readings, exact
 * and ignoring ASCII letter case, so a case variant can neither escape a
 * higher rule nor gain a lower one. Paths must be canonical repository paths
 * as GitHub lists them; anything else throws.
 */
export function minimumRisk(table: RiskTable, paths: readonly string[]): Risk {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error("risk floor: no paths");
  const base = RISK_RANK.get(table.default) ?? 2;
  const readings = [(text: string) => text, foldAscii].map((read) => ({
    read,
    rules: table.rules.map((rule) => ({
      rank: RISK_RANK.get(rule.risk) ?? 2,
      segments: read(rule.pattern).split("/"),
    })),
  }));
  let floor = 0;
  for (const path of paths) {
    const bad = typeof path !== "string" || path.includes("\\") || CONTROL_RE.test(path);
    if (bad || !canonicalSegments(path))
      throw new Error(`risk floor: bad path ${JSON.stringify(path)}`);
    for (const { read, rules } of readings) {
      const segments = read(path).split("/");
      // A loop, not a spread: any number of matching rules is a valid table.
      let matched = false;
      for (const rule of rules) {
        if (!matchGlob(rule.segments, segments)) continue;
        matched = true;
        floor = Math.max(floor, rule.rank);
      }
      if (!matched) floor = Math.max(floor, base);
    }
  }
  return RISKS[floor] ?? "critical";
}

// Risk floor by path (S-0.10-a, DAN-1004): the lowest Risk a PR may declare,
// from the changed paths and the repository's own .github/risk-paths.json,
// whose format is scripts/new-repo/templates/common/risk-paths.json. The
// highest matching rule wins; a path no rule matches gets the table default.
// globToRegExp is ported from ductura/server scripts/engineering/risk-floor.ts
// (DAN-722, 351b158). Rules: Ductus docs/ENGINEERING_SYSTEM.md §5.
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
  // `**` only as a whole segment: `docs**` would cross a slash. At most two
  // `**`, never adjacent, and two `*` per segment bound the regex backtracking.
  const segments = value.split("/");
  const globstars = segments.filter((segment) => segment === "**").length;
  if (segments.some((segment) => segment.includes("**") && segment !== "**"))
    tableError(`** must be a whole segment in ${value}`);
  if (globstars > 2 || value.includes("**/**"))
    tableError(`too many ** in ${value}`);
  if (segments.some((segment) => segment !== "**" && segment.split("*").length > 3))
    tableError(`too many * in ${value}`);
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

/** Glob to RegExp: `**` is any number of segments, `*` stays within one. */
function globToRegExp(glob: string, flags: string): RegExp {
  let source = "";
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob.charAt(i);
    if (glob.startsWith("**/", i)) {
      source += "(?:.*/)?";
      i += 2;
    } else if (glob.startsWith("**", i)) {
      source += ".*";
      i += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  // "s": U+2028 and U+2029 are no control characters, and `.*` must not stop at them.
  return new RegExp(`^${source}$`, flags);
}

/**
 * Floor of the changed paths. A rule above the default matches in any letter
 * case (ASCII only, flag `i` without `u`), a rule at or below it only exactly,
 * so letter case never lowers the floor. Paths must be canonical repository
 * paths as GitHub lists them; anything else throws.
 */
export function minimumRisk(table: RiskTable, paths: readonly string[]): Risk {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error("risk floor: no paths");
  const base = RISK_RANK.get(table.default) ?? 2;
  const rules = table.rules.map((rule) => {
    const rank = RISK_RANK.get(rule.risk) ?? 2;
    return { rank, re: globToRegExp(rule.pattern, rank > base ? "si" : "s") };
  });
  let floor = 0;
  for (const path of paths) {
    const bad = typeof path !== "string" || path.includes("\\") || CONTROL_RE.test(path);
    if (bad || !canonicalSegments(path))
      throw new Error(`risk floor: bad path ${JSON.stringify(path)}`);
    const matched = rules.filter((rule) => rule.re.test(path)).map((rule) => rule.rank);
    floor = Math.max(floor, matched.length > 0 ? Math.max(...matched) : base);
  }
  return RISKS[floor] ?? "critical";
}

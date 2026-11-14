// Verdict check of the engineering gate (S-0.10-b, DAN-723): independent review
// and QA on the exact PR head, by risk. TypeScript port of the core of Ductus
// scripts/engineering/review-gate-core.mjs (evaluateGateCore, latestVerdicts)
// and metadata-parser.mjs. Rules: Ductus docs/ENGINEERING_SYSTEM.md §5 and §6.
// Not ported (the gate is stricter without them, never looser): D-101 carry of
// a verdict through a clean base merge, quota fallback, the D-139 second
// session, the D-189 exemptions and the QA exemption for tests or docs only.

export type Risk = "low" | "standard" | "critical";
export type GateState = "success" | "pending" | "failure";
export type GateResult = { state: GateState; description: string };

/** A pull-request issue comment as the REST API returns it (fields used here). */
export type Comment = {
  body?: string | null;
  user?: { login?: string; type?: string } | null;
  performed_via_github_app?: { slug?: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type GateInput = {
  body: string;
  headSha: string;
  ownerLogin: string;
  /** Floor of the changed paths, computed by the calling repository. */
  minimumRisk: string;
  comments: readonly Comment[];
  /** Logins besides the owner whose comments may carry a verdict. */
  trustedLogins?: readonly string[];
};

const RISK_RANK = new Map<string, number>([
  ["low", 0],
  ["standard", 1],
  ["critical", 2],
]);
const AGENT_RE =
  /^(claude|codex|chatgpt|grok):[A-Za-z0-9_-]+:(orchestrator|platforma|backend|frontend|reviewer|qa|bug-hunter|product-ux|short)$/;
const SHA_RE = /^[0-9a-f]{40}$/i;

// The GitHub App a verdict is posted through, and the runtimes it may declare.
export const APP_RUNTIMES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["claude", new Set(["claude"])],
  ["chatgpt-codex-connector", new Set(["chatgpt", "codex"])],
  ["grok-by-xai", new Set(["grok"])],
]);
const CODEX_APP = "chatgpt-codex-connector";

// D-162, D-193: the owner's account without an App counts as the App of the
// CLI it names; a comment naming both channels counts as neither.
const CLI_CHANNELS = new Map([
  ["grok-cli", "grok-by-xai"],
  ["codex-cli", CODEX_APP],
]);
const CLI_LINE_RE = /^Review-Channel:[ \t]*(grok-cli|codex-cli)$/i;

// F-027: a FAIL or BLOCK (or BLOK) in any form on a verdict line blocks; only
// the exact PASS passes. Markdown, list markers and task boxes around the name.
const NEGATIVE_WORD_RE = /(?<![A-Z0-9])(FAIL|BLOC?K)[A-Z]*(?![A-Z0-9])/;
const verdictLineRe = (name: string): RegExp =>
  new RegExp(`^(?:[\\s*_\`>~+#-]|\\d{1,9}\\\\?[.)]|\\\\?\\[[\\sxX]*\\\\?\\])*${name}[\\s*_\`>~+#-]*:(.*)$`, "i");

type Spec = { agent: string; head: string; verdict: string; role: string; extra?: string };
const REVIEW: Spec = { agent: "Agent-Review", head: "Review-Head", verdict: "Review-Verdict", role: "reviewer" };
const QA: Spec = { agent: "QA-Agent", head: "QA-Head", verdict: "QA-Verdict", role: "qa", extra: "QA-Scope" };

type Entry = { body: string; login: string; appSlug: string | null; edited: boolean; order: [number, number] };
type Verdict = {
  verdict: "PASS" | "FAIL" | "BLOCK" | "EDITED";
  appSlug: string;
  principal: string;
  order: [number, number];
};

/** Body lines outside fenced and indented code blocks (CommonMark). */
export function metadataLines(body: string): string[] {
  const active: string[] = [];
  let fence: { char: string; length: number } | null = null;
  for (const line of body.split(/\r?\n/)) {
    if (fence) {
      const close = /^ {0,3}(`+|~+)\s*$/.exec(line)?.[1];
      if (close && close[0] === fence.char && close.length >= fence.length) fence = null;
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (open) {
      fence = { char: open[0] ?? "`", length: open.length };
      continue;
    }
    if (/^(?: {4}|\t)/.test(line)) continue;
    active.push(line.trim());
  }
  return active;
}

export function field(body: string, name: string): string | null {
  const prefix = `${name.toLowerCase()}:`;
  for (const line of metadataLines(body)) {
    if (line.toLowerCase().startsWith(prefix)) return line.slice(prefix.length).trim() || null;
  }
  return null;
}

/** A verdict block opens the comment: its first non-empty line is `<name>:`. */
function canonicalBlock(body: string, name: string): boolean {
  const first = metadataLines(body).find(Boolean) ?? "";
  return first.toLowerCase().startsWith(`${name.toLowerCase()}:`);
}

/** One principal per runtime family and slot, whatever the letter case (#130). */
function principalOf(agent: string | null): string | null {
  if (!agent || !AGENT_RE.test(agent)) return null;
  const [runtime = "", slot = ""] = agent.split(":");
  const family = runtime === "codex" || runtime === "chatgpt" ? "openai" : runtime;
  return `${family}:${slot.toLowerCase()}`;
}

function sameHead(value: string | null, headSha: string): boolean {
  return Boolean(value && SHA_RE.test(value) && value.toLowerCase() === headSha.toLowerCase());
}

function time(value: string | undefined): number {
  return Date.parse(value ?? "");
}

function cliApp(comment: Comment, body: string, ownerLogin: string): string | null {
  if (comment.performed_via_github_app?.slug || comment.user?.login !== ownerLogin) return null;
  if (!canonicalBlock(body, REVIEW.agent) && !canonicalBlock(body, QA.agent)) return null;
  const named = new Set(
    metadataLines(body).flatMap((line) => {
      const channel = CLI_LINE_RE.exec(line)?.[1];
      return channel ? [channel.toLowerCase()] : [];
    }),
  );
  return named.size === 1 ? (CLI_CHANNELS.get([...named][0] ?? "") ?? null) : null;
}

/** Comments of the owner or a listed login, never of a bot account. */
function trustedEntries(comments: readonly Comment[], ownerLogin: string, logins: readonly string[]): Entry[] {
  const allowed = new Set([ownerLogin, ...logins]);
  const entries: Entry[] = [];
  comments.forEach((comment, index) => {
    const login = comment.user?.login;
    const body = comment.body ?? "";
    if (comment.user?.type === "Bot" || !login || !allowed.has(login) || !body) return;
    const created = time(comment.created_at);
    const updated = time(comment.updated_at);
    // F-012: an edited comment never gives a PASS; it fails closed on an unreadable time.
    const edited = !Number.isNaN(updated) && (Number.isNaN(created) || updated > created);
    const at = Number.isNaN(updated) ? created : Number.isNaN(created) ? updated : Math.max(created, updated);
    entries.push({
      body,
      login,
      appSlug: comment.performed_via_github_app?.slug ?? cliApp(comment, body, ownerLogin),
      edited,
      order: [Number.isNaN(at) ? 0 : at, index],
    });
  });
  return entries;
}

function later(a: [number, number], b: [number, number]): boolean {
  return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
}

function negativeWord(body: string, name: string): "FAIL" | "BLOCK" | null {
  const line = verdictLineRe(name);
  for (const text of metadataLines(body)) {
    const word = NEGATIVE_WORD_RE.exec(line.exec(text)?.[1]?.toUpperCase() ?? "")?.[1];
    if (word) return word === "FAIL" ? "FAIL" : "BLOCK";
  }
  return null;
}

/** A negative names the current head unless it readably names another one. */
function negativeOnHead(value: string | null, headSha: string): boolean {
  const named = (value ?? "").replace(/^[\s*_`]+|[\s*_`.,;]+$/g, "").toLowerCase();
  return !/^[0-9a-f]{7,40}$/.test(named) || headSha.toLowerCase().startsWith(named);
}

/** The prevailing verdict of each principal on the exact head. */
export function latestVerdicts(entries: readonly Entry[], spec: Spec, headSha: string): Verdict[] {
  const latest = new Map<string, Verdict>();
  const negatives = new Map<string, Verdict>();
  for (const entry of entries) {
    if (!canonicalBlock(entry.body, spec.agent)) continue;
    const agent = field(entry.body, spec.agent);
    const principal = principalOf(agent);
    const runtime = agent?.split(":")[0] ?? "";
    if (!principal || !agent?.endsWith(`:${spec.role}`)) continue;
    if (!entry.appSlug || !APP_RUNTIMES.get(entry.appSlug)?.has(runtime)) continue;

    const head = field(entry.body, spec.head);
    const negative = negativeWord(entry.body, spec.verdict);
    if (negative ? !negativeOnHead(head, headSha) : !sameHead(head, headSha)) continue;
    const pass =
      !negative &&
      field(entry.body, spec.verdict)?.toUpperCase() === "PASS" &&
      !(spec.extra && !field(entry.body, spec.extra));
    if (!negative && !pass && !entry.edited) continue;

    const key = `${entry.appSlug}|${principal}`;
    const candidate: Verdict = {
      verdict: negative ?? (entry.edited ? "EDITED" : "PASS"),
      appSlug: entry.appSlug,
      principal,
      order: entry.order,
    };
    const held = latest.get(key);
    if (!held || later(candidate.order, held.order)) latest.set(key, candidate);
    const heldNegative = negatives.get(key);
    if (negative && (!heldNegative || later(candidate.order, heldNegative.order))) negatives.set(key, candidate);
  }
  // F-023: a FAIL or BLOCK on a head is not cleared by the principal's later
  // PASS on that head; only a new head or the owner's override moves past it.
  return [...latest].map(([key, verdict]) => negatives.get(key) ?? verdict);
}

function overrideOnHead(entries: readonly Entry[], headSha: string, ownerLogin: string): boolean {
  return entries.some(
    (entry) =>
      entry.appSlug === null &&
      entry.login === ownerLogin &&
      canonicalBlock(entry.body, "Owner-Override") &&
      field(entry.body, "Owner-Override")?.toUpperCase() === "PASS" &&
      sameHead(field(entry.body, "Override-Head"), headSha) &&
      Boolean(field(entry.body, "Override-Reason")),
  );
}

const pending = (description: string): GateResult => ({ state: "pending", description });
const failure = (description: string): GateResult => ({ state: "failure", description });

/** Gate result for one PR head. Only the description reaches the commit status. */
export function evaluateVerdicts(input: GateInput): GateResult {
  const { body, headSha, ownerLogin, minimumRisk, comments } = input;
  const authorPrincipal = principalOf(field(body, "Agent"));
  const declared = field(body, "Risk")?.toLowerCase() ?? "";
  if (!authorPrincipal) return failure("Missing or invalid Agent metadata.");
  if (!RISK_RANK.has(declared)) return failure("Risk must be low, standard, or critical.");
  if (!field(body, "Task")) return failure("Missing Task metadata.");
  if (!SHA_RE.test(headSha)) return failure("Invalid PR head SHA.");
  if (!ownerLogin) return failure("Missing repository owner identity.");
  if (!RISK_RANK.has(minimumRisk)) return failure("Invalid minimum risk from the calling repository.");
  if ((RISK_RANK.get(declared) ?? 0) < (RISK_RANK.get(minimumRisk) ?? 2)) {
    return failure(`Risk ${declared} is below the path floor ${minimumRisk}.`);
  }
  const risk = declared as Risk;

  const entries = trustedEntries(comments, ownerLogin, input.trustedLogins ?? []);
  if (overrideOnHead(entries, headSha, ownerLogin)) {
    return { state: "success", description: `Owner override recorded for ${risk} risk.` };
  }

  // The body is written by the party under review, so the declared author
  // only ever discounts a PASS, never a FAIL or BLOCK.
  const reviews = latestVerdicts(entries, REVIEW, headSha);
  const qa = latestVerdicts(entries, QA, headSha);
  for (const [name, verdicts] of [
    ["review", reviews],
    ["QA", qa],
  ] as const) {
    const negative = verdicts.find((v) => v.verdict === "FAIL" || v.verdict === "BLOCK");
    if (negative) return pending(`Independent ${name} ${negative.verdict.toLowerCase()} on current head.`);
  }

  const independentPass = (v: Verdict) => v.verdict === "PASS" && v.principal !== authorPrincipal;
  const passingReviews = reviews.filter(independentPass);
  if (passingReviews.length === 0) return pending("Waiting for independently authenticated review.");
  if (risk !== "critical") {
    return { state: "success", description: "Independently authenticated review is valid for current head." };
  }

  // Critical: a QA PASS through another App than every passing review, or
  // the independent Codex pair on the exact head (D-158).
  const reviewApps = new Set(passingReviews.map((v) => v.appSlug));
  const reviewPrincipals = new Set(passingReviews.map((v) => v.principal));
  const qaPasses = qa.filter(independentPass);
  if (qaPasses.some((v) => !reviewApps.has(v.appSlug))) {
    return { state: "success", description: "Independently authenticated review and QA are valid for current head." };
  }
  const codexPair =
    reviewApps.has(CODEX_APP) && qaPasses.some((v) => v.appSlug === CODEX_APP && !reviewPrincipals.has(v.principal));
  if (codexPair)
    return { state: "success", description: "Independent Codex review and QA pair valid on exact current head." };
  return pending("Critical PR: waiting for separately authenticated QA PASS.");
}

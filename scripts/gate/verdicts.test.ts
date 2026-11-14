// Verdict check of the engineering gate (S-0.10-b). Cases ported from Ductus
// review-gate-verdict, review-gate-malformed and review-gate tests, with the
// same assertions. All identities and logins are invented.
import assert from "node:assert/strict";
import test from "node:test";
import { type Comment, evaluateVerdicts, field, type GateInput } from "./verdicts.ts";

const head = "a".repeat(40);
const older = "b".repeat(40);
const ownerLogin = "owner-x";
const APPS: Record<string, string> = {
  claude: "claude",
  chatgpt: "chatgpt-codex-connector",
  codex: "chatgpt-codex-connector",
  grok: "grok-by-xai",
};

const prBody = (risk = "standard", agent = "claude:w1:platforma") =>
  `Sažetak.\n\nAgent: ${agent}\nRisk: ${risk}\nTask: DAN-1\n`;

let counter = 0;
type Meta = { login?: string; type?: string; appSlug?: string | null; edited?: boolean };
const comment = (
  body: string,
  { login = ownerLogin, type = "User", appSlug = null, edited = false }: Meta = {},
): Comment => {
  const created = 1_750_000_000_000 + counter++ * 1000;
  return {
    body,
    user: { login, type },
    performed_via_github_app: appSlug ? { slug: appSlug } : null,
    created_at: new Date(created).toISOString(),
    updated_at: new Date(created + (edited ? 500 : 0)).toISOString(),
  };
};
const appFor = (agent: string) => APPS[agent.split(":")[0] ?? ""] ?? null;
const review = (agent: string, verdict: string, { sha = head, ...meta }: Meta & { sha?: string } = {}) =>
  comment(`Agent-Review: ${agent}:reviewer\nReview-Head: ${sha}\nReview-Verdict: ${verdict}\n`, {
    appSlug: appFor(agent),
    ...meta,
  });
const qa = (
  agent: string,
  verdict: string,
  { sha = head, scope = "negativni putovi", ...meta }: Meta & { sha?: string; scope?: string } = {},
) =>
  comment(`QA-Agent: ${agent}:qa\nQA-Head: ${sha}\nQA-Verdict: ${verdict}\n${scope ? `QA-Scope: ${scope}\n` : ""}`, {
    appSlug: appFor(agent),
    ...meta,
  });

const gate = (body: string, comments: Comment[], extra: Partial<GateInput> = {}) =>
  evaluateVerdicts({ body, headSha: head, ownerLogin, minimumRisk: "low", comments, ...extra });
const state = (body: string, comments: Comment[], extra: Partial<GateInput> = {}) => gate(body, comments, extra).state;

test("metadata: invalid Agent, Risk, Task, head or floor fails", () => {
  assert.equal(state("Risk: low\nTask: T", []), "failure");
  assert.equal(state("Agent: someone\nRisk: low\nTask: T", []), "failure");
  assert.equal(state(prBody("high"), []), "failure");
  assert.equal(state("Agent: claude:w1:backend\nRisk: low\n", []), "failure");
  assert.equal(state(prBody(), [], { headSha: "abc" }), "failure");
  assert.equal(state(prBody(), [], { ownerLogin: "" }), "failure");
  assert.equal(state(prBody(), [], { minimumRisk: "" }), "failure");
  // Metadata inside a code block does not count.
  assert.equal(state("```\nAgent: claude:w1:backend\nRisk: low\nTask: T\n```\n", []), "failure");
  assert.equal(field("    Risk: low\nRisk: critical", "Risk"), "critical");
});

test("risk below the path floor fails, at or above it is evaluated", () => {
  const result = gate(prBody("standard"), [review("codex:r1", "PASS")], { minimumRisk: "critical" });
  assert.equal(result.state, "failure");
  assert.match(result.description, /below the path floor critical/);
  assert.equal(state(prBody("critical"), [], { minimumRisk: "standard" }), "pending");
});

test("standard: an independent review PASS on the exact head passes", () => {
  assert.equal(state(prBody(), []), "pending");
  assert.equal(state(prBody(), [review("codex:r1", "PASS")]), "success");
  assert.equal(state(prBody(), [review("claude:r2", "PASS")]), "success");
  assert.equal(state(prBody(), [review("codex:r1", "PASS", { sha: older })]), "pending");
  assert.equal(state(prBody(), [review("codex:r1", "PASS", { sha: head.slice(0, 7) })]), "pending");
  // The verdict must be the exact word.
  assert.equal(state(prBody(), [review("codex:r1", "PASSED")]), "pending");
});

test("low risk still needs a review in this step (no D-189 exemption)", () => {
  assert.equal(state(prBody("low"), []), "pending");
  assert.equal(state(prBody("low"), [review("grok:r1", "PASS")]), "success");
});

test("the author never reviews themselves, whatever the letter case", () => {
  assert.equal(state(prBody(), [review("claude:w1", "PASS")]), "pending");
  assert.equal(state(prBody(), [review("claude:W1", "PASS")]), "pending");
  // codex and chatgpt are one principal family.
  assert.equal(state(prBody("standard", "codex:x1:backend"), [review("chatgpt:x1", "PASS")]), "pending");
});

test("a verdict counts only through the App of its runtime or the owner's CLI channel", () => {
  assert.equal(state(prBody(), [review("codex:r1", "PASS", { appSlug: "claude" })]), "pending");
  assert.equal(state(prBody(), [review("codex:r1", "PASS", { appSlug: null })]), "pending");
  const cli = (channels: string) =>
    comment(`Agent-Review: codex:r1:reviewer\nReview-Head: ${head}\nReview-Verdict: PASS\n${channels}`);
  assert.equal(state(prBody(), [cli("Review-Channel: codex-cli\n")]), "success");
  assert.equal(state(prBody(), [cli("Review-Channel: grok-cli\n")]), "pending");
  assert.equal(state(prBody(), [cli("Review-Channel: codex-cli\nReview-Channel: grok-cli\n")]), "pending");
  assert.equal(state(prBody(), [cli("```\nReview-Channel: codex-cli\n```\n")]), "pending");
});

test("only the owner or a listed login may post a verdict, never a bot", () => {
  assert.equal(state(prBody(), [review("codex:r1", "PASS", { login: "member-y" })]), "pending");
  assert.equal(
    state(prBody(), [review("codex:r1", "PASS", { login: "member-y" })], { trustedLogins: ["member-y"] }),
    "success",
  );
  assert.equal(state(prBody(), [review("codex:r1", "PASS", { type: "Bot" })]), "pending");
});

test("the verdict block must open the comment", () => {
  const late = comment(`Uvod.\nAgent-Review: codex:r1:reviewer\nReview-Head: ${head}\nReview-Verdict: PASS\n`, {
    appSlug: "chatgpt-codex-connector",
  });
  assert.equal(state(prBody(), [late]), "pending");
  assert.equal(
    state(prBody(), [
      comment(`Agent-Review: codex:r1:qa\nReview-Head: ${head}\nReview-Verdict: PASS\n`, {
        appSlug: "chatgpt-codex-connector",
      }),
    ]),
    "pending",
  );
});

test("F-012: an edited PASS never passes, an edited FAIL still blocks", () => {
  assert.equal(state(prBody(), [review("codex:r1", "PASS", { edited: true })]), "pending");
  const blocked = gate(prBody(), [review("codex:r1", "FAIL", { edited: true }), review("grok:r2", "PASS")]);
  assert.equal(blocked.state, "pending");
  assert.match(blocked.description, /review fail/);
  // An edit holds the principal's slot, so its earlier PASS does not come back.
  assert.equal(state(prBody(), [review("codex:r1", "PASS"), review("codex:r1", "PASS", { edited: true })]), "pending");
});

test("F-027: FAIL or BLOCK in any form holds the gate next to another PASS", () => {
  const negatives = ["FAIL", "BLOCK", "blok", "**FAIL**", "FAILED", "_BLOCKED_"];
  for (const verdict of negatives) {
    const result = gate(prBody(), [review("claude:r1", verdict), review("codex:r2", "PASS")]);
    assert.equal(result.state, "pending", verdict);
  }
  const decorated = comment(`Agent-Review: claude:r1:reviewer\nReview-Head: ${head}\n- **Review-Verdict**: FAIL\n`, {
    appSlug: "claude",
  });
  assert.equal(state(prBody(), [decorated, review("codex:r2", "PASS")]), "pending");
  // A negative with an unreadable head holds the current head; another head does not.
  assert.equal(
    state(prBody(), [review("claude:r1", "FAIL", { sha: "trenutni" }), review("codex:r2", "PASS")]),
    "pending",
  );
  assert.equal(
    state(prBody(), [review("claude:r1", "FAIL", { sha: head.slice(0, 7) }), review("codex:r2", "PASS")]),
    "pending",
  );
  assert.equal(state(prBody(), [review("claude:r1", "FAIL", { sha: older }), review("codex:r2", "PASS")]), "success");
});

test("a negative holds whatever author the body declares", () => {
  for (const verdict of ["FAIL", "BLOCK"]) {
    const result = gate(prBody("standard", "claude:r1:backend"), [
      review("claude:r1", verdict),
      review("codex:r2", "PASS"),
    ]);
    assert.equal(result.state, "pending");
  }
});

test("F-023: a later PASS of the same principal on the same head does not clear its FAIL", () => {
  assert.equal(state(prBody(), [review("codex:r1", "FAIL"), review("codex:r1", "PASS")]), "pending");
  assert.equal(state(prBody(), [review("codex:r1", "FAIL", { sha: older }), review("codex:r1", "PASS")]), "success");
});

test("critical: needs a QA PASS with QA-Scope from another App than the review", () => {
  const body = prBody("critical");
  assert.equal(state(body, [review("codex:r1", "PASS")]), "pending");
  assert.equal(state(body, [review("codex:r1", "PASS"), qa("claude:q1", "PASS")]), "success");
  assert.equal(state(body, [review("codex:r1", "PASS"), qa("grok:q1", "PASS")]), "success");
  assert.equal(state(body, [review("claude:r1", "PASS"), qa("claude:q1", "PASS")]), "pending");
  assert.equal(state(body, [review("codex:r1", "PASS"), qa("claude:q1", "PASS", { scope: "" })]), "pending");
  assert.equal(state(body, [review("codex:r1", "PASS"), qa("claude:q1", "PASS", { sha: older })]), "pending");
  assert.equal(state(body, [qa("claude:q1", "PASS")]), "pending");
  // The author's own QA does not count.
  assert.equal(state(body, [review("codex:r1", "PASS"), qa("claude:w1", "PASS")]), "pending");
});

test("critical: a QA FAIL blocks even from the reviewer's App", () => {
  const result = gate(prBody("critical"), [review("codex:r1", "PASS"), qa("grok:q1", "PASS"), qa("codex:q2", "FAIL")]);
  assert.equal(result.state, "pending");
  assert.match(result.description, /QA fail/);
});

test("critical: the independent Codex pair passes, one principal for both does not (D-158)", () => {
  const body = prBody("critical");
  assert.equal(state(body, [review("codex:r1", "PASS"), qa("codex:q1", "PASS")]), "success");
  assert.equal(state(body, [review("codex:r1", "PASS"), qa("chatgpt:r1", "PASS")]), "pending");
});

test("owner override counts only for the exact head, from the owner, with a reason", () => {
  const override = (sha: string, reason = "Override-Reason: hitno", meta: Meta = {}) =>
    comment(`Owner-Override: PASS\nOverride-Head: ${sha}\n${reason}\n`, meta);
  assert.equal(state(prBody("critical"), [override(head)]), "success");
  assert.equal(state(prBody("critical"), [override(older)]), "pending");
  assert.equal(state(prBody("critical"), [override(head, "")]), "pending");
  assert.equal(
    state(prBody("critical"), [override(head, undefined, { login: "member-y" })], { trustedLogins: ["member-y"] }),
    "pending",
  );
  assert.equal(state(prBody("critical"), [override(head, undefined, { appSlug: "claude" })]), "pending");
});

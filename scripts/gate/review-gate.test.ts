// Runner of the verdict check against a fake REST API. Invented identities only.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FOREIGN_HEAD, prNumberFromEvent, run, SHARED_HEAD, STATUS_CONTEXT } from "./review-gate.ts";

const head = "c".repeat(40);
const repo = "example-org/example";

function setup(
  event: unknown,
  pr: Record<string, unknown>,
  pages: unknown[][] = [[]],
  failComments = false,
  // The open PRs of each successive read of the open list; the last repeats.
  openLists: unknown[][] = [[pr]],
) {
  let openReads = 0;
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  const eventPath = join(dir, "event.json");
  writeFileSync(eventPath, JSON.stringify(event));
  const calls: { url: string; method: string; body: unknown }[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : null });
    const path = url.replace("https://api.example.test", "");
    let payload: unknown = null;
    if (path === `/repos/${repo}/pulls/7`) payload = pr;
    if (path === `/repos/${repo}/pulls?state=open&per_page=100&page=1`) {
      payload = openLists[Math.min(openReads, openLists.length - 1)] ?? [];
      openReads += 1;
    }
    const page = /\/issues\/7\/comments\?per_page=100&page=(\d+)$/.exec(path)?.[1];
    if (page) {
      if (failComments) return new Response("boom", { status: 502 });
      payload = pages[Number(page) - 1] ?? [];
    }
    if (path.startsWith(`/repos/${repo}/statuses/`)) return new Response(null, { status: 201 });
    return payload === null ? new Response("not found", { status: 404 }) : Response.json(payload);
  };
  const env = {
    GITHUB_REPOSITORY: repo,
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_API_URL: "https://api.example.test",
    GITHUB_TOKEN: "test-token",
    GATE_OWNER_LOGIN: "owner-x",
    GATE_MINIMUM_RISK: "standard",
    GATE_FLOOR_SHA: head,
  };
  return { calls, env, fetchImpl };
}

const openPr = (body = "Agent: claude:w1:platforma\nRisk: standard\nTask: DAN-1\n") => ({
  number: 7,
  state: "open",
  body,
  head: { sha: head, repo: { full_name: repo } },
  base: { repo: { full_name: repo } },
});
const passReview = {
  body: `Agent-Review: codex:r1:reviewer\nReview-Head: ${head}\nReview-Verdict: PASS\n`,
  user: { login: "owner-x", type: "User" },
  performed_via_github_app: { slug: "chatgpt-codex-connector" },
  created_at: "2026-11-14T10:00:00Z",
  updated_at: "2026-11-14T10:00:00Z",
};

test("event number: pull request and PR comment only", () => {
  assert.equal(prNumberFromEvent({ pull_request: { number: 7 } }), 7);
  assert.equal(prNumberFromEvent({ issue: { number: 7, pull_request: {} } }), 7);
  assert.equal(prNumberFromEvent({ issue: { number: 7 } }), null);
  assert.equal(prNumberFromEvent({ pull_request: { number: "7" } }), null);
});

test("writes the result as the gate status on the PR head, reading every comment page", async () => {
  const filler = Array.from({ length: 100 }, () => ({ body: "komentar", user: { login: "someone" } }));
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [filler, [passReview]]);
  const result = await run(env, fetchImpl);
  assert.equal(result?.state, "success");
  const status = calls.filter((call) => call.method === "POST").at(-1);
  assert.equal(status?.url, `https://api.example.test/repos/${repo}/statuses/${head}`);
  assert.equal(status?.method, "POST");
  assert.deepEqual(status?.body, { state: "success", context: STATUS_CONTEXT, description: result?.description });
  assert.equal(calls.filter((call) => call.url.includes("/comments")).length, 2);
});

test("the path floor from the caller holds a lower declared risk", async () => {
  const { env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]]);
  const result = await run({ ...env, GATE_MINIMUM_RISK: "critical" }, fetchImpl);
  assert.equal(result?.state, "failure");
});

test("no status for a closed PR; a head from another repository gets only pending", async () => {
  for (const pr of [{ ...openPr(), state: "closed" }]) {
    const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, pr);
    assert.equal(await run(env, fetchImpl), null);
    assert.equal(
      calls.some((call) => call.method === "POST"),
      false,
    );
  }
  const fork = { ...openPr(), head: { sha: head, repo: { full_name: "fork/example" } } };
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, fork);
  assert.deepEqual(await run(env, fetchImpl), FOREIGN_HEAD);
  assert.ok(posts(calls).length > 0 && posts(calls).every((body) => body.state === "pending"));
});

test("a fork PR on the head of a green PR here takes the green back, without reading verdicts", async () => {
  const fork = { ...openPr(), number: 8, head: { sha: head, repo: { full_name: "fork/example" } } };
  const ours = openPr();
  // The fake API serves the fork PR (number 8) at the event's path.
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, fork, [[passReview]], false, [[ours, fork]]);
  assert.deepEqual(await run(env, fetchImpl), SHARED_HEAD);
  assert.deepEqual(
    posts(calls).map((body) => body.description),
    [FOREIGN_HEAD.description, SHARED_HEAD.description],
  );
  assert.equal(
    calls.some((call) => call.url.includes("/comments")),
    false,
  );
});

test("a failed run marks the head pending and fails the job", async () => {
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[]], true);
  await assert.rejects(run(env, fetchImpl), /502/);
  assert.equal((calls.at(-1)?.body as { state?: string } | null)?.state, "pending");
});

test("an event without a PR writes nothing", async () => {
  const { calls, env, fetchImpl } = setup({ issue: { number: 7 } }, openPr());
  assert.equal(await run(env, fetchImpl), null);
  assert.equal(calls.length, 0);
});

const posts = (calls: { method: string; body: unknown }[]) =>
  calls.filter((call) => call.method === "POST").map((call) => call.body as { state: string; description: string });

test("marks the head pending before reading any comment, so a killed run never leaves an older green", async () => {
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]]);
  await run(env, fetchImpl);
  const firstPost = calls.findIndex((call) => call.method === "POST");
  const firstComments = calls.findIndex((call) => call.url.includes("/comments"));
  assert.ok(firstPost >= 0 && firstPost < firstComments);
  assert.deepEqual(
    posts(calls).map((body) => body.state),
    ["pending", "success"],
  );
});

test("no green while another open PR shares the head", async () => {
  const other = { ...openPr(), number: 8 };
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]], false, [
    [openPr(), other],
  ]);
  assert.deepEqual(await run(env, fetchImpl), SHARED_HEAD);
  assert.deepEqual(
    posts(calls).map((body) => body.state),
    ["pending", "pending"],
  );
  assert.equal(posts(calls).at(-1)?.description, SHARED_HEAD.description);
});

test("a PR opened on the head during the evaluation: the check right before the green writes none", async () => {
  const other = { ...openPr(), number: 8 };
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]], false, [
    [openPr()],
    [openPr(), other],
  ]);
  assert.deepEqual(await run(env, fetchImpl), SHARED_HEAD);
  assert.deepEqual(
    posts(calls).map((body) => body.state),
    ["pending", "pending"],
  );
});

test("a PR opened between the green and the check after it takes the green back (known window)", async () => {
  const other = { ...openPr(), number: 8 };
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]], false, [
    [openPr()],
    [openPr()],
    [openPr(), other],
  ]);
  assert.deepEqual(await run(env, fetchImpl), SHARED_HEAD);
  assert.deepEqual(
    posts(calls).map((body) => body.state),
    ["pending", "success", "pending"],
  );
});

test("a floor computed for another head gives only pending, before any comment is read", async () => {
  for (const floor of ["d".repeat(40), "", undefined]) {
    const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]]);
    const result = await run({ ...env, GATE_FLOOR_SHA: floor }, fetchImpl);
    assert.equal(result?.state, "pending", String(floor));
    assert.ok(posts(calls).every((body) => body.state === "pending"));
    assert.equal(
      calls.some((call) => call.url.includes("/comments")),
      false,
    );
  }
  // Letter case of the SHA does not matter.
  const { env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]]);
  assert.equal((await run({ ...env, GATE_FLOOR_SHA: head.toUpperCase() }, fetchImpl))?.state, "success");
});

test("an unreadable open-PR list leaves the head pending", async () => {
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]], false, [
    ["not a pull request list"],
  ]);
  const result = await run(env, fetchImpl).catch(() => null);
  assert.notEqual(result?.state, "success");
  assert.ok(posts(calls).every((body) => body.state === "pending"));
});

// Fork path (third round on ductura/.github#12): pending first, never success.
const forkPr = () => ({ ...openPr(), number: 8, head: { sha: head, repo: { full_name: "fork/example" } } });
const statusPosts = (calls: { url: string; method: string; body: unknown }[]) =>
  calls.filter((call) => call.method === "POST" && call.url.endsWith(`/statuses/${head}`));

test("fork on the SHA of a green PR here: pending before any other read, the SHA ends pending", async () => {
  // The PR here gets its green first.
  const green = setup({ pull_request: { number: 7 } }, openPr(), [[passReview]]);
  assert.equal((await run(green.env, green.fetchImpl))?.state, "success");
  // Then a fork opens a PR on the same SHA; the fake API serves it at the event's path.
  const fork = forkPr();
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, fork, [[passReview]], false, [
    [openPr(), fork],
  ]);
  await run(env, fetchImpl);
  // Only the PR itself is read before the first status write.
  assert.deepEqual(
    calls.slice(0, 2).map((call) => call.method),
    ["GET", "POST"],
  );
  assert.equal((calls[1]?.body as { state?: string } | null)?.state, "pending");
  const writes = statusPosts([...green.calls, ...calls]).map((call) => (call.body as { state: string }).state);
  assert.equal(writes.at(-1), "pending");
  assert.ok(statusPosts(calls).every((call) => (call.body as { state: string }).state === "pending"));
  assert.equal(
    calls.some((call) => call.url.includes("/comments")),
    false,
  );
});

test("fork with a failing open-PR read (502 and timeout): pending stays and the job fails", async () => {
  const failures: (() => Promise<Response>)[] = [
    async () => new Response("bad gateway", { status: 502 }),
    async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    },
  ];
  for (const fail of failures) {
    const fork = forkPr();
    const base = setup({ pull_request: { number: 7 } }, fork, [[passReview]], false, [[openPr(), fork]]);
    const fetchImpl = async (url: string, init: RequestInit = {}) => {
      if (url.includes("/pulls?state=open")) {
        base.calls.push({ url, method: init.method ?? "GET", body: null });
        return fail();
      }
      return base.fetchImpl(url, init);
    };
    await assert.rejects(run(base.env, fetchImpl), /502|timed out/);
    const firstPost = base.calls.findIndex((call) => call.method === "POST");
    const firstList = base.calls.findIndex((call) => call.url.includes("/pulls?state=open"));
    assert.ok(firstPost >= 0 && firstPost < firstList);
    assert.ok(posts(base.calls).every((body) => body.state === "pending"));
    assert.equal(posts(base.calls).at(-1)?.description, FOREIGN_HEAD.description);
  }
});

test("fork on its own SHA: only pending, no verdict read", async () => {
  const fork = forkPr();
  const { calls, env, fetchImpl } = setup({ pull_request: { number: 7 } }, fork, [[passReview]], false, [[fork]]);
  assert.deepEqual(await run(env, fetchImpl), FOREIGN_HEAD);
  assert.deepEqual(
    posts(calls).map((body) => body.description),
    [FOREIGN_HEAD.description],
  );
  assert.equal(
    calls.some((call) => call.url.includes("/comments")),
    false,
  );
});

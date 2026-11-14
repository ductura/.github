import { test } from "node:test";
import assert from "node:assert/strict";
import { BOT, findReportIssue, publishReport } from "./drift-report.mjs";

// Invented data only.
const TITLE = "Razilaženje postavki (drift-check)";
const issue = (number, extra = {}) => ({ number, state: "open", title: TITLE, user: { login: BOT }, ...extra });

test("findReportIssue picks the oldest open bot issue with the exact title", () => {
  assert.equal(findReportIssue([issue(7), issue(3)], TITLE), 3);
  assert.equal(findReportIssue([issue(1, { pull_request: {} })], TITLE), null);
  assert.equal(findReportIssue([issue(1, { user: { login: "netko" } })], TITLE), null);
  assert.equal(findReportIssue([issue(1, { title: `${TITLE} ` })], TITLE), null);
  assert.equal(findReportIssue([issue(1, { state: "closed" })], TITLE), null);
  assert.equal(findReportIssue({ message: "x" }, TITLE), null);
});

function fakeFetch(issues, status = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
    const s = status[init.method] ?? (init.method === "POST" ? 201 : 200);
    const body = init.method === "GET" ? issues : { number: 42 };
    return { status: s, json: async () => body };
  };
  return { impl, calls };
}

const API = "https://api.example.test";

test("comments on the existing report issue", async () => {
  const { impl, calls } = fakeFetch([issue(5)]);
  const r = await publishReport({ fetchImpl: impl, base: API, repo: "primjer-org/.github", title: TITLE, body: "izvještaj" });
  assert.deepEqual(r, { action: "comment", number: 5 });
  assert.deepEqual(calls.map((c) => `${c.method} ${c.url}`), [
    `GET ${API}/repos/primjer-org/.github/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`,
    `POST ${API}/repos/primjer-org/.github/issues/5/comments`,
  ]);
  assert.deepEqual(calls[1].body, { body: "izvještaj" });
});

test("opens the report issue when none is open", async () => {
  const { impl, calls } = fakeFetch([]);
  const r = await publishReport({ fetchImpl: impl, base: API, repo: "primjer-org/.github", title: TITLE, body: "izvještaj" });
  assert.deepEqual(r, { action: "create", number: 42 });
  assert.equal(calls[1].url, `${API}/repos/primjer-org/.github/issues`);
  assert.deepEqual(calls[1].body, { title: TITLE, body: "izvještaj" });
});

test("refuses a bad repository or title and fails on a non-2xx answer", async () => {
  const { impl, calls } = fakeFetch([]);
  await assert.rejects(publishReport({ fetchImpl: impl, repo: "../x", title: TITLE, body: "" }), /invalid repository/);
  await assert.rejects(publishReport({ fetchImpl: impl, repo: "o/r", title: "", body: "" }), /missing issue title/);
  assert.equal(calls.length, 0);
  const denied = fakeFetch([], { POST: 403 });
  await assert.rejects(publishReport({ fetchImpl: denied.impl, base: API, repo: "o/r", title: TITLE, body: "x" }), /HTTP 403/);
});

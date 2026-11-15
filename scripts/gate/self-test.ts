// Integration self-test of the engineering gate (DAN-723): runs the real
// runner (review-gate.ts) as a child process against a local fake REST API
// that serves one fixture, and compares its exit code and every status it
// writes with the fixture's expectation. GATE_* come from the environment, as
// the reusable workflow sets them from its inputs. No request leaves
// 127.0.0.1 and the runner gets a fixture token, never a real one.
// Usage: node scripts/gate/self-test.ts fixtures/gate/<case>.json
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const FIXTURE_TOKEN = "fixture-token-not-a-secret";
const RUNNER = join(dirname(fileURLToPath(import.meta.url)), "review-gate.ts");

type Status = { sha: string; state: string; description: string };
export type Fixture = {
  repository: string;
  pr: { number: number; head: { sha: string } } & Record<string, unknown>;
  openPulls: unknown[];
  comments: unknown[][];
  failComments?: boolean;
  expect: { exit: number; statuses: { state: string; description: string }[] };
};
export type Outcome = { exit: number | null; statuses: Status[]; unexpected: string[] };

async function readBody(req: IncomingMessage): Promise<string> {
  let text = "";
  for await (const chunk of req) text += String(chunk);
  return text;
}

/** Runs the runner over a fixture and returns what it did. */
export async function runFixture(fixture: Fixture, env: NodeJS.ProcessEnv = process.env): Promise<Outcome> {
  const { repository, pr } = fixture;
  const statuses: Status[] = [];
  const unexpected: string[] = [];
  const server = createServer((req, res) => {
    void (async () => {
      const url = req.url ?? "";
      const send = (code: number, payload?: unknown) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(payload === undefined ? "" : JSON.stringify(payload));
      };
      if (req.headers.authorization !== `Bearer ${FIXTURE_TOKEN}`) unexpected.push(`token on ${url}`);
      const base = `/repos/${repository}`;
      const statusSha = new RegExp(`^${base}/statuses/([0-9a-f]{40})$`).exec(url)?.[1];
      if (req.method === "POST" && statusSha) {
        const body = JSON.parse(await readBody(req)) as Status & { context?: string };
        if (body.context !== "Engineering review gate") unexpected.push(`context ${body.context}`);
        statuses.push({ sha: statusSha, state: body.state, description: body.description });
        return send(201, {});
      }
      if (req.method !== "GET") {
        unexpected.push(`${req.method} ${url}`);
        return send(405);
      }
      if (url === `${base}/pulls/${pr.number}`) return send(200, pr);
      const openPage = new RegExp(`^${base}/pulls\\?state=open&per_page=100&page=(\\d+)$`).exec(url)?.[1];
      if (openPage) return send(200, openPage === "1" ? fixture.openPulls : []);
      const page = new RegExp(`^${base}/issues/${pr.number}/comments\\?per_page=100&page=(\\d+)$`).exec(url)?.[1];
      if (page) return fixture.failComments ? send(502) : send(200, fixture.comments[Number(page) - 1] ?? []);
      unexpected.push(`GET ${url}`);
      return send(404);
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const eventPath = join(mkdtempSync(join(tmpdir(), "gate-self-test-")), "event.json");
    writeFileSync(eventPath, JSON.stringify({ pull_request: { number: pr.number } }));
    const { port } = server.address() as AddressInfo;
    const child = spawn(process.execPath, [RUNNER], {
      stdio: "inherit",
      env: {
        ...env,
        GITHUB_TOKEN: FIXTURE_TOKEN,
        GITHUB_API_URL: `http://127.0.0.1:${port}`,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: repository,
      },
    });
    const exit = await new Promise<number | null>((resolve) => child.on("exit", resolve));
    return { exit, statuses, unexpected };
  } finally {
    server.close();
  }
}

/** Differences between an outcome and the fixture's expectation; empty when they match. */
export function compare(fixture: Fixture, outcome: Outcome): string[] {
  const problems = [...outcome.unexpected.map((u) => `unexpected request: ${u}`)];
  if (outcome.exit !== fixture.expect.exit) problems.push(`exit ${outcome.exit}, expected ${fixture.expect.exit}`);
  const got = outcome.statuses.map(({ state, description }) => ({ state, description }));
  if (JSON.stringify(got) !== JSON.stringify(fixture.expect.statuses)) {
    problems.push(`statuses ${JSON.stringify(got)}, expected ${JSON.stringify(fixture.expect.statuses)}`);
  }
  if (outcome.statuses.some((s) => s.sha !== fixture.pr.head.sha)) problems.push("a status was not on the PR head");
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const path = process.argv[2] ?? "";
  const fixture = JSON.parse(readFileSync(path, "utf8")) as Fixture;
  const problems = compare(fixture, await runFixture(fixture));
  for (const problem of problems) console.log(`::error::${path}: ${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log(`${path}: exit ${fixture.expect.exit} and ${fixture.expect.statuses.length} statuses as expected`);
}

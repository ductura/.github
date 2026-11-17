// Integration self-test of tests-table.yml (DAN-948): runs the real runner
// (tests-table.mjs) as a child process against a local fake REST API that
// serves one fixture, and compares its exit code and its one output line
// with the fixture's expectation. No request leaves 127.0.0.1 and the runner
// gets a fixture token, never a real one.
// The PR is served with the fixture's captured body_html, as GitHub serves
// it for Accept: application/vnd.github.html+json.
// Usage: node scripts/tests-table-self-test.mjs fixtures/tests-table/<case>.json
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const FIXTURE_TOKEN = "fixture-token-not-a-secret";
const RUNNER = join(dirname(fileURLToPath(import.meta.url)), "tests-table.mjs");

/** Runs the runner over a fixture; returns its exit code, output and any unexpected request. */
export async function runFixture(fixture) {
  const { repository, pr, files } = fixture;
  const unexpected = [];
  const base = `/repos/${repository}/pulls/${pr.number}`;
  const server = createServer((req, res) => {
    const url = req.url ?? "";
    const send = (code, payload) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(payload ?? {}));
    };
    if (req.headers.authorization !== `Bearer ${FIXTURE_TOKEN}`) unexpected.push(`token on ${url}`);
    if (req.method !== "GET") return unexpected.push(`${req.method} ${url}`), send(405);
    if (url === base) {
      if (req.headers.accept !== "application/vnd.github.html+json") unexpected.push(`accept on ${url}`);
      return send(200, pr);
    }
    const page = new RegExp(`^${base}/files\\?per_page=100&page=(\\d+)$`).exec(url)?.[1];
    if (page) return send(200, Number(page) === 1 ? files : []);
    unexpected.push(`GET ${url}`);
    return send(404);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const eventPath = join(mkdtempSync(join(tmpdir(), "tests-table-")), "event.json");
    writeFileSync(eventPath, JSON.stringify({ pull_request: { number: pr.number, head: { sha: pr.head.sha } } }));
    const child = spawn(process.execPath, [RUNNER], {
      stdio: ["ignore", "pipe", "inherit"],
      env: {
        PATH: process.env.PATH,
        GITHUB_TOKEN: FIXTURE_TOKEN,
        GITHUB_API_URL: `http://127.0.0.1:${server.address().port}`,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: repository,
      },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += String(chunk)));
    const exit = await new Promise((resolve) => child.on("close", resolve));
    return { exit, output, unexpected };
  } finally {
    server.close();
  }
}

/** Differences between an outcome and the fixture's expectation; empty when they match. */
export function compare(fixture, outcome) {
  const problems = outcome.unexpected.map((u) => `unexpected request: ${u}`);
  if (outcome.exit !== fixture.expect.exit) problems.push(`exit ${outcome.exit}, expected ${fixture.expect.exit}`);
  if (!outcome.output.includes(fixture.expect.output)) problems.push(`output lacks: ${fixture.expect.output}`);
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const path = process.argv[2] ?? "";
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  const outcome = await runFixture(fixture);
  // Quoted, so an expected ::error:: of the runner is not an annotation here.
  for (const line of outcome.output.split("\n").filter(Boolean)) console.log(`> ${line}`);
  const problems = compare(fixture, outcome);
  for (const problem of problems) console.log(`::error::${path}: ${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log(`${path}: exit ${fixture.expect.exit} as expected`);
}

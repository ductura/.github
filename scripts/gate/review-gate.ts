// Runner of the engineering gate verdict check (S-0.10-b, DAN-723). Reads the
// PR and its comments over REST only and writes the commit status
// "Engineering review gate" on the PR head. It never fetches PR code.
// Environment: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH,
// GATE_OWNER_LOGIN, GATE_MINIMUM_RISK, optional GATE_TRUSTED_LOGINS (spaces or
// newlines), GITHUB_API_URL, GITHUB_SERVER_URL, GITHUB_RUN_ID.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { type Comment, evaluateVerdicts, type GateResult } from "./verdicts.ts";

export const STATUS_CONTEXT = "Engineering review gate";
const TIMEOUT_MS = 20_000;
const MAX_PAGES = 50;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Env = Record<string, string | undefined>;
type PullRequest = {
  number: number;
  state: string;
  body: string | null;
  head: { sha: string; repo: { full_name: string } | null };
  base: { repo: { full_name: string } };
};

/** The PR number of a pull_request(_target) or issue_comment event, else null. */
export function prNumberFromEvent(event: unknown): number | null {
  const e = event as { pull_request?: { number?: unknown }; issue?: { number?: unknown; pull_request?: unknown } };
  const number = e.pull_request?.number ?? (e.issue?.pull_request ? e.issue.number : undefined);
  return Number.isSafeInteger(number) && (number as number) > 0 ? (number as number) : null;
}

function client(fetchImpl: Fetch, env: Env) {
  const base = (env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/+$/, "");
  return async (path: string, init: RequestInit = {}): Promise<unknown> => {
    const response = await fetchImpl(`${base}${path}`, {
      ...init,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${env.GITHUB_TOKEN ?? ""}`,
        "x-github-api-version": "2022-11-28",
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`GitHub API ${init.method ?? "GET"} ${path}: ${response.status}`);
    const text = await response.text();
    return text ? (JSON.parse(text) as unknown) : null;
  };
}

// A status belongs to a commit, so while another open PR shares this head the
// verdicts of one PR would stand for the other: no green (Ductus SHARED_HEAD).
export const SHARED_HEAD: GateResult = {
  state: "pending",
  description: "No green status while another open PR shares this head; close the other PR.",
};
const EVALUATING: GateResult = { state: "pending", description: "Engineering review gate is evaluating this head." };

type Api = ReturnType<typeof client>;

async function pages(api: Api, path: string): Promise<unknown[]> {
  const items: unknown[] = [];
  for (let page = 1; ; page += 1) {
    if (page > MAX_PAGES) throw new Error(`Too many pages: ${path}`);
    const batch = await api(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error(`Expected an array: ${path}`);
    items.push(...(batch as unknown[]));
    if (batch.length < 100) return items;
  }
}

async function sharesHead(api: Api, repository: string, pr: PullRequest): Promise<boolean> {
  const open = (await pages(api, `/repos/${repository}/pulls?state=open`)) as Partial<PullRequest>[];
  // An entry that cannot be read counts as sharing the head (fails closed).
  return open.some(
    (other) =>
      typeof other?.head?.sha !== "string" ||
      (other.number !== pr.number && other.head.sha.toLowerCase() === pr.head.sha),
  );
}

async function shared(status: (result: GateResult) => Promise<void>): Promise<GateResult> {
  await status(SHARED_HEAD);
  console.log(`${STATUS_CONTEXT}: pending: ${SHARED_HEAD.description}`);
  return SHARED_HEAD;
}

/** Evaluates one PR and writes its status; returns the result, or null when skipped. */
export async function run(env: Env, fetchImpl: Fetch = fetch): Promise<GateResult | null> {
  const repository = env.GITHUB_REPOSITORY ?? "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("GITHUB_REPOSITORY is missing or invalid.");
  const number = prNumberFromEvent(JSON.parse(readFileSync(env.GITHUB_EVENT_PATH ?? "", "utf8")));
  if (!number) {
    console.log("No pull request in this event; nothing to evaluate.");
    return null;
  }
  const api = client(fetchImpl, env);
  const pr = (await api(`/repos/${repository}/pulls/${number}`)) as PullRequest;
  // F-014: a status belongs to a commit, so a closed PR or a head from another
  // repository, which may share a SHA with an open PR here, gets none.
  if (pr.state !== "open" || pr.head.repo?.full_name !== repository || pr.base.repo.full_name !== repository) {
    console.log(`PR #${number} is closed or its head is outside ${repository}; no status written.`);
    return null;
  }
  if (!/^[0-9a-f]{40}$/.test(pr.head.sha)) throw new Error("Invalid PR head SHA.");
  const status = async (result: GateResult) => {
    const target =
      env.GITHUB_SERVER_URL && env.GITHUB_RUN_ID
        ? `${env.GITHUB_SERVER_URL}/${repository}/actions/runs/${env.GITHUB_RUN_ID}`
        : undefined;
    await api(`/repos/${repository}/statuses/${pr.head.sha}`, {
      method: "POST",
      body: JSON.stringify({
        state: result.state,
        context: STATUS_CONTEXT,
        description: result.description.slice(0, 140),
        ...(target ? { target_url: target } : {}),
      }),
    });
  };
  // A run killed after this point (timeout, cancel) leaves this pending, never
  // an older success.
  await status(EVALUATING);
  try {
    if (await sharesHead(api, repository, pr)) return await shared(status);
    const comments = (await pages(api, `/repos/${repository}/issues/${number}/comments`)) as Comment[];
    const result = evaluateVerdicts({
      body: pr.body ?? "",
      headSha: pr.head.sha,
      ownerLogin: env.GATE_OWNER_LOGIN?.trim() ?? "",
      minimumRisk: env.GATE_MINIMUM_RISK?.trim() ?? "",
      comments,
      trustedLogins: (env.GATE_TRUSTED_LOGINS ?? "").split(/\s+/).filter(Boolean),
    });
    await status(result);
    // A PR opened on this head while the gate read the comments: no green stays.
    if (result.state === "success" && (await sharesHead(api, repository, pr))) return await shared(status);
    console.log(`${STATUS_CONTEXT}: ${result.state}: ${result.description}`);
    return result;
  } catch (error) {
    // An older success must never outlive a failed re-evaluation of this head.
    await status({ state: "pending", description: "Gate run failed before a verdict; re-run the gate." });
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run(process.env).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractRun } from "./extract-run.mjs";

const workflow = readFileSync(new URL("../.github/workflows/secret-scan.yml", import.meta.url), "utf8");
const script = extractRun(workflow, "secret-scan");

test("gitleaks image is pinned to a sha256 digest", () => {
  const images = [...script.matchAll(/ghcr\.io\/gitleaks\/gitleaks\S*/g)].map((m) => m[0]);
  assert.ok(images.length > 0, "script runs gitleaks");
  for (const image of images) assert.match(image, /^ghcr\.io\/gitleaks\/gitleaks:v[0-9.]+@sha256:[0-9a-f]{64}$/);
});

test("scanner runs without network and requires scanned commits", () => {
  assert.match(script, /--network none/);
  assert.match(script, /commits\?? scanned/);
});

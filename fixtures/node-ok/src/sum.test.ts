import { test } from "node:test";
import assert from "node:assert/strict";
import { first, sum } from "./sum.ts";

test("sum adds all values", () => {
  assert.equal(sum([1, 2, 3]), 6);
  assert.equal(sum([]), 0);
});

test("first returns undefined for an empty list", () => {
  assert.equal(first([7, 8]), 7);
  assert.equal(first([]), undefined);
});

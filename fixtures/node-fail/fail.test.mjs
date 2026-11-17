// The one test of this fixture fails on purpose: self-test.yml calls ci-node.yml
// with expect-failure over it, and ci-ok must be red over its result (DAN-971).
import { test } from "node:test";
import assert from "node:assert/strict";

test("fails on purpose", () => {
  assert.fail("node-fail fixture: this assertion fails on purpose");
});

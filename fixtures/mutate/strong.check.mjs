// The boundary and both negative cases: every mutant of src.mjs is killed.
import assert from "node:assert/strict";
import { canVote } from "./src.mjs";

assert.equal(canVote(18, true), true);
assert.equal(canVote(17, true), false);
assert.equal(canVote(30, false), false);

// Positive example only: both mutants of src.mjs survive it.
import assert from "node:assert/strict";
import { canVote } from "./src.mjs";

assert.equal(canVote(30, true), true);

// Weak on purpose: no case at the boundary and no negative case, so mutants survive.
import { expect, test } from "vitest";
import { isAdult } from "./adult.ts";

test("an adult is an adult", () => {
  expect(isAdult(30)).toBe(true);
});

// The boundary and a negative case kill every mutant of adult.ts.
import { expect, test } from "vitest";
import { isAdult } from "./adult.ts";

test("18 is the first adult age", () => {
  expect(isAdult(18)).toBe(true);
  expect(isAdult(30)).toBe(true);
});

test("17 is not adult", () => {
  expect(isAdult(17)).toBe(false);
});

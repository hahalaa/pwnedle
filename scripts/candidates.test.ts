import { expect, test } from "vitest";
import { candidates, variations } from "./candidates";

test("applies case, digit, year, ! and letter-swap variations one kind at a time", () => {
  const v = variations("dragon");
  for (const want of ["dragon", "Dragon", "DRAGON", "dragon123", "dragon2020", "dragon!", "dr@g0n"]) {
    expect(v).toContain(want);
  }
  for (const stacked of ["Dragon1!", "dr@g0n123", "dragon1!", "Dragon2024", "DRAGON!"]) {
    expect(v).not.toContain(stacked);
  }
  expect(new Set(v).size).toBe(v.length);
});

test("adds no digits to seeds that end in a digit", () => {
  // Case and swaps leave "111111" unchanged, so only "!" varies it.
  expect(variations("111111")).toEqual(["111111", "111111!"]);
  expect(variations("trustno1")).not.toContain("trustno11");
});

test("combines expanded seeds with SecLists entries, deduped", async () => {
  const all = await candidates();
  expect(all).toContain("liverpool2024"); // seed variation
  expect(all).toContain("qwertyuiop"); // seed list
  expect(all).toContain("123456"); // SecLists
  expect(new Set(all).size).toBe(all.length);
  expect(all.every((p) => p.length > 0 && p === p.trim())).toBe(true);
});

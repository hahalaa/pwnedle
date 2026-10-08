import { expect, test } from "vitest";
import { candidates, variations } from "./candidates";

test("applies case, digit, year, ! and letter-swap variations without stacking", () => {
  const v = variations("dragon");
  for (const want of ["dragon", "Dragon", "DRAGON", "dragon123", "dragon2020", "dragon!", "dragon1!", "Dragon1!", "Dragon2024", "dr@g0n"]) {
    expect(v).toContain(want);
  }
  for (const stacked of ["dr@g0n123", "dr@g0n!", "DRAGON!", "DRAGON1", "Dragon1!1"]) {
    expect(v).not.toContain(stacked);
  }
  expect(new Set(v).size).toBe(v.length);
});

test("adds no digits to seeds that end in a digit", () => {
  // Case and swaps leave "111111" unchanged, so only "!" varies it.
  expect(variations("111111").sort()).toEqual(["111111", "111111!"]);
  const v = variations("trustno1");
  expect(v).toContain("Trustno1!");
  for (const stacked of ["trustno11", "Trustno11!", "trustno12024"]) expect(v).not.toContain(stacked);
});

test("combines expanded seeds with SecLists entries, deduped", async () => {
  const all = await candidates();
  expect(all).toContain("Liverpool2024"); // seed variation
  expect(all).toContain("qwertyuiop"); // seed list
  expect(all).toContain("123456"); // SecLists
  expect(new Set(all).size).toBe(all.length);
  expect(all.every((p) => p.length > 0 && p === p.trim())).toBe(true);
});

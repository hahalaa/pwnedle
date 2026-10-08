import { expect, test } from "vitest";
import { candidates, variations } from "./candidates";

test("applies case, digit, year, ! and letter-swap variations", () => {
  const v = variations("dragon");
  for (const want of ["dragon", "Dragon", "DRAGON", "dragon123", "dragon2020", "dragon!", "Dragon1!", "dr@g0n", "dr@g0n123"]) {
    expect(v).toContain(want);
  }
  expect(new Set(v).size).toBe(v.length);
});

test("drops forms that change nothing", () => {
  // Case and swaps leave "111111" unchanged, so only the 14 suffixes vary it.
  expect(variations("111111")).toHaveLength(14);
});

test("combines expanded seeds with SecLists entries, deduped", async () => {
  const all = await candidates();
  expect(all).toContain("Liverpool2024"); // seed variation
  expect(all).toContain("qwertyuiop"); // seed list
  expect(all).toContain("123456"); // SecLists
  expect(new Set(all).size).toBe(all.length);
  expect(all.every((p) => p.length > 0 && p === p.trim())).toBe(true);
});

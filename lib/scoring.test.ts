import { expect, test } from "vitest";
import { K } from "./config";
import { score, tier } from "./scoring";

test("scores exact guesses 100, including zero counts", () => {
  expect(score(0, 0)).toBe(100);
  expect(score(123_456, 123_456)).toBe(100);
});

test("follows the bell curve with K", () => {
  expect(K).toBe(1.25);
  expect(score(9, 99)).toBe(53); // d = 1
  expect(score(0, 9)).toBe(53); // zero guess works
  expect(score(999, 0)).toBe(0); // d = 3
  expect(score(100, 30)).toBeGreaterThan(80); // about 3x is forgiving
  expect(score(10_000, 99)).toBeLessThan(10); // 100x is near zero
});

test("maps scores to tiers at the band edges", () => {
  const edges = [100, 90, 89, 70, 69, 40, 39, 10, 9, 0].map(tier);
  expect(edges).toEqual(["Uncrackable", "Uncrackable", "Strong", "Strong", "Mid", "Mid", "Weak", "Weak", "Pwned", "Pwned"]);
  expect(tier(89.6)).toBe("Strong"); // daily average is not rounded up into a band
});

import { expect, test, vi } from "vitest";
import { baseWord, meetsMix, selectPuzzle } from "./select";

test("meetsMix accepts a puzzle that follows every R3 rule", () => {
  expect(meetsMix([0, 50, 5_000, 200_000, 3_000_000])).toBe(true);
  expect(meetsMix([100, 100_000, 7, 40_000, 9_000_000])).toBe(true);
});

test("meetsMix rejects each broken rule", () => {
  expect(meetsMix([101, 5_000, 50_000, 200_000, 3_000_000])).toBe(false); // nothing 100 or less
  expect(meetsMix([5, 50, 5_000, 99_999, 30_000])).toBe(false); // nothing 100,000 or more
  expect(meetsMix([5, 50, 60, 200_000, 300_000])).toBe(false); // 3 magnitudes
  expect(meetsMix([0, 5, 50, 500_000, 200_000])).toBe(false); // 0 and 5 share a magnitude
  expect(meetsMix([0, 0, 50, 5_000, 200_000])).toBe(false); // two zeros
  expect(meetsMix([5, 5_000, 50_000, 200_000])).toBe(false); // four passwords
});

// Each index spelled in consonants keeps base words distinct: pw(12) is "cd12" (D33).
const pw = (i: number) => [...String(i)].map((d) => "bcdfghjklm"[+d]).join("") + i;
// Counts cycle through 1, 10, ..., 10,000,000 and 0.
const pool = Array.from({ length: 1000 }, (_, i) => pw(i));
const fakeCount = (pw: string) => {
  const i = Number(pw.replace(/\D/g, "")) % 9;
  return i === 8 ? 0 : 10 ** i;
};

test("returns 5 passwords meeting R3 after only a few lookups", async () => {
  for (let run = 0; run < 50; run++) {
    const count = vi.fn(async (pw: string) => fakeCount(pw));
    const puzzle = await selectPuzzle(pool, new Set(), count);

    expect(meetsMix(puzzle.map((e) => e.count))).toBe(true);
    expect(new Set(puzzle.map((e) => e.password)).size).toBe(5);
    expect(puzzle.every((e) => e.count === fakeCount(e.password))).toBe(true);
    expect(count.mock.calls.length).toBeLessThan(100);
  }
});

test("never picks or looks up a used or unclean password", async () => {
  const used = new Set(pool.filter((_, i) => i % 2 === 0));
  const count = vi.fn(async (pw: string) => fakeCount(pw));
  const puzzle = await selectPuzzle([...pool, "fuckyou1", "bob@example.com"], used, count);

  expect(puzzle.some((e) => used.has(e.password))).toBe(false);
  for (const [pw] of count.mock.calls) {
    expect(used.has(pw)).toBe(false);
    expect(["fuckyou1", "bob@example.com"]).not.toContain(pw);
  }
});

test("throws when the pool cannot meet the mix rules", async () => {
  await expect(selectPuzzle(pool, new Set(), async () => 500_000)).rejects.toThrow("Not enough candidates");
});

test("baseWord drops case, digits and symbols", () => {
  expect(baseWord("Whatever123")).toBe(baseWord("whatever2024!"));
  expect(baseWord("m@nutd")).toBe("mnutd");
  expect(baseWord("1962")).toBe("");
});

test("never picks two passwords with one base word, or one whose base is near", async () => {
  const twins = ["Dragon1", "dragon2024", "DRAGON!", "1962", "2020"];
  const count = async (p: string) => fakeCount(p);
  for (let run = 0; run < 20; run++) {
    const puzzle = await selectPuzzle([...pool.slice(0, 30), ...twins], new Set(), count, new Set([baseWord(pool[0])]));
    const bases = puzzle.map((e) => baseWord(e.password)).filter(Boolean);
    expect(new Set(bases).size).toBe(bases.length);
    expect(puzzle.map((e) => e.password)).not.toContain(pool[0]);
  }
});

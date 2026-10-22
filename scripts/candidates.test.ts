import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { candidates, themeCandidates, variations } from "./candidates";

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

test("drops candidates longer than 20 characters", async () => {
  const dir = await mkdtemp(join(tmpdir(), "seeds-"));
  await mkdir(join(dir, "seclists"));
  await writeFile(join(dir, "words.txt"), "abcdefghijklmnopq\n"); // 17 characters
  await writeFile(join(dir, "seclists/10k-most-common.txt"), "abcdefghijklmnopqrst\nabcdefghijklmnopqrstu\n");
  const all = await candidates(dir);
  expect(all).toContain("abcdefghijklmnopq123"); // 20
  expect(all).not.toContain("abcdefghijklmnopq1234"); // 21
  expect(all).toContain("abcdefghijklmnopqrst"); // 20
  expect(all).not.toContain("abcdefghijklmnopqrstu"); // 21
});

test("theme seeds expand on their own and stay out of random days", async () => {
  const halloween = await themeCandidates("halloween");
  expect(halloween).toContain("Jackolantern2025");
  expect(await candidates()).not.toContain("Jackolantern2025");
});

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Appended digits and years, a trailing "!", and "1!" (R28).
const SUFFIXES = ["!", "1", "12", "123", "1234", "1!", "1990", "2000", "2010", "2020", "2024", "2025"];
const SWAPS: Record<string, string> = { a: "@", o: "0", e: "3", s: "$" };

// Every variation of one seed (R28). UPPER and the letter swaps stand alone; the seed and its
// Capitalised form each take at most one suffix. Seeds already ending in a digit only get "!".
export function variations(seed: string): string[] {
  const capitalised = seed[0].toUpperCase() + seed.slice(1);
  const suffixes = /\d$/.test(seed) ? ["!"] : SUFFIXES;
  const forms = [
    seed.toUpperCase(),
    seed.replace(/[aoes]/g, (c) => SWAPS[c]),
    ...[seed, capitalised].flatMap((f) => ["", ...suffixes].map((s) => f + s)),
  ];
  return [...new Set(forms)];
}

async function lines(file: string): Promise<string[]> {
  return (await readFile(file, "utf8")).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

// Candidates from both R28 sources: expanded seed lists, plus SecLists entries as-is.
// Anything over 20 characters is dropped so it can't make the end screen scroll on phones.
export async function candidates(dir = "scripts/seeds"): Promise<string[]> {
  const out = new Set<string>();
  for (const name of (await readdir(dir)).filter((n) => n.endsWith(".txt"))) {
    for (const seed of await lines(join(dir, name))) variations(seed).forEach((v) => out.add(v));
  }
  for (const pw of await lines(join(dir, "seclists/10k-most-common.txt"))) out.add(pw);
  return [...out].filter((pw) => pw.length <= 20);
}

// Variations of one theme's seeds only (D49). They live in a subfolder so random days never draw them.
export async function themeCandidates(theme: string, dir = "scripts/seeds/themes"): Promise<string[]> {
  return (await lines(join(dir, `${theme}.txt`))).flatMap(variations).filter((pw) => pw.length <= 20);
}

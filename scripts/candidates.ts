import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Appended digits and years, and a trailing "!" (R28).
const SUFFIXES = ["", "1", "12", "123", "1234", "!", "1!", "123!", "1990", "2000", "2010", "2020", "2024", "2025"];
const SWAPS: Record<string, string> = { a: "@", o: "0", e: "3", s: "$" };

// Every variation of one seed: case forms and letter swaps, each with every suffix.
export function variations(seed: string): string[] {
  const forms = [
    seed,
    seed[0].toUpperCase() + seed.slice(1),
    seed.toUpperCase(),
    seed.replace(/[aoes]/g, (c) => SWAPS[c]),
  ];
  return [...new Set(forms.flatMap((f) => SUFFIXES.map((s) => f + s)))];
}

async function lines(file: string): Promise<string[]> {
  return (await readFile(file, "utf8")).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

// Candidates from both R28 sources: expanded seed lists, plus SecLists entries as-is.
export async function candidates(dir = "scripts/seeds"): Promise<string[]> {
  const out = new Set<string>();
  for (const name of (await readdir(dir)).filter((n) => n.endsWith(".txt"))) {
    for (const seed of await lines(join(dir, name))) variations(seed).forEach((v) => out.add(v));
  }
  for (const pw of await lines(join(dir, "seclists/10k-most-common.txt"))) out.add(pw);
  return [...out];
}

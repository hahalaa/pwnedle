import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { draftNote } from "./notes.ts";
import { pwnedCount } from "./pwned.ts";
import { selectPuzzle, selectReplacement } from "./select.ts";

// D21: one file per date, entries in display order.
export type Puzzle = {
  date: string;
  status: "draft" | "approved";
  passwords: { password: string; count: number; note: string }[];
};

export type Deps = {
  candidates: string[];
  count?: (password: string) => Promise<number>;
  note?: (password: string, count: number) => Promise<string>;
};

export const DIR = "data/puzzles";

export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export const utcToday = () => new Date().toISOString().slice(0, 10);

const file = (dir: string, date: string) => join(dir, `${date}.json`);

async function loadAll(dir: string): Promise<Puzzle[]> {
  const names = await readdir(dir).catch(() => []);
  return Promise.all(names.filter((n) => n.endsWith(".json")).map(async (n) => JSON.parse(await readFile(join(dir, n), "utf8"))));
}

// Every password in every puzzle file, so no password is reused (R5, R31).
const usedSet = (puzzles: Puzzle[]) => new Set(puzzles.flatMap((p) => p.passwords.map((e) => e.password)));

async function save(dir: string, p: Puzzle) {
  await mkdir(dir, { recursive: true });
  await writeFile(file(dir, p.date), JSON.stringify(p, null, 2) + "\n");
}

// Writes a draft for each day from today to today+13 that has no file yet (R33, D21). Returns the dates written.
export async function generate(dir: string, today: string, { candidates, count = pwnedCount, note = draftNote }: Deps): Promise<string[]> {
  const puzzles = await loadAll(dir);
  const have = new Set(puzzles.map((p) => p.date));
  const used = usedSet(puzzles);
  const written: string[] = [];
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    if (have.has(date)) continue;
    const picked = await selectPuzzle(candidates, used, count);
    const passwords = [];
    for (const e of picked) {
      used.add(e.password);
      passwords.push({ ...e, note: await note(e.password, e.count) });
    }
    await save(dir, { date, status: "draft", passwords });
    written.push(date);
  }
  return written;
}

// Swaps the password at `index` in a draft for a new one that keeps R3 and R5 (R34).
// Only drafts dated today+2 or later, since the server already serves up to today+1 (R2, D21).
export async function replace(dir: string, date: string, index: number, today: string, { candidates, count = pwnedCount, note = draftNote }: Deps) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Bad date: ${date}`);
  if (!Number.isInteger(index) || index < 0 || index > 4) throw new Error(`Index must be 0 to 4, got ${index}`);
  if (date < addDays(today, 2)) throw new Error(`${date} can already be served; only dates from ${addDays(today, 2)} can change`);

  const puzzles = await loadAll(dir);
  const p = puzzles.find((x) => x.date === date);
  if (!p) throw new Error(`No puzzle file for ${date}`);
  if (p.status !== "draft") throw new Error(`${date} is ${p.status}; set it back to draft first`);

  const others = p.passwords.filter((_, i) => i !== index).map((e) => e.count);
  const e = await selectReplacement(candidates, usedSet(puzzles), others, count);
  p.passwords[index] = { ...e, note: await note(e.password, e.count) };
  await save(dir, p);
}

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LAUNCH_DATE } from "../lib/config.ts";
import { addDays, utcToday } from "../lib/days.ts";
import { isClean } from "./filter.ts";
import { NoValidNoteError, draftNote, noteProblem } from "./notes.ts";
import { pwnedCount } from "./pwned.ts";
import { baseWord, meetsMix, selectPuzzle, selectReplacement } from "./select.ts";

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
  launch?: string;
};

export const DIR = "data/puzzles";

export { addDays, utcToday };

const file = (dir: string, date: string) => join(dir, `${date}.json`);

async function loadAll(dir: string): Promise<Puzzle[]> {
  const names = await readdir(dir).catch(() => []);
  return Promise.all(names.filter((n) => n.endsWith(".json")).map(async (n) => JSON.parse(await readFile(join(dir, n), "utf8"))));
}

// Every password in every puzzle file, so no password is reused (R5, R31).
const usedSet = (puzzles: Puzzle[]) => new Set(puzzles.flatMap((p) => p.passwords.map((e) => e.password)));

const daysApart = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

// Base words of every password dated less than 14 days from `date`, leaving out `skip` (D33).
const nearBases = (puzzles: Puzzle[], date: string, skip?: string) =>
  new Set(
    puzzles
      .filter((p) => daysApart(p.date, date) < 14)
      .flatMap((p) => p.passwords.filter((e) => e.password !== skip).map((e) => baseWord(e.password)))
      .filter(Boolean),
  );

async function save(dir: string, p: Puzzle) {
  await mkdir(dir, { recursive: true });
  await writeFile(file(dir, p.date), JSON.stringify(p, null, 2) + "\n");
}

// Writes a draft for each of the 14 days from today, or from launch if that is later, that has no file yet (R33, D21, D22).
// Returns the dates written.
export async function generate(dir: string, today: string, { candidates, count = pwnedCount, note = draftNote, launch = LAUNCH_DATE }: Deps): Promise<string[]> {
  const puzzles = await loadAll(dir);
  const have = new Set(puzzles.map((p) => p.date));
  const used = usedSet(puzzles);
  const written: string[] = [];
  const start = today < launch ? launch : today;
  for (let i = 0; i < 14; i++) {
    const date = addDays(start, i);
    if (have.has(date)) continue;
    const near = nearBases(puzzles, date);
    const picked = await selectPuzzle(candidates, used, count, near);
    picked.forEach((e) => used.add(e.password));
    const passwords = [];
    for (let j = 0; j < 5; j++) {
      // When a password gets no valid note after 3 drafts, swap it and try again (R34).
      // selectReplacement throws once the pool runs out. API errors still stop the run.
      for (;;) {
        const e = picked[j];
        try {
          passwords.push({ ...e, note: await note(e.password, e.count) });
          break;
        } catch (err) {
          if (!(err instanceof NoValidNoteError)) throw err;
          const rest = picked.filter((_, k) => k !== j);
          const avoid = new Set([...near, ...rest.map((x) => baseWord(x.password))]);
          picked[j] = await selectReplacement(candidates, used, rest.map((x) => x.count), count, avoid);
          used.add(picked[j].password);
        }
      }
    }
    const p: Puzzle = { date, status: "draft", passwords };
    await save(dir, p);
    puzzles.push(p);
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
  const e = await selectReplacement(candidates, usedSet(puzzles), others, count, nearBases(puzzles, date, p.passwords[index].password));
  p.passwords[index] = { ...e, note: await note(e.password, e.count) };
  await save(dir, p);
}

// Checks every puzzle file against R3, R5, R30, D33 and the note limits (R35).
// Errors should fail CI; warnings flag drafts dated today to today+6 as a review reminder.
export async function validate(dir: string, today: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  const bases: { date: string; base: string; name: string }[] = [];
  const names = (await readdir(dir).catch(() => [])).filter((n) => n.endsWith(".json")).sort();
  for (const name of names) {
    const err = (msg: string) => errors.push(`${name}: ${msg}`);
    let p: Puzzle;
    try {
      p = JSON.parse(await readFile(join(dir, name), "utf8"));
    } catch {
      err("not valid JSON");
      continue;
    }
    if (`${p.date}.json` !== name) err(`date ${p.date} does not match the file name`);
    if (p.status !== "draft" && p.status !== "approved") err(`status must be draft or approved, got ${p.status}`);
    if (!Array.isArray(p.passwords) || p.passwords.length !== 5) {
      err("needs exactly 5 passwords");
      continue;
    }
    p.passwords.forEach((e, i) => {
      if (typeof e.password !== "string" || !e.password) return err(`password ${i} is missing`);
      if (!isClean(e.password)) err(`password ${i} fails the content filter`);
      if (seen.has(e.password)) err(`password ${i} is also in ${seen.get(e.password)}`);
      seen.set(e.password, name);
      const base = baseWord(e.password);
      const twin = base && bases.find((b) => b.base === base && daysApart(b.date, p.date) < 14);
      if (twin) err(`password ${i} shares the base word "${base}" with ${twin.name}, under 14 days apart (D33)`);
      bases.push({ date: p.date, base, name });
      if (!Number.isInteger(e.count) || e.count < 0) return err(`password ${i} has a bad count`);
      const problem = typeof e.note === "string" ? noteProblem(e.note, e.count, e.password) : "missing";
      if (problem) err(`note ${i}: ${problem}`);
    });
    if (!meetsMix(p.passwords.map((e) => e.count))) err("counts break the mix rules (R3)");
    if (p.status === "draft" && p.date >= today && p.date < addDays(today, 7)) warnings.push(`${p.date} is still a draft`);
  }
  return { errors, warnings };
}

// Takes `git diff --name-status --no-renames` output. Files dated before today+2 can already
// be served, so editing or deleting one fails CI; adding a file for any date is fine (D11, D21, R37).
export function frozenChanges(diff: string, today: string): string[] {
  const cutoff = addDays(today, 2);
  return diff.split("\n").flatMap((line) => {
    const [status, path] = line.split("\t");
    const date = path?.match(/^data\/puzzles\/(\d{4}-\d{2}-\d{2})\.json$/)?.[1];
    if (!date || status === "A" || date >= cutoff) return [];
    return [`${path}: dated before ${cutoff}, so it can already be served and must not change`];
  });
}

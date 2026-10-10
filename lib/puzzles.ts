import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Puzzle } from "../scripts/puzzles.ts";
import { LAUNCH_DATE } from "./config.ts";
import { addDays, utcToday } from "./days.ts";

// The puzzle for `date`, draft or approved (R36), if it falls between launch and UTC today+1 (R2).
// Returns null for anything else, including a missing file. Includes counts and notes, so never send it to the client whole (R13).
export async function loadPuzzle(date: string, today = utcToday(), dir = join(process.cwd(), "data/puzzles")): Promise<(Puzzle & { number: number }) | null> {
  // The date may come from a request, so the strict format check also keeps it out of other paths.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // D24: dev skips the launch check so the game is playable before launch.
  if ((process.env.NODE_ENV !== "development" && date < LAUNCH_DATE) || date > addDays(today, 1)) return null;
  try {
    const p: Puzzle = JSON.parse(await readFile(join(dir, `${date}.json`), "utf8"));
    return { ...p, number: puzzleNumber(date) };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    // D24: Next inlines NODE_ENV, so production builds drop this branch and never load the fixture.
    if (process.env.NODE_ENV === "development") {
      return { date, status: "draft", number: 0, passwords: (await import("./dev-puzzle.ts")).devPasswords };
    }
    return null;
  }
}

// Puzzle number is days since launch, starting at #1 (R1, D22).
export const puzzleNumber = (date: string) => (Date.parse(date) - Date.parse(LAUNCH_DATE)) / 86_400_000 + 1;

// R20: every puzzle file from launch up to yesterday, newest first. Today and later are never listed.
export async function pastPuzzles(today = utcToday(), dir = join(process.cwd(), "data/puzzles")) {
  // No folder yet just means nothing is published. next.config.ts already traces the folder,
  // so the ignore comment stops Turbopack tracing the whole project for this dynamic path.
  const files = await readdir(/*turbopackIgnore: true*/ dir).catch((e) => {
    if (e.code !== "ENOENT") throw e;
    return [];
  });
  return files
    .map((f) => /^(\d{4}-\d{2}-\d{2})\.json$/.exec(f)?.[1])
    .filter((d): d is string => !!d && d >= LAUNCH_DATE && d < today)
    .sort()
    .reverse()
    .map((date) => ({ date, number: puzzleNumber(date) }));
}

// The only puzzle shape the browser may receive: no counts or notes before a guess is locked in (R13, D7).
export const clientPuzzle = ({ date, number, passwords }: Puzzle & { number: number }) => ({
  date,
  number,
  passwords: passwords.map((e) => e.password),
});

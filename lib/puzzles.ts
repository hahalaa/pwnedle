import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Puzzle } from "../scripts/puzzles.ts";
import { LAUNCH_DATE } from "./config.ts";
import { addDays, utcToday, zoneToday } from "./days.ts";

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

// R2/D30: the player's local date, from the `tz` cookie set by app/time-zone.tsx. The cookie is untrusted:
// an unknown zone falls back to UTC, and the result is clamped to UTC ±1 day, the range every real zone falls in.
// Dates before launch are left to loadPuzzle to refuse. Waits for the request before reading the clock: with
// cacheComponents a cookie read alone still lets Next prerender, and the page would be built with that day's date.
export async function playerToday() {
  await connection();
  const tz = (await cookies()).get("tz")?.value ?? "UTC";
  const utc = utcToday();
  return [addDays(utc, -1), zoneToday(tz), addDays(utc, 1)].sort()[1];
}

// Puzzle number is days since launch, starting at #1 (R1, D22).
export const puzzleNumber = (date: string) => (Date.parse(date) - Date.parse(LAUNCH_DATE)) / 86_400_000 + 1;

// R20: every puzzle file from launch up to yesterday, newest first, with its theme if it has one (D49). Today and later are never listed.
export async function pastPuzzles(today: string, dir = join(process.cwd(), "data/puzzles")) {
  // No folder yet just means nothing is published. next.config.ts already traces the folder,
  // so the ignore comment stops Turbopack tracing the whole project for this dynamic path.
  const files = await readdir(/*turbopackIgnore: true*/ dir).catch((e) => {
    if (e.code !== "ENOENT") throw e;
    return [];
  });
  const dates = files
    .map((f) => /^(\d{4}-\d{2}-\d{2})\.json$/.exec(f)?.[1])
    .filter((d): d is string => !!d && d >= LAUNCH_DATE && d < today)
    .sort()
    .reverse();
  return Promise.all(
    dates.map(async (date) => {
      const { theme }: Puzzle = JSON.parse(await readFile(join(dir, `${date}.json`), "utf8"));
      return { date, number: puzzleNumber(date), theme };
    }),
  );
}

// The only puzzle shape the browser may receive: no counts or notes before a guess is locked in (R13, D7).
export const clientPuzzle = ({ date, number, theme, passwords }: Puzzle & { number: number }) => ({
  date,
  number,
  theme,
  passwords: passwords.map((e) => e.password),
});

import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { generate } from "../scripts/puzzles";
import { LAUNCH_DATE } from "./config";
import { addDays } from "./days";
import { devPasswords } from "./dev-puzzle";
import { clientPuzzle, loadPuzzle, pastPuzzles, playerToday } from "./puzzles";

vi.mock("server-only", () => ({}));
let tz: string | undefined;
const connection = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("next/server", () => ({ connection }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (tz === undefined ? undefined : { value: tz }) }) }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const TODAY = addDays(LAUNCH_DATE, 9);

async function dirWith(...dates: string[]) {
  const dir = await mkdtemp(join(tmpdir(), "pwnedle-"));
  for (const [i, date] of dates.entries()) {
    const status = i % 2 ? "approved" : "draft";
    await writeFile(join(dir, `${date}.json`), JSON.stringify({ date, status, passwords: [] }));
  }
  return dir;
}

test("serves drafts and approved files from launch to today+1, numbered from launch", async () => {
  const days = [LAUNCH_DATE, TODAY, addDays(TODAY, 1)];
  const dir = await dirWith(...days);
  const got = await Promise.all(days.map((d) => loadPuzzle(d, TODAY, dir)));
  expect(got.map((p) => [p?.number, p?.status])).toEqual([[1, "draft"], [10, "approved"], [11, "draft"]]);
});

test("refuses dates outside the window, missing files and bad input", async () => {
  const early = addDays(LAUNCH_DATE, -1);
  const late = addDays(TODAY, 2);
  const dir = await dirWith(early, late);
  for (const date of [early, late, addDays(TODAY, -1), "../config", "2026-10-24.json", ""]) {
    expect(await loadPuzzle(date, TODAY, dir)).toBeNull();
  }
});

test("the archive lists files from launch to yesterday, newest first, never today or later (R20)", async () => {
  const yesterday = addDays(TODAY, -1);
  const dir = await dirWith(addDays(LAUNCH_DATE, -1), LAUNCH_DATE, yesterday, TODAY, addDays(TODAY, 1));
  await writeFile(join(dir, "notes.txt"), "");
  expect(await pastPuzzles(TODAY, dir)).toEqual([
    { date: yesterday, number: 9 },
    { date: LAUNCH_DATE, number: 1 },
  ]);
  expect(await pastPuzzles(TODAY, join(dir, "missing"))).toEqual([]);
});

test("client puzzle has only date, number and password text", () => {
  const p = { date: LAUNCH_DATE, status: "draft" as const, number: 1, passwords: [{ password: "dragon", count: 99, note: "A note." }] };
  expect(clientPuzzle(p)).toEqual({ date: LAUNCH_DATE, number: 1, passwords: ["dragon"] });
});

test("a generated puzzle reaches the client in the order it was written (R4)", async () => {
  // With the 13 days after it already filled, generate writes just this one.
  const day = addDays(TODAY, 1);
  const dir = await dirWith(...Array.from({ length: 13 }, (_, i) => addDays(day, i + 1)));
  const counts = [1, 10, 100, 1_000, 100_000, 1_000_000];
  const candidates = counts.map((_, i) => `pw${i}`);
  await generate(dir, day, { candidates, count: async (pw) => counts[Number(pw.slice(2))], note: async () => "A note.", launch: day });
  const written = JSON.parse(await readFile(join(dir, `${day}.json`), "utf8")).passwords.map((e: { password: string }) => e.password);
  expect(clientPuzzle((await loadPuzzle(day, day, dir))!).passwords).toEqual(written);
});

test("dev serves real files first, the fixture otherwise, ignoring launch but not today+1", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const dir = await dirWith(TODAY);
  expect((await loadPuzzle(TODAY, TODAY, dir))?.number).toBe(10);
  const early = addDays(LAUNCH_DATE, -30);
  expect(await loadPuzzle(early, TODAY, dir)).toEqual({ date: early, status: "draft", number: 0, passwords: devPasswords });
  expect(await loadPuzzle(addDays(TODAY, 2), TODAY, dir)).toBeNull();
});

test("production never serves the fixture", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const dir = await dirWith();
  for (const date of [addDays(LAUNCH_DATE, -1), TODAY]) expect(await loadPuzzle(date, TODAY, dir)).toBeNull();
});

test("fixture passwords never appear in data/puzzles", async () => {
  const dir = join(process.cwd(), "data/puzzles");
  const names = await readdir(dir).catch(() => []);
  const files = await Promise.all(names.map((n) => readFile(join(dir, n), "utf8")));
  for (const { password } of devPasswords) expect(files.some((f) => f.includes(JSON.stringify(password)))).toBe(false);
});

test.each([
  // 23:30 UTC on the 24th: already the 25th in Auckland, still the 24th in Los Angeles.
  ["2026-10-24T23:30:00Z", "Pacific/Auckland", "2026-10-25"],
  ["2026-10-24T23:30:00Z", "America/Los_Angeles", "2026-10-24"],
  // 03:00 UTC on the 25th: Los Angeles hasn't reached midnight yet.
  ["2026-10-25T03:00:00Z", "America/Los_Angeles", "2026-10-24"],
  ["2026-10-24T23:30:00Z", "Not/AZone", "2026-10-24"],
  ["2026-10-24T23:30:00Z", undefined, "2026-10-24"],
])("at %s the tz cookie %s gives the player's date %s, falling back to UTC (R2)", async (now, zone, expected) => {
  vi.useFakeTimers({ now: new Date(now), toFake: ["Date"] });
  tz = zone;
  expect(await playerToday()).toBe(expected);
  // Request time, so pages that read the date are never prerendered with it.
  expect(connection).toHaveBeenCalled();
});

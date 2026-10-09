import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { LAUNCH_DATE } from "./config";
import { addDays } from "./days";
import { clientPuzzle, loadPuzzle } from "./puzzles";

vi.mock("server-only", () => ({}));

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

test("client puzzle has only date, number and password text", () => {
  const p = { date: LAUNCH_DATE, status: "draft" as const, number: 1, passwords: [{ password: "dragon", count: 99, note: "A note." }] };
  expect(clientPuzzle(p)).toEqual({ date: LAUNCH_DATE, number: 1, passwords: ["dragon"] });
});

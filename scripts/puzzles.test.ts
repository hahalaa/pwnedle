import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { addDays, generate, replace, type Puzzle } from "./puzzles";
import { NoValidNoteError } from "./notes";
import { meetsMix, selectReplacement } from "./select";

// Counts cycle through 1, 10, ..., 10,000,000 and 0, as in select.test.ts.
const pool = Array.from({ length: 2000 }, (_, i) => `pw${i}`);
const fakeCount = async (pw: string) => {
  const i = Number(pw.slice(2)) % 9;
  return i === 8 ? 0 : 10 ** i;
};
const deps = { candidates: pool, count: fakeCount, note: async (pw: string) => `Note for ${pw}.` };
const TODAY = "2026-10-08";

const tmp = () => mkdtemp(join(tmpdir(), "puzzles-"));
const read = async (dir: string, date: string): Promise<Puzzle> => JSON.parse(await readFile(join(dir, `${date}.json`), "utf8"));
const allPasswords = async (dir: string) =>
  (await Promise.all((await readdir(dir)).map((n) => read(dir, n.slice(0, 10))))).flatMap((p) => p.passwords.map((e) => e.password));

test("addDays crosses month ends in UTC", () => {
  expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  expect(addDays("2026-10-08", 13)).toBe("2026-10-21");
});

test("generate fills only missing days, today to today+13, with no repeats", async () => {
  const dir = await tmp();
  const existing: Puzzle = {
    date: addDays(TODAY, 3),
    status: "approved",
    passwords: ["pw0", "pw1", "pw2", "pw5", "pw8"].map((password) => ({ password, count: 1, note: "x" })),
  };
  await writeFile(join(dir, `${existing.date}.json`), JSON.stringify(existing));

  const written = await generate(dir, TODAY, deps);

  expect(written).toHaveLength(13);
  expect(written).not.toContain(existing.date);
  expect(written[0]).toBe(TODAY);
  expect(written.at(-1)).toBe(addDays(TODAY, 13));
  expect(await read(dir, existing.date)).toEqual(existing);

  const p = await read(dir, TODAY);
  expect(p.status).toBe("draft");
  expect(meetsMix(p.passwords.map((e) => e.count))).toBe(true);
  expect(p.passwords[0].note).toBe(`Note for ${p.passwords[0].password}.`);

  const all = await allPasswords(dir);
  expect(new Set(all).size).toBe(all.length);

  expect(await generate(dir, TODAY, deps)).toEqual([]);
});

test("replace swaps one password in a draft, keeping R3 and R5", async () => {
  const dir = await tmp();
  await generate(dir, TODAY, deps);
  const date = addDays(TODAY, 5);
  const before = await read(dir, date);

  await replace(dir, date, 2, TODAY, deps);

  const after = await read(dir, date);
  expect(after.passwords[2].password).not.toBe(before.passwords[2].password);
  expect(after.passwords.filter((_, i) => i !== 2)).toEqual(before.passwords.filter((_, i) => i !== 2));
  expect(after.passwords[2].note).toBe(`Note for ${after.passwords[2].password}.`);
  expect(meetsMix(after.passwords.map((e) => e.count))).toBe(true);
  const all = await allPasswords(dir);
  expect(new Set(all).size).toBe(all.length);
});

test("replace refuses servable dates, approved files and bad input", async () => {
  const dir = await tmp();
  await generate(dir, TODAY, deps);
  const p = await read(dir, addDays(TODAY, 4));
  await writeFile(join(dir, `${p.date}.json`), JSON.stringify({ ...p, status: "approved" }));

  await expect(replace(dir, addDays(TODAY, 1), 0, TODAY, deps)).rejects.toThrow("can already be served");
  await expect(replace(dir, p.date, 0, TODAY, deps)).rejects.toThrow("approved");
  await expect(replace(dir, addDays(TODAY, 20), 0, TODAY, deps)).rejects.toThrow("No puzzle file");
  await expect(replace(dir, addDays(TODAY, 5), 5, TODAY, deps)).rejects.toThrow("Index");
  await expect(replace(dir, "../etc/passwd", 0, TODAY, deps)).rejects.toThrow("Bad date");
});

test("selectReplacement skips used and unclean passwords and candidates that break R3", async () => {
  const count = vi.fn(fakeCount);
  // Without a count of 100 or less, only pw0, pw1, pw2 (1, 10, 100) or pw8 (0) can fit.
  const e = await selectReplacement([...pool.slice(0, 9), "fuckyou1"], new Set(["pw0", "pw1", "pw2"]), [1_000, 10_000, 100_000, 1_000_000], count);
  expect(e).toEqual({ password: "pw8", count: 0 });
  expect(count.mock.calls.map(([pw]) => pw)).not.toContain("fuckyou1");
  await expect(selectReplacement(["pw3"], new Set(), [1_000, 10_000, 100_000, 1_000_000], fakeCount)).rejects.toThrow("No candidate");
});

test("generate swaps a password whose note keeps failing, and fails only when the pool runs out", async () => {
  const bad = new Set(pool.slice(0, 500));
  const note = async (pw: string) => {
    if (bad.has(pw)) throw new NoValidNoteError("no note");
    return `Note for ${pw}.`;
  };
  const dir = await tmp();
  expect(await generate(dir, TODAY, { ...deps, note })).toHaveLength(14);
  for (const n of await readdir(dir)) {
    const p = await read(dir, n.slice(0, 10));
    expect(p.passwords.some((e) => bad.has(e.password))).toBe(false);
    expect(meetsMix(p.passwords.map((e) => e.count))).toBe(true);
  }

  const noNotes = async () => { throw new NoValidNoteError("no note"); };
  await expect(generate(await tmp(), TODAY, { ...deps, note: noNotes })).rejects.toThrow("No candidate");

  const apiDown = vi.fn(async () => { throw new Error("401 invalid x-api-key"); });
  await expect(generate(await tmp(), TODAY, { ...deps, note: apiDown })).rejects.toThrow("401");
  expect(apiDown).toHaveBeenCalledTimes(1);
});

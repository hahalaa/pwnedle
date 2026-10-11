import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { addDays, frozenChanges, generate, replace, validate, type Puzzle } from "./puzzles";
import { NoValidNoteError } from "./notes";
import { baseWord, meetsMix, selectReplacement } from "./select";

// Counts cycle through 1, 10, ..., 10,000,000 and 0, as in select.test.ts.
// Each index spelled in consonants keeps base words distinct: pw(12) is "cd12" (D33).
const pw = (i: number) => [...String(i)].map((d) => "bcdfghjklm"[+d]).join("") + i;
const pool = Array.from({ length: 2000 }, (_, i) => pw(i));
const fakeCount = async (pw: string) => {
  const i = Number(pw.replace(/\D/g, "")) % 9;
  return i === 8 ? 0 : 10 ** i;
};
const TODAY = "2026-10-08";
const deps = { candidates: pool, count: fakeCount, note: async (pw: string) => `Note for ${pw}.`, launch: TODAY };

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
    passwords: [0, 1, 2, 5, 8].map(pw).map((password) => ({ password, count: 1, note: "x" })),
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

test("before launch, generate writes the 14 days from launch", async () => {
  const dir = await tmp();
  const launch = addDays(TODAY, 10);
  const written = await generate(dir, TODAY, { ...deps, launch });
  expect(written).toEqual(Array.from({ length: 14 }, (_, i) => addDays(launch, i)));
  expect(await readdir(dir)).toHaveLength(14);
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
  const e = await selectReplacement([...pool.slice(0, 9), "fuckyou1"], new Set([0, 1, 2].map(pw)), [1_000, 10_000, 100_000, 1_000_000], count);
  expect(e).toEqual({ password: pw(8), count: 0 });
  expect(count.mock.calls.map(([pw]) => pw)).not.toContain("fuckyou1");
  await expect(selectReplacement([pw(3)], new Set(), [1_000, 10_000, 100_000, 1_000_000], fakeCount)).rejects.toThrow("No candidate");
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

test("validate passes generated drafts and warns only on drafts in the next 7 days", async () => {
  const dir = await tmp();
  await generate(dir, TODAY, deps);
  const approved = await read(dir, addDays(TODAY, 2));
  await writeFile(join(dir, `${approved.date}.json`), JSON.stringify({ ...approved, status: "approved" }));

  const { errors, warnings } = await validate(dir, TODAY);
  expect(errors).toEqual([]);
  expect(warnings).toEqual([0, 1, 3, 4, 5, 6].map((i) => `${addDays(TODAY, i)} is still a draft`));
  expect(await validate(await tmp(), TODAY)).toEqual({ errors: [], warnings: [] });
});

test("validate reports mix, reuse, content, note and shape errors", async () => {
  const dir = await tmp();
  await generate(dir, TODAY, { ...deps, launch: addDays(TODAY, 12) });
  const [a, b] = [12, 13].map((i) => addDays(TODAY, i));
  const p = await read(dir, a);
  const q = await read(dir, b);
  p.passwords.forEach((e) => (e.count = 5_000));
  p.passwords[1] = { ...p.passwords[1], password: "fuckyou1" };
  p.passwords[2].note = "This one appears in the RockYou dump.";
  q.passwords[0] = { ...q.passwords[0], count: 1_000_000, note: "A rare pick that few people choose." };
  q.passwords[3].password = p.passwords[3].password;
  q.passwords[4].count = -1;
  await writeFile(join(dir, `${a}.json`), JSON.stringify(p));
  await writeFile(join(dir, `${b}.json`), JSON.stringify(q));
  await writeFile(join(dir, "2026-01-01.json"), JSON.stringify({ ...p, date: "2026-01-02", passwords: [] }));
  await writeFile(join(dir, "2026-01-03.json"), "{");

  const { errors } = await validate(dir, TODAY);
  expect(errors).toEqual(expect.arrayContaining([
    `${a}.json: counts break the mix rules (R3)`,
    `${a}.json: password 1 fails the content filter`,
    `${a}.json: note 2: names a breach`,
    `${b}.json: note 0: contradicts band "extremely common"`,
    `${b}.json: password 3 is also in ${a}.json`,
    `${b}.json: password 4 has a bad count`,
    "2026-01-01.json: date 2026-01-02 does not match the file name",
    "2026-01-01.json: needs exactly 5 passwords",
    "2026-01-03.json: not valid JSON",
  ]));
});

test("generate and replace never place one base word twice within 14 days (D33)", async () => {
  const dir = await tmp();
  // 150 base words, each in two forms, so picking without the rule would clash.
  const candidates = pool.slice(0, 150).flatMap((p) => [p, p.replace(/\d+$/, "").toUpperCase() + p.replace(/\D/g, "")]);
  await generate(dir, TODAY, { ...deps, candidates });
  for (const i of [3, 7, 11]) await replace(dir, addDays(TODAY, i), 0, TODAY, { ...deps, candidates });
  expect((await validate(dir, TODAY)).errors).toEqual([]);
});

test("validate flags a shared base word under 14 days apart, not 14 or more (D33)", async () => {
  const dir = await tmp();
  await generate(dir, TODAY, deps);
  const [d0, d13, d14] = [0, 13, 14].map((i) => addDays(TODAY, i));
  const p = await read(dir, d0);
  const q = await read(dir, d13);
  const [twin, far] = [0, 2].map((i) => p.passwords[i].password.toUpperCase() + "!");
  q.passwords[0].password = twin;
  p.passwords[1].password = "2020";
  q.passwords[1].password = "1962";
  await writeFile(join(dir, `${d0}.json`), JSON.stringify(p));
  await writeFile(join(dir, `${d13}.json`), JSON.stringify(q));
  const r = { date: d14, status: "draft", passwords: [far, "11", "22", "33", "44"].map((password) => ({ password, count: 1, note: "x" })) };
  await writeFile(join(dir, `${d14}.json`), JSON.stringify(r));

  const { errors } = await validate(dir, TODAY);
  expect(errors.filter((e) => e.includes("base word"))).toEqual([
    `${d13}.json: password 0 shares the base word "${baseWord(twin)}" with ${d0}.json, under 14 days apart (D33)`,
  ]);
});

test("frozenChanges rejects edits and deletions before today+2 and allows new files", () => {
  const f = (status: string, date: string) => frozenChanges(`${status}\tdata/puzzles/${date}.json\n`, TODAY);
  expect(f("M", "2026-10-01")).toHaveLength(1);
  expect(f("D", "2026-10-01")).toHaveLength(1);
  expect(f("M", addDays(TODAY, 1))).toHaveLength(1);
  expect(f("M", addDays(TODAY, 2))).toEqual([]);
  expect(f("A", "2026-10-01")).toEqual([]);
  expect(f("A", addDays(TODAY, 1))).toEqual([]);
});

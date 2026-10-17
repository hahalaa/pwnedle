import { expect, test, vi } from "vitest";
import { POST } from "./route";

vi.mock("../../../lib/puzzles", () => ({
  loadPuzzle: async (date: string) =>
    date === "2026-10-24"
      ? { date, status: "draft", number: 1, passwords: [{ password: "dragon", count: 99, note: "A note." }] }
      : null,
}));

const post = (body: unknown) =>
  POST(new Request("http://x/api/guess", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

test("returns count, score, tier and note for the locked-in password", async () => {
  const res = await post({ date: "2026-10-24", index: 0, guess: 9 });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ count: 99, score: 53, tier: "Mid", note: "A note." });
});

test("accepts both ends of the guess range", async () => {
  for (const guess of [0, 100_000_000]) expect((await post({ date: "2026-10-24", index: 0, guess })).status).toBe(200);
});

test("rejects bad input with 400", async () => {
  const bad = [
    "not json",
    null,
    { index: 0, guess: 1 },
    { date: "2026-10-24", index: "0", guess: 1 },
    { date: "2026-10-24", index: 0, guess: -1 },
    { date: "2026-10-24", index: 0, guess: 100_000_001 },
    { date: "2026-10-24", index: 0, guess: 1.5 },
    { date: "2026-10-24", index: 0, guess: "5" },
  ];
  for (const body of bad) expect((await post(body)).status).toBe(400);
});

test("returns 404 for unknown dates and indexes", async () => {
  for (const body of [{ date: "2026-10-23", index: 0, guess: 1 }, { date: "2026-10-24", index: 1, guess: 1 }, { date: "2026-10-24", index: -1, guess: 1 }]) {
    expect((await post(body)).status).toBe(404);
  }
});

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GET, POST } from "./route";

// Counts 1, 10, 100, 1,000 and 10,000, so guessing them exactly scores 500. Served for any date the window allows.
vi.mock("../../../lib/puzzles", () => ({
  loadPuzzle: async (date: string) =>
    date >= "2026-10-20" && date <= "2026-10-25"
      ? { date, status: "draft", number: 1, passwords: [1, 10, 100, 1000, 10000].map((count) => ({ password: "x", count, note: "" })) }
      : null,
}));

beforeEach(() => vi.useFakeTimers({ now: new Date("2026-10-24T12:00:00Z"), toFake: ["Date"] }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const post = (body: unknown) =>
  POST(new Request("http://x/api/scores", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
const counts = async (date: string) => (await (await GET(new Request(`http://x/api/scores?date=${date}`))).json()).counts;
const exact = [1, 10, 100, 1000, 10000];
const upstashEnv = () => {
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "write");
  vi.stubEnv("KV_REST_API_READ_ONLY_TOKEN", "read");
};

test("scores the guesses itself and counts each total per date, ignoring any score the browser sends", async () => {
  expect((await post({ date: "2026-10-24", guesses: exact, total: 3 })).status).toBe(200);
  expect((await post({ date: "2026-10-24", guesses: exact })).status).toBe(200);
  // Guessing 0 for each scores 94 + 50 + 8 + 0 + 0.
  expect((await post({ date: "2026-10-23", guesses: [0, 0, 0, 0, 0] })).status).toBe(200);
  expect(await counts("2026-10-24")).toEqual({ 500: 2 });
  expect(await counts("2026-10-23")).toEqual({ 152: 1 });
  expect(await counts("2026-10-21")).toEqual({});
});

test("each POST returns the day's counts with that player in, for players a minute apart (T69)", async () => {
  const sent = async (guesses: number[]) => (await (await post({ date: "2026-10-25", guesses })).json()).counts;
  expect(await sent(exact)).toEqual({ 500: 1 });
  vi.setSystemTime(new Date("2026-10-24T12:01:00Z"));
  expect(await sent([0, 0, 0, 0, 0])).toEqual({ 500: 1, 152: 1 });
});

test("rejects bad input with 400", async () => {
  const bad = [
    "not json",
    null,
    { guesses: exact },
    { date: "2026-10-24" },
    { date: "2026-10-24", guesses: exact.slice(1) },
    { date: "2026-10-24", guesses: [...exact, 1] },
    { date: "2026-10-24", guesses: [1.5, 10, 100, 1000, 10000] },
    { date: "2026-10-24", guesses: [-1, 10, 100, 1000, 10000] },
    { date: "2026-10-24", guesses: [100_000_001, 10, 100, 1000, 10000] },
    { date: "2026-10-24", guesses: ["1", 10, 100, 1000, 10000] },
    { date: ["2026-10-24"], guesses: exact },
  ];
  for (const body of bad) expect((await post(body)).status).toBe(400);
});

test("rejects oversized bodies with 413", async () => {
  expect((await post({ date: "2026-10-24", guesses: exact, pad: "x".repeat(1000) })).status).toBe(413);
});

test("rejects dates older than UTC today-1 or outside the window with 404", async () => {
  for (const date of ["2026-10-22", "2026-10-26"]) expect((await post({ date, guesses: exact })).status).toBe(404);
  expect((await GET(new Request("http://x/api/scores?date=2026-10-26"))).status).toBe(404);
  expect((await GET(new Request("http://x/api/scores"))).status).toBe(404);
});

test("adds each password's points and sends their averages from 10 players, never per player (T72, D53)", async () => {
  const body = async (date: string) => (await GET(new Request(`http://x/api/scores?date=${date}`))).json();
  // A date no other test posts to, since the in-memory store lasts the whole file.
  vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
  // Exact guesses score 100 each; guessing 0 scores 94, 50, 8, 0 and 0.
  for (let i = 0; i < 9; i++) await post({ date: "2026-10-20", guesses: i < 6 ? exact : [0, 0, 0, 0, 0] });
  expect(await body("2026-10-20")).toEqual({ counts: { 500: 6, 152: 3 } });
  const tenth = await (await post({ date: "2026-10-20", guesses: [0, 10, 100, 1000, 0] })).json();
  // Password 1: (6 × 100 + 4 × 94) / 10; password 5: 6 × 100 / 10.
  expect(tenth.averages).toEqual([97.6, 85, 72.4, 70, 60]);
  expect(await body("2026-10-20")).toEqual(tenth);
});

test("uses Upstash with the write token for a POST and its read-back, and the read-only token for GETs", async () => {
  upstashEnv();
  const hashes: Record<string, string[]> = { "scores:2026-10-24": ["500", "3", "12", "1"], "points:2026-10-24": ["n", "10", "0", "400", "1", "1000", "2", "500", "3", "1000", "4", "1000"] };
  const fetch = vi.fn(async (_: string, init: RequestInit) => {
    const [command, key] = JSON.parse(init.body as string);
    return Response.json({ result: command === "HGETALL" ? hashes[key] : 1 });
  });
  vi.stubGlobal("fetch", fetch);
  const scores = { counts: { 500: 3, 12: 1 }, averages: [40, 100, 50, 100, 100] };
  expect(await (await post({ date: "2026-10-24", guesses: exact })).json()).toEqual(scores);
  expect(await (await GET(new Request("http://x/api/scores?date=2026-10-24"))).json()).toEqual(scores);
  const calls = fetch.mock.calls.map(([url, init]) => [url, (init.headers as Record<string, string>).Authorization, JSON.parse(init.body as string)]);
  expect(calls).toEqual([
    ["https://kv.test", "Bearer write", ["HINCRBY", "scores:2026-10-24", 500, 1]],
    ["https://kv.test", "Bearer write", ["HINCRBY", "points:2026-10-24", "n", 1]],
    ...[0, 1, 2, 3, 4].map((i) => ["https://kv.test", "Bearer write", ["HINCRBY", "points:2026-10-24", i, 100]]),
    ["https://kv.test", "Bearer write", ["HGETALL", "scores:2026-10-24"]],
    ["https://kv.test", "Bearer write", ["HGETALL", "points:2026-10-24"]],
    ["https://kv.test", "Bearer read", ["HGETALL", "scores:2026-10-24"]],
    ["https://kv.test", "Bearer read", ["HGETALL", "points:2026-10-24"]],
  ]);
});

test("lets the CDN cache a day's counts but never a 404 (T65)", async () => {
  const cache = async (url: string) => (await GET(new Request(url))).headers.get("Cache-Control");
  expect(await cache("http://x/api/scores?date=2026-10-24")).toBe("public, s-maxage=15, stale-while-revalidate=30");
  expect(await cache("http://x/api/scores?date=2026-10-26")).toBeNull();
});

test("a store failure returns a plain 503", async () => {
  upstashEnv();
  vi.stubGlobal("fetch", async () => Response.json({ error: "WRONGPASS invalid password" }, { status: 401 }));
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  for (const res of [await post({ date: "2026-10-24", guesses: exact }), await GET(new Request("http://x/api/scores?date=2026-10-24"))]) {
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Unavailable" });
    expect(res.headers.get("Cache-Control")).toBeNull();
  }
  expect(error).toHaveBeenCalledTimes(2);
});

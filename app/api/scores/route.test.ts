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
  expect((await post({ date: "2026-10-24", guesses: exact, total: 3 })).status).toBe(204);
  expect((await post({ date: "2026-10-24", guesses: exact })).status).toBe(204);
  // Guessing 0 for each scores 94 + 50 + 8 + 0 + 0.
  expect((await post({ date: "2026-10-23", guesses: [0, 0, 0, 0, 0] })).status).toBe(204);
  expect(await counts("2026-10-24")).toEqual({ 500: 2 });
  expect(await counts("2026-10-23")).toEqual({ 152: 1 });
  expect(await counts("2026-10-21")).toEqual({});
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

test("uses Upstash with the write token for counts and the read-only token for reads", async () => {
  upstashEnv();
  const fetch = vi.fn(async (_: string, init: RequestInit) =>
    Response.json({ result: JSON.parse(init.body as string)[0] === "HGETALL" ? ["500", "3", "12", "1"] : 1 }),
  );
  vi.stubGlobal("fetch", fetch);
  expect((await post({ date: "2026-10-24", guesses: exact })).status).toBe(204);
  expect(await counts("2026-10-24")).toEqual({ 500: 3, 12: 1 });
  const calls = fetch.mock.calls.map(([url, init]) => [url, (init.headers as Record<string, string>).Authorization, JSON.parse(init.body as string)]);
  expect(calls).toEqual([
    ["https://kv.test", "Bearer write", ["HINCRBY", "scores:2026-10-24", 500, 1]],
    ["https://kv.test", "Bearer read", ["HGETALL", "scores:2026-10-24"]],
  ]);
});

test("lets the CDN cache a day's counts but never a 404 (T65)", async () => {
  const cache = async (url: string) => (await GET(new Request(url))).headers.get("Cache-Control");
  expect(await cache("http://x/api/scores?date=2026-10-24")).toBe("public, s-maxage=60, stale-while-revalidate=300");
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

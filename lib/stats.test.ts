import { afterEach, expect, test, vi } from "vitest";
import { type Game, highlights, loadGame, savedGames, saveGame, stats } from "./stats";

const finished = (...scores: number[]): Game => ({ index: 4, done: true, results: scores.map((score) => ({ score })) });

test("stats count finished games only, with average, best and daily tier distribution (R17)", () => {
  const s = stats(
    {
      "2026-10-24": finished(100, 100, 100, 100, 100),
      "2026-10-25": finished(100, 65, 90, 35, 100),
      "2026-10-26": finished(0, 0, 0, 0, 1),
      "2026-10-27": { index: 2, done: false, results: [{ score: 100 }, { score: 100 }, { score: 100 }] },
    },
    "2026-10-27",
  );
  expect(s.played).toBe(3);
  expect(s.average).toBe(Math.round((500 + 390 + 1) / 3));
  expect(s.best).toBe(500);
  expect(s.tiers).toEqual([["Uncrackable", 1], ["Strong", 1], ["Mid", 0], ["Weak", 0], ["Pwned", 1]]);
});

test("streaks run over consecutive puzzle dates and the current one ends after a missed day", () => {
  const games = {
    "2026-10-24": finished(50),
    "2026-10-25": finished(50),
    "2026-10-26": finished(50),
    "2026-10-28": finished(50),
    "2026-10-29": finished(50),
  };
  // Today not played yet: the run ending yesterday still counts.
  expect(stats(games, "2026-10-30")).toMatchObject({ current: 2, max: 3 });
  expect(stats(games, "2026-10-29")).toMatchObject({ current: 2, max: 3 });
  expect(stats(games, "2026-10-31")).toMatchObject({ current: 0, max: 3 });
  // Across a month end.
  expect(stats({ "2026-10-31": finished(50), "2026-11-01": finished(50) }, "2026-11-01")).toMatchObject({ current: 2, max: 2 });
  expect(stats({}, "2026-10-24")).toEqual({ played: 0, average: 0, best: 0, current: 0, max: 0, tiers: expect.any(Array) });
});

test("archive games are left out of stats and streaks (R18)", () => {
  const games = { "2026-10-24": finished(50), "2026-10-25": { ...finished(500), archive: true }, "2026-10-26": finished(50) };
  expect(stats(games, "2026-10-26")).toMatchObject({ played: 2, best: 50, current: 1, max: 1 });
});

// A finished game whose five scores add up to `total`.
const day = (total: number): Game => finished(total, 0, 0, 0, 0);
const dates = (h: ReturnType<typeof highlights>, k: "best" | "worst") => h![k].map((d) => d.date);

test("highlights stay hidden until 3 daily games are finished, and leave out archive and unfinished games (D57)", () => {
  const games: Record<string, Game> = {
    "2026-10-24": day(300),
    "2026-10-25": { ...day(500), archive: true },
    "2026-10-26": { index: 1, done: false, results: [{ score: 90 }] },
    "2026-10-27": day(200),
  };
  expect(highlights(games)).toBeNull();
  games["2026-10-28"] = day(400);
  expect(highlights(games)).toMatchObject({
    best: [
      { date: "2026-10-28", number: 9, total: 400, tier: "Strong" },
      { date: "2026-10-24", number: 5, total: 300 },
      { date: "2026-10-27", number: 8, total: 200 },
    ],
    // With 3 games every day is a best one, so no worst days yet.
    worst: [],
  });
});

test("with fewer than 6 games a day is never both best and worst; ties go to the more recent day (D57)", () => {
  const games = { "2026-10-24": day(300), "2026-10-25": day(100), "2026-10-26": day(300), "2026-10-27": day(200), "2026-10-28": day(100) };
  const h = highlights(games);
  expect(dates(h, "best")).toEqual(["2026-10-26", "2026-10-24", "2026-10-27"]);
  expect(dates(h, "worst")).toEqual(["2026-10-28", "2026-10-25"]);
  // All tied: newest first in both lists, still no repeats.
  const flat = Object.fromEntries(["24", "25", "26", "27", "28", "29", "30"].map((d) => [`2026-10-${d}`, day(250)]));
  expect(dates(highlights(flat), "best")).toEqual(["2026-10-30", "2026-10-29", "2026-10-28"]);
  expect(dates(highlights(flat), "worst")).toEqual(["2026-10-27", "2026-10-26", "2026-10-25"]);
});

test("best guess and worst miss come from every saved daily reveal, with the reveal's wording (D57)", () => {
  const reveal = (guess: number, count: number, password?: string) => ({ score: 50, guess, count, password });
  const games: Record<string, Game> = {
    "2026-10-24": { index: 5, done: true, results: [reveal(99, 999), reveal(5, 5)] },
    "2026-10-25": { index: 5, done: true, results: [reveal(5, 5, "hunter2"), reveal(0, 99_999_999, "qwerty")] },
    // Unfinished daily games still count; archive ones never do.
    "2026-10-26": { index: 1, done: false, results: [reveal(1, 0, "abc")] },
    "2026-10-27": { index: 5, done: true, archive: true, results: [reveal(99_999_999, 0, "zzz")] },
    "2026-10-28": { index: 5, done: true, results: [reveal(1000, 0)] },
  };
  const h = highlights(games)!;
  // Two exact guesses tie; the more recent one wins.
  expect(h.guess).toMatchObject({ password: "hunter2", number: 6, index: 0, text: "Exact" });
  expect(h.miss).toMatchObject({ password: "qwerty", number: 6, text: "100m× too low" });
  // A result saved before T81 has no password.
  games["2026-10-25"].results[0].password = undefined;
  games["2026-10-25"].results[0].guess = 4;
  expect(highlights(games)!.guess).toMatchObject({ password: undefined, number: 5, index: 1, text: "Exact" });
});

afterEach(() => vi.unstubAllGlobals());

test("games round-trip through localStorage under pwnedle:<date> (R16)", () => {
  const store: Record<string, string> = { other: "x" };
  vi.stubGlobal("localStorage", Object.assign(store, { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) }));
  const g = finished(10, 20);
  saveGame("2026-10-24", g);
  expect(store["pwnedle:2026-10-24"]).toBe(JSON.stringify(g));
  expect(loadGame("2026-10-24")).toEqual(g);
  expect(loadGame("2026-10-25")).toBeNull();
  expect(savedGames()).toEqual({ "2026-10-24": g });
});

test("a saved game takes its tiers again from the scores, under the current bands (D40, D56)", () => {
  const results = [{ score: 50, tier: "Medium" }, { score: 88, tier: "Strong" }, { score: 12, tier: "Weak" }];
  const store: Record<string, string> = { "pwnedle:2026-10-24": JSON.stringify({ index: 1, done: false, results }) };
  vi.stubGlobal("localStorage", { getItem: (k: string) => store[k] ?? null });
  expect(loadGame("2026-10-24")?.results).toEqual([{ score: 50, tier: "Mid" }, { score: 88, tier: "Uncrackable" }, { score: 12, tier: "Pwned" }]);
});

test("blocked storage never breaks the game", () => {
  const boom = () => {
    throw new Error("SecurityError");
  };
  vi.stubGlobal("localStorage", new Proxy({}, { get: boom, ownKeys: boom }));
  expect(loadGame("2026-10-24")).toBeNull();
  expect(() => saveGame("2026-10-24", finished(1))).not.toThrow();
  expect(savedGames()).toEqual({});
});

import { afterEach, expect, test, vi } from "vitest";
import { type Game, loadGame, savedGames, saveGame, stats } from "./stats";

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
  expect(s.tiers).toEqual([["Uncrackable", 1], ["Strong", 1], ["Medium", 0], ["Weak", 0], ["Pwned", 1]]);
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

test("blocked storage never breaks the game", () => {
  const boom = () => {
    throw new Error("SecurityError");
  };
  vi.stubGlobal("localStorage", new Proxy({}, { get: boom, ownKeys: boom }));
  expect(loadGame("2026-10-24")).toBeNull();
  expect(() => saveGame("2026-10-24", finished(1))).not.toThrow();
  expect(savedGames()).toEqual({});
});

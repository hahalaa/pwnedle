import { addDays } from "./days";
import { tier } from "./scoring";

// R16: one saved game per puzzle date, under `pwnedle:<date>` in localStorage.
export type Game = { index: number; done: boolean; results: { score: number }[] };

const TIERS = ["Uncrackable", "Strong", "Medium", "Weak", "Pwned"];

// R17: only finished games count. A streak is a run of consecutive puzzle dates; the current one
// survives until a whole day is missed, so it still counts on the morning before today's game.
export function stats(games: Record<string, Game>, today: string) {
  const dates = Object.keys(games).filter((d) => games[d].done).sort();
  const totals = dates.map((d) => games[d].results.reduce((a, r) => a + r.score, 0));
  let run = 0;
  let max = 0;
  dates.forEach((d, i) => {
    run = i > 0 && addDays(dates[i - 1], 1) === d ? run + 1 : 1;
    max = Math.max(max, run);
  });
  const last = dates.at(-1);
  return {
    played: totals.length,
    average: Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) || 0,
    best: Math.max(0, ...totals),
    current: last === today || (last && addDays(last, 1) === today) ? run : 0,
    max,
    tiers: TIERS.map((t) => [t, totals.filter((s) => tier(s / 5) === t).length] as const),
  };
}

// localStorage can throw (blocked storage, some private modes); the game still plays, it just won't resume.
const KEY = "pwnedle:";

export function loadGame(date: string): Game | null {
  try {
    return JSON.parse(localStorage.getItem(KEY + date) ?? "null");
  } catch {
    return null;
  }
}

export function saveGame(date: string, game: Game) {
  try {
    localStorage.setItem(KEY + date, JSON.stringify(game));
  } catch {}
}

export function savedGames() {
  const games: Record<string, Game> = {};
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(KEY)) games[k.slice(KEY.length)] = JSON.parse(localStorage[k]);
  } catch {}
  return games;
}

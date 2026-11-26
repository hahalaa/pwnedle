import { addDays, puzzleNumber } from "./days";
import { missRatio } from "./guess";
import { tier } from "./scoring";

// R16: one saved game per puzzle date, under `pwnedle:<date>` in localStorage.
// `archive` marks a game last played from the archive (R18).
// Results saved since T81 also keep their password, for the stats highlights.
export type Game = { index: number; done: boolean; results: { score: number; guess?: number; count?: number; password?: string }[]; archive?: boolean };

export const TIERS = ["Uncrackable", "Strong", "Mid", "Weak", "Pwned"];

// R17: only finished daily games count; archive games are left out (R18). A streak is a run of
// consecutive puzzle dates; the current one survives until a whole day is missed, so it still counts
// on the morning before today's game.
export function stats(games: Record<string, Game>, today: string) {
  const dates = Object.keys(games).filter((d) => games[d].done && !games[d].archive).sort();
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

// D57: best and worst days and reveals from daily games only (R18), hidden until 3 daily games are finished. Ties go to
// the more recent day, and a day is never in both lists.
export function highlights(games: Record<string, Game>) {
  const daily = Object.keys(games).filter((d) => !games[d].archive).sort().reverse();
  const days = daily
    .filter((d) => games[d].done)
    .map((date) => {
      const total = games[date].results.reduce((a, r) => a + r.score, 0);
      return { date, number: puzzleNumber(date), total, tier: tier(total / 5) };
    });
  if (days.length < 3) return null;
  // Sorting is stable, so on a tie the newer day stays first.
  const best = [...days].sort((a, b) => b.total - a.total).slice(0, 3);
  const worst = [...days].sort((a, b) => a.total - b.total).filter((d) => !best.includes(d)).slice(0, 3);
  const reveals = daily.flatMap((date) =>
    games[date].results
      .map(({ guess = 0, count = 0, password }, i) => ({ number: puzzleNumber(date), index: i, password, text: missRatio(guess, count), off: (Math.max(guess, count) + 1) / (Math.min(guess, count) + 1) }))
      .reverse(),
  );
  return { best, worst, guess: reveals.reduce((a, r) => (r.off < a.off ? r : a)), miss: reveals.reduce((a, r) => (r.off > a.off ? r : a)) };
}

// localStorage can throw (blocked storage, some private modes); the game still plays, it just won't resume.
const KEY = "pwnedle:";

// Saved results store the tier name from the bands of their day; work it out again from the score so old games use the current bands (D56).
export function loadGame(date: string): Game | null {
  try {
    return JSON.parse(localStorage.getItem(KEY + date) ?? "null", (k, v) => (v?.tier ? { ...v, tier: tier(v.score) } : v));
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

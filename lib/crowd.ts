import { formatGuess } from "./guess";
import { tier } from "./scoring";
import { TIERS } from "./stats";

// T64: the day's counts from GET /api/scores ({ "<total>": players }) seen from one player's total. A daily game was
// sent on See results (D51), so one player at `total` is taken to be this player; the others are everyone else.
// If the counts don't hold it yet (cached, or the POST still in flight), this drops someone else with the same total.
export function crowd(counts: Record<string, number>, total: number, sent: boolean) {
  const others = Object.entries(counts).map(([k, n]) => [Number(k), sent && Number(k) === total ? Math.max(0, n - 1) : n] as const);
  const rest = others.reduce((a, [, n]) => a + n, 0);
  const lower = others.reduce((a, [t, n]) => a + (t < total ? n : 0), 0);
  // The chart shows everyone who played, so a sent game counts once at its own total.
  const all = sent ? [...others, [total, 1] as const] : others;
  const players = rest + (sent ? 1 : 0);
  // 20 bars of 25 points, 500 in the top one. Tier bands are multiples of 25, so each bar sits in one tier.
  const bins = Array<number>(20).fill(0);
  for (const [t, n] of all) bins[Math.min(19, Math.floor(t / 25))] += n;
  return {
    players,
    lower,
    others: rest,
    bins,
    tiers: TIERS.map((name) => [name, Math.round((100 * all.reduce((a, [t, n]) => a + (tier(t / 5) === name ? n : 0), 0)) / (players || 1))] as const),
  };
}

// The one line under the total. Under 10 players it gives counts, since a percentage of a handful says little.
export function crowdLine(c: ReturnType<typeof crowd>, archive?: boolean) {
  const when = archive ? "that day" : "so far today";
  // "Better than" counts strictly lower totals among the others, rounded down so it never overstates.
  if (c.players >= 10) return `Better than ${Math.floor((100 * c.lower) / c.others)}% of ${archive ? "that day's" : "today's"} players`;
  // No one else: a sent game alone. An archive day with no players at all never reaches here (app/round.tsx).
  if (!c.others) return archive ? "You were the only player that day" : "You're the first player today";
  return `Better than ${c.lower} of ${formatGuess(c.others)} player${c.others > 1 ? "s" : ""} ${when}`;
}

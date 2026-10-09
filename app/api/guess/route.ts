import { loadPuzzle } from "../../../lib/puzzles";
import { score, tier } from "../../../lib/scoring";

// R14: stateless lock-in. Reveals one password's count and note in return for a guess (D7).
export async function POST(req: Request) {
  const { date, index, guess } = (await req.json().catch(() => null)) ?? {};
  // R8: guesses are whole numbers from 0 to 100,000,000.
  if (typeof date !== "string" || !Number.isInteger(index) || !Number.isInteger(guess) || guess < 0 || guess > 100_000_000) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  // Out-of-range indexes and dates outside the window (R2) both land here.
  const entry = (await loadPuzzle(date))?.passwords[index];
  if (!entry) return Response.json({ error: "Not found" }, { status: 404 });
  const s = score(guess, entry.count);
  return Response.json({ count: entry.count, score: s, tier: tier(s), note: entry.note });
}

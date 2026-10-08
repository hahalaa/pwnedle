import { isClean } from "./filter.ts";
import { pwnedCount } from "./pwned.ts";

type Entry = { password: string; count: number };

// Order of magnitude as digit count. 0 shares a bucket with 1 to 9, the stricter reading of R3.
const magnitude = (count: number) => String(count).length;

// R3: one count of 100 or less, one of 100,000 or more, 4 or more magnitudes, at most one 0.
export function meetsMix(counts: number[]): boolean {
  return (
    counts.length === 5 &&
    counts.some((c) => c <= 100) &&
    counts.some((c) => c >= 100_000) &&
    new Set(counts.map(magnitude)).size >= 4 &&
    counts.filter((c) => c === 0).length <= 1
  );
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 5 counted entries meeting R3, or null if none yet. Only the low pick may be a 0.
function pick(seen: Entry[]): Entry[] | null {
  const low = seen.find((e) => e.count <= 100);
  const high = seen.find((e) => e.count >= 100_000);
  if (!low || !high) return null;
  const chosen = [low, high];
  for (const e of seen) {
    if (chosen.length < 5 && e.count > 0 && !chosen.some((c) => magnitude(c.count) === magnitude(e.count))) chosen.push(e);
  }
  for (const e of seen) if (chosen.length < 5 && e.count > 0 && !chosen.includes(e)) chosen.push(e);
  return meetsMix(chosen.map((e) => e.count)) ? chosen : null;
}

// One puzzle of 5 passwords meeting R3, none in `used` (R5, R31), in random order (R4).
// Counts are looked up one at a time in shuffled order and stop once a puzzle fits.
export async function selectPuzzle(
  candidates: string[],
  used: Set<string>,
  count: (password: string) => Promise<number> = pwnedCount,
): Promise<Entry[]> {
  const seen: Entry[] = [];
  for (const password of shuffle(candidates)) {
    if (used.has(password) || !isClean(password)) continue;
    seen.push({ password, count: await count(password) });
    const puzzle = pick(seen);
    if (puzzle) return shuffle(puzzle);
  }
  throw new Error("Not enough candidates to meet the mix rules");
}

// One unused, clean candidate whose count keeps R3 when added to `others` (R34).
export async function selectReplacement(
  candidates: string[],
  used: Set<string>,
  others: number[],
  count: (password: string) => Promise<number> = pwnedCount,
): Promise<Entry> {
  for (const password of shuffle(candidates)) {
    if (used.has(password) || !isClean(password)) continue;
    const c = await count(password);
    if (meetsMix([...others, c])) return { password, count: c };
  }
  throw new Error("No candidate keeps the mix rules");
}

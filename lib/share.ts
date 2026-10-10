import { SITE_URL } from "./config";
import { tier } from "./scoring";

// R19 squares: the top two tiers share green.
const SQUARE: Record<string, string> = { Uncrackable: "🟩", Strong: "🟩", Medium: "🟨", Weak: "🟧", Pwned: "🟥" };

// R19: no passwords or counts, only the puzzle number, total, daily tier (R11, on the average) and one square per password.
export function shareText(number: number, scores: number[]) {
  const total = scores.reduce((a, b) => a + b, 0);
  return `Pwnedle #${number} · ${total}/500 · ${tier(total / scores.length)}\n${scores.map((s) => SQUARE[tier(s)]).join("")}\n${new URL(SITE_URL).host}`;
}

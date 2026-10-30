import { SITE_URL } from "./config";
import { tier } from "./scoring";

// R19 squares: the top two tiers share green.
const SQUARE: Record<string, string> = { Uncrackable: "🟩", Strong: "🟩", Mid: "🟨", Weak: "🟧", Pwned: "🟥" };

// R19: no passwords or counts, only the puzzle number, total, daily tier (R11, on the average) and one square per password.
// Halloween days add a pumpkin after the number (T58a). A streak of 2 or more ends the first line (T74).
export function shareText(number: number, scores: number[], theme?: string, streak = 0) {
  const total = scores.reduce((a, b) => a + b, 0);
  return `Pwnedle #${number}${theme === "halloween" ? " 🎃" : ""} · ${total}/500 · ${tier(total / scores.length)}${streak > 1 ? ` · 🔥 ${streak}` : ""}\n${scores.map((s) => SQUARE[tier(s)]).join("")}\n${new URL(SITE_URL).host}`;
}

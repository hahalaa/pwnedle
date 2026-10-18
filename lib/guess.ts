// R8: guesses are whole numbers from 0 to 100,000,000.
export const MAX_GUESS = 100_000_000;

// Slider positions: 0 is the dedicated 0 stop. GAP..SLIDER_MAX run log10 from 1 to 1e8, 100 steps per decade,
// so every decade is the same width. 1..GAP-1 is a half-decade segment that keeps the 0 stop apart.
export const DECADE = 100;
const GAP = DECADE / 2;
export const SLIDER_MAX = GAP + 8 * DECADE;

// A position in the gap snaps by direction (left to 0, right to 1), so arrow keys can cross it both ways.
// Two significant figures, so dragging lands on numbers like 1,300 instead of 1,258. Rounded, since below 10
// two figures give decimals like 8.5 and guesses are whole numbers (R8).
const logValue = (pos: number) => Math.round(Number((10 ** ((pos - GAP) / DECADE)).toPrecision(2)));

export function fromSlider(pos: number, prev = 0) {
  const from = toSlider(prev);
  if (pos <= 0) return 0;
  if (pos < GAP) return pos < from ? 0 : 1;
  // Next to 1 and each power of ten, several positions round to one value, so an arrow key would leave the
  // thumb where it was. Keep stepping the same way until the value changes.
  const dir = Math.sign(pos - from);
  let n = logValue(pos);
  while (dir && toSlider(n) === from && pos > GAP && pos < SLIDER_MAX) n = logValue((pos += dir));
  return n;
}

export const toSlider = (guess: number) => (guess < 1 ? 0 : Math.round(Math.log10(guess) * DECADE) + GAP);

// Plain numbers, commas and k/m shorthand ("2.5m"). Null for anything else or out of range.
export function parseGuess(text: string): number | null {
  const m = /^(\d+(?:\.\d*)?|\.\d+)([km]?)$/i.exec(text.replace(/[,\s]/g, ""));
  if (!m) return null;
  const n = Math.round(Number(m[1]) * { "": 1, k: 1e3, m: 1e6 }[m[2].toLowerCase() as "" | "k" | "m"]);
  return n <= MAX_GUESS ? n : null;
}

export const formatGuess = (n: number) => n.toLocaleString("en-US");

// T48: how far off a guess was, as "4.2× too low" or "12.5k× too high". Like the score (R10) it adds 1 to both, so a
// count of 0 works. One decimal below 10, whole numbers to 999, then k and m with at most one decimal, like the axis.
export function missRatio(guess: number, count: number) {
  if (guess === count) return "Exact";
  const n = (Math.max(guess, count) + 1) / (Math.min(guess, count) + 1);
  const [d, unit] = n < 999_950 ? [1e3, "k"] : [1e6, "m"];
  const x = n < 9.95 ? n.toFixed(1) : Math.round(n) < 1000 ? Math.round(n) : `${Number((n / d).toFixed(1))}${unit}`;
  return `${x}× too ${guess < count ? "low" : "high"}`;
}

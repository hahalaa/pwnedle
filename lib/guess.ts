// R8: guesses are whole numbers from 0 to 100,000,000.
export const MAX_GUESS = 100_000_000;

// Slider positions: 0 is the dedicated 0 stop. 100..900 run log10 from 1 to 1e8, 100 steps per decade,
// so every decade is the same width. 1..99 is a gap that keeps the 0 stop visually apart.
export const DECADE = 100;
export const SLIDER_MAX = 9 * DECADE;

// A position in the gap snaps by direction (left to 0, right to 1), so arrow keys can cross it both ways.
// Two significant figures, so dragging lands on numbers like 1,300 instead of 1,258.
export const fromSlider = (pos: number, prev = 0) =>
  pos <= 0 ? 0 : pos < DECADE ? (pos < toSlider(prev) ? 0 : 1) : Number((10 ** (pos / DECADE - 1)).toPrecision(2));

export const toSlider = (guess: number) => (guess < 1 ? 0 : Math.round(Math.log10(guess) * DECADE) + DECADE);

// Plain numbers, commas and k/m shorthand ("2.5m"). Null for anything else or out of range.
export function parseGuess(text: string): number | null {
  const m = /^(\d+(?:\.\d*)?|\.\d+)([km]?)$/i.exec(text.replace(/[,\s]/g, ""));
  if (!m) return null;
  const n = Math.round(Number(m[1]) * { "": 1, k: 1e3, m: 1e6 }[m[2].toLowerCase() as "" | "k" | "m"]);
  return n <= MAX_GUESS ? n : null;
}

export const formatGuess = (n: number) => n.toLocaleString("en-US");

// R8: guesses are whole numbers from 0 to 100,000,000.
export const MAX_GUESS = 100_000_000;

// Slider positions: 0 is the dedicated 0 stop; 1..801 run log10 from 1 to 1e8, 100 steps per decade.
export const SLIDER_MAX = 801;

// Two significant figures, so dragging lands on numbers like 1,300 instead of 1,258.
export const fromSlider = (pos: number) => (pos <= 0 ? 0 : Number((10 ** ((pos - 1) / 100)).toPrecision(2)));

export const toSlider = (guess: number) => (guess < 1 ? 0 : Math.round(Math.log10(guess) * 100) + 1);

// Plain numbers, commas and k/m shorthand ("2.5m"). Null for anything else or out of range.
export function parseGuess(text: string): number | null {
  const m = /^(\d+(?:\.\d*)?|\.\d+)([km]?)$/i.exec(text.replace(/[,\s]/g, ""));
  if (!m) return null;
  const n = Math.round(Number(m[1]) * { "": 1, k: 1e3, m: 1e6 }[m[2].toLowerCase() as "" | "k" | "m"]);
  return n <= MAX_GUESS ? n : null;
}

export const formatGuess = (n: number) => n.toLocaleString("en-US");

import { K } from "./config";

// R10: bell curve on the log scale; +1 keeps zero counts finite (D5).
export const score = (guess: number, actual: number) =>
  Math.round(100 * Math.exp(-((Math.abs(Math.log10(guess + 1) - Math.log10(actual + 1)) / K) ** 2)));

// R11/D40: also used for the daily tier on the (possibly fractional) average score.
export const tier = (s: number) =>
  s >= 90 ? "Uncrackable" : s >= 70 ? "Strong" : s >= 40 ? "Mid" : s >= 10 ? "Weak" : "Pwned";

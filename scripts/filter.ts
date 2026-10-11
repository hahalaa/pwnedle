import { readFileSync } from "node:fs";

const terms = readFileSync(new URL("blocklist.txt", import.meta.url), "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
const whole = new Set(terms.filter((t) => t.startsWith("=")).map((t) => t.slice(1)));
const parts = terms.filter((t) => !t.startsWith("="));

const LEET: Record<string, string> = { "@": "a", "4": "a", "0": "o", "3": "e", "$": "s", "5": "s", "1": "i", "!": "i", "7": "t" };

// Letters left once suffixes are cut and leetspeak undone: "Sh1t123!" -> "shit". Also the base word in D33.
export function letters(pw: string): string {
  return pw
    .toLowerCase()
    .replace(/[^a-z@$]+$/, "")
    .replace(/[^a-z]/g, (c) => LEET[c] ?? "");
}

// Personal-data shapes (R30).
// ponytail: names only caught with a separator or CamelCase; "johnsmith" passes, add a surname list if review keeps finding them.
const PERSONAL = [
  /\S@\S+\.\S/, // email
  /\d{9}/, // digit run longer than 8
  /\+\d|\d{3}[ ().-]+\d{3}[ .-]?\d{3,4}/, // phone number
  /^[A-Za-z]{2,}[ ._-][A-Za-z]{2,}$/, // "john smith", "john.smith"
  /^[A-Z][a-z]+[A-Z][a-z]+$/, // "JohnSmith"
];

// "69" and "420" are sexual and drug codes; the letters-only blocklist can't see them.
// True when a candidate may be used in a puzzle (R30, D12).
export function isClean(pw: string): boolean {
  if (PERSONAL.some((re) => re.test(pw)) || /69|420/.test(pw)) return false;
  const l = letters(pw);
  return !whole.has(l) && !parts.some((t) => l.includes(t));
}

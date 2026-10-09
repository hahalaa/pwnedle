import type { Puzzle } from "../scripts/puzzles.ts";

// D24: fake passwords for local development only. Counts meet the R3 mix so the UI sees realistic spread.
export const devPasswords: Puzzle["passwords"] = [
  { password: "devsample", count: 4_200, note: "Dev fixture note for a common password." },
  { password: "notreal-0", count: 0, note: "Dev fixture note for a password that has never leaked." },
  { password: "Fixture!2026", count: 12_500_000, note: "Dev fixture note for an extremely common password." },
  { password: "placeholder-but-much-longer", count: 37, note: "Dev fixture note for a rare password, long enough to test wrapping." },
  { password: "testonly", count: 310_000, note: "Dev fixture note for another extremely common password." },
];

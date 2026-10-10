import { expect, test } from "vitest";
import { shareText } from "./share";

test("builds the R19 share text with the daily tier from the average", () => {
  // Average 78 is Strong; 100 and 90 both get green.
  expect(shareText(12, [100, 65, 90, 35, 100])).toBe("Pwnedle #12 · 390/500 · Strong\n🟩🟨🟩🟧🟩\npwnedle.vercel.app");
  // Average 29.8 is Weak; 9 is Pwned, 10 is Weak.
  expect(shareText(3, [0, 9, 10, 40, 90])).toBe("Pwnedle #3 · 149/500 · Weak\n🟥🟥🟧🟨🟩\npwnedle.vercel.app");
});

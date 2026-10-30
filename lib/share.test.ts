import { expect, test } from "vitest";
import { shareText } from "./share";

test("builds the R19 share text with the daily tier from the average", () => {
  // Average 78 is Strong; 100 and 90 both get green.
  expect(shareText(12, [100, 65, 90, 35, 100])).toBe("Pwnedle #12 · 390/500 · Strong\n🟩🟨🟩🟧🟩\npwnedle.com");
  // Average 29.8 is Weak; 9 is Pwned, 10 is Weak.
  expect(shareText(3, [0, 9, 10, 40, 90])).toBe("Pwnedle #3 · 149/500 · Weak\n🟥🟥🟧🟨🟩\npwnedle.com");
});

test("a Halloween share puts a pumpkin after the puzzle number (T58a)", () => {
  expect(shareText(12, [100, 65, 90, 35, 100], "halloween")).toBe("Pwnedle #12 🎃 · 390/500 · Strong\n🟩🟨🟩🟧🟩\npwnedle.com");
});

test("a streak of 2 or more ends the first line; a streak of 1 adds nothing (T74)", () => {
  expect(shareText(12, [100, 65, 90, 35, 100], undefined, 1)).toBe("Pwnedle #12 · 390/500 · Strong\n🟩🟨🟩🟧🟩\npwnedle.com");
  expect(shareText(12, [100, 65, 90, 35, 100], undefined, 2)).toBe("Pwnedle #12 · 390/500 · Strong · 🔥 2\n🟩🟨🟩🟧🟩\npwnedle.com");
  expect(shareText(12, [100, 65, 90, 35, 100], "halloween", 7)).toBe("Pwnedle #12 🎃 · 390/500 · Strong · 🔥 7\n🟩🟨🟩🟧🟩\npwnedle.com");
});

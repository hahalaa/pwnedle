import { expect, test } from "vitest";
import { fromSlider, MAX_GUESS, parseGuess, SLIDER_MAX, toSlider } from "./guess";

test("parses plain numbers, commas and k/m shorthand", () => {
  expect(["0", "1,234", " 42 ", "2.5m", "2.5M", "10k", ".5k", "1.5", "100,000,000"].map(parseGuess)).toEqual([
    0, 1234, 42, 2_500_000, 2_500_000, 10_000, 500, 2, MAX_GUESS,
  ]);
});

test("rejects text, negatives and guesses over 100,000,000", () => {
  expect(["", "abc", "-5", "1e5", "2.5b", "100,000,001", "101m", "k"].map(parseGuess)).toEqual(Array(8).fill(null));
});

test("slider has a 0 stop and spans 1 to 100,000,000 on a log scale", () => {
  expect([fromSlider(0), fromSlider(1), fromSlider(SLIDER_MAX)]).toEqual([0, 1, MAX_GUESS]);
  expect(fromSlider(401)).toBe(10_000);
  expect([toSlider(0), toSlider(1), toSlider(MAX_GUESS), toSlider(2_500_000)]).toEqual([0, 1, SLIDER_MAX, 641]);
});

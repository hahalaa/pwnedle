import { expect, test } from "vitest";
import { DECADE, fromSlider, MAX_GUESS, parseGuess, SLIDER_MAX, toSlider } from "./guess";

test("parses plain numbers, commas and k/m shorthand", () => {
  expect(["0", "1,234", " 42 ", "2.5m", "2.5M", "10k", ".5k", "1.5", "100,000,000"].map(parseGuess)).toEqual([
    0, 1234, 42, 2_500_000, 2_500_000, 10_000, 500, 2, MAX_GUESS,
  ]);
});

test("rejects text, negatives and guesses over 100,000,000", () => {
  expect(["", "abc", "-5", "1e5", "2.5b", "100,000,001", "101m", "k"].map(parseGuess)).toEqual(Array(8).fill(null));
});

test("slider has a 0 stop and spans 1 to 100,000,000 on a log scale", () => {
  expect([fromSlider(0), fromSlider(DECADE), fromSlider(SLIDER_MAX)]).toEqual([0, 1, MAX_GUESS]);
  expect(fromSlider(5 * DECADE)).toBe(10_000);
  expect([toSlider(0), toSlider(1), toSlider(MAX_GUESS), toSlider(2_500_000)]).toEqual([0, DECADE, SLIDER_MAX, 740]);
});

test("every power of ten sits one decade apart, with the 0 stop a decade left of 1", () => {
  expect([1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8].map(toSlider)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => d * DECADE));
});

test("the gap between 0 and 1 snaps by direction, so arrow keys cross it both ways", () => {
  expect(fromSlider(1, 0)).toBe(1); // right arrow from 0
  expect(fromSlider(DECADE - 1, 1)).toBe(0); // left arrow from 1
  expect(fromSlider(50, 1_000)).toBe(0); // dragged left into the gap
});

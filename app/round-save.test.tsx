// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { Round } from "./round";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const KEY = "pwnedle:2026-10-24";
const props = { date: "2026-10-24", number: 1, passwords: ["a", "b", "c", "d", "e"] };
// A game on its last revealed password, so the next press finishes it.
const lastPassword = { index: 4, done: false, results: Array(5).fill({ guess: 1, count: 1, score: 100, tier: "Uncrackable", note: "" }) };

test.each([
  ["the archive", { archive: true }, true],
  ["the home page", {}, undefined],
])("finishing a game from %s saves the archive flag only for the archive (R18)", async (_, extra, archive) => {
  localStorage.setItem(KEY, JSON.stringify(lastPassword));
  render(<Round {...props} {...extra} />);
  fireEvent.click(await screen.findByRole("button", { name: "See results" }));
  const saved = JSON.parse(localStorage.getItem(KEY)!);
  expect(saved.done).toBe(true);
  expect(saved.archive).toBe(archive);
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Round } from "./round";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
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

test("a refresh resumes mid-puzzle with reveals intact and never re-sends a locked-in guess (R15, R16)", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const r = { guess: 40_000, count: 12_500_000, score: 3, tier: "Pwned", note: "Seen everywhere." };
  localStorage.setItem(KEY, JSON.stringify({ index: 1, done: false, results: [r, r] }));
  render(<Round {...props} />);
  // The second password's reveal is back, with no way to guess it again.
  const next = await screen.findByRole("button", { name: "Next password" });
  expect(screen.getByText("b")).toBeDefined();
  expect(screen.getByText("Seen everywhere.")).toBeDefined();
  expect(screen.getByLabelText("2 of 5 revealed")).toBeDefined();
  expect(screen.queryByRole("button", { name: "Lock in" })).toBeNull();
  // Moving on asks for the third password, the first one without a result.
  fireEvent.click(next);
  expect(screen.getByText("c")).toBeDefined();
  expect(screen.getByRole("button", { name: "Lock in" })).toBeDefined();
  expect(JSON.parse(localStorage.getItem(KEY)!).index).toBe(2);
  expect(fetch).not.toHaveBeenCalled();
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Round } from "./round";

// Next asks whether the screen is touch first (T51); jsdom has no matchMedia.
beforeEach(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

const KEY = "pwnedle:2026-10-24";
const props = { date: "2026-10-24", number: 1, passwords: ["a", "b", "c", "d", "e"] };
// A game on its last revealed password, so the next press finishes it.
const lastRound = { index: 4, done: false, results: Array(5).fill({ guess: 1, count: 1, score: 100, tier: "Uncrackable", note: "" }) };

test.each([
  ["the archive", { archive: true }, true],
  ["the home page", {}, undefined],
])("finishing a game from %s saves the archive flag only for the archive (R18)", async (_, extra, archive) => {
  localStorage.setItem(KEY, JSON.stringify(lastRound));
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

test("Lock in keeps focus through the reveal, the reveal is announced, and finishing moves focus to Share (T20)", async () => {
  const r = { count: 12_500_000, score: 3, tier: "Pwned", note: "Seen everywhere." };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => r })));
  localStorage.setItem(KEY, JSON.stringify({ ...lastRound, results: lastRound.results.slice(0, 4) }));
  render(<Round {...props} />);
  const button = await screen.findByRole("button", { name: "Lock in" });
  const live = document.querySelector("[aria-live=polite]")!;
  expect(live.textContent).toBe("Password 5 of 5: e");
  button.focus();
  fireEvent.click(button, { detail: 1 });
  // Still enabled while sending, so focus can't drop to the page.
  expect(screen.getByRole("button", { name: "Locking in…" })).toHaveProperty("disabled", false);
  await screen.findByRole("button", { name: "See results" });
  expect(document.activeElement).toBe(button);
  expect(live.textContent).toBe("Seen 12,500,000 times. You guessed 0: 12.5m× too low. 3 points, pwned. Seen everywhere.");
  fireEvent.click(button);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Share result" }));
});

test("a finished game loaded on refresh doesn't take focus", async () => {
  localStorage.setItem(KEY, JSON.stringify({ ...lastRound, done: true }));
  render(<Round {...props} />);
  expect(document.activeElement).not.toBe(await screen.findByRole("button", { name: "Share result" }));
});

test("the first lock-in sends puzzle-start once and See results sends puzzle-complete, with only the puzzle number (R27)", async () => {
  const track = vi.fn();
  vi.stubGlobal("umami", { track });
  const r = { count: 12_500_000, score: 3, tier: "Pwned", note: "Seen everywhere." };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => r })));
  render(<Round {...props} archive />);
  for (const next of ["Next password", "Next password", "Next password", "Next password", "See results"]) {
    fireEvent.click(await screen.findByRole("button", { name: "Lock in" }), { detail: 1 });
    fireEvent.click(await screen.findByRole("button", { name: next }));
  }
  expect(track.mock.calls).toEqual([
    ["puzzle-start", { puzzle: 1, archive: true }],
    ["puzzle-complete", { puzzle: 1, archive: true }],
  ]);
});

test.each([
  ["a rejected guess names the guess", { ok: false, status: 400 }, "That guess wasn't accepted."],
  ["a server error blames the connection", { ok: false, status: 500 }, "Check your connection"],
])("%s", async (_, res, message) => {
  vi.stubGlobal("fetch", vi.fn(async () => res));
  render(<Round {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "Lock in" }), { detail: 1 });
  expect((await screen.findByRole("alert")).textContent).toContain(message);
});

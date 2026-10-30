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

test.each([
  ["the home page sends its guesses once", {}, 1],
  ["the archive never sends", { archive: true }, 0],
])("finishing a game from %s to the score counts (T63)", async (_, extra, calls) => {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  // The end screen also reads the counts (T64); only POSTs count here.
  const posts = () => fetch.mock.calls.filter(([, init]) => init?.method === "POST").length;
  localStorage.setItem(KEY, JSON.stringify(lastRound));
  render(<Round {...props} {...extra} />);
  fireEvent.click(await screen.findByRole("button", { name: "See results" }));
  expect(posts()).toBe(calls);
  if (calls) expect(fetch).toHaveBeenCalledWith("/api/scores", expect.objectContaining({ method: "POST", body: JSON.stringify({ date: props.date, guesses: [1, 1, 1, 1, 1] }) }));
  // A refresh lands on the saved end screen and sends nothing more.
  cleanup();
  render(<Round {...props} {...extra} />);
  await screen.findByRole("button", { name: "Share result" });
  expect(posts()).toBe(calls);
});

test.each([
  ["a network error", async () => Promise.reject(new TypeError("offline"))],
  ["the firewall's 429 (T65)", async () => new Response("Too Many Requests", { status: 429 })],
])("a failed score submit from %s leaves the end screen alone (T63)", async (_, fetch) => {
  vi.stubGlobal("fetch", vi.fn(fetch));
  localStorage.setItem(KEY, JSON.stringify(lastRound));
  render(<Round {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "See results" }));
  expect(await screen.findByRole("button", { name: "Share result" })).toBeDefined();
  expect(JSON.parse(localStorage.getItem(KEY)!).done).toBe(true);
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

// Ten other players: 4 below this game's 500 and, with this one, 7 at 500.
const tenOthers = { "500": 7, "100": 4 };

test.each([
  ["a daily game counts itself once", {}, "Better than 40% of today's players", "11 players", "today's"],
  ["an archive game compares only with that day's players", { archive: true }, "Better than 36% of that day's players", "11 players + you", "that day's"],
])("the end screen shows how everyone did: %s (T64, T72)", async (_, extra, line, players, day) => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ counts: tenOthers, averages: [80, 41.6, 12.4, 90, 60] })));
  localStorage.setItem(KEY, JSON.stringify({ ...lastRound, done: true, ...extra }));
  render(<Round {...props} {...extra} />);
  expect(await screen.findByText(line)).toBeDefined();
  expect(screen.getByText(players)).toBeDefined();
  expect(screen.getByText(`Password 3 was ${day} hardest: players averaged 12 points`)).toBeDefined();
  expect(screen.getByText("how everyone did")).toBeDefined();
  expect(fetch).toHaveBeenCalledWith("/api/scores?date=2026-10-24", expect.anything());
});

test.each([
  ["alone", { "500": 1 }, "You're the first player today", "1 player"],
  ["with 2 others", { "500": 1, "20": 2 }, "You placed #1 of 3 so far today", "3 players"],
])("under 10 players, %s, the line gives counts and the chart still shows (T64)", async (_, counts, line, players) => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ counts })));
  localStorage.setItem(KEY, JSON.stringify({ ...lastRound, done: true }));
  render(<Round {...props} />);
  expect(await screen.findByText(line)).toBeDefined();
  expect(screen.getByText("how everyone did")).toBeDefined();
  expect(screen.getByText(players)).toBeDefined();
  // The API sends no averages under 10 players (T72).
  expect(screen.queryByText(/hardest/)).toBeNull();
});

test("on desktop the chart column is held from the first render and collapses once if the read fails (T64)", async () => {
  let fail = () => {};
  vi.stubGlobal("fetch", vi.fn(() => new Promise((_, reject) => (fail = () => reject(new TypeError("offline"))))));
  localStorage.setItem(KEY, JSON.stringify({ ...lastRound, done: true }));
  render(<Round {...props} />);
  const section = (await screen.findByRole("button", { name: "Share result" })).closest("section")!;
  expect(section.className).toContain("lg:grid-cols-[1fr_20rem]");
  fail();
  await vi.waitFor(() => expect(section.className).not.toContain("lg:grid-cols-[1fr_20rem]"));
});

test.each([
  ["a network error", async () => Promise.reject(new TypeError("offline"))],
  ["the firewall's 429 (T65)", async () => new Response("Too Many Requests", { status: 429 })],
])("a failed count read from %s hides how everyone did (T64)", async (_, impl) => {
  const fetch = vi.fn(impl);
  vi.stubGlobal("fetch", fetch);
  localStorage.setItem(KEY, JSON.stringify({ ...lastRound, done: true }));
  render(<Round {...props} />);
  await screen.findByRole("button", { name: "Share result" });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r));
  expect(screen.queryByText(/players|how everyone did/)).toBeNull();
});

test("an archive game finished in this visit never counts itself (T64)", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ counts: {} })));
  localStorage.setItem(KEY, JSON.stringify(lastRound));
  render(<Round {...props} archive />);
  fireEvent.click(await screen.findByRole("button", { name: "See results" }));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/scores?date=2026-10-24", expect.anything()));
  // That day had no players, so nothing shows and the column collapses.
  await vi.waitFor(() => expect(screen.getByRole("button", { name: "Share result" }).closest("section")!.className).not.toContain("lg:grid"));
  expect(screen.queryByText(/player|how everyone did/)).toBeNull();
});

test("an archive game adds its own bar in the browser only and sends nothing (T70)", async () => {
  // That day: 4 players at 100. This game scores 500, so the top bar holds only this player.
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ counts: { "100": 4 } }));
  vi.stubGlobal("fetch", fetch);
  localStorage.setItem(KEY, JSON.stringify(lastRound));
  render(<Round {...props} archive />);
  fireEvent.click(await screen.findByRole("button", { name: "See results" }));
  expect(await screen.findByText("4 players + you")).toBeDefined();
  expect(screen.getByText("You'd have placed #1 of 5 that day")).toBeDefined();
  const bars = screen.getByRole("img").querySelectorAll("span[style*=height]");
  expect((bars[19] as HTMLElement).style.height).toBe("25%");
  // Uncrackable holds 1 of the 5 bars' players, this one.
  expect(screen.getByText("20%")).toBeDefined();
  expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
});

test("a sent daily game opened from the archive page counts itself once and is never added locally (T70, T71)", async () => {
  // That day's counts already hold this game's 500, plus one more 500 and one 100.
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ counts: { "500": 2, "100": 1 } })));
  localStorage.setItem(KEY, JSON.stringify({ ...lastRound, done: true }));
  render(<Round {...props} archive />);
  expect(await screen.findByText("You placed #1 of 3 that day")).toBeDefined();
  expect(screen.getByText("3 players")).toBeDefined();
  expect(screen.queryByText(/\+ you/)).toBeNull();
  const bars = [...screen.getByRole("img").querySelectorAll<HTMLElement>("span[style*=height]")].map((b) => b.style.height);
  expect([bars[19], bars[4]]).toEqual(["100%", "50%"]);
  expect(screen.getByText("67%")).toBeDefined();
});

// T69: the POST answers with the day's counts, this player included; a stale cached GET has only the other player.
const scores = (posted: Record<string, number>, cached: Record<string, number>) =>
  vi.fn(async (_: string, init?: RequestInit) => Response.json({ counts: init?.method === "POST" ? posted : cached }));

test("two players a minute apart each see the right count from their own POST (T69)", async () => {
  for (const [posted, line] of [
    [{ "500": 1 }, "You're the first player today"],
    [{ "500": 1, "20": 1 }, "You placed #1 of 2 so far today"],
  ] as const) {
    const fetch = scores(posted, {});
    vi.stubGlobal("fetch", fetch);
    localStorage.setItem(KEY, JSON.stringify(lastRound));
    render(<Round {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "See results" }));
    expect(await screen.findByText(line)).toBeDefined();
    // The cached GET is never read for a game sent in this visit.
    expect(fetch.mock.calls.every(([, init]) => init?.method === "POST")).toBe(true);
    cleanup();
    localStorage.clear();
  }
});

test("a cached GET missing this player's entry can't make them the first player (T69)", async () => {
  const fetch = scores({ "500": 2 }, { "500": 1 });
  vi.stubGlobal("fetch", fetch);
  localStorage.setItem(KEY, JSON.stringify(lastRound));
  render(<Round {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "See results" }));
  expect(await screen.findByText("You placed #1 of 2 so far today")).toBeDefined();
  // Back on the tab, the GET is read again but a stale one can't take this player out.
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/scores?date=2026-10-24", expect.anything()));
  await new Promise((r) => setTimeout(r));
  expect(screen.getByText("You placed #1 of 2 so far today")).toBeDefined();
  expect(screen.queryByText(/first player/)).toBeNull();
});

test("returning to the tab on a finished game reads the counts again (T69)", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ counts: { "500": 1 } })).mockResolvedValue(Response.json({ counts: { "500": 1, "20": 2 } }));
  vi.stubGlobal("fetch", fetch);
  localStorage.setItem(KEY, JSON.stringify({ ...lastRound, done: true }));
  render(<Round {...props} />);
  expect(await screen.findByText("You're the first player today")).toBeDefined();
  document.dispatchEvent(new Event("visibilitychange"));
  expect(await screen.findByText("You placed #1 of 3 so far today")).toBeDefined();
});

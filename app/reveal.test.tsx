// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { playTier, unlockAudio } from "../lib/sound";
import { REVEAL, Round } from "./round";

vi.mock("../lib/sound", () => ({ isMuted: () => false, playTier: vi.fn(), unlockAudio: vi.fn() }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  progress = 0;
  delete (Element.prototype as { animate?: unknown }).animate;
});

const props = { date: "2026-10-24", number: 1, passwords: ["a", "b", "c", "d", "e"] };
const body = { count: 4_200, score: 94, tier: "Uncrackable", note: "Seen a few thousand times." };

// jsdom has no Web Animations API, so each fake animation only finishes when it's seeked to its end. Every one reports
// `progress`, which the points read as they climb.
let progress = 0;
function stubMotion(reduced: boolean, coarse = false) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: (reduced && q === "(prefers-reduced-motion: reduce)") || (coarse && q === "(pointer: coarse)"),
  }));
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => body })));
  const anims: { seeked?: number }[] = [];
  Element.prototype.animate = vi.fn((_, o) => {
    const t = o as KeyframeAnimationOptions | number;
    const end = typeof t === "number" ? t : (t.delay ?? 0) + Number(t.duration);
    let done = () => {};
    const a = {
      seeked: undefined as number | undefined,
      finished: new Promise<void>((r) => (done = r)),
      cancel: vi.fn(),
      effect: { getComputedTiming: () => ({ progress }) },
      set currentTime(ms: number) {
        a.seeked = ms;
        if (ms >= end) done();
      },
    };
    anims.push(a);
    return a as unknown as Animation;
  });
  return anims;
}

test("a fresh reveal holds back the tier and the button until it lands, and a click skips to the end (T43)", async () => {
  const anims = stubMotion(false);
  render(<Round {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }), { detail: 1 });
  const next = await screen.findByRole("button", { name: "Next password" });
  expect(anims.length).toBeGreaterThan(5);
  expect(next.className).toContain("opacity-0");
  expect(screen.getByLabelText("0 of 5 revealed")).toBeDefined();
  expect(playTier).not.toHaveBeenCalled();
  // The live region doesn't wait for the animation.
  expect(document.querySelector("[aria-live=polite]")!.textContent).toContain("Seen 4,200 times. You guessed 0: 4.2k× too low. 94 points");
  // The skipping click seeks everything to the landing and never reaches the hidden button.
  fireEvent.click(next);
  expect(anims.every((a) => a.seeked === REVEAL.hold + REVEAL.zoom + REVEAL.meter)).toBe(true);
  await vi.waitFor(() => expect(playTier).toHaveBeenCalledWith("Uncrackable"));
  expect(next.className).not.toContain("opacity-0");
  expect(screen.getByLabelText("1 of 5 revealed")).toBeDefined();
  expect(screen.getByText("a")).toBeDefined();
  expect(playTier).toHaveBeenCalledTimes(1);
});

// The running total in the password window's title bar.
const total = () => screen.getByText("/ 500", { exact: false }).textContent;

test("the running total climbs with a fresh reveal's points and lands with it (T57)", async () => {
  stubMotion(false);
  localStorage.setItem("pwnedle:2026-10-24", JSON.stringify({ index: 1, done: false, results: [{ guess: 4_000, ...body, score: 80 }] }));
  render(<Round {...props} />);
  expect(total()).toBe("80 / 500");
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }), { detail: 1 });
  const next = await screen.findByRole("button", { name: "Next password" });
  expect(total()).toBe("80 / 500");
  progress = 0.5;
  await vi.waitFor(() => expect(total()).toBe("127 / 500"));
  // The first click skips to the landing, the second moves on.
  fireEvent.click(next);
  await vi.waitFor(() => expect(playTier).toHaveBeenCalled());
  expect(total()).toBe("174 / 500");
  fireEvent.click(next);
  expect(total()).toBe("174 / 500");
});

test("with reduced motion the running total takes the points at once (T57)", async () => {
  stubMotion(true);
  render(<Round {...props} />);
  expect(total()).toBe("0 / 500");
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }), { detail: 1 });
  await screen.findByRole("button", { name: "Next password" });
  expect(total()).toBe("94 / 500");
});

test("with reduced motion the reveal shows its end state and plays the sound at once (T43)", async () => {
  stubMotion(true);
  render(<Round {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }), { detail: 1 });
  const next = await screen.findByRole("button", { name: "Next password" });
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  expect(next.className).not.toContain("opacity-0");
  expect(playTier).toHaveBeenCalledWith("Uncrackable");
});

test("a reveal resumed after a refresh doesn't replay (T43)", async () => {
  stubMotion(false);
  localStorage.setItem("pwnedle:2026-10-24", JSON.stringify({ index: 0, done: false, results: [{ guess: 4_000, ...body }] }));
  render(<Round {...props} />);
  await screen.findByRole("button", { name: "Next password" });
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  expect(playTier).not.toHaveBeenCalled();
  expect(total()).toBe("94 / 500");
});

test("Enter in the box locks in and focuses the button; Enter only moves on once the reveal lands (T51)", async () => {
  const anims = stubMotion(false);
  render(<Round {...props} />);
  const box = screen.getByRole("textbox");
  fireEvent.change(box, { target: { value: "2.5m" } });
  fireEvent.keyDown(box, { key: "Enter" });
  const next = await screen.findByRole("button", { name: "Next password" });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).guess).toBe(2_500_000);
  expect(document.activeElement).toBe(next);
  // The first Enter only skips to the landing.
  fireEvent.keyDown(next, { key: "Enter" });
  expect(anims.every((a) => a.seeked === REVEAL.hold + REVEAL.zoom + REVEAL.meter)).toBe(true);
  expect(screen.getByText("a")).toBeDefined();
  await vi.waitFor(() => expect(next.className).not.toContain("opacity-0"));
  // A keyboard Next focuses the next box.
  fireEvent.click(next, { detail: 0 });
  expect(screen.getByText("b")).toBeDefined();
  expect(document.activeElement).toBe(screen.getByRole("textbox"));
});

test("Enter in the box does nothing while the guess is invalid, and a tapped Next leaves the box unfocused (T51)", async () => {
  stubMotion(true);
  render(<Round {...props} />);
  const box = screen.getByRole("textbox");
  fireEvent.change(box, { target: { value: "abc" } });
  fireEvent.keyDown(box, { key: "Enter" });
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(box, { target: { value: "40k" } });
  fireEvent.keyDown(box, { key: "Enter" });
  fireEvent(await screen.findByRole("button", { name: "Next password" }), tap("touch"));
  expect(screen.getByText("b")).toBeDefined();
  expect(document.activeElement).not.toBe(screen.getByRole("textbox"));
});

test("a mouse click on Next focuses the next box, and Enter never locks in an untouched 0 (T51)", async () => {
  stubMotion(true);
  render(<Round {...props} />);
  const lock = screen.getByRole("button", { name: "Lock in" });
  // Enter in the box or a keyboard press on Lock in, before the player moves the guess, sends nothing.
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
  fireEvent.click(lock, { detail: 0 });
  expect(fetch).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(screen.getByRole("textbox"));
  // A mouse click still locks in 0 on purpose.
  fireEvent.click(lock, { detail: 1 });
  fireEvent(await screen.findByRole("button", { name: "Next password" }), tap("mouse"));
  expect(screen.getByText("b")).toBeDefined();
  expect(document.activeElement).toBe(screen.getByRole("textbox"));
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }), { detail: 0 });
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("after the slider moves, Enter on the page locks in, then moves on once the button shows (T51)", async () => {
  stubMotion(true);
  render(<Round {...props} />);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "300" } });
  fireEvent.keyDown(document.body, { key: "Enter" });
  const next = await screen.findByRole("button", { name: "Next password" });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(next);
  fireEvent.keyDown(document.body, { key: "Enter" });
  expect(screen.getByText("b")).toBeDefined();
});

test("Enter on the page with an untouched guess sends nothing and focuses the box (T51)", async () => {
  stubMotion(true);
  render(<Round {...props} />);
  fireEvent.keyDown(document.body, { key: "Enter" });
  expect(fetch).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(screen.getByRole("textbox"));
});

test("on a touch screen nothing focuses the box for the player, whatever the click reports (T51)", async () => {
  stubMotion(true, true);
  render(<Round {...props} />);
  const box = screen.getByRole("textbox");
  // Enter on the page or a keyboard press on an untouched Lock in sends nothing and leaves the box alone.
  fireEvent.keyDown(document.body, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }), { detail: 0 });
  expect(fetch).not.toHaveBeenCalled();
  expect(document.activeElement).not.toBe(box);
  fireEvent.change(box, { target: { value: "40k" } });
  fireEvent.keyDown(document.body, { key: "Enter" });
  // An iOS tap can arrive with an empty pointerType, which reads like a mouse or keyboard.
  fireEvent(await screen.findByRole("button", { name: "Next password" }), tap(""));
  expect(screen.getByText("b")).toBeDefined();
  expect(document.activeElement).not.toBe(screen.getByRole("textbox"));
});

// T56: a finished game, with the umami script stubbed so any event would show.
function finished(extra: object = {}) {
  const saved = JSON.stringify({ index: 4, done: true, results: ["a", "b", "c", "d", "e"].map((p, i) => ({ guess: 10 ** i, ...body, score: 50 + i, tier: i ? "Mid" : "Pwned", note: `About ${p}.` })), ...extra });
  localStorage.setItem("pwnedle:2026-10-24", saved);
  const track = vi.fn();
  vi.stubGlobal("umami", { track });
  return { saved, track };
}

test.each([
  ["the home page", {}],
  ["the archive", { archive: true }],
])("on %s, a row on the end screen replays its saved reveal, and Back returns with focus on that row (T56)", async (_, extra) => {
  const anims = stubMotion(false);
  const { saved, track } = finished(extra);
  render(<Round {...props} {...extra} />);
  const live = document.querySelector("[aria-live=polite]")!;
  expect(live.textContent).toBe("");
  fireEvent.click(await row("b"), { detail: 1 });
  // The tap unlocks audio for the sound at the landing (lib/sound.ts).
  expect(unlockAudio).toHaveBeenCalledTimes(1);
  // The second password's reveal, replayed and announced at once, with Back focused but hidden until it lands.
  const back = screen.getByRole("button", { name: "Back to results" });
  expect(screen.getByText("b")).toBeDefined();
  expect(screen.getByText("password 2 of 5")).toBeDefined();
  // T57: the total as it stood after b, without climbing.
  progress = 0.5;
  await new Promise(requestAnimationFrame);
  expect(total()).toBe("101 / 500");
  expect(document.activeElement).toBe(back);
  expect(back.className).toContain("opacity-0");
  expect(anims.length).toBeGreaterThan(5);
  expect(live.textContent).toBe("Seen 4,200 times. You guessed 10: 382× too low. 51 points, mid. About b.");
  // Enter on the page only skips; the tier sound plays as it lands.
  fireEvent.keyDown(document.body, { key: "Enter" });
  await vi.waitFor(() => expect(playTier).toHaveBeenCalledWith("Mid"));
  expect(back.className).not.toContain("opacity-0");
  expect(total()).toBe("101 / 500");
  fireEvent.click(back);
  const b = row("b");
  expect(document.activeElement).toBe(b);
  expect(b.closest("section")!.className).not.toContain("animate-enter");
  expect(live.textContent).toBe("");
  // Nothing was sent, saved or tracked.
  expect(fetch).not.toHaveBeenCalled();
  expect(localStorage.getItem("pwnedle:2026-10-24")).toBe(saved);
  expect(track).not.toHaveBeenCalled();
});

test("with reduced motion a reopened reveal shows its end state, and Escape goes back once it has landed (T56)", async () => {
  stubMotion(true);
  finished();
  render(<Round {...props} />);
  fireEvent.click(await row("a"), { detail: 1 });
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  expect(playTier).toHaveBeenCalledWith("Pwned");
  expect(screen.getByRole("button", { name: "Back to results" }).className).not.toContain("opacity-0");
  // Escape inside an open dialog is the dialog's own.
  const dialog = document.body.appendChild(document.createElement("dialog"));
  dialog.setAttribute("open", "");
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.getByRole("button", { name: "Back to results" })).toBeDefined();
  dialog.remove();
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(document.activeElement).toBe(row("a"));
});

test("Escape while a reopened reveal plays only skips it (T56)", async () => {
  const anims = stubMotion(false);
  finished();
  render(<Round {...props} />);
  fireEvent.click(await row("c"), { detail: 1 });
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(anims.every((a) => a.seeked === REVEAL.hold + REVEAL.zoom + REVEAL.meter)).toBe(true);
  expect(screen.getByRole("button", { name: "Back to results" })).toBeDefined();
  await vi.waitFor(() => expect(playTier).toHaveBeenCalled());
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.getByRole("button", { name: "Share result" })).toBeDefined();
});

test("Enter on the end screen page sends, opens and skips nothing (T51, T56)", async () => {
  stubMotion(false, true);
  const { saved } = finished();
  render(<Round {...props} />);
  await screen.findByRole("button", { name: "Share result" });
  fireEvent.keyDown(document.body, { key: "Enter" });
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.getByRole("button", { name: "Share result" })).toBeDefined();
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(localStorage.getItem("pwnedle:2026-10-24")).toBe(saved);
});

// An end screen row by its password. jsdom runs the row's lines together in its accessible name.
const row = (password: string) => screen.getByText(password, { selector: "span" }).closest("button")!;

// A click carrying a pointerType, which jsdom's MouseEvent lacks.
const tap = (pointerType: string) => Object.assign(new MouseEvent("click", { bubbles: true, detail: 1 }), { pointerType });

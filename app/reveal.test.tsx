// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { playTier } from "../lib/sound";
import { REVEAL, Round } from "./round";

vi.mock("../lib/sound", () => ({ isMuted: () => false, playTier: vi.fn() }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  delete (Element.prototype as { animate?: unknown }).animate;
});

const props = { date: "2026-10-24", number: 1, passwords: ["a", "b", "c", "d", "e"] };
const body = { count: 4_200, score: 94, tier: "Uncrackable", note: "Seen a few thousand times." };

// jsdom has no Web Animations API, so each fake animation only finishes when it's seeked to its end.
function stubMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduced && q === "(prefers-reduced-motion: reduce)" }));
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
      effect: { getComputedTiming: () => ({ progress: 0 }) },
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
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }));
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

test("with reduced motion the reveal shows its end state and plays the sound at once (T43)", async () => {
  stubMotion(true);
  render(<Round {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }));
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
  fireEvent.click(await screen.findByRole("button", { name: "Next password" }), { detail: 1 });
  expect(screen.getByText("b")).toBeDefined();
  expect(document.activeElement).not.toBe(screen.getByRole("textbox"));
});

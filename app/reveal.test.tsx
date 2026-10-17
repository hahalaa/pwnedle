// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { playTier } from "../lib/sound";
import { Round } from "./round";

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

// jsdom has no Web Animations API, so each fake animation only finishes when asked.
function stubMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduced && q === "(prefers-reduced-motion: reduce)" }));
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => body })));
  const anims: { finish: () => void; cancel: () => void }[] = [];
  Element.prototype.animate = vi.fn(() => {
    let done = () => {};
    const a = { finished: new Promise<void>((r) => (done = r)), finish: vi.fn(() => done()), cancel: vi.fn() };
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
  expect(document.querySelector("[aria-live=polite]")!.textContent).toContain("Seen 4,200 times.");
  // The skipping click never reaches the hidden button.
  fireEvent.click(next);
  expect(anims.every((a) => vi.mocked(a.finish).mock.calls.length === 1)).toBe(true);
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

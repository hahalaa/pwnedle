// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { MUTED_KEY, TUNES } from "../lib/sound";
import { Round } from "./round";
import { Sound } from "./sound";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

// Records the notes each played tune sets, so a test can tell which tier sounded.
function stubAudio() {
  const played: number[][] = [];
  const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 0;
      destination = {};
      createGain = () => ({ gain: param(), connect: (d: unknown) => d });
      createOscillator = () => {
        const notes: number[] = [];
        played.push(notes);
        return { frequency: { setValueAtTime: (f: number) => notes.push(f) }, connect: (g: unknown) => g, start: vi.fn(), stop: vi.fn() };
      };
    },
  );
  return played;
}

test("tunes run from the highest ending note for Uncrackable down to the lowest for Pwned", () => {
  const last = ["Uncrackable", "Strong", "Mid", "Weak", "Pwned"].map((t) => TUNES[t][0].at(-1)!);
  expect(last).toEqual([...last].sort((a, b) => b - a));
});

test("the mute toggle is remembered after a refresh", async () => {
  render(<Sound />);
  const on = await screen.findByRole("button", { name: "sound on" });
  expect(on.querySelector("title")?.textContent).toBe("sound on");
  fireEvent.click(on);
  expect(on.querySelector("title")?.textContent).toBe("sound muted");
  expect(localStorage.getItem(MUTED_KEY)).toBe("1");
  cleanup();
  // A fresh mount reads localStorage, like a page refresh.
  render(<Sound />);
  fireEvent.click(await screen.findByRole("button", { name: "sound muted" }));
  expect(localStorage.getItem(MUTED_KEY)).toBe("");
});

test.each([
  ["plays the tier's tune", false, [TUNES.Weak[0]]],
  ["stays silent when muted", true, []],
])("a reveal %s", async (_, muted, expected) => {
  const played = stubAudio();
  if (muted) localStorage.setItem(MUTED_KEY, "1");
  const body = { count: 1, score: 20, tier: "Weak", note: "" };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => body })));
  render(<Round date="2026-10-24" number={1} passwords={["a", "b", "c", "d", "e"]} />);
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }));
  await screen.findByRole("button", { name: "Next password" });
  expect(played).toEqual(expected);
});

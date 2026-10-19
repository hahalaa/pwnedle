// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { MUTED_KEY, TUNES } from "../lib/sound";
import { Round } from "./round";
import { Sound } from "./sound";

// lib/sound.ts keeps its first AudioContext, so every fake one records into these, cleared after each test.
const played: number[][] = [];
const unlocks: string[] = [];

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  played.length = unlocks.length = 0;
});

// Records the notes each played tune sets, so a test can tell which tier sounded, and each resume.
function stubAudio() {
  const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 0;
      state = "suspended";
      destination = {};
      resume = async () => void unlocks.push("resume");
      createGain = () => ({ gain: param(), connect: (d: unknown) => d });
      createOscillator = () => {
        const notes: number[] = [];
        played.push(notes);
        return { frequency: { setValueAtTime: (f: number) => notes.push(f) }, connect: (g: unknown) => g, start: vi.fn(), stop: vi.fn() };
      };
    },
  );
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
])("a reveal %s, with audio unlocked inside the Lock in click unless muted", async (_, muted, expected) => {
  stubAudio();
  if (muted) localStorage.setItem(MUTED_KEY, "1");
  const body = { count: 1, score: 20, tier: "Weak", note: "" };
  let answer = () => {};
  vi.stubGlobal("fetch", vi.fn(() => new Promise((r) => (answer = () => r({ ok: true, status: 200, json: async () => body })))));
  render(<Round date="2026-10-24" number={1} passwords={["a", "b", "c", "d", "e"]} />);
  fireEvent.click(screen.getByRole("button", { name: "Lock in" }), { detail: 1 });
  // Chrome on iOS only starts audio inside the gesture, which ends before the guess comes back.
  expect(unlocks).toEqual(muted ? [] : ["resume"]);
  answer();
  await screen.findByRole("button", { name: "Next password" });
  expect(played).toEqual(expected);
});

"use client";

import { useState } from "react";
import { formatGuess, fromSlider, parseGuess, SLIDER_MAX, toSlider } from "../lib/guess";

// ponytail: always the first password; T14 adds the reveal and steps through the rest.
const index = 0;

export function Round({ date, passwords }: { date: string; passwords: string[] }) {
  // guess is the last valid number, so the slider stays put while the box holds a typo.
  const [guess, setGuess] = useState(0);
  const [text, setText] = useState("0");
  const [state, setState] = useState<"guessing" | "sending" | "locked" | "error">("guessing");
  const invalid = parseGuess(text) === null;
  const busy = state === "sending" || state === "locked";

  async function lockIn() {
    setState("sending");
    // R14: the count only comes back after the guess is sent (D7). T14 shows it.
    const res = await fetch("/api/guess", { method: "POST", body: JSON.stringify({ date, index, guess }) }).catch(() => null);
    setState(res?.ok ? "locked" : "error");
  }

  return (
    <section className="flex flex-col gap-6">
      <p className="text-sm text-ink/60">
        Password {index + 1} of {passwords.length}
      </p>
      <div className="flex flex-col gap-3">
        <h2 className="text-lg leading-snug">How many times has this password appeared in data breaches?</h2>
        <p className="font-mono text-3xl break-all sm:text-4xl">{passwords[index]}</p>
      </div>
      <div className="flex flex-col gap-2">
        <input
          type="range"
          aria-label="Guess on a log scale"
          aria-valuetext={formatGuess(guess)}
          min={0}
          max={SLIDER_MAX}
          value={toSlider(guess)}
          disabled={busy}
          onChange={(e) => {
            const n = fromSlider(Number(e.target.value));
            setGuess(n);
            setText(formatGuess(n));
          }}
          className="w-full accent-cobalt"
        />
        {/* Labels sit where the slider puts them: 8 decades, so 1k is 3/8 of the way and 1m 6/8. */}
        <div className="relative h-4 font-mono text-xs text-ink/60" aria-hidden>
          <span className="absolute left-0">0</span>
          <span className="absolute left-[37.5%] -translate-x-1/2">1k</span>
          <span className="absolute left-3/4 -translate-x-1/2">1m</span>
          <span className="absolute right-0">100m</span>
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Your guess</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={text}
          disabled={busy}
          aria-invalid={invalid}
          aria-describedby="guess-help"
          onChange={(e) => {
            setText(e.target.value);
            setGuess(parseGuess(e.target.value) ?? guess);
          }}
          className="rounded-md border-2 border-ink/20 bg-white px-3 py-2 font-mono text-xl focus:border-cobalt focus:outline-none aria-invalid:border-red-700"
        />
        <span id="guess-help" className="text-sm text-ink/60">
          {invalid ? "Enter a whole number from 0 to 100m, like 2,500 or 2.5m." : "Type a number, or use k and m: 40k, 2.5m."}
        </span>
      </label>
      <button
        type="button"
        onClick={lockIn}
        disabled={invalid || busy}
        className="self-start rounded-md bg-cobalt px-6 py-3 font-semibold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt disabled:opacity-40"
      >
        {state === "sending" ? "Locking in…" : state === "locked" ? "Locked in" : "Lock in"}
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm text-red-700">
          Your guess didn&apos;t go through. Check your connection and press Lock in again.
        </p>
      )}
    </section>
  );
}

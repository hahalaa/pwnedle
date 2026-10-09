"use client";

import { useState } from "react";
import { formatGuess, fromSlider, parseGuess, SLIDER_MAX, toSlider } from "../lib/guess";

// The 0 stop, then every power of ten, one decade apart (lib/guess.ts).
const TICKS = ["0", "1", "10", "100", "1k", "10k", "100k", "1m", "10m", "100m"];

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
    <section className="flex flex-1 flex-col gap-6 sm:flex-none">
      <h2 className="text-lg leading-snug">How many times has this password appeared in data breaches?</h2>
      {/* The password sits in a bracketed 1px window; its title bar carries the progress (D25). */}
      <div className="brackets relative mx-[5px] border border-line">
        <p className="border-b border-line px-3 py-1.5 font-mono text-xs text-ash">
          password {index + 1} of {passwords.length}
        </p>
        <p className="font-mono px-3 py-6 text-3xl break-all sm:text-4xl">{passwords[index]}</p>
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
            const n = fromSlider(Number(e.target.value), guess);
            setGuess(n);
            setText(formatGuess(n));
          }}
          className="w-full"
        />
        {/* One tick per stop, at the thumb's centre: it travels from 7px to 100% - 7px (14px thumb, globals.css). */}
        <div className="relative h-7 font-mono text-xs text-ash" aria-hidden>
          {TICKS.map((t, i) => (
            <span
              key={t}
              className="absolute flex -translate-x-1/2 flex-col items-center gap-1"
              style={{ left: `calc(7px + (100% - 14px) * ${i / (TICKS.length - 1)})` }}
            >
              <span className="h-1.5 w-px bg-ash" />
              {t}
            </span>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs text-ash">your guess</span>
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
          className="border border-line bg-void px-3 py-2 font-mono text-xl focus:border-bone focus:outline-none aria-invalid:border-signal"
        />
        <span id="guess-help" className="text-sm text-ash">
          {invalid ? "Enter a whole number from 0 to 100m, like 2,500 or 2.5m." : "Type a number, or use k and m: 40k, 2.5m."}
        </span>
      </label>
      <button
        type="button"
        onClick={lockIn}
        disabled={invalid || busy}
        className="mt-auto bg-signal sm:mt-0 sm:self-start px-6 py-3 font-semibold text-void focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone disabled:bg-line disabled:text-ash"
      >
        {state === "sending" ? "Locking in…" : state === "locked" ? "Locked in" : "Lock in"}
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm text-signal">
          Your guess didn&apos;t go through. Check your connection and press Lock in again.
        </p>
      )}
    </section>
  );
}

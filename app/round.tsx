"use client";

import { useState } from "react";
import { formatGuess, fromSlider, parseGuess, SLIDER_MAX, toSlider } from "../lib/guess";

// The 0 stop, then every power of ten, with each tick at its slider position (lib/guess.ts).
const TICKS = ["0", "1", "10", "100", "1k", "10k", "100k", "1m", "10m", "100m"].map((t) => [t, toSlider(parseGuess(t)!) / SLIDER_MAX] as const);

// What /api/guess returns (R14), plus the guess that was sent.
type Result = { guess: number; count: number; score: number; tier: string; note: string };

// D25 tier colours live in globals.css as --color-<tier>.
const tierColor = (tier: string) => `var(--color-${tier.toLowerCase()})`;

export function Round({ date, passwords }: { date: string; passwords: string[] }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  // guess is the last valid number, so the slider stays put while the box holds a typo.
  const [guess, setGuess] = useState(0);
  const [text, setText] = useState("0");
  const [state, setState] = useState<"guessing" | "sending" | "error">("guessing");
  const result = results[index];
  const invalid = parseGuess(text) === null;
  const last = index === passwords.length - 1;

  async function lockIn() {
    setState("sending");
    // R14: the count only comes back after the guess is sent (D7).
    const res = await fetch("/api/guess", { method: "POST", body: JSON.stringify({ date, index, guess }) }).catch(() => null);
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (!body) return setState("error");
    setResults([...results, { guess, ...body }]);
    setState("guessing");
  }

  function next() {
    setIndex(index + 1);
    setGuess(0);
    setText("0");
  }

  return (
    <section className="flex flex-1 flex-col gap-6 sm:flex-none">
      <h2 className="text-lg leading-snug">How many times has this password appeared in data breaches?</h2>
      {/* The password sits in a bracketed 1px window; its title bar carries the progress (D25). */}
      <div className="brackets relative mx-[5px] border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-xs text-ash">
          <p>
            password {index + 1} of {passwords.length}
          </p>
          <Dots results={results} index={index} total={passwords.length} />
        </div>
        <p className="font-mono px-3 py-6 text-3xl break-all sm:text-4xl">{passwords[index]}</p>
      </div>
      {result ? (
        <Reveal result={result} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <input
              type="range"
              aria-label="Guess on a log scale"
              aria-valuetext={formatGuess(guess)}
              min={0}
              max={SLIDER_MAX}
              value={toSlider(guess)}
              disabled={state === "sending"}
              onChange={(e) => {
                const n = fromSlider(Number(e.target.value), guess);
                setGuess(n);
                setText(formatGuess(n));
              }}
              className="w-full"
            />
            {/* One tick per stop, at the thumb's centre: it travels from 7px to 100% - 7px (14px thumb, globals.css). */}
            <div className="relative h-7 font-mono text-xs text-ash" aria-hidden>
              {TICKS.map(([t, f]) => (
                <span
                  key={t}
                  className="absolute flex -translate-x-1/2 flex-col items-center gap-1"
                  style={{ left: `calc(7px + (100% - 14px) * ${f})` }}
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
              disabled={state === "sending"}
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
        </>
      )}
      {/* ponytail: "See results" does nothing until T15 adds the end screen. */}
      <button
        type="button"
        onClick={result ? (last ? undefined : next) : lockIn}
        disabled={!result && (invalid || state === "sending")}
        className="mt-auto bg-signal sm:mt-0 sm:self-start px-6 py-3 font-semibold text-void focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone disabled:bg-line disabled:text-ash"
      >
        {result ? (last ? "See results" : "Next password") : state === "sending" ? "Locking in…" : "Lock in"}
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm text-signal">
          Your guess didn&apos;t go through. Check your connection and press Lock in again.
        </p>
      )}
    </section>
  );
}

// R9: everything the API sent back, with the tier in its colour and always named (R25).
export function Reveal({ result }: { result: Result }) {
  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 font-mono">
        <div className="col-span-2">
          <dt className="text-xs text-ash">times seen in breaches</dt>
          <dd className="text-4xl">{formatGuess(result.count)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ash">your guess</dt>
          <dd className="text-xl">{formatGuess(result.guess)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ash">points</dt>
          <dd className="text-xl">
            {result.score} <span className="text-ash">/ 100</span>
          </dd>
        </div>
      </dl>
      <p className="flex items-center gap-2 font-mono" style={{ color: tierColor(result.tier) }}>
        <span className="size-3 bg-current" />
        {result.tier.toLowerCase()}
      </p>
      <p className="border-l border-line pl-3 leading-relaxed text-ash">{result.note}</p>
    </div>
  );
}

// One square per password: tier colour once revealed, outlined while current, dim until then.
export function Dots({ results, index, total }: { results: Result[]; index: number; total: number }) {
  return (
    <ol className="flex gap-1.5" aria-label={`${results.length} of ${total} revealed`}>
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className={`size-2 ${results[i] ? "" : i === index ? "border border-bone" : "border border-line"}`}
          style={results[i] ? { background: tierColor(results[i].tier) } : undefined}
        />
      ))}
    </ol>
  );
}

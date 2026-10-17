"use client";

import { useState, useSyncExternalStore } from "react";
import { formatGuess, fromSlider, parseGuess, SLIDER_MAX, toSlider } from "../lib/guess";
import { tier } from "../lib/scoring";
import { shareText } from "../lib/share";
import { isMuted, playTier } from "../lib/sound";
import { type Game, loadGame, saveGame } from "../lib/stats";

// The 0 stop, then every power of ten, with each tick at its slider position (lib/guess.ts).
const TICKS = ["0", "1", "10", "100", "1k", "10k", "100k", "1m", "10m", "100m"].map((t) => [t, toSlider(parseGuess(t)!) / SLIDER_MAX] as const);

// What /api/guess returns (R14), plus the guess that was sent.
type Result = { guess: number; count: number; score: number; tier: string; note: string };
type Saved = Game & { results: Result[] };

// True once hydrated: the server can't see localStorage, so the first render must match a fresh game.
const noop = () => () => {};
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

// D25 tier colours live in globals.css as --color-<tier>.
export const tierColor = (tier: string) => `var(--color-${tier.toLowerCase()})`;

// R27: an Umami event, once its script has loaded (app/layout.tsx). It carries the puzzle number and archive flag,
// never a password, guess or count.
const track = (event: string, puzzle: number, archive = false) =>
  (window as { umami?: { track: (event: string, data: object) => void } }).umami?.track(event, { puzzle, archive });

// `archive` is set when played from the archive, so the game stays out of stats (R18).
export function Round({ date, number, passwords, archive }: { date: string; number: number; passwords: string[]; archive?: boolean }) {
  // R16: this browser's progress resumes after a refresh. Saved results also keep a locked-in password
  // from being sent again (R15).
  const [played, setPlayed] = useState<Saved | null>(null);
  const hydrated = useHydrated();
  const game = played ?? (hydrated ? (loadGame(date) as Saved | null) : null) ?? { index: 0, done: false, results: [] };
  const { index, done, results } = game;
  // guess is the last valid number, so the slider stays put while the box holds a typo.
  const [guess, setGuess] = useState(0);
  const [text, setText] = useState("0");
  const [state, setState] = useState<"guessing" | "sending" | "error" | "rejected">("guessing");
  const result = results[index];
  const invalid = parseGuess(text) === null;
  const last = index === passwords.length - 1;

  function update(g: Saved) {
    setPlayed(g);
    saveGame(date, archive ? { ...g, archive } : g);
  }

  async function lockIn() {
    if (state === "sending") return;
    setState("sending");
    // R14: the count only comes back after the guess is sent (D7).
    const res = await fetch("/api/guess", { method: "POST", body: JSON.stringify({ date, index, guess }) }).catch(() => null);
    // A 400 means the API refused the guess itself, so blaming the connection would mislead.
    if (res?.status === 400) return setState("rejected");
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (!body) return setState("error");
    if (!results.length) track("puzzle-start", number, archive);
    if (!isMuted()) playTier(body.tier);
    update({ ...game, results: [...results, { guess, ...body }] });
    setState("guessing");
  }

  function next() {
    update({ ...game, index: index + 1 });
    setGuess(0);
    setText("0");
  }

  function finish() {
    update({ ...game, done: true });
    track("puzzle-complete", number, archive);
  }

  // Focus moves to Share when the game ends during this visit; a finished game loaded from storage leaves focus alone.
  if (done) return <End number={number} passwords={passwords} results={results} autoFocus={played !== null} />;

  return (
    <section className="flex flex-1 flex-col gap-6 sm:flex-none">
      <h2 className="text-lg leading-snug lg:text-xl">How many times has this password appeared in data breaches?</h2>
      {/* The password sits in a bracketed 1px window; its title bar carries the progress (D25). */}
      <div className="brackets relative mx-[5px] border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-xs text-ash">
          <p>
            password {index + 1} of {passwords.length}
          </p>
          <Dots results={results} index={index} total={passwords.length} />
        </div>
        <p className="font-mono px-3 py-6 text-3xl break-all sm:text-4xl lg:px-5 lg:py-10 lg:text-6xl">{passwords[index]}</p>
      </div>
      {/* Stays mounted so screen readers announce each reveal and each new password when the text changes. */}
      <p className="sr-only" aria-live="polite">
        {result
          ? `Seen ${formatGuess(result.count)} times. You guessed ${formatGuess(result.guess)}. ${result.score} points, ${result.tier.toLowerCase()}. ${result.note}`
          : `Password ${index + 1} of ${passwords.length}: ${passwords[index]}`}
      </p>
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
          {/* From lg the slider takes the extra width; the typed guess stays about as wide as on a phone (T40). */}
          <label className="flex flex-col gap-1 lg:max-w-md">
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
      <button
        type="button"
        onClick={result ? (last ? finish : next) : lockIn}
        // Not disabled while sending: a disabled button drops keyboard focus to the page.
        disabled={!result && invalid}
        className="mt-auto bg-signal sm:mt-0 sm:self-start px-6 py-3 font-semibold text-void focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone disabled:bg-line disabled:text-ash"
      >
        {result ? (last ? "See results" : "Next password") : state === "sending" ? "Locking in…" : "Lock in"}
      </button>
      {(state === "error" || state === "rejected") && (
        <p role="alert" className="text-sm text-signal">
          {state === "rejected"
            ? "That guess wasn't accepted. Enter a whole number from 0 to 100m and press Lock in again."
            : "Your guess didn't go through. Check your connection and press Lock in again."}
        </p>
      )}
    </section>
  );
}

// R9: everything the API sent back, with the tier in its colour and always named (R25).
export function Reveal({ result }: { result: Result }) {
  return (
    <div className="flex animate-enter flex-col gap-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 font-mono">
        <div className="col-span-2">
          <dt className="text-xs text-ash">times seen in breaches</dt>
          <dd className="text-4xl lg:text-6xl">{formatGuess(result.count)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ash">your guess</dt>
          <dd className="text-xl lg:text-3xl">{formatGuess(result.guess)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ash">points</dt>
          <dd className="text-xl lg:text-3xl">
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

// R12: total, daily tier, per-password breakdown and share (R19). The coffee link is only in the footer (D31).
export function End({ number, passwords, results, autoFocus }: { number: number; passwords: string[]; results: Result[]; autoFocus?: boolean }) {
  const [status, setStatus] = useState("");
  const total = results.reduce((a, r) => a + r.score, 0);
  const daily = tier(total / results.length);

  async function share() {
    const text = shareText(number, results.map((r) => r.score));
    // The share sheet on phones; the clipboard on desktop, where the sheet is less familiar.
    if (navigator.share && matchMedia("(pointer: coarse)").matches) return navigator.share({ text }).catch(() => {});
    await navigator.clipboard.writeText(text).then(
      () => setStatus("Copied to your clipboard."),
      () => setStatus("Your browser blocked copying. Press Share result to try again."),
    );
  }

  return (
    <section className="flex flex-1 animate-enter flex-col gap-6 sm:flex-none">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          {/* Decorative; the tier label beside it carries the meaning (R25, D41). */}
          <span
            aria-hidden="true"
            className="size-15 shrink-0 bg-current [mask:center/contain_no-repeat]"
            style={{ maskImage: `url(/art/${daily.toLowerCase()}.svg)` }}
          />
          <p id="end-total" className="font-mono">
            <span className="text-6xl">{total}</span> <span className="text-xl text-ash">/ 500</span>
          </p>
        </div>
        <p id="end-tier" className="flex items-center gap-2 pb-2 font-mono text-lg" style={{ color: tierColor(daily) }}>
          <span className="size-3 bg-current" />
          {daily.toLowerCase()}
        </p>
      </div>
      <div className="brackets relative mx-[5px] border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-xs text-ash">
          <p>puzzle #{number}</p>
          <p>points</p>
        </div>
        <ol className="divide-y divide-line">
          {results.map((r, i) => (
            <li key={i} className="flex items-start gap-3 px-3 py-3 font-mono">
              <div className="min-w-0 flex-1">
                <p className="break-all text-lg">{passwords[i]}</p>
                <p className="text-xs text-ash">
                  seen {formatGuess(r.count)}, you guessed {formatGuess(r.guess)}
                </p>
              </div>
              {/* R25: the tier colour always sits next to its name. */}
              <div className="flex flex-col items-end">
                <p className="text-lg">{r.score}</p>
                <p className="flex items-center gap-1.5 text-xs" style={{ color: tierColor(r.tier) }}>
                  <span className="size-2 bg-current" />
                  {r.tier.toLowerCase()}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-auto flex flex-col gap-3 sm:mt-0 sm:flex-row sm:items-center sm:gap-6">
        <button
          type="button"
          onClick={share}
          autoFocus={autoFocus}
          aria-describedby="end-total end-tier"
          className="bg-signal px-6 py-3 font-semibold text-void focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
        >
          Share result
        </button>
        <p role="status" className="text-center text-sm text-ash sm:text-left">
          {status}
        </p>
      </div>
    </section>
  );
}

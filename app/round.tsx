"use client";

import { type ComponentProps, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatGuess, fromSlider, parseGuess, SLIDER_MAX, toSlider } from "../lib/guess";
import { tier } from "../lib/scoring";
import { shareText } from "../lib/share";
import { isMuted, playTier } from "../lib/sound";
import { type Game, loadGame, saveGame } from "../lib/stats";

// A number's place along the slider, from 0 at the 0 stop to 1 at 100m (lib/guess.ts).
const pos = (n: number) => Math.min(toSlider(n), SLIDER_MAX) / SLIDER_MAX;

// The 0 stop, then every power of ten, each at its slider position.
const TICKS = ["0", "1", "10", "100", "1k", "10k", "100k", "1m", "10m", "100m"].map((t) => [t, pos(parseGuess(t)!)] as const);

// T43: every reveal timing, in ms, and the zoom. The fill sweeps to the guess over `charge`, and the view zooms in
// over the last `zoomIn` of it until the guess sits `fill` of the way across, never past `maxZoom`. After `hold` it
// zooms back out over `zoomOut`: the tier colour, the count's marker and the points arrive, and the tier sound plays
// as it lands. The rest of the reveal and the button then fade in over `fade`. The zooms and the climbing points use
// `ease`; the fill and the fades for the marker and points use `easeOut`.
export const REVEAL = {
  charge: 750,
  zoomIn: 450,
  hold: 100,
  zoomOut: 600,
  fade: 200,
  fill: 0.85,
  maxZoom: 4,
  ease: "cubic-bezier(0.65, 0, 0.35, 1)",
  easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
};

// What /api/guess returns (R14), plus the guess that was sent.
type Result = { guess: number; count: number; score: number; tier: string; note: string };
type Saved = Omit<Game, "results"> & { results: Result[] };

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
  // T43: the reveal locked in during this visit animates; `playing` hides its tier and the button until it lands.
  const [fresh, setFresh] = useState(-1);
  const [playing, setPlaying] = useState(false);
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
    // Reduced motion, or a browser without the Web Animations API, gets the end state and the sound at once.
    if (typeof document.body.animate === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFresh(index);
      setPlaying(true);
    } else if (!isMuted()) playTier(body.tier);
    update({ ...game, results: [...results, { guess, ...body }] });
    setState("guessing");
  }

  function land() {
    setPlaying(false);
    if (!isMuted()) playTier(result.tier);
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
    <section className="flex flex-1 flex-col gap-6 sm:flex-none short:gap-4">
      <h2 className="text-lg leading-snug lg:text-xl">How many times has this password appeared in data breaches?</h2>
      {/* The password sits in a bracketed 1px window; its title bar carries the progress (D25). */}
      <div className="brackets relative mx-(--bracket) border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-xs text-ash">
          <p>
            password {index + 1} of {passwords.length}
          </p>
          <Dots results={playing ? results.slice(0, index) : results} index={index} total={passwords.length} />
        </div>
        <p className="font-mono px-3 py-6 text-3xl break-all sm:text-4xl lg:px-5 lg:py-10 lg:text-6xl short:py-6 short:text-5xl">{passwords[index]}</p>
      </div>
      {/* Stays mounted so screen readers announce each reveal and each new password when the text changes. */}
      <p className="sr-only" aria-live="polite">
        {result
          ? `Seen ${formatGuess(result.count)} times. You guessed ${formatGuess(result.guess)}. ${result.score} points, ${result.tier.toLowerCase()}. ${result.note}`
          : `Password ${index + 1} of ${passwords.length}: ${passwords[index]}`}
      </p>
      {result ? (
        <Reveal result={result} play={fresh === index} onLand={land} />
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
            <Ticks />
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
        className={`${playing ? "opacity-0" : "animate-enter"} mt-auto bg-signal sm:mt-0 sm:self-start px-6 py-3 font-semibold text-void focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone disabled:bg-line disabled:text-ash`}
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

// A point at `at` along the bar, inside a full-width layer. The reveal zooms by moving that layer, so the point keeps
// pace with the stretched track without stretching itself.
function Pin({ at, className, ...props }: { at: number } & ComponentProps<"div">) {
  return (
    <div data-at={at} className="absolute inset-0">
      <div {...props} className={`absolute -translate-x-1/2 ${className}`} style={{ left: `${at * 100}%` }} />
    </div>
  );
}

// One tick per stop. The margins match the slider thumb's centre, which travels from half the thumb's width in from
// each end (--thumb, globals.css).
function Ticks() {
  return (
    <div className="relative mx-[calc(var(--thumb)/2)] h-7 font-mono text-xs text-ash" aria-hidden>
      {TICKS.map(([t, f]) => (
        <Pin key={t} at={f} className="flex flex-col items-center gap-1">
          <span className="h-1.5 w-px bg-ash" />
          {t}
        </Pin>
      ))}
    </div>
  );
}

// R9: everything the API sent back, with the tier in its colour and always named (R25). The read-only slider shows
// the guess filled in the tier colour and a line at the count. Rendered as is, this is the end state; with `play`,
// the T43 animations run first and call `onLand` as the zoom out ends.
export function Reveal({ result, play, onLand }: { result: Result; play?: boolean; onLand?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const guess = pos(result.guess);
  const land = useEffectEvent(() => onLand?.());

  // Before paint, so the end state never flashes before the animations take over.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!play || !el) return;
    const { charge, zoomIn, hold, zoomOut, fade, fill, maxZoom, ease, easeOut } = REVEAL;
    const out = charge + hold;
    const end = out + zoomOut;
    // A guess of 0 has nothing to fill, so it gets the full zoom.
    const zoom = Math.min(Math.max(fill / guess, 1), maxZoom);
    const all = (selector: string) => [...el.querySelectorAll<HTMLElement>(selector)];
    // Keyframes timed in ms from the start. Each animation ends at its last keyframe and leaves the element in its
    // CSS end state.
    const run = (e: Element, frames: (Keyframe & { at: number })[]) => {
      const duration = frames.at(-1)!.at;
      return e.animate(frames.map(({ at, ...k }) => ({ ...k, offset: at / duration })), duration);
    };
    const zoomed = (transform: (scale: number) => string) => [
      { at: 0, transform: transform(1) },
      { at: Math.max(charge - zoomIn, 0), transform: transform(1), easing: ease },
      { at: charge, transform: transform(zoom) },
      { at: out, transform: transform(zoom), easing: ease },
      { at: end, transform: transform(1) },
    ];
    const anims = [
      run(el.querySelector("[data-track]")!, zoomed((s) => `scaleX(${s})`)),
      ...all("[data-at]").map((e) => run(e, zoomed((s) => `translateX(${Number(e.dataset.at) * (s - 1) * 100}%)`))),
      run(el.querySelector("[data-fill]")!, [{ at: 0, transform: "scaleX(0)", easing: easeOut }, { at: charge, transform: `scaleX(${guess})` }]),
      // Off-white until the zoom out, then the tier colour from the CSS.
      ...all("[data-tint]").map((e) => run(e, [{ at: 0, color: "var(--color-bone)" }, { at: out, color: "var(--color-bone)" }])),
      ...all("[data-count-marker]").map((e) => run(e, [{ at: 0, opacity: 0 }, { at: out, opacity: 0, easing: easeOut }, { at: out + zoomOut / 2, opacity: 1 }])),
      ...all("[data-points]").map((e) => run(e, [{ at: 0, opacity: 0 }, { at: out, opacity: 0, easing: easeOut }, { at: out + fade, opacity: 1 }])),
      ...all("[data-later]").map((e) =>
        run(e, [
          { at: 0, opacity: 0, transform: "translateY(4px)" },
          { at: end, opacity: 0, transform: "translateY(4px)", easing: "ease-out" },
          { at: end + fade, opacity: 1, transform: "none" },
        ]),
      ),
      // An animation with no keyframes. The points read its eased progress, so they climb in step with the zoom out.
      el.animate([], { delay: out, duration: zoomOut, easing: ease, fill: "both" }),
    ];

    const score = el.querySelector("[data-score]")!;
    let frame = 0;
    const count = () => {
      score.textContent = String(Math.round(result.score * (anims.at(-1)!.effect!.getComputedTiming().progress ?? 0)));
      frame = requestAnimationFrame(count);
    };
    count();

    // A click or key press skips to the landing, so the details still fade in with the button. It's then swallowed,
    // so it can't also follow a link or press the hidden button.
    const skip = (e: Event) => {
      if (e.type === "click" || ["Enter", " "].includes((e as KeyboardEvent).key)) {
        e.preventDefault();
        e.stopPropagation();
      }
      anims.forEach((a) => (a.currentTime = end));
    };
    addEventListener("click", skip, true);
    addEventListener("keydown", skip, true);
    const stop = () => {
      cancelAnimationFrame(frame);
      score.textContent = String(result.score);
      removeEventListener("click", skip, true);
      removeEventListener("keydown", skip, true);
    };
    anims[0].finished.then(() => {
      stop();
      land();
    }, () => {});
    return () => {
      stop();
      anims.forEach((a) => a.cancel());
    };
  }, [play, guess, result.score]);

  return (
    <div ref={ref} className="flex flex-col gap-5 short:gap-3">
      {/* Decorative: the numbers below and the live region carry the values. The clip box runs 16px past the bar so
          the end labels and the zoomed track aren't cut at its edge. */}
      <div className="-mx-4 flex flex-col gap-2 overflow-hidden px-4" aria-hidden>
        <div className="relative mx-[calc(var(--thumb)/2)] h-11" style={{ color: tierColor(result.tier) }}>
          <div data-track className="track absolute inset-0 origin-left">
            <div
              data-fill
              data-tint
              className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 origin-left bg-current"
              style={{ transform: `scaleX(${guess})` }}
            />
          </div>
          <Pin at={guess} data-tint className="inset-y-[0.6875rem] w-(--thumb) bg-current" />
          <Pin at={pos(result.count)} data-count-marker className="inset-y-0 w-px bg-bone" />
        </div>
        <Ticks />
      </div>
      {/* On short screens the count, guess and points share one row. */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 font-mono short:grid-cols-3 short:items-end">
        <div data-later className="col-span-2 short:col-span-1">
          <dt className="text-xs text-ash">times seen in breaches</dt>
          <dd className="text-4xl lg:text-6xl">{formatGuess(result.count)}</dd>
        </div>
        <div data-later>
          <dt className="text-xs text-ash">your guess</dt>
          <dd className="text-xl lg:text-3xl">{formatGuess(result.guess)}</dd>
        </div>
        <div data-points>
          <dt className="text-xs text-ash">points</dt>
          <dd className="text-xl lg:text-3xl">
            <span data-score>{result.score}</span> <span className="text-ash">/ 100</span>
          </dd>
        </div>
      </dl>
      <p data-later className="flex items-center gap-2 font-mono" style={{ color: tierColor(result.tier) }}>
        <span className="size-3 bg-current" />
        {result.tier.toLowerCase()}
      </p>
      <p data-later className="border-l border-line pl-3 leading-relaxed text-ash">{result.note}</p>
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
    <section className="flex flex-1 animate-enter flex-col gap-6 sm:flex-none short:gap-4">
      {/* The daily tier sits with the total it describes, and wraps under it on narrow phones. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        {/* Decorative; the tier label beside it carries the meaning (R25, D41). */}
        <span
          aria-hidden="true"
          className="size-15 shrink-0 bg-current [mask:center/contain_no-repeat]"
          style={{ maskImage: `url(/art/${daily.toLowerCase()}.svg)` }}
        />
        <p id="end-total" className="font-mono">
          <span className="text-6xl">{total}</span> <span className="text-xl text-ash">/ 500</span>
        </p>
        <p id="end-tier" className="flex items-center gap-2 pb-2 font-mono text-lg" style={{ color: tierColor(daily) }}>
          <span className="size-3 bg-current" />
          {daily.toLowerCase()}
        </p>
      </div>
      <div className="brackets relative mx-(--bracket) border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-xs text-ash">
          <p>puzzle #{number}</p>
          <p>points</p>
        </div>
        <ol className="divide-y divide-line">
          {results.map((r, i) => (
            <li key={i} className="flex items-start gap-3 px-3 py-3 font-mono short:py-2">
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
          className="bg-signal px-6 py-3 font-semibold text-void enabled:hover:brightness-110 enabled:active:brightness-90 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
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

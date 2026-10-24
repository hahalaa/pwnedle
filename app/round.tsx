"use client";

import { type ComponentProps, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { crowd, crowdLine } from "../lib/crowd";
import { DECADE, formatGuess, fromSlider, missRatio, parseGuess, SLIDER_MAX, toSlider } from "../lib/guess";
import { tier } from "../lib/scoring";
import { shareText } from "../lib/share";
import { isMuted, playTier, unlockAudio } from "../lib/sound";
import { type Game, loadGame, saveGame } from "../lib/stats";
import { Halloween, Sticker } from "./pumpkin";
import { TierBars } from "./stats";

// A number's place along the slider, from 0 at the 0 stop to 1 at 100m (lib/guess.ts).
const pos = (n: number) => Math.min(toSlider(n), SLIDER_MAX) / SLIDER_MAX;

// The 0 stop, then every power of ten, each at its slider position.
const TICKS = ["0", "1", "10", "100", "1k", "10k", "100k", "1m", "10m", "100m"].map((t) => [t, pos(parseGuess(t)!)] as const);

// T48: every reveal timing, in ms, and the chart's zoom. The chart fades in around the guess over `hold`, then eases out
// over `zoom` until it fits the guess and the count. The points climb as the meter fills, from `overlap` before the zoom
// ends until `meter` after it, so the motion never stalls, and the tier sound plays as it lands. The tier, note and button fade in
// over `fade`, `stagger` apart, the button last as it lands. The chart never shows less than `view` of the axis (two
// decades), and leaves `margin` of the gap between guess and count on each side.
export const REVEAL = {
  hold: 150,
  zoom: 800,
  meter: 600,
  overlap: 150,
  fade: 200,
  stagger: 40,
  view: (2 * DECADE) / SLIDER_MAX,
  margin: 0.2,
  ease: "cubic-bezier(0.65, 0, 0.35, 1)",
  easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
};

// A stretch of the axis as [from, to], each a place along it like `pos`.
type View = readonly [number, number];

// A view `width` wide around `mid`, at least REVEAL.view wide and moved as needed to stay on the axis.
const fit = (mid: number, width: number): View => {
  const w = Math.min(Math.max(width, REVEAL.view), 1);
  const from = Math.min(Math.max(mid - w / 2, 0), 1 - w);
  return [from, from + w];
};

// T48: where the chart starts, zoomed in around the guess, and where it ends, fitting both.
export function chartViews(guess: number, count: number): [View, View] {
  return [fit(guess, 0), fit((guess + count) / 2, Math.abs(count - guess) * (1 + 2 * REVEAL.margin))];
}

// Transforms that show `view` across the chart: `stretch` for the axis, `place` for a full-width layer holding a point
// at `at`, which moves without stretching.
const scale = ([from, to]: View) => 1 / (to - from);
const stretch = (view: View) => `translateX(${-view[0] * scale(view) * 100}%) scaleX(${scale(view)})`;
const place = (view: View, at: number) => `translateX(${(at * (scale(view) - 1) - view[0] * scale(view)) * 100}%)`;

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

// `archive` is set when played from the archive, so the game stays out of stats (R18). `theme` decorates a theme day (D49).
export function Round({ date, number, passwords, archive, theme }: { date: string; number: number; passwords: string[]; archive?: boolean; theme?: string }) {
  // R16: this browser's progress resumes after a refresh. Saved results also keep a locked-in password
  // from being sent again (R15).
  const [played, setPlayed] = useState<Saved | null>(null);
  const hydrated = useHydrated();
  const game = played ?? (hydrated ? (loadGame(date) as Saved | null) : null) ?? { index: 0, done: false, results: [] };
  const { done, results } = game;
  // T56: a password reopened from the end screen shows its saved reveal again. It lives only in this state, so nothing
  // is saved, sent or tracked, and a refresh lands back on the end screen. `back` is the row to focus on return.
  const [reopened, setReopened] = useState<number | null>(null);
  const [back, setBack] = useState<number>();
  const index = reopened ?? game.index;
  // guess is the last valid number, so the slider stays put while the box holds a typo.
  const [guess, setGuess] = useState(0);
  const [text, setText] = useState("0");
  const [state, setState] = useState<"guessing" | "sending" | "error" | "rejected">("guessing");
  // T43: the reveal locked in during this visit animates; `playing` hides its tier and the button until it lands.
  const [fresh, setFresh] = useState(-1);
  const [playing, setPlaying] = useState(false);
  // T51: Enter anywhere on the round locks in and focuses the button, so Enter goes on to the next password. A Next from
  // the keyboard or a mouse focuses the next box; a touch or pen tap leaves it alone. Enter never locks in the default 0
  // before the player has touched the slider or the box, so a held or repeated Enter can't guess for them.
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLInputElement>(null);
  // On a touch screen the box is never focused for the player, since that opens the keyboard. iOS can send a tap's click
  // with an empty pointerType, so the pointer type alone can't tell.
  const canFocusBox = () => !matchMedia("(pointer: coarse)").matches;
  const focusBox = () => canFocusBox() && box.current?.focus();
  const [typing, setTyping] = useState(false);
  const [touched, setTouched] = useState(false);
  const result = results[index];
  // T68: an untouched box is empty while focused, so it isn't marked invalid.
  const invalid = touched && parseGuess(text) === null;
  const last = index === passwords.length - 1;
  // T57: the running total in the title bar. A fresh reveal leaves its points out until the Reveal climbs them in; a
  // reopened one shows the total as it stood after that password.
  const total = useRef<HTMLSpanElement>(null);
  const before = results.slice(0, index).reduce((a, r) => a + r.score, 0);
  const climbing = playing && reopened === null;

  // The archive flag goes on the game in memory too, so the end screen knows it was never sent (T64).
  function update(g: Saved) {
    const saved = archive ? { ...g, archive } : g;
    setPlayed(saved);
    saveGame(date, saved);
  }

  async function lockIn() {
    if (state === "sending") return;
    // Still inside the click or Enter, before the fetch and the animation delay the sound.
    unlockAudio();
    setState("sending");
    // R14: the count only comes back after the guess is sent (D7).
    const res = await fetch("/api/guess", { method: "POST", body: JSON.stringify({ date, index, guess }) }).catch(() => null);
    // A 400 means the API refused the guess itself, so blaming the connection would mislead.
    if (res?.status === 400) return setState("rejected");
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (!body) return setState("error");
    if (!results.length) track("puzzle-start", number, archive);
    play(index, body.tier);
    update({ ...game, results: [...results, { guess, ...body }] });
    setState("guessing");
  }

  // Reduced motion, or a browser without the Web Animations API, gets the end state and the sound at once.
  function play(i: number, tier: string) {
    const motion = typeof document.body.animate === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFresh(motion ? i : -1);
    setPlaying(motion);
    if (!motion && !isMuted()) playTier(tier);
  }

  function reopen(i: number) {
    unlockAudio();
    setReopened(i);
    play(i, results[i].tier);
  }

  function leave() {
    setBack(reopened!);
    setReopened(null);
  }

  function land() {
    setPlaying(false);
    if (!isMuted()) playTier(result.tier);
  }

  // A click from the keyboard has an empty pointerType, or none in browsers that fire a plain MouseEvent.
  function next(e: { nativeEvent: Event }) {
    setTyping(canFocusBox() && !["touch", "pen"].includes((e.nativeEvent as PointerEvent).pointerType));
    setTouched(false);
    update({ ...game, index: index + 1 });
    setGuess(0);
    setText("0");
  }

  function finish() {
    update({ ...game, done: true });
    track("puzzle-complete", number, archive);
    // T63: a finished daily game adds its total to the day's counts; archive games never do. `done` is saved above and
    // a finished game never shows See results again, so this sends once, refreshes included. Nothing waits on it.
    if (!archive) {
      const body = JSON.stringify({ date, guesses: results.map((r) => r.guess) });
      fetch("/api/scores", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }

  // Links, buttons and open dialogs keep their own Enter. While the reveal plays, the T43 skip swallows Enter first.
  // Escape leaves a reopened reveal; while it plays, the skip swallows Escape too.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (document.querySelector("dialog[open]")) return;
    if (e.key === "Escape" && reopened !== null) return leave();
    if (e.key !== "Enter" || (e.target as Element).closest("a, button")) return;
    // Without this the keypress follows focus to the button and locks in a second time.
    e.preventDefault();
    if (result) button.current?.click();
    else if (touched && !invalid) {
      button.current?.focus();
      lockIn();
    } else focusBox();
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    addEventListener("keydown", listener);
    return () => removeEventListener("keydown", listener);
  }, []);

  const ended = done && reopened === null;

  return (
    <>
      {/* Stays mounted, and empty on the end screen, so screen readers announce each reveal, reopened ones included, and
          each new password when the text changes. */}
      <p className="sr-only" aria-live="polite">
        {ended
          ? ""
          : result
            ? `Seen ${formatGuess(result.count)} times. You guessed ${formatGuess(result.guess)}: ${missRatio(result.guess, result.count).toLowerCase()}. ${result.score} points, ${result.tier.toLowerCase()}. ${result.note}`
            : `Password ${index + 1} of ${passwords.length}: ${passwords[index]}`}
      </p>
      {/* Focus moves to Share when the game ends during this visit; a finished game loaded from storage leaves focus alone. */}
      {ended ? (
        <End date={date} archive={archive} sent={!game.archive} number={number} passwords={passwords} results={results} autoFocus={played !== null} back={back} onOpen={reopen} theme={theme} />
      ) : (
        <section className="flex flex-1 flex-col gap-6 sm:flex-none short:gap-4">
          <h2 className="text-lg leading-snug lg:text-xl">How many times has this password appeared in data breaches?</h2>
          {/* The password sits in a bracketed 1px window; its title bar carries the progress (D25). */}
          <div className="brackets relative mx-(--bracket) border border-line">
            {theme === "halloween" && <Halloween />}
            <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-xs text-ash">
              <p>
                password {index + 1} of {passwords.length}
              </p>
              {/* A fresh reveal's dot fills as it lands; a reopened one keeps every dot filled. */}
              <div className="flex items-center gap-3 whitespace-nowrap">
                {/* Only the number sits in its span, so the Reveal can write to it while React keeps it as text content. */}
                <p className="tabular-nums">
                  <span ref={total}>{before + (result && !climbing ? result.score : 0)}</span> / {passwords.length * 100}
                </p>
                <Dots results={climbing ? results.slice(0, index) : results} index={index} total={passwords.length} />
              </div>
            </div>
            <p className="px-3 py-6 text-3xl break-all sm:text-4xl lg:px-5 lg:py-10 lg:text-6xl short:py-6 short:text-5xl">{passwords[index]}</p>
          </div>
          {result ? (
            <Reveal
              result={result}
              play={fresh === index}
              onLand={land}
              onClimb={reopened === null ? (n) => total.current && (total.current.textContent = String(before + n)) : undefined}
            />
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
                    setTouched(true);
                  }}
                  className="w-full"
                />
                <Ticks />
              </div>
              {/* From lg the slider takes the extra width; the typed guess stays about as wide as on a phone (T40). */}
              <label className="flex flex-col gap-1 lg:max-w-md">
                <span className="text-xs text-ash">your guess</span>
                <input
                  type="text"
                  // Full keyboard, so k and m can be typed (T66); parseGuess still takes only numbers (D4).
                  inputMode="text"
                  enterKeyHint="go"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={text}
                  disabled={state === "sending"}
                  aria-invalid={invalid}
                  aria-describedby="guess-help"
                  ref={box}
                  autoFocus={typing}
                  // T68: the untouched 0 clears on focus, so typing doesn't append to it, and comes back if left empty.
                  placeholder="0"
                  onFocus={() => touched || setText("")}
                  onBlur={() => touched || setText("0")}
                  onChange={(e) => {
                    setText(e.target.value);
                    setGuess(parseGuess(e.target.value) ?? guess);
                    setTouched(true);
                  }}
                  className="border border-line bg-void px-3 py-2 text-xl placeholder:text-ash focus:border-bone focus:outline-none aria-invalid:border-signal"
                />
                <span id="guess-help" className="text-sm text-ash">
                  {invalid ? "Enter a whole number from 0 to 100m, like 2,500 or 2.5m." : "Type a number, or use k and m: 40k, 2.5m."}
                </span>
              </label>
            </>
          )}
          <button
            ref={button}
            type="button"
            // A keyboard press (`detail` 0) on an untouched Lock in goes to the box instead of sending 0.
            onClick={reopened !== null ? leave : result ? (last ? finish : next) : (e) => (touched || e.detail ? lockIn() : focusBox())}
            // A reopened reveal takes focus from the row that opened it, which is gone.
            autoFocus={reopened !== null}
            // Not disabled while sending: a disabled button drops keyboard focus to the page.
            disabled={!result && invalid}
            className={`${playing ? "opacity-0" : "animate-enter"} mt-auto bg-signal sm:mt-0 sm:self-start px-6 py-3 font-semibold text-void focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone disabled:bg-line disabled:text-ash`}
          >
            {reopened !== null ? "Back to results" : result ? (last ? "See results" : "Next password") : state === "sending" ? "Locking in…" : "Lock in"}
          </button>
          {(state === "error" || state === "rejected") && (
            <p role="alert" className="text-sm text-signal">
              {state === "rejected"
                ? "That guess wasn't accepted. Enter a whole number from 0 to 100m and press Lock in again."
                : "Your guess didn't go through. Check your connection and press Lock in again."}
            </p>
          )}
        </section>
      )}
    </>
  );
}

// A point at `at` along the axis, inside a full-width layer. With `view`, the layer moves so the point lands where that
// stretch of the axis puts it; the reveal's chart zooms by animating that move.
function Pin({ at, view, className, ...props }: { at: number; view?: View } & ComponentProps<"div">) {
  return (
    <div data-at={at} className="absolute inset-0" style={view && { transform: place(view, at) }}>
      <div {...props} className={`absolute -translate-x-1/2 ${className}`} style={{ left: `${at * 100}%` }} />
    </div>
  );
}

// One tick per stop. The margins match the slider thumb's centre, which travels from half the thumb's width in from
// each end (--thumb, globals.css).
function Ticks({ view }: { view?: View }) {
  return (
    <div className="relative mx-[calc(var(--thumb)/2)] h-7 text-xs text-ash" aria-hidden>
      {TICKS.map(([t, f]) => (
        <Pin key={t} at={f} view={view} className="flex flex-col items-center gap-1">
          <span className="h-1.5 w-px bg-ash" />
          {t}
        </Pin>
      ))}
    </div>
  );
}

// R9: everything the API sent back, with the tier in its colour and always named (R25), laid out as in T48: a chart of
// the guess and the count on the log axis, labelled with both, then how far off the guess was, the points and a meter.
// Rendered as is, this is the end state; with `play`, the animations run first and call `onLand` as the points finish
// climbing, passing each step of the climb to `onClimb`.
export function Reveal({ result, play, onLand, onClimb }: { result: Result; play?: boolean; onLand?: () => void; onClimb?: (points: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const guess = pos(result.guess);
  const count = pos(result.count);
  const end = chartViews(guess, count)[1];
  const land = useEffectEvent(() => onLand?.());
  const climb = useEffectEvent((points: number) => onClimb?.(points));

  // Before paint, so the end state never flashes before the animations take over.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!play || !el) return;
    const { hold, zoom, meter, overlap, fade, stagger, ease, easeOut } = REVEAL;
    const [from, to] = chartViews(guess, count);
    const done = hold + zoom + meter;
    const climbs = done - meter - overlap;
    const all = (selector: string) => [...el.querySelectorAll<HTMLElement>(selector)];
    // Keyframes timed in ms from the start. Each animation ends at its last keyframe and leaves the element in its
    // CSS end state.
    const run = (e: Element, frames: (Keyframe & { at: number })[]) => {
      const duration = frames.at(-1)!.at;
      return e.animate(frames.map(({ at, ...k }) => ({ ...k, offset: at / duration })), duration);
    };
    // Views along the zoom. The width changes by the same factor at each step, so the sweep moves evenly across decades;
    // `ease` then runs across the whole zoom.
    const views = Array.from({ length: 9 }, (_, i): View => {
      const t = i / 8;
      return fit(((from[0] + from[1]) * (1 - t) + (to[0] + to[1]) * t) / 2, (from[1] - from[0]) ** (1 - t) * (to[1] - to[0]) ** t);
    });
    const zooms = (e: Element, transform: (view: View) => string) =>
      e.animate(views.map((view) => ({ transform: transform(view) })), { delay: hold, duration: zoom, easing: ease, fill: "both" });
    const rise = (e: Element, at: number) =>
      run(e, [
        { at: 0, opacity: 0, transform: "translateY(4px)" },
        { at, opacity: 0, transform: "translateY(4px)", easing: easeOut },
        { at: at + fade, opacity: 1, transform: "none" },
      ]);
    const later = all("[data-later]");
    const anims = [
      run(el.querySelector("[data-chart]")!, [{ at: 0, opacity: 0, easing: easeOut }, { at: hold, opacity: 1 }]),
      zooms(el.querySelector("[data-axis]")!, stretch),
      ...all("[data-at]").map((e) => zooms(e, (view) => place(view, Number(e.dataset.at)))),
      rise(el.querySelector("[data-points]")!, climbs),
      run(el.querySelector("[data-meter]")!, [
        { at: 0, transform: "scaleX(0)" },
        { at: climbs, transform: "scaleX(0)", easing: ease },
        { at: done, transform: `scaleX(${result.score / 100})` },
      ]),
      // The tier and the note lead the button, which fades in as it lands.
      ...later.map((e, i) => rise(e, done - (later.length - i) * stagger)),
      // An animation with no keyframes. The points read its eased progress, so they climb in step with the meter.
      el.animate([], { delay: climbs, duration: done - climbs, easing: ease, fill: "both" }),
    ];

    const score = el.querySelector("[data-score]")!;
    // Only the frame loop passes points on; the landing renders the full total.
    let frame = 0;
    const tick = () => {
      const points = Math.round(result.score * (anims.at(-1)!.effect!.getComputedTiming().progress ?? 0));
      score.textContent = String(points);
      climb(points);
      frame = requestAnimationFrame(tick);
    };
    tick();

    // A click or key press skips to the landing, so the details still fade in with the button. It's then swallowed,
    // so it can't also follow a link, press the hidden button or leave a reopened reveal (T56).
    const skip = (e: Event) => {
      if (e.type === "click" || ["Enter", " ", "Escape"].includes((e as KeyboardEvent).key)) {
        e.preventDefault();
        e.stopPropagation();
      }
      anims.forEach((a) => (a.currentTime = done));
    };
    addEventListener("click", skip, true);
    addEventListener("keydown", skip, true);
    const stop = () => {
      cancelAnimationFrame(frame);
      score.textContent = String(result.score);
      removeEventListener("click", skip, true);
      removeEventListener("keydown", skip, true);
    };
    anims.at(-1)!.finished.then(() => {
      stop();
      land();
    }, () => {});
    return () => {
      stop();
      anims.forEach((a) => a.cancel());
    };
  }, [play, guess, count, result.score]);

  // A chart label's place along the chart once it has zoomed out, from 0 at the left edge to 1 at the right. The label
  // shifts left by that share of its own width, so it stays inside the chart at either end.
  const label = (at: number) => ({ translate: `${-Math.min(Math.max((at - end[0]) * scale(end), 0), 1) * 100}%` });

  return (
    <div ref={ref} className="flex flex-col gap-6 short:gap-4" style={{ color: tierColor(result.tier) }}>
      {/* The labels carry the numbers on two rows, so they never collide. The chart is inset from the clip box so the
          end labels aren't cut once it has zoomed out. */}
      <div data-chart className="overflow-hidden px-3">
        <div className="relative mx-[calc(var(--thumb)/2)] h-20 text-xs">
          <div data-axis className="track absolute inset-x-0 bottom-0 h-px origin-left" style={{ transform: stretch(end) }} />
          <Pin at={count} view={end} className="top-5 bottom-0 border-l border-dashed border-bone">
            <span className="absolute bottom-full left-1/2 mb-1 whitespace-nowrap text-ash" style={label(count)}>
              answer <span className="font-semibold text-bone">{formatGuess(result.count)}</span>
            </span>
          </Pin>
          <Pin at={guess} view={end} className="top-11 bottom-0 w-0.5 bg-current">
            <span className="absolute bottom-full left-1/2 mb-1 whitespace-nowrap text-ash" style={label(guess)}>
              you <span className="font-semibold" style={{ color: tierColor(result.tier) }}>{formatGuess(result.guess)}</span>
            </span>
          </Pin>
        </div>
        <Ticks view={end} />
      </div>
      {/* The ratio is the one large figure; the points and tier sit small beside it, with the meter underneath. */}
      <div data-points>
        <div className="flex items-end justify-between gap-4">
          <p className="text-2xl tracking-tight sm:text-4xl lg:text-5xl short:text-4xl">{missRatio(result.guess, result.count)}</p>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="text-ash">
              <span data-score className="text-xl font-semibold text-bone lg:text-2xl">
                {result.score}
              </span>
              <span className="text-xs">/100</span>
            </p>
            <p data-later className="flex items-center gap-1.5 text-xs">
              <span className="size-2 bg-current" />
              {result.tier.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="mt-3 h-0.5 bg-line" aria-hidden>
          <div data-meter className="h-full origin-left bg-current" style={{ transform: `scaleX(${result.score / 100})` }} />
        </div>
      </div>
      <p data-later className="max-w-prose leading-relaxed text-ash">{result.note}</p>
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

// R12: total, daily tier, per-password breakdown and share (R19). The coffee link is only in the footer (D31). Each row
// reopens its reveal (T56). Coming `back` from one, the screen doesn't fade in again and focus returns to that row.
// T64: how everyone did loads once the screen is up. Any failure, a 429 or a request slower than 5 s hides it, and on
// desktop its column, held open from the first render, collapses. `sent` marks a game finished as a daily one (D51).
export function End({ date, archive, sent, number, passwords, results, autoFocus, back, onOpen, theme }: { date?: string; archive?: boolean; sent?: boolean; number: number; passwords: string[]; results: Result[]; autoFocus?: boolean; back?: number; onOpen?: (i: number) => void; theme?: string }) {
  const [status, setStatus] = useState("");
  // null while loading; false once the read fails or the day has no players.
  const [others, setOthers] = useState<ReturnType<typeof crowd> | null | false>(null);
  const total = results.reduce((a, r) => a + r.score, 0);
  const daily = tier(total / results.length);
  const column = date && others !== false;

  useEffect(() => {
    if (!date) return;
    let live = true;
    fetch(`/api/scores?date=${date}`, { signal: AbortSignal.timeout(5000) })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body) => crowd(body.counts, total, !!sent))
      .then((c) => live && setOthers(c.players > 0 && c), () => live && setOthers(false));
    return () => {
      live = false;
    };
  }, [date, total, sent]);

  async function share() {
    const text = shareText(number, results.map((r) => r.score), theme);
    // The share sheet on phones; the clipboard on desktop, where the sheet is less familiar.
    if (navigator.share && matchMedia("(pointer: coarse)").matches) return navigator.share({ text }).catch(() => {});
    await navigator.clipboard.writeText(text).then(
      () => setStatus("Copied to your clipboard."),
      () => setStatus("Your browser blocked copying. Press Share result to try again."),
    );
  }

  return (
    // From lg up the chart takes a column beside the breakdown, so the screen grows no taller; on phones it follows Share.
    <section className={`flex flex-1 ${back === undefined ? "animate-enter" : ""} flex-col gap-6 sm:flex-none short:gap-4 ${column ? "lg:grid lg:grid-cols-[1fr_20rem] lg:gap-x-10" : ""}`}>
      {/* The daily tier sits with the total it describes, and wraps under it on narrow phones. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 lg:col-span-2">
        {/* Decorative; the tier label beside it carries the meaning (R25, D41). */}
        <span aria-hidden="true" className="relative size-15 shrink-0">
          <span className="absolute inset-0 bg-current [mask:center/contain_no-repeat]" style={{ maskImage: `url(/art/${daily.toLowerCase()}.svg)` }} />
          {theme === "halloween" && <Sticker tier={daily} />}
        </span>
        <p id="end-total">
          <span className="text-6xl">{total}</span> <span className="text-xl text-ash">/ 500</span>
        </p>
        <p id="end-tier" className="flex items-center gap-2 pb-2 text-lg" style={{ color: tierColor(daily) }}>
          <span className="size-3 bg-current" />
          {daily.toLowerCase()}
        </p>
        {others && <p className="basis-full text-sm text-ash">{crowdLine(others, archive)}</p>}
      </div>
      <div className="brackets relative mx-(--bracket) border border-line">
        {theme === "halloween" && <Halloween />}
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-xs text-ash">
          <p>puzzle #{number}</p>
          <p>points</p>
        </div>
        <ol className="divide-y divide-line">
          {results.map((r, i) => (
            <li key={i}>
              {/* A button holds only phrasing content, so the rows are spans. The outline sits inside the window's frame. */}
              <button
                type="button"
                onClick={() => onOpen?.(i)}
                autoFocus={i === back}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-line/40 focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-bone short:py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-all text-lg">{passwords[i]}</span>
                  <span className="block text-xs text-ash">
                    seen {formatGuess(r.count)}, you guessed {formatGuess(r.guess)}
                  </span>
                </span>
                {/* R25: the tier colour always sits next to its name. */}
                <span className="flex flex-col items-end">
                  <span className="text-lg">{r.score}</span>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: tierColor(r.tier) }}>
                    <span className="size-2 bg-current" />
                    {r.tier.toLowerCase()}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-auto flex flex-col gap-3 sm:mt-0 sm:flex-row sm:items-center sm:gap-6">
        <button
          type="button"
          onClick={share}
          autoFocus={autoFocus && back === undefined}
          aria-describedby="end-total end-tier"
          className="bg-signal px-6 py-3 font-semibold text-void enabled:hover:brightness-110 enabled:active:brightness-90 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
        >
          Share result
        </button>
        <p role="status" className="text-center text-sm text-ash sm:text-left">
          {status}
        </p>
      </div>
      {others && <Crowd c={others} total={total} />}
    </section>
  );
}

// T64: a bar per 25 points, coloured by the tier it falls in, with this player's bar marked; the tiers listed under it
// name the colours (R25).
function Crowd({ c, total }: { c: ReturnType<typeof crowd>; total: number }) {
  const most = Math.max(...c.bins);
  const mine = Math.min(19, Math.floor(total / 25));
  return (
    <div className="flex animate-enter flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-2">
      <div className="flex items-baseline justify-between border-b border-line pb-2 text-xs text-ash">
        <h3>how everyone did</h3>
        <p>
          {formatGuess(c.players)} player{c.players > 1 && "s"}
        </p>
      </div>
      <div role="img" aria-label={`Bar chart of totals from 0 to 500, with your ${total} marked`} className="relative pt-5">
        <span className="absolute top-0 -translate-x-1/2 text-xs" style={{ left: `${(mine + 0.5) * 5}%` }}>
          you
        </span>
        <div className="flex h-24 items-end gap-px border-b border-line">
          {c.bins.map((n, i) => (
            <span
              key={i}
              className={`flex-1 ${i === mine ? "outline-1 outline-offset-1 outline-bone" : ""}`}
              style={{ height: `${(n / most) * 100}%`, background: tierColor(tier(i * 5)) }}
            />
          ))}
        </div>
        <div className="flex justify-between pt-1 text-xs text-ash">
          <span>0</span>
          <span>250</span>
          <span>500</span>
        </div>
      </div>
      <TierBars tiers={c.tiers} unit="%" />
    </div>
  );
}

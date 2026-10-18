import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DECADE, SLIDER_MAX } from "../lib/guess";
import { chartViews, Dots, End, REVEAL, Reveal, Round } from "./round";
import Template from "./template";

test("round shows the R7 prompt, the password in monospace, a slider at the 0 stop and a number box", () => {
  const html = renderToStaticMarkup(<Round date="2026-10-24" number={1} passwords={["hunter2", "b", "c", "d", "e"]} />);
  expect(html).toContain("How many times has this password appeared in data breaches?");
  expect(html).toMatch(/<p class="[^"]*">hunter2<\/p>/);
  expect(html).toMatch(/type="range"[^>]*min="0"[^>]*max="850"[^>]*value="0"/);
  // D4: the only text box takes numbers, never a password.
  expect(html.match(/<input/g)).toHaveLength(2);
  expect(html).toMatch(/type="text" inputMode="decimal"[^>]*value="0"/);
  expect(html).toContain(">Lock in</button>");
  // A tick at the 0 stop and at every power of ten up to 100m.
  for (const t of ["0", "1", "10", "100", "1k", "10k", "100k", "1m", "10m", "100m"]) expect(html).toContain(`</span>${t}</div>`);
});

test("reveal shows the count, the guess, the points, the tier label in its colour and the note (R9)", () => {
  const html = renderToStaticMarkup(
    <Reveal result={{ guess: 40_000, count: 12_500_000, score: 3, tier: "Pwned", note: "Seen everywhere." }} />,
  );
  for (const t of ["12,500,000", "40,000", ">3</span><span class=\"text-xs\">/100</span>", "pwned", "Seen everywhere."]) expect(html).toContain(t);
  expect(html).toContain("color:var(--color-pwned)");
});

test("the reveal labels the chart lines with both numbers on two rows and puts the ratio in one result row (T48)", () => {
  const html = renderToStaticMarkup(<Reveal result={{ guess: 40_000, count: 12_500_000, score: 3, tier: "Pwned", note: "" }} />);
  // The answer's label sits on the higher line, the guess's on the lower one.
  expect(html).toMatch(/top-5 bottom-0 border-l border-dashed[^>]*><span[^>]*>answer <span class="font-semibold text-bone">12,500,000</);
  expect(html).toMatch(/top-11 bottom-0 w-0.5 bg-current[^>]*><span[^>]*>you <span class="font-semibold" style="color:var\(--color-pwned\)">40,000</);
  expect(html).toContain(">312× too low</p>");
  expect(html).not.toContain("<dl");
});

test("the reveal's chart ends fitting the guess and the count, with labels inside its edges and the meter at the points (T48)", () => {
  const html = renderToStaticMarkup(<Reveal result={{ guess: 0, count: 100_000_000, score: 3, tier: "Pwned", note: "" }} />);
  // A guess of 0 and a count of 100m need the whole axis, so nothing moves.
  expect(html).toContain('data-axis="true" class="track absolute inset-x-0 bottom-0 h-px origin-left" style="transform:translateX(0%) scaleX(1)"');
  // Labels at the ends shift by all or none of their width, so they stay inside the chart.
  expect(html).toMatch(/border-dashed border-bone" style="left:100%"><span[^>]*style="translate:-100%">answer/);
  expect(html).toMatch(/w-0.5 bg-current" style="left:0%"><span[^>]*style="translate:0%">you/);
  expect(html).toContain('<div data-meter="true" class="h-full origin-left bg-current" style="transform:scaleX(0.03)">');
  for (const t of ["0", "1", "100m"]) expect(html).toContain(`</span>${t}</div>`);
});

test("the chart starts at two decades around the guess and zooms out to fit both with a margin, inside the axis (T48)", () => {
  const decade = DECADE / SLIDER_MAX;
  // A near miss barely moves: both views are the narrowest, a third of a decade apart.
  const [from, to] = chartViews(4 * decade, 4.6 * decade);
  expect(from[0]).toBeCloseTo(3 * decade);
  expect(to[0]).toBeCloseTo(3.3 * decade);
  expect(to[1] - to[0]).toBeCloseTo(2 * decade);
  // A wild miss ends wide enough for the gap plus 20% each side, and a guess at the 0 stop starts at the left edge.
  expect(chartViews(0, 0.5)).toEqual([[0, REVEAL.view], [0, 0.7]]);
  expect(chartViews(1, 0)[1]).toEqual([0, 1]);
});

test("the reveal lasts under 2 seconds, and the meter and the staggered fades fit inside it (T48)", () => {
  const { hold, zoom, meter, overlap, fade, stagger } = REVEAL;
  expect(hold + zoom + meter + fade).toBeLessThan(2000);
  // The meter starts inside the zoom, and the tier and note fade in before the landing, not after it.
  expect(overlap).toBeLessThan(zoom);
  expect(2 * stagger).toBeLessThan(meter);
});

test("dots colour revealed passwords by tier and outline the current one", () => {
  const r = { guess: 1, count: 1, score: 100, tier: "Uncrackable", note: "" };
  const html = renderToStaticMarkup(<Dots results={[r]} index={1} total={5} />);
  expect(html.match(/<li/g)).toHaveLength(5);
  expect(html).toContain("background:var(--color-uncrackable)");
  expect(html.match(/border-bone/g)).toHaveLength(1);
  expect(html).toContain('aria-label="1 of 5 revealed"');
});

test("every tier colour is always emitted, since the reveal only builds its name at runtime", () => {
  const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
  const block = /@theme static \{([^}]*)\}/.exec(css)?.[1] ?? "";
  for (const t of ["pwned", "weak", "mid", "strong", "uncrackable"]) expect(block).toContain(`--color-${t}:`);
});

test("every colour token has a light and a dark value (T44)", () => {
  const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
  const tokens = css.match(/--color-[a-z]+: [^;]+;/g)!;
  expect(tokens).toHaveLength(10);
  for (const t of tokens) expect(t).toMatch(/: light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\);$/);
});

test("the slider thumb, its ticks and the bracket corners scale with the root font size (T45)", () => {
  const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
  expect(css).toMatch(/--thumb: [\d.]+rem;/);
  expect(css).toMatch(/--bracket: [\d.]+rem;/);
  // No pixel sizes left for the thumb, its track offsets or the corners; 1px lines stay.
  expect(css).not.toMatch(/\b(5|7|10|14|22)px/);
  const html = renderToStaticMarkup(<Round date="2026-10-24" number={1} passwords={["a"]} />);
  expect(html).toContain("mx-[calc(var(--thumb)/2)]");
  expect(html).toContain("brackets relative mx-(--bracket)");
});

test("the end screen and pages fade in briefly, and reduced motion turns every CSS animation off (T35)", () => {
  const result = { guess: 1, count: 1, score: 100, tier: "Uncrackable", note: "n" };
  for (const html of [
    renderToStaticMarkup(<End number={1} passwords={["a"]} results={[result]} />),
    renderToStaticMarkup(<Template>page</Template>),
  ])
    expect(html).toMatch(/^<[^>]*animate-enter/);
  const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
  expect(css).toContain("--animate-enter: enter 200ms ease-out;");
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
  expect(reduced).toContain("::backdrop");
  expect(reduced).toContain("animation: none !important;");
  expect(reduced).toContain("transition: none !important;");
});

test("end screen shows the total, the daily tier, each password's breakdown and share, with no coffee link (R12, D31)", () => {
  const scores = [100, 65, 90, 35, 100];
  const results = scores.map((score, i) => ({ guess: 40_000 + i, count: 12_500_000 + i, score, tier: ["Uncrackable", "Mid", "Uncrackable", "Weak", "Uncrackable"][i], note: "n" }));
  const html = renderToStaticMarkup(<End number={12} passwords={["hunter2", "b", "c", "d", "e"]} results={results} />);
  expect(html).toContain('<span class="text-6xl">390</span>');
  expect(html).toContain("/ 500");
  // Average 78 is Strong.
  expect(html).toContain("color:var(--color-strong)");
  expect(html).toMatch(/<span[^>]*><\/span>strong<\/p>/);
  expect(html).toContain("puzzle #12");
  expect(html.match(/<li/g)).toHaveLength(5);
  for (const t of ["hunter2", "seen 12,500,000, you guessed 40,000", ">65</p>"]) expect(html).toContain(t);
  // Each row names its tier next to the colour (R25).
  expect(html).toMatch(/color:var\(--color-mid\)"><span[^>]*><\/span>mid<\/p>/);
  expect(html).toContain(">Share result</button>");
  expect(html).not.toContain("buymeacoffee.com");
  // Notes stay on the reveal; the end screen doesn't repeat them.
  expect(html).not.toContain(">n<");
});

test("end screen shows one drawing, for the daily tier, hidden from screen readers (T42, D41)", () => {
  const end = (score: number, tier: string) =>
    renderToStaticMarkup(<End number={1} passwords={["a", "b", "c", "d", "e"]} results={Array(5).fill({ guess: 1, count: 1, score, tier, note: "" })} />);
  for (const [score, name] of [[100, "uncrackable"], [0, "pwned"]] as const) {
    const html = end(score, name);
    expect(html.match(/\/art\//g)).toHaveLength(1);
    expect(html).toMatch(new RegExp(`<span aria-hidden="true"[^>]*mask-image:url\\(/art/${name}\\.svg\\)`));
  }
});

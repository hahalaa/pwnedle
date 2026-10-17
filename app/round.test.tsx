import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Dots, End, REVEAL, Reveal, Round } from "./round";
import Template from "./template";

test("round shows the R7 prompt, the password in monospace, a slider at the 0 stop and a number box", () => {
  const html = renderToStaticMarkup(<Round date="2026-10-24" number={1} passwords={["hunter2", "b", "c", "d", "e"]} />);
  expect(html).toContain("How many times has this password appeared in data breaches?");
  expect(html).toMatch(/<p class="font-mono[^"]*">hunter2<\/p>/);
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
  for (const t of ["12,500,000", "40,000", ">3</span> <span", "pwned", "Seen everywhere."]) expect(html).toContain(t);
  expect(html).toContain("color:var(--color-pwned)");
});

test("the reveal's end state keeps the slider, filled to the guess in the tier colour, with a line at the count (T43)", () => {
  const html = renderToStaticMarkup(<Reveal result={{ guess: 1, count: 100_000_000, score: 0, tier: "Pwned", note: "" }} />);
  // A guess of 1 sits 50 of 850 steps along; 100m is the far end.
  expect(html).toMatch(/style="color:var\(--color-pwned\)"><div data-track/);
  expect(html).toContain(`data-fill="true" data-tint="true"`);
  expect(html).toContain(`transform:scaleX(${50 / 850})`);
  expect(html).toMatch(/data-count-marker="true"[^>]*style="left:100%"/);
  for (const t of ["0", "1", "100m"]) expect(html).toContain(`</span>${t}</div>`);
});

test("the reveal sequence lasts 1.5 to 2 seconds, from the charge to the last fade (T43)", () => {
  const total = REVEAL.charge + REVEAL.hold + REVEAL.zoomOut + REVEAL.fade;
  expect(total).toBeGreaterThanOrEqual(1500);
  expect(total).toBeLessThanOrEqual(2000);
  expect(REVEAL.zoomIn).toBeLessThanOrEqual(REVEAL.charge);
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

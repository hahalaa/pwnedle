import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Dots, Reveal, Round } from "./round";

test("round shows the R7 prompt, the password in monospace, a slider at the 0 stop and a number box", () => {
  const html = renderToStaticMarkup(<Round date="2026-10-24" passwords={["hunter2", "b", "c", "d", "e"]} />);
  expect(html).toContain("How many times has this password appeared in data breaches?");
  expect(html).toMatch(/<p class="font-mono[^"]*">hunter2<\/p>/);
  expect(html).toMatch(/type="range"[^>]*min="0"[^>]*max="850"[^>]*value="0"/);
  // D4: the only text box takes numbers, never a password.
  expect(html.match(/<input/g)).toHaveLength(2);
  expect(html).toMatch(/type="text" inputMode="decimal"[^>]*value="0"/);
  expect(html).toContain(">Lock in</button>");
  // A tick at the 0 stop and at every power of ten up to 100m.
  for (const t of ["0", "1", "10", "100", "1k", "10k", "100k", "1m", "10m", "100m"]) expect(html).toContain(`</span>${t}</span>`);
});

test("reveal shows the count, the guess, the points, the tier label in its colour and the note (R9)", () => {
  const html = renderToStaticMarkup(
    <Reveal result={{ guess: 40_000, count: 12_500_000, score: 3, tier: "Pwned", note: "Seen everywhere." }} />,
  );
  for (const t of ["12,500,000", "40,000", "3 <span", "pwned", "Seen everywhere."]) expect(html).toContain(t);
  expect(html).toContain("color:var(--color-pwned)");
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
  for (const t of ["pwned", "weak", "medium", "strong", "uncrackable"]) expect(block).toContain(`--color-${t}:`);
});

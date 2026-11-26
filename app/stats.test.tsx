import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { type Game, highlights, type stats } from "../lib/stats";
import { Stats, StatsBody } from "./stats";

test("stats show played, average, best, both streaks and the tier distribution, each tier named (R17, R25)", () => {
  const s: ReturnType<typeof stats> = { played: 4, average: 312, best: 480, current: 2, max: 3, tiers: [["Uncrackable", 1], ["Strong", 2], ["Mid", 0], ["Weak", 1], ["Pwned", 0]] };
  const html = renderToStaticMarkup(<StatsBody s={s} />);
  for (const [label, n] of [["played", 4], ["average", 312], ["best", 480], ["streak", 2], ["max streak", 3]])
    expect(html).toContain(`<dt class="text-xs text-ash">${label}</dt><dd class="text-3xl">${n}</dd>`);
  expect(html).toMatch(/color:var\(--color-strong\)"><span>strong<\/span>.*width:100%.*>2<\/span>/);
  expect(html).toMatch(/color:var\(--color-weak\)"><span>weak<\/span>.*width:50%/);
  expect(html).toContain("Archive games don&#x27;t count towards stats.");
});

test("the stats button opens a closed modal", () => {
  const html = renderToStaticMarkup(<Stats />);
  expect(html).toMatch(/<button [^>]*aria-label="stats"/);
  expect(html).toMatch(/<dialog(?![^>]* open[\s=>])/);
  // T45: a click on the backdrop closes it too.
  expect(html).toContain('<dialog closedby="any"');
});

test("highlights link each day to its puzzle, today to the home page, and name the best guess and worst miss (D57)", () => {
  const s: ReturnType<typeof stats> = { played: 3, average: 0, best: 0, current: 0, max: 0, tiers: [] };
  const game = (guess: number, count: number, password?: string): Game => ({ index: 5, done: true, results: [{ score: 90, guess, count, password }] });
  const h = highlights({ "2026-10-24": game(5, 5, "hunter2"), "2026-10-25": game(0, 999), "2026-10-26": game(10, 99, "qwerty") });
  const html = renderToStaticMarkup(<StatsBody s={s} h={h} today="2026-10-26" />);
  expect(html).toContain("best days");
  expect(html).not.toContain("worst days");
  expect(html).toMatch(/href="\/".*#7.*2026-10-26.*href="\/archive\/6".*href="\/archive\/5"/);
  expect(html).toMatch(/color:var\(--color-weak\)">weak/);
  expect(html).toMatch(/best guess<\/dt><dd[^>]*>hunter2 <span[^>]*>#5 · Exact/);
  // Saved before T81, so no password.
  expect(html).toMatch(/worst miss<\/dt><dd[^>]*>password 1 <span[^>]*>#6 · 1k× too low/);
  // Fewer than 3 daily games: no section.
  expect(renderToStaticMarkup(<StatsBody s={s} h={null} />)).not.toContain("best days");
});

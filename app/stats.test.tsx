import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { stats } from "../lib/stats";
import { Stats, StatsBody } from "./stats";

test("stats show played, average, best, both streaks and the tier distribution, each tier named (R17, R25)", () => {
  const s: ReturnType<typeof stats> = { played: 4, average: 312, best: 480, current: 2, max: 3, tiers: [["Uncrackable", 1], ["Strong", 2], ["Medium", 0], ["Weak", 1], ["Pwned", 0]] };
  const html = renderToStaticMarkup(<StatsBody s={s} />);
  for (const [label, n] of [["played", 4], ["average", 312], ["best", 480], ["streak", 2], ["max streak", 3]])
    expect(html).toContain(`<dt class="text-xs text-ash">${label}</dt><dd class="text-3xl">${n}</dd>`);
  expect(html).toMatch(/color:var\(--color-strong\)"><span>strong<\/span>.*width:100%.*>2<\/span>/);
  expect(html).toMatch(/color:var\(--color-weak\)"><span>weak<\/span>.*width:50%/);
  expect(html).toContain("Archive games don&#x27;t count towards stats.");
});

test("the stats button opens a closed modal", () => {
  const html = renderToStaticMarkup(<Stats />);
  expect(html).toContain(">stats</button>");
  expect(html).toMatch(/<dialog(?![^>]*open)/);
});

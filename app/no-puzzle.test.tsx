import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { LAUNCH_DATE } from "../lib/config";
import { addDays } from "../lib/days";
import { NoPuzzle } from "./no-puzzle";

test("after launch, a missing day shows the warming-up message and an archive link (R36b)", () => {
  const html = renderToStaticMarkup(<NoPuzzle today={LAUNCH_DATE} />);
  expect(html).toContain("Today&#x27;s puzzle is warming up, check back soon");
  expect(html).toContain('href="/archive"');
});

test("before launch it says coming soon instead", () => {
  const html = renderToStaticMarkup(<NoPuzzle today={addDays(LAUNCH_DATE, -1)} />);
  expect(html).toContain("Coming soon.");
  expect(html).not.toContain("warming up");
});

import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Round } from "./round";

test("round shows the R7 prompt, the password in monospace, a slider at the 0 stop and a number box", () => {
  const html = renderToStaticMarkup(<Round date="2026-10-24" passwords={["hunter2", "b", "c", "d", "e"]} />);
  expect(html).toContain("How many times has this password appeared in data breaches?");
  expect(html).toMatch(/<p class="font-mono[^"]*">hunter2<\/p>/);
  expect(html).toMatch(/type="range"[^>]*min="0"[^>]*max="801"[^>]*value="0"/);
  // D4: the only text box takes numbers, never a password.
  expect(html.match(/<input/g)).toHaveLength(2);
  expect(html).toMatch(/type="text" inputMode="decimal"[^>]*value="0"/);
  expect(html).toContain(">Lock in</button>");
});

import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import About from "./page";

test("credits Pwned Passwords and SecLists and disclaims affiliation (R24)", () => {
  const html = renderToStaticMarkup(<About />);
  expect(html).toContain('href="https://haveibeenpwned.com/Passwords"');
  expect(html).toContain('href="https://github.com/danielmiessler/SecLists"');
  expect(html).toContain("MIT");
  expect(html).toContain("not affiliated with or endorsed by Have I Been Pwned");
});

test("says daily score totals are counted anonymously (T63)", () => {
  expect(renderToStaticMarkup(<About />)).toContain("anonymous count");
});

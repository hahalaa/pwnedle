import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/font/google", () => ({ Archivo: () => ({}), Doto: () => ({}), IBM_Plex_Mono: () => ({}) }));

test("every page has the title linking home, an archive link and stats", () => {
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  expect(html).toMatch(/<a [^>]*href="\/"[^>]*>Pwnedle<\/a>/);
  expect(html).toMatch(/<a [^>]*href="\/archive"[^>]*>archive<\/a>/);
  expect(html).toContain(">stats</button>");
  expect(html).toContain("page");
});

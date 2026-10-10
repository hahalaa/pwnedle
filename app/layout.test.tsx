import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { COFFEE_URL } from "../lib/config";
import RootLayout from "./layout";

vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("next/font/google", () => ({ Archivo: () => ({}), Doto: () => ({}), IBM_Plex_Mono: () => ({}) }));

test("every page has the title linking home, an archive link and stats", () => {
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  expect(html).toMatch(/<a [^>]*href="\/"[^>]*>Pwnedle<\/a>/);
  expect(html).toMatch(/<a [^>]*href="\/archive"[^>]*>archive<\/a>/);
  expect(html).toContain(">stats</button>");
  expect(html).toContain("page");
});

test("the footer has only the about and coffee links (R23, R24, D29)", () => {
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  const footer = html.slice(html.indexOf("<footer"));
  expect(footer).not.toContain("never ask");
  expect(footer).toMatch(/<a [^>]*href="\/about"[^>]*>about<\/a>/);
  expect(footer).toContain(`href="${COFFEE_URL}"`);
  expect(html).toContain(">help</button>");
});

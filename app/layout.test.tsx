import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { COFFEE_URL, SITE_URL } from "../lib/config";
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

test("link previews get a title, description and large image card from the live site (R26)", async () => {
  const { metadata } = await import("./layout");
  expect(String(metadata.metadataBase)).toBe(`${SITE_URL}/`);
  expect(metadata.openGraph).toMatchObject({ title: "Pwnedle", description: metadata.description });
  expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
});

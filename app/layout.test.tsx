import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { COFFEE_URL, SITE_URL } from "../lib/config";
import RootLayout from "./layout";

vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("next/font/google", () => ({ Archivo: () => ({}), Doto: () => ({}), IBM_Plex_Mono: () => ({}) }));

test("every page has the title linking home, an archive link and stats, as words on desktop and icons on phones (T37)", () => {
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  expect(html).toMatch(/<a [^>]*href="\/"[^>]*>Pwnedle<\/a>/);
  for (const item of ["help", "archive", "stats"]) {
    expect(html).toMatch(new RegExp(`aria-label="${item}"[^>]*><span class="max-sm:hidden">${item}</span><svg aria-hidden="true"`));
    // The icon's hover tooltip matches the aria-label; the desktop word has none.
    expect(html).toContain(`<title>${item}</title>`);
    expect(html).not.toContain(`title="${item}"`);
  }
  expect(html).toContain(`href="/archive"`);
  expect(html).toContain("page");
});

test("the footer has only the about and coffee links (R23, R24, D29)", () => {
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  const footer = html.slice(html.indexOf("<footer"));
  expect(footer).not.toContain("never ask");
  expect(footer).toMatch(/<a [^>]*href="\/about"[^>]*>about<\/a>/);
  expect(footer).toContain(`href="${COFFEE_URL}"`);
});

test("link previews get a title, description and large image card from the live site (R26)", async () => {
  const { metadata } = await import("./layout");
  expect(String(metadata.metadataBase)).toBe(`${SITE_URL}/`);
  expect(metadata.openGraph).toMatchObject({ title: "Pwnedle", description: metadata.description });
  expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
});

test("from lg the column widens, with the header and footer inside it so they line up (T40)", () => {
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  const column = html.slice(html.indexOf("lg:max-w-240"));
  expect(html).toMatch(/class="[^"]*max-w-xl[^"]*lg:max-w-240/);
  expect(column).toContain("<header");
  expect(column).toContain("<footer");
});

test("the coffee link carries the coffee drawing as decoration, hidden from screen readers (T41)", () => {
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  expect(html).toMatch(/<a [^>]*buymeacoffee[^>]*><span aria-hidden="true" class="[^"]*url\(\/art\/coffee.svg\)[^"]*"><\/span>buy me a coffee<\/a>/);
});

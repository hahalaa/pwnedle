// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { THEME_KEY } from "../lib/config";
import RootLayout from "./layout";
import { Theme } from "./theme";

vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("next/font/google", () => ({ Doto: () => ({}), IBM_Plex_Mono: () => ({}) }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

test("the toggle starts on the system theme, then overrides it and is remembered after a refresh (T44)", async () => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(prefers-color-scheme: light)", addEventListener() {}, removeEventListener() {} }));
  render(<Theme />);
  const button = await screen.findByRole("button", { name: "light theme" });
  fireEvent.click(button);
  expect(button.getAttribute("aria-label")).toBe("dark theme");
  expect(button.querySelector("title")?.textContent).toBe("dark theme");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");

  // A refresh: the layout's script reads the saved choice back onto <html> before the toggle mounts.
  cleanup();
  delete document.documentElement.dataset.theme;
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  new Function(/<head><script>(.*?)<\/script>/.exec(html)![1])();
  expect(document.documentElement.dataset.theme).toBe("dark");
  render(<Theme />);
  expect(await screen.findByRole("button", { name: "dark theme" })).toBeTruthy();
});

test("the pre-paint script ignores a saved value that isn't a theme", () => {
  localStorage.setItem(THEME_KEY, "neon");
  const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);
  new Function(/<head><script>(.*?)<\/script>/.exec(html)![1])();
  expect(document.documentElement.dataset.theme).toBeUndefined();
});

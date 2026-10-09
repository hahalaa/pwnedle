import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import Home from "./page";

vi.mock("server-only", () => ({}));

test("home page renders the title", () => {
  expect(renderToStaticMarkup(<Home />)).toContain("Pwnedle");
});

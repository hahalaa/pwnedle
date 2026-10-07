import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import Home from "./page";

test("home page renders the title", () => {
  expect(renderToStaticMarkup(<Home />)).toContain("Pwnedle");
});

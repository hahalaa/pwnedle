import { renderToReadableStream } from "react-dom/server";
import { expect, test, vi } from "vitest";
import Archive from "./page";

vi.mock("../../lib/puzzles", () => ({
  playerToday: async () => "2026-11-01",
  pastPuzzles: async () => [
    { date: "2026-10-31", number: 12, theme: "halloween" },
    { date: "2026-10-30", number: 11 },
  ],
}));

test("the archive tags a theme day with its emoji and label, and leaves other days plain (D49)", async () => {
  const stream = await renderToReadableStream(<Archive />);
  await stream.allReady;
  const html = await new Response(stream).text();
  const [themed, plain] = html.split("<li>").slice(1);
  expect(themed).toMatch(/12<span[^>]*>🎃 halloween special<\/span>/);
  expect(plain).not.toContain("🎃");
  expect(plain).not.toContain("halloween");
});

import type { ReactElement, ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { saveGame } from "../lib/stats";
import { Round } from "./round";

// No DOM in the tests, so Round is called as a plain function: state is fixed, hydration reports true,
// and the saved game sits on its last revealed password, so the button's handler saves straight away.
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useState: (init: unknown) => [init, () => {}],
  useSyncExternalStore: (_: unknown, client: () => unknown) => client(),
}));
vi.mock("../lib/stats", () => ({
  saveGame: vi.fn(),
  loadGame: () => ({ index: 4, done: false, results: Array(5).fill({ guess: 1, count: 1, score: 100, tier: "Uncrackable", note: "" }) }),
}));

const button = (node: ReactNode): ReactElement<{ onClick: () => void }> | undefined => {
  if (Array.isArray(node)) return node.map(button).find(Boolean);
  if (!node || typeof node !== "object" || !("props" in node)) return;
  const el = node as ReactElement<{ children?: ReactNode; onClick: () => void }>;
  return el.type === "button" ? el : button(el.props.children);
};

test("Round saves the archive flag only when played from the archive (R18)", () => {
  const props = { date: "2026-10-24", number: 1, passwords: ["a", "b", "c", "d", "e"] };
  for (const archive of [true, false]) {
    vi.mocked(saveGame).mockClear();
    button(Round(archive ? { ...props, archive } : props))!.props.onClick();
    expect(vi.mocked(saveGame).mock.calls[0][1]).toMatchObject({ done: true });
    expect("archive" in vi.mocked(saveGame).mock.calls[0][1]).toBe(archive);
  }
});

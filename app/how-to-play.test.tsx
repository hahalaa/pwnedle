// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SAFETY_NOTE } from "../lib/config";
import { score, tier } from "../lib/scoring";
import { EXAMPLE, hasGame, HowToPlay, SEEN_KEY } from "./how-to-play";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }) }));

// jsdom has no showModal, so record calls instead.
const showModal = vi.fn();
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = showModal;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  showModal.mockClear();
  nav.push.mockClear();
});

test("opens by itself on the first visit only (R21)", () => {
  render(<HowToPlay />);
  expect(showModal).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(SEEN_KEY)).toBe("1");
  cleanup();
  render(<HowToPlay />);
  expect(showModal).toHaveBeenCalledTimes(1);
});

test("shows the safety note (R22)", () => {
  const { container } = render(<HowToPlay />);
  expect(container.ownerDocument.body.textContent).toContain(SAFETY_NOTE);
});

test("the worked example matches the real scoring", () => {
  for (const [guess, points, t] of EXAMPLE) {
    expect(score(Number(guess.replaceAll(",", "")), 50000)).toBe(points);
    expect(tier(points)).toBe(t);
  }
});

test("Play stays on pages with a game and goes home from the rest", () => {
  expect(["/", "/archive/3"].every(hasGame)).toBe(true);
  expect(["/archive", "/about"].some(hasGame)).toBe(false);
  for (const [path, pushes] of [["/archive/3", 0], ["/about", 1]] as const) {
    history.pushState(null, "", path);
    render(<HowToPlay />);
    fireEvent.click(screen.getByRole("button", { name: "Play", hidden: true }));
    expect(nav.push).toHaveBeenCalledTimes(pushes);
    if (pushes) expect(nav.push).toHaveBeenCalledWith("/");
    cleanup();
    nav.push.mockClear();
  }
});

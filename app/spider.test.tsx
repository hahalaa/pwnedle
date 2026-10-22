// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Spider } from "./spider";

// jsdom has no AnimationEvent, so React DOM would listen for webkitAnimationEnd instead. It checks once, on load.
vi.hoisted(() => {
  (globalThis as { AnimationEvent?: unknown }).AnimationEvent ??= class extends Event {};
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

test("the spider drops once per session: not again after it lands, nor after a reload (T58a)", () => {
  const first = render(<Spider />);
  const svg = () => first.container.querySelector("svg")!;
  expect(svg().getAttribute("class")).toContain("animate-drop");
  fireEvent.animationEnd(svg());
  expect(svg().getAttribute("class")).not.toContain("animate-drop");
  cleanup();
  expect(render(<Spider />).container.querySelector("svg")!.getAttribute("class")).not.toContain("animate-drop");
});

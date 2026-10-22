"use client";

import { useState, useSyncExternalStore } from "react";
import { svg } from "./pumpkin";

// T58a: the spider drops once per browser session. sessionStorage remembers it across reloads, and `ended` stops it
// replaying when navigation hides and shows it again. Storage can throw; then it just drops on each load.
const DROPPED_KEY = "pwnedle-spider-dropped";
const noop = () => () => {};
const dropped = () => {
  try {
    return sessionStorage.getItem(DROPPED_KEY) !== null;
  } catch {
    return false;
  }
};

// A spider on a thread hanging from the header rule, shown only on Halloween days. The wrapper clips it so it comes
// out of the rule instead of over the header, and leaves room below for the bob.
export function Spider() {
  const seen = useSyncExternalStore(noop, dropped, () => false);
  const [ended, setEnded] = useState(false);
  const land = () => {
    setEnded(true);
    try {
      sessionStorage.setItem(DROPPED_KEY, "1");
    } catch {}
  };

  return (
    <span className="pointer-events-none absolute top-full right-12 hidden h-7 overflow-hidden halloween:block">
      {/* Shifted half a unit so the thread lands on a whole pixel. */}
      <svg {...svg} viewBox="-0.5 0 16 24" className={`h-6 text-ash ${seen || ended ? "" : "animate-drop"}`} onAnimationEnd={land}>
        <path d="M8 0v10M6.4 12.5L3.5 10 1.5 11.5M6.2 13.6L3 13 1 15M5.6 16L2.5 17.5 1.5 20.5M5.8 18.5L3.5 21.5 3 23.5M9.6 12.5L12.5 10 14.5 11.5M9.8 13.6L13 13 15 15M10.4 16L13.5 17.5 14.5 20.5M10.2 18.5L12.5 21.5 13 23.5" />
        <circle cx="8" cy="12" r="1.75" />
        <ellipse cx="8" cy="17.5" rx="2.75" ry="3.5" />
      </svg>
    </span>
  );
}

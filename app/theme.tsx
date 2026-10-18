"use client";

import { useState, useSyncExternalStore } from "react";
import { THEME_KEY } from "../lib/config";
import { NavLabel } from "./nav-label";

const LIGHT = "(prefers-color-scheme: light)";

function subscribe(onChange: () => void) {
  const query = matchMedia(LIGHT);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// The saved choice, which app/layout.tsx puts on <html> before first paint, or else the system theme.
export const current = () => document.documentElement.dataset.theme ?? (matchMedia(LIGHT).matches ? "light" : "dark");

// T44: header toggle between the dark and light themes, remembered in localStorage.
export function Theme() {
  const [toggled, setToggled] = useState<string | null>(null);
  // The server can't see the saved choice or the system theme, so the first render shows "dark" until hydration.
  const shown = useSyncExternalStore(subscribe, current, () => "dark");
  const theme = toggled ?? shown;
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`${theme} theme`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        // localStorage can throw when storage is blocked; then the choice lasts until a refresh.
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {}
        setToggled(next);
      }}
      className="tap text-sm text-ash underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
    >
      <NavLabel text={theme} label={`${theme} theme`}>
        {theme === "dark" ? (
          <path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5a6.5 6.5 0 0 0 9 9z" />
        ) : (
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M18 6l-1.5 1.5M6 18l1.5-1.5M18 18l-1.5-1.5" />
        )}
      </NavLabel>
    </button>
  );
}

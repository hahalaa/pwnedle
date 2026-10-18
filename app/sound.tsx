"use client";

import { useState } from "react";
import { isMuted, setMuted } from "../lib/sound";
import { NavLabel } from "./nav-label";
import { useHydrated } from "./round";

// D35: header toggle for the tier sounds, remembered in localStorage.
export function Sound() {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const hydrated = useHydrated();
  // The server can't see localStorage, so the first render shows "sound" until hydration.
  const muted = toggled ?? (hydrated && isMuted());
  const label = muted ? "sound muted" : "sound on";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        setMuted(!muted);
        setToggled(!muted);
      }}
      className="tap text-sm text-ash underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
    >
      <NavLabel text={muted ? "muted" : "sound"} label={label}>
        <path d="M3.5 9.5h4l6-6h1v17h-1l-6-6h-4z" />
        <path d={muted ? "M16 10l4 4M20 10l-4 4" : "M16.5 10a2.5 2.5 0 0 1 0 4M18.5 7a7.25 7.25 0 0 1 0 10"} />
      </NavLabel>
    </button>
  );
}

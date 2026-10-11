"use client";

import { useState } from "react";
import { isMuted, setMuted } from "../lib/sound";
import { useHydrated } from "./round";

// D35: header toggle for the tier sounds, remembered in localStorage.
export function Sound() {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const hydrated = useHydrated();
  // The server can't see localStorage, so the first render shows "sound" until hydration.
  const muted = toggled ?? (hydrated && isMuted());

  return (
    <button
      type="button"
      aria-label={muted ? "sound muted" : "sound on"}
      onClick={() => {
        setMuted(!muted);
        setToggled(!muted);
      }}
      className="tap font-mono text-sm text-ash underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
    >
      {muted ? "muted" : "sound"}
    </button>
  );
}

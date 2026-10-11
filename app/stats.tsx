"use client";

import { useRef, useState } from "react";
import { zoneToday } from "../lib/days";
import { savedGames, stats } from "../lib/stats";
import { tierColor } from "./round";

// R17: worked out from this browser's saved games each time the modal opens.
export function Stats() {
  const ref = useRef<HTMLDialogElement>(null);
  const [s, setS] = useState<ReturnType<typeof stats> | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Local date, matching the puzzle dates the player was served (R2).
          setS(stats(savedGames(), zoneToday()));
          ref.current?.showModal();
        }}
        className="tap font-mono text-sm text-ash underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
      >
        stats
      </button>
      <dialog
        ref={ref}
        aria-labelledby="stats-title"
        className="m-auto w-[calc(100%-2rem)] max-w-md border border-line bg-void p-6 text-bone backdrop:bg-void/80"
      >
        {s && <StatsBody s={s} />}
        <form method="dialog" className="mt-6">
          <button
            type="submit"
            className="bg-signal px-6 py-3 font-semibold text-void focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
          >
            Close
          </button>
        </form>
      </dialog>
    </>
  );
}

export function StatsBody({ s }: { s: ReturnType<typeof stats> }) {
  const most = Math.max(1, ...s.tiers.map(([, n]) => n));
  return (
    <div className="flex flex-col gap-6 font-mono">
      <h2 id="stats-title" className="border-b border-line pb-3 text-lg">
        stats
      </h2>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-4">
        {(
          [
            ["played", s.played],
            ["average", s.average],
            ["best", s.best],
            ["streak", s.current],
            ["max streak", s.max],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="text-xs text-ash">{label}</dt>
            <dd className="text-3xl">{n}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="text-xs text-ash">tiers</h3>
        {/* R25: each bar is labelled with its tier name. */}
        <ul className="flex flex-col gap-1.5 text-sm">
          {s.tiers.map(([t, n]) => (
            <li key={t} className="grid grid-cols-[7rem_1fr] items-center gap-3" style={{ color: tierColor(t) }}>
              <span>{t.toLowerCase()}</span>
              <span className="flex items-center gap-2">
                <span className="h-3 bg-current" style={{ width: `${(n / most) * 100}%` }} />
                <span className="text-bone">{n}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* R18: archive games are saved but left out of these numbers. */}
      <p className="text-xs text-ash">Archive games don&apos;t count towards stats.</p>
    </div>
  );
}

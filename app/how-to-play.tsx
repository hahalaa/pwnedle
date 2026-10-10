"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { SAFETY_NOTE } from "../lib/config";
import { tierColor } from "./round";

// Outside the `pwnedle:<date>` prefix so savedGames() never reads it.
export const SEEN_KEY = "pwnedle-seen-help";

// Worked example for a password seen 50,000 times; scores come from lib/scoring.ts.
export const EXAMPLE = [
  ["50,000", 100, "Uncrackable"],
  ["10,000", 73, "Strong"],
  ["5,000", 53, "Medium"],
  ["1,000,000", 34, "Weak"],
  ["100", 1, "Pwned"],
] as const;

// Pages with a game on them; Play elsewhere goes home.
export const hasGame = (path: string) => path === "/" || /^\/archive\/[^/]+$/.test(path);

// R21: opens by itself on the first visit, and from the nav after that.
export function HowToPlay() {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    // localStorage can throw when storage is blocked; then the modal just stays shut.
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      return;
    }
    ref.current?.showModal();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="tap font-mono text-sm text-ash underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
      >
        help
      </button>
      <dialog
        ref={ref}
        aria-labelledby="help-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md border border-line bg-void p-6 text-bone backdrop:bg-void/80"
      >
        <div className="flex flex-col gap-4">
          <h2 id="help-title" className="border-b border-line pb-3 font-mono text-lg">
            how to play
          </h2>
          <p>Every day there are 5 passwords. Guess how many times each one has turned up in data breaches, from 0 to 100 million.</p>
          <p>Lock in a guess to see the real count. The closer you are, the more points you get.</p>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ash">Say a password has turned up 50,000 times:</p>
            <table className="w-full font-mono text-sm">
              <thead className="text-left text-xs text-ash">
                <tr>
                  <th className="pb-1 font-normal">guess</th>
                  <th className="pb-1 text-right font-normal">points</th>
                  <th className="pb-1 pl-4 font-normal">tier</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE.map(([guess, points, t]) => (
                  <tr key={guess}>
                    <td>{guess}</td>
                    <td className="text-right">{points}</td>
                    <td className="pl-4" style={{ color: tierColor(t) }}>
                      {t.toLowerCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Past puzzles are in the archive.</p>
          <p className="border-l-2 border-signal pl-3 text-sm">{SAFETY_NOTE}</p>
        </div>
        <form method="dialog" className="mt-6">
          <button
            type="submit"
            // Read at click time: usePathname would stop dynamic routes prerendering under cacheComponents.
            onClick={() => hasGame(location.pathname) || router.push("/")}
            className="bg-signal px-6 py-3 font-semibold text-void focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone"
          >
            Play
          </button>
        </form>
      </dialog>
    </>
  );
}

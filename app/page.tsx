import { Suspense } from "react";
import { clientPuzzle, loadPuzzle, playerToday } from "../lib/puzzles";
import { NoPuzzle } from "./no-puzzle";
import { Round } from "./round";

// Reads today's file per request, so the day rolls over at the player's local midnight without a rebuild (R2).
async function Today() {
  const today = await playerToday();
  const puzzle = await loadPuzzle(today);
  if (!puzzle) return <NoPuzzle today={today} />;
  // R13: only passwords go to the browser.
  // Keyed by date so the first-visit refresh (app/time-zone.tsx) can't carry one day's progress into another.
  return <Round key={puzzle.date} {...clientPuzzle(puzzle)} />;
}

export default function Home() {
  return (
    <Suspense>
      <Today />
    </Suspense>
  );
}

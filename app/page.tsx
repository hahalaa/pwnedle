import { connection } from "next/server";
import { Suspense } from "react";
import { utcToday } from "../lib/days";
import { clientPuzzle, loadPuzzle } from "../lib/puzzles";
import { NoPuzzle } from "./no-puzzle";
import { Round } from "./round";

// Reads today's file per request, so the day rolls over at UTC midnight without a rebuild.
async function Today() {
  await connection();
  const today = utcToday();
  const puzzle = await loadPuzzle(today);
  if (!puzzle) return <NoPuzzle today={today} />;
  // R13: only passwords go to the browser.
  return <Round {...clientPuzzle(puzzle)} />;
}

export default function Home() {
  return (
    <Suspense>
      <Today />
    </Suspense>
  );
}

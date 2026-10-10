import { connection } from "next/server";
import { Suspense } from "react";
import { utcToday } from "../lib/days";
import { clientPuzzle, loadPuzzle } from "../lib/puzzles";
import { Round } from "./round";

// Reads today's file per request, so the day rolls over at UTC midnight without a rebuild.
async function Today() {
  await connection();
  const puzzle = await loadPuzzle(utcToday());
  if (!puzzle) return <p className="font-mono text-ash">Coming soon.</p>;
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

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
  const { date, passwords } = clientPuzzle(puzzle);
  return <Round date={date} passwords={passwords} />;
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-4 py-10">
      <h1 className="border-b border-line pb-3 font-dot text-4xl">Pwnedle</h1>
      <Suspense>
        <Today />
      </Suspense>
    </main>
  );
}

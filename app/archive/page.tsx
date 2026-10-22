import Link from "next/link";
import { Suspense } from "react";
import { pastPuzzles, playerToday } from "../../lib/puzzles";
import { Pumpkin } from "../pumpkin";

// R20: every past puzzle by number and date, with theme days marked (D49). Read per request so yesterday appears after
// the player's local midnight (R2).
async function List() {
  const puzzles = await pastPuzzles(await playerToday());
  if (!puzzles.length) return <p className="text-ash">No past puzzles yet.</p>;
  return (
    <ol className="divide-y divide-line border-y border-line">
      {puzzles.map(({ date, number, theme }) => (
        <li key={date}>
          <Link href={`/archive/${number}`} className="group flex justify-between px-3 py-3 hover:bg-line focus-visible:outline-1 focus-visible:outline-bone">
            <span className="flex items-center gap-3">
              #{number}
              {theme === "halloween" && (
                <span className="flex items-center gap-1.5 text-sm text-ash group-hover:text-bone">
                  <Pumpkin />
                  halloween
                </span>
              )}
            </span>
            <span className="text-ash group-hover:text-bone">{date}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function Archive() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg">Archive</h2>
      <p className="text-ash">Play any past puzzle. Archive games don&apos;t count toward your stats or streak.</p>
      <Suspense>
        <List />
      </Suspense>
    </section>
  );
}

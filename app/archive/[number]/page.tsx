import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LAUNCH_DATE } from "../../../lib/config";
import { addDays, utcToday } from "../../../lib/days";
import { clientPuzzle, loadPuzzle } from "../../../lib/puzzles";
import { Round } from "../../round";

// R20: a past puzzle by number. Today and later are only played from the home page.
async function Past({ params }: Pick<PageProps<"/archive/[number]">, "params">) {
  const { number } = await params;
  if (!/^[1-9]\d{0,4}$/.test(number)) notFound();
  // Request time, so utcToday() isn't read while prerendering.
  await connection();
  const date = addDays(LAUNCH_DATE, Number(number) - 1);
  const puzzle = date < utcToday() ? await loadPuzzle(date) : null;
  if (!puzzle) notFound();
  // R13: only passwords go to the browser. R18: saved as an archive game.
  return <Round {...clientPuzzle(puzzle)} archive />;
}

export default function ArchivePuzzle({ params }: PageProps<"/archive/[number]">) {
  return (
    <Suspense>
      <Past params={params} />
    </Suspense>
  );
}

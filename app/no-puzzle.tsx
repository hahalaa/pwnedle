import Link from "next/link";
import { LAUNCH_DATE } from "../lib/config";

// Shown when today has no puzzle file. Before launch there is nothing to play yet;
// after launch it means the drafting Action has failed for two weeks (R36b).
export function NoPuzzle({ today }: { today: string }) {
  if (today < LAUNCH_DATE) return <p className="font-mono text-ash">Coming soon.</p>;
  return (
    <p className="font-mono text-ash">
      Today&apos;s puzzle is warming up, check back soon. Meanwhile, try the{" "}
      <Link href="/archive" className="underline underline-offset-4 hover:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-bone">
        archive
      </Link>
      .
    </p>
  );
}

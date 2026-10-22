import { execFileSync } from "node:child_process";
import { candidates, themeCandidates } from "./candidates.ts";
import { DIR, frozenChanges, generate, refill, replace, utcToday, validate } from "./puzzles.ts";

// npm run pipeline:generate
// npm run pipeline:replace -- <date> <index>
// npm run pipeline:theme -- <date> <theme>
// npm run pipeline:validate
// node scripts/pipeline.ts frozen <base sha>  (CI)
const [cmd, date, arg] = process.argv.slice(2);
// GitHub turns ::warning:: and ::error:: lines into annotations on the run (R35).
const tag = (kind: string) => (process.env.GITHUB_ACTIONS ? `::${kind}::` : `${kind}: `);

if (cmd === "generate") {
  const written = await generate(DIR, utcToday(), { candidates: await candidates() });
  console.log(written.length ? `Wrote drafts for ${written.join(", ")}` : "No days need a draft");
} else if (cmd === "replace") {
  await replace(DIR, date, Number(arg), utcToday(), { candidates: await candidates() });
  console.log(`Replaced password ${arg} in ${date}`);
} else if (cmd === "theme") {
  await refill(DIR, date, arg, utcToday(), { candidates: await themeCandidates(arg) });
  console.log(`Refilled ${date} with ${arg} passwords`);
} else if (cmd === "validate") {
  const { errors, warnings } = await validate(DIR, utcToday());
  warnings.forEach((w) => console.log(tag("warning") + w));
  errors.forEach((e) => console.log(tag("error") + e));
  console.log(errors.length ? `${errors.length} error(s)` : "All puzzle files valid");
  if (errors.length) process.exitCode = 1;
} else if (cmd === "frozen") {
  const diff = execFileSync("git", ["diff", "--name-status", "--no-renames", date, "HEAD", "--", DIR], { encoding: "utf8" });
  const errors = frozenChanges(diff, utcToday());
  errors.forEach((e) => console.log(tag("error") + e));
  console.log(errors.length ? `${errors.length} frozen file(s) changed` : "No frozen puzzle files changed");
  if (errors.length) process.exitCode = 1;
} else {
  console.error("Usage: pipeline.ts generate | replace <date> <index> | theme <date> <theme> | validate | frozen <base sha>");
  process.exitCode = 1;
}

import { candidates } from "./candidates.ts";
import { DIR, generate, replace, utcToday } from "./puzzles.ts";

// npm run pipeline:generate
// npm run pipeline:replace -- <date> <index>
const [cmd, date, index] = process.argv.slice(2);
const deps = { candidates: await candidates() };

if (cmd === "generate") {
  const written = await generate(DIR, utcToday(), deps);
  console.log(written.length ? `Wrote drafts for ${written.join(", ")}` : "All 14 days already have a file");
} else if (cmd === "replace") {
  await replace(DIR, date, Number(index), utcToday(), deps);
  console.log(`Replaced password ${index} in ${date}`);
} else {
  console.error("Usage: pipeline.ts generate | replace <date> <index>");
  process.exitCode = 1;
}

import { candidates } from "./candidates.ts";
import { DIR, generate, replace, utcToday, validate } from "./puzzles.ts";

// npm run pipeline:generate
// npm run pipeline:replace -- <date> <index>
// npm run pipeline:validate
const [cmd, date, index] = process.argv.slice(2);

if (cmd === "generate") {
  const written = await generate(DIR, utcToday(), { candidates: await candidates() });
  console.log(written.length ? `Wrote drafts for ${written.join(", ")}` : "No days need a draft");
} else if (cmd === "replace") {
  await replace(DIR, date, Number(index), utcToday(), { candidates: await candidates() });
  console.log(`Replaced password ${index} in ${date}`);
} else if (cmd === "validate") {
  const { errors, warnings } = await validate(DIR, utcToday());
  // GitHub turns ::warning:: and ::error:: lines into annotations on the run (R35).
  const tag = (kind: string) => (process.env.GITHUB_ACTIONS ? `::${kind}::` : `${kind}: `);
  warnings.forEach((w) => console.log(tag("warning") + w));
  errors.forEach((e) => console.log(tag("error") + e));
  console.log(errors.length ? `${errors.length} error(s)` : "All puzzle files valid");
  if (errors.length) process.exitCode = 1;
} else {
  console.error("Usage: pipeline.ts generate | replace <date> <index> | validate");
  process.exitCode = 1;
}

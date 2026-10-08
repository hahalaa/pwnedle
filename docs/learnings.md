# Learnings

Short, practical notes on things that were not obvious. One or two lines each, newest at the bottom. Delete entries that stop being true.

Format: `YYYY-MM-DD [area] what happened -> what to do instead`

Areas: pipeline, api, ui, deploy, tooling.

<!-- Example:
2026-10-12 [pipeline] Range API returns hash suffixes in uppercase -> uppercase our SHA-1 before comparing.
-->
2026-10-07 [tooling] `tsc` fails on `LayoutProps` until Next generates route types -> `npm run typecheck` runs `next typegen` first.
2026-10-07 [tooling] Vitest 5 peer-requires `@types/node` 22 or later; create-next-app pins `^20` -> keep `@types/node` on `^22`.
2026-10-07 [deploy] The agent is not allowed to run `vercel link` or `vercel git connect` -> Harry imports the repo in the Vercel dashboard; pushes to `main` then deploy to https://pwnedle.vercel.app.
2026-10-08 [pipeline] The range cache stores whole range responses per 5-char prefix in gitignored `.cache/pwned/` -> the cache never holds a password or full hash; padding rows have count 0 so they read as misses.
2026-10-08 [tooling] Plain `node` runs `scripts/*.ts` but warns "Reparsing as ES module" -> in T8, add `"type": "module"` to package.json or use `.mts` when wiring the pipeline commands.
2026-10-08 [pipeline] SecLists `10k-most-common.txt` contains profanity and other junk -> candidates go through the T5 filter before selection; never feed the raw list to the selector.
2026-10-08 [pipeline] Substring blocklists hit ordinary words ("ass" in "password", "meth" in "method", "semen" in "basement") -> mark such terms `=` in `scripts/blocklist.txt` so they only match the whole word.
2026-10-08 [tooling] Plain `node` does not resolve extensionless imports between `scripts/*.ts` -> import with `.ts` (`./pwned.ts`); tsconfig has `allowImportingTsExtensions` for it.

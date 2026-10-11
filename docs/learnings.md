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
2026-10-08 [tooling] Plain `node` runs `scripts/*.ts` but warns "Reparsing as ES module" -> package.json now has `"type": "module"` (T8).
2026-10-08 [pipeline] SecLists `10k-most-common.txt` contains profanity and other junk -> candidates go through the T5 filter before selection; never feed the raw list to the selector.
2026-10-08 [pipeline] Substring blocklists hit ordinary words ("ass" in "password", "meth" in "method", "semen" in "basement") -> mark such terms `=` in `scripts/blocklist.txt` so they only match the whole word.
2026-10-08 [tooling] Plain `node` does not resolve extensionless imports between `scripts/*.ts` -> import with `.ts` (`./pwned.ts`); tsconfig has `allowImportingTsExtensions` for it.
2026-10-08 [pipeline] Haiku 5.5 overshoots a character limit stated in the prompt, and a hard word limit makes it count words in its reply -> the prompt asks for "about 12 words" and the code checks under 140 characters (T8b).
2026-10-08 [pipeline] A note check that rejects years also rejects notes about passwords like "summer2024" -> only `%` and "percent" are blocked; dates are left to the prompt and review.
2026-10-08 [tooling] Scripts outside the repo can't resolve `@anthropic-ai/sdk` -> run ad-hoc API checks from inside the repo, with `node --env-file=.env` so the key never goes on the command line.
2026-10-08 [tooling] `node --env-file=.env` exits when `.env` is missing, as in Actions -> the pipeline commands use `--env-file-if-exists`.
2026-10-09 [pipeline] `draftNote` throws for both bad drafts and API errors -> it throws `NoValidNoteError` for bad drafts and `generate` only swaps on that class; anything else stops the run so a bad key cannot drain the pool.
2026-10-09 [pipeline] At low effort Haiku 5.5 sometimes drafts, writes "Wait, ..." and corrects itself in the visible reply; medium effort does it too -> the 140-character check catches it and the retry usually comes back clean.
2026-10-09 [pipeline] Generated puzzles are shuffled, so a test that breaks R3 by editing one entry only fails sometimes -> set every count to the same value to break the mix for certain.
2026-10-09 [tooling] `git add data/puzzles` fails when the folder doesn't exist yet, which ends a `bash -e` Actions step -> the generate workflow lists new files with `git ls-files --others` first and only adds when there are some.
2026-10-09 [tooling] Pushes made with the workflow's `GITHUB_TOKEN` don't trigger other workflows, so CI never sees the Action's commits -> the generate workflow runs `pipeline:validate` itself before committing.
2026-10-09 [tooling] Next handles `import "server-only"` without the npm package, but Vitest can't resolve it -> tests of server modules add `vi.mock("server-only", () => ({}))`.
2026-10-09 [deploy] `lib/puzzles.ts` reads `data/puzzles/` with `fs` at runtime, which file tracing can miss -> `next.config.ts` lists the folder in `outputFileTracingIncludes`.
2026-10-09 [api] `RegExp.test` turns its argument into a string, so a JSON body with `"date": ["2026-10-24"]` passes `loadPuzzle`'s date regex -> the guess route checks `typeof date === "string"` first.
2026-10-09 [api] Before `LAUNCH_DATE`, no date can be served, because the window runs from launch to UTC today+1 -> a live check of `/api/guess` can only return 400 or 404 until then; route tests mock `loadPuzzle`.
2026-10-09 [api] Next inlines `process.env.NODE_ENV` in server bundles, so a dynamic import inside a development-only branch is dropped from production -> check by grepping `.next/server` for fixture text after `npm run build`; tests switch modes with `vi.stubEnv("NODE_ENV", ...)`.
2026-10-09 [tooling] Tailwind v4 scans every file git does not ignore, so playwright writing console logs into `.playwright-mcp/` made `next dev` rebuild CSS in a loop -> `.playwright-mcp/` is in `.git/info/exclude`, which Tailwind also respects.
2026-10-09 [ui] Joining `::-webkit-slider-thumb` and `::-moz-range-thumb` in one selector list makes each browser drop the whole rule -> style the range thumb in separate rules per engine, including the `:disabled` variants.
2026-10-09 [tooling] `next dev` sometimes keeps serving the old CSS after `app/globals.css` changes, even with no build in between -> before judging a style change, check the served CSS; if it's stale, stop the server and delete `.next/dev`, since a plain restart can still serve removed rules.
2026-10-09 [ui] A native range thumb's centre travels from half its width to 100% minus half its width -> place slider ticks at `calc(7px + (100% - 14px) * f)` for the 14px thumb, not at `f`.
2026-10-09 [ui] A hydration warning about `caret-color: transparent` comes from Playwright hiding the caret for a screenshot taken before hydration -> ignore it, or wait for hydration before the screenshot.
2026-10-09 [ui] Flex spacers built from `::before`/`::after` count as flex items, so the parent `gap` applies to them too -> drop the parent gap and space the real children with margins.
2026-10-09 [ui] Tailwind v4 only emits a `@theme` variable when a scanned file uses it, so tier colours built as `var(--color-${tier})` at runtime went missing unless a test happened to name them -> tier tokens sit in `@theme static`, and a test checks all five are there.
2026-10-10 [ui] Loading localStorage in a `useEffect` fails lint (`react-hooks/set-state-in-effect`), and reading it during the first render breaks hydration -> `round.tsx` reads the saved game only once `useSyncExternalStore(noop, () => true, () => false)` reports hydration.
2026-10-10 [tooling] Another local app may already hold port 3000, so `next dev` moves to 3001 and playwright opens the wrong site -> read the port from the dev server log before an audit.
2026-10-10 [ui] With `cacheComponents`, `notFound()` inside a Suspense boundary streams the not-found page with HTTP 200 and a `noindex` meta -> check refused archive pages by their content, not the status code.
2026-10-10 [deploy] `readdir(dir)` with a parameter path makes Turbopack trace the whole project -> `lib/puzzles.ts` marks it `/*turbopackIgnore: true*/`, since `outputFileTracingIncludes` already ships `data/puzzles/`.
2026-10-10 [tooling] Before launch no past puzzles exist, so the archive can't be played locally -> for an audit, set `LAUNCH_DATE` back a few days and add throwaway files to `data/puzzles/`, then revert both.
2026-10-10 [tooling] The supply-chain auditor's scripts expect `uv`, which isn't installed, and `python3 -I` breaks their sibling imports -> run them with plain `python3` from outside the repo; they need no packages.
2026-10-10 [ui] With `cacheComponents`, `usePathname()` in a layout client component outside `<Suspense>` fails the build on dynamic routes ("URL data outside Suspense") -> when the path is only needed on click, read `location.pathname` in the handler.
2026-10-10 [tooling] In dev `loadPuzzle` falls back to the fixture, so the no-file messages never show there -> check them with `next start` after setting `LAUNCH_DATE` back; the first visit opens how-to-play over the page.
2026-10-10 [ui] With `cacheComponents`, reading the clock (`utcToday()`) before `await connection()` logs a "blocking-prerender-current-time" console error in dev, even after `await cookies()` or `await params`, because Next can still prerender with those -> `playerToday` calls `await connection()` first, and every page reads the date through it.
2026-10-10 [tooling] Clearing localStorage in playwright right after `goto` races hydration: the how-to-play effect sets its seen flag after the clear, so the reload looks like a repeat visit -> test first visits in a fresh browser context.
2026-10-10 [tooling] `Intl.DateTimeFormat#formatToParts()` with no argument reads the real clock, so `vi.useFakeTimers` does not move it -> `zoneToday` passes `new Date()` explicitly.
2026-10-10 [tooling] `generate` always fills 14 days, so a test with a handful of candidates runs out -> pass `launch` as the last of the 14 days so it writes only that one.
2026-10-10 [ui] A focused button that turns `disabled` drops keyboard focus to the page -> Lock in stays enabled while sending, and `lockIn` returns early on a second press.
2026-10-10 [ui] Screen readers usually skip an `aria-live` region that mounts together with its text -> `Round` keeps one region mounted and changes its text on each reveal and password.
2026-10-10 [ui] A negative `outline-offset` pulls the outline in on all four sides, so the slider thumb poked out of the focus frame at both ends -> the slider is 44px tall with its outline at offset 0.
2026-10-11 [ui] Next copies `opengraph-image.alt.txt` into `og:image:alt` as is, trailing newline included -> write the file without a final newline.
2026-10-11 [ui] In dev, `og:image` points at localhost even with `metadataBase` set -> check the absolute URL with `next start` after a build.
2026-10-11 [tooling] Playwright MCP blocks `file:` URLs -> serve a local HTML file with `python3 -m http.server` from `.playwright-mcp/`.
2026-10-11 [pipeline] The note drafter left a stray closing quote after the full stop, used "crackers" twice in one puzzle and capitalised a lowercase password inside quotes, and the old checks passed all three -> `noteProblem` now takes the password and rejects unbalanced quotes, cracker(s), cracking, cracked, and a quoted password in the wrong case.
2026-10-11 [tooling] braces has no patched release for GHSA-vfj7-8cjw-p6xm, so `npm audit fix` can't clear the eslint-config-next chain -> `package.json` overrides that plugin's `fast-glob` with `tinyglobby`, already installed, which ships the same `globSync`. tinyglobby expands a directory pattern into its subfolders, which only matters if `settings.next.rootDir` is ever set.

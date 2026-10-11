# Build steps

The order to build Pwnedle in. Each step ends with something you can check.

## 1. Set up (T0 to T2)
Check the domain and Listdle first, so you don't build under a name you can't use. Create the repo with the README and `docs/`, set up your local tooling, then do T2. You're done when an empty page is live on a Vercel URL and the dev, test and build commands are written down.

## 2. Prove the data works (T3, T4, T5)
Build the pipeline before any UI, because the game is only as good as its passwords. Do T3, then T4 and T5. You're done when one command prints a few hundred filtered candidates with counts, and you've skimmed them and found them interesting. If they're dull, fix the seed lists now; this is the cheapest point to change anything.

## 3. Produce real puzzles (T6 to T9a)
Add selection, notes, generation and validation, then the weekly GitHub Action. You're done when the Action has run once on its own and committed 14 days of drafts that pass CI.

## 4. Make it playable (T10 to T15)
Build scoring first (T12) because both the API and the UI depend on it, then the loader and API, then the round, reveal and end screens. You're done when you can play today's puzzle end to end on your phone and copy a share text.

## 5. Make it sticky (T16 to T19)
Persistence, stats, archive, the help and about pages, and the fallback. You're done when a refresh mid-game resumes correctly and yesterday's puzzle plays from the archive without touching your streak.

## 6. Polish and launch (T20 to T24)
Accessibility, link previews and analytics, then two weeks of approved puzzles. Playtest with friends, tune K, and launch. After launch, the weekly routine is: pull the Action's new drafts, review and approve what you can, commit. If you skip a week, the drafts go out anyway.

## Working rhythm
One ticket at a time. Each one ends with an audit: typecheck, lint, the full test suite and a build all pass, and every requirement the ticket references has a test or a clear place in the code that meets it. Only then commit and move on.

# Learnings

Short, practical notes on things that were not obvious. One or two lines each, newest at the bottom. Delete entries that stop being true.

Format: `YYYY-MM-DD [area] what happened -> what to do instead`

Areas: pipeline, api, ui, deploy, tooling.

<!-- Example:
2026-10-12 [pipeline] Range API returns hash suffixes in uppercase -> uppercase our SHA-1 before comparing.
-->
2026-10-07 [tooling] `tsc` fails on `LayoutProps` until Next generates route types -> `npm run typecheck` runs `next typegen` first.
2026-10-07 [tooling] Vitest 5 peer-requires `@types/node` 22 or later; create-next-app pins `^20` -> keep `@types/node` on `^22`.

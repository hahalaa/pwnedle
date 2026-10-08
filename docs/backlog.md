# Backlog

Status: `todo`, `doing`, `done`. Update in the same commit that finishes a ticket.

## Phase 0: setup
- [done] **T0** Check the pwnedle.com (or alternative) domain and Listdle for name clashes; buy the domain.
- [done] **T1** Create the GitHub repo with the README and docs. Locally, run `sh .claude/setup-harness.sh` and install the plugins listed in CLAUDE.md.
- [done] **T2** Next.js + TypeScript + Tailwind skeleton, ESLint, Vitest, deploy to Vercel; fill in Commands in CLAUDE.md.

## Phase 1: pipeline
- [done] **T3** Pwned Passwords range-API client with padding header and a local cache; unit tests with known counts. (R29)
- [done] **T4** Candidate generator: seed lists in `scripts/seeds/`, variation rules, SecLists import; confirm the SecLists licence. (R28, D3)
- [done] **T5** Content filter: blocklist plus personal-data patterns; tests. (R30)
- [done] **T6** Selector that builds puzzles meeting the mix rules and no-repeat rule. Sample candidates lazily: shuffle, look up counts only until the mix rules are met; never fetch the whole pool. (R3, R5, R31)
- [done] **T7** Claude API note drafter with length and content limits. (R32)
- [done] **T8** `pipeline:generate` fills any of the next 14 days without a file; `pipeline:replace` swaps one password. Load every existing puzzle file's passwords into the selector's used set (completes R31). (R33, R34)
- [done] **T8a** `pipeline:generate` keeps going when a note fails: after 3 failed drafts, swap that password for another with `selectReplacement`. Fail only when the pool runs out. (R33, R34)
- [done] **T8b** Note quality: code maps each count to a band (never leaked, rare, common, extremely common) and the prompt gets the band, not the number. One sentence under 140 characters, specific to the password. Ban stock phrases ("attackers", "breach corpus", restating the count). Reject notes whose wording contradicts the band. (R32, tightens D20)
- [done] **T8c** Variation stacking: no digit suffixes on seeds that already end in digits; at most one kind of variation per password. (R28)
- [todo] **T8d** Add the `LAUNCH_DATE` config value; `pipeline:generate` never writes a file dated before it. (D22)
- [todo] **T9** `pipeline:validate` plus a CI job: errors fail the build; warn when any of the next 7 days is still a draft. (R35)
- [todo] **T9a** GitHub Action: generate, validate, commit; manual run only until T22 turns on the weekly schedule (D22); Claude API key as an Actions secret; failure notifications on. (R36a)

## Phase 2: game
- [todo] **T10** Server puzzle loader: approved or draft files, date window, `server-only` guard; puzzle number computed from `LAUNCH_DATE`. (R1, R2, R13, R36, D22)
- [todo] **T11** API route: lock in a guess, return count, score, tier, note. (R10, R11, R14)
- [todo] **T12** Scoring and tier module with unit tests, including zero counts and the K constant. (R10, R11, D5)
- [todo] **T13** Round UI: password display, log slider with 0 stop, synced number box with k/m parsing, Lock in. (R7, R8)
- [todo] **T14** Reveal UI and progress dots. (R9)
- [todo] **T15** End screen with breakdown and share text. (R12, R19)
- [todo] **T16** localStorage progress, resume, stats modal. (R15, R16, R17)
- [todo] **T17** Archive page; archive games excluded from stats. (R18, R20)
- [todo] **T18** How-to-play modal, footer note, about/credits page, Buy Me a Coffee link. (R21 to R24)
- [todo] **T19** "Warming up" fallback, only when no file exists for today. (R36b)

## Phase 3: launch
- [todo] **T20** Mobile and accessibility pass; colourblind check of tiers. (R25)
- [todo] **T21** Open Graph image and cookie-free analytics. (R26, R27)
- [todo] **T22** Set `LAUNCH_DATE`, turn on the weekly Action schedule, then generate and approve the first 14 days. (D22)
- [todo] **T23** Playtest with 5 or more people; tune K and the mix rules; log the outcome in decisions. Check zero-count passwords look plausible.
- [todo] **T24** Launch: submit to Listdle, post to r/cybersecurity and r/InternetIsBeautiful, Show HN.

## Later
- [todo] **T25** Contact HIBP / Troy Hunt once there are regular players. (R40)
- [todo] **T26** Event theme days. (R38)
- [todo] **T27** Unlimited practice mode. (R39)
- [todo] **T28** Clear the 5 high `npm audit` advisories in the dev-only eslint-config-next chain (braces via micromatch and fast-glob) without `--force`.

# Decisions

Append new decisions at the bottom. Do not edit an old one; add a new decision that supersedes it.

## D1. Concept
Daily game: 5 passwords a day; players guess each one's breach count on a log scale. Chosen after confirming no existing game uses this mechanic. Passwordle (passwordle.online) is a different game, where you guess a password Wordle-style.

## D2. Data source: Pwned Passwords range API
HIBP's support documentation states the Pwned Passwords API is free, has no rate limit, and has no licensing or attribution requirements. HIBP is credited anyway as a courtesy (R24). The dataset only contains hashes, so readable passwords must come from our own candidate generation (D3).

## D3. Candidate sources: seed lists plus SecLists
Both repo-maintained seed lists with variation rules, and public SecLists common-password lists. Confirm SecLists' licence in T4 and record it in the about page.

Confirmed in T4: SecLists is MIT licensed (Copyright (c) 2018 Daniel Miessler). We vendor `Passwords/Common-Credentials/10k-most-common.txt` in `scripts/seeds/seclists/` with its `LICENSE` file next to it. The about page (T18) must credit SecLists.

## D4. Players never enter passwords
Players only ever type numbers. A security game must not train people to type passwords into websites. R22 says so explicitly on the site.

## D5. Scoring: bell curve on the log scale
`score = 100 * e^(-(d/K)^2)` with `K = 1.25`. A straight-line penalty felt harsh on near misses and generous on large misses; the bell curve is forgiving within about 3x and near zero beyond about 100x. K is a single tuning value for after playtesting. `count + 1` is used inside the log so zero counts work.

## D6. Tier labels mirror a password-strength meter
Uncrackable, Strong, Medium, Weak, Pwned. Used per password, for the daily result, and in the share text.

## D7. Counts revealed by the server, one at a time
The client gets the day's passwords but not the counts. Anyone can still look a password up on HIBP themselves; that is accepted and not monitored. Server-side guess enforcement is not needed.

## D8. Stack
Next.js (App Router) + TypeScript on Vercel, Tailwind, approved puzzle JSON imported only from server code, TypeScript pipeline scripts run locally. No database and no login. Chosen to keep the moving parts to one language, one repo and one deploy.

## D9. Monetisation: free everything plus Buy Me a Coffee
Daily puzzle and full archive are free. Unlimited practice mode is deferred past v1.

## D10. Review workflow: JSON files in the repo
The pipeline writes a week of draft puzzles at a time. Harry reviews by editing the files and committing. No admin UI.

## D11. Published puzzles are frozen
Counts are recorded when a puzzle is generated and never refreshed after its date passes, so archive results and old share texts stay consistent even as HIBP's counts grow.

## D12. Strict content policy
No profanity, slurs, sexual or drug terms, and nothing resembling personal data. Enforced by the filter (R30), the validator (R35), and Harry's review.

## D13. No themes in v1; random order within a day
Random mixes give the most surprising reveals. Event themes may come later (R38).

## D14. HIBP outreach after launch
Launch first; contact Troy Hunt once the game has regular players (R40).

## D15. Tickets and learnings live in markdown
`docs/backlog.md` and `docs/learnings.md`, kept up to date as each ticket is finished.

## D16. Unreviewed days still go out (supersedes part of D10)
Players should never be stuck. If Harry hasn't approved a day, its draft is served as-is. A weekly GitHub Action keeps drafts generated 14 days ahead, so a missing day needs two consecutive failed runs. The trade-off is that an unreviewed day may have a weaker password mix or an awkward Claude-drafted note; the automated filter and validator still apply. Review stays the norm, just not a gate.

## D17. Commit format
Conventional Commits: `<type>(<optional scope>): <Description>`, imperative mood, capitalised, no full stop, subject aimed at 50 characters and capped at 72, body wrapped at 72 explaining what and why. No AI attribution trailers. A local commit-msg hook enforces this.

## D18. Local tooling stays out of the repo
Editor and agent configuration is kept local through `.git/info/exclude`, so the repository holds only the product, its docs and its CI.

## D19. One-line commits (supersedes part of D17)
Commit messages are a single Conventional Commits subject line with no body. The commit-msg hook rejects bodies. Context that would have gone in a body goes in `docs/learnings.md` or a decision instead.

## D20. Notes drafted by Claude Haiku 5.5
The pipeline drafts reveal notes with `claude-haiku-5-5` at low effort, through the official `@anthropic-ai/sdk` (a dev dependency, used only by `scripts/`). A note is two short sentences, so the cheapest current model is enough. Every draft is checked against R32 and retried up to three times; Harry's review catches the rest.

## D21. Puzzle files and the generate window
Each `data/puzzles/YYYY-MM-DD.json` holds `date`, `status` (`draft` or `approved`) and `passwords`: 5 entries of `{password, count, note}` in display order (R4). `pipeline:generate` fills today through today+13, in UTC like R2. `pipeline:replace` only touches drafts dated today+2 or later, because the server can already serve anything up to today+1.

## D22. Launch date
`LAUNCH_DATE` is a single config value, set at T22. The puzzle number (R1) is computed from it in T10 and never stored in puzzle files. `pipeline:generate` never writes a file dated before it. Until T22, the T9a Action runs only when started by hand; T22 turns on the weekly schedule.

`LAUNCH_DATE` is provisionally 2026-10-24 until T22 confirms it.

## D23. Note bands
Notes are drafted from a band, never the count, so they cannot restate it: never leaked (0), rare (1 to 999), common (1,000 to 99,999), extremely common (100,000 or more). A draft is one sentence under 140 characters. It is rejected if it uses stock phrases ("attackers", "hackers", "breach corpus"), restates the count, or uses wording that contradicts its band. This tightens D20 and R32.

## D24. Dev fixture puzzle
In development only, the loader skips the `LAUNCH_DATE` check. It serves the real file for a date when one exists, and otherwise a fixed fixture puzzle numbered #0, so the game can be built and played before launch. The fixture lives in `lib/`, outside `data/puzzles/`, so the pipeline never sees its passwords. Production builds never load it.

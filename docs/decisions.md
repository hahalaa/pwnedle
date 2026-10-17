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

## D6. Tier labels mirror a password-strength meter (Medium label superseded by D40)
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
Editor configuration is kept local through `.git/info/exclude`, so the repository holds only the product, its docs and its CI.

## D19. One-line commits (supersedes part of D17)
Commit messages are a single Conventional Commits subject line with no body. The commit-msg hook rejects bodies. Context that would have gone in a body goes in `docs/learnings.md` or a decision instead.

## D20. Notes drafted by Claude Haiku 5.5
The pipeline drafts reveal notes with `claude-haiku-5-5` at low effort, through the official `@anthropic-ai/sdk` (a dev dependency, used only by `scripts/`). A note is two short sentences, so the cheapest current model is enough. Every draft is checked against R32 and retried up to three times; Harry's review catches the rest.

## D21. Puzzle files and the generate window
Each `data/puzzles/YYYY-MM-DD.json` holds `date`, `status` (`draft` or `approved`) and `passwords`: 5 entries of `{password, count, note}` in display order (R4). `pipeline:generate` fills today through today+13, in UTC like R2. `pipeline:replace` only touches drafts dated today+2 or later, because the server can already serve anything up to today+1.

## D22. Launch date
`LAUNCH_DATE` is a single config value: 2026-10-20. T22 first set it to 2026-10-24; it moved four days earlier on 2026-10-12. The puzzle number (R1) is computed from it in T10 and never stored in puzzle files. `pipeline:generate` never writes a file dated before it. Before launch, its 14-day window starts at `LAUNCH_DATE` instead of today, so the first 14 days can be drafted and approved ahead of time. The T9a Action runs every Monday at 06:17 UTC and can still be started by hand.

## D23. Note bands
Notes are drafted from a band, never the count, so they cannot restate it: never leaked (0), rare (1 to 999), common (1,000 to 99,999), extremely common (100,000 or more). A draft is one sentence under 140 characters. It is rejected if it uses stock phrases ("attackers", "hackers", "breach corpus"), restates the count, or uses wording that contradicts its band. This tightens D20 and R32.

## D24. Dev fixture puzzle
In development only, the loader skips the `LAUNCH_DATE` check. It serves the real file for a date when one exists, and otherwise a fixed fixture puzzle numbered #0, so the game can be built and played before launch. The fixture lives in `lib/`, outside `data/puzzles/`, so the pipeline never sees its passwords. Production builds never load it.

## D25. Visual direction
Dark and quiet, drawn from old terminal printouts and dot-matrix images. No green terminal text and no glitch effects. Near-black background, off-white text, thin 1px lines, and one red accent kept for the main action (Lock in, the slider thumb) and errors. The password sits in a 1px window whose title bar shows the progress, with square brackets at each side.

Colour tokens (in `app/globals.css`; T14 adds the tier colours there when it first uses them):
- `void` #0b0b0c: background
- `bone` #e8e5df: text, focus outlines
- `ash` #8d8a84: secondary text and labels
- `line` #2a2a2d: 1px borders and rules
- `signal` #e5322d: the accent

Tier colours run from blue to yellow and get lighter as the tier improves, so their order survives colour blindness; none of them is near the red accent. Each one passes 4.5:1 on `void`, and the tier label always appears next to it (R25):
- Pwned #5f7fc0, Weak #8fa3c4, Medium #b9b39b, Strong #dcc062, Uncrackable #fde74c

Type: Archivo for prose and buttons; IBM Plex Mono for passwords, numbers and labels (lowercase, never all caps); Doto, a dot-matrix face, only for the Pwnedle wordmark.

## D26. Traffic-light tier colours (supersedes the D25 tier tokens)
Tier colours now match the R19 share squares: green and olive-lime for the top two tiers, then amber, orange and red. Pwned reuses the `signal` accent, so red means a bad result as well as the main action. Uncrackable is a saturated green with its chroma held below the phosphor green D25 rules out for text.

A saturated green can't be much lighter than OKLab L 0.85, so the ramp is compressed under it: each tier is about 0.05 to 0.07 OKLab lightness lighter than the one below. Under a deuteranopia simulation (Machado 2009, full severity) the hues collapse to yellows but the steps remain, so the order still reads, though the top two steps are the smallest. The tier label always appears next to the colour (R25). Contrast on `void` is at least 4.5:1; Pwned is the lowest at 4.52:1.
- Pwned #e5322d, Weak #e76d04, Medium #e19906, Strong #a7cc0a, Uncrackable #56ee66

## D27. Buy Me a Coffee link
The link is https://buymeacoffee.com/hahalaa, stored once as `COFFEE_URL` in `lib/config.ts` so the end screen (T15) and the footer (T18) share it.

## D28. Custom domain deferred (superseded by D39)
The site lives at https://pwnedle.vercel.app, stored as `SITE_URL` in `lib/config.ts`, and the share text ends with `pwnedle.vercel.app`. A custom domain waits until the game has regular players and donations can cover it.

## D29. Safety note only in how-to-play (amends R22)
R22 first put the "Pwnedle will never ask for your passwords" note in the footer as well. On every page it was clutter. It now appears only in the how-to-play popup, which every new player sees on their first visit. The footer holds just the about and Buy Me a Coffee links.

## D30. Local date from a time-zone cookie (R2)
The browser saves its IANA time zone in a first-party `tz` cookie, and server pages work out the player's local date from it on each request. The home page, the archive list and the archive cut-off all use that date. The cookie is untrusted. An unknown or missing zone falls back to UTC, and the date is clamped to within one day of UTC, which covers every real zone. The serving window stays launch to UTC today+1, enforced by `loadPuzzle`. On a first visit the server uses UTC, then the browser sets the cookie and refreshes once. The cookie is functional only, and the about page does not mention it.

## D31. End screen keeps only Share (amends R12, R23 and D27)
R12 and R23 first put the Buy Me a Coffee link on the end screen as well as in the footer. The end screen now shows Share result alone, and the link stays in the footer. `COFFEE_URL` is still set once in `lib/config.ts`; only the footer uses it. The stats heading "daily tiers" is now "tiers". R17 still describes the same data.

## D32. Analytics: Umami Cloud (R27)
Checked on 2026-10-11. Vercel Web Analytics on the free Hobby plan counts page views but has no custom events, which need Pro. Umami Cloud's free Hobby plan has custom events, 100k events a month, one site and 6 months of history, and it sets no cookies. Umami loads as one script tag, so there is no npm package. Its site ID is public and lives in `lib/config.ts` as `UMAMI_WEBSITE_ID`. `data-domains` limits counting to the live site.

Two events go with the page views: `puzzle-start` on a puzzle's first lock-in and `puzzle-complete` on See results. Each carries only the puzzle number and the archive flag, never a password, guess or count.

## D33. No near-duplicates within 14 days
A password's base word comes from the content filter's normalisation: lowercase, cut the trailing digits and symbols, undo leetspeak, then drop anything left that isn't a letter. "Whatever123" and "whatever2024" both give "whatever", and "m@nutd" and "manutd" both give "manutd". No two passwords dated less than 14 days apart, including two in the same puzzle, may share a base word. All-digit passwords such as "1962" have no base word and are exempt. The selector, `generate` and `replace` avoid such pairs, and `pipeline:validate` reports them as errors. This tightens R5 and R31.

## D34. Playtest on a throwaway preview (T23)
T23 needs 1 or more testers instead of 5, since Harry is the main playtester. Harry has already seen the approved launch puzzles, so the playtest used 14 fresh puzzles generated on a `playtest` branch, dated 2026-09-28 to 2026-10-11, with `LAUNCH_DATE` moved to 2026-09-28 on that branch only. Vercel built the branch as a preview, where the 2026-10-11 puzzle was #14 and the other 13 were in the archive. The branch was never merged and was deleted when T23 finished. Its preview stays behind Vercel login and is left to expire, so it needs no manual deletion. Umami sends nothing from the preview, because `data-domains` only allows the live host. Testers send each puzzle's share text and answer three questions: was scoring too harsh or too soft, did any password feel unfair, and did any zero-count password look implausible.

Outcome, 2026-10-11: Harry played all 14. Scores averaged about 270 out of 500, from 125 to 377, with one Strong day and mostly Medium. Scoring by ratio felt right, no password felt unfair, and the zero-count passwords looked plausible and were fun. K stays 1.25 and the R3 mix rules stay as they are. K gets another look after launch, using real players' share texts.

## D35. Tier sounds are on by default (T34)
Each reveal plays a short square-wave sound for its tier, made with the Web Audio API. Sound is on for a new player. A reveal always follows a click on Lock in, so browsers let it play. The mute toggle sits in the header nav after stats, labelled "sound" or "muted" so the nav still fits on one line at 390px. The choice is saved in localStorage under `pwnedle-muted`.

## D36. Icon nav on phones (amends D35)
Below the `sm` breakpoint the header nav shows icons instead of words: a circled question mark for help, a calendar for archive, a bar chart for stats, and a speaker for sound, crossed when muted. The icons are inline SVG with 1px lines to match D25, and need no icon package. Each item has an aria-label (help, archive, stats, sound on or sound muted). The icon repeats it as a hover tooltip through an SVG `<title>`, so the desktop text links show no tooltip. All four icons are drawn on a 24px grid with their outer lines on the same box, from 3.5 to 20.5, so they line up and look the same size. Each has a 44px tap target, and the 20px gap between icons keeps the targets from overlapping. On phones the nav is centred against the wordmark, which keeps the 1px lines on whole pixels. Desktop keeps the text links.

## D37. Motion (T35)
Animations last 150 to 250 ms and use only fades and slides of a few pixels. Nothing bounces or scales. The reveal, the end screen and each new page fade in over 200 ms with a 4px rise. The help and stats dialogs and their backdrops fade in and out over 200 ms. Under `prefers-reduced-motion: reduce`, one rule in `app/globals.css` turns off every animation and transition.

## D38. Upcoming puzzles are readable on GitHub
The repository is public, so anyone can open `data/puzzles/` and read the counts and notes for days that haven't been played yet. This is accepted for the same reason as D7: anyone can look a password up on HIBP anyway.

## D39. Domain: pwnedle.com (supersedes D28)
Bought through Vercel on 2026-10-11. The site lives at https://pwnedle.com, stored as `SITE_URL` in `lib/config.ts`, and the share text ends with `pwnedle.com`. `metadataBase` and Umami's `data-domains` both take their host from `SITE_URL`. www.pwnedle.com and pwnedle.vercel.app redirect to it with a permanent 308. Both redirects live in the Vercel domain settings, so preview URLs are unaffected. The link preview image's source is `docs/og-source.html`.

## D40. Mid replaces Medium (supersedes the D6 label)
The tiers are now Uncrackable, Strong, Mid, Weak and Pwned, with the same score bands (R11). The colour token `--color-medium` is now `--color-mid`, with the same D26 colour. Saved games store each result's tier, so `loadGame` reads an old "Medium" as Mid. Stats work from scores and need no change.

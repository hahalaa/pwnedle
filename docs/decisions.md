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

## D41. Drawings (T41)
The drawings show a hooded figure at a laptop. The sources are in `docs/art/`. The six on white (coffee and one per tier) were traced once with potrace and live in `public/art/` as filled paths in `currentColor` on a transparent background. Pages show them through a CSS mask filled with the text colour, so they follow the theme and need no runtime package. On the dark background, filled parts such as the coffee cup turn light and still read as a cup.

The tab icon (`app/icon.svg`) is the white-on-black favicon drawing, cropped square on a `void` rounded square. Its lines were thickened before tracing so it reads at 16px on light and dark tab bars. The link preview image is unchanged.

Every other icon is rendered from `icon.svg` with the same crop and padding. `apple-icon.png` is 180×180 on a solid `void` square without rounded corners, because iOS rounds the corners itself and fills transparency with black. `icon1.png` (32×32) and `favicon.ico` (16 and 32) cover browsers without SVG favicons and keep the transparent corners. The site has no web manifest and nothing asks for one, so there are no 192 or 512 icons.

The coffee drawing sits inside the footer's Buy Me a Coffee link, after the words, at the link's height of 20px. It is decorative and hidden from screen readers.

The end screen shows the drawing for the daily tier beside the total, at the total's height, so it adds no height. It is decorative and hidden from screen readers; the tier label still names the tier in its colour (R25). Reveals show no drawing. T42 compared the traced line art with a 40-cell dot-matrix version and kept the line art, which keeps the facial expressions the dot grid lost.

## D42. Reveal panel (T48, replaces the T43 zoom; amends D37)
The reveal is one sequence of under 2 seconds; D37's 150 to 250 ms limit still holds for everything else. After Lock in, a panel replaces the slider and the password stays at the top.

A chart shows the log axis, labelled at 0 and each power of ten. The count is a dashed line labelled "answer" with its number, on the top row. The guess is a solid line in the tier colour labelled "you" with its number, on the lower row, so the two labels never collide. A label shifts left by the same share of its width as its line's place across the chart, so it stays inside the edges. The chart fades in zoomed to two decades around the guess, then eases out until both lines fit, with 20% of the gap to spare on each side. The view widens by the same factor at each step, so a wild miss sweeps evenly across several labels and a near miss barely moves.

Below the chart, one row holds the ratio, the only large text, in the tier colour: "4.2× too low" or "12.5k× too high", using (count+1)/(guess+1) or its inverse like the score does, so a count of 0 works. It has one decimal below 10, whole numbers to 999, then k and m like the axis, and says "Exact" only when the guess equals the count. The points ("78/100") and the tier sit small on the right. The row rises in as the zoom ends, and a 2px meter under it fills in the tier colour as the points count up, starting just before the zoom stops so the motion never stalls. The tier sound plays as it lands. The tier and the note in muted text fade in 80 and 40 ms ahead of the landing, and the button as it lands, so the whole reveal takes 1.75 seconds.

Only transform and opacity animate, and nothing bounces. A click or key press skips to the end without also pressing a button or following a link. Players with reduced motion, resumed reveals and finished archive games get the end state at once, and the live region announces the reveal straight away. Every timing is in `REVEAL` in `app/round.tsx`.

## D43. Light theme (T44, amends D25 and D26)
A warm paper theme sits alongside the dark one. It follows the system setting. A toggle after sound in the header nav overrides it and saves the choice in localStorage under `pwnedle-theme`. Like the sound toggle, it shows the current state: "dark" or "light" on desktop, and a moon or sun on phones in the D36 style, with aria-labels "dark theme" and "light theme". An inline script in the page head applies a saved choice before first paint. Each colour token in `app/globals.css` is a `light-dark(light, dark)` pair, so the dark values are unchanged. The share squares, link preview image and tab icon stay as they are.

Light values, with contrast on `void`:
- `void` #f1ece1: background
- `bone` #1d1b18: 14.6:1
- `ash` #6b665d: 4.84:1
- `line` #d9d2c4: 1.28:1, close to the dark theme's 1.37:1
- `signal` #ce2422: 4.57:1, which also covers the background-coloured text on Lock in

Tier colours: Pwned #ce2422 (the light `signal`), Weak #9b4a0e, Mid #754f0b, Strong #425209, Uncrackable #074c13. Contrast runs from 4.57:1 for Pwned to 8.69:1 for Uncrackable. On the light background the ramp is reversed, with better tiers darker. To pass 4.5:1 on paper, a green can't be lighter than about OKLab L 0.51, while a red can reach about 0.55, so red has to sit at the light end. Under the D26 deuteranopia simulation the tiers keep their order, with OKLab lightness 0.567, 0.514, 0.466, 0.415 and 0.366. Each step is about 0.05, more than the smallest D26 step. At this lightness Weak, Mid and Strong come out as burnt orange, ochre and olive. The tier label still appears next to every colour (R25).

## D44. One type family (T47, amends D25)
All text uses IBM Plex Mono, which replaces Archivo for prose, buttons and dialogs. The body sets it once, so elements don't repeat `font-mono`. Doto stays on the Pwnedle wordmark only. Plex Mono loads at weights 400 and 600; buttons use 600. Mono runs wider than Archivo, so the about page and the reveal note are capped at 65 characters a line (`max-w-prose`). The how-to-play dialog is already narrower than that.

## D45. Phones can play the dev server (T50)
`next.config.ts` lists this Mac's address on the local network in `allowedDevOrigins`, so a phone on the same Wi-Fi can play `npm run dev`. Without it Next 16 blocks the dev scripts and the page never hydrates. If the Mac's address changes, update the entry.

## D46. Enter plays the round (T51)
Enter anywhere on the round locks in once the player has moved the slider or typed in the box, and moves focus to the button. Before that, Enter sends nothing and, on desktop, moves focus to the guess box; a mouse click on Lock in still sends the default 0. While the reveal plays, the first Enter only skips to its end (T43); Enter after the button shows moves to the next password. Enter on a link or another button, or while a dialog is open, keeps its own behaviour. On desktop, a Next pressed from the keyboard or clicked with a mouse puts focus in the next guess box, and a touch or pen tap doesn't. On a touch screen (`(pointer: coarse)`) nothing moves focus into the guess box, so the phone keyboard only opens when the player taps the box. iOS can report a tap's click with an empty pointerType, so the pointer type alone isn't enough.

## D47. Hash background (T49, amends D25 and D37)
Faint columns of SHA-1 hex pairs drift up or down behind every page, a nod to how Pwned Passwords lookups work. Harry chose it over a node network, a circuit-board version of that network, a dot-matrix "breach dump" and no background. One canvas in `app/backdrop.tsx` draws it in the `line` colour, in IBM Plex Mono, so it follows the theme.

About a third of the 34px column slots carry glyphs. Each drifts at 4 to 12px a second and fades in and out over 18 to 40 seconds, with the fades staggered so about half show at once. On desktop the columns stay in the margins, at least 24px clear of the content column, and both margins get the same number. Phones have no margins, so the columns run across the screen, behind the text, at 45% strength in the dark theme and 28% in the light.

On desktop no glyph sits behind text. On phones a glyph passing behind red text (the Pwned tier, the ratio, errors) drops it from 4.52:1 to about 4.0:1 at worst in the dark theme, and from 4.57:1 to about 4.25:1 in the light theme, for as long as the glyph is there. This is accepted because the tier is always written out as a word next to its colour (R25, D26). Other text stays at 4.5:1 or above: in the light theme 28% is the most the muted `ash` text allows (4.50:1), so the light theme on phones is fainter than the dark. T54 looks for a way to keep red text at 4.5:1 as well.

It redraws at most 24 times a second, which is 20 on a 60Hz screen. Browsers don't run `requestAnimationFrame` in a hidden tab, so it pauses there. With reduced motion it draws one still frame and redraws only when the window size or theme changes. D37's 150 to 250 ms limit is for interface feedback, so it doesn't apply to this slow drift.

## D48. Reopening a reveal (T56)
Each row in the end screen's breakdown is a button that reopens that password's reveal, at home and in the archive. The view looks like the round did: the prompt, the password window with its progress and dots, the reveal, and "Back to results" where Next was. It replays the D42 sequence, tier sound included, and mute and reduced motion apply as they do in the round. It reads only the saved game: no guess goes to the API, the saved game, stats and streak stay as they were, and no Umami event is sent. The reopened view isn't saved either, so a refresh lands on the end screen. "Back to results", or Escape once the reveal has landed, returns to the end screen without its fade and puts focus back on the row. While the reveal plays, Escape only skips, like any other key.

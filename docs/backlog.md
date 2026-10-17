# Backlog

Status: `todo`, `doing`, `done`. Update in the same commit that finishes a ticket.

## Phase 0: setup
- [done] **T0** Check the pwnedle.com (or alternative) domain and Listdle for name clashes; buy the domain. Bought pwnedle.com through Vercel on 2026-10-11 (D39).
- [done] **T1** Create the GitHub repo with the README and docs, and set up local editor tooling.
- [done] **T2** Next.js + TypeScript + Tailwind skeleton, ESLint, Vitest, deploy to Vercel; write down the dev, test and build commands.

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
- [done] **T8d** Add the `LAUNCH_DATE` config value; `pipeline:generate` never writes a file dated before it. (D22)
- [done] **T9** `pipeline:validate` plus a CI job: errors fail the build; warn when any of the next 7 days is still a draft. (R35)
- [done] **T9a** GitHub Action: generate, validate, commit; manual run only until T22 turns on the weekly schedule (D22); Claude API key as an Actions secret; failure notifications on. (R36a)

## Phase 2: game
- [done] **T10** Server puzzle loader: approved or draft files, date window, `server-only` guard; puzzle number computed from `LAUNCH_DATE`. (R1, R2, R13, R36, D22)
- [done] **T11** API route: lock in a guess, return count, score, tier, note. (R10, R11, R14) Add a function that returns the client-safe puzzle (date, number, passwords only) and use it everywhere the browser receives puzzle data; test that counts and notes are absent.
- [done] **T11a** Dev puzzle: when NODE_ENV is development, the loader serves a fixed fixture puzzle (fake passwords, counts and notes) for any date in the window, ignoring LAUNCH_DATE. Production builds never load it; test that. The fixture's passwords never enter data/puzzles or the used set.
- [done] **T12** Scoring and tier module with unit tests, including zero counts and the K constant. (R10, R11, D5)
- [done] **T13** Round UI: password display, log slider with 0 stop, synced number box with k/m parsing, Lock in. (R7, R8)
- [done] **T13a** Visual direction: restyle the app from a set of local design references. Near-black background, off-white text, one red accent used sparingly, monospace for labels and data, thin 1px lines and bracket motifs, a subtle dot-matrix or halftone texture. No green terminal text, no heavy glitch effects. Tier colours stay colourblind-safe and labelled and must not clash with the accent. Record the direction as a decision with the colour and type tokens. (R25)
- [done] **T13b** Slider scale: a tick at every power of ten from 1 to 100m, evenly spaced, with the 0 stop visually separate; keep the log mapping. (R7)
- [done] **T13c** Layout: the game fills the viewport. Vertically centred on desktop at a sensible width; on mobile it fills the screen with Lock in within thumb reach.
- [done] **T13d** Polish: plain background, no dot-grid texture; the outer container spans the full viewport with the content centred inside it. The 0-to-1 slider segment is half a decade wide and dotted instead of a gap.
- [done] **T14** Reveal UI and progress dots. (R9)
- [done] **T15** End screen with breakdown and share text. (R12, R19)
- [done] **T16** localStorage progress, resume, stats modal. (R15, R16, R17)
- [done] **T17** Archive page; archive games excluded from stats. (R18, R20)
- [done] **T18** How-to-play modal, footer note, about/credits page, Buy Me a Coffee link. (R21 to R24)
- [done] **T19** "Warming up" fallback, only when no file exists for today. (R36b)

## Phase 3: launch
- [done] **T20** Mobile and accessibility pass; colourblind check of tiers. (R25)
- [done] **T21** Open Graph image and cookie-free analytics. (R26, R27)
- [done] **T22** Set `LAUNCH_DATE`, turn on the weekly Action schedule, then generate and approve the first 14 days. (D22)
- [done] **T33** Selector and validator avoid near-duplicates: no two passwords within 14 days share the same base word after removing case, digits, years and symbols.
- [done] **T23** Playtest with 1 or more people (D34); tune K and the mix rules; log the outcome in decisions. Check zero-count passwords look plausible.
- [done] **T34** Sound effects: one short retro "pixel" sound per tier on each reveal, most positive for Uncrackable and most negative for Pwned. Made with the Web Audio API, so no audio files and no new packages. Includes a mute toggle that is remembered.
- [done] **T35** Subtle animations: short fades for the reveal, the modals and page changes. Nothing bouncy or slow, and none at all under `prefers-reduced-motion`.
- [done] **T36** Arrow keys get stuck on the slider: from 1, ArrowRight moves to a position that rounds back to 1, so the thumb never moves. The same happens just above each power of ten, where two significant figures map several positions to one value. (R7, R25)
- [done] **T37** The header nav is cramped on phones: below `sm`, show help, archive, stats and sound as 1px line icons (inline SVG, no icon package), each with an aria-label, a 44px tap target and the focus outline. Desktop keeps the text links. (R25, D25)
- [todo] **T24** Launch: submit to Listdle, post to r/cybersecurity and r/InternetIsBeautiful, Show HN. Pre-launch supply-chain audit on 2026-10-11: no advisories.

## Phase 4: feedback
- [done] **T39** Rename the Medium tier to Mid everywhere: the tier module, reveal, end screen, stats, how-to-play, share text, tests, and the R11 and R19 text. Add a decision that supersedes the D6 label. If localStorage stores tier names, read an old "Medium" as Mid so existing stats survive. (R11, R19, D6)
- [done] **T40** Desktop layout: from the `lg` breakpoint up, use the extra width instead of keeping the phone column. Widen the main column, give most of the extra width to the slider, and scale up the password window and the reveal numbers. The header and footer line up with the column. Phones and tablets stay as they are. Check at 1280, 1440 and 1920 with before and after screenshots. If one wider column still looks sparse, show Harry screenshots of a two-column option (password on one side, slider and reveal on the other) before building it. (R25, D25)
- [done] **T40a** Desktop scale: at 1920 the game still leaves too much empty space on the left, right and below. From `lg` up, scale the root font size with the viewport (for example a `clamp()` on `html` from 16px at 1024 up to about 20px at 1920 and above), so the rem-based column, type and spacing grow together and the 1px lines stay 1px. At 1920 the column should take roughly 60 to 65% of the width, and the round should fill most of the viewport height without scrolling at 1920×1080. At 1440 the result should be a little larger than T40's. Phones and tablets stay as they are. Before committing, show Harry before and after screenshots of the round, reveal and end screen at 1440×900 and 1920×1080, and wait for his OK. Check the dialogs, archive and about page at 1920 too. (R25, D25)
- [done] **T41** Drawings, part 1. The source drawings are in `docs/art/`: favicon, coffee, uncrackable, strong, mid, weak and pwned. Replace the tab icon (`app/icon.svg`) with `favicon`, cropped square. Check that it reads at 16 and 32px against light and dark browser tab bars. Leave `apple-icon.png` and the OG image as they are. Trace the six white-background drawings to SVG once (for example with potrace) and commit the SVGs. Give them `currentColor` lines on a transparent background, so they follow the theme; add no runtime package. Put `coffee` beside the Buy Me a Coffee link in the footer, as decorative (empty alt), at about the link's height. Check that the filled areas, such as the cup, still read correctly when the lines turn light on the dark background. Record the artwork as a decision. (R23, D25)
- [done] **T42** Drawings, part 2: show the drawing for the player's daily tier on the end screen, next to the total. Use one drawing only, and none on the per-password reveals. The tier label stays, so text and colour still carry the tier (R25). Build two versions behind a temporary switch: the traced line art from T41, and a pixelated dot-matrix version that matches the Doto wordmark (for example a 32 to 48 cell grid with `image-rendering: pixelated`). Use the `prototype` skill for the switch. Show Harry screenshots of both at 390×844 and 1920×1080 for a high tier and a low tier, and wait for his pick before committing. Then remove the other version and the switch, and add the choice to D41. The end screen must not scroll at 390×844 or 1366×768 because of the drawing. Archive games show the drawing too. T44 checks it in light mode. (R12, R25, D25, D41)
- [todo] **T43** Reveal animation, modelled on Magnitudle's zoom. After Lock in, the slider bar stays on screen, read-only. Charge: a fill sweeps smoothly left to right from 0 to the player's guess, and the view zooms in around the guess as the fill arrives, so the guess fills most of the width. Zoom out: the view eases back out to the full 0 to 100m bar, and the actual count's marker appears on it, so the player sees the distance between their guess and the real value. As the zoom out starts, the guess fill and marker take the colour of the tier the player got. The points counter climbs to the score during the zoom out, and the tier sound (D35) plays as it lands. Then the count, tier, note and next button appear as they do now. The whole sequence takes about 1.5 to 2 seconds and animates only transform and opacity. A click or key press skips to the end state. Under `prefers-reduced-motion`, the end state shows at once. The live region announces the final values immediately. Reveals that are resumed after a refresh, or that come from finished archive games, show the end state without replaying. Add no new packages. Add a decision that amends D37's 250 ms limit for this sequence only. (R9, D35, D37)
- [todo] **T44** Light mode: a warm off-white theme (paper or beige, never pure white) alongside the dark one. It follows the system setting by default. A toggle in the header nav overrides it and is saved in localStorage. On phones the toggle is a sun or moon line icon in the D36 style, with an aria-label, a 44px tap target and a tooltip. On desktop it's a text link like the others. Set the theme before first paint so the page doesn't flash. Every D25 token gets a light value. Text and tier colours pass 4.5:1 on the light background, and the tier ramp keeps a clear lightness order under a deuteranopia simulation, as in D26. The nav still fits at 390px with five items. Check every page, both dialogs, the drawings and the reveal animation in both themes. The share squares, OG image and tab icon don't change. Record the palette as a decision. (R25, D25, D26, D36)
- [todo] **T45** Polish pass with the `apple-design` skill. Review the round, reveal, end screen, dialogs, archive, stats and about page at 390, 768, 1280 and 1920px, in both themes. List the findings for Harry first, then fix the ones he approves. Fixes stay within D25 and the motion decisions. Anything that would change the look goes to Harry first. Also scale the slider thumb and bracket corners with the root font size from T40a, keeping the tick formula in step. The reveal fits without scrolling at 1366×768. The round, reveal and end screen fit without scrolling at 1366×768. (R25)

## Later
- [todo] **T25** Contact HIBP / Troy Hunt once there are regular players. (R40)
- [todo] **T26** Event theme days. (R38)
- [todo] **T27** Unlimited practice mode. (R39)
- [done] **T28** Clear the 5 high `npm audit` advisories in the dev-only eslint-config-next chain (braces via micromatch and fast-glob) without `--force`.
- [todo] **T29** Optional cursor-reactive dot grid (dots enlarge near the cursor); desktop only, subtle, respects `prefers-reduced-motion`.
- [done] **T30** The home page picks today's puzzle by UTC date, so it rolls over at UTC midnight rather than the player's local midnight. Choose the date from the player's local clock within the server's launch-to-today+1 window, and match the archive cut-off. (R2)
- [done] **T31** Missing tests: a Round test that a refresh resumes mid-puzzle with reveals intact and never re-sends a locked-in guess (R15, R16); a test that a generated puzzle's display order is kept as written (R4).
- [todo] **T32** Remove the tinyglobby override in package.json once eslint-config-next no longer pulls in fast-glob/braces; check on each Next.js upgrade.
- [done] **T38** CI rejects any modification or deletion of a puzzle file in data/puzzles/ dated before today+2 UTC, the pipeline:replace cut-off; new files for any date are allowed. (D11, D21, R37)

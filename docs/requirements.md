# Requirements

Status key: **v1** = needed for launch, **later** = after launch.

## 1. Daily puzzle
- **R1 (v1)** One puzzle per day, the same for everyone, containing 5 passwords. Puzzle number = days since launch, starting at #1.
- **R2 (v1)** The day rolls over at each player's local midnight, as in Wordle. The server serves any approved puzzle from launch day up to one day past the current UTC date. Later dates are refused.
- **R3 (v1)** Mix rules for each puzzle's 5 passwords:
  - at least one with a count of 100 or less;
  - at least one with a count of 100,000 or more;
  - the 5 counts span at least 4 different orders of magnitude;
  - at most one password with a count of 0.
- **R4 (v1)** The 5 passwords appear in a random order, fixed per puzzle so everyone sees the same order.
- **R5 (v1)** A password never appears in more than one puzzle.
- **R6 (v1)** No themes in v1. Every puzzle is a random mix.

## 2. Gameplay
- **R7 (v1)** Each password is shown in a monospace font under the prompt "How many times has this password appeared in data breaches?"
- **R8 (v1)** Guess input is a log-scale slider from 0 to 100,000,000 with a dedicated 0 stop, plus a number box kept in sync with it. The box accepts plain numbers, commas, and k/m shorthand ("2.5m"). Guesses are whole numbers from 0 to 100,000,000.
- **R9 (v1)** Pressing "Lock in" reveals, for that password: the actual count, the player's guess, points earned, the tier label, and the reveal note. Then "Next password" or, after the fifth, "See results".
- **R10 (v1)** Scoring per password: `d = |log10(guess + 1) - log10(actual + 1)|`, `score = round(100 * e^(-(d / K)^2))`, with `K = 1.25` stored as a single config value.
- **R11 (v1)** Tier per password, by score: Uncrackable 90 to 100, Strong 70 to 89, Medium 40 to 69, Weak 10 to 39, Pwned 0 to 9. The daily tier uses the same bands on the average score.
- **R12 (v1)** The end screen shows the total out of 500, the daily tier, a per-password breakdown (password, count, guess, points), the share button and the Buy Me a Coffee link.

## 3. Answer handling
- **R13 (v1)** The client receives the day's 5 passwords up front, but no counts or notes.
- **R14 (v1)** Locking in sends `{date, index, guess}` to the API, which returns that password's count, score, tier and note. The API is stateless.
- **R15 (v1)** Re-submitting a different guess for an already locked-in password in the same browser is blocked client-side. Server-side prevention is not required (D7).

## 4. Persistence and stats
- **R16 (v1)** Game progress is saved in localStorage, so a refresh resumes mid-puzzle with earlier reveals intact.
- **R17 (v1)** Stats: games played, average daily score, best daily score, current and max streak (consecutive days played), and a distribution of daily tiers.
- **R18 (v1)** Archive games are excluded from streaks and stats.

## 5. Sharing
- **R19 (v1)** The share text contains no passwords or counts, in this format:
  ```
  Pwnedle #12 · 390/500 · Strong
  🟩🟨🟩🟧🟩
  pwnedle.vercel.app
  ```
  Squares per password: 🟩 Uncrackable or Strong, 🟨 Medium, 🟧 Weak, 🟥 Pwned. Shared via clipboard or the native share sheet.

## 6. Archive
- **R20 (v1)** A free archive of every past puzzle, selectable by puzzle number or date. Future puzzles are never listed.

## 7. Site
- **R21 (v1)** How-to-play modal on first visit, with a worked example.
- **R22 (v1)** A permanent note in the footer and how-to-play: "Pwnedle will never ask for your passwords. Don't type real passwords into any website to test them."
- **R23 (v1)** Buy Me a Coffee link in the footer and on the end screen. No payment integration.
- **R24 (v1)** About page crediting Have I Been Pwned's Pwned Passwords (with a link) and any public password lists used, and stating that Pwnedle is not affiliated with or endorsed by HIBP.
- **R25 (v1)** Mobile-first. No signup, no ads. Tier colours are colourblind-safe and always paired with a text label.
- **R26 (v1)** Open Graph image and description for link previews.
- **R27 (v1)** Cookie-free, privacy-friendly analytics: page views, puzzle starts and completions only.

## 8. Puzzle pipeline (local scripts)
- **R28 (v1)** Candidate generation from two sources:
  - seed lists kept in the repo (words, first names, sports teams, keyboard patterns, phrases), expanded with variations: capitalisation, appended digits and years, a trailing "!", and common letter swaps (a→@, o→0, e→3, s→$);
  - public common-password lists (SecLists).
- **R29 (v1)** Counts are looked up through the Pwned Passwords range API: only the first 5 characters of each SHA-1 hash are sent, with the padding header enabled. Results are cached locally to avoid repeat lookups.
- **R30 (v1)** Content filter, applied before selection:
  - drop anything matching a blocklist of profanity, slurs, sexual terms and drug terms;
  - drop anything that looks like personal data: email addresses, phone numbers, digit strings longer than 8, or full names in "first last" form.
- **R31 (v1)** Selection builds puzzles that satisfy R3 and R5, checking against every previously published puzzle.
- **R32 (v1)** Reveal notes are drafted by the Claude API: at most 2 sentences and 200 characters each, explaining why the count is high or low. Notes must not name specific breaches or make claims that can't be checked.
- **R33 (v1)** `pipeline:generate` writes `data/puzzles/YYYY-MM-DD.json` with `"status": "draft"` for any of the next 14 days that has no file yet. Harry can edit, swap or delete passwords and notes, then set `"status": "approved"` and commit. Approval is optional (R36).
- **R34 (v1)** Swapping a password in a draft: `pipeline:replace <date> <index>` fetches a new candidate that keeps R3 and R5 satisfied.
- **R35 (v1)** `pipeline:validate` checks every puzzle file against R3, R5, R30 and the note limits. CI runs it and fails the build on any error. CI also warns when any of the next 7 days is still a draft, as a review reminder.
- **R36 (v1)** The server serves a day's puzzle whether it is approved or still a draft. Drafts have already passed the content filter and validator, so an unreviewed day goes out rather than leaving players stuck.
- **R36a (v1)** A scheduled GitHub Action runs `pipeline:generate` weekly, validates the result and commits it, so drafts always exist 14 days ahead even if Harry forgets. The Claude API key is stored as a GitHub Actions secret. A failed run emails Harry via GitHub's failure notifications. The Action's commits follow the commit format in D17, for example `chore(puzzles): Add drafts to 2026-11-02`.
- **R36b (v1)** Last resort only, if no file exists for today (the Action has failed for two weeks running): show "Today's puzzle is warming up, check back soon" with a link to the archive.
- **R37 (v1)** Counts and notes are frozen once a puzzle's date has passed (D11).

## 9. Later
- **R38 (later)** Event theme days, such as Valentine's or Halloween.
- **R39 (later)** Free unlimited practice mode.
- **R40 (later)** Contact Troy Hunt / HIBP once there are regular players.

// D22: puzzle #1 is on this UTC date. Provisional until T22 confirms it.
export const LAUNCH_DATE = "2026-10-20";
// R10/D5: scoring width on the log scale. Tune after playtesting (T23).
export const K = 1.25;
// D39: the live address. Also sets metadataBase and the Umami data-domains host.
export const SITE_URL = "https://pwnedle.com";
// R23/D27/D31: used in the footer.
export const COFFEE_URL = "https://buymeacoffee.com/hahalaa";
// R22: shown in how-to-play.
export const SAFETY_NOTE = "Pwnedle will never ask for your passwords. Don't type real passwords into any website to test them.";
// R27/D32: Umami Cloud site ID. Public: it appears in every page's source.
export const UMAMI_WEBSITE_ID = "6c99dc08-3553-4422-a640-ad15dbd123f7";
// T44: the saved theme, "light" or "dark". Read before first paint in app/layout.tsx and set by app/theme.tsx.
export const THEME_KEY = "pwnedle-theme";

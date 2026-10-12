import Anthropic from "@anthropic-ai/sdk";

// D20: Haiku is enough for one short sentence and costs least per note.
export const MODEL = "claude-haiku-5-5";

// D23: the prompt gets a band, never the count, so the note can't restate it.
export type Band = "never leaked" | "rare" | "common" | "extremely common";
export const band = (count: number): Band =>
  count === 0 ? "never leaked" : count < 1_000 ? "rare" : count < 100_000 ? "common" : "extremely common";

const SYSTEM = `You write the reveal note for a password guessing game. Players guessed how many times a password appears in Have I Been Pwned's Pwned Passwords, then see the real count and your note.
You get the password and a band: never leaked, rare, common or extremely common. Write one short sentence, about 12 words, on why this password lands in that band. Be specific to this password: its words, pattern or habit. A note that would fit any password is wrong.
Never name a breach, company, website or person. Never cite numbers, statistics, rankings or dates. If you quote the password, copy its exact case. Never say "attackers", "hackers", "crackers", "cracking", "cracked", "breach corpus" or "reach for". Word each note freshly; avoid stock phrases such as "tacked on", "turns up everywhere" or "without a second thought".
Do not name the band. Reply with the sentence only.`;

const BREACHES = /rockyou|linkedin|adobe|yahoo|myspace|ashley madison|dropbox|collection #?1|canva|zynga|equifax|facebook|anti public|exploit\.in/i;
const STOCK = /\battackers?\b|\bhackers?\b|\bcrack(ers?|ing|ed)\b|\bcybercriminals?\b|\bbreach corpus\b|\breach(es|ed|ing)? for\b/i;
const SAYS_LOW = /\b(very|extremely|hugely|so) (common|popular)\b|\bmillions\b|\bthousands\b|\bone of the most\b|\beveryone\b/i;
const SAYS_HIGH = /\b(rare|rarely|uncommon|obscure|unique)\b|\bnever (leaked|appears|seen|shows up)\b/i;
const CONTRADICTS: Record<Band, RegExp> = {
  "never leaked": SAYS_LOW,
  rare: SAYS_LOW,
  common: new RegExp(`${SAYS_HIGH.source}|\\bmillions\\b`, "i"),
  "extremely common": SAYS_HIGH,
};

// Why a note breaks R32 or D23, or null if it is fine. T9's validator reuses this.
export function noteProblem(note: string, count: number, password: string): string | null {
  if (!note) return "empty";
  if (note.length >= 140) return "140 characters or more";
  if ((note.match(/[.!?]+(\s|$)/g) ?? []).length > 1) return "more than 1 sentence";
  const n = (re: RegExp) => note.match(re)?.length ?? 0;
  if (n(/"/g) % 2 || n(/“/g) !== n(/”/g)) return "unbalanced quotes";
  const quoted = [...note.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1]);
  if (quoted.some((q) => q !== password && q.toLowerCase() === password.toLowerCase())) return "quotes the password in the wrong case";
  if (BREACHES.test(note)) return "names a breach";
  if (/%|\bpercent\b/i.test(note)) return "unverifiable statistic";
  if (STOCK.test(note)) return "stock phrase";
  if (count >= 10 && new RegExp(`\\b${count}\\b`).test(note.replaceAll(",", ""))) return "restates the count";
  if (CONTRADICTS[band(count)].test(note)) return `contradicts band "${band(count)}"`;
  return null;
}

// generate swaps the password on this error; any other error stops the run.
export class NoValidNoteError extends Error {}

type Create = (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

// Drafts a reveal note for one password (R32, D23). Retries when a draft breaks the limits.
// Reads ANTHROPIC_API_KEY from the environment.
export async function draftNote(
  password: string,
  count: number,
  create: Create = (p) => new Anthropic().messages.create(p),
): Promise<string> {
  let problem = "";
  for (let i = 0; i < 3; i++) {
    const res = await create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Password: ${JSON.stringify(password)}\nBand: ${band(count)}` }],
    });
    const note = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    problem = res.stop_reason === "end_turn" ? (noteProblem(note, count, password) ?? "") : `stopped: ${res.stop_reason}`;
    if (!problem) return note;
  }
  throw new NoValidNoteError(`No valid note for a password after 3 tries (last: ${problem})`);
}

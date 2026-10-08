import Anthropic from "@anthropic-ai/sdk";

// D20: Haiku is enough for two short sentences and costs least per note.
export const MODEL = "claude-haiku-5-5";

const SYSTEM = `You write the reveal note for a password guessing game. Players guessed how many times a password appears in Have I Been Pwned's Pwned Passwords, then see the real count and your note.
Write at most 2 short sentences, under 140 characters in total. Never go over 200. Explain why the count is high or low: the pattern, how guessable it is, why people pick it.
Never name a specific breach, company, website or person. Never cite statistics, percentages, rankings or dates. Only say things a reader could check from the password itself.
Reply with the note text only.`;

const BREACHES = /rockyou|linkedin|adobe|yahoo|myspace|ashley madison|dropbox|collection #?1|canva|zynga|equifax|facebook|anti public|exploit\.in/i;

// Why a note breaks R32, or null if it is fine. T9's validator reuses this.
export function noteProblem(note: string): string | null {
  if (!note) return "empty";
  if (note.length > 200) return "over 200 characters";
  if ((note.match(/[.!?]+(\s|$)/g) ?? []).length > 2) return "more than 2 sentences";
  if (BREACHES.test(note)) return "names a breach";
  if (/%|\bpercent\b/i.test(note)) return "unverifiable statistic";
  return null;
}

type Create = (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

// Drafts a reveal note for one password (R32). Retries when a draft breaks the limits.
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
      messages: [{ role: "user", content: `Password: ${JSON.stringify(password)}\nCount: ${count.toLocaleString("en-US")}` }],
    });
    const note = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    problem = res.stop_reason === "end_turn" ? (noteProblem(note) ?? "") : `stopped: ${res.stop_reason}`;
    if (!problem) return note;
  }
  throw new Error(`No valid note for a password after 3 tries (last: ${problem})`);
}

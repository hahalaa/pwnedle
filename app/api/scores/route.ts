import { addDays, utcToday } from "../../../lib/days";
import { MAX_GUESS } from "../../../lib/guess";
import { loadPuzzle } from "../../../lib/puzzles";
import { score } from "../../../lib/scoring";

// T63/D51: how many players got each daily total (0 to 500), per date, and nothing else. Upstash Redis over its REST
// API when the Vercel keys are set; otherwise (dev, tests, previews) an in-memory store that resets with the server.
const memory = new Map<string, Record<string, number>>();

async function upstash(token: string, command: (string | number)[]) {
  const res = await fetch(process.env.KV_REST_API_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.error) throw new Error(`Upstash ${res.status}: ${body?.error}`);
  return body.result;
}

async function add(date: string, total: number) {
  const token = process.env.KV_REST_API_TOKEN;
  if (process.env.KV_REST_API_URL && token) return upstash(token, ["HINCRBY", `scores:${date}`, total, 1]);
  const counts = memory.get(date) ?? {};
  counts[total] = (counts[total] ?? 0) + 1;
  memory.set(date, counts);
}

// GET reads with the read-only token; POST reads back with the write token it just used.
async function read(date: string, token = process.env.KV_REST_API_READ_ONLY_TOKEN): Promise<Record<string, number>> {
  if (!process.env.KV_REST_API_URL || !token) return memory.get(date) ?? {};
  // HGETALL comes back flat: [field, value, field, value, ...], all strings.
  const flat: string[] = await upstash(token, ["HGETALL", `scores:${date}`]);
  const counts: Record<string, number> = {};
  for (let i = 0; i < flat.length; i += 2) counts[flat[i]] = Number(flat[i + 1]);
  return counts;
}

const fail = (e: unknown) => {
  console.error("Score store failed:", (e as Error).message);
  return Response.json({ error: "Unavailable" }, { status: 503 });
};

// Counts one finished daily game and returns the date's counts with it in (T69), so the end screen never waits on the
// cached GET. The total is worked out here from the guesses, never taken from the browser. POSTs aren't cached.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 1000) return Response.json({ error: "Too large" }, { status: 413 });
  let body;
  try {
    body = JSON.parse(text);
  } catch {}
  const { date, guesses } = body ?? {};
  // R8: guesses are whole numbers from 0 to 100,000,000, one per password.
  if (typeof date !== "string" || !Array.isArray(guesses) || guesses.length !== 5 || !guesses.every((g) => Number.isInteger(g) && g >= 0 && g <= MAX_GUESS)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  // loadPuzzle refuses dates outside the window (R2); a daily game can't be older than UTC today-1 in any time zone.
  const puzzle = date >= addDays(utcToday(), -1) ? await loadPuzzle(date) : null;
  if (!puzzle) return Response.json({ error: "Not found" }, { status: 404 });
  const total = puzzle.passwords.reduce((a, e, i) => a + score(guesses[i], e.count), 0);
  try {
    await add(date, total);
    return Response.json({ counts: await read(date, process.env.KV_REST_API_TOKEN) });
  } catch (e) {
    return fail(e);
  }
}

// That date's counts, as { counts: { "<total>": players } }. Archive dates too, for T64. The CDN serves repeat reads
// briefly so they don't use Upstash's monthly commands (T65, T69); errors aren't cached.
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!(await loadPuzzle(date))) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    return Response.json({ counts: await read(date) }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } });
  } catch (e) {
    return fail(e);
  }
}

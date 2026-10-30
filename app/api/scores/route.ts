import { addDays, utcToday } from "../../../lib/days";
import { MAX_GUESS } from "../../../lib/guess";
import { loadPuzzle } from "../../../lib/puzzles";
import { score } from "../../../lib/scoring";

// T63/D51: how many players got each daily total (0 to 500), per date, and nothing else. T72/D53 adds a second hash per
// date: each password's points summed over players, plus its own player count `n`. Upstash Redis over its REST API when
// the Vercel keys are set; otherwise (dev, tests, previews) an in-memory store that resets with the server.
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

async function incr(key: string, field: string | number, by: number) {
  const token = process.env.KV_REST_API_TOKEN;
  if (process.env.KV_REST_API_URL && token) return upstash(token, ["HINCRBY", key, field, by]);
  const hash = memory.get(key) ?? {};
  hash[field] = (hash[field] ?? 0) + by;
  memory.set(key, hash);
}

// GET reads with the read-only token; POST reads back with the write token it just used.
async function hash(key: string, token: string | undefined): Promise<Record<string, number>> {
  if (!process.env.KV_REST_API_URL || !token) return { ...memory.get(key) };
  // HGETALL comes back flat: [field, value, field, value, ...], all strings.
  const flat: string[] = await upstash(token, ["HGETALL", key]);
  const out: Record<string, number> = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = Number(flat[i + 1]);
  return out;
}

// Days before T72 have no points, so averages divide by the points hash's own `n` and only show from 10 players (D53).
async function read(date: string, token = process.env.KV_REST_API_READ_ONLY_TOKEN) {
  const [counts, points] = await Promise.all([hash(`scores:${date}`, token), hash(`points:${date}`, token)]);
  const averages = points.n >= 10 ? [0, 1, 2, 3, 4].map((i) => Math.round((10 * (points[i] ?? 0)) / points.n) / 10) : undefined;
  return { counts, averages };
}

const fail = (e: unknown) => {
  console.error("Score store failed:", (e as Error).message);
  return Response.json({ error: "Unavailable" }, { status: 503 });
};

// Counts one finished daily game and returns the date's counts and averages with it in (T69), so the end screen never
// waits on the cached GET. The total is worked out here from the guesses, never taken from the browser. POSTs aren't cached.
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
  const points = puzzle.passwords.map((e, i) => score(guesses[i], e.count));
  const total = points.reduce((a, p) => a + p, 0);
  try {
    await Promise.all([incr(`scores:${date}`, total, 1), incr(`points:${date}`, "n", 1), ...points.map((p, i) => incr(`points:${date}`, i, p))]);
    return Response.json(await read(date, process.env.KV_REST_API_TOKEN));
  } catch (e) {
    return fail(e);
  }
}

// That date's counts, as { counts: { "<total>": players }, averages?: [points per password] }. Archive dates too, for
// T64. The CDN serves repeat reads briefly so they don't use Upstash's monthly commands (T65, T69); errors aren't cached.
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!(await loadPuzzle(date))) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    return Response.json(await read(date), { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } });
  } catch (e) {
    return fail(e);
  }
}

// T34/D35: one short square-wave tune per tier, built with the Web Audio API so there are no audio files.
// Notes in Hz, then the length of each note in seconds. Higher tiers climb, lower tiers fall.
export const TUNES: Record<string, [number[], number]> = {
  Uncrackable: [[523, 659, 784, 1047], 0.07],
  Strong: [[659, 784], 0.08],
  Medium: [[440], 0.1],
  Weak: [[330, 262], 0.1],
  Pwned: [[196, 165, 131], 0.13],
};

// Outside the `pwnedle:<date>` prefix so savedGames() never reads it.
export const MUTED_KEY = "pwnedle-muted";

// localStorage can throw when storage is blocked; then sound stays on and the toggle lasts until a refresh.
export function isMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "");
  } catch {}
}

let ctx: AudioContext | undefined;

// Callers check isMuted() first, so the dev preview below can play while muted.
export function playTier(tier: string) {
  const tune = TUNES[tier];
  if (!tune || typeof AudioContext === "undefined") return;
  ctx ??= new AudioContext();
  const [notes, step] = tune;
  const start = ctx.currentTime;
  const end = start + notes.length * step;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  notes.forEach((f, i) => osc.frequency.setValueAtTime(f, start + i * step));
  // Square waves are loud; keep it quiet and ramp the last 20ms down so it ends without a click.
  gain.gain.setValueAtTime(0.05, start);
  gain.gain.setValueAtTime(0.05, end - 0.02);
  gain.gain.linearRampToValueAtTime(0, end);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(end);
}

// Dev only: `pwnedleSounds()` in the browser console plays every tier, best first. Next inlines NODE_ENV,
// so production builds drop this block.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as { pwnedleSounds?: () => void }).pwnedleSounds = () =>
    Object.keys(TUNES).forEach((t, i) => setTimeout(() => playTier(t), i * 700));
}

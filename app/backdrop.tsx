"use client";

import { useEffect, useRef } from "react";
import { current } from "./theme";

// T49 (D47): faint columns of SHA-1 hex pairs drift behind the page, a nod to how Pwned Passwords lookups work.
const SIZE = 13; // row height; the font is 2px smaller
const PITCH = 34; // space between column slots
const GLYPH = 14; // width of one hex pair
const GAP = 24; // kept clear on each side of the content column on desktop
const PHONE = 640; // Tailwind's sm breakpoint
const FRAME = 1000 / 24; // the drift is slow, so at most 24 fps (20 on a 60 Hz screen) is plenty

type Box = { left: number; right: number };
type Column = { x: number; speed: number; fade: number; phase: number; text: string[]; words?: Record<string, string[]> };
type Flake = { x: number; y: number; speed: number; sway: number; phase: number };
type Burst = { x: number; y: number; r: number; phase: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pair = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0");

// T58a, T60: on theme days some columns swap in a copy of their pairs with a hex word every 5 to 9 rows, now and then
// a pair of words one over the other: DEAD over BEEF, FA1A over 1A1A for "fa la la", or DEC31 over 0101 (T61).
export const WORDS = {
  halloween: { words: ["B00", "DEAD", "BAD", "0DD", "FADE"], pair: ["DEAD", "BEEF"] },
  christmas: { words: ["DEC25", "C0C0A", "BE11", "C0A1"], pair: ["FA1A", "1A1A"] },
  newyear: { words: ["2027", "C0FFEE", "CAFE"], pair: ["DEC31", "0101"] },
};
export function spell(text: string[], { words, pair }: (typeof WORDS)[keyof typeof WORDS]) {
  const out = [...text];
  for (let i = Math.floor(rand(0, 5)); i < out.length - 1; i += Math.floor(rand(5, 10))) {
    if (Math.random() < 0.15) out.splice(i, 2, ...pair);
    else out[i] = words[Math.floor(Math.random() * words.length)];
  }
  return out;
}

// Where glyphs may go: the margins on desktop, the whole width on phones.
const regions = (width: number, content: Box) => (width < PHONE ? [[0, width]] : [[0, content.left - GAP], [content.right + GAP, width]]);

// About a third of the slots in each margin, evenly spaced so neither side comes out empty. Phones have no margins,
// so their columns run across the whole width. Fades are spread out so about half the columns show at any moment.
// About one column in six, at least one, gets theme words, starting from a random column so it isn't always the
// same slot.
export function pickColumns(width: number, content: Box, rows: number): Column[] {
  const columns = regions(width, content).flatMap(([from, to]) => {
    const slots = Math.floor((to - from - GLYPH) / PITCH) + 1;
    if (slots < 1) return [];
    const inset = (to - from - GLYPH - (slots - 1) * PITCH) / 2;
    const xs: number[] = [];
    for (let i = Math.floor(Math.random() * Math.min(3, slots)); i < slots; i += 3) xs.push(from + inset + i * PITCH);
    return xs.map((x, k): Column => ({
      x,
      speed: rand(4, 12) * (Math.random() < 0.5 ? -1 : 1),
      fade: rand(0.15, 0.35),
      phase: ((k + Math.random() / 2) / xs.length) * 2 * Math.PI,
      text: Array.from({ length: rows }, pair),
    }));
  });
  const start = Math.floor(Math.random() * Math.min(6, columns.length));
  for (let i = start; i < columns.length; i += 6) {
    columns[i].words = Object.fromEntries(Object.entries(WORDS).map(([event, set]) => [event, spell(columns[i].text, set)]));
  }
  return columns;
}

// T60: light snow for Christmas days, about one flake per 12,000px² in the same places as the columns. Each flake
// falls at 8 to 20px a second and sways up to 6px. `y` is a fraction of the height, so a resize keeps the spread.
const SWAY = 6;
export function pickFlakes(width: number, content: Box, height: number): Flake[] {
  return regions(width, content).flatMap(([from, to]) => {
    if (to - from < 2 * SWAY + GLYPH) return [];
    return Array.from({ length: Math.round(((to - from) * height) / 12000) }, () => ({
      x: rand(from + SWAY + GLYPH / 2, to - SWAY - GLYPH / 2),
      y: Math.random(),
      speed: rand(8, 20),
      sway: rand(2, SWAY),
      phase: rand(0, 2 * Math.PI),
    }));
  });
}

// T61: small firework bursts for New Year days, about one per 40,000px² in the same places as the columns. They stay
// put and fade in and out. `y` is a fraction of the height, so a resize keeps the spread.
const BURST = 9;
export function pickBursts(width: number, content: Box, height: number): Burst[] {
  return regions(width, content).flatMap(([from, to]) => {
    if (to - from < 2 * BURST) return [];
    return Array.from({ length: Math.round(((to - from) * height) / 40000) }, () => ({
      x: rand(from + BURST, to - BURST),
      y: Math.random(),
      r: rand(5, BURST),
      phase: rand(0, 2 * Math.PI),
    }));
  });
}

export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    const content = document.querySelector("main > div");
    if (!ctx || !content) return;
    // Reduced motion gets one still frame, redrawn only when the window size or theme changes.
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scheme = matchMedia("(prefers-color-scheme: light)");
    // Enough pairs for the tallest the screen can get, so a phone's toolbar hiding doesn't reshuffle the columns.
    const textRows = Math.ceil(Math.max(innerHeight, screen.height) / SIZE) + 2;
    let columns: Column[] = [];
    let flakes: Flake[] = [];
    let bursts: Burst[] = [];
    let picked = "";
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = -Infinity;

    const layout = () => {
      if (innerWidth !== w || innerHeight !== h) {
        w = innerWidth;
        h = innerHeight;
        canvas.width = w * devicePixelRatio;
        canvas.height = h * devicePixelRatio;
      }
      const box = content.getBoundingClientRect();
      const key = `${w} ${box.left} ${box.right}`;
      if (key !== picked) {
        picked = key;
        columns = pickColumns(w, box, textRows);
        flakes = pickFlakes(w, box, h);
        bursts = pickBursts(w, box, h);
      }
    };

    const paint = (s: number) => {
      const style = getComputedStyle(canvas);
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${SIZE - 2}px ${style.fontFamily}`;
      ctx.textBaseline = "top";
      // Centred on the slot, so a four-letter word overhangs a pair evenly on both sides.
      ctx.textAlign = "center";
      const advance = ctx.measureText("0").width;
      // On theme days the variants set --event, and tint the colour (T58a) or set two tints in `fill` and `stroke`,
      // which the canvas doesn't otherwise use: green and red for Christmas (T60), gold and silver for New Year (T61).
      // Computed styles give them as plain rgb.
      const event = style.getPropertyValue("--event").trim();
      const christmas = event === "christmas";
      const newyear = event === "newyear";
      // Faint on phones, where the columns run behind the content. 28% keeps the light theme's muted text at 4.5:1;
      // red text can dip to about 4.0 to 4.3:1 for a moment (D47).
      const strength = w >= PHONE ? 1 : current() === "light" ? 0.28 : 0.45;
      for (const [k, c] of columns.entries()) {
        ctx.fillStyle = christmas || newyear ? (k % 2 ? style.stroke : style.fill) : style.color;
        ctx.globalAlpha = ((Math.sin(s * c.fade + c.phase) + 1) / 2) * strength;
        const scroll = s * c.speed;
        const off = ((scroll % SIZE) + SIZE) % SIZE;
        const shift = Math.floor(scroll / SIZE);
        const text = c.words?.[event] ?? c.text;
        const n = text.length;
        for (let i = 0, top = off - SIZE; top < h; i++, top += SIZE) {
          const t = text[(((i - shift) % n) + n) % n];
          // A long word in an edge column would run off the screen (C0FFEE), so it shifts in to fit.
          const half = (t.length * advance) / 2;
          ctx.fillText(t, Math.min(Math.max(c.x + GLYPH / 2, half), w - half), top + 1);
        }
      }
      if (christmas) {
        ctx.fillStyle = style.color;
        ctx.globalAlpha = strength;
        for (const f of flakes) {
          ctx.fillText("*", f.x + Math.sin(s * 0.6 + f.phase) * f.sway, ((f.y * (h + SIZE) + s * f.speed) % (h + SIZE)) - SIZE);
        }
      }
      if (newyear) {
        // Eight 1px rays from 40% of the radius out, like the burst on the password window.
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 1;
        for (const b of bursts) {
          ctx.globalAlpha = ((Math.sin(s * 0.5 + b.phase) + 1) / 2) * strength;
          const y = BURST + b.y * (h - 2 * BURST);
          ctx.beginPath();
          for (let a = 0; a < 8; a++) {
            const [dx, dy] = [Math.cos((a * Math.PI) / 4), Math.sin((a * Math.PI) / 4)];
            ctx.moveTo(b.x + dx * b.r * 0.4, y + dy * b.r * 0.4);
            ctx.lineTo(b.x + dx * b.r, y + dy * b.r);
          }
          ctx.stroke();
        }
      }
    };

    // requestAnimationFrame doesn't run while the tab is hidden, so the loop pauses there by itself.
    const frame = (now: number) => {
      raf = still ? 0 : requestAnimationFrame(frame);
      if (!still && now - last < FRAME) return;
      last = now;
      paint(still ? 0 : now / 1000);
    };
    // Resizing clears the canvas, so the next frame paints at once instead of waiting for the cap.
    const invalidate = () => {
      layout();
      last = -Infinity;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    invalidate();

    // The still frame needs a redraw when the theme toggle or the system theme changes the colour.
    const theme = new MutationObserver(invalidate);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // The still frame also redraws when navigating to or from a theme day changes the page (T58a).
    if (still) theme.observe(content, { childList: true, subtree: true, attributeFilter: ["style"] });
    scheme.addEventListener("change", invalidate);
    addEventListener("resize", invalidate);
    return () => {
      cancelAnimationFrame(raf);
      theme.disconnect();
      scheme.removeEventListener("change", invalidate);
      removeEventListener("resize", invalidate);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 size-full text-line halloween:text-pumpkin-line halloween:[--event:halloween] christmas:fill-holly-line christmas:stroke-berry-line christmas:[--event:christmas] newyear:fill-gold-line newyear:stroke-silver-line newyear:[--event:newyear]" />;
}

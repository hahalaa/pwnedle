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
type Column = { x: number; speed: number; fade: number; phase: number; text: string[]; words?: string[] };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pair = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0");

// T58a: on Halloween days some columns swap in a copy of their pairs with a hex word every 5 to 9 rows, now and then
// DEAD over BEEF.
const WORDS = ["B00", "DEAD", "BAD", "0DD", "FADE"];
export function haunt(text: string[]) {
  const out = [...text];
  for (let i = Math.floor(rand(0, 5)); i < out.length - 1; i += Math.floor(rand(5, 10))) {
    if (Math.random() < 0.15) out.splice(i, 2, "DEAD", "BEEF");
    else out[i] = WORDS[Math.floor(Math.random() * WORDS.length)];
  }
  return out;
}

// About a third of the slots in each margin, evenly spaced so neither side comes out empty. Phones have no margins,
// so their columns run across the whole width. Fades are spread out so about half the columns show at any moment.
// About one column in six, at least one, gets Halloween words, starting from a random column so it isn't always the
// same slot.
export function pickColumns(width: number, content: Box, rows: number): Column[] {
  const regions = width < PHONE ? [[0, width]] : [[0, content.left - GAP], [content.right + GAP, width]];
  const columns = regions.flatMap(([from, to]) => {
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
  for (let i = start; i < columns.length; i += 6) columns[i].words = haunt(columns[i].text);
  return columns;
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
      // On Halloween days the `halloween` variant tints the colour and sets --haunted (T58a).
      ctx.fillStyle = style.color;
      const halloween = style.getPropertyValue("--haunted");
      // Faint on phones, where the columns run behind the content. 28% keeps the light theme's muted text at 4.5:1;
      // red text can dip to about 4.0 to 4.3:1 for a moment (D47).
      const strength = w >= PHONE ? 1 : current() === "light" ? 0.28 : 0.45;
      for (const c of columns) {
        ctx.globalAlpha = ((Math.sin(s * c.fade + c.phase) + 1) / 2) * strength;
        const scroll = s * c.speed;
        const off = ((scroll % SIZE) + SIZE) % SIZE;
        const shift = Math.floor(scroll / SIZE);
        const text = (halloween && c.words) || c.text;
        const n = text.length;
        for (let i = 0, top = off - SIZE; top < h; i++, top += SIZE) {
          ctx.fillText(text[(((i - shift) % n) + n) % n], c.x + GLYPH / 2, top + 1);
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
    // The still frame also redraws when navigating to or from a Halloween day changes the page (T58a).
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

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 size-full text-line halloween:text-pumpkin-line halloween:[--haunted:1]" />;
}

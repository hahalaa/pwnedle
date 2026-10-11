import type { ReactNode } from "react";

// T37: header nav items are words from `sm` up and 1px line icons below it, so the nav fits on a phone (D25).
// The item itself carries the aria-label; `label` (the word by default) repeats it as the icon's hover tooltip,
// so desktop words get none.
// Icons are drawn on a 24px grid with their outer lines on the 3.5 to 20.5 box, so they line up and match in size.
export function NavLabel({ text, label = text, children }: { text: string; label?: string; children: ReactNode }) {
  return (
    <>
      <span className="max-sm:hidden">{text}</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="square"
        // Above the .tap layer, which would otherwise take the hover and hide the tooltip.
        className="relative z-10 block size-6 sm:hidden"
      >
        <title>{label}</title>
        {children}
      </svg>
    </>
  );
}

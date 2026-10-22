// T58/D49: carved pumpkins for Halloween, in 1px lines like the nav icons (D25, D36). Decorative, so hidden from
// screen readers. Drawn 20 units tall, so at 20px (h-5) and the base root size each line is 1px.
const carved = (
  <>
    <path d="M12 5.5V3.5l1.5-1.5" />
    <ellipse cx="12" cy="12.5" rx="9.5" ry="7" />
    <path d="M8.5 6C6 8.5 6 16.5 8.5 19M15.5 6c2.5 2.5 2.5 10.5 0 13" />
    <path d="M8.5 11.5l1.5-2.5 1.5 2.5zM12.5 11.5l1.5-2.5 1.5 2.5zM8 14.5l1.5 1 1.25-1 1.25 1 1.25-1 1.25 1 1.5-1q-4 4-8 0z" />
  </>
);

export const svg = { "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1, strokeLinejoin: "round" } as const;

// One small pumpkin, for the archive list.
export function Pumpkin() {
  return (
    <svg {...svg} viewBox="0 0 24 20" className="h-4">
      {carved}
    </svg>
  );
}

// The password window's Halloween dressing: a big and a small pumpkin perched on its top edge at the right (the small
// one scaled to three quarters with its stroke widened to match, so both keep 1px lines), and a cobweb in the top-left
// bracket corner, clear of the title bar text. `data-event` themes the header and background through the `halloween`
// variant in app/globals.css (T58a).
export function Halloween() {
  return (
    <span data-event="halloween" className="contents">
      <svg {...svg} viewBox="0 0 44 20" className="absolute right-4 bottom-full h-5 text-ash">
        {carved}
        <g transform="translate(25 5) scale(0.75)" strokeWidth={4 / 3}>
          {carved}
        </g>
      </svg>
      <svg {...svg} viewBox="0 0 17 17" className="absolute -top-(--bracket) -left-(--bracket) size-[1.0625rem] text-ash">
        <path d="M.5 .5L16.5 6.3M.5 .5L12.5 12.5M.5 .5L6.3 16.5M5 .5Q4.2 1.2 4.7 2Q3.6 2.5 3.7 3.7Q2.5 3.6 2 4.7Q1.2 4.2 .5 5M9 .5Q7.5 1.7 8.5 3.4Q6.4 4.3 6.5 6.5Q4.3 6.4 3.4 8.5Q1.7 7.5 .5 9M13 .5Q10.8 2.3 12.2 4.8Q9.2 6.1 9.3 9.3Q6.1 9.2 4.8 12.2Q2.3 10.8 .5 13" />
      </svg>
    </span>
  );
}

// The laptop lid's centre in each tier drawing, as a percentage across the 60px box, measured from public/art.
const LID: Record<string, number> = { Pwned: 49, Weak: 52, Mid: 52, Strong: 49, Uncrackable: 48 };

// A carved-pumpkin sticker on the laptop lid of the end screen's tier drawing: a solid shape with the face cut out.
export function Sticker({ tier }: { tier: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 20" fill="currentColor" className="absolute top-[83%] h-2.5 -translate-1/2 -rotate-8" style={{ left: `${LID[tier]}%` }}>
      <path d="M11.25 2.5h1.5v3.5h-1.5z" />
      <path fillRule="evenodd" d="M2.5 12.5a9.5 7 0 1 0 19 0a9.5 7 0 1 0-19 0zM8.5 11.5l1.5-2.5 1.5 2.5zM12.5 11.5l1.5-2.5 1.5 2.5zM8 14.5l1.5 1 1.25-1 1.25 1 1.25-1 1.25 1 1.5-1q-4 4-8 0z" />
    </svg>
  );
}

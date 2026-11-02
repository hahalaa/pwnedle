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

// T60: on Christmas days a line tree and a wrapped present sit where the pumpkins go, at the same size. `data-event`
// themes the background and header through the `christmas` variant.
export function Christmas() {
  return (
    <span data-event="christmas" className="contents">
      <svg {...svg} viewBox="0 0 44 20" className="absolute right-4 bottom-full h-5 text-ash">
        <path d="M10 .5v3M8.5 2h3M10 3.5L5 8.5h2.5L3.5 13.5h3L2.5 17.5h15l-4-4h3l-4-5H15zM8.5 17.5v2h3v-2" />
        <path d="M25.5 10.5h13v9h-13zM24.5 8.5h15v2h-15zM32 8.5v11M32 8.5c-1.5-3-5-3.5-4-1.25S32 8.5 32 8.5c1.5-3 5-3.5 4-1.25S32 8.5 32 8.5" />
      </svg>
    </span>
  );
}

// T61: on New Year days a firework burst and two clinking champagne flutes sit in the same place. Each flute leans 12°
// from its base, so their rims touch.
const flute = <path d="M1.5 .5h5l-.5 6.5a2 2 0 0 1-4 0zM4 9v10.5M1.5 19.5h5" />;
export function NewYear() {
  return (
    <span data-event="newyear" className="contents">
      <svg {...svg} viewBox="0 0 44 20" className="absolute right-4 bottom-full h-5 text-ash">
        <path d="M12 8h4M6 8H2M9 5V1M9 11v3M11.1 5.9l2.8-2.8M6.9 5.9L4.1 3.1M11.1 10.1l2.8 2.8M6.9 10.1l-2.8 2.8M9 16.5v1M9 19v.5" />
        <g transform="translate(23 0) rotate(12 4 19.5)">{flute}</g>
        <g transform="translate(35 0) rotate(-12 4 19.5)">{flute}</g>
      </svg>
    </span>
  );
}

// The laptop lid's centre in each tier drawing, as a percentage across the 60px box, measured from public/art.
const LID: Record<string, number> = { Pwned: 49, Weak: 52, Mid: 52, Strong: 49, Uncrackable: 48 };

// A sticker on the laptop lid of the end screen's tier drawing, in solid shapes: a carved pumpkin with its face cut
// out, a Santa hat with a gap between the hat and its brim (T60), or a party hat with a stripe cut out and a pompom (T61).
const STICKERS: Record<string, React.ReactNode> = {
  halloween: (
    <>
      <path d="M11.25 2.5h1.5v3.5h-1.5z" />
      <path fillRule="evenodd" d="M2.5 12.5a9.5 7 0 1 0 19 0a9.5 7 0 1 0-19 0zM8.5 11.5l1.5-2.5 1.5 2.5zM12.5 11.5l1.5-2.5 1.5 2.5zM8 14.5l1.5 1 1.25-1 1.25 1 1.25-1 1.25 1 1.5-1q-4 4-8 0z" />
    </>
  ),
  christmas: (
    <>
      <path d="M4 13C4 6 9 2 14 2c4 0 7 3 7.5 6.5L19 9c-.5-2-2-3-3-2-1 1.5 0 4 1 6z" />
      <circle cx="21" cy="11.5" r="2.5" />
      <rect x="2" y="15" width="17" height="4.5" rx="2.25" />
    </>
  ),
  newyear: (
    <>
      <path fillRule="evenodd" d="M12 5L5.5 19.5h13zM9.31 11h5.38l.9 2H8.41z" />
      <circle cx="12" cy="3" r="2.5" />
    </>
  ),
};

export function Sticker({ tier, theme }: { tier: string; theme: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 20" fill="currentColor" className="absolute top-[83%] h-2.5 -translate-1/2 -rotate-8" style={{ left: `${LID[tier]}%` }}>
      {STICKERS[theme]}
    </svg>
  );
}

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

const svg = { "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1, strokeLinejoin: "round" } as const;

// One small pumpkin, for the archive list.
export function Pumpkin() {
  return (
    <svg {...svg} viewBox="0 0 24 20" className="h-4">
      {carved}
    </svg>
  );
}

// A big and a small pumpkin side by side, perched on the top edge of the password window. The small one is scaled to
// three quarters with its stroke widened to match, so both keep 1px lines.
export function Pumpkins() {
  return (
    <svg {...svg} viewBox="0 0 44 20" className="absolute right-4 bottom-full h-5 text-ash">
      {carved}
      <g transform="translate(25 5) scale(0.75)" strokeWidth={4 / 3}>
        {carved}
      </g>
    </svg>
  );
}

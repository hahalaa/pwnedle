// Dates are YYYY-MM-DD strings (R2).
export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export const utcToday = () => new Date().toISOString().slice(0, 10);

// Today in an IANA time zone, or the runtime's own zone when none is given. An unknown zone falls back to UTC.
export function zoneToday(timeZone?: string) {
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  } catch {
    return utcToday();
  }
}

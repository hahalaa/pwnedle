// Dates are YYYY-MM-DD strings in UTC (R2).
export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export const utcToday = () => new Date().toISOString().slice(0, 10);

import { expect, test } from "vitest";
import { WORDS, pickColumns, pickFlakes, spell } from "./backdrop";

const content = { left: 360, right: 1560 };

test("on desktop the hash columns stay in the margins, evenly split, about a third of the slots (T49)", () => {
  for (let run = 0; run < 50; run++) {
    const columns = pickColumns(1920, content, 90);
    const left = columns.filter((c) => c.x + 14 <= content.left - 24);
    const right = columns.filter((c) => c.x >= content.right + 24);
    expect(left.length + right.length).toBe(columns.length);
    // Each 336px margin has 10 slots, so 3 or 4 columns.
    for (const side of [left, right]) expect(side.length).toBeGreaterThanOrEqual(3);
    for (const side of [left, right]) expect(side.length).toBeLessThanOrEqual(4);
  }
});

test("on phones the columns run across the whole width (T49)", () => {
  const columns = pickColumns(390, { left: 16, right: 374 }, 70);
  expect(columns.length).toBe(4);
  for (const c of columns) expect(c.x >= 0 && c.x + 14 <= 390).toBe(true);
});

test("about one column in six gets theme copies with hex words, at least one, in a random slot (T58a, T60)", () => {
  const slots = new Set<number>();
  for (let run = 0; run < 50; run++) {
    // 6 to 8 desktop columns give one or two word columns, six apart.
    const columns = pickColumns(1920, content, 90);
    const haunted = columns.flatMap((c, i) => (c.words ? [i] : []));
    expect(haunted.length).toBeGreaterThanOrEqual(1);
    expect(haunted.length).toBeLessThanOrEqual(2);
    if (haunted.length === 2) expect(haunted[1] - haunted[0]).toBe(6);
    slots.add(haunted[0]);
    // A phone's 4 columns get exactly one.
    const phone = pickColumns(390, { left: 16, right: 374 }, 70).filter((c) => c.words);
    expect(phone).toHaveLength(1);
    expect(phone[0].words?.halloween).toHaveLength(70);
    expect(phone[0].words?.christmas).toHaveLength(70);
  }
  expect(slots.size).toBeGreaterThan(1);
});

test("spell keeps the column length and swaps in a theme word every 5 to 9 rows, the pair always in order (T58a, T60)", () => {
  for (const set of Object.values(WORDS)) {
    for (let run = 0; run < 50; run++) {
      const text = Array.from({ length: 90 }, () => "00");
      const out = spell(text, set);
      expect(out).toHaveLength(90);
      expect(text.every((t) => t === "00")).toBe(true);
      const rows = out.flatMap((t, i) => (t === "00" || (t === set.pair[1] && i > 0) ? [] : [i]));
      expect(rows[0]).toBeLessThan(5);
      for (let k = 1; k < rows.length; k++) expect(rows[k] - rows[k - 1]).toBeGreaterThanOrEqual(5);
      for (let k = 1; k < rows.length; k++) expect(rows[k] - rows[k - 1]).toBeLessThanOrEqual(9);
      for (const t of out) expect(["00", ...set.words, ...set.pair]).toContain(t);
      for (const t of out) expect(t).toMatch(/^[0-9A-F]+$/);
      for (const [i, t] of out.entries()) if (t === set.pair[1]) expect(out[i - 1]).toBe(set.pair[0]);
    }
  }
});

test("snow stays in the margins on desktop and covers phones, about one flake per 12,000px² (T60)", () => {
  const desktop = pickFlakes(1920, content, 800);
  // Two 336px margins by 800px.
  expect(desktop).toHaveLength(2 * Math.round((336 * 800) / 12000));
  for (const f of desktop) expect(f.x - f.sway - 7 >= 0 && f.x + f.sway + 7 <= 336 || f.x - f.sway - 7 >= 1584 && f.x + f.sway + 7 <= 1920).toBe(true);
  const phone = pickFlakes(390, { left: 16, right: 374 }, 844);
  expect(phone).toHaveLength(Math.round((390 * 844) / 12000));
  for (const f of phone) expect(f.y >= 0 && f.y < 1).toBe(true);
});

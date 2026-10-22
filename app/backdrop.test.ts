import { expect, test } from "vitest";
import { haunt, pickColumns } from "./backdrop";

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

test("about one column in six gets a Halloween copy with hex words, at least one, in a random slot (T58a)", () => {
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
    expect(phone[0].words).toHaveLength(70);
  }
  expect(slots.size).toBeGreaterThan(1);
});

test("haunt keeps the column length and swaps in a word every 5 to 9 rows, DEAD always over BEEF (T58a)", () => {
  for (let run = 0; run < 50; run++) {
    const text = Array.from({ length: 90 }, () => "00");
    const out = haunt(text);
    expect(out).toHaveLength(90);
    expect(text.every((t) => t === "00")).toBe(true);
    const rows = out.flatMap((t, i) => (t === "00" || t === "BEEF" ? [] : [i]));
    expect(rows[0]).toBeLessThan(5);
    for (let k = 1; k < rows.length; k++) expect(rows[k] - rows[k - 1]).toBeGreaterThanOrEqual(5);
    for (let k = 1; k < rows.length; k++) expect(rows[k] - rows[k - 1]).toBeLessThanOrEqual(9);
    for (const [i, t] of out.entries()) {
      expect(["00", "B00", "DEAD", "BAD", "0DD", "FADE", "BEEF"]).toContain(t);
      if (t === "BEEF") expect(out[i - 1]).toBe("DEAD");
    }
  }
});

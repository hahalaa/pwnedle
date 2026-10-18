import { expect, test } from "vitest";
import { pickColumns } from "./backdrop";

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

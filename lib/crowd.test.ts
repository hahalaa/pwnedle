import { expect, test } from "vitest";
import { crowd, crowdLine } from "./crowd";

test("a sent daily game is taken out of the others once, and better than counts strictly lower totals", () => {
  // 10 players: this one at 300 plus 2 more at 300, 4 below, 3 above.
  const c = crowd({ "300": 3, "100": 4, "450": 3 }, 300, true);
  expect(c.players).toBe(10);
  // 4 of the 9 others are lower; the 2 others at 300 are not.
  expect(c.lower).toBe(4);
  expect(crowdLine(c)).toBe("Better than 44% of today's players");
  expect(c.bins[12]).toBe(3);
  expect(c.bins[4]).toBe(4);
  expect(c.bins[18]).toBe(3);
  expect(c.tiers).toEqual([["Uncrackable", 30], ["Strong", 0], ["Mid", 30], ["Weak", 40], ["Pwned", 0]]);
});

test("a sent game missing from the counts still shows once", () => {
  const c = crowd({ "100": 9 }, 300, true);
  expect(c.players).toBe(10);
  expect(c.lower).toBe(9);
  expect(c.bins.reduce((a, b) => a + b)).toBe(10);
});

test("an archive game is added to the chart but never to the players it is compared with (T70)", () => {
  const c = crowd({ "300": 10, "100": 10 }, 300, false);
  expect(c.players).toBe(20);
  expect(c.bins[12]).toBe(11);
  expect(c.tiers).toEqual([["Uncrackable", 0], ["Strong", 0], ["Mid", 52], ["Weak", 48], ["Pwned", 0]]);
  expect(c.lower).toBe(10);
  expect(crowdLine(c, true)).toBe("Better than 50% of that day's players");
  expect(crowdLine(crowd({ "1": 1, "400": 2 }, 300, false), true)).toBe("You'd have placed #3 of 4 that day");
  expect(crowd({}, 300, false).players).toBe(0);
  // A daily game opened from the archive was sent, so it can be alone.
  expect(crowdLine(crowd({ "300": 1 }, 300, true), true)).toBe("You were the only player that day");
});

test("under 10 players the line gives a rank, and ties share it (T71)", () => {
  expect(crowdLine(crowd({ "300": 1 }, 300, true))).toBe("You're the first player today");
  expect(crowdLine(crowd({ "300": 1, "20": 2 }, 300, true))).toBe("You placed #1 of 3 so far today");
  expect(crowdLine(crowd({ "300": 1, "400": 1 }, 300, true))).toBe("You placed #2 of 2 so far today");
  // Tied with one other at 300, behind one at 400: both 300s are #2.
  expect(crowdLine(crowd({ "300": 2, "400": 1, "20": 1 }, 300, true))).toBe("You placed #2 of 4 so far today");
  expect(crowdLine(crowd({ "300": 1, "400": 1 }, 300, false), true)).toBe("You'd have placed #2 of 3 that day");
  // A daily game opened from the archive page was sent, and is in the counts once.
  expect(crowdLine(crowd({ "300": 1, "400": 1 }, 300, true), true)).toBe("You placed #2 of 2 that day");
  // 500 goes in the top bar.
  expect(crowd({ "500": 2 }, 500, true).bins[19]).toBe(2);
});

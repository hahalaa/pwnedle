import { expect, test, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { MODEL, NoValidNoteError, band, draftNote, noteProblem } from "./notes";

test("band follows D23 cutoffs", () => {
  expect([0, 1, 999, 1_000, 99_999, 100_000].map(band)).toEqual([
    "never leaked", "rare", "rare", "common", "common", "extremely common",
  ]);
});

test("noteProblem accepts a short plain note", () => {
  expect(noteProblem("A keyboard walk anyone can type without looking.", 5_000_000, "pw")).toBeNull();
  expect(noteProblem("Adding 2024 to a word is a common habit.", 5_000, "pw")).toBeNull();
  expect(noteProblem('"karin" is a short first name, and it\'s often reused.', 5_000, "karin")).toBeNull();
  expect(noteProblem('Capitalising "Password" and adding the year.', 5_000, "Password2025")).toBeNull();
});

test("noteProblem rejects each R32 and D23 break", () => {
  expect(noteProblem("", 5, "pw")).toBe("empty");
  expect(noteProblem("a".repeat(140), 5, "pw")).toBe("140 characters or more");
  expect(noteProblem("One. Two.", 5, "pw")).toBe("more than 1 sentence");
  expect(noteProblem("It leaked in the RockYou dump.", 5, "pw")).toBe("names a breach");
  expect(noteProblem("About 3% of people use it.", 5, "pw")).toBe("unverifiable statistic");
  expect(noteProblem("Attackers try this first.", 5, "pw")).toBe("stock phrase");
  expect(noteProblem("Crackers try this first.", 5, "pw")).toBe("stock phrase");
  expect(noteProblem("Easily cracked by a word list.", 5, "pw")).toBe("stock phrase");
  expect(noteProblem("A cracking favourite.", 5, "pw")).toBe("stock phrase");
  expect(noteProblem("The word people reach for first.", 5, "pw")).toBe("stock phrase");
  expect(noteProblem("The tail everyone reaches for.", 5, "pw")).toBe("stock phrase");
  expect(noteProblem('"Karin" is a short first name."', 5, "pw")).toBe("unbalanced quotes");
  expect(noteProblem("“Karin” is a short first name.”", 5, "pw")).toBe("unbalanced quotes");
  expect(noteProblem('"Volcom" is a surf brand.', 5, "volcom")).toBe("quotes the password in the wrong case");
  expect(noteProblem("It shows up 12,345 times.", 12_345, "pw")).toBe("restates the count");
  expect(noteProblem("Millions of people pick this.", 0, "pw")).toBe('contradicts band "never leaked"');
  expect(noteProblem("A rare choice of word.", 500_000, "pw")).toBe('contradicts band "extremely common"');
  expect(noteProblem("Millions of people pick this.", 5_000, "pw")).toBe('contradicts band "common"');
});

const reply = (text: string, stop_reason: Anthropic.StopReason = "end_turn") =>
  ({ content: [{ type: "text", text }], stop_reason }) as Anthropic.Message;

test("draftNote sends the band, never the count", async () => {
  const create = vi.fn<(p: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>>(async () => reply("  Short and common.  "));
  expect(await draftNote("123456", 1_234_567, create)).toBe("Short and common.");
  const params = create.mock.calls[0][0];
  expect(params.model).toBe(MODEL);
  expect(params.messages[0].content).toBe('Password: "123456"\nBand: extremely common');
});

test("draftNote retries bad drafts and refusals, then throws NoValidNoteError", async () => {
  const create = vi
    .fn()
    .mockResolvedValueOnce(reply("Leaked by LinkedIn."))
    .mockResolvedValueOnce(reply("", "refusal"))
    .mockResolvedValueOnce(reply("Fine now."));
  expect(await draftNote("pw", 5, create)).toBe("Fine now.");

  const bad = vi.fn(async () => reply("One. Two."));
  const err = await draftNote("pw", 5, bad).catch((e) => e);
  expect(err).toBeInstanceOf(NoValidNoteError);
  expect(err.message).toContain("more than 1 sentence");
  expect(bad).toHaveBeenCalledTimes(3);
});

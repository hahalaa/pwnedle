import { expect, test, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { MODEL, draftNote, noteProblem } from "./notes";

test("noteProblem accepts a short plain note", () => {
  expect(noteProblem("A keyboard walk anyone can type without looking. That makes it one of the first guesses.")).toBeNull();
  expect(noteProblem("Adding 2024 to a word is a common habit.")).toBeNull();
});

test("noteProblem rejects each R32 break", () => {
  expect(noteProblem("")).toBe("empty");
  expect(noteProblem("a".repeat(201))).toBe("over 200 characters");
  expect(noteProblem("One. Two. Three.")).toBe("more than 2 sentences");
  expect(noteProblem("It leaked in the RockYou dump.")).toBe("names a breach");
  expect(noteProblem("About 3% of people use it.")).toBe("unverifiable statistic");
});

const reply = (text: string, stop_reason: Anthropic.StopReason = "end_turn") =>
  ({ content: [{ type: "text", text }], stop_reason }) as Anthropic.Message;

test("draftNote returns the first valid note and calls Haiku", async () => {
  const create = vi.fn<(p: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>>(async () => reply("  Short and common.  "));
  expect(await draftNote("123456", 1_000_000, create)).toBe("Short and common.");
  const params = create.mock.calls[0][0];
  expect(params.model).toBe(MODEL);
  expect(params.messages[0].content).toContain('"123456"');
});

test("draftNote retries bad drafts and refusals, then gives up", async () => {
  const create = vi
    .fn()
    .mockResolvedValueOnce(reply("Leaked by LinkedIn."))
    .mockResolvedValueOnce(reply("", "refusal"))
    .mockResolvedValueOnce(reply("Fine now."));
  expect(await draftNote("pw", 5, create)).toBe("Fine now.");

  const bad = vi.fn(async () => reply("One. Two. Three."));
  await expect(draftNote("pw", 5, bad)).rejects.toThrow("more than 2 sentences");
  expect(bad).toHaveBeenCalledTimes(3);
});

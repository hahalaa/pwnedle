import { expect, test } from "vitest";
import { candidates } from "./candidates";
import { isClean } from "./filter";

test("drops blocklist terms, including leetspeak and suffixes", () => {
  for (const pw of ["fuckyou", "Sh1t123!", "a$$", "ass123", "p0rn", "c0caine", "weed420", "nigger1", "sexy69", "f.u.c.k", "lesbean", "pounded"]) {
    expect(isClean(pw), pw).toBe(false);
  }
});

test("whole-word terms leave ordinary words alone", () => {
  for (const pw of ["password", "Password1", "title", "method", "document", "shoe", "butterfly", "spice", "titanic"]) {
    expect(isClean(pw), pw).toBe(true);
  }
});

test("drops personal-data shapes", () => {
  for (const pw of ["bob@example.com", "123456789", "555-123-4567", "(555) 123 4567", "+447700900123", "john smith", "john.smith", "JohnSmith"]) {
    expect(isClean(pw), pw).toBe(false);
  }
});

test("keeps normal passwords", () => {
  for (const pw of ["123456", "12345678", "p@ssw0rd", "iloveyou", "Liverpool2024", "dragon!", "qwertyuiop"]) {
    expect(isClean(pw), pw).toBe(true);
  }
});

test("passes most of the real candidate pool", async () => {
  const all = await candidates();
  const kept = all.filter(isClean);
  expect(kept.length).toBeGreaterThan(all.length * 0.9);
  expect(kept).not.toContain("fuck");
});

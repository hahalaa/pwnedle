import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { pwnedCount } from "./pwned";

// SHA-1("password") = 5BAA6 1E4C9B93F3F0682250B6CF8331B7EE68FD8
const range = [
  "1D2DA4053E34E76F6576ED1DA63134B5E2A:2",
  "1E4C9B93F3F0682250B6CF8331B7EE68FD8:52256179",
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0",
].join("\r\n");

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  const fetch = vi.fn(async () => new Response(range));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("returns the known count and sends only the prefix with padding", async () => {
  const fetch = stubFetch();
  const dir = await mkdtemp(join(tmpdir(), "pwned-"));

  expect(await pwnedCount("password", dir)).toBe(52256179);
  expect(fetch).toHaveBeenCalledWith("https://api.pwnedpasswords.com/range/5BAA6", {
    headers: { "Add-Padding": "true" },
  });
});

test("reuses the cached range instead of fetching again", async () => {
  const fetch = stubFetch();
  const dir = await mkdtemp(join(tmpdir(), "pwned-"));

  await pwnedCount("password", dir);
  expect(await pwnedCount("password", dir)).toBe(52256179);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("returns 0 for a suffix not in the range", async () => {
  stubFetch();
  const dir = await mkdtemp(join(tmpdir(), "pwned-"));

  // SHA-1("PASSWORD") does not start with 5BAA6, but the stub returns the same body.
  expect(await pwnedCount("PASSWORD", dir)).toBe(0);
});

test("throws on a failed request and caches nothing", async () => {
  const fetch = vi.fn(async () => new Response("", { status: 503 }));
  vi.stubGlobal("fetch", fetch);
  const dir = await mkdtemp(join(tmpdir(), "pwned-"));

  await expect(pwnedCount("password", dir)).rejects.toThrow("HTTP 503");
  await expect(pwnedCount("password", dir)).rejects.toThrow("HTTP 503");
  expect(fetch).toHaveBeenCalledTimes(2);
});

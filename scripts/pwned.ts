import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Breach count for a password from the Pwned Passwords range API (R29).
// Only the first 5 hex characters of the SHA-1 leave this machine, with padding
// on. Range responses are cached per prefix, so the cache never holds a password.
export async function pwnedCount(password: string, cacheDir = ".cache/pwned"): Promise<number> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const file = join(cacheDir, `${prefix}.txt`);

  let body: string;
  try {
    body = await readFile(file, "utf8");
  } catch {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) throw new Error(`Pwned Passwords range ${prefix}: HTTP ${res.status}`);
    body = await res.text();
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, body);
  }

  // Padding rows have a count of 0, so they read the same as a miss.
  for (const line of body.split("\n")) {
    const [s, count] = line.trim().split(":");
    if (s === suffix) return Number(count);
  }
  return 0;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// R2/D30: tells the server this browser's time zone, so pages pick the player's local date.
// Refreshes only when the cookie changes: the first visit, or after moving zone.
export function TimeZone() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (document.cookie.split("; ").includes(`tz=${tz}`)) return;
    document.cookie = `tz=${tz}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}

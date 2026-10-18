import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // T50: lets a phone on the same network play the dev server at this Mac's address (Next blocks other origins).
  allowedDevOrigins: ["192.168.5.101"],
  cacheComponents: true,
  partialPrefetching: true,
  // lib/puzzles.ts reads these at runtime, so ship them with the server functions.
  outputFileTracingIncludes: { "/*": ["./data/puzzles/**"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

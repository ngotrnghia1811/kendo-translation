import type { NextConfig } from "next";

// Round 44 answer 13 (Q-A l142): local Mac app that reads files on each request.
// Cache Components is off, so every screen reads fresh data (live refresh of progress.json).
const nextConfig: NextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
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

import { execSync } from "child_process";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Unique build ID per deploy — ensures every rebuild produces fresh
  // content-hashed JS/CSS chunk filenames. Browsers fetching the new HTML
  // (served with no-cache) will automatically download the new chunks.
  generateBuildId: async () => {
    try {
      const gitHash = execSync("git rev-parse --short HEAD", {
        encoding: "utf-8",
      }).trim();
      return `${gitHash}-${Date.now()}`;
    } catch {
      return `build-${Date.now()}`;
    }
  },

  // Ensure proper cache headers for dynamic data fetches
  headers: async () => [
    {
      // Next.js data routes (client-side navigations) — don't cache
      source: "/_next/data/:path*",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Pragma", value: "no-cache" },
      ],
    },
  ],
};

export default nextConfig;

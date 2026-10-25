import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Isolated builds (CI verification) write to a separate directory so a
  // running dev server is never disturbed: BUILD_ISOLATED=1 bunx next build
  ...(process.env.BUILD_ISOLATED ? { distDir: ".next-isolated" } : {}),
  poweredByHeader: false,
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

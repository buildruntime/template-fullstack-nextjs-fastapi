import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // A self-contained server for the container image (see frontend/Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  // Cache Components (cacheComponents and partialPrefetching) are off on purpose. With them on
  // in Next.js 16.4, a Server Action form submitted before the page has hydrated, or with
  // JavaScript disabled, rendered a blank page. Sign-in must work in both cases. The e2e test
  // "forms work before JavaScript loads" checks this. See docs/architecture.md.

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

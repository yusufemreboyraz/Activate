import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Prisma client lives in a custom output path (lib/generated/prisma).
  // Next.js's file tracer doesn't follow the native query-engine binary from
  // there automatically, so it gets dropped from serverless function bundles
  // on Vercel unless explicitly included here.
  outputFileTracingIncludes: {
    "/**": ["./lib/generated/prisma/**/*"],
  },
};

export default nextConfig;

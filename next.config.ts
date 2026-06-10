import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript type checking during build to reduce memory usage
  // (run `npx tsc --noEmit` separately to check types)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

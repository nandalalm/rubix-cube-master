import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel deployment
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Web Workers are supported natively via `new URL('./worker', import.meta.url)` in Next.js 13+
};

export default nextConfig;

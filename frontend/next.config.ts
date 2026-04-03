import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize for production
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
};

export default nextConfig;

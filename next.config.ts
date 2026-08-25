import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignoriert TypeScript-Fehler beim Build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignoriert ESLint-Fehler beim Build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
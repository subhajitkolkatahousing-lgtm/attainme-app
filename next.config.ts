import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel deployment config */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;

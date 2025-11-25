import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: false, // Disable Turbopack - has issues with Prisma Client during build
};

export default nextConfig;

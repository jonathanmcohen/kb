import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    experimental: {
        // Prevent static page generation errors during build
        staticGenerationRetryCount: 0,
    },
};

export default nextConfig;

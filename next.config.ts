import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/mathAnal',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

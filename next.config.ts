import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/mathAnal',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/mathAnal',
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

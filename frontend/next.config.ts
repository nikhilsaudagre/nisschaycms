import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: [
    '192.168.1.39:3000',
    '192.168.1.39',
    '192.168.1.44:3000',
    '192.168.1.44',
    '192.168.1.42:3000',
    '192.168.1.42',
    'localhost:3000',
    'localhost',
    '*.local:3000'
  ],
};

export default nextConfig;

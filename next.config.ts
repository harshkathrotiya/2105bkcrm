import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      // Don't log every RSC fetch in dev — reduces noise
      fullUrl: false,
    },
  },
};

export default nextConfig;

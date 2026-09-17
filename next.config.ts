import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["tldraw", "lucide-react"],
  },
};

export default nextConfig;

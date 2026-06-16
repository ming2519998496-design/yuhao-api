import type { NextConfig } from "next";
import { BASE_SECURITY_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    // CSP 与页面 CORS 由 middleware 处理；此处仅为静态资源兜底
    return [
      {
        source: "/api/:path*",
        headers: BASE_SECURITY_HEADERS,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/models",
        destination: "/console",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

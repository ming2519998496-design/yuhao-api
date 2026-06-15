import type { NextConfig } from "next";
import { SECURITY_RESPONSE_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_RESPONSE_HEADERS,
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

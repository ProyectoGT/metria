import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hhhxmloftmizzponehld.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/pedidos",
        destination: "/solicitudes",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

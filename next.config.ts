import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

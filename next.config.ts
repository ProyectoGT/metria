import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHostname = supabaseUrl.replace("https://", "").replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requiere unsafe-inline/unsafe-eval; Google Maps carga scripts externos
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com maps.gstatic.com",
      "style-src 'self' 'unsafe-inline' *.googleapis.com",
      `img-src 'self' blob: data: ${supabaseHostname} *.googleapis.com *.gstatic.com`,
      `connect-src 'self' ${supabaseHostname} wss://${supabaseHostname} maps.googleapis.com`,
      "font-src 'self' fonts.gstatic.com",
      "frame-src 'none'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
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

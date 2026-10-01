import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Print rendering (Satori) reads these at runtime in serverless functions.
  outputFileTracingIncludes: { "/**": ["./src/lib/personalization/fonts/**", "./public/catalog/art/**"] },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "rojoygualda.com" },
      { protocol: "https", hostname: "www.rojoygualda.com" },
      { protocol: "https", hostname: "files.cdn.printful.com" },
      { protocol: "https", hostname: "*.printful.com" },
      { protocol: "https", hostname: "*.gelato.com" },
      { protocol: "https", hostname: "*.gelatoapis.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "images-api.printify.com" },
      { protocol: "https", hostname: "*.printify.com" },
    ],
  },
  // Brand illustrations imported from the admin live in storage (site-art/); /catalog/art/<name>.png falls back there.
  async rewrites() {
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    return base ? { beforeFiles: [], afterFiles: [], fallback: [{ source: "/catalog/art/:file", destination: `${base}/storage/v1/object/public/print-files/site-art/:file` }] } : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;

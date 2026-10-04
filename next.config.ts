import type { NextConfig } from "next";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

// Club hero film: detected at build time so a missing file never triggers a 404 request.
const clubMedia = (f: string) => (existsSync(path.join(process.cwd(), "public/club", f)) ? "1" : "");
// Campaign photos for theme / category tiles (public/campaign/<key>.webp): the keys present at build time.
// every photo in public/campaign is a slot: <key>.webp
const CAMPAIGN_KEYS = existsSync(path.join(process.cwd(), "public/campaign")) ? readdirSync(path.join(process.cwd(), "public/campaign")).filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5)) : [];
const campaignPhotos = CAMPAIGN_KEYS.flatMap((k) => {
  const f = path.join(process.cwd(), "public/campaign", `${k}.webp`);
  return existsSync(f) ? [`${k}:${createHash("sha1").update(readFileSync(f)).digest("hex").slice(0, 8)}`] : [];
}).join(",");

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    CLUB_LOOP_MP4: clubMedia("club-loop.mp4"),
    CLUB_LOOP_WEBM: clubMedia("club-loop.webm"),
    CLUB_POSTER: clubMedia("club-poster.webp"),
    CAMPAIGN_PHOTOS: campaignPhotos,
  },
  // Print rendering (Satori) reads these at runtime in serverless functions.
  outputFileTracingIncludes: { "/**": ["./src/lib/personalization/fonts/**", "./public/catalog/art/**"] },
  images: {
    formats: ["image/webp"], // avif first-encodes were slow on new product photos
    // Supabase free plan: every re-fetch of an original by the image CDN is storage egress. Product photos live
    // at versioned / content-hashed paths and campaign photos carry ?v=<update time>, so a long TTL is safe.
    minimumCacheTTL: 2_678_400, // 31 days
    // local images may carry a ?v= cache key (campaign photos)
    localPatterns: [{ pathname: "/**" }],
    // fewer widths = fewer distinct transformations, each of which fetches the original once (mockups are ≤ 1400 px)
    deviceSizes: [640, 828, 1080, 1400, 1920],
    imageSizes: [64, 128, 256, 384],
    remotePatterns: [
      // public storage objects only (the optimizer must not proxy anything else from Supabase)
      { protocol: "https", hostname: supabaseHost ?? "*.supabase.co", pathname: "/storage/v1/object/public/**" },
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

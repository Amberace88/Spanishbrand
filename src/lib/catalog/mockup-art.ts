import { createHmac, timingSafeEqual } from "node:crypto";
import type { RenderMode } from "./render";

/**
 * Low-resolution mockup sources served from our own domain (Netlify bandwidth) instead of Supabase storage.
 *
 * Printful's mockup generator only needs the artwork to composite a ~1000 px photo, but it was downloading
 * the full print file from storage for every product (3–16 MB per garment print, 10–47 MB per poster) —
 * the largest single source of Supabase egress during catalog builds. The mockup task keeps the print-area
 * position in print-file pixels, so Printful scales this smaller render up to the same placement.
 *
 * URLs are HMAC-signed (no public render endpoint to abuse) and carry the print's content hash, so a
 * changed design gets a new URL and the response can be cached forever.
 */

export const MOCKUP_ART_MAX = 1600;

export interface MockupArtParams {
  d: string; // design slug
  s: "front" | "back";
  m: RenderMode;
  w: number;
  h: number;
  v: string; // print content hash (cache key)
  /** Blueprint: the render applies that garment's safe zone (lib/catalog/print-safety.ts), exactly like the print file. */
  b?: string;
}

function secret() {
  return process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

// `b` is appended only when present, so URLs signed before it existed stay valid
const payload = (p: MockupArtParams) => `${p.d}|${p.s}|${p.m}|${p.w}|${p.h}|${p.v}${p.b ? `|${p.b}` : ""}`;

export function signMockupArt(p: MockupArtParams, key = secret()) {
  return createHmac("sha256", key).update(payload(p)).digest("hex").slice(0, 32);
}

export function verifyMockupArt(p: MockupArtParams, sig: string, key = secret()) {
  if (!key || !/^[0-9a-f]{32}$/.test(sig)) return false;
  const a = Buffer.from(signMockupArt(p, key));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Scale a print-file size down so its longest side is ≤ MOCKUP_ART_MAX (aspect preserved). */
export function mockupDims(width: number, height: number) {
  const k = Math.min(1, MOCKUP_ART_MAX / Math.max(width, height));
  return { w: Math.max(1, Math.round(width * k)), h: Math.max(1, Math.round(height * k)) };
}

/** Signed URL on our own domain, or null when no signing secret / public site URL is configured. */
export function mockupArtUrl(siteUrl: string, p: Omit<MockupArtParams, "w" | "h"> & { width: number; height: number }): string | null {
  const key = secret();
  if (!key || !/^https:\/\//.test(siteUrl)) return null;
  const { w, h } = mockupDims(p.width, p.height);
  const params: MockupArtParams = { d: p.d, s: p.s, m: p.m, w, h, v: p.v, ...(p.b ? { b: p.b } : {}) };
  const q = new URLSearchParams({ d: params.d, s: params.s, m: params.m, w: String(w), h: String(h), v: params.v, ...(p.b ? { b: p.b } : {}) });
  // the path ends in .png so the proxy (session cookie) skips it and the CDN can cache the response
  return `${siteUrl.replace(/\/$/, "")}/api/catalog/mockup-art/${signMockupArt(params, key)}.png?${q}`;
}

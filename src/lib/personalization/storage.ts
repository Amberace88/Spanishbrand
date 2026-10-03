import "server-only";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";

export const PRINT_BUCKET = "print-files";

/** Public URL for an object in the print-files bucket (providers download from here). */
export function publicUrlFor(path: string): string {
  const base = (env.supabaseUrl() ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${PRINT_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Upload (upsert) an object to the public print-files bucket.
 * Cache: one year at the Supabase CDN, Netlify's image CDN and browsers — every re-fetch of an original is
 * egress on the free plan. `immutable` (content-hashed / versioned paths only) also stops browsers from
 * revalidating; paths that get overwritten in place (site-art/, site/) must be cache-busted by their readers.
 */
export async function uploadObject(path: string, data: Buffer, contentType: string, opts: { immutable?: boolean } = {}) {
  // storage-js sends this as `cache-control: max-age=<value>` for Buffer bodies
  const cacheControl = opts.immutable ? "31536000, immutable" : "31536000";
  // storage answers 502/504 (empty message) under parallel load: a few short retries
  let error: { message?: string } | null = null;
  for (let i = 0; i < 3; i++) {
    ({ error } = await db().storage.from(PRINT_BUCKET).upload(path, data, { contentType, upsert: true, cacheControl }));
    if (!error) break;
    await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  if (error) throw new Error(`STORAGE_UPLOAD_FAILED: ${error.message || "storage unavailable"}`);
  return publicUrlFor(path);
}

import "server-only";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";

export const PRINT_BUCKET = "print-files";

/** Public URL for an object in the print-files bucket (providers download from here). */
export function publicUrlFor(path: string): string {
  const base = (env.supabaseUrl() ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${PRINT_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadObject(path: string, data: Buffer, contentType: string) {
  // storage answers 502/504 (empty message) under parallel load: a few short retries
  let error: { message?: string } | null = null;
  for (let i = 0; i < 3; i++) {
    ({ error } = await db().storage.from(PRINT_BUCKET).upload(path, data, { contentType, upsert: true, cacheControl: "31536000" }));
    if (!error) break;
    await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  if (error) throw new Error(`STORAGE_UPLOAD_FAILED: ${error.message || "storage unavailable"}`);
  return publicUrlFor(path);
}

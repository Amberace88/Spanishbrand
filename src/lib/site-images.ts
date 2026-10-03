import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { dbOrNull } from "@/lib/supabase/admin";
import { PRINT_BUCKET, publicUrlFor } from "@/lib/personalization/storage";

/** Tag invalidated by the admin site-image upload, so a new campaign photo shows at once. */
export const SITE_IMAGES_TAG = "site-images";

async function readSiteImages(): Promise<Record<string, string>> {
  const sb = dbOrNull();
  if (!sb) return {};
  const { data, error } = await sb.storage.from(PRINT_BUCKET).list("site", { limit: 200 });
  if (error) throw new Error(error.message); // not cached
  const out: Record<string, string> = {};
  for (const f of data ?? []) {
    if (!f.name.endsWith(".webp")) continue;
    const v = f.updated_at ? new Date(f.updated_at).getTime().toString(36) : "1";
    out[f.name.replace(/\.webp$/, "")] = `${publicUrlFor(`site/${f.name}`)}?v=${v}`;
  }
  return out;
}

// the storage listing ran on every shop / landing page view: shared across instances for 10 min instead
const cachedSiteImages = unstable_cache(readSiteImages, ["site-images-v1"], { revalidate: 600, tags: [SITE_IMAGES_TAG] });

/** Campaign photos uploaded from the admin (storage site/<name>.webp) → { name: url } (cache-busted by update time). */
export const listSiteImages = cache(async (): Promise<Record<string, string>> => {
  return cachedSiteImages().catch(() => readSiteImages().catch(() => ({})));
});

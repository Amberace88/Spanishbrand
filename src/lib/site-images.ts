import "server-only";
import { cache } from "react";
import { dbOrNull } from "@/lib/supabase/admin";
import { PRINT_BUCKET, publicUrlFor } from "@/lib/personalization/storage";

/** Campaign photos uploaded from the admin (storage site/<name>.webp) → { name: url } (cache-busted by update time). */
export const listSiteImages = cache(async (): Promise<Record<string, string>> => {
  const sb = dbOrNull();
  if (!sb) return {};
  const { data } = await sb.storage.from(PRINT_BUCKET).list("site", { limit: 200 });
  const out: Record<string, string> = {};
  for (const f of data ?? []) {
    if (!f.name.endsWith(".webp")) continue;
    const v = f.updated_at ? new Date(f.updated_at).getTime().toString(36) : "1";
    out[f.name.replace(/\.webp$/, "")] = `${publicUrlFor(`site/${f.name}`)}?v=${v}`;
  }
  return out;
});

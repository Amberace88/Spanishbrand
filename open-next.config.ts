// OpenNext configuration for the Cloudflare Workers build (branch `cloudflare`).
// The Netlify build (`npm run build`) does not read this file.
// See docs/CLOUDFLARE_MIGRATION.md → "Caching".
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default defineCloudflareConfig({
  // ISR pages + unstable_cache entries persist in R2 (binding NEXT_INC_CACHE_R2_BUCKET), fronted by the
  // per-colo Cache API so hot entries do not cost an R2 read on every request.
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  // revalidateTag()/revalidatePath() (admin edits, site images) need a tag store: D1 (binding NEXT_TAG_CACHE_D1).
  tagCache: d1NextTagCache,
  // time-based revalidation (export const revalidate = …) re-renders through the WORKER_SELF_REFERENCE binding
  queue: memoryQueue,
});

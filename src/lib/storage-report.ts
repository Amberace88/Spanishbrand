import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { PRINT_BUCKET } from "@/lib/personalization/storage";

/**
 * Storage usage report for the catalog folders of the print-files bucket — DRY RUN ONLY.
 * Lists objects nobody references any more (failed/retried builds, superseded print versions, replaced
 * photos) so the owner can decide what to clean up. This module never deletes or moves anything.
 *
 * Scanned: catalog/prints, catalog/media, catalog/mockup-src. Never scanned: orders/ (customer print files),
 * uploads/ (customer uploads), site/ and site-art/ (referenced by name from code).
 */

export const REPORT_PREFIXES = ["catalog/prints", "catalog/media", "catalog/mockup-src"] as const;

export interface StoredObject {
  path: string;
  bytes: number;
}

/** Pure part (unit-tested): classify listed objects against the referenced paths. */
export function classifyObjects(objects: StoredObject[], live: Set<string>, retired: Set<string>, sample = 100) {
  const out = { objects: 0, bytes: 0, live: { count: 0, bytes: 0 }, retiredOnly: { count: 0, bytes: 0, sample: [] as string[] }, orphaned: { count: 0, bytes: 0, sample: [] as string[] } };
  for (const o of objects) {
    out.objects++;
    out.bytes += o.bytes;
    if (live.has(o.path)) {
      out.live.count++;
      out.live.bytes += o.bytes;
    } else if (retired.has(o.path)) {
      out.retiredOnly.count++;
      out.retiredOnly.bytes += o.bytes;
      if (out.retiredOnly.sample.length < sample) out.retiredOnly.sample.push(o.path);
    } else {
      out.orphaned.count++;
      out.orphaned.bytes += o.bytes;
      if (out.orphaned.sample.length < sample) out.orphaned.sample.push(o.path);
    }
  }
  return out;
}

/** Public storage URL → object path inside the bucket (null for anything else). */
export function storagePathOf(url: string | null | undefined, supabaseUrl: string): string | null {
  if (!url) return null;
  const marker = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${PRINT_BUCKET}/`;
  if (!url.startsWith(marker)) return null;
  try {
    return decodeURIComponent(url.slice(marker.length).split(/[?#]/)[0]);
  } catch {
    return null;
  }
}

/** Every storage URL inside a JSON value (print_config, job state…). */
function urlsIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") {
    if (v.includes("/storage/v1/object/public/")) out.push(v);
  } else if (Array.isArray(v)) {
    for (const x of v) urlsIn(x, out);
  } else if (v && typeof v === "object") {
    for (const x of Object.values(v)) urlsIn(x, out);
  }
  return out;
}

async function listTree(prefix: string, out: StoredObject[], budget: { calls: number }) {
  const sb = db();
  const folders: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    if (budget.calls-- <= 0) throw new Error("LIST_BUDGET_EXCEEDED");
    const { data, error } = await sb.storage.from(PRINT_BUCKET).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`storage list ${prefix}: ${error.message}`);
    for (const e of data ?? []) {
      // folders come back without id/metadata
      if (!e.id) folders.push(`${prefix}/${e.name}`);
      else out.push({ path: `${prefix}/${e.name}`, bytes: Number((e.metadata as { size?: number } | null)?.size ?? 0) });
    }
    if (!data || data.length < 1000) break;
  }
  // walk sub-folders a few at a time (catalog/media has one folder per product slug)
  for (let i = 0; i < folders.length; i += 12) await Promise.all(folders.slice(i, i + 12).map((f) => listTree(f, out, budget)));
}

async function allRows<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

/** Referenced object paths: by live (non-archived) products and by archived products only. */
async function referencedPaths() {
  const sb = db();
  const base = env.supabaseUrl() ?? "";
  const brand = env.brandId();
  const products = await allRows<{ id: string; status: string; og_image: string | null }>((a, b) => sb.from("products").select("id, status, og_image").eq("brand_id", brand).order("id").range(a, b));
  const archived = new Set(products.filter((p) => p.status === "ARCHIVED").map((p) => p.id));
  const live = new Set<string>(), retired = new Set<string>();
  const add = (productId: string | null, url: string | null | undefined) => {
    const p = storagePathOf(url, base);
    if (!p) return;
    if (productId && archived.has(productId)) retired.add(p);
    else live.add(p);
  };
  for (const p of products) add(p.id, p.og_image);
  const images = await allRows<{ product_id: string; url: string }>((a, b) => sb.from("product_images").select("product_id, url").order("id").range(a, b));
  for (const i of images) add(i.product_id, i.url);
  const variants = await allRows<{ product_id: string; image: string | null }>((a, b) => sb.from("product_variants").select("product_id, image").not("image", "is", null).order("id").range(a, b));
  for (const v of variants) add(v.product_id, v.image);
  const maps = await allRows<{ product_id: string; print_config: unknown; variant_provider_mappings: { files: unknown }[] | null }>((a, b) =>
    sb.from("product_provider_mappings").select("product_id, print_config, variant_provider_mappings(files)").order("id").range(a, b),
  );
  for (const m of maps) for (const u of urlsIn([m.print_config, m.variant_provider_mappings])) add(m.product_id, u);
  // photos shown in order history / returns
  const items = await allRows<{ image: string | null }>((a, b) => sb.from("order_items").select("image").not("image", "is", null).order("id").range(a, b));
  for (const i of items) add(null, i.image);
  // in-flight builds (print files / mockup sources not yet attached to a product row)
  const jobs = await allRows<{ product_id: string | null; state: unknown }>((a, b) => sb.from("catalog_jobs").select("product_id, state").eq("brand_id", brand).order("key").range(a, b));
  for (const j of jobs) for (const u of urlsIn(j.state)) add(null, u);
  // a path referenced by anything live is live
  for (const p of live) retired.delete(p);
  return { live, retired };
}

export async function storageReport(prefixes: readonly string[] = REPORT_PREFIXES) {
  const started = Date.now();
  const { live, retired } = await referencedPaths();
  const byPrefix: Record<string, ReturnType<typeof classifyObjects>> = {};
  const budget = { calls: 4000 };
  for (const prefix of prefixes) {
    const objects: StoredObject[] = [];
    await listTree(prefix, objects, budget);
    byPrefix[prefix] = classifyObjects(objects, live, retired);
  }
  const sum = (k: "orphaned" | "retiredOnly") => Object.values(byPrefix).reduce((s, r) => s + r[k].bytes, 0);
  return {
    dryRun: true as const,
    note: "Report only — nothing was deleted. 'orphaned' = referenced by no product, mapping or build job; 'retiredOnly' = used only by archived (replaced) products, still needed for their order history views.",
    ms: Date.now() - started,
    totals: { bytes: Object.values(byPrefix).reduce((s, r) => s + r.bytes, 0), orphanedBytes: sum("orphaned"), retiredOnlyBytes: sum("retiredOnly") },
    byPrefix,
  };
}

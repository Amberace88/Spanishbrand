import "server-only";
import sharp from "sharp";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { BLUEPRINTS } from "@/lib/catalog/blueprints";
import type { BlueprintKey } from "@/lib/catalog/designs";
import { designBySlug } from "@/lib/catalog/designs";
import { mockupArtUrl } from "@/lib/catalog/mockup-art";
import { createMockupTask, getMockupTask, getPrintfiles } from "@/lib/fulfillment/printful/mockups";
import { isProviderError } from "@/lib/fulfillment/errors";
import { uploadObject } from "@/lib/personalization/storage";
import { mockupPending, type PendingImage, type TaskMockup } from "@/lib/fulfillment/catalog-builder";
import { isKidsBlueprint, pickOptionGroups } from "@/lib/fulfillment/mockup-styles";
import { createHash } from "node:crypto";

/**
 * Admin-triggered "refresh images" for already-published kids' products (kids / toddler / baby / kids hoodie).
 * New builds get varied mockup styles automatically; published products keep their photos until an admin asks
 * for a refresh here — nothing is rebuilt automatically.
 *
 * Steps (resumable, one per call, state in catalog_jobs under key `img:<product job key>`):
 *   new → poll (Printful mockup task with several styles) → images (copy 3 per call) → swap → done.
 * The swap inserts the new photos, then removes the product's previous image rows; those rows are kept in
 * the job state (`previous`) so they can be restored, and their storage objects are left untouched.
 */

export const refreshKeyFor = (productKey: string) => `img:${productKey}`;

interface RefreshState {
  productId?: string;
  slug?: string;
  mediaVer?: string;
  taskKey?: string;
  perColor?: Record<string, string>;
  pending?: PendingImage[];
  done?: number;
  uploaded?: { url: string; alt: string; kind: "MOCKUP" | "LIFESTYLE"; color: string }[];
  previous?: { url: string; alt: string | null; sort: number; kind: string; variant_id: string | null }[];
}
type Phase = "new" | "poll" | "images" | "swap" | "done" | "failed";
interface Row {
  key: string;
  phase: Phase;
  product_id: string | null;
  state: RefreshState;
  error: string | null;
  attempts: number;
}

export interface RefreshResult {
  key: string;
  phase: Phase | "busy";
  done: boolean;
  waitMs?: number;
  error?: string;
  message?: string;
}

/** Published kids' products built by the catalog builder (refresh candidates) with their refresh status. */
export async function listKidsRefresh() {
  const sel = () => db().from("catalog_jobs").select("key, phase, product_id, error, updated_at").eq("brand_id", env.brandId());
  const [{ data: products }, { data: refreshes }] = await Promise.all([sel().like("key", "p:%").eq("phase", "done"), sel().like("key", "img:p:%")]);
  const rows = [...(products ?? []), ...(refreshes ?? [])];
  const status = new Map(rows.filter((r) => r.key.startsWith("img:")).map((r) => [r.key.slice(4), r]));
  return rows
    .filter((r) => r.key.startsWith("p:") && r.phase === "done" && r.product_id && isKidsBlueprint(r.key.split(":")[2] ?? ""))
    .map((r) => ({ key: r.key, productId: r.product_id as string, refresh: status.get(r.key) ? { phase: status.get(r.key)!.phase as Phase, error: status.get(r.key)!.error, updatedAt: status.get(r.key)!.updated_at } : null }));
}

async function loadRow(productKey: string): Promise<Row> {
  const key = refreshKeyFor(productKey);
  const sb = db();
  const { data } = await sb.from("catalog_jobs").select("key, phase, product_id, state, error, attempts").eq("key", key).maybeSingle();
  if (data) return data as Row;
  const row: Row = { key, phase: "new", product_id: null, state: {}, error: null, attempts: 0 };
  await sb.from("catalog_jobs").insert({ key, kind: "PRODUCT", phase: "new", product_id: null, state: {}, brand_id: env.brandId() });
  return row;
}

async function save(row: Row, patch: Partial<Row>) {
  Object.assign(row, patch);
  await db().from("catalog_jobs").update({ phase: row.phase, product_id: row.product_id, state: row.state, error: row.error, attempts: row.attempts }).eq("key", row.key);
}

async function lease(key: string) {
  const now = new Date();
  const { data } = await db()
    .from("catalog_jobs")
    .update({ locked_until: new Date(now.getTime() + 60_000).toISOString() })
    .eq("key", key)
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select("key");
  return !!data?.length;
}

/**
 * Advance the refresh of one product by one step. `restart` begins a new refresh of a product whose
 * previous refresh finished or failed.
 */
export async function runRefreshStep(productKey: string, opts: { restart?: boolean } = {}): Promise<RefreshResult> {
  const [kind, slug = "", bp = ""] = productKey.split(":");
  if (kind !== "p" || !isKidsBlueprint(bp) || !designBySlug(slug)) return { key: productKey, phase: "failed", done: true, error: "NOT_A_KIDS_PRODUCT" };
  const row = await loadRow(productKey);
  if (!(await lease(row.key))) return { key: productKey, phase: "busy", done: true, message: "otro proceso lo está actualizando" };
  try {
    if ((row.phase === "done" || row.phase === "failed") && opts.restart) await save(row, { phase: "new", state: {}, error: null, attempts: 0, product_id: null });
    if (row.phase === "done") return { key: productKey, phase: "done", done: true };
    if (row.phase === "failed") return { key: productKey, phase: "failed", done: true, error: row.error ?? undefined };
    try {
      switch (row.phase) {
        case "new":
          return await stepStart(row, productKey);
        case "poll":
          return await stepPoll(row, productKey);
        case "images":
          return await stepImages(row, productKey);
        case "swap":
          return await stepSwap(row, productKey);
      }
      return { key: productKey, phase: row.phase, done: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const transient = (isProviderError(e) && (e.status === 429 || e.status === null || (e.status ?? 0) >= 500)) || /Bad Gateway|Gateway Timeout|fetch failed|ECONNRESET|ETIMEDOUT|STORAGE_UPLOAD_FAILED/i.test(msg);
      if (transient && row.attempts < 6) {
        await save(row, { attempts: row.attempts + 1, error: msg });
        return { key: productKey, phase: row.phase, done: false, waitMs: isProviderError(e) && e.status === 429 ? 30_000 : 5_000, error: msg };
      }
      await save(row, { phase: "failed", error: msg.slice(0, 900), attempts: row.attempts + 1 });
      return { key: productKey, phase: "failed", done: true, error: msg };
    }
  } finally {
    await db().from("catalog_jobs").update({ locked_until: null }).eq("key", row.key);
  }
}

async function stepStart(row: Row, productKey: string): Promise<RefreshResult> {
  const sb = db();
  const [, slug, bpKey] = productKey.split(":");
  const design = designBySlug(slug)!;
  const bp = BLUEPRINTS[bpKey as BlueprintKey];
  const { data: job } = await sb.from("catalog_jobs").select("phase, product_id, state").eq("key", productKey).maybeSingle();
  if (job?.phase !== "done" || !job.product_id) throw new Error("PRODUCT_NOT_PUBLISHED");
  const st = job.state as { slug: string; resKey: string; files: { type: string; url: string }[] };
  const { data: rj } = await sb.from("catalog_jobs").select("phase, state").eq("key", st.resKey).maybeSingle();
  const res = (rj?.state as { resolved?: { provider: string; externalId: string; printfile: { width: number; height: number }; placements: string[]; placement?: string } } | null)?.resolved;
  if (!res || res.provider !== "printful") throw new Error("ONLY_PRINTFUL_PRODUCTS");
  const { data: pvars } = await sb.from("product_variants").select("id, color, sort, variant_provider_mappings(provider_variant_id)").eq("product_id", job.product_id).order("sort");
  const perColor = new Map<string, string>();
  for (const v of pvars ?? []) {
    const ext = (v.variant_provider_mappings as unknown as { provider_variant_id: string }[])[0]?.provider_variant_id;
    if (ext && !perColor.has(v.color ?? "_") && perColor.size < 12) perColor.set(v.color ?? "_", ext);
  }
  if (!perColor.size) throw new Error("NO_MAPPED_VARIANTS");
  const front = st.files[0];
  if (!front) throw new Error("NO_PRINT_FILE");
  const { width, height } = res.printfile;
  const placement = res.placements.includes(res.placement ?? bp.placement) ? (res.placement ?? bp.placement) : res.placements[0];
  const v = createHash("sha256").update(front.url).digest("hex").slice(0, 12);
  const imageUrl = mockupArtUrl(env.siteUrl(), { d: design.slug, s: "front", m: bp.renderMode, v, width, height }) ?? front.url;
  const optionGroups = pickOptionGroups((await getPrintfiles(res.externalId).catch(() => null))?.option_groups);
  const input = { productId: res.externalId, variantIds: [...perColor.values()], format: "jpg" as const, files: [{ placement, imageUrl, position: { area_width: width, area_height: height, width, height, top: 0, left: 0 } }] };
  const taskKey = optionGroups.length ? await createMockupTask({ ...input, optionGroups }).catch((e) => (isProviderError(e) && e.status === 400 ? createMockupTask(input) : Promise.reject(e))) : await createMockupTask(input);
  await save(row, { phase: "poll", product_id: job.product_id, state: { productId: job.product_id, slug: st.slug, mediaVer: Date.now().toString(36), taskKey, perColor: Object.fromEntries(perColor) }, error: null });
  return { key: productKey, phase: "poll", done: false, waitMs: 8000, message: `${optionGroups.length} estilos pedidos` };
}

async function stepPoll(row: Row, productKey: string): Promise<RefreshResult> {
  const task = await getMockupTask(row.state.taskKey!);
  if (task.status === "pending") return { key: productKey, phase: "poll", done: false, waitMs: 6000 };
  if (task.status === "failed") throw new Error(`Mockup task failed: ${task.error ?? "unknown"}`);
  const pending = mockupPending((task.mockups ?? []) as TaskMockup[], row.state.perColor ?? {}, productKey);
  if (!pending.length) throw new Error("Mockup task returned no images");
  await save(row, { phase: "images", state: { ...row.state, pending, done: 0, uploaded: [] } });
  return { key: productKey, phase: "images", done: false, message: `${pending.length} fotos` };
}

async function stepImages(row: Row, productKey: string): Promise<RefreshResult> {
  const st = row.state;
  const { data: product } = await db().from("products").select("id, name").eq("id", st.productId!).single();
  const batch = (st.pending ?? []).slice(st.done ?? 0, (st.done ?? 0) + 3);
  const uploaded = [...(st.uploaded ?? [])];
  for (const [j, img] of batch.entries()) {
    const n = (st.done ?? 0) + j;
    const r = await fetch(img.url);
    if (!r.ok) throw new Error(`mockup download ${r.status}`);
    const buf = await sharp(Buffer.from(await r.arrayBuffer())).resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toBuffer();
    const url = await uploadObject(`catalog/media/${st.slug}/${st.productId!.slice(0, 8)}-${st.mediaVer}-${n}.webp`, buf, "image/webp", { immutable: true });
    uploaded.push({ url, alt: [product?.name, img.color !== "_" ? img.color : null, img.title || null].filter(Boolean).join(" — "), kind: img.kind, color: img.color });
  }
  const done = (st.done ?? 0) + batch.length;
  const next: Phase = done >= (st.pending ?? []).length ? "swap" : "images";
  await save(row, { phase: next, state: { ...st, done, uploaded } });
  return { key: productKey, phase: next, done: false, message: `${done}/${(st.pending ?? []).length} fotos` };
}

async function stepSwap(row: Row, productKey: string): Promise<RefreshResult> {
  const sb = db();
  const st = row.state;
  const productId = st.productId!;
  const { data: old } = await sb.from("product_images").select("id, url, alt, sort, kind, variant_id").eq("product_id", productId).neq("kind", "PRINT_FILE");
  // backup first, so the previous gallery can be restored from the job state
  await save(row, { state: { ...st, previous: (old ?? []).map(({ url, alt, sort, kind, variant_id }) => ({ url, alt, sort, kind, variant_id })) } });
  const { data: pvars } = await sb.from("product_variants").select("id, color").eq("product_id", productId);
  const variantFor = (color: string) => (pvars ?? []).find((v) => (v.color ?? "_") === color)?.id ?? null;
  const rows = (st.uploaded ?? []).map((u, i) => ({ product_id: productId, url: u.url, alt: u.alt, sort: i, kind: u.kind, variant_id: variantFor(u.color) }));
  if (!rows.length) throw new Error("NOTHING_TO_SWAP");
  const { error: insErr } = await sb.from("product_images").insert(rows);
  if (insErr) throw new Error(`images insert: ${insErr.message}`);
  const oldIds = (old ?? []).map((o) => o.id);
  if (oldIds.length) {
    const { error: delErr } = await sb.from("product_images").delete().in("id", oldIds);
    if (delErr) throw new Error(`old images: ${delErr.message}`);
  }
  // first photo of each colour → that colour's variant image; first photo → social preview
  const firstOf = new Map<string, string>();
  for (const u of st.uploaded ?? []) if (!firstOf.has(u.color)) firstOf.set(u.color, u.url);
  for (const [color, url] of firstOf) if (color !== "_") await sb.from("product_variants").update({ image: url }).eq("product_id", productId).eq("color", color);
  await sb.from("products").update({ og_image: rows[0].url }).eq("id", productId);
  await save(row, { phase: "done", error: null });
  return { key: productKey, phase: "done", done: true, message: `${rows.length} fotos nuevas` };
}

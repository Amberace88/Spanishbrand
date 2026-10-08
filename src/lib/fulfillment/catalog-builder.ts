import { assetBase } from "@/lib/catalog/assets";
import "server-only";
import { imageOps } from "@/lib/image";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { slugify } from "@/lib/format";
import { log } from "@/lib/logger";
import { getCatalogProduct, listCatalogProducts } from "@/lib/fulfillment/printful/catalog";
import { createMockupTask, getMockupTask, getPrintfiles, getSizeGuide } from "@/lib/fulfillment/printful/mockups";
import { getUnitPrice, searchProductsFiltered } from "@/lib/fulfillment/gelato/catalog";
import * as printify from "@/lib/fulfillment/printify";
import { getProdigiProduct, mapProdigiVariant, quote as prodigiQuote, variantId as prodigiVariantId } from "@/lib/fulfillment/prodigi";
import { isProviderError } from "@/lib/fulfillment/errors";
import { publishProduct, runFulfillmentTest } from "@/lib/products/admin-service";
import { renderPrintFile } from "@/lib/personalization/render";
import { PRESETS, TEMPLATE_INFO } from "@/lib/personalization/presets";
import { uploadObject } from "@/lib/personalization/storage";
import type { PersoConfig, TemplateKey } from "@/lib/personalization/types";
import { EMB_FONTS, EMB_MAX_COLORS, EMB_MAX_LAYERS, KINDS, THREADS } from "@/lib/personalization/kinds";
import type { StaffSession } from "@/lib/auth/rbac";
import { FALLBACK_COLLECTIONS } from "@/lib/products/queries";
import { BLUEPRINTS, normSize, posterSize, retail, type Blueprint } from "@/lib/catalog/blueprints";
import { ACTIVE_DESIGNS, designBySlug, type BlueprintKey, type Design, type Tone } from "@/lib/catalog/designs";
import { renderDesign } from "@/lib/catalog/render";
import { LEON_EXTRAS } from "@/lib/catalog/leon";
import { AUDIENCE_BLUEPRINTS } from "@/lib/catalog/blueprints";
import { AUDIENCE_EXTRAS } from "@/lib/catalog/audience";
import { createHash } from "node:crypto";
import { familyDesigns } from "@/lib/catalog/family";
import { FUTBOL_AOP, FUTBOL_CITIES } from "@/lib/catalog/futbol-pro";
import { mockupArtUrl } from "@/lib/catalog/mockup-art";
import { designVersion, effectiveLayers } from "@/lib/catalog/print-safety";
import VERSION_BASELINE from "@/lib/catalog/design-version-baseline.json";
import { altStyleTag, isKidsBlueprint, orderKidsImages, pickOptionGroups, styleOf, type MockupStyle } from "@/lib/fulfillment/mockup-styles";

/* ───────────────────────── plan ───────────────────────── */

export interface PlanItem {
  key: string;
  kind: "RESOLVE" | "PRODUCT";
  label: string;
}

/** Blank products for "Diseña tú mismo". */
/** Extra retail for a second (back) print: Printful charges ≈ 5–6 € per additional placement. */
const BACK_PRINT_PRICE = 7;

const BLANKS: { bp: BlueprintKey; placements: ("front" | "back")[]; tones?: Tone[] }[] = [
  { bp: "tee", placements: ["front", "back"] },
  { bp: "hoodie", placements: ["front", "back"] },
  { bp: "tote", placements: ["front"] },
  /* Designer catalogue (kinds.ts holds the print area, layout and picker category of each).
   * Colours: blanks keep ≤ 4 (2 dark + 2 light) per garment; the back placement is offered only when the
   * resolved provider product prints there. Socks are left out: the sublimation sock template (two socks,
   * heel/toe zones) is not a simple rectangle a customer can design on safely. */
  { bp: "sweat", placements: ["front", "back"] },
  { bp: "womtee", placements: ["front", "back"] },
  { bp: "womsweat", placements: ["front", "back"] },
  { bp: "womcrop", placements: ["front"] },
  { bp: "kids", placements: ["front", "back"] },
  { bp: "kidshoodie", placements: ["front"] },
  { bp: "toddler", placements: ["front"] },
  { bp: "baby", placements: ["front"] },
  { bp: "mug", placements: ["front"], tones: ["light"] }, // white glossy mug: full-colour, any background
  { bp: "pillow", placements: ["front"] },
  { bp: "towel", placements: ["front"] },
  { bp: "blanket", placements: ["front"] },
  { bp: "apron", placements: ["front"] },
  { bp: "phonecase", placements: ["front"] },
  { bp: "sticker", placements: ["front"] },
  { bp: "tumbler", placements: ["front"] },
  { bp: "flag", placements: ["front"] },
  { bp: "poster", placements: ["front"] },
  { bp: "framed", placements: ["front"] },
  { bp: "canvas", placements: ["front"] },
  // Embroidery (text only, ≤ 3 brand thread colours — see kinds.ts THREADS / validate.ts EMB_LIMITS)
  { bp: "cap", placements: ["front"] },
  { bp: "dadhat", placements: ["front"] },
  { bp: "trucker", placements: ["front"] },
  { bp: "beanie", placements: ["front"] },
];

/** Personalization config of a designer blank: print-area ratio, layout and limits come from kinds.ts. */
function blankConfig(b: (typeof BLANKS)[number], res: { placements: string[] }): PersoConfig {
  const k = KINDS[b.bp];
  const placements = b.placements.filter((p) => p === "front" || res.placements.includes("back"));
  const emb = k?.layout === "emb";
  return {
    mode: "designer",
    placements,
    extraPrice: emb ? 6 : 5,
    maxLayers: emb ? EMB_MAX_LAYERS : 8,
    ...(k ? { kind: k.key, aspect: k.aspect } : {}),
    ...(placements.includes("back") ? { backPrice: BACK_PRINT_PRICE } : {}),
    ...(emb ? { embroidery: { threads: THREADS.map((t) => t.hex), maxColors: EMB_MAX_COLORS, fonts: EMB_FONTS } } : {}),
  };
}

/** Mockup artwork for embroidered blanks: thread colours only. */
const PLACEHOLDER_EMB: Design = {
  slug: "tu-diseno",
  collection: "esenciales",
  name: "Tu bordado",
  line: "",
  tone: "dark",
  products: [],
  layers: [
    { id: "a", type: "text", text: "TU NOMBRE", font: "sport", color: "#ffcc00", x: 0.5, y: 0.4, w: 0.8, rotation: 0 },
    { id: "b", type: "text", text: "ESPAÑA", font: "serif", color: "#cc3333", x: 0.5, y: 0.62, w: 0.42, rotation: 0 },
  ],
};
/** Fill-in template products for "Personaliza". */
const TEMPLATES: { template: TemplateKey; bp: BlueprintKey; tone: Tone; sample: Record<string, string> }[] = [
  { template: "jersey", bp: "tee", tone: "dark", sample: { name: "GARCÍA", number: "10" } },
  { template: "jersey", bp: "hoodie", tone: "dark", sample: { name: "LÓPEZ", number: "7" } },
  { template: "pueblo", bp: "tee", tone: "dark", sample: { pueblo: "VILLAJOYOSA" } },
  { template: "year", bp: "tee", tone: "dark", sample: { year: "1985", name: "FAMILIA LÓPEZ" } },
  { template: "pueblo", bp: "tote", tone: "dark", sample: { pueblo: "CUENCA" } },
];

const resKey = (bp: BlueprintKey, tone: Tone) => (BLUEPRINTS[bp].alt?.[tone] ? `res:${bp}:${tone}` : `res:${bp}`);

/** Extra products (Printify / Prodigi range) per design, on top of each design's own list. */
export const EXTRAS: Partial<Record<BlueprintKey, string[]>> = {
  framed: [], // filled below: every design that has a poster
  // only active designs (lib/catalog/retired.ts); the art series already carries canvas and pillow itself
  canvas: ["firma-leon", "ciudad-madrid-cartel", "ciudad-sevilla-cartel", "ciudad-barcelona-cartel"],
  towel: ["arte-chiringuito", "arte-faro", "arte-barca", "espana-bandas", "ciudad-malaga-cartel", "ciudad-cadiz-cartel"],
  apron: ["sab-has-comido", "sab-croquetas"],
  pillow: ["firma-leon", "sab-familia-primero", "sab-pan-y-cebolla"],
  bandana: ["espana-bandas", "fp-campeones-bandas", "fp-bufanda-espana"],
  phonecase: ["firma-leon", "espana-bandas", "arte-chiringuito", "arte-paella"],
  // Puzzles and doormats: no EU print provider at Printful/Printify/Gelato/Prodigi → not offered (customs + slow delivery).
  glass: ["arte-vino", "arte-vermut", "arte-jamon"],
  coaster: ["arte-vino", "arte-vermut", "arte-paella", "arte-churros", "arte-jamon"],
  tumbler: ["firma-leon", "oficio-medicina-arte", "oficio-enfermeria-arte", "oficio-bomberos-arte", "oficio-docente-arte", "fp-campeones-mundo-noche"],
  flag: ["espana-bandas", "firma-leon", "fp-campeones-bandas", "ciudad-madrid-cartel", "ciudad-barcelona-cartel", "ciudad-sevilla-cartel", "ciudad-valencia-cartel"],
  postcard: ["arte-toro", "arte-alhambra", "arte-faro", "arte-pueblo-blanco", "arte-peregrino", "arte-feria", "arte-fallas", "ciudad-madrid-cartel", "ciudad-sevilla-cartel"],
  blanket: ["firma-leon", "espana-bandas", "arte-toro", "arte-chiringuito", "ciudad-madrid-cartel", "ciudad-barcelona-cartel"],
};

export function productsFor(d: Design): BlueprintKey[] {
  const list = new Set<BlueprintKey>(d.products);
  if (d.products.includes("poster")) list.add("framed");
  for (const [bp, slugs] of Object.entries(EXTRAS) as [BlueprintKey, string[]][]) if (slugs.includes(d.slug)) list.add(bp);
  for (const [bp, slugs] of Object.entries(LEON_EXTRAS) as [BlueprintKey, string[]][]) if (slugs.includes(d.slug)) list.add(bp);
  for (const [bp, slugs] of Object.entries(AUDIENCE_EXTRAS) as [BlueprintKey, string[]][]) if (slugs.includes(d.slug)) list.add(bp);
  return [...list];
}

export function buildPlan(): PlanItem[] {
  const res = new Set<string>();
  const products: PlanItem[] = [];
  // retired designs (lib/catalog/retired.ts) never get new jobs; their definitions stay for old orders
  for (const d of ACTIVE_DESIGNS) {
    for (const bp of productsFor(d)) {
      res.add(resKey(bp, d.tone));
      products.push({ key: `p:${d.slug}:${bp}`, kind: "PRODUCT", label: `${d.name} — ${BLUEPRINTS[bp].label}` });
    }
  }
  for (const b of BLANKS) {
    for (const tone of b.tones ?? (["dark", "light"] as Tone[])) res.add(resKey(b.bp, tone));
    products.push({ key: `b:${b.bp}`, kind: "PRODUCT", label: `${BLUEPRINTS[b.bp].label} personalizada` });
  }
  for (const t of TEMPLATES) {
    res.add(resKey(t.bp, t.tone));
    products.push({ key: `t:${t.template}:${t.bp}`, kind: "PRODUCT", label: `${TEMPLATE_INFO[t.template].title} — ${BLUEPRINTS[t.bp].label}` });
  }
  return [...[...res].map((key) => ({ key, kind: "RESOLVE" as const, label: key })), ...products];
}

/* ───────────────────────── job state ───────────────────────── */

type Phase = "new" | "test" | "mockup" | "poll" | "images" | "publish" | "done" | "failed";
interface JobRow {
  key: string;
  kind: "RESOLVE" | "PRODUCT";
  phase: Phase;
  product_id: string | null;
  state: Record<string, unknown>;
  error: string | null;
  attempts: number;
}

export interface StepResult {
  key: string;
  phase: Phase | "busy";
  done: boolean;
  waitMs?: number;
  error?: string;
  message?: string;
}

async function loadJob(key: string, kind: JobRow["kind"]): Promise<JobRow> {
  const sb = db();
  const { data } = await sb.from("catalog_jobs").select("key, kind, phase, product_id, state, error, attempts").eq("key", key).maybeSingle();
  if (data) return data as JobRow;
  const row = { key, kind, phase: "new" as Phase, product_id: null, state: {}, error: null, attempts: 0 };
  await sb.from("catalog_jobs").insert({ ...row, brand_id: env.brandId() });
  return row;
}

async function save(job: JobRow, patch: Partial<JobRow>) {
  Object.assign(job, patch);
  await db().from("catalog_jobs").update({ phase: job.phase, product_id: job.product_id, state: job.state, error: job.error, attempts: job.attempts }).eq("key", job.key);
}

/** All jobs, paged: PostgREST caps a single response at 1000 rows, and jobs beyond that looked "fresh" to the
 *  batch runner, which then spent every run re-visiting finished jobs (the builder stalled at ~1000 jobs). */
export async function listJobs() {
  const out: { key: string; kind: string; phase: string; product_id: string | null; error: string | null; attempts: number; updated_at: string; locked_until: string | null; replaces: string | null; design_version: string | null; rebuild_tag: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from("catalog_jobs")
      .select("key, kind, phase, product_id, error, attempts, updated_at, locked_until, replaces:state->>replaces, design_version:state->>designVersion, rebuild_tag:state->>rebuildTag")
      .eq("brand_id", env.brandId())
      .order("key")
      .range(from, from + 999);
    if (error) throw new Error(`catalog_jobs: ${error.message}`);
    out.push(...((data ?? []) as typeof out));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/* ───────────────────────── resolve provider products ───────────────────────── */

interface Resolved {
  provider: "printful" | "gelato" | "printify" | "prodigi";
  /** Printify/Prodigi: the exact variant set to offer (already filtered). */
  variantIds?: string[];
  blueprintId?: number;
  printProviderId?: number;
  rowId: string;
  externalId: string;
  title: string;
  printfile: { width: number; height: number };
  placements: string[];
  sizeGuide?: unknown;
  paper?: string;
  /** Printful: the placement (file type) the print file goes to. */
  placement?: string;
  /** All-over products: print file size of every extra panel (back, sleeves) that gets its own file. */
  panels?: Record<string, { width: number; height: number }>;
}

async function resolved(key: string): Promise<Resolved | null> {
  const { data } = await db().from("catalog_jobs").select("phase, state").eq("key", key).maybeSingle();
  return data?.phase === "done" ? ((data.state as { resolved?: Resolved }).resolved ?? null) : null;
}

async function upsertProviderProduct(provider: string, externalId: string, fields: Record<string, unknown>) {
  const { data, error } = await db()
    .from("provider_products")
    .upsert({ provider_id: provider, external_id: externalId, review_status: "APPROVED", available: true, eligible: true, last_seen_at: new Date().toISOString(), ...fields }, { onConflict: "provider_id,external_id" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`provider_products upsert: ${error?.message}`);
  return data.id as string;
}

async function upsertVariants(rowId: string, provider: string, variants: { externalId: string; name: string; size: string | null; color: string | null; colorCode: string | null; cost: number | null; currency: string | null; status: string; raw?: unknown }[]) {
  const now = new Date().toISOString();
  const rows = variants.map((v) => ({
    provider_product_id: rowId,
    provider_id: provider,
    external_id: v.externalId,
    name: v.name,
    size: v.size,
    color: v.color,
    color_code: v.colorCode,
    cost: v.cost,
    currency: v.currency,
    status: v.status,
    raw: (v.raw ?? {}) as object,
    last_seen_at: now,
  }));
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await db().from("provider_variants").upsert(rows.slice(i, i + 400), { onConflict: "provider_id,external_id" });
    if (error) throw new Error(`provider_variants upsert: ${error.message}`);
  }
}

/** Printful's full catalogue is large and slow to fetch: keep it per server instance for 6 h. */
let catalogCache: { at: number; list: Awaited<ReturnType<typeof listCatalogProducts>> } | null = null;
async function cachedCatalog() {
  if (!catalogCache || Date.now() - catalogCache.at > 6 * 3600_000) catalogCache = { at: Date.now(), list: await listCatalogProducts() };
  return catalogCache.list;
}

/** Thrown when a resolve runs out of its time slice; the tried candidates are kept so the next run continues. */
class ResolveContinue extends Error {
  constructor(public tried: string[]) {
    super("RESOLVE_CONTINUE");
  }
}

async function resolvePrintful(bp: Blueprint, tone: Tone | null, ctx: { deadline: number; tried: string[] } = { deadline: Infinity, tried: [] }): Promise<Resolved> {
  const spec = (tone && bp.alt?.[tone]) || bp;
  const ok = (title: string) => spec.match.test(title) && !(spec.exclude?.test(title) ?? false);
  // Candidates: preferred IDs first, then catalog matches. A candidate must have a printable (non-embroidery)
  // placement for the blueprint — some Printful products only offer embroidery in a region.
  // Embroidery blueprints need an embroidery placement; every other blueprint needs a printable one.
  const wantsEmb = bp.technique === "EMBROIDERY";
  const printable = (pl: string) => (wantsEmb ? /embroider/i.test(pl) : !/embroider/i.test(pl));
  const tried = new Set<string>();
  const skipped = new Set(ctx.tried); // rejected by an earlier time slice
  let found: Awaited<ReturnType<typeof getCatalogProduct>> | null = null;
  let pfiles: Awaited<ReturnType<typeof getPrintfiles>> | null = null;
  let place = "";
  const consider = async (cid: string) => {
    if (tried.has(cid) || skipped.has(cid) || found) return;
    if (Date.now() > ctx.deadline) throw new ResolveContinue([...skipped, ...tried]);
    tried.add(cid);
    try {
      const p = await getCatalogProduct(cid);
      if (p.product.discontinued || !ok(p.product.title)) return;
      // ranked (audience) blueprints: skip candidates without EU production instead of failing on the first one
      if (bp.prefer && !p.variants.some((v) => Object.entries(v.availability ?? {}).some(([r, st]) => r.startsWith("EU") && /in_stock|stocked_on_demand|active/i.test(String(st))))) return;
      const pf = await getPrintfiles(cid, wantsEmb ? "EMBROIDERY" : undefined);
      const pls = Object.keys(pf.variant_printfiles[0]?.placements ?? {}).filter(printable);
      const pick = pls.includes(bp.placement) ? bp.placement : wantsEmb ? (pls.find((x) => /front|chest_left|chest_center/.test(x)) ?? pls[0] ?? null) : pls.includes("default") ? "default" : pls.find((x) => x === "front" || x.startsWith("front")) ?? null;
      if (!pick) return;
      found = p;
      pfiles = pf;
      place = pick;
    } catch {
      /* try the next candidate */
    }
  };
  for (const cid of spec.preferredIds ?? []) await consider(cid);
  if (!found) {
    const all = await cachedCatalog();
    const rankOf = (title: string) => {
      const i = bp.prefer?.findIndex((re) => re.test(title)) ?? -1;
      return i < 0 ? 99 : i;
    };
    const cands = all.filter((p) => !p.discontinued && ok(p.title));
    if (bp.prefer) cands.sort((a, b) => rankOf(a.title) - rankOf(b.title));
    for (const c of cands.slice(0, bp.prefer ? 10 : 6)) await consider(c.externalId);
  }
  if (!found || !pfiles) throw new Error(`No printable Printful product matches ${spec.match}`);
  const fp = found as Awaited<ReturnType<typeof getCatalogProduct>>;
  const p = fp.product;
  const pfs = pfiles as Awaited<ReturnType<typeof getPrintfiles>>;
  const firstVariant = pfs.variant_printfiles[0];
  const placements = Object.keys(firstVariant?.placements ?? {}).filter(printable);
  const pfId = firstVariant?.placements[place];
  const pf = pfs.printfiles.find((x) => x.printfile_id === pfId) ?? pfs.printfiles[0];
  let sizeGuide: unknown;
  if (["tee", "hoodie", "sweat", "kids", "jersey", "teeoversize", "hoodieoversize"].includes(bp.key) || AUDIENCE_BLUEPRINTS.includes(bp.key)) {
    try {
      sizeGuide = await getSizeGuide(p.externalId);
    } catch {
      sizeGuide = undefined;
    }
  }
  const rowId = await upsertProviderProduct("printful", p.externalId, {
    title: p.title,
    type: p.type,
    brand: p.brand,
    model: p.model,
    image: p.image,
    internal_category_code: bp.category,
    techniques: p.techniques,
    placements,
    variant_count: fp.variants.length,
    discontinued: false,
    currency: p.currency ?? fp.variants[0]?.currency ?? null,
    raw: p.raw as object,
  });
  // EU production only: variants without an EU facility are stored as unavailable so they are never sold.
  const euOk = (v: (typeof fp.variants)[number]) => Object.entries(v.availability ?? {}).some(([r, st]) => r.startsWith("EU") && /in_stock|stocked_on_demand|active/i.test(String(st)));
  const euVariants = fp.variants.filter(euOk);
  if (!euVariants.length) throw new Error(`${p.title}: sin producción en la UE en Printful`);
  await upsertVariants(rowId, "printful", fp.variants.map((v) => (euOk(v) ? v : { ...v, status: "OUT_OF_STOCK" })));
  const variantIds = bp.variantFilter || bp.maxVariants ? euVariants.filter((v) => !bp.variantFilter || bp.variantFilter.test(v.name)).slice(0, bp.maxVariants ?? 24).map((v) => v.externalId) : undefined;
  if (variantIds && !variantIds.length) throw new Error(`${p.title}: ninguna variante UE coincide con ${bp.variantFilter}`);
  // Huge print areas (beach towel 9300×4800) can't be rendered inside a serverless step; Printful accepts any
  // file with the same aspect ratio and scales it, so cap the longest side.
  const cap = Math.min(1, 4800 / Math.max(pf.width, pf.height));
  // all-over products: every extra panel (back, sleeves) gets its own file at its own size
  let panels: Resolved["panels"];
  if (bp.aopPanels) {
    panels = {};
    for (const pl of bp.aopPanels.filter((x) => placements.includes(x) && x !== place)) {
      const f = pfs.printfiles.find((x) => x.printfile_id === firstVariant?.placements[pl]);
      if (!f) continue;
      const k = Math.min(1, 4800 / Math.max(f.width, f.height));
      panels[pl] = { width: Math.round(f.width * k), height: Math.round(f.height * k) };
    }
  }
  return { provider: "printful", rowId, externalId: p.externalId, title: p.title, printfile: { width: Math.round(pf.width * cap), height: Math.round(pf.height * cap) }, placements, placement: place, sizeGuide, variantIds, panels };
}

/** Gelato A3 portrait wall calendar (printed in Spain). The print file is a static 14-page PDF per design. */
async function resolveGelatoCalendar(bp: Blueprint): Promise<Resolved> {
  let found: { productUid: string } | undefined;
  for (let offset = 0; offset < 600 && !found; offset += 100) {
    const page = await searchProductsFiltered("calendars", null, 100, offset).catch(() => []);
    found = page.find((p) => bp.match.test(p.productUid) && /250-gsm/.test(p.productUid)) ?? page.find((p) => bp.match.test(p.productUid));
    if (page.length < 100) break;
  }
  if (!found) throw new Error("No Gelato A3 portrait wall calendar found");
  const price = await getUnitPrice(found.productUid).catch(() => null);
  const rowId = await upsertProviderProduct("gelato", "calendars", { title: "Wall calendar A3", type: "CALENDAR", internal_category_code: "STATIONERY", techniques: ["DIGITAL"], placements: ["default"], variant_count: 1, discontinued: false, currency: "EUR" });
  await upsertVariants(rowId, "gelato", [{ externalId: found.productUid, name: "A3 · 29,7 × 42 cm", size: "A3", color: null, colorCode: null, cost: price?.price ?? null, currency: price?.currency ?? "EUR", status: "ACTIVE", raw: found }]);
  return { provider: "gelato", rowId, externalId: "calendars", title: "Calendario A3", printfile: { width: 3602, height: 5055 }, placements: ["default"], variantIds: [found.productUid] };
}

async function resolveGelatoPoster(bp: Blueprint): Promise<Resolved> {
  const formats = ["300x400-mm-12x16-inch", "450x600-mm-18x24-inch", "600x800-mm-24x32-inch"];
  let products: Awaited<ReturnType<typeof searchProductsFiltered>> = [];
  const queries: (Record<string, string[]> | null)[] = [{ Orientation: ["ver"], PaperFormat: formats }, { Orientation: ["ver"] }, null];
  const enough = () => formats.every((f) => products.some((p) => bp.match.test(p.productUid) && p.productUid.includes(f)));
  for (const filters of queries) {
    // the "posters" catalog also holds cards etc. — page through until every wanted size shows up
    for (let offset = 0; offset < 2000 && !enough(); offset += 100) {
      let page: typeof products = [];
      try {
        page = await searchProductsFiltered("posters", filters, 100, offset);
      } catch {
        break;
      }
      products.push(...page.filter((p) => bp.match.test(p.productUid)));
      if (page.length < 100) break;
    }
    if (products.length) break;
  }
  const cand = products.filter((p) => bp.match.test(p.productUid) && /_ver$/.test(p.productUid) && /4-0/.test(p.productUid) && p.isPrintable !== false);
  if (!cand.length) throw new Error("No Gelato flat poster products found");
  // one paper type available for as many sizes as possible (prefer uncoated matte)
  const paperOf = (uid: string) => uid.split("_")[2] ?? "";
  const papers = [...new Set(cand.map((p) => paperOf(p.productUid)))];
  const score = (paper: string) => cand.filter((p) => paperOf(p.productUid) === paper).length * 10 + (/200-gsm.*uncoated/.test(paper) ? 3 : /170-gsm.*uncoated/.test(paper) ? 2 : /uncoated/.test(paper) ? 1 : 0);
  const paper = papers.sort((a, b) => score(b) - score(a))[0];
  const chosen = formats.map((f) => cand.find((p) => paperOf(p.productUid) === paper && p.productUid.includes(f))).filter(Boolean) as typeof cand;
  const variants = [];
  for (const p of chosen) {
    const price = await getUnitPrice(p.productUid).catch(() => null);
    variants.push({ externalId: p.productUid, name: posterSize(p.productUid) ?? p.productUid, size: posterSize(p.productUid), color: null, colorCode: null, cost: price?.price ?? null, currency: price?.currency ?? "EUR", status: "ACTIVE", raw: p });
  }
  const rowId = await upsertProviderProduct("gelato", "posters", { title: "Posters", type: "POSTER", internal_category_code: "WALL_ART", techniques: ["DIGITAL"], placements: ["default"], variant_count: variants.length, discontinued: false, currency: "EUR" });
  await upsertVariants(rowId, "gelato", variants);
  return { provider: "gelato", rowId, externalId: "posters", title: "Póster", printfile: { width: 2400, height: 3200 }, placements: ["default"], paper };
}

const EU = ["ES", "PT", "FR", "DE", "IT", "NL", "BE", "LU", "AT", "IE", "PL", "CZ", "SK", "SI", "HU", "RO", "BG", "HR", "GR", "LV", "LT", "EE", "SE", "DK", "FI"];

async function resolvePrintify(bp: Blueprint): Promise<Resolved> {
  // Only European print providers: no customs/import VAT for Spanish customers and short delivery.
  // Start from the EU providers and the blueprints they make (a title search alone hits US/GB-only listings first).
  const [all, euIdx] = await Promise.all([printify.listBlueprints(), printify.euProviderIndex(EU)]);
  const byId = new Map(all.map((b) => [b.id, b]));
  const matches = (title: string) => bp.match.test(title) && !(bp.exclude?.test(title) ?? false);
  const rank = (c: string) => (c === "ES" ? 0 : ["PT", "FR", "IT", "DE", "NL", "BE"].includes(c) ? 1 : 2);
  const options = euIdx
    .flatMap((pp) => pp.blueprints.filter((b) => matches(b.title) && byId.has(b.id)).map((b) => ({ b: byId.get(b.id)!, pp: { id: pp.id, title: pp.title }, country: pp.country })))
    .sort((a, b) => rank(a.country) - rank(b.country) || all.indexOf(a.b) - all.indexOf(b.b));
  if (!options.length) {
    const anyTitle = all.some((b) => matches(b.title));
    throw new Error(anyTitle ? `Sin proveedor europeo en Printify para ${bp.label} (${euIdx.length} proveedores UE revisados)` : `No Printify blueprint matches ${bp.match}`);
  }
  const pick = options[0];
  const raw = await printify.providerVariants(String(pick.b.id), String(pick.pp.id));
  const position = (v: (typeof raw)[number]) => v.placeholders?.find((p) => p.position === bp.placement) ?? v.placeholders?.[0];
  let vs = raw.filter((v) => position(v));
  if (bp.variantFilter) vs = vs.filter((v) => bp.variantFilter!.test(v.title));
  const ref = vs[0] && position(vs[0])!;
  if (!ref) throw new Error("Printify variants have no placeholders");
  const aspect = ref.height / ref.width;
  vs = vs.filter((v) => Math.abs(position(v)!.height / position(v)!.width - aspect) / aspect < 0.05).slice(0, bp.maxVariants ?? 12);
  const external = `${pick.b.id}:${pick.pp.id}`;
  const rowId = await upsertProviderProduct("printify", external, { title: `${pick.b.title} · ${pick.pp.title}`, type: bp.productType, brand: pick.b.brand ?? null, model: pick.b.model ?? null, image: pick.b.images?.[0] ?? null, internal_category_code: bp.category, techniques: [bp.technique], placements: [ref.position], variant_count: vs.length, discontinued: false, currency: "EUR", raw: { blueprint: pick.b, provider: pick.pp, country: pick.country } as object });
  await upsertVariants(rowId, "printify", vs.map((v) => printify.mapPrintifyVariant(v)));
  const scale = Math.min(1, 3600 / Math.max(ref.width, ref.height));
  return { provider: "printify", rowId, externalId: external, title: `${pick.b.title} (${pick.pp.title}, ${pick.country || "?"})`, printfile: { width: Math.round(ref.width * scale), height: Math.round(ref.height * scale) }, placements: [ref.position], variantIds: vs.map((v) => String(v.id)), blueprintId: pick.b.id, printProviderId: pick.pp.id };
}

async function resolveProdigi(bp: Blueprint): Promise<Resolved> {
  const variants: ReturnType<typeof mapProdigiVariant>[] = [];
  let printfile: { width: number; height: number } | null = null;
  for (const s of bp.skus ?? []) {
    let p: Awaited<ReturnType<typeof getProdigiProduct>>;
    try {
      p = await getProdigiProduct(s.sku);
    } catch {
      continue;
    }
    // attribute combinations: preferred values for the "colour" attribute (several = frame colour choice), first value for the rest
    const choices: Record<string, string[]> = {};
    for (const [attr, values] of Object.entries(p.attributes ?? {})) {
      const pref = bp.attrPrefs?.[attr];
      const wanted = pref ? [...(pref.any ?? []), ...(pref.dark ?? []), ...(pref.light ?? [])] : [];
      const avail = wanted.filter((w, i, a) => values.includes(w) && a.indexOf(w) === i);
      choices[attr] = (avail.length ? avail : [values[0]]).slice(0, attr === "color" ? 2 : 1);
    }
    const combos = Object.entries(choices).reduce<Record<string, string>[]>((acc, [k, vals]) => acc.flatMap((c) => vals.map((v) => ({ ...c, [k]: v }))), [{}]);
    for (const attrs of combos) {
      const q = await prodigiQuote([{ sku: p.sku, attributes: attrs, copies: 1 }], "ES").catch(() => null);
      const item = q?.quotes.find((x) => x.shipmentMethod === "Standard") ?? q?.quotes[0];
      const cost = item ? Number(item.costSummary.items.amount) : null;
      const label = s.label;
      const v = mapProdigiVariant(p.sku, attrs, label, cost);
      v.size = label;
      v.color = attrs.color ? attrs.color.charAt(0).toUpperCase() + attrs.color.slice(1) : null;
      v.colorCode = attrs.color ? ({ black: "#111111", white: "#f5f5f5", natural: "#c8a679" } as Record<string, string>)[attrs.color.toLowerCase()] ?? null : null;
      variants.push(v);
    }
    const size = p.variants[0]?.printAreaSizes?.default;
    if (!printfile && size) {
      const k = Math.min(1, 3200 / Math.max(size.horizontalResolution, size.verticalResolution));
      printfile = { width: Math.round(size.horizontalResolution * k), height: Math.round(size.verticalResolution * k) };
    }
  }
  if (!variants.length) throw new Error(`No Prodigi SKU available for ${bp.key}`);
  const external = `prodigi-${bp.key}`;
  const rowId = await upsertProviderProduct("prodigi", external, { title: bp.label, type: bp.productType, internal_category_code: bp.category, techniques: [bp.technique], placements: ["default"], variant_count: variants.length, discontinued: false, currency: "EUR" });
  await upsertVariants(rowId, "prodigi", variants);
  return { provider: "prodigi", rowId, externalId: external, title: `${bp.label} (${variants.length} variantes)`, printfile: printfile ?? { width: 2400, height: 3200 }, placements: ["default"], variantIds: variants.map((v) => v.externalId) };
}

async function stepResolve(job: JobRow): Promise<StepResult> {
  const [, bpKey, tone] = job.key.split(":") as [string, BlueprintKey, Tone | undefined];
  const bp = BLUEPRINTS[bpKey];
  let r: Resolved;
  try {
    const tried = ((job.state as { tried?: string[] }).tried ?? []) as string[];
    r = bp.provider === "gelato" ? (bp.key === "calendar" ? await resolveGelatoCalendar(bp) : await resolveGelatoPoster(bp)) : bp.provider === "printify" ? await resolvePrintify(bp) : bp.provider === "prodigi" ? await resolveProdigi(bp) : await resolvePrintful(bp, tone ?? null, { deadline: Date.now() + 12_000, tried });
  } catch (e) {
    if (!(e instanceof ResolveContinue)) throw e;
    // out of time: remember which candidates were rejected and continue on the next run (never blocks a whole batch)
    if (job.attempts >= 10) throw new Error(`No se encontró producto base a tiempo (${e.tried.length} candidatos probados)`);
    await save(job, { state: { tried: e.tried }, attempts: job.attempts + 1 });
    return { key: job.key, phase: "new", done: false, waitMs: 1000, message: `buscando producto base (${e.tried.length} probados)` };
  }
  await save(job, { phase: "done", state: { resolved: r }, error: null });
  return { key: job.key, phase: "done", done: true, message: `${r.title} (${r.externalId}) · ${r.printfile.width}×${r.printfile.height}` };
}

/* ───────────────────────── product creation ───────────────────────── */

const PLACEHOLDER: Design = {
  slug: "tu-diseno",
  collection: "esenciales",
  name: "Tu diseño",
  line: "",
  tone: "dark",
  products: [],
  layers: [
    { id: "a", type: "text", text: "TU DISEÑO", font: "sport", color: "#c8102e", x: 0.5, y: 0.25, w: 0.8, rotation: 0 },
    { id: "b", type: "text", text: "aquí", font: "script", color: "#d4a62a", x: 0.5, y: 0.4, w: 0.36, rotation: -6 },
    { id: "c", type: "image", path: "art/stripes-rg.png", url: "/catalog/art/stripes-rg.png", aspect: 0.1382, x: 0.5, y: 0.52, w: 0.5, rotation: 0 },
  ],
};

interface Spec {
  kind: "design" | "blank" | "template";
  bp: Blueprint;
  tones: Tone[];
  design: Design;
  template?: (typeof TEMPLATES)[number];
  blank?: (typeof BLANKS)[number];
}

function specFor(key: string): Spec {
  const parts = key.split(":");
  if (parts[0] === "p") {
    const design = designBySlug(parts[1]);
    if (!design) throw new Error(`Unknown design ${parts[1]}`);
    return { kind: "design", bp: BLUEPRINTS[parts[2] as BlueprintKey], tones: [design.tone], design };
  }
  if (parts[0] === "b") {
    const blank = BLANKS.find((b) => b.bp === parts[1])!;
    return { kind: "blank", bp: BLUEPRINTS[blank.bp], tones: blank.tones ?? ["dark", "light"], design: KINDS[blank.bp]?.layout === "emb" ? PLACEHOLDER_EMB : PLACEHOLDER, blank };
  }
  const template = TEMPLATES.find((t) => t.template === parts[1] && t.bp === parts[2]);
  if (!template) throw new Error(`Unknown template job ${key}`);
  return { kind: "template", bp: BLUEPRINTS[template.bp], tones: [template.tone], design: PLACEHOLDER, template };
}

const TYPE_ES: Record<BlueprintKey, string> = { tee: "camiseta", hoodie: "sudadera con capucha", sweat: "sudadera", mug: "taza", tote: "bolsa tote", poster: "póster", sticker: "pegatina", kids: "camiseta infantil", framed: "lámina enmarcada", canvas: "lienzo", towel: "toalla de playa", apron: "delantal", pillow: "cojín", bandana: "bandana", phonecase: "funda", puzzle: "puzle", doormat: "felpudo", blanket: "manta", cap: "gorra", beanie: "gorro", embtee: "camiseta bordada", embhoodie: "sudadera bordada", patch: "parche", glass: "vaso", coaster: "posavasos", tumbler: "vaso térmico", flag: "bandera", postcard: "postal", calendar: "calendario", dadhat: "gorra clásica", trucker: "gorra trucker", bucket: "gorro pescador", truckerprint: "gorra trucker", bucketprint: "gorro pescador", bottle: "botella", socks: "calcetines", womtee: "camiseta de mujer", womcrop: "sudadera corta de mujer", womsweat: "sudadera de mujer", kidshoodie: "sudadera infantil", toddler: "camiseta de peque", baby: "body de bebé", jersey: "camiseta deportiva", teeoversize: "camiseta oversize", hoodieoversize: "sudadera oversize" };

function copyFor(spec: Spec, res: Resolved) {
  const { bp, design } = spec;
  if (spec.kind === "blank") {
    const masc = /^(Cojín|Delantal|Gorro|Póster|Lienzo|Body|Vaso|Calcetines)/.test(bp.label);
    if (KINDS[bp.key]?.layout === "emb") {
      return {
        name: `${bp.label} ${masc ? "personalizado" : "personalizada"}`,
        short: `Borda tu nombre, tus iniciales o tu frase en tu ${TYPE_ES[bp.key]}: hasta 3 colores de hilo.`,
        story: "Escribe tu texto en nuestro estudio online, elige tipografía y colores de hilo y lo bordamos para ti. El bordado admite solo texto, con los hilos de la casa (oro viejo, rojo, amarillo, blanco y negro).",
      };
    }
    return {
      name: `${bp.label} ${masc ? "personalizado" : "personalizada"}`,
      short: `Diseña ${masc ? "tu propio" : "tu propia"} ${TYPE_ES[bp.key]}: textos, tipografías y tu imagen. ${masc ? "Lo" : "La"} fabricamos para ti.`,
      story: "Crea tu diseño en nuestro estudio online con las tipografías y colores de la casa, o sube tu propia imagen. Las imágenes subidas las revisa nuestro equipo antes de imprimir.",
    };
  }
  if (spec.kind === "template") {
    const t = spec.template!;
    const info = TEMPLATE_INFO[t.template];
    return { name: `${bp.label} ${info.title}`, short: info.desc, story: "Escribe tu texto, mira la vista previa y la fabricamos solo para ti. Cada pieza se imprime bajo pedido." };
  }
  const col = FALLBACK_COLLECTIONS.find((c) => c.slug === design.collection);
  return {
    name: `${design.name} — ${bp.label}`,
    short: design.line,
    story: `Diseño original ROJO Y GUALDA de la colección ${col?.name ?? design.collection.toUpperCase()}${col?.tagline ? `: ${col.tagline}` : "."} Cada pieza se fabrica bajo pedido en Europa para evitar excedentes.`,
    paper: res.paper,
  };
}

/** Relative luminance of a provider colour code ("#1a1a1a", "1a1a1a" or "#111111/#ffffff" for heathers → first). */
function luminance(code: string | null): number | null {
  const m = (code ?? "").match(/#?([0-9a-f]{6})/i);
  if (!m) return null;
  const n = parseInt(m[1], 16), lin = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/**
 * Every live colour that keeps the print readable: light-ink (dark-tone) designs go on dark and mid
 * colours, dark-ink (light-tone) designs on light colours. Darkest/lightest first.
 */
function toneColors(live: { color: string | null; color_code: string | null }[], tones: Tone[]) {
  const byName = new Map<string, number | null>();
  for (const v of live) if (v.color && !byName.has(v.color)) byName.set(v.color, luminance(v.color_code));
  const dark = tones.includes("dark"), light = tones.includes("light");
  const fits = ([name, l]: [string, number | null]) => {
    if (l == null) return dark ? /black|navy|charcoal|dark|forest|maroon|burgundy|military|olive/i.test(name) : /white|natural|cream|ivory|sand|ash|light/i.test(name);
    return (dark && l < 0.32) || (light && l > 0.45);
  };
  return [...byName.entries()].filter(fits).sort((a, b) => (dark && !light ? (a[1] ?? 0) - (b[1] ?? 0) : (b[1] ?? 1) - (a[1] ?? 1))).map(([n]) => n);
}

function pickVariants(spec: Spec, variants: { id: string; external_id: string; size: string | null; color: string | null; color_code: string | null; cost: number | null; status: string }[], allowed?: string[]) {
  const { bp } = spec;
  if (allowed?.length) {
    const order = new Map(allowed.map((id, i) => [id, i]));
    return variants.filter((v) => order.has(v.external_id)).sort((a, b) => order.get(a.external_id)! - order.get(b.external_id)!);
  }
  const live = variants.filter((v) => v.status !== "DISCONTINUED" && v.status !== "OUT_OF_STOCK");
  let colors: (string | null)[] = [null];
  if (bp.colors) {
    const pref = spec.tones.flatMap((t) => bp.colors![t]);
    const max = bp.allColors ? 48 : spec.kind === "blank" ? 4 : (bp.maxColors ?? 2);
    colors = pref.filter((c) => live.some((v) => (v.color ?? "").toLowerCase() === c.toLowerCase()));
    if (bp.allColors) colors = [...colors, ...toneColors(live, spec.tones).filter((c) => !colors.some((p) => (p ?? "").toLowerCase() === c.toLowerCase()))];
    colors = colors.slice(0, max);
    // designs drawn for specific garment colours (lib/catalog/statement.ts): offer exactly those when the product has them
    const own = spec.kind === "design" ? (spec.design.colors ?? []).filter((c) => live.some((v) => (v.color ?? "").toLowerCase() === c.toLowerCase())) : [];
    if (own.length) colors = own.slice(0, 6);
    if (!colors.length) {
      // fall back to whatever exists (first colours by name)
      colors = [...new Set(live.map((v) => v.color))].slice(0, 1);
    }
  }
  const sizes = bp.sizes;
  const out = live.filter((v) => {
    const okColor = colors[0] === null || colors.some((c) => (c ?? "").toLowerCase() === (v.color ?? "").toLowerCase());
    const okSize = !sizes || (bp.key === "poster" ? sizes.includes(posterSize(v.external_id) ?? "") : sizes.includes(normSize(v.size) ?? ""));
    return okColor && okSize;
  });
  // stable order: colour preference, then size order
  const sizeIdx = (v: (typeof out)[number]) => (sizes ?? []).indexOf(bp.key === "poster" ? (posterSize(v.external_id) ?? "") : (normSize(v.size) ?? ""));
  const colorIdx = (v: (typeof out)[number]) => colors.findIndex((c) => c === null || (c ?? "").toLowerCase() === (v.color ?? "").toLowerCase());
  return out.sort((a, b) => colorIdx(a) - colorIdx(b) || sizeIdx(a) - sizeIdx(b));
}

async function ensureCollection(slug: string) {
  const sb = db();
  const { data } = await sb.from("collections").select("id").eq("brand_id", env.brandId()).eq("slug", slug).maybeSingle();
  if (data) {
    await sb.from("collections").update({ status: "ACTIVE" }).eq("id", data.id).neq("status", "ACTIVE");
    return data.id as string;
  }
  const fb = FALLBACK_COLLECTIONS.find((c) => c.slug === slug);
  const { data: created } = await sb
    .from("collections")
    .insert({ brand_id: env.brandId(), slug, name: fb?.name ?? slug.toUpperCase(), tagline: fb?.tagline ?? null, status: "ACTIVE", featured: fb?.featured ?? false, sort: 50 })
    .select("id")
    .single();
  return (created?.id as string) ?? null;
}

async function uniqueSlug(base: string) {
  const sb = db();
  let slug = base;
  for (let i = 2; i < 60; i++) {
    const { data } = await sb.from("products").select("id").eq("brand_id", env.brandId()).eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

const FEATURED = new Set(["p:firma-leon:tee", "p:espana-bandas:tee", "p:leon-coronado:tee", "p:arte-toro:tee", "p:arte-chiringuito:tee", "p:firma-leon:hoodie", "p:arte-vermut:mug", "p:arte-quijote:poster"]);

/** Thrown when a step should stop and continue in the next call (time budget). */
class ResumeLater extends Error {}

async function stepCreate(job: JobRow, staff: StaffSession): Promise<StepResult> {
  const sb = db();
  const spec = specFor(job.key);
  const { bp, design } = spec;
  const rk = resKey(bp.key, spec.tones[0]);
  const res = await resolved(rk);
  if (!res) {
    const { data: rj } = await sb.from("catalog_jobs").select("phase, error").eq("key", rk).maybeSingle();
    if (rj?.phase === "failed") throw new Error(`Producto base no disponible (${rk}): ${rj.error ?? "error"}`);
    return { key: job.key, phase: "new", done: false, waitMs: 3000, message: `esperando ${rk}` };
  }

  const { data: pvs } = await sb.from("provider_variants").select("id, external_id, size, color, color_code, cost, status").eq("provider_product_id", res.rowId);
  // Blank products combine dark + light colours of the same provider product.
  const variants = pickVariants(spec, (pvs ?? []) as never, res.variantIds);
  if (!variants.length) throw new Error(`No matching variants for ${job.key}`);
  if (bp.provider === "gelato") {
    for (const v of variants) {
      if (v.cost == null) {
        const p = await getUnitPrice(v.external_id).catch(() => null);
        if (p) v.cost = p.price;
      }
    }
  }

  // Print file (brand designs only — personalised products are rendered per order).
  const files: { type: string; url: string }[] = [];
  if (spec.kind === "design" && bp.key === "calendar") {
    // stable public domain: Gelato downloads the PDF when the order is produced (deploy-specific URLs can disappear)
    files.push({ type: "default", url: `${env.siteUrl()}/catalog/calendars/${design.slug}.pdf` });
  } else if (spec.kind === "design") {
    // Print files are rendered one per call when needed: an all-over jersey (front + back + sleeve panels at
    // full print resolution) took longer than the function limit, timed out on every attempt and never got
    // past "new". Each finished file is kept in the job state, so the next call carries on from there.
    const started = Date.now();
    const cache = { ...((job.state.printFiles as Record<string, string> | undefined) ?? {}) };
    const keep = async (type: string, make: () => Promise<string>) => {
      if (cache[type]) return cache[type];
      if (Date.now() - started > 9_000) throw new ResumeLater(type);
      cache[type] = await make();
      await save(job, { state: { ...job.state, printFiles: cache } });
      return cache[type];
    };
    try {
      // safe zones (lib/catalog/print-safety.ts): the design is kept clear of seams, hood and pocket of this garment
      const front = await keep("front", async () => {
        const png = await renderDesign({ ...design, layers: effectiveLayers(design, bp.key, "front") }, { width: res.printfile.width, height: res.printfile.height, mode: bp.renderMode });
        // content-addressed path: Printful caches files by URL, so a changed print needs a new URL — but identical
        // renders (retries, rebuilds without artwork changes) reuse the same object instead of adding a new copy
        cache._ver = printHash(png);
        return uploadObject(`catalog/prints/${design.slug}-${rk.slice(4).replace(":", "-")}-${cache._ver}.png`, png, "image/png", { immutable: true });
      });
      files.push({ type: res.placement ?? bp.placement, url: front });
      // two-sided designs: second print file on the back (Printful garments that offer a back placement)
      if (design.back?.length && res.provider === "printful" && bp.renderMode === "print" && res.placements.includes("back")) {
        const backUrl = await keep("back", async () => {
          const backPng = await renderDesign({ ...design, layers: effectiveLayers(design, bp.key, "back") }, { width: res.printfile.width, height: res.printfile.height, mode: "print" });
          return uploadObject(`catalog/prints/${design.slug}-${rk.slice(4).replace(":", "-")}-${printHash(backPng)}-back.png`, backPng, "image/png", { immutable: true });
        });
        files.push({ type: "back", url: backUrl });
      }
      // all-over garments: back panel = the design's back (or its pattern), sleeves = the pattern alone
      if (res.panels && bp.renderMode === "cover") {
        for (const [pl, size] of Object.entries(res.panels)) {
          const url = await keep(`panel:${pl}`, async () => {
            const layers = pl === "back" && design.back?.length ? effectiveLayers(design, bp.key, "back") : design.layers.slice(0, 1);
            const panelPng = await renderDesign({ ...design, layers }, { ...size, mode: "cover" });
            return uploadObject(`catalog/prints/${design.slug}-${rk.slice(4).replace(":", "-")}-${cache._ver ?? printHash(panelPng)}-${pl}.png`, panelPng, "image/png");
          });
          files.push({ type: pl, url });
        }
      }
    } catch (e) {
      if (e instanceof ResumeLater) return { key: job.key, phase: "new", done: false, waitMs: 500, message: `archivos de impresión: sigue con ${e.message}` };
      throw e;
    }
  }
  const twoSided = !bp.aopPanels && files.some((f) => f.type === "back");

  const copy = copyFor(spec, res);
  const collectionSlug = spec.kind === "design" ? design.collection : spec.kind === "template" ? (spec.template!.template === "jersey" ? "futbol" : spec.template!.template === "pueblo" ? "mi-pueblo" : "esenciales") : "esenciales";
  const collectionId = await ensureCollection(collectionSlug);
  const { data: cat } = await sb.from("categories").select("id").eq("brand_id", env.brandId()).eq("code", bp.category).maybeSingle();
  const costs = variants.map((v) => (v.cost == null ? null : Number(v.cost)));
  const personalization: PersoConfig | null =
    spec.kind === "blank"
      ? blankConfig(spec.blank!, res)
      : spec.kind === "template"
        ? PRESETS[spec.template!.template]
        : null;
  const basePrice = bp.price + (twoSided ? BACK_PRINT_PRICE : 0);
  const details = [bp.details, twoSided ? "Impresión por delante y por detrás." : "", copy.paper ? `Papel: ${copy.paper.replace(/-/g, " ")}.` : "", `Cuidados: ${bp.care}`].filter(Boolean).join("\n\n");
  const slug = await uniqueSlug(slugify(copy.name));

  const { data: product, error } = await sb
    .from("products")
    .insert({
      brand_id: env.brandId(),
      name: copy.name,
      slug,
      product_type: bp.productType,
      category_id: cat?.id ?? null,
      collection_id: collectionId,
      status: "READY_FOR_CONFIGURATION",
      supplier_id: res.provider,
      primary_provider: res.provider,
      provider_product_id: res.externalId,
      production_cost: costs.every((c) => c != null) ? Math.max(...(costs as number[])) : null,
      retail_price: basePrice,
      currency: "EUR",
      short_description: copy.short,
      description: details,
      story: copy.story,
      personalization,
      featured: FEATURED.has(job.key),
      tags: [spec.kind, bp.key, design.slug, design.collection, design.tone, ...(design.tags ?? [])].filter((t, i, a) => t && a.indexOf(t) === i),
      seo_title: `${copy.name} | ROJO Y GUALDA`,
      seo_description: `${copy.short} ${bp.label} fabricada bajo pedido. Envío a toda España y Europa.`.slice(0, 158),
      metadata: { catalog: { key: job.key, design: spec.kind === "design" ? design.slug : null, blueprint: bp.key, tone: spec.tones[0] }, size_guide: res.sizeGuide ?? null },
    })
    .select("id")
    .single();
  if (error || !product) throw new Error(`product insert: ${error?.message}`);
  if (collectionId) await sb.from("collection_products").insert({ collection_id: collectionId, product_id: product.id });

  const { data: mapping, error: mErr } = await sb
    .from("product_provider_mappings")
    .insert({
      product_id: product.id,
      provider_id: res.provider,
      role: "PRIMARY",
      provider_product_id: res.externalId,
      fulfillment_method: bp.technique,
      print_config: files.length
        ? { files, canvas: res.printfile, catalog: job.key }
        : {
            personalized: true,
            placement: spec.kind === "template" ? PRESETS[spec.template!.template].placement : "front",
            canvas: res.printfile,
            catalog: job.key,
            // our side → provider file type (mugs/posters "default", caps "embroidery_front", Printify "front"…)
            ...(spec.kind === "blank" ? { placements: { front: res.placement ?? res.placements[0] ?? bp.placement, back: "back" } } : {}),
          },
      approved: true,
      approved_by: staff.userId,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (mErr || !mapping) throw new Error(`mapping insert: ${mErr?.message}`);

  const variantRows = variants.map((v, idx) => {
    const size = bp.key === "poster" ? posterSize(v.external_id) : res.provider === "printify" || res.provider === "prodigi" ? v.size : normSize(v.size);
    const premium = (size && bp.sizePremium?.[size]) || 0;
    return {
      product_id: product.id,
      variant_name: [size, v.color].filter(Boolean).join(" / ") || copy.name,
      size,
      color: v.color,
      color_hex: v.color_code,
      production_cost: v.cost,
      retail_price: priceFor(basePrice + premium, v.cost),
      provider_status: v.status === "UNKNOWN" ? "UNKNOWN" : v.status,
      sort: idx,
    };
  });
  const { data: inserted, error: vErr } = await sb.from("product_variants").insert(variantRows).select("id, sort");
  if (vErr || !inserted) throw new Error(`variants insert: ${vErr?.message}`);
  const bySort = new Map(inserted.map((r) => [r.sort as number, r.id as string]));
  const { error: vmErr } = await sb.from("variant_provider_mappings").insert(
    variants.map((v, idx) => ({ mapping_id: mapping.id, variant_id: bySort.get(idx)!, provider_variant_id: v.external_id, production_cost: v.cost })),
  );
  if (vmErr) throw new Error(`variant mappings: ${vmErr.message}`);

  await sb.rpc("refresh_product_eligibility", { p_product_id: product.id });
  // design version + rebuild tag of what was printed: changed designs are rebuilt later (rebuildCandidates)
  const versionInfo = spec.kind === "design" ? { designVersion: designVersion(design, bp.key), rebuildTag: REBUILD[design.slug] ?? null } : {};
  await save(job, { phase: "test", product_id: product.id, state: { slug, resKey: rk, files, replaces: (job.state as { replaces?: string | null }).replaces ?? null, ...versionInfo }, error: null });
  return { key: job.key, phase: "test", done: false, message: `${copy.name} · ${variants.length} variantes` };
}

/** Never sell under a healthy margin: at least cost × 1.9 + 3 € (VAT, payment fees, returns). */
function priceFor(target: number, cost: number | null) {
  return retail(cost != null ? Math.max(target, Number(cost) * 1.9 + 3) : target);
}

/* ───────────────────────── mockups ───────────────────────── */

async function webp(buf: Buffer, width = 1400) {
  // q80 + effort 5: ~15 % smaller than q84 with no visible difference on product photos (storage + egress)
  return (await (await imageOps()).fitInside(buf, { maxSide: width, withoutEnlargement: true }, { format: "webp", quality: 80, effort: 5 })).data;
}

/** Short content hash for content-addressed storage paths. */
function printHash(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 12);
}

/** Per-build media version: product photos get unique paths, so the year-long CDN cache never serves a stale one. */
function mediaVer(job: JobRow) {
  const st = job.state as { mediaVer?: string };
  return (st.mediaVer ??= Date.now().toString(36));
}

/**
 * Artwork for a mockup: a small signed render from our own domain for library designs (Printful only
 * composites a ~1000 px photo), so the provider does not download the full print file from storage.
 */
function mockupSource(spec: Spec, file: { type: string; url: string }, printfile: { width: number; height: number }, side: "front" | "back", job: JobRow) {
  // fallback to the stored print: non-library art, embroidery (thread digitising wants the real file), opt-out, or a failed attempt
  if (spec.kind !== "design" || spec.bp.technique === "EMBROIDERY" || process.env.MOCKUP_ART_FROM_SITE === "0" || (job.state as { noSiteArt?: boolean }).noSiteArt) return file.url;
  if (side === "back" && !spec.design.back?.length) return file.url;
  const v = createHash("sha256").update(file.url).digest("hex").slice(0, 12);
  return mockupArtUrl(env.siteUrl(), { d: spec.design.slug, s: side, m: side === "back" ? "print" : spec.bp.renderMode, b: spec.bp.key, v, width: printfile.width, height: printfile.height }) ?? file.url;
}

/** Small local render for poster scenes (Gelato/Prodigi): no download of the 10–47 MB poster file from storage. */
async function posterSource(spec: Spec, printfile: { width: number; height: number }, artUrl: string) {
  if (spec.kind === "design") {
    const k = Math.min(1, 1400 / Math.max(printfile.width, printfile.height));
    return renderDesign(spec.design, { width: Math.round(printfile.width * k), height: Math.round(printfile.height * k), mode: spec.bp.renderMode });
  }
  return Buffer.from(await (await fetch(artUrl)).arrayBuffer());
}

/** Lifestyle-style scenes for posters (Gelato has no mockup API): framed on a wall + flat detail. */
async function posterScenes(poster: Buffer, opts: { frame?: string | null; mat?: boolean } = { frame: "#141414", mat: true }) {
  const W = 1600, H = 2000;
  const ops = await imageOps();
  const meta = await ops.metadata(poster);
  const ratio = meta.width && meta.height ? meta.height / meta.width : 4 / 3;
  const pw = 820, ph = Math.round(pw * ratio);
  const frame = opts.frame ? 26 : 0, mat = opts.mat ? 64 : 0;
  const fw = pw + 2 * (frame + mat), fh = ph + 2 * (frame + mat);
  const fx = Math.round((W - fw) / 2), fy = 200;
  const wall = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe9df"/><stop offset="1" stop-color="#e2d9cb"/></linearGradient><radialGradient id="l" cx="0.3" cy="0.15" r="0.9"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter></defs>
      <rect width="${W}" height="${H}" fill="url(#w)"/><rect width="${W}" height="${H}" fill="url(#l)"/>
      <rect x="0" y="${H - 300}" width="${W}" height="300" fill="#c9b9a3"/><rect x="0" y="${H - 300}" width="${W}" height="10" fill="#b5a48c"/>
      <rect x="${fx + 18}" y="${fy + 34}" width="${fw}" height="${fh}" fill="#000" opacity="0.32" filter="url(#s)"/>
      ${opts.frame ? `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="${opts.frame}"/><rect x="${fx + frame - 2}" y="${fy + frame - 2}" width="${fw - 2 * frame + 4}" height="${fh - 2 * frame + 4}" fill="#000" opacity="0.12"/>` : ""}
      ${opts.mat ? `<rect x="${fx + frame}" y="${fy + frame}" width="${fw - 2 * frame}" height="${fh - 2 * frame}" fill="#fbfaf7"/><rect x="${fx + frame + mat - 3}" y="${fy + frame + mat - 3}" width="${pw + 6}" height="${ph + 6}" fill="#e7e2d8"/>` : ""}
      ${!opts.frame && !opts.mat ? `<rect x="${fx + pw}" y="${fy + 6}" width="14" height="${ph}" fill="#000" opacity="0.18"/>` : ""}</svg>`,
  );
  const art = await ops.resizePng(poster, pw, ph);
  const scene = await ops.svgCompositeWebp(wall, [{ input: art, left: fx + frame + mat, top: fy + frame + mat }], 84);

  const dw = 1000, dh = Math.round(dw * ratio), dW = 1400, dH = dh + 420;
  const bg = Buffer.from(
    `<svg width="${dW}" height="${dH}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="${dW}" height="${dH}" fill="#ece8e1"/><rect x="${(dW - dw) / 2 + 10}" y="${(dH - dh) / 2 + 22}" width="${dw}" height="${dh}" fill="#000" opacity="0.25" filter="url(#s)"/></svg>`,
  );
  const art2 = await ops.resizePng(poster, dw, dh);
  const flat = await ops.svgCompositeWebp(bg, [{ input: art2, left: (dW - dw) / 2, top: (dH - dh) / 2 }], 84);
  return [scene, flat];
}

async function addImage(productId: string, url: string, alt: string, sort: number, variantId: string | null, kind: "MOCKUP" | "LIFESTYLE" = "MOCKUP") {
  await db().from("product_images").insert({ product_id: productId, url, alt, sort, variant_id: variantId, kind });
}

async function stepMockup(job: JobRow): Promise<StepResult> {
  const sb = db();
  const spec = specFor(job.key);
  const { bp, design } = spec;
  const st = job.state as { slug: string; resKey: string; files: { type: string; url: string }[] };
  const res = await resolved(st.resKey);
  if (!res) throw new Error("resolution missing");
  const { data: product } = await sb.from("products").select("id, name").eq("id", job.product_id!).single();
  const { data: pvars } = await sb.from("product_variants").select("id, color, size, sort, variant_provider_mappings(provider_variant_id)").eq("product_id", job.product_id!).order("sort");

  // Artwork used for the mockup: brand print, personalised sample or the placeholder.
  let artUrl = st.files[0]?.url ?? null;
  let placement = res.placement ?? bp.placement;
  if (!artUrl) {
    const { width, height } = res.printfile;
    let png: Buffer;
    if (spec.kind === "template") {
      const t = spec.template!;
      const preset = PRESETS[t.template];
      png = await renderPrintFile({ mode: "fields", template: t.template, values: t.sample }, { ink: preset.ink, font: preset.font });
      placement = preset.placement;
      png = await (await imageOps()).resizePng(png, width, height, "contain");
    } else {
      png = await renderDesign(spec.kind === "blank" ? design : PLACEHOLDER, { width, height, mode: bp.renderMode });
    }
    // content-addressed: identical placeholder/sample renders share one object
    artUrl = await uploadObject(`catalog/mockup-src/${job.key.replace(/:/g, "-")}-${printHash(png)}.png`, png, "image/png", { immutable: true });
  }
  const mv = mediaVer(job);

  if (res.provider === "prodigi") {
    const poster = await posterSource(spec, res.printfile, artUrl);
    const colors = [...new Set((pvars ?? []).map((v) => v.color))];
    let n = 0;
    for (const color of colors) {
      const hex = !color ? null : ({ black: "#141414", white: "#f4f2ee", natural: "#b48a5a" } as Record<string, string>)[color.toLowerCase()] ?? "#141414";
      const [scene] = await posterScenes(poster, bp.key === "canvas" ? { frame: null, mat: false } : { frame: hex ?? "#141414", mat: true });
      const url = await uploadObject(`catalog/media/${st.slug}/${(job.product_id ?? "").slice(0, 8)}-${mv}-scene-${n}.webp`, scene, "image/webp", { immutable: true });
      const v = (pvars ?? []).find((x) => x.color === color);
      await addImage(product!.id, url, [product!.name, color].filter(Boolean).join(" — "), n++, color ? (v?.id ?? null) : null, "LIFESTYLE");
      if (v) await sb.from("product_variants").update({ image: url }).eq("product_id", product!.id).eq("color", color ?? "");
    }
    const [, flat] = await posterScenes(poster, { frame: null, mat: false });
    await addImage(product!.id, await uploadObject(`catalog/media/${st.slug}/${(job.product_id ?? "").slice(0, 8)}-${mv}-flat.webp`, flat, "image/webp", { immutable: true }), `${product!.name} — detalle`, n, null);
    await save(job, { phase: "publish" });
    return { key: job.key, phase: "publish", done: false };
  }

  if (res.provider === "printify") {
    const upload = await printify.uploadImage(artUrl, `${st.slug}.png`);
    const { data: prices } = await sb.from("product_variants").select("id, retail_price, variant_provider_mappings(provider_variant_id)").eq("product_id", product!.id);
    const vlist = (prices ?? []).map((v) => ({ id: Number((v.variant_provider_mappings as unknown as { provider_variant_id: string }[])[0]?.provider_variant_id), price: Math.round(Number(v.retail_price) * 100), rowId: v.id as string }));
    const { data: prod } = await sb.from("products").select("short_description").eq("id", product!.id).single();
    const created = await printify.createShopProduct({ title: product!.name, description: prod?.short_description ?? product!.name, blueprintId: res.blueprintId!, providerId: res.printProviderId!, variants: vlist, position: res.placements[0] ?? "front", imageId: upload.id });
    // exact production costs (cents) → variants, mapping, price floor
    let maxCost = 0;
    for (const v of created.variants ?? []) {
      if (v.cost == null) continue;
      const cost = v.cost / 100;
      maxCost = Math.max(maxCost, cost);
      const row = vlist.find((x) => x.id === v.id);
      if (!row) continue;
      await sb.from("product_variants").update({ production_cost: cost, retail_price: priceFor(row.price / 100, cost) }).eq("id", row.rowId);
      await sb.from("variant_provider_mappings").update({ production_cost: cost }).eq("variant_id", row.rowId);
    }
    if (maxCost) await sb.from("products").update({ production_cost: maxCost }).eq("id", product!.id);
    const imgs = [...(created.images ?? [])].sort((a, b) => Number(b.is_default ?? false) - Number(a.is_default ?? false));
    const seen = new Set<string>();
    const pending = imgs
      .filter((im) => {
        const k = `${im.position ?? ""}:${im.variant_ids.slice(0, 1).join()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 5)
      .map((im) => ({ url: im.src, color: "_", kind: "MOCKUP" as const, title: "" }));
    await sb.rpc("refresh_product_eligibility", { p_product_id: product!.id });
    await save(job, { phase: "images", state: { ...st, printifyProductId: created.id, pending, done: 0 } });
    return { key: job.key, phase: "images", done: false, message: `Printify ${created.id} · ${pending.length} mockups` };
  }

  if (res.provider === "gelato" && bp.key === "calendar") {
    // lifestyle photos generated with the PDFs (scripts/calendar-mockups.py), served as static files from our domain
    const labels = ["en la pared", "un mes por dentro", "portada y enero"];
    for (let n = 1; n <= 3; n++) {
      await addImage(product!.id, `${env.siteUrl()}/catalog/calendars/${design.slug}-${n}.jpg`, `${product!.name} — ${labels[n - 1]}`, n - 1, null, n === 1 ? "LIFESTYLE" : "MOCKUP");
    }
    await save(job, { phase: "publish" });
    return { key: job.key, phase: "publish", done: false };
  }

  if (res.provider === "gelato") {
    const poster = await posterSource(spec, res.printfile, artUrl);
    const [scene, flat] = await posterScenes(poster);
    const a = await uploadObject(`catalog/media/${st.slug}/${(job.product_id ?? "").slice(0, 8)}-${mv}-scene.webp`, scene, "image/webp", { immutable: true });
    const b = await uploadObject(`catalog/media/${st.slug}/${(job.product_id ?? "").slice(0, 8)}-${mv}-flat.webp`, flat, "image/webp", { immutable: true });
    await addImage(product!.id, a, `${product!.name} — en la pared`, 0, null, "LIFESTYLE");
    await addImage(product!.id, b, `${product!.name} — detalle`, 1, null);
    await save(job, { phase: "publish" });
    return { key: job.key, phase: "publish", done: false };
  }

  // Printful mockup generator: one variant per colour.
  const perColor = new Map<string, string>();
  for (const v of pvars ?? []) {
    const k = v.color ?? "_";
    const ext = (v.variant_provider_mappings as unknown as { provider_variant_id: string }[])[0]?.provider_variant_id;
    if (ext && !perColor.has(k) && perColor.size < 12) perColor.set(k, ext); // photos for the first 12 colours; the rest show swatches
  }
  const placementOk = res.placements.includes(placement) ? placement : res.placements[0];
  const { width, height } = res.printfile;
  // kids' garments: ask for several photo styles (flat lay, ghost, girl/boy models…) so the grid is not one photo repeated
  let optionGroups: string[] | undefined;
  if (variedPhotos(bp.key)) {
    optionGroups = pickOptionGroups((await getPrintfiles(res.externalId).catch(() => null))?.option_groups);
    if (!optionGroups.length) optionGroups = undefined;
  }
  const frontUrl = st.files[0] ? mockupSource(spec, st.files[0], res.printfile, "front", job) : artUrl;
  const files = [
    { placement: placementOk, imageUrl: frontUrl, position: { area_width: width, area_height: height, width, height, top: 0, left: 0 } },
    ...st.files.filter((f) => f.type === "back" && res.placements.includes("back") && !res.panels?.back).map((f) => ({ placement: "back", imageUrl: mockupSource(spec, f, res.printfile, "back", job), position: { area_width: width, area_height: height, width, height, top: 0, left: 0 } })),
    // all-over panels at their own print-file size
    ...st.files.filter((f) => res.panels?.[f.type]).map((f) => ({ placement: f.type, imageUrl: f.url, position: { area_width: res.panels![f.type].width, area_height: res.panels![f.type].height, width: res.panels![f.type].width, height: res.panels![f.type].height, top: 0, left: 0 } })),
  ];
  try {
    const input = { productId: res.externalId, variantIds: [...perColor.values()], format: "jpg" as const, files };
    // a style list Printful refuses must never block a build: fall back to its default photos
    const taskKey = optionGroups ? await createMockupTask({ ...input, optionGroups }).catch((e) => (isProviderError(e) && e.status === 400 ? createMockupTask(input) : Promise.reject(e))) : await createMockupTask(input);
    await save(job, { phase: "poll", state: { ...st, taskKey, perColor: Object.fromEntries(perColor), design: design.slug, siteArt: frontUrl !== artUrl } });
    return { key: job.key, phase: "poll", done: false, waitMs: 8000 };
  } catch (e) {
    if (isProviderError(e) && e.status === 429) return { key: job.key, phase: "mockup", done: false, waitMs: 30_000, message: "Printful rate limit — esperando" };
    throw e;
  }
}

/** Garments whose photos rotate styles (women/girls, men/boys, flat, ghost): kids' wear and the sports jersey,
 *  whose default photo was the same model on every product. */
const variedPhotos = (bp: string) => isKidsBlueprint(bp) || bp === "jersey";

export type PendingImage = { url: string; color: string; kind: "MOCKUP" | "LIFESTYLE"; title: string; style?: MockupStyle };
export type TaskMockup = { placement: string; variant_ids: number[]; mockup_url: string; extra?: { title?: string; url: string; option?: string; option_group?: string }[] };

/** Printful mockup task result → images to copy, in gallery order. Kids' garments get varied, rotated lead styles. */
export function mockupPending(mockups: TaskMockup[], perColor: Record<string, string>, key: string): PendingImage[] {
  const [, slug = "", bpKey = ""] = key.split(":");
  const kids = variedPhotos(bpKey);
  const colorOf = new Map(Object.entries(perColor).map(([c, ext]) => [Number(ext), c]));
  const pending: PendingImage[] = [];
  for (const [i, m] of mockups.entries()) {
    const color = colorOf.get(m.variant_ids[0]) ?? "_";
    // the main photo carries no style label: it only leads when no labelled style is available
    pending.push({ url: m.mockup_url, color, kind: "MOCKUP", title: "", style: "other" });
    // extra angles: skip views of placements we do not print on (e.g. a blank back)
    const printed = String(m.placement ?? "front");
    const label = (x: { title?: string; option?: string; option_group?: string }) => `${x.option_group ?? ""} ${x.option ?? ""} ${x.title ?? ""}`;
    let extra = (m.extra ?? []).filter((x) => !(/back/i.test(`${x.title} ${x.option}`) && !/back/i.test(printed)));
    if (kids) {
      // one photo of each style first (girl, boy, flat, ghost…), then the rest
      const firsts = extra.filter((x, j) => extra.findIndex((y) => styleOf(label(y)) === styleOf(label(x))) === j);
      extra = [...firsts, ...extra.filter((x) => !firsts.includes(x))];
    }
    extra = extra.slice(0, kids ? (i === 0 ? 6 : 2) : i === 0 ? 3 : 1);
    for (const x of extra) {
      const style = styleOf(label(x));
      const model = style === "girl" || style === "boy" || style === "model" || /lifestyle|model|men|women|person/i.test(label(x));
      pending.push({ url: x.url, color, kind: model ? "LIFESTYLE" : "MOCKUP", title: x.title ?? "", style });
    }
  }
  return kids ? orderKidsImages(pending, `${slug}:${bpKey}`) : pending;
}

async function stepPoll(job: JobRow): Promise<StepResult> {
  const st = job.state as { taskKey: string; perColor: Record<string, string>; siteArt?: boolean };
  const task = await getMockupTask(st.taskKey);
  if (task.status === "pending") return { key: job.key, phase: "poll", done: false, waitMs: 6000 };
  if (task.status === "failed") {
    // the low-res render from our domain could not be fetched: retry once with the stored print file
    if (st.siteArt) {
      await save(job, { phase: "mockup", state: { ...job.state, siteArt: false, noSiteArt: true } });
      return { key: job.key, phase: "mockup", done: false, waitMs: 2000, message: "mockup: reintento con el archivo de impresión" };
    }
    throw new Error(`Mockup task failed: ${task.error ?? "unknown"}`);
  }
  const pending = mockupPending((task.mockups ?? []) as TaskMockup[], st.perColor, job.key);
  if (!pending.length) throw new Error("Mockup task returned no images");
  // two-sided prints: the big back artwork sells the piece, so its photos lead
  const backFirst = (task.mockups ?? []).some((m) => (m as { placement?: string }).placement === "back");
  if (backFirst) {
    const backUrls = new Set((task.mockups ?? []).filter((m) => (m as { placement?: string }).placement === "back").map((m) => m.mockup_url));
    pending.sort((a, b) => Number(backUrls.has(b.url)) - Number(backUrls.has(a.url)));
  }
  await save(job, { phase: "images", state: { ...job.state, pending, done: 0 } });
  return { key: job.key, phase: "images", done: false };
}

async function stepImages(job: JobRow): Promise<StepResult> {
  const sb = db();
  const st = job.state as { slug: string; pending: PendingImage[]; done: number };
  const { data: product } = await sb.from("products").select("id, name").eq("id", job.product_id!).single();
  const { data: pvars } = await sb.from("product_variants").select("id, color, image").eq("product_id", job.product_id!);
  const batch = st.pending.slice(st.done, st.done + 3);
  for (const [j, img] of batch.entries()) {
    const n = st.done + j;
    const r = await fetch(img.url);
    if (!r.ok) throw new Error(`mockup download ${r.status}`);
    const url = await uploadObject(`catalog/media/${st.slug}/${(job.product_id ?? "").slice(0, 8)}-${mediaVer(job)}-${n}.webp`, await webp(Buffer.from(await r.arrayBuffer())), "image/webp", { immutable: true });
    const variant = (pvars ?? []).find((v) => (v.color ?? "_") === img.color) ?? null;
    await addImage(product!.id, url, [product!.name, img.color !== "_" ? img.color : null, img.title || null, altStyleTag(img.style)].filter(Boolean).join(" — "), n, variant?.id ?? null, img.kind);
    // first image of each colour becomes that colour's variant image
    if (variant && !variant.image) {
      const q = sb.from("product_variants").update({ image: url }).eq("product_id", product!.id);
      await (variant.color ? q.eq("color", variant.color) : q);
      for (const v of pvars ?? []) if (v.color === variant.color) v.image = url;
    }
  }
  const done = st.done + batch.length;
  if (done >= st.pending.length) {
    await save(job, { phase: "publish", state: { ...st, done } });
    return { key: job.key, phase: "publish", done: false };
  }
  await save(job, { state: { ...st, done } });
  return { key: job.key, phase: "images", done: false, message: `${done}/${st.pending.length} imágenes` };
}

async function stepPublish(job: JobRow, staff: StaffSession): Promise<StepResult> {
  const sb = db();
  await sb.from("products").update({ brand_approved: true, og_image: null }).eq("id", job.product_id!);
  const { data: first } = await sb.from("product_images").select("url").eq("product_id", job.product_id!).order("sort").limit(1).maybeSingle();
  if (first) await sb.from("products").update({ og_image: first.url }).eq("id", job.product_id!);
  const replaces = (job.state as { replaces?: string | null }).replaces;
  if (replaces) {
    // hand the old product's URL to the replacement before it goes live
    const { data: old } = await sb.from("products").select("slug").eq("id", replaces).maybeSingle();
    if (old) {
      await sb.from("products").update({ status: "ARCHIVED", visibility: "HIDDEN", slug: `${old.slug}-v${Date.now().toString(36)}` }).eq("id", replaces);
      await sb.from("products").update({ slug: old.slug }).eq("id", job.product_id!);
    }
  }
  const r = await publishProduct(staff, job.product_id!);
  if (!r.ok) throw new Error(`publish blocked: ${r.failures.join(", ")}`);
  await save(job, { phase: "done", error: null });
  return { key: job.key, phase: "done", done: true };
}

/* ───────────────────────── step dispatcher ───────────────────────── */

/** Lease a job for one step (60 s). Returns false when another runner holds it. */
async function lease(key: string): Promise<boolean> {
  const now = new Date();
  const { data } = await db()
    .from("catalog_jobs")
    .update({ locked_until: new Date(now.getTime() + 60_000).toISOString() })
    .eq("key", key)
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select("key");
  return !!data?.length;
}
async function release(key: string) {
  await db().from("catalog_jobs").update({ locked_until: null }).eq("key", key);
}

export async function runStep(key: string, staff: StaffSession, opts: { retry?: boolean; reset?: boolean; rebuild?: boolean } = {}): Promise<StepResult> {
  const kind: JobRow["kind"] = key.startsWith("res:") ? "RESOLVE" : "PRODUCT";
  await loadJob(key, kind); // make sure the row exists before leasing
  if (!(await lease(key))) return { key, phase: "busy", done: true, message: "otro proceso lo está construyendo" };
  try {
    return await runStepLocked(key, kind, staff, opts);
  } finally {
    await release(key).catch(() => null);
  }
}

async function runStepLocked(key: string, kind: JobRow["kind"], staff: StaffSession, opts: { retry?: boolean; reset?: boolean; rebuild?: boolean }): Promise<StepResult> {
  const job = await loadJob(key, kind);
  // rebuild: design or colour range changed — build a replacement while the live product stays on sale;
  // on publish the new one takes over the slug and the old one is archived (order history intact).
  if (opts.rebuild && kind === "PRODUCT" && (job.phase === "done" || job.phase === "failed")) {
    const replaces = job.phase === "done" ? job.product_id : null;
    if (job.phase === "failed" && job.product_id) await db().from("products").delete().eq("id", job.product_id).neq("status", "PUBLISHED");
    await save(job, { phase: "new", product_id: null, state: { replaces }, error: null, attempts: 0 });
    job.phase = "new";
    job.product_id = null;
    job.state = { replaces };
  }
  if (job.phase === "done") return { key, phase: "done", done: true };
  if (job.phase === "failed") {
    if (!opts.retry) return { key, phase: "failed", done: true, error: job.error ?? undefined };
    // retry: drop a half-built product and start again (a pending replacement keeps pointing at the live product)
    if (job.product_id) await db().from("products").delete().eq("id", job.product_id).neq("status", "PUBLISHED");
    const replaces = (job.state as { replaces?: string | null }).replaces ?? null;
    await save(job, { phase: "new", product_id: null, state: replaces ? { replaces } : {}, error: null });
    job.state = replaces ? { replaces } : {};
  }
  try {
    if (kind === "RESOLVE") return await stepResolve(job);
    switch (job.phase) {
      case "new":
        return await stepCreate(job, staff);
      case "test": {
        const r = (await runFulfillmentTest(staff, job.product_id!)) as { ok: boolean; error?: unknown; production?: number | null; shipping?: number | null; currency?: string };
        if (!r.ok) throw new Error(`fulfillment test: ${typeof r.error === "string" ? r.error : JSON.stringify(r.error).slice(0, 300)}`);
        await save(job, { phase: "mockup" });
        return { key, phase: "mockup", done: false, message: `coste ${r.production ?? "?"} + envío ${r.shipping ?? "?"} ${r.currency ?? ""}` };
      }
      case "mockup":
        return await stepMockup(job);
      case "poll":
        return await stepPoll(job);
      case "images":
        return await stepImages(job);
      case "publish":
        return await stepPublish(job, staff);
      default:
        return { key, phase: job.phase, done: true };
    }
  } catch (e) {
    const msg = isProviderError(e) ? `${e.message} (${e.endpoint ?? ""} ${e.status ?? ""})` : e instanceof Error ? e.message : String(e);
    const transient = (isProviderError(e) && (e.status === 429 || e.status === null || (e.status ?? 0) >= 500)) || /Bad Gateway|Gateway Timeout|Service Unavailable|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|STORAGE_UPLOAD_FAILED/i.test(msg);
    if (transient && job.attempts < 6) {
      await save(job, { attempts: job.attempts + 1, error: msg });
      return { key, phase: job.phase, done: false, waitMs: isProviderError(e) && e.status === 429 ? 30_000 : 5_000, error: msg };
    }
    log.warn("CATALOG", "catalog build step failed", { key, phase: job.phase, msg });
    await save(job, { phase: "failed", error: msg.slice(0, 900), attempts: job.attempts + 1 });
    return { key, phase: "failed", done: true, error: msg };
  }
}


/* ───────────────────────── rebuilds of changed designs ───────────────────────── */

/**
 * Forced rebuilds: design slug → tag. A published product of the design whose recorded tag differs is
 * rebuilt once (on top of the automatic version check below). Change the tag to force another round.
 * 2026-10-04: Fútbol PRO backs/fronts redrawn (smaller numerals, safe margins, lighter wear) — print audit.
 */
export const REBUILD: Record<string, string> = Object.fromEntries(
  [
    ...["noche", "dia"].flatMap((t) => [`fp-campeones-mundo-${t}`, `fp-campeones-espalda-${t}`]),
    ...FUTBOL_CITIES.map((c) => `fp-ciudad-${c.key}`),
    ...FUTBOL_AOP.map((k) => `fp-camiseta-${k}`),
    "fp-bufanda-espana",
    "fp-siempre-contigo",
    "fp-aficion-estadio",
  ].map((slug) => [slug, "2026-10-04-print-safety"]),
);

/** At most this many replacements in flight; a new one starts only when a run has a free slot (1 per run). */
const MAX_REBUILDS_IN_FLIGHT = 4;
/** Separate lane for jersey and kids re-prints (see the runner). */
const MAX_URGENT_REBUILDS_IN_FLIGHT = 6;
/** New replacements started per run (the runner fires every 10 min, see netlify/functions/catalog-runner.mts). */
const REBUILDS_PER_RUN = 2;
const BASELINE = VERSION_BASELINE as Record<string, string>;
const versionMemo = new Map<string, string>();
function currentVersion(design: Design, bp: BlueprintKey) {
  const k = `${design.slug}:${bp}`;
  let v = versionMemo.get(k);
  if (!v) versionMemo.set(k, (v = designVersion(design, bp)));
  return v;
}

export interface RebuildCandidate {
  key: string;
  reason: "forced" | "changed";
}

/**
 * Published library products whose print no longer matches the design: the version recorded when the
 * product was built (or, for products built before versions were recorded, the baseline of 2026-10-04)
 * differs from the current one, or the design is in REBUILD with a tag the product has not been built with.
 */
export function rebuildCandidates(jobs: { key: string; phase: string; design_version?: string | null; rebuild_tag?: string | null }[]): RebuildCandidate[] {
  const out: RebuildCandidate[] = [];
  for (const j of jobs) {
    if (j.phase !== "done" || !j.key.startsWith("p:")) continue;
    const [, slug, bpk] = j.key.split(":");
    const design = designBySlug(slug);
    const bp = bpk as BlueprintKey;
    if (!design || design.retired || !BLUEPRINTS[bp] || !productsFor(design).includes(bp) || bp === "calendar") continue;
    const tag = REBUILD[slug];
    const was = j.design_version ?? BASELINE[`${slug}:${bp}`];
    if (tag && j.rebuild_tag !== tag) out.push({ key: j.key, reason: "forced" });
    else if (was && was !== currentVersion(design, bp)) out.push({ key: j.key, reason: "changed" });
  }
  // number shirts and kids' garments (the visibly mis-printed ones) first, then forced, then by garment;
  // what shoppers see most (and what was visibly mis-printed) first: sports jersey, kids, then the core garments
  const ORDER = ["jersey", "kids", "tee", "hoodie", "sweat", "womtee", "toddler", "kidshoodie", "baby"];
  const core = (k: string) => {
    const i = ORDER.indexOf(k.split(":")[2]);
    return i < 0 ? ORDER.length : i;
  };
  const urgent = (k: string) => (core(k) < 2 ? 0 : 1);
  return out.sort((a, b) => urgent(a.key) - urgent(b.key) || (a.reason === b.reason ? 0 : a.reason === "forced" ? -1 : 1) || core(a.key) - core(b.key) || a.key.localeCompare(b.key));
}

/** Rebuild switch (brand_settings.settings.catalogRebuild): off until an admin starts it on /admin/catalogo. */
export async function rebuildEnabled(): Promise<boolean> {
  const { data } = await db().from("brand_settings").select("settings").eq("brand_id", env.brandId()).maybeSingle();
  return Boolean((data?.settings as { catalogRebuild?: { enabled?: boolean } } | null)?.catalogRebuild?.enabled);
}
export async function setRebuildEnabled(enabled: boolean, staff: StaffSession) {
  const sb = db();
  const { data } = await sb.from("brand_settings").select("settings").eq("brand_id", env.brandId()).maybeSingle();
  const settings = { ...((data?.settings as object | null) ?? {}), catalogRebuild: { enabled, at: new Date().toISOString(), by: staff.userId } };
  const { error } = await sb.from("brand_settings").update({ settings }).eq("brand_id", env.brandId());
  if (error) throw new Error(`brand_settings: ${error.message}`);
}

/** Admin summary: pending rebuilds, replacements in flight, switch state. */
export async function rebuildStatus() {
  const [jobs, enabled] = await Promise.all([listJobs(), rebuildEnabled()]);
  const open = (p: string) => p !== "done" && p !== "failed";
  const pending = rebuildCandidates(jobs);
  const planKeys = new Set(buildPlan().map((p) => p.key));
  const inFlight = jobs.filter((j) => j.replaces && open(j.phase) && planKeys.has(j.key)).map((j) => ({ key: j.key, phase: j.phase }));
  const failed = jobs.filter((j) => j.replaces && j.phase === "failed").map((j) => ({ key: j.key, error: j.error }));
  return { enabled, pending: pending.length, forced: pending.filter((c) => c.reason === "forced").length, next: pending.slice(0, 12), inFlight, failed: failed.slice(0, 12) };
}

/* ───────────────────────── server-side runner (cron) ───────────────────────── */

/**
 * Runs catalog steps for ~`budgetMs` with `workers` parallel jobs. Picks resolves first, then
 * jobs already in progress, then new plan items. Leases make it safe next to the browser runner.
 * A new step only starts while there is time left for it to finish inside the function limit.
 */
const FAMILY_SLUGS = new Set(familyDesigns().map((d) => d.slug));

export async function runCatalogBatch(staff: StaffSession, opts: { budgetMs?: number; workers?: number } = {}) {
  const started = Date.now();
  const budget = opts.budgetMs ?? 9_000;
  const plan = buildPlan();
  const jobs = await listJobs();
  const state = new Map(jobs.map((j) => [j.key, j]));
  const nowIso = new Date().toISOString();
  const free = (k: string) => {
    const j = state.get(k) as { locked_until?: string | null } | undefined;
    return !j?.locked_until || j.locked_until < nowIso;
  };
  const open = (k: string) => {
    const ph = state.get(k)?.phase;
    return ph !== "done" && ph !== "failed";
  };
  const resolves = plan.filter((p) => p.kind === "RESOLVE" && open(p.key) && free(p.key));
  const inProgress = plan.filter((p) => p.kind === "PRODUCT" && state.has(p.key) && open(p.key) && state.get(p.key)!.phase !== "new" && free(p.key));
  // priority: brand-defining lines first (lookbook lion, royal crown, embroidery), then pending replacements, then the rest
  const prio = (key: string) => {
    const d = designBySlug(key.split(":")[1] ?? "");
    const bpk = key.split(":")[2] as BlueprintKey;
    // core garments (the categories people browse first) of the new lines lead the queue
    const core = ["tee", "hoodie", "sweat", "jersey", "teeoversize", "hoodieoversize", "womtee", "kids"].includes(bpk);
    if (d?.tags?.includes("futbol-pro")) return core ? -3 : 0.5;
    if (d?.tags?.includes("statement")) return core ? -2.5 : 0.5;
    if (d?.tags?.includes("serie-leon")) return BLUEPRINTS[bpk]?.category === "HEADWEAR" ? -2 : -1; // lion caps, then the León series
    // family designs and baby/toddler garments (Para quién: /para/bebes was empty)
    if (key.startsWith("p:") && (FAMILY_SLUGS.has(d?.slug ?? "") || ["baby", "toddler", "kidshoodie"].includes(bpk))) return -0.5;
    if (d?.tags?.includes("sabiduria")) return core ? -0.2 : 0.5;
    if (d && (d.tags?.includes("lookbook") || d.tags?.includes("bordado") || d.tags?.includes("arte") || d.tags?.includes("leon"))) return 0;
    if ((state.get(key) as { replaces?: string | null } | undefined)?.replaces) return bpk === "jersey" || bpk === "kids" ? -4 : 1; // re-prints of mis-fitted number shirts / kids' tees first
    return 2;
  };
  const fresh = plan
    .filter((p) => p.kind === "PRODUCT" && open(p.key) && (!state.has(p.key) || state.get(p.key)!.phase === "new") && free(p.key))
    .sort((a, b) => prio(a.key) - prio(b.key));
  // rebuilds of changed designs (admin switch): at most one new replacement per run, few in flight, so new
  // products keep progressing; the live product stays on sale until its replacement publishes
  const rebuildKeys: string[] = [];
  if (await rebuildEnabled().catch(() => false)) {
    const urgentBp = (k: string) => ["jersey", "kids"].includes(k.split(":")[2] ?? "");
    // only replacements still in the plan count: orphaned ones (design/garment since dropped) never run and
    // used to fill every slot, so no re-print was started at all
    const planKeys = new Set(plan.map((p) => p.key));
    const inFlight = jobs.filter((j) => j.replaces && open(j.key) && planKeys.has(j.key)).length;
    // number shirts and kids' tees (visibly mis-printed) have their own small lane, so a backlog of other
    // re-prints never holds them back
    const urgentInFlight = jobs.filter((j) => j.replaces && open(j.key) && planKeys.has(j.key) && urgentBp(j.key)).length;
    const cands = rebuildCandidates(jobs).filter((c) => free(c.key));
    const urgentSlots = Math.max(0, Math.min(REBUILDS_PER_RUN, MAX_URGENT_REBUILDS_IN_FLIGHT - urgentInFlight));
    rebuildKeys.push(...cands.filter((c) => urgentBp(c.key)).slice(0, urgentSlots).map((c) => c.key));
    const slots = Math.max(0, Math.min(REBUILDS_PER_RUN - rebuildKeys.length, MAX_REBUILDS_IN_FLIGHT - inFlight));
    if (slots) rebuildKeys.push(...cands.filter((c) => !rebuildKeys.includes(c.key)).slice(0, slots).map((c) => c.key));
  }
  const rebuildKey = rebuildKeys[0] ?? null;
  // one resolve per run (they can be slow: catalogue lookups) so product work is never starved by them
  const queue = [...resolves.slice(0, 1).map((p) => p.key), ...rebuildKeys, ...[...inProgress, ...fresh].map((p) => p.key)];
  const remaining = queue.length;
  const results: { key: string; phase: string; error?: string }[] = [];
  const worker = async () => {
    while (queue.length && Date.now() - started < budget - 4_000) {
      const key = queue.shift()!;
      // keep stepping the same job while time allows (mockup polling etc.)
      for (let i = 0; i < 12 && Date.now() - started < budget; i++) {
        const r = await runStep(key, staff, i === 0 && rebuildKeys.includes(key) ? { rebuild: true } : {});
        if (r.done || r.waitMs) {
          results.push({ key, phase: r.phase, error: r.error });
          break;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: opts.workers ?? 3 }, worker));
  return { ms: Date.now() - started, remaining, processed: results.length, rebuild: rebuildKey, results: results.slice(0, 20) };
}

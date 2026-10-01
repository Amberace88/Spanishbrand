import { assetBase } from "@/lib/catalog/assets";
import "server-only";
import sharp from "sharp";
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
import type { StaffSession } from "@/lib/auth/rbac";
import { FALLBACK_COLLECTIONS } from "@/lib/products/queries";
import { BLUEPRINTS, normSize, posterSize, retail, type Blueprint } from "@/lib/catalog/blueprints";
import { DESIGNS, designBySlug, type BlueprintKey, type Design, type Tone } from "@/lib/catalog/designs";
import { renderDesign } from "@/lib/catalog/render";

/* ───────────────────────── plan ───────────────────────── */

export interface PlanItem {
  key: string;
  kind: "RESOLVE" | "PRODUCT";
  label: string;
}

/** Blank products for "Diseña tú mismo". */
const BLANKS: { bp: BlueprintKey; placements: ("front" | "back")[] }[] = [
  { bp: "tee", placements: ["front", "back"] },
  { bp: "hoodie", placements: ["front", "back"] },
  { bp: "tote", placements: ["front"] },
];
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
const EXTRAS: Partial<Record<BlueprintKey, string[]>> = {
  framed: [], // filled below: every design that has a poster
  canvas: ["firma-leon", "sol-de-espana", "tierra-de-castillos", "rosa-de-los-vientos", "atardecer-mediterraneo", "casa-azulejo", "ciudad-madrid", "ciudad-sevilla"],
  towel: ["atardecer-mediterraneo", "vivir-cerca-del-mar", "chiringuito-club", "costa", "casa-azulejo", "ciudad-malaga", "ciudad-cadiz", "ciudad-barcelona", "espana-bandas"],
  apron: ["hora-del-vermut", "tapeo", "casa-azulejo", "ciudad-logrono"],
  pillow: ["casa-azulejo", "rosa-de-los-vientos", "sol-de-espana", "firma-leon", "hecho-en-espana"],
  bandana: ["aficion-balon", "espana-bandas", "firma-texto", "verbena"],
  phonecase: ["firma-leon", "espana-bandas", "sol-de-espana", "atardecer-mediterraneo", "aficion-balon", "padel-club", "casa-azulejo"],
  // Puzzles and doormats: no EU print provider at Printful/Printify/Gelato/Prodigi → not offered (customs + slow delivery).
  glass: ["un-vino", "vino-y-tapas", "hora-del-vermut", "hecho-en-espana", "casa-azulejo"],
  coaster: ["tapeo", "un-vino", "al-porron", "casa-azulejo", "hecho-en-espana", "ciudad-madrid", "ciudad-sevilla", "ciudad-barcelona"],
  tumbler: ["firma-leon", "camo-espana", "oficio-medicina", "oficio-enfermeria", "oficio-bomberos", "oficio-docente", "aficion-balon"],
  flag: ["espana-bandas", "aficion-balon", "hecho-en-espana", "firma-leon", "parche-espana", "ciudad-madrid", "ciudad-barcelona", "ciudad-sevilla", "ciudad-valencia"],
  postcard: ["ciudad-madrid", "ciudad-barcelona", "ciudad-valencia", "ciudad-sevilla", "ciudad-malaga", "ciudad-bilbao", "ciudad-granada", "ciudad-cadiz", "ciudad-santiago", "ciudad-alicante", "casa-azulejo", "buen-camino"],
  blanket: ["casa-azulejo", "sol-de-espana", "firma-leon", "espana-bandas", "aficion-balon", "rosa-de-los-vientos", "ciudad-madrid", "ciudad-barcelona", "ciudad-sevilla"],
};

export function productsFor(d: Design): BlueprintKey[] {
  const list = new Set<BlueprintKey>(d.products);
  if (d.products.includes("poster")) list.add("framed");
  for (const [bp, slugs] of Object.entries(EXTRAS) as [BlueprintKey, string[]][]) if (slugs.includes(d.slug)) list.add(bp);
  return [...list];
}

export function buildPlan(): PlanItem[] {
  const res = new Set<string>();
  const products: PlanItem[] = [];
  for (const d of DESIGNS) {
    for (const bp of productsFor(d)) {
      res.add(resKey(bp, d.tone));
      products.push({ key: `p:${d.slug}:${bp}`, kind: "PRODUCT", label: `${d.name} — ${BLUEPRINTS[bp].label}` });
    }
  }
  for (const b of BLANKS) {
    res.add(resKey(b.bp, "dark"));
    res.add(resKey(b.bp, "light"));
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

export async function listJobs() {
  const { data } = await db().from("catalog_jobs").select("key, kind, phase, product_id, error, attempts, updated_at, locked_until").eq("brand_id", env.brandId());
  return data ?? [];
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

async function resolvePrintful(bp: Blueprint, tone: Tone | null): Promise<Resolved> {
  const spec = (tone && bp.alt?.[tone]) || bp;
  const ok = (title: string) => spec.match.test(title) && !(spec.exclude?.test(title) ?? false);
  // Candidates: preferred IDs first, then catalog matches. A candidate must have a printable (non-embroidery)
  // placement for the blueprint — some Printful products only offer embroidery in a region.
  // Embroidery blueprints need an embroidery placement; every other blueprint needs a printable one.
  const wantsEmb = bp.technique === "EMBROIDERY";
  const printable = (pl: string) => (wantsEmb ? /embroider/i.test(pl) : !/embroider/i.test(pl));
  const tried = new Set<string>();
  let found: Awaited<ReturnType<typeof getCatalogProduct>> | null = null;
  let pfiles: Awaited<ReturnType<typeof getPrintfiles>> | null = null;
  let place = "";
  const consider = async (cid: string) => {
    if (tried.has(cid) || found) return;
    tried.add(cid);
    try {
      const p = await getCatalogProduct(cid);
      if (p.product.discontinued || !ok(p.product.title)) return;
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
    const all = await listCatalogProducts();
    for (const c of all.filter((p) => !p.discontinued && ok(p.title)).slice(0, 6)) await consider(c.externalId);
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
  if (["tee", "hoodie", "sweat", "kids"].includes(bp.key)) {
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
  return { provider: "printful", rowId, externalId: p.externalId, title: p.title, printfile: { width: Math.round(pf.width * cap), height: Math.round(pf.height * cap) }, placements, placement: place, sizeGuide, variantIds };
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
  const r = bp.provider === "gelato" ? (bp.key === "calendar" ? await resolveGelatoCalendar(bp) : await resolveGelatoPoster(bp)) : bp.provider === "printify" ? await resolvePrintify(bp) : bp.provider === "prodigi" ? await resolveProdigi(bp) : await resolvePrintful(bp, tone ?? null);
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
    return { kind: "blank", bp: BLUEPRINTS[blank.bp], tones: ["dark", "light"], design: PLACEHOLDER, blank };
  }
  const template = TEMPLATES.find((t) => t.template === parts[1] && t.bp === parts[2]);
  if (!template) throw new Error(`Unknown template job ${key}`);
  return { kind: "template", bp: BLUEPRINTS[template.bp], tones: [template.tone], design: PLACEHOLDER, template };
}

const TYPE_ES: Record<BlueprintKey, string> = { tee: "camiseta", hoodie: "sudadera con capucha", sweat: "sudadera", mug: "taza", tote: "bolsa tote", poster: "póster", sticker: "pegatina", kids: "camiseta infantil", framed: "lámina enmarcada", canvas: "lienzo", towel: "toalla de playa", apron: "delantal", pillow: "cojín", bandana: "bandana", phonecase: "funda", puzzle: "puzle", doormat: "felpudo", blanket: "manta", cap: "gorra", beanie: "gorro", embtee: "camiseta bordada", embhoodie: "sudadera bordada", patch: "parche", glass: "vaso", coaster: "posavasos", tumbler: "vaso térmico", flag: "bandera", postcard: "postal", calendar: "calendario" };

function copyFor(spec: Spec, res: Resolved) {
  const { bp, design } = spec;
  if (spec.kind === "blank") {
    return {
      name: `${bp.label} personalizada`,
      short: `Diseña tu propia ${TYPE_ES[bp.key]}: textos, tipografías y tu imagen. La fabricamos para ti.`,
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
    const max = spec.kind === "blank" ? 4 : (bp.maxColors ?? 2);
    colors = pref.filter((c) => live.some((v) => (v.color ?? "").toLowerCase() === c.toLowerCase())).slice(0, max);
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

const FEATURED = new Set(["p:firma-leon:tee", "p:espana-bandas:tee", "p:sol-de-espana:tee", "p:aficion-balon:tee", "p:atardecer-mediterraneo:tee", "p:firma-leon:hoodie", "p:hora-del-vermut:mug", "p:tierra-de-castillos:poster"]);

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
    const png = await renderDesign(design, { width: res.printfile.width, height: res.printfile.height, mode: bp.renderMode });
    const url = await uploadObject(`catalog/prints/${design.slug}-${rk.slice(4).replace(":", "-")}.png`, png, "image/png");
    files.push({ type: res.placement ?? bp.placement, url });
  }

  const copy = copyFor(spec, res);
  const collectionSlug = spec.kind === "design" ? design.collection : spec.kind === "template" ? (spec.template!.template === "jersey" ? "futbol" : spec.template!.template === "pueblo" ? "mi-pueblo" : "esenciales") : "esenciales";
  const collectionId = await ensureCollection(collectionSlug);
  const { data: cat } = await sb.from("categories").select("id").eq("brand_id", env.brandId()).eq("code", bp.category).maybeSingle();
  const costs = variants.map((v) => (v.cost == null ? null : Number(v.cost)));
  const personalization: PersoConfig | null =
    spec.kind === "blank"
      ? { mode: "designer", placements: spec.blank!.placements, extraPrice: 5, maxLayers: 8 }
      : spec.kind === "template"
        ? PRESETS[spec.template!.template]
        : null;
  const basePrice = bp.price + (personalization ? 0 : 0);
  const details = [bp.details, copy.paper ? `Papel: ${copy.paper.replace(/-/g, " ")}.` : "", `Cuidados: ${bp.care}`].filter(Boolean).join("\n\n");
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
      print_config: files.length ? { files, canvas: res.printfile, catalog: job.key } : { personalized: true, placement: spec.kind === "template" ? PRESETS[spec.template!.template].placement : "front", canvas: res.printfile, catalog: job.key },
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
  await save(job, { phase: "test", product_id: product.id, state: { slug, resKey: rk, files }, error: null });
  return { key: job.key, phase: "test", done: false, message: `${copy.name} · ${variants.length} variantes` };
}

/** Never sell under a healthy margin: at least cost × 1.9 + 3 € (VAT, payment fees, returns). */
function priceFor(target: number, cost: number | null) {
  return retail(cost != null ? Math.max(target, Number(cost) * 1.9 + 3) : target);
}

/* ───────────────────────── mockups ───────────────────────── */

async function webp(buf: Buffer, width = 1400) {
  return sharp(buf).resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
}

/** Lifestyle-style scenes for posters (Gelato has no mockup API): framed on a wall + flat detail. */
async function posterScenes(poster: Buffer, opts: { frame?: string | null; mat?: boolean } = { frame: "#141414", mat: true }) {
  const W = 1600, H = 2000;
  const meta = await sharp(poster).metadata();
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
  const art = await sharp(poster).resize(pw, ph).png().toBuffer();
  const scene = await sharp(wall).composite([{ input: art, left: fx + frame + mat, top: fy + frame + mat }]).webp({ quality: 84 }).toBuffer();

  const dw = 1000, dh = Math.round(dw * ratio), dW = 1400, dH = dh + 420;
  const bg = Buffer.from(
    `<svg width="${dW}" height="${dH}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="${dW}" height="${dH}" fill="#ece8e1"/><rect x="${(dW - dw) / 2 + 10}" y="${(dH - dh) / 2 + 22}" width="${dw}" height="${dh}" fill="#000" opacity="0.25" filter="url(#s)"/></svg>`,
  );
  const art2 = await sharp(poster).resize(dw, dh).png().toBuffer();
  const flat = await sharp(bg).composite([{ input: art2, left: (dW - dw) / 2, top: (dH - dh) / 2 }]).webp({ quality: 84 }).toBuffer();
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
      png = await sharp(png).resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    } else {
      png = await renderDesign(PLACEHOLDER, { width, height, mode: bp.renderMode });
    }
    artUrl = await uploadObject(`catalog/mockup-src/${job.key.replace(/:/g, "-")}.png`, png, "image/png");
  }

  if (res.provider === "prodigi") {
    const poster = Buffer.from(await (await fetch(artUrl)).arrayBuffer());
    const colors = [...new Set((pvars ?? []).map((v) => v.color))];
    let n = 0;
    for (const color of colors) {
      const hex = !color ? null : ({ black: "#141414", white: "#f4f2ee", natural: "#b48a5a" } as Record<string, string>)[color.toLowerCase()] ?? "#141414";
      const [scene] = await posterScenes(poster, bp.key === "canvas" ? { frame: null, mat: false } : { frame: hex ?? "#141414", mat: true });
      const url = await uploadObject(`catalog/media/${st.slug}/scene-${n}.webp`, scene, "image/webp");
      const v = (pvars ?? []).find((x) => x.color === color);
      await addImage(product!.id, url, [product!.name, color].filter(Boolean).join(" — "), n++, color ? (v?.id ?? null) : null, "LIFESTYLE");
      if (v) await sb.from("product_variants").update({ image: url }).eq("product_id", product!.id).eq("color", color ?? "");
    }
    const [, flat] = await posterScenes(poster, { frame: null, mat: false });
    await addImage(product!.id, await uploadObject(`catalog/media/${st.slug}/flat.webp`, flat, "image/webp"), `${product!.name} — detalle`, n, null);
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
    const poster = await (await fetch(artUrl)).arrayBuffer();
    const [scene, flat] = await posterScenes(Buffer.from(poster));
    const a = await uploadObject(`catalog/media/${st.slug}/scene.webp`, scene, "image/webp");
    const b = await uploadObject(`catalog/media/${st.slug}/flat.webp`, flat, "image/webp");
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
    if (ext && !perColor.has(k)) perColor.set(k, ext);
  }
  const placementOk = res.placements.includes(placement) ? placement : res.placements[0];
  const { width, height } = res.printfile;
  try {
    const taskKey = await createMockupTask({
      productId: res.externalId,
      variantIds: [...perColor.values()],
      format: "jpg",
      files: [{ placement: placementOk, imageUrl: artUrl, position: { area_width: width, area_height: height, width, height, top: 0, left: 0 } }],
    });
    await save(job, { phase: "poll", state: { ...st, taskKey, perColor: Object.fromEntries(perColor), design: design.slug } });
    return { key: job.key, phase: "poll", done: false, waitMs: 8000 };
  } catch (e) {
    if (isProviderError(e) && e.status === 429) return { key: job.key, phase: "mockup", done: false, waitMs: 30_000, message: "Printful rate limit — esperando" };
    throw e;
  }
}

async function stepPoll(job: JobRow): Promise<StepResult> {
  const st = job.state as { taskKey: string; perColor: Record<string, string> };
  const task = await getMockupTask(st.taskKey);
  if (task.status === "pending") return { key: job.key, phase: "poll", done: false, waitMs: 6000 };
  if (task.status === "failed") throw new Error(`Mockup task failed: ${task.error ?? "unknown"}`);
  const colorOf = new Map(Object.entries(st.perColor).map(([c, ext]) => [Number(ext), c]));
  const pending: { url: string; color: string; kind: "MOCKUP" | "LIFESTYLE"; title: string }[] = [];
  for (const [i, m] of (task.mockups ?? []).entries()) {
    const color = colorOf.get(m.variant_ids[0]) ?? "_";
    pending.push({ url: m.mockup_url, color, kind: "MOCKUP", title: "" });
    // extra angles: skip views of placements we do not print on (e.g. a blank back)
    const printed = String((m as { placement?: string }).placement ?? "front");
    const extra = ((m as { extra?: { title?: string; url: string; option?: string }[] }).extra ?? [])
      .filter((x) => !(/back/i.test(`${x.title} ${x.option}`) && !/back/i.test(printed)))
      .slice(0, i === 0 ? 3 : 1);
    for (const x of extra) pending.push({ url: x.url, color, kind: /lifestyle|model|men|women|person/i.test(`${x.title} ${x.option}`) ? "LIFESTYLE" : "MOCKUP", title: x.title ?? "" });
  }
  if (!pending.length) throw new Error("Mockup task returned no images");
  await save(job, { phase: "images", state: { ...job.state, pending, done: 0 } });
  return { key: job.key, phase: "images", done: false };
}

async function stepImages(job: JobRow): Promise<StepResult> {
  const sb = db();
  const st = job.state as { slug: string; pending: { url: string; color: string; kind: "MOCKUP" | "LIFESTYLE"; title: string }[]; done: number };
  const { data: product } = await sb.from("products").select("id, name").eq("id", job.product_id!).single();
  const { data: pvars } = await sb.from("product_variants").select("id, color, image").eq("product_id", job.product_id!);
  const batch = st.pending.slice(st.done, st.done + 3);
  for (const [j, img] of batch.entries()) {
    const n = st.done + j;
    const r = await fetch(img.url);
    if (!r.ok) throw new Error(`mockup download ${r.status}`);
    const url = await uploadObject(`catalog/media/${st.slug}/${n}.webp`, await webp(Buffer.from(await r.arrayBuffer())), "image/webp");
    const variant = (pvars ?? []).find((v) => (v.color ?? "_") === img.color) ?? null;
    await addImage(product!.id, url, [product!.name, img.color !== "_" ? img.color : null, img.title || null].filter(Boolean).join(" — "), n, variant?.id ?? null, img.kind);
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
  // rebuild: the design changed — retire the live product (hidden + archived, slug freed, order history intact)
  // and build it again from the current artwork.
  if (opts.rebuild && kind === "PRODUCT" && (job.phase === "done" || job.phase === "failed")) {
    if (job.product_id) {
      const { data: old } = await db().from("products").select("slug").eq("id", job.product_id).maybeSingle();
      if (old) await db().from("products").update({ status: "ARCHIVED", visibility: "HIDDEN", slug: `${old.slug}-v${Date.now().toString(36)}` }).eq("id", job.product_id);
    }
    await save(job, { phase: "new", product_id: null, state: {}, error: null, attempts: 0 });
    job.phase = "new";
    job.product_id = null;
    job.state = {};
  }
  // reset: re-resolve a provider lookup (e.g. after a provider-selection change). Only for RESOLVE jobs
  // and only if no product built on it is already live — products keep their own mapping.
  if (opts.reset && kind === "RESOLVE" && job.phase !== "new") {
    await save(job, { phase: "new", state: {}, error: null, attempts: 0 });
    job.phase = "new";
    job.state = {};
  }
  if (job.phase === "done") return { key, phase: "done", done: true };
  if (job.phase === "failed") {
    if (!opts.retry) return { key, phase: "failed", done: true, error: job.error ?? undefined };
    // retry: drop a half-built product and start again
    if (job.product_id) await db().from("products").delete().eq("id", job.product_id).neq("status", "PUBLISHED");
    await save(job, { phase: "new", product_id: null, state: {}, error: null });
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
    if (isProviderError(e) && (e.status === 429 || e.status === null || (e.status ?? 0) >= 500) && job.attempts < 6) {
      await save(job, { attempts: job.attempts + 1, error: msg });
      return { key, phase: job.phase, done: false, waitMs: e.status === 429 ? 30_000 : 5_000, error: msg };
    }
    log.warn("CATALOG", "catalog build step failed", { key, phase: job.phase, msg });
    await save(job, { phase: "failed", error: msg.slice(0, 900), attempts: job.attempts + 1 });
    return { key, phase: "failed", done: true, error: msg };
  }
}


/* ───────────────────────── server-side runner (cron) ───────────────────────── */

/**
 * Runs catalog steps for ~`budgetMs` with `workers` parallel jobs. Picks resolves first, then
 * jobs already in progress, then new plan items. Leases make it safe next to the browser runner.
 * A new step only starts while there is time left for it to finish inside the function limit.
 */
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
  const fresh = plan.filter((p) => p.kind === "PRODUCT" && open(p.key) && (!state.has(p.key) || state.get(p.key)!.phase === "new") && free(p.key));
  const queue = [...resolves, ...inProgress, ...fresh].map((p) => p.key);
  const remaining = queue.length;
  const results: { key: string; phase: string; error?: string }[] = [];
  const worker = async () => {
    while (queue.length && Date.now() - started < budget) {
      const key = queue.shift()!;
      // keep stepping the same job while time allows (mockup polling etc.)
      for (let i = 0; i < 12 && Date.now() - started < budget; i++) {
        const r = await runStep(key, staff);
        if (r.done || r.waitMs) {
          results.push({ key, phase: r.phase, error: r.error });
          break;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: opts.workers ?? 3 }, worker));
  return { ms: Date.now() - started, remaining, processed: results.length, results: results.slice(0, 20) };
}

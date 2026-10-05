import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { isRetiredDesign } from "@/lib/catalog/retired";

/**
 * Storefront reads. Explicit public column lists only: costs, provider IDs and
 * mappings are never selected here (customers never learn which provider is used).
 */

export interface PublicVariant {
  id: string;
  name: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  price: number;
  compareAt: number | null;
  available: boolean;
  /** First photo of this colour (listing: first colours only; null when the payload does not carry it). */
  image?: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  story: string | null;
  price: number;
  compareAt: number | null;
  currency: string;
  productType: string;
  categoryCode: string | null;
  limited: boolean;
  limitedType: string | null;
  limitedUntil: string | null;
  limitedRemaining: number | null; // only when technically enforced (QUANTITY)
  /** `model`: girl/boy model photo of kids' garments (read from the alt tag the catalog builder writes). */
  images: { url: string; alt: string | null; color: string | null; kind: string; model?: "girl" | "boy" }[];
  variants: PublicVariant[];
  /** Library design this product was made from (for "Diseña en este estilo" and "Completa el look"). */
  design: string | null;
  sizeGuide: SizeGuide | null;
  featured: boolean;
  publishedAt: string | null;
  collection: { slug: string; name: string } | null;
  personalization: import("@/lib/personalization/types").PersoConfig | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  updatedAt: string;
}

export interface SizeGuide {
  unit: string;
  sizes: string[];
  rows: { label: string; values: string[] }[];
  note?: string;
}

/** Reduce a provider size table to a neutral public table (no provider identifiers). */
function toSizeGuide(raw: unknown): SizeGuide | null {
  const r = raw as { size_tables?: { type: string; unit?: string; description?: string; measurements?: { type_label: string; values: { size: string; value?: string; min_value?: string; max_value?: string }[] }[] }[] } | null;
  const table = r?.size_tables?.find((t) => t.type === "product_measure") ?? r?.size_tables?.[0];
  if (!table?.measurements?.length) return null;
  const sizes = [...new Set(table.measurements.flatMap((m) => m.values.map((v) => v.size)))];
  const fmt = (v?: { value?: string; min_value?: string; max_value?: string }) => (!v ? "—" : v.value ?? (v.min_value && v.max_value ? `${v.min_value}–${v.max_value}` : (v.min_value ?? v.max_value ?? "—")));
  const LABEL: Record<string, string> = { Length: "Largo", Width: "Ancho", Chest: "Pecho", "Sleeve length": "Manga", Waist: "Cintura", Hips: "Cadera" };
  return {
    unit: table.unit === "inches" ? "in" : "cm",
    sizes,
    rows: table.measurements.map((m) => ({ label: LABEL[m.type_label] ?? m.type_label, values: sizes.map((s) => fmt(m.values.find((v) => v.size === s))) })),
  };
}

export interface PublicCollection {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  story: string | null;
  heroImage: string | null;
  accentColor: string | null;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
}

const PRODUCT_SELECT = `id, name, slug, short_description, description, story, retail_price, compare_at_price, currency, product_type,
  limited, limited_type, limited_until, limited_quantity, limited_sold, personalization, tags, seo_title, seo_description, og_image, updated_at, featured, published_at, metadata,
  categories:category_id(code),
  collections:collection_id(slug, name),
  product_images(url, alt, sort, kind, variant_id),
  product_variants(id, variant_name, size, color, color_hex, retail_price, compare_at_price, active, stock_status, sort, image)`;

type Row = Record<string, unknown> & {
  /** `color` comes straight from the listing RPC (20261004000001); full reads resolve it through variant_id. */
  product_images?: { url: string; alt: string | null; sort: number; kind: string; variant_id: string | null; color?: string | null }[];
  product_variants?: { id: string; variant_name: string; size: string | null; color: string | null; color_hex: string | null; retail_price: number | null; compare_at_price: number | null; active: boolean; stock_status: string; sort: number; image?: string | null }[];
};

function mapProduct(r: Row): PublicProduct {
  const price = Number(r.retail_price);
  const limitedType = (r.limited_type as string | null) ?? null;
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    shortDescription: (r.short_description as string) ?? null,
    description: (r.description as string) ?? null,
    story: (r.story as string) ?? null,
    price,
    compareAt: r.compare_at_price != null ? Number(r.compare_at_price) : null,
    currency: (r.currency as string) ?? "EUR",
    productType: r.product_type as string,
    categoryCode: ((r.categories as { code?: string } | null)?.code as string) ?? null,
    limited: Boolean(r.limited),
    limitedType,
    limitedUntil: (r.limited_until as string) ?? null,
    limitedRemaining: limitedType === "QUANTITY" ? Math.max(0, Number(r.limited_quantity ?? 0) - Number(r.limited_sold ?? 0)) : null,
    images: (r.product_images ?? [])
      .filter((i) => i.kind !== "PRINT_FILE")
      .sort((a, b) => a.sort - b.sort)
      .map((i) => ({ url: i.url, alt: i.alt ?? null, kind: i.kind, color: i.color ?? ((i.variant_id && r.product_variants?.find((v) => v.id === i.variant_id)?.color) || null), ...modelOf(i.alt) })),
    design: ((r.metadata as { catalog?: { design?: string | null } } | null)?.catalog?.design as string) ?? null,
    sizeGuide: toSizeGuide((r.metadata as { size_guide?: unknown } | null)?.size_guide ?? null),
    featured: Boolean(r.featured),
    publishedAt: (r.published_at as string) ?? null,
    variants: (r.product_variants ?? [])
      .filter((v) => v.active)
      .sort((a, b) => a.sort - b.sort)
      .map((v) => ({
        id: v.id,
        name: v.variant_name,
        size: v.size,
        color: v.color,
        colorHex: v.color_hex,
        price: v.retail_price != null ? Number(v.retail_price) : price,
        compareAt: v.compare_at_price != null ? Number(v.compare_at_price) : null,
        available: v.stock_status !== "OUT_OF_STOCK" && v.stock_status !== "DISCONTINUED",
        image: v.image ?? null,
      })),
    collection: (r.collections as { slug: string; name: string } | null) ?? null,
    personalization: (r.personalization as PublicProduct["personalization"]) ?? null,
    tags: (r.tags as string[]) ?? [],
    seoTitle: (r.seo_title as string) ?? null,
    seoDescription: (r.seo_description as string) ?? null,
    ogImage: (r.og_image as string) ?? null,
    updatedAt: r.updated_at as string,
  };
}

/** Products made from a retired library design are hidden at once (before the DB archive runs). */
export const isLive = (p: Pick<PublicProduct, "design">) => !isRetiredDesign(p.design);

function publishedQuery() {
  const sb = dbOrNull();
  if (!sb) return null;
  return sb
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("brand_id", env.brandId())
    .eq("status", "PUBLISHED")
    .eq("fulfillment_eligible", true)
    .eq("visibility", "PUBLIC");
}

/* Listing data: the catalog has ~1500 products × up to 48 colours × sizes, so the full join is heavy.
 * Three layers keep Supabase egress down (free plan: 5 GB/month; the RPC answer was ~4 MB):
 *  1. Next's data cache (unstable_cache → Netlify's shared cache): ONE database read per LISTING_REVALIDATE
 *     for all server instances, instead of one per cold instance every 2 minutes. Stored in chunks of
 *     LISTING_CHUNK products so no entry nears the 2 MB data-cache item limit.
 *  2. A per-instance snapshot (stale-while-revalidate) on top, so warm instances skip even the cache read.
 *  3. A lean payload: per product only what listing cards use (see compactVariants / listing_products).
 * Product pages still load their own full record via getProductBySlug.
 * ("use cache" needs the cacheComponents flag, which changes rendering for the whole app; unstable_cache
 * is the data-cache primitive that works without it in this Next version.) */
const LISTING_TTL = 180_000;
const LISTING_REVALIDATE = 3600; // s — new products appear within the hour (or at once via revalidateTag("listing"))
const LISTING_CHUNK = 250;
let snapshot: { at: number; rows: PublicProduct[] } | null = null;
let inflight: Promise<PublicProduct[]> | null = null;

/** One entry per colour (and per distinct price) for the first 6 colours, plus the price extremes: all a card uses. */
/** " — niña" / " — niño" at the end of a photo's alt marks a girl / boy model photo. */
function modelOf(alt: string | null | undefined): { model?: "girl" | "boy" } {
  if (!alt) return {};
  if (/— niña$/.test(alt)) return { model: "girl" };
  if (/— niño$/.test(alt)) return { model: "boy" };
  return {};
}

function compactVariants(p: PublicProduct): PublicProduct {
  // first two photos, the first lifestyle shot, and for kids' wear the first girl and first boy model photo
  const firstGirl = p.images.findIndex((x) => x.model === "girl");
  const firstBoy = p.images.findIndex((x) => x.model === "boy");
  const images = p.images.filter((im, i) => i < 2 || i === firstGirl || i === firstBoy || (im.kind === "LIFESTYLE" && p.images.findIndex((x) => x.kind === "LIFESTYLE") === i)).map((im) => ({ ...im, alt: null }));
  // personalisable bases feed the designer / Personaliza, which need every size variant
  if (p.personalization) return { ...p, images, description: null, story: null, sizeGuide: null };
  const seen = new Set<string>();
  const unique = p.variants.filter((v) => {
    const k = `${v.colorHex ?? v.color ?? ""}|${v.price}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const colours = [...new Set(unique.map((v) => v.colorHex ?? v.color ?? ""))].slice(0, 6);
  const prices = unique.map((v) => v.price);
  const lo = unique.find((v) => v.price === Math.min(...prices)), hi = unique.find((v) => v.price === Math.max(...prices));
  const variants = unique.filter((v) => colours.includes(v.colorHex ?? v.color ?? "") || v === lo || v === hi);
  return { ...p, images, variants, description: null, story: null, sizeGuide: null };
}

async function loadListing(): Promise<PublicProduct[]> {
  // local design previews without a database (never in production): LISTING_FIXTURE=/abs/path/products.json
  if (process.env.LISTING_FIXTURE && process.env.NODE_ENV !== "production") {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(process.env.LISTING_FIXTURE, "utf8")) as PublicProduct[];
  }
  const sb = dbOrNull();
  if (!sb) return [];
  // one round trip: the DB builds the lean listing (first images, one variant per colour) — see migration listing_products
  const rpc = await sb.rpc("listing_products", { p_brand: env.brandId() });
  if (!rpc.error && Array.isArray(rpc.data)) return (rpc.data as Row[]).map((r) => compactVariants(mapProduct(r)));
  // fallback (function not deployed yet): small pages in sequence
  const PAGE = 120;
  const out: PublicProduct[] = [];
  for (let i = 0; i < 25; i++) {
    const { data, error } = await publishedQuery()!.lt("product_images.sort", 4).order("published_at", { ascending: false }).order("id").range(i * PAGE, i * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []).map((r) => compactVariants(mapProduct(r as Row))));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/* One database read feeds every chunk that misses together (count + chunks revalidate at the same moment). */
let shared: { at: number; p: Promise<PublicProduct[]> } | null = null;
function loadListingShared() {
  if (!shared || Date.now() - shared.at > 60_000) {
    const p = loadListing();
    shared = { at: Date.now(), p };
    p.catch(() => {
      if (shared?.p === p) shared = null;
    });
  }
  return shared.p;
}
const cachedListingCount = unstable_cache(async () => {
  const n = (await loadListingShared()).length;
  if (!n) throw new Error("LISTING_EMPTY"); // never pin an empty catalogue in the shared cache
  return n;
},["listing-count-v1"], { revalidate: LISTING_REVALIDATE, tags: ["listing"] });
const cachedListingChunk = unstable_cache(async (i: number) => (await loadListingShared()).slice(i * LISTING_CHUNK, (i + 1) * LISTING_CHUNK), ["listing-chunk-v1"], { revalidate: LISTING_REVALIDATE, tags: ["listing"] });

async function loadListingCached(): Promise<PublicProduct[]> {
  try {
    const n = await cachedListingCount();
    const chunks = await Promise.all(Array.from({ length: Math.ceil(n / LISTING_CHUNK) }, (_, i) => cachedListingChunk(i)));
    // chunks revalidated a moment apart can overlap by a product or two: keep the first of each
    const seen = new Set<string>();
    return chunks.flat().filter((p) => !seen.has(p.id) && !!seen.add(p.id));
  } catch {
    // outside a request / cache unavailable: read directly
    return loadListingShared();
  }
}

async function listing(): Promise<PublicProduct[]> {
  const fresh = snapshot && Date.now() - snapshot.at < LISTING_TTL;
  if (fresh) return snapshot!.rows;
  if (!inflight) {
    inflight = loadListingCached()
      // filtered after the shared cache, so entries cached before a retirement deploy are cleaned too
      .then((all) => all.filter(isLive))
      .then((rows) => {
        snapshot = { at: Date.now(), rows };
        return rows;
      })
      .finally(() => {
        inflight = null;
      });
  }
  // stale-while-revalidate: serve the previous snapshot while the new one loads (or if it fails)
  if (snapshot) {
    inflight.catch(() => null);
    return snapshot.rows;
  }
  return inflight;
}

export const getPublishedProducts = cache(async (opts: { collectionId?: string; category?: string; limit?: number; featured?: boolean } = {}) => {
  let rows = await listing().catch(() => [] as PublicProduct[]);
  if (opts.collectionId) {
    // collection pages filter by id: resolve through the slug-carrying join
    const q = publishedQuery();
    if (q) {
      const { data } = await q.eq("collection_id", opts.collectionId).lt("product_images.sort", 4).order("published_at", { ascending: false }).limit(opts.limit ?? 60);
      return (data ?? []).map((r) => compactVariants(mapProduct(r as Row))).filter((p) => isLive(p) && (!opts.category || p.categoryCode === opts.category));
    }
  }
  if (opts.featured) rows = rows.filter((p) => p.featured);
  if (opts.category) rows = rows.filter((p) => p.categoryCode === opts.category);
  return rows.slice(0, opts.limit ?? 60);
});

/* Full product record (every colour × size, size guide): 30–100 KB per read and crawlers walk all ~1500
 * pages, so it is shared across instances for 10 min too. Checkout re-prices from the database. */
const cachedProductRow = unstable_cache(
  async (slug: string) => {
    const q = publishedQuery();
    if (!q) return null;
    const { data, error } = await q.eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message); // errors are not cached
    return (data as Row | null) ?? null;
  },
  ["product-by-slug-v1"],
  { revalidate: 600, tags: ["listing", "product"] },
);

export const getProductBySlug = cache(async (slug: string) => {
  // local design previews without a database (never in production)
  if (process.env.LISTING_FIXTURE && process.env.NODE_ENV !== "production") {
    const hit = (await loadListing()).find((p) => p.slug === slug);
    if (hit) return { ...hit, description: hit.description ?? "Algodón 100 %, impresión directa. Fabricado bajo pedido en Europa." };
  }
  const row = await cachedProductRow(slug).catch(async () => {
    const q = publishedQuery();
    return q ? ((await q.eq("slug", slug).maybeSingle()).data as Row | null) : null;
  });
  return row ? mapProduct(row) : null;
});

/** Bestsellers from REAL paid orders only; empty when there are no sales yet. */
export const getBestsellers = cache(async (limit = 8) => {
  const sb = dbOrNull();
  if (!sb) return [] as PublicProduct[];
  const { data: perf } = await sb
    .from("v_product_performance")
    .select("product_id, units_sold")
    .eq("brand_id", env.brandId())
    .eq("status", "PUBLISHED")
    .gt("units_sold", 0)
    .order("units_sold", { ascending: false })
    .limit(limit);
  const ids = (perf ?? []).map((p) => p.product_id);
  if (!ids.length) return [];
  const q = publishedQuery();
  if (!q) return [];
  const { data } = await q.in("id", ids);
  const byId = new Map((data ?? []).map((r) => [r.id as string, mapProduct(r as Row)]));
  return (ids.map((id) => byId.get(id)).filter(Boolean) as PublicProduct[]).filter(isLive);
});

function mapCollection(c: Record<string, unknown>): PublicCollection {
  return {
    id: c.id as string,
    slug: c.slug as string,
    name: c.name as string,
    tagline: (c.tagline as string) ?? null,
    story: (c.story as string) ?? null,
    heroImage: (c.hero_image as string) ?? null,
    accentColor: (c.accent_color as string) ?? null,
    featured: Boolean(c.featured),
    seoTitle: (c.seo_title as string) ?? null,
    seoDescription: (c.seo_description as string) ?? null,
    ogImage: (c.og_image as string) ?? null,
  };
}

/** Editorial fallback so the brand still presents itself if the DB is unreachable. */
export const FALLBACK_COLLECTIONS: PublicCollection[] = [
  { id: "esenciales", slug: "esenciales", name: "ESENCIALES", tagline: "La firma ROJO Y GUALDA en negro, crema y oro.", story: null, heroImage: null, accentColor: null, featured: true, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "espana", slug: "espana", name: "ESPAÑA", tagline: "Un país. Mil formas de llevarlo.", story: null, heroImage: null, accentColor: null, featured: true, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "heritage", slug: "heritage", name: "HERITAGE", tagline: "Lo que heredamos, lo que llevamos.", story: null, heroImage: null, accentColor: null, featured: true, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "mediterraneo", slug: "mediterraneo", name: "MEDITERRÁNEO", tagline: "Sal, luz y tiempo lento.", story: null, heroImage: null, accentColor: null, featured: true, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "motor", slug: "motor", name: "MOTOR", tagline: "Curvas, gasolina y carretera nacional.", story: null, heroImage: null, accentColor: null, featured: true, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "futbol", slug: "futbol", name: "AFICIÓN", tagline: "El fútbol se vive en la grada, en el bar y en la calle.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "padel", slug: "padel", name: "PÁDEL", tagline: "El deporte que se juega en cada barrio.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "ciclismo", slug: "ciclismo", name: "CICLISMO", tagline: "Puertos de montaña y salidas de domingo.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "mi-pueblo", slug: "mi-pueblo", name: "MI PUEBLO", tagline: "Tu pueblo, en tu camiseta.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "fiestas", slug: "fiestas", name: "FIESTAS", tagline: "Fallas, Hogueras, ferias y verbenas.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "playa", slug: "playa", name: "PLAYA", tagline: "Verano, chiringuito y Mediterráneo.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "tapas", slug: "tapas", name: "TAPAS & VINO", tagline: "Un vino, unas tapas y la mejor compañía.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "ciudades", slug: "ciudades", name: "CIUDADES", tagline: "Tu ciudad, a tamaño cartel.", story: "Una serie de carteles tipográficos para las ciudades de España: el nombre en grande, la rojigualda, su lema y sus coordenadas. De Madrid a Tenerife.", heroImage: null, accentColor: null, featured: true, seoTitle: "Camisetas de ciudades de España", seoDescription: "Camisetas, tazas, bolsas y pósters de Madrid, Barcelona, València, Sevilla, Bilbao, Málaga y más ciudades de España.", ogImage: null },
  { id: "militar", slug: "militar", name: "ESTILO MILITAR", tagline: "Camuflaje, parches y orgullo de servicio.", story: "Inspiración militar sin emblemas oficiales: camuflajes, parches de bandera y homenajes a quienes sirvieron.", heroImage: null, accentColor: null, featured: false, seoTitle: "Camisetas estilo militar: camuflaje y parches de España", seoDescription: "Camisetas, sudaderas y tazas de estilo militar: camuflaje, parche de bandera, veteranos y más.", ogImage: null },
  { id: "profesiones", slug: "profesiones", name: "PROFESIONES", tagline: "Orgullo de oficio: sanidad, emergencias, taxi, campo, cocina y más.", story: "Una línea para la gente que mueve el país cada día. Cada oficio en ilustración de autor a gran tamaño o en cartel tipográfico, y puedes añadir tu nombre o cambiar el texto en «Diseña en este estilo».", heroImage: null, accentColor: null, featured: true, seoTitle: "Camisetas de profesiones: sanidad, bomberos, taxi, cocina…", seoDescription: "Camisetas, sudaderas y tazas para médicos, enfermería, bomberos, taxistas, camioneros, docentes, cocineros y más. Personalizables con tu nombre.", ogImage: null },
  { id: "leon", slug: "leon", name: "LEÓN", tagline: "El león de la casa: bordado, impreso y a la espalda.", story: "Toda la serie del león: gorras y gorros bordados en hilo de oro y rojo, el león coronado en camisetas y sudaderas de doble cara, la insignia HISPANIA, el blasón y «corazón de león» en tazas, bolsas, botellas, fundas y láminas.", heroImage: null, accentColor: null, featured: true, seoTitle: "Serie León: gorras bordadas, camisetas y accesorios con el león", seoDescription: "Gorras y gorros bordados con el león, camisetas y sudaderas del león coronado, tazas, bolsas, botellas, fundas y láminas. Fabricado bajo pedido en Europa.", ogImage: null },
  { id: "camino", slug: "camino", name: "CAMINO", tagline: "Buen Camino hasta Santiago.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "sabiduria", slug: "sabiduria", name: "REFRANERO Y SABIDURÍA", tagline: "Refranes de siempre, frases de abuela y humor español, compuestos a lo grande.", story: "Una serie tipográfica con el refranero español y frases nuestras: refranes clásicos, orgullo de aquí, frases de abuela, humor, calma, amor y peques. Letra grande, azulejos, sellos vintage y el león de la casa.", heroImage: null, accentColor: null, featured: true, seoTitle: "Camisetas con refranes y frases españolas", seoDescription: "Camisetas, sudaderas, tazas, delantales, cojines y láminas con refranes españoles, frases de abuela y humor español. Fabricado bajo pedido en Europa.", ogImage: null },
  { id: "statement", slug: "statement", name: "STATEMENT", tagline: "Estampados grandes: brocha, spray, espalda gigante y marcas mínimas.", story: "La línea de streetwear de la casa: brochazos rojo y gualda de lado a lado, grafiti con goterones, prints gigantes a la espalda con una marca pequeña al pecho, monogramas y bordados mínimos, postales de los setenta y collages de nuestras ilustraciones. En negro, blanco, arena, marino, oliva y rojo — y en camiseta y sudadera oversize.", heroImage: null, accentColor: null, featured: true, seoTitle: "Camisetas y sudaderas streetwear de España: estampado grande y espalda", seoDescription: "Camisetas oversize, sudaderas y bolsas con brochazos rojo y gualda, grafiti, prints gigantes a la espalda, monogramas bordados y postales retro de España. Fabricado bajo pedido en Europa.", ogImage: null },
  { id: "familia", slug: "familia", name: "FAMILIA", tagline: "Para los que más quieres: abuelos, peques y bebés.", story: "El león coronado de la casa para toda la familia: el mejor abuelo de España, la abuela de oro, pequeños leones y su primer Mundial.", heroImage: null, accentColor: null, featured: false, seoTitle: "Regalos para abuelos, niños y bebés", seoDescription: "Camisetas, sudaderas, bodies y tazas para abuelos, niños y bebés con el león coronado y el orgullo de España. Fabricado bajo pedido en Europa.", ogImage: null },
];

export const getCollections = cache(async () => {
  const sb = dbOrNull();
  if (!sb) return FALLBACK_COLLECTIONS;
  const { data, error } = await sb.from("collections").select("*").eq("brand_id", env.brandId()).eq("status", "ACTIVE").order("sort");
  if (error) return FALLBACK_COLLECTIONS;
  return (data ?? []).map(mapCollection);
});

export const getCollectionBySlug = cache(async (slug: string) => {
  const all = await getCollections();
  // Theme hubs (sport, fiestas, pueblo…) always have a page, even before the DB row is active.
  return all.find((c) => c.slug === slug) ?? FALLBACK_COLLECTIONS.find((c) => c.slug === slug) ?? null;
});

/** Collections by slug, in the given order, falling back to editorial defaults. */
export const getCollectionsBySlugs = cache(async (slugs: string[]) => {
  const all = await getCollections();
  return slugs.map((s) => all.find((c) => c.slug === s) ?? FALLBACK_COLLECTIONS.find((c) => c.slug === s)).filter(Boolean) as PublicCollection[];
});

export const getCollectionCounts = cache(async () => {
  const products = await getPublishedProducts({ limit: 5000 });
  const counts: Record<string, number> = {};
  for (const p of products) if (p.collection) counts[p.collection.slug] = (counts[p.collection.slug] ?? 0) + 1;
  return counts;
});

export interface PublicDrop {
  id: string;
  name: string;
  slug: string;
  number: number | null;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  limited: boolean;
  heroImage: string | null;
  collection: { slug: string; name: string } | null;
}

export const getDrops = cache(async () => {
  const sb = dbOrNull();
  if (!sb) return [] as PublicDrop[];
  const { data } = await sb
    .from("drops")
    .select("id, name, slug, number, description, status, start_date, end_date, limited, hero_image, collections:collection_id(slug, name)")
    .eq("brand_id", env.brandId())
    .in("status", ["SCHEDULED", "LIVE", "ENDED"])
    .order("start_date", { ascending: false });
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    number: d.number,
    description: d.description,
    status: d.status,
    startDate: d.start_date,
    endDate: d.end_date,
    limited: d.limited,
    heroImage: d.hero_image,
    collection: (d.collections as unknown as { slug: string; name: string } | null) ?? null,
  }));
});

export const getOpenPoll = cache(async () => {
  const sb = dbOrNull();
  if (!sb) return null;
  const { data } = await sb
    .from("community_posts")
    .select("id, type, title, body, options, closes_at, status")
    .eq("brand_id", env.brandId())
    .eq("status", "OPEN")
    .in("type", ["POLL", "DESIGN_VOTE", "COLLECTION_VOTE"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
});

/** Free-shipping threshold for the home market (from configured shipping rules — never hard-coded). */
export const getShippingPromo = cache(async (country = "ES"): Promise<{ freeOver: number } | null> => {
  const sb = dbOrNull();
  if (!sb) return null;
  const { data } = await sb
    .from("shipping_rules")
    .select("free_over, country_codes, sort")
    .eq("brand_id", env.brandId())
    .eq("active", true)
    .contains("country_codes", [country])
    .order("sort")
    .limit(1)
    .maybeSingle();
  return data?.free_over != null ? { freeOver: Number(data.free_over) } : null;
});

/** Products customers can design themselves ("Diseña tú mismo"). */
export const getDesignerProducts = cache(async () => {
  const all = await getPublishedProducts({ limit: 2000 });
  return all.filter((p) => p.personalization?.mode === "designer");
});

/** Brand products with fill-in personalization templates (name + number, Mi Pueblo, year…). */
export const getTemplateProducts = cache(async () => {
  const all = await getPublishedProducts({ limit: 2000 });
  return all.filter((p) => p.personalization?.mode === "fields");
});

/**
 * Real product photos (provider mockups) for homepage tiles: one per product type / category /
 * collection, preferring bestsellers and featured items. Tiles fall back to illustrations when empty.
 */
export interface Showcase {
  byType: Record<string, string>;
  byCategory: Record<string, string>;
  byCollection: Record<string, string[]>;
  byTag: Record<string, string>;
  /** Fill-in jersey (name + number) and blank tee for the personalise / design tiles. */
  jersey: string | null;
  blank: string | null;
}
export const getShowcase = cache(async (): Promise<Showcase> => {
  const products = await getPublishedProducts({ limit: 500 }).catch(() => [] as PublicProduct[]);
  const score = (p: PublicProduct) => (p.tags.includes("arte") ? 6 : 0) + (p.tags.includes("lookbook") ? 5 : 0) + (p.tags.includes("bestseller") ? 4 : 0) + (p.featured ? 2 : 0) + (p.tags.includes("logo") ? 1 : 0);
  const sorted = [...products].filter((p) => p.images[0]?.url).sort((a, b) => score(b) - score(a));
  const out: Showcase = { byType: {}, byCategory: {}, byCollection: {}, byTag: {}, jersey: null, blank: null };
  const bySlug = (re: RegExp) => sorted.find((p) => re.test(p.slug))?.images[0]?.url ?? null;
  out.jersey = bySlug(/^nombre-dorsal-camiseta/);
  out.blank = bySlug(/^camiseta-personalizada/);
  for (const p of sorted) {
    const img = p.images[0].url;
    out.byType[p.productType] ??= img;
    if (p.categoryCode) out.byCategory[p.categoryCode] ??= img;
    if (p.collection) {
      const list = (out.byCollection[p.collection.slug] ??= []);
      if (list.length < 3 && !list.includes(img)) list.push(img);
    }
    for (const t of p.tags) out.byTag[t] ??= img;
  }
  return out;
});

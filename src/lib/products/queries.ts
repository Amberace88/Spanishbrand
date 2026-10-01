import "server-only";
import { cache } from "react";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

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
  images: { url: string; alt: string | null }[];
  variants: PublicVariant[];
  collection: { slug: string; name: string } | null;
  personalization: import("@/lib/personalization/types").PersoConfig | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  updatedAt: string;
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
  limited, limited_type, limited_until, limited_quantity, limited_sold, personalization, tags, seo_title, seo_description, og_image, updated_at,
  categories:category_id(code),
  collections:collection_id(slug, name),
  product_images(url, alt, sort, kind),
  product_variants(id, variant_name, size, color, color_hex, retail_price, compare_at_price, active, stock_status, sort)`;

type Row = Record<string, unknown> & {
  product_images?: { url: string; alt: string | null; sort: number; kind: string }[];
  product_variants?: { id: string; variant_name: string; size: string | null; color: string | null; color_hex: string | null; retail_price: number | null; compare_at_price: number | null; active: boolean; stock_status: string; sort: number }[];
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
    images: (r.product_images ?? []).filter((i) => i.kind !== "PRINT_FILE").sort((a, b) => a.sort - b.sort).map((i) => ({ url: i.url, alt: i.alt })),
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

export const getPublishedProducts = cache(async (opts: { collectionId?: string; category?: string; limit?: number; featured?: boolean } = {}) => {
  let q = publishedQuery();
  if (!q) return [] as PublicProduct[];
  if (opts.collectionId) q = q.eq("collection_id", opts.collectionId);
  if (opts.featured) q = q.eq("featured", true);
  const { data } = await q.order("published_at", { ascending: false }).limit(opts.limit ?? 60);
  let rows = (data ?? []).map((r) => mapProduct(r as Row));
  if (opts.category) rows = rows.filter((p) => p.categoryCode === opts.category);
  return rows;
});

export const getProductBySlug = cache(async (slug: string) => {
  const q = publishedQuery();
  if (!q) return null;
  const { data } = await q.eq("slug", slug).maybeSingle();
  return data ? mapProduct(data as Row) : null;
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
  return ids.map((id) => byId.get(id)).filter(Boolean) as PublicProduct[];
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
  { id: "tapas", slug: "tapas", name: "TAPAS & VERMUT", tagline: "La hora del vermut es sagrada.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
  { id: "camino", slug: "camino", name: "CAMINO", tagline: "Buen Camino hasta Santiago.", story: null, heroImage: null, accentColor: null, featured: false, seoTitle: null, seoDescription: null, ogImage: null },
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
  const products = await getPublishedProducts({ limit: 500 });
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
  const all = await getPublishedProducts({ limit: 200 });
  return all.filter((p) => p.personalization?.mode === "designer");
});

/** Brand products with fill-in personalization templates (name + number, Mi Pueblo, year…). */
export const getTemplateProducts = cache(async () => {
  const all = await getPublishedProducts({ limit: 200 });
  return all.filter((p) => p.personalization?.mode === "fields");
});

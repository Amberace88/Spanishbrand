import "server-only";
import { z } from "zod";
import { pf } from "./client";
import { pfCatalogProduct, pfEnvelope, pfProductWithVariants } from "./types";
import { mapCatalogProduct, mapCatalogVariant } from "./mapper";
import type { AvailabilityResult, NormalizedCatalogProduct, NormalizedVariant } from "../types";

/** GET /products — full catalog (no variants). */
export async function listCatalogProducts(categoryId?: string): Promise<NormalizedCatalogProduct[]> {
  const q = categoryId ? `?category_id=${encodeURIComponent(categoryId)}` : "";
  const res = await pf(`/products${q}`, pfEnvelope(z.array(pfCatalogProduct)), { timeoutMs: 45_000 });
  return res.result.map(mapCatalogProduct);
}

/** GET /products/{id} — product + variants. */
export async function getCatalogProduct(id: string) {
  const res = await pf(`/products/${encodeURIComponent(id)}`, pfEnvelope(pfProductWithVariants));
  const currency = res.result.product.currency ?? null;
  return {
    product: mapCatalogProduct(res.result.product),
    variants: res.result.variants.map((v) => mapCatalogVariant(v, currency)),
  };
}

export async function getCatalogVariants(id: string): Promise<NormalizedVariant[]> {
  return (await getCatalogProduct(id)).variants;
}

export async function getAvailability(id: string): Promise<AvailabilityResult> {
  const { variants } = await getCatalogProduct(id);
  return {
    productId: id,
    variants: variants.map((v) => ({ externalId: v.externalId, status: v.status, regions: v.availability })),
  };
}

/** GET /categories — response may be an array or { categories: [] }. */
export async function listCategories() {
  const cat = z.object({ id: z.number(), parent_id: z.number().nullable().optional(), title: z.string() }).passthrough();
  const res = await pf("/categories", pfEnvelope(z.union([z.array(cat), z.object({ categories: z.array(cat) })])));
  return Array.isArray(res.result) ? res.result : res.result.categories;
}

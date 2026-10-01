import "server-only";
import { gl } from "./client";
import { glCatalog, glCatalogList, glPrices, glProductSearch, glStock } from "./types";
import { mapCatalog, mapProductAsVariant, mapStockStatus } from "./mapper";
import type { AvailabilityResult, NormalizedCatalogProduct, NormalizedVariant } from "../types";

/** GET /v3/catalogs */
export async function listCatalogs(): Promise<NormalizedCatalogProduct[]> {
  const res = await gl("product", "/catalogs", glCatalogList);
  const list = Array.isArray(res) ? res : res.data;
  return list.map((c) => mapCatalog(c));
}

/** GET /v3/catalogs/{catalogUid} */
export async function getCatalog(catalogUid: string): Promise<NormalizedCatalogProduct> {
  const c = await gl("product", `/catalogs/${encodeURIComponent(catalogUid)}`, glCatalog);
  return mapCatalog(c);
}

/** POST /v3/catalogs/{uid}/products:search (paged, max 100 per page). */
export async function searchCatalogProducts(catalogUid: string, maxItems = 500): Promise<NormalizedVariant[]> {
  const out: NormalizedVariant[] = [];
  for (let offset = 0; offset < maxItems; offset += 100) {
    const res = await gl("product", `/catalogs/${encodeURIComponent(catalogUid)}/products:search`, glProductSearch, {
      method: "POST",
      body: { limit: 100, offset },
    });
    out.push(...res.products.map(mapProductAsVariant));
    if (res.products.length < 100) break;
  }
  return out;
}

/** GET /v3/products/{productUid}/prices — unit production price (quantity tier 1). */
export async function getUnitPrice(productUid: string, country = "ES", currency = "EUR") {
  const prices = await gl(
    "product",
    `/products/${encodeURIComponent(productUid)}/prices?country=${country}&currency=${currency}`,
    glPrices,
  );
  const tier = prices.sort((a, b) => a.quantity - b.quantity)[0];
  return tier ? { price: tier.price, currency: tier.currency } : null;
}

/** POST /v3/stock/region-availability (≤250 products per call). */
export async function getStockAvailability(productUids: string[]): Promise<AvailabilityResult["variants"]> {
  const out: AvailabilityResult["variants"] = [];
  for (let i = 0; i < productUids.length; i += 250) {
    const chunk = productUids.slice(i, i + 250);
    const res = await gl("product", "/stock/region-availability", glStock, { method: "POST", body: { products: chunk } });
    for (const p of res.productsAvailability) {
      const regions: Record<string, string> = {};
      for (const a of p.availability) regions[a.stockRegionUid] = a.status;
      const eu = regions.EU ?? Object.values(regions)[0] ?? "unknown";
      out.push({ externalId: p.productUid, status: mapStockStatus(eu), regions });
    }
  }
  return out;
}

/** POST /v3/catalogs/{uid}/products:search with optional attribute filters (one page). */
export async function searchProductsFiltered(catalogUid: string, attributeFilters: Record<string, string[]> | null, limit = 100, offset = 0) {
  const res = await gl("product", `/catalogs/${encodeURIComponent(catalogUid)}/products:search`, glProductSearch, {
    method: "POST",
    body: { limit, offset, ...(attributeFilters ? { attributeFilters } : {}) },
  });
  return res.products;
}

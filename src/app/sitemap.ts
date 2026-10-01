import type { MetadataRoute } from "next";
import { getCollections, getPublishedProducts } from "@/lib/products/queries";
import { REGIONS, isRedundantProvince } from "@/lib/regions";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [collections, products] = await Promise.all([getCollections(), getPublishedProducts({ limit: 1000 })]);
  const statics = ["", "/shop", "/collections", "/drops", "/about", "/journal", "/community", "/shipping", "/returns", "/contact", "/privacy", "/terms", "/deportes", "/personaliza", "/disena", "/regiones", "/club", "/regalos", "/empresas", "/creadores", "/causas"];
  return [
    ...statics.map((p) => ({ url: `${site}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...collections.map((c) => ({ url: `${site}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...REGIONS.filter((r) => !isRedundantProvince(r)).map((r) => ({ url: `${site}/regiones/${r.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...products.map((p) => ({ url: `${site}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}

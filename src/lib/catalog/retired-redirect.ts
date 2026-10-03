import "server-only";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { isRetiredDesign, replacementFor } from "./retired";

/**
 * Where an old product URL of a retired design should go (permanent redirect, keeps SEO and shared
 * links working): the same product type of the replacement design, else any product of it, else the
 * same product type in the same collection, else the collection, else the shop.
 * `p` is the published product when it still exists; once the archive SQL has run it is null and the
 * product row is looked up by slug regardless of status (only on what would otherwise be a 404).
 */
export async function retiredRedirect(slug: string, p: PublicProduct | null): Promise<string | null> {
  let info: { design: string | null; productType: string; collection: string | null } | null = p ? { design: p.design, productType: p.productType, collection: p.collection?.slug ?? null } : null;
  if (!info) {
    const sb = dbOrNull();
    if (!sb) return null;
    const { data } = await sb.from("products").select("product_type, metadata, collections:collection_id(slug)").eq("brand_id", env.brandId()).eq("slug", slug).maybeSingle();
    if (!data) return null;
    info = {
      design: ((data.metadata as { catalog?: { design?: string | null } } | null)?.catalog?.design as string) ?? null,
      productType: data.product_type as string,
      collection: (data.collections as unknown as { slug: string } | null)?.slug ?? null,
    };
  }
  if (!isRetiredDesign(info.design)) return null;
  const all = await getPublishedProducts({ limit: 5000 }); // already without retired designs
  const rep = replacementFor(info.design!);
  const withImg = all.filter((x) => x.images[0]);
  const pick =
    (rep && (withImg.find((x) => x.design === rep && x.productType === info!.productType) ?? withImg.find((x) => x.design === rep))) ||
    (info.collection && withImg.find((x) => x.collection?.slug === info!.collection && x.productType === info!.productType)) ||
    null;
  if (pick) return `/products/${pick.slug}`;
  if (info.collection && all.some((x) => x.collection?.slug === info!.collection)) return `/collections/${info.collection}`;
  return "/shop";
}

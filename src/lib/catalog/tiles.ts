/**
 * Data for the editorial tiles (themes, categories, audiences): fanned product cards picked by the
 * merchandising engine, design / piece counts and the photo slot. Pure apart from the build-time
 * campaign photo list.
 */
import type { PublicProduct } from "@/lib/products/queries";
import { campaignPhoto } from "@/lib/campaign";
import { merchandiseDetailed, withHero } from "./merch";
import type { ThemeLook } from "./tones";
import type { TileCard } from "@/components/merch/EditorialTile";

/** The best `n` products of a set, one per design family, mixing product types where possible. */
export function tileProducts(items: PublicProduct[], n = 3): PublicProduct[] {
  const ranked = merchandiseDetailed(items).filter((m) => m.hero);
  const out: typeof ranked = [];
  const fams = new Set<string>();
  // pass 1: distinct family and distinct product type; pass 2: distinct family only
  for (const strictType of [true, false]) {
    for (const m of ranked) {
      if (out.length >= n) break;
      if (fams.has(m.family) || (strictType && out.some((o) => o.p.productType === m.p.productType))) continue;
      fams.add(m.family);
      out.push(m);
    }
  }
  // the strongest piece goes in the middle of the fan (front)
  const ordered = out.length === 3 ? [out[1], out[0], out[2]] : out;
  return ordered.map((m) => withHero(m.p, m.hero!));
}

export const tileCards = (items: PublicProduct[], n = 3): TileCard[] => tileProducts(items, n).map((p) => ({ url: p.images[0].url, alt: p.name }));

/** "120 diseños · 340 piezas" (designs only when there are several). */
export function tileCount(items: PublicProduct[], en: boolean): string {
  const designs = new Set(items.map((p) => p.design).filter(Boolean)).size;
  const pieces = en ? `${items.length} items` : `${items.length} piezas`;
  return designs > 2 ? `${designs} ${en ? "designs" : "diseños"} · ${pieces}` : pieces;
}

/** Campaign photo (public/campaign) first, then the uploaded site photo, else none (cards carry the tile). */
export function tilePhoto(look: Pick<ThemeLook, "campaign" | "site">, site: Record<string, string>): string | null {
  return (look.campaign && campaignPhoto(look.campaign)) || (look.site && site[look.site]) || null;
}

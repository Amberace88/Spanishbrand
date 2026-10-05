import { withHero } from "@/lib/catalog/merch";
import "server-only";
import { CITIES } from "./cities";
import { designBySlug } from "./designs";
import { regionBySlug } from "@/lib/regions";
import type { PublicProduct } from "@/lib/products/queries";

/** Products belonging to a city: made from its design or tagged with its slug. */
export function productsForCity(slug: string, all: PublicProduct[]) {
  const design = `ciudad-${slug}`;
  return all.filter((p) => p.design === design || p.tags.includes(design) || (p.tags.includes("ciudad") && p.tags.includes(slug)));
}

export function cityCards(all: PublicProduct[]) {
  return CITIES.map((c) => {
    const own = productsForCity(c.slug, all);
    const d = designBySlug(`ciudad-${c.slug}-cartel`); // the poster line (the old coordinate badge is retired)
    // the unisex tee (then hoodie, any tee, anything) in its best colour represents the city
    const pick = own.find((p) => p.tags.includes("tee") && p.images[0]) ?? own.find((p) => p.tags.includes("hoodie") && p.images[0]) ?? own.find((p) => p.productType === "TSHIRT" && p.images[0]) ?? own.find((p) => p.images[0]);
    const tee = pick ? withHero(pick) : undefined;
    return {
      slug: c.slug,
      label: c.label,
      sub: c.sub,
      region: c.region,
      regionName: regionBySlug(c.region)?.name ?? c.region,
      count: own.length,
      photo: tee?.images[0]?.url ?? null,
      layers: d?.layers ?? [],
      tone: d?.tone ?? "dark",
    };
  });
}

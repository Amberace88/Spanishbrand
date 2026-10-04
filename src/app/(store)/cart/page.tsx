import type { Metadata } from "next";
import { getCart, MAX_QTY } from "@/lib/cart/cart";
import { getT } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/format";
import { refreshCartAction } from "@/app/actions/cart";
import { getBestsellers, getCollectionCounts, getCollectionsBySlugs, getPublishedProducts, getShippingPromo, type PublicProduct } from "@/lib/products/queries";
import { merchandiseUnique, withHero } from "@/lib/catalog/merch";
import { listSiteImages } from "@/lib/site-images";
import { Container } from "@/components/ui/Section";
import { CartEmptyHero, CartHeader, CartLines, CartSummary, CartTrust, CollectionTiles, FreeShippingMeter, ProductRail } from "@/components/cart/CartSections";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Collections offered on the empty cart, in editorial order (only those with something to buy). */
const COLLECTION_PICKS = ["leon", "statement", "heritage", "sabiduria", "ciudades", "profesiones", "mediterraneo", "futbol"];

export default async function CartPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const [{ cancelled }, t, cart, promo, catalog] = await Promise.all([
    searchParams,
    getT(),
    getCart(),
    getShippingPromo().catch(() => null),
    getPublishedProducts({ limit: 5000 }).catch(() => [] as PublicProduct[]),
  ]);
  const freeLabel = promo ? formatMoney(promo.freeOver, "EUR").replace(/,00/, "") : null;

  if (cart.lines.length === 0) {
    const [bestsellers, picks, counts, site] = await Promise.all([
      getBestsellers(8).catch(() => [] as PublicProduct[]),
      getCollectionsBySlugs(COLLECTION_PICKS),
      getCollectionCounts().catch(() => ({}) as Record<string, number>),
      listSiteImages(),
    ]);
    // real bestsellers keep their sales order (each card leads with its best colour); otherwise the curated catalogue
    const loved = bestsellers.length ? bestsellers.map((p) => withHero(p)) : merchandiseUnique(catalog, 8);
    const collections = (catalog.length ? picks.filter((c) => counts[c.slug]) : picks).slice(0, 4);
    return (
      <>
        <CartEmptyHero t={t} cancelled={Boolean(cancelled)} />
        <ProductRail t={t} kicker={t("cart.loved.kicker")} title={bestsellers.length ? t("cart.loved") : t("home.newest.title")} products={loved} href={bestsellers.length ? "/shop" : "/shop?sort=new"} />
        <CollectionTiles t={t} collections={collections} products={catalog} site={site} en={t.locale === "en"} />
        <CartTrust t={t} freeShipping={freeLabel} />
      </>
    );
  }

  const needsFix = cart.lines.some((l) => l.issue);
  // "Te puede gustar": same collections as the cart first, then the rest of the catalogue — curated, one per design
  const inCart = new Set(cart.lines.map((l) => l.productId));
  const cartCols = new Set(catalog.filter((p) => inCart.has(p.id)).map((p) => p.collection?.slug).filter(Boolean));
  const pool = catalog.filter((p) => !inCart.has(p.id));
  const near = merchandiseUnique(pool.filter((p) => p.collection && cartCols.has(p.collection.slug)), 8);
  const rest = near.length < 8 ? merchandiseUnique(pool.filter((p) => !near.some((n) => n.id === p.id)), 8 - near.length) : [];
  const suggestions = [...near, ...rest];
  const freeDone = promo ? cart.subtotal >= promo.freeOver : false;

  return (
    <>
      <section className="min-h-[60svh] bg-bg pb-10 pt-8 sm:pb-16 sm:pt-12">
        <Container>
          <CartHeader t={t} itemCount={cart.itemCount} cancelled={Boolean(cancelled)} />
          <div className="mt-8 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)] lg:gap-12">
            <div className="space-y-4">
              {promo && <FreeShippingMeter t={t} subtotal={cart.subtotal} freeOver={promo.freeOver} currency={cart.currency} />}
              <CartLines t={t} lines={cart.lines} currency={cart.currency} max={MAX_QTY} />
            </div>
            <CartSummary t={t} subtotal={cart.subtotal} currency={cart.currency} itemCount={cart.itemCount} needsFix={needsFix} freeDone={freeDone} fixAction={refreshCartAction} />
          </div>
        </Container>
      </section>
      <ProductRail t={t} kicker={t("cart.like.kicker")} title={t("cart.like")} products={suggestions} />
    </>
  );
}

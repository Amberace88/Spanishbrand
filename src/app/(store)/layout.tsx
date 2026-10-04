import type { ReactNode } from "react";
import { getBrand } from "@/lib/brand";
import { getCart } from "@/lib/cart/cart";
import { getPublishedProducts, getShippingPromo } from "@/lib/products/queries";
import { CATEGORY_LINKS, COLLECTION_THEMES, TOPIC_THEMES } from "@/lib/catalog/themes";
import { getT } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/format";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { MobileTabBar } from "@/components/app/MobileTabBar";
import { AppShell } from "@/components/app/AppShell";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [brand, cart, promo, t, catalog] = await Promise.all([getBrand(), getCart().catch(() => ({ itemCount: 0 })), getShippingPromo().catch(() => null), getT(), getPublishedProducts({ limit: 5000 }).catch(() => [])]);
  // menu links to lines / collections / categories with nothing to buy are hidden (never when the catalogue is unavailable)
  const emptyHrefs = catalog.length
    ? [
        ...COLLECTION_THEMES.filter((th) => !catalog.some(th.match)).map((th) => th.href),
        ...TOPIC_THEMES.filter((x) => x.href.startsWith("/collections/") && !catalog.some((p) => p.collection?.slug === x.href.slice(13))).map((x) => x.href),
        ...CATEGORY_LINKS.filter((c) => {
          const u = new URL(c.href, "https://x");
          const cat = u.searchParams.get("c"), type = u.searchParams.get("t");
          return !catalog.some((p) => (!cat || p.categoryCode === cat) && (!type || p.productType === type || (type === "HOODIE" && p.productType === "SWEATSHIRT")));
        }).map((c) => c.href),
      ]
    : [];
  const messages = [
    ...(promo ? [t("promo.freeShipping", { n: formatMoney(promo.freeOver, "EUR").replace(/,00/, "") })] : []),
    t("promo.madeToOrder"),
    t("promo.securePay"),
  ];
  return (
    <div className="store">
      <Header brandName={brand.name} cartCount={cart.itemCount} messages={messages} emptyHrefs={emptyHrefs} />
      <main id="main">{children}</main>
      <Footer brand={brand} />
      <MobileTabBar cartCount={cart.itemCount} />
      <AppShell />
      <CookieBanner />
    </div>
  );
}

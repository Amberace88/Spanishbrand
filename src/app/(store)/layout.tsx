import type { ReactNode } from "react";
import { getBrand } from "@/lib/brand";
import { getCart } from "@/lib/cart/cart";
import { getShippingPromo } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/format";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/layout/CookieBanner";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [brand, cart, promo, t] = await Promise.all([getBrand(), getCart().catch(() => ({ itemCount: 0 })), getShippingPromo().catch(() => null), getT()]);
  const messages = [
    ...(promo ? [t("promo.freeShipping", { n: formatMoney(promo.freeOver, "EUR").replace(/,00/, "") })] : []),
    t("promo.madeToOrder"),
    t("promo.securePay"),
  ];
  return (
    <>
      <Header brandName={brand.name} cartCount={cart.itemCount} messages={messages} />
      <main id="main">{children}</main>
      <Footer brand={brand} />
      <CookieBanner />
    </>
  );
}

import type { ReactNode } from "react";
import { getBrand } from "@/lib/brand";
import { getCart } from "@/lib/cart/cart";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/layout/CookieBanner";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [brand, cart] = await Promise.all([getBrand(), getCart().catch(() => ({ itemCount: 0 }))]);
  return (
    <>
      <Header brandName={brand.name} cartCount={cart.itemCount} />
      <main id="main">{children}</main>
      <Footer brand={brand} />
      <CookieBanner />
    </>
  );
}

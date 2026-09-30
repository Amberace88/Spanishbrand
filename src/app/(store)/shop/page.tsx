import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedProducts } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { ProductCard } from "@/components/product/ProductCard";
import { Container, PageHero } from "@/components/ui/Section";
import { Newsletter } from "@/components/home/Newsletter";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Tienda", alternates: { canonical: "/shop" } };
export const revalidate = 120;

const CATEGORIES: [string, string][] = [
  ["APPAREL", "Ropa"],
  ["HEADWEAR", "Gorras"],
  ["BAGS", "Bolsas"],
  ["DRINKWARE", "Tazas"],
  ["WALL_ART", "Arte"],
  ["TECH_ACCESSORIES", "Tech"],
  ["HOME_LIVING", "Hogar"],
  ["STATIONERY", "Papelería"],
];

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const t = await getT();
  const category = CATEGORIES.find(([code]) => code === c)?.[0];
  const all = await getPublishedProducts({ limit: 200 });
  const products = category ? all.filter((p) => p.categoryCode === category) : all;
  const present = new Set(all.map((p) => p.categoryCode));
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };

  return (
    <>
      <PageHero eyebrow={t("shop.count", { n: products.length })} title={t("shop.title")} />
      <section className="bg-warm pb-24">
        <div className="sticky top-16 z-30 border-b border-ink/10 bg-warm/90 backdrop-blur sm:top-[72px]">
          <Container>
            <nav className="no-scrollbar flex gap-6 overflow-x-auto py-4">
              <Link href="/shop" className={`eyebrow shrink-0 ${!category ? "text-ink" : "text-stone hover:text-ink"}`}>
                {t("shop.all")}
              </Link>
              {CATEGORIES.filter(([code]) => present.has(code)).map(([code, label]) => (
                <Link key={code} href={`/shop?c=${code}`} className={`eyebrow shrink-0 ${category === code ? "text-ink underline underline-offset-8" : "text-stone hover:text-ink"}`}>
                  {label}
                </Link>
              ))}
            </nav>
          </Container>
        </div>
        <Container className="pt-10">
          {products.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <ProductCard p={p} labels={labels} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="grid gap-10 border border-ink/10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="display text-5xl">{t("home.products.empty.title")}</p>
                <p className="mt-4 text-stone-2">{t("home.products.empty.body")}</p>
              </div>
              <Newsletter source="shop-empty" />
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

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
  ["WALL_ART", "Pósters"],
  ["TECH_ACCESSORIES", "Tech"],
  ["HOME_LIVING", "Hogar"],
  ["STATIONERY", "Papelería"],
];

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const { c, q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().slice(0, 80).toLowerCase();
  const t = await getT();
  const category = CATEGORIES.find(([code]) => code === c)?.[0];
  const all = await getPublishedProducts({ limit: 200 });
  const byCat = category ? all.filter((p) => p.categoryCode === category) : all;
  const products = q ? byCat.filter((p) => [p.name, p.shortDescription, p.collection?.name].filter(Boolean).join(" ").toLowerCase().includes(q)) : byCat;
  const present = new Set(all.map((p) => p.categoryCode));
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };

  return (
    <>
      <PageHero eyebrow={t("shop.count", { n: products.length })} title={q ? `“${rawQ?.trim()}”` : category ? CATEGORIES.find(([code]) => code === category)![1] : t("shop.title")} />
      <section className="bg-warm pb-24">
        <div className="border-b border-ink/[0.07] bg-white">
          <Container>
            <nav className="no-scrollbar flex gap-2 overflow-x-auto py-4">
              <Link href="/shop" className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${!category ? "border-ink bg-ink text-white" : "border-ink/12 bg-white hover:border-ink/40"}`}>
                {t("shop.all")}
              </Link>
              {CATEGORIES.filter(([code]) => present.has(code) || code === category || all.length === 0).map(([code, label]) => (
                <Link key={code} href={`/shop?c=${code}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${category === code ? "border-ink bg-ink text-white" : "border-ink/12 bg-white hover:border-ink/40"}`}>
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
            <div className="grid gap-10 rounded-3xl bg-white p-6 sm:p-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="headline text-3xl">{t("home.products.empty.title")}</p>
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

import type { Metadata } from "next";
import Link from "next/link";
import { getCollections, getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { DESIGNS } from "@/lib/catalog/designs";
import { ProductCard } from "@/components/product/ProductCard";
import { DesignArt } from "@/components/catalog/DesignArt";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Tienda", description: "Camisetas, sudaderas, tazas, bolsas, pósters y pegatinas con diseños originales de identidad española. Fabricado bajo pedido.", alternates: { canonical: "/shop" } };
export const revalidate = 120;

const CATEGORIES = ["APPAREL", "KIDS", "BAGS", "DRINKWARE", "WALL_ART", "HOME_LIVING", "TECH_ACCESSORIES", "STATIONERY", "PETS"] as const;
const SORTS = ["featured", "new", "priceAsc", "priceDesc"] as const;
type Sort = (typeof SORTS)[number];

const minPrice = (p: PublicProduct) => Math.min(p.price, ...p.variants.map((v) => v.price));

function sortProducts(list: PublicProduct[], sort: Sort) {
  const l = [...list];
  if (sort === "priceAsc") return l.sort((a, b) => minPrice(a) - minPrice(b));
  if (sort === "priceDesc") return l.sort((a, b) => minPrice(b) - minPrice(a));
  if (sort === "new") return l.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  // featured: featured first, then apparel, then newest
  const rank = (p: PublicProduct) => (p.featured ? 0 : 2) + (p.categoryCode === "APPAREL" ? 0 : 1);
  return l.sort((a, b) => rank(a) - rank(b) || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; col?: string; sort?: string; p?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80).toLowerCase();
  const [t, all, collections] = await Promise.all([getT(), getPublishedProducts({ limit: 500 }), getCollections()]);
  const category = CATEGORIES.find((code) => code === sp.c);
  const sort: Sort = SORTS.find((s) => s === sp.sort) ?? "featured";
  const onlyPerso = sp.p === "1";
  const colSlug = sp.col && collections.some((c) => c.slug === sp.col) ? sp.col : undefined;

  let products = all;
  if (category) products = products.filter((p) => p.categoryCode === category);
  if (colSlug) products = products.filter((p) => p.collection?.slug === colSlug);
  if (onlyPerso) products = products.filter((p) => p.personalization);
  if (q) products = products.filter((p) => [p.name, p.shortDescription, p.collection?.name, ...p.tags].filter(Boolean).join(" ").toLowerCase().includes(q));
  products = sortProducts(products, sort);

  const present = new Set(all.map((p) => p.categoryCode));
  const presentCols = collections.filter((c) => all.some((p) => p.collection?.slug === c.slug));
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { c: category, col: colSlug, sort: sort === "featured" ? undefined : sort, q: sp.q, p: onlyPerso ? "1" : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const chip = (active: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-fg/40"}`;
  const filtered = Boolean(category || colSlug || q || onlyPerso);

  return (
    <>
      <PageHero eyebrow={t("shop.count", { n: products.length })} title={q ? `“${sp.q?.trim()}”` : category ? t(`shop.cat.${category}` as never) : t("shop.title")} />
      <section className="bg-bg pb-24">
        <div className="border-b border-line bg-surface">
          <Container>
            <nav className="no-scrollbar flex gap-2 overflow-x-auto py-3">
              <Link href={href({ c: undefined })} className={chip(!category)}>
                {t("shop.all")}
              </Link>
              {CATEGORIES.filter((code) => present.has(code) || code === category).map((code) => (
                <Link key={code} href={href({ c: code })} className={chip(category === code)}>
                  {t(`shop.cat.${code}` as never)}
                </Link>
              ))}
              <Link href={href({ p: onlyPerso ? undefined : "1" })} className={chip(onlyPerso)}>
                ✦ {t("shop.personalize")}
              </Link>
            </nav>
          </Container>
        </div>
        <Container className="pt-6">
          <form action="/shop" className="flex flex-wrap items-center gap-3">
            {category && <input type="hidden" name="c" value={category} />}
            {onlyPerso && <input type="hidden" name="p" value="1" />}
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <label className="flex items-center gap-2 text-sm text-muted">
              {t("shop.filter.collection")}
              <select name="col" defaultValue={colSlug ?? ""} className="field !w-auto !py-2 text-sm text-fg">
                <option value="">{t("shop.filter.all")}</option>
                {presentCols.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              {t("shop.sort")}
              <select name="sort" defaultValue={sort} className="field !w-auto !py-2 text-sm text-fg">
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`shop.sort.${s}` as never)}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-ink !px-5 !py-2 text-sm">OK</button>
            {filtered && (
              <Link href="/shop" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
                {t("shop.clear")}
              </Link>
            )}
          </form>
        </Container>
        <Container className="pt-8">
          {products.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <ProductCard p={p} labels={labels} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-surface p-6 sm:p-10">
              <p className="headline text-3xl">{all.length ? t("shop.noResults") : t("home.products.empty.title")}</p>
              {!all.length && <p className="mt-3 max-w-xl text-muted">{t("home.products.empty.body")}</p>}
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {DESIGNS.slice(0, 12).map((d) => (
                  <Link key={d.slug} href={`/disena?style=${d.slug}`} className="group block">
                    <div className="overflow-hidden rounded-2xl bg-surface-2 p-3 transition-transform group-hover:-translate-y-1">
                      <DesignArt layers={d.layers} tone={d.tone} kind="tee" />
                    </div>
                    <p className="mt-2 text-sm font-semibold">{d.name}</p>
                  </Link>
                ))}
              </div>
              {filtered && (
                <Link href="/shop" className="btn btn-primary mt-8">
                  {t("shop.clear")}
                </Link>
              )}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

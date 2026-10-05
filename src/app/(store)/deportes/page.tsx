import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { getCollectionsBySlugs, getPublishedProducts } from "@/lib/products/queries";
import { listSiteImages } from "@/lib/site-images";
import { SPORT_SLUGS } from "@/lib/themes";
import { lookFor } from "@/lib/catalog/tones";
import { merchandise } from "@/lib/catalog/merch";
import { tileCards, tileCount, tilePhoto } from "@/lib/catalog/tiles";
import { EditorialTile } from "@/components/merch/EditorialTile";
import { PersoBanner } from "@/components/home/ShopSections";
import { getLocale } from "@/lib/i18n/server";
import { Container, PageHero, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/product/ProductCard";

export const metadata: Metadata = {
  title: "Deportes: fútbol, pádel, ciclismo y motor",
  description: "Camisetas de afición, pádel, ciclismo y motor con diseño español. Personaliza tu camiseta con nombre y dorsal.",
  alternates: { canonical: "/deportes" },
};
export const revalidate = 300;

export default async function SportsPage() {
  const [t, allCols, all, site, locale] = await Promise.all([getT(), getCollectionsBySlugs(SPORT_SLUGS.length ? ["futbol", "padel", "ciclismo", "motor"] : []), getPublishedProducts({ limit: 5000 }), listSiteImages(), getLocale()]);
  const en = locale === "en";
  // curated order (best colour first, one design family after another) instead of the raw database order
  const products = merchandise(all.filter((p) => p.collection && SPORT_SLUGS.includes(p.collection.slug)));
  // never link a sport whose collection has nothing left (retired lines); with no listing at all keep the editorial tiles
  const cols = all.length ? allCols.filter((c) => products.some((p) => p.collection?.slug === c.slug)) : allCols;
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  return (
    <>
      <PageHero eyebrow={t("nav.sports")} title={t("sports.title")} sub={t("sports.sub")} />
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            {cols.map((c, i) => {
              const look = lookFor(c.slug);
              const items = products.filter((p) => p.collection?.slug === c.slug);
              return (
                <Reveal key={c.slug} delay={i * 0.05} className={cols.length === 1 ? "aspect-[4/5] sm:aspect-[16/10] lg:col-span-2 lg:aspect-[21/9]" : "aspect-[4/5] sm:aspect-[16/10] lg:aspect-[5/4]"}>
                  <EditorialTile
                    href={c.slug === "futbol" ? "/futbol" : `/collections/${c.slug}`}
                    title={c.name}
                    kicker={items.length ? tileCount(items, en) : undefined}
                    tagline={c.tagline}
                    cta={en ? "See the collection" : "Ver colección"}
                    tone={look.tone}
                    texture={look.texture}
                    word={look.word}
                    photo={tilePhoto(look, site)}
                    cards={tileCards(items, 3)}
                    size={cols.length === 1 ? "banner" : "wide"}
                  />
                </Reveal>
              );
            })}
          </div>

          <Reveal className="mt-3 block sm:mt-4">
            <PersoBanner title={t("sports.jersey")} body={t("sports.jerseyBody")} href="/personaliza?t=jersey" photoKey="statement" />
          </Reveal>

          {products.length > 0 && (
            <div className="mt-16">
              <SectionHead eyebrow={t("nav.shop")} title={t("sports.products")} />
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4">
                {products.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 0.05}>
                    <ProductCard p={p} labels={labels} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
          <p className="mt-10 text-xs text-muted">{t("sports.legal")}</p>
        </Container>
      </section>
    </>
  );
}

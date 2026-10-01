import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionBySlug, getPublishedProducts } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { designsFor } from "@/lib/catalog/designs";
import { CollectionArt } from "@/components/art/CollectionArt";
import { DesignArt } from "@/components/catalog/DesignArt";
import { ProductCard } from "@/components/product/ProductCard";
import { TrackView } from "@/components/analytics/TrackView";
import { Container } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) return { title: "Colección" };
  return {
    title: c.seoTitle ?? c.name,
    description: c.seoDescription ?? c.tagline ?? undefined,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: c.seoTitle ?? c.name, description: c.seoDescription ?? c.tagline ?? undefined, images: c.ogImage ? [{ url: c.ogImage }] : undefined },
  };
}

const TYPES = ["APPAREL", "KIDS", "BAGS", "DRINKWARE", "WALL_ART", "HOME_LIVING", "TECH_ACCESSORIES", "STATIONERY", "PETS"] as const;

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ c?: string; d?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCollectionBySlug(slug);
  if (!c) notFound();
  const [t, all] = await Promise.all([getT(), getPublishedProducts({ limit: 500 })]);
  const own = all.filter((p) => p.collection?.slug === c.slug);
  const designs = designsFor(c.slug);
  const type = TYPES.find((x) => x === sp.c);
  const design = designs.find((d) => d.slug === sp.d);
  let products = own;
  if (type) products = products.filter((p) => p.categoryCode === type);
  if (design) products = products.filter((p) => p.design === design.slug);
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const hero = own.find((p) => p.images.some((i) => i.kind === "LIFESTYLE"))?.images.find((i) => i.kind === "LIFESTYLE") ?? own.find((p) => p.featured && p.images[0])?.images[0] ?? own[0]?.images[0];
  const presentTypes = TYPES.filter((x) => own.some((p) => p.categoryCode === x));
  const chip = (active: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-fg/40"}`;

  return (
    <>
      <TrackView event="collection_view" collectionId={/^[0-9a-f-]{36}$/.test(c.id) ? c.id : undefined} />
      <section className="relative overflow-hidden border-b border-line bg-surface-2">
        <Container className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <nav className="text-sm text-muted">
              <Link href="/" className="hover:text-fg">Inicio</Link> <span className="mx-1.5">/</span>
              <Link href="/collections" className="hover:text-fg">{t("nav.collections")}</Link> <span className="mx-1.5">/</span>
              <span className="text-fg">{c.name}</span>
            </nav>
            <p className="eyebrow mt-6 text-accent">
              {own.length ? t("collections.pieces", { n: own.length }) : t("collections.designs", { n: designs.length })}
              {own.length && designs.length ? ` · ${t("collections.designs", { n: designs.length })}` : ""}
            </p>
            <h1 className="headline mt-3 text-5xl sm:text-7xl">{c.name}</h1>
            {c.tagline && <p className="serif mt-3 text-2xl italic text-muted sm:text-3xl">{c.tagline}</p>}
            {c.story && <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{c.story}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#productos" className="btn btn-primary">{t("collections.viewProducts")}</a>
              {designs[0] && <Link href={`/disena?style=${designs[0].slug}`} className="btn btn-ghost">{t("collections.designOwn")}</Link>}
            </div>
          </Reveal>
          <Reveal delay={0.08} className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[2rem]">
            {hero ? (
              <Image src={hero.url} alt={hero.alt ?? c.name} fill priority sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
            ) : designs.length ? (
              <div className="absolute inset-0 grid grid-cols-2 gap-3 bg-surface p-6">
                {designs.slice(0, 2).map((d) => (
                  <DesignArt key={d.slug} layers={d.layers} tone={d.tone} kind="tee" />
                ))}
              </div>
            ) : (
              <CollectionArt slug={c.slug} animated className="absolute inset-0" />
            )}
          </Reveal>
        </Container>
      </section>

      <section id="productos" className="scroll-mt-24 bg-bg py-12 sm:py-16">
        <Container>
          {own.length > 0 && (
            <nav className="no-scrollbar mb-8 flex gap-2 overflow-x-auto">
              <Link href={`/collections/${c.slug}#productos`} className={chip(!type && !design)}>
                {t("collections.all")}
              </Link>
              {presentTypes.map((x) => (
                <Link key={x} href={`/collections/${c.slug}?c=${x}#productos`} className={chip(type === x)}>
                  {t(`shop.cat.${x}` as never)}
                </Link>
              ))}
              {design && <span className={chip(true)}>{design.name}</span>}
            </nav>
          )}
          {products.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <ProductCard p={p} labels={labels} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="rounded-3xl bg-surface p-8 text-muted">{own.length ? t("shop.noResults") : t("home.products.empty.body")}</p>
          )}
        </Container>
      </section>

      {designs.length > 0 && (
        <section className="border-t border-line bg-surface py-14 sm:py-20">
          <Container>
            <h2 className="headline text-3xl sm:text-5xl">{t("collections.styles")}</h2>
            <p className="mt-3 max-w-2xl text-muted">{t("collections.stylesSub")}</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {designs.map((d) => {
                const count = own.filter((p) => p.design === d.slug).length;
                return (
                  <div key={d.slug} className="overflow-hidden rounded-[1.75rem] border border-line bg-bg">
                    <div className="bg-surface-2 p-6">
                      <DesignArt layers={d.layers} tone={d.tone} kind="tee" />
                    </div>
                    <div className="p-6">
                      <h3 className="headline text-2xl">{d.name}</h3>
                      <p className="mt-1 text-sm text-muted">{d.line}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link href={`/disena?style=${d.slug}`} className="btn btn-ink !px-4 !py-2.5 text-[12px]">
                          {t("collections.designOwn")}
                        </Link>
                        {count > 0 && (
                          <Link href={`/collections/${c.slug}?d=${d.slug}#productos`} className="btn btn-ghost !px-4 !py-2.5 text-[12px]">
                            {t("collections.viewProducts")} ({count})
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

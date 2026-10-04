import Link from "next/link";
import { IconArrow } from "@/components/ui/Icons";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getCollectionBySlug, getPublishedProducts } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { ACTIVE_DESIGNS, designsFor } from "@/lib/catalog/designs";
import { CollectionArt } from "@/components/art/CollectionArt";
import { DesignArt } from "@/components/catalog/DesignArt";
import { ProductCard } from "@/components/product/ProductCard";
import { merchandise } from "@/lib/catalog/merch";
import { TrackView } from "@/components/analytics/TrackView";
import { Container } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { listSiteImages } from "@/lib/site-images";
import { lookFor } from "@/lib/catalog/tones";
import { tileCards, tilePhoto } from "@/lib/catalog/tiles";
import { EditorialTile } from "@/components/merch/EditorialTile";

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

/** Collections that also gather every product tagged with their slug (the León series spans esenciales + leon). */
const TAG_COLLECTIONS = new Set(["leon"]);

const TYPES = ["APPAREL", "HEADWEAR", "KIDS", "BAGS", "DRINKWARE", "WALL_ART", "HOME_LIVING", "TECH_ACCESSORIES", "STATIONERY", "PETS"] as const;

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ c?: string; d?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCollectionBySlug(slug);
  if (!c) notFound();
  const [t, all, site] = await Promise.all([getT(), getPublishedProducts({ limit: 1500 }), listSiteImages()]);
  const byTag = TAG_COLLECTIONS.has(c.slug);
  // curated order (quality × diversity × hero colour): lib/catalog/merch.ts
  const own = merchandise(all.filter((p) => p.collection?.slug === c.slug || (byTag && p.tags.includes(c.slug))));
  const designs = byTag ? ACTIVE_DESIGNS.filter((d) => d.collection === c.slug || d.tags?.includes(c.slug)) : designsFor(c.slug);
  // a collection whose every design was retired (lib/catalog/retired.ts) and has nothing left: send old links to the shop
  if (!own.length && !designs.length) permanentRedirect("/shop");
  const type = TYPES.find((x) => x === sp.c);
  const design = designs.find((d) => d.slug === sp.d);
  let products = own;
  if (type) products = products.filter((p) => p.categoryCode === type);
  if (design) products = products.filter((p) => p.design === design.slug);
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const hero = own.find((p) => p.images.some((i) => i.kind === "LIFESTYLE"))?.images.find((i) => i.kind === "LIFESTYLE") ?? own[0]?.images[0];
  const look = lookFor(c.slug);
  // sections by design, in curated order (each design led by its best piece)
  const bySlug = new Map<string, (typeof all)[number][]>();
  for (const p of own) {
    const k = p.design ?? "_";
    bySlug.set(k, [...(bySlug.get(k) ?? []), p]);
  }
  const sections = [...bySlug.entries()]
    .map(([key, items]) => {
      const d = designs.find((x) => x.slug === key);
      return { key, title: d?.name ?? c.name, line: d?.line ?? "", items };
    });
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
            <p className="eyebrow mt-6 text-gold-ink">
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
          <Reveal delay={0.08} className="relative mx-auto aspect-[4/3] w-full max-w-xl">
            {tilePhoto(look, site) || own.length ? (
              <EditorialTile title="" tone={look.tone} texture={look.texture} word={look.word} photo={tilePhoto(look, site)} cards={tileCards(own, 3)} size="stage" priority sizes="(min-width:1024px) 40vw, 100vw" />
            ) : designs.length ? (
              <div className="absolute inset-0 grid grid-cols-2 gap-3 rounded-[1.75rem] bg-surface p-6">
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
          {c.slug === "futbol" && (
            <Link href="/futbol" className="group mb-10 flex items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] bg-[#0b0b0b] p-6 text-white sm:p-8">
              <div>
                <p className="mega text-4xl sm:text-6xl">{t("futbol.title")} · {t("futbol.series.ciudad")}</p>
              </div>
              <span className="btn btn-primary shrink-0">{t("futbol.ctaShop")}<IconArrow className="ml-1.5 inline h-4 w-4 align-[-3px]" /></span>
            </Link>
          )}
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
          {!design && sections.length > 1 ? (
            // one card per design so every tile shows a different drawing; the design's other items are one click away
            <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
              {sections
                .flatMap((sec) => {
                  const items = type ? sec.items.filter((p) => p.categoryCode === type) : sec.items;
                  if (!items.length) return [];
                  return sec.key === "_" ? items.map((p) => ({ key: p.id, lead: p, count: 1, design: null as string | null })) : [{ key: sec.key, lead: items[0], count: items.length, design: sec.key }];
                })
                .map((x, i) => (
                  <Reveal key={x.key} delay={(i % 4) * 0.05}>
                    <ProductCard p={x.lead} labels={labels} />
                    {x.design && x.count > 1 && (
                      <Link href={`/collections/${c.slug}?d=${x.design}${type ? `&c=${type}` : ""}#productos`} className="mt-2 inline-flex items-center gap-1 px-0.5 text-[12px] font-semibold text-accent hover:underline">
                        +{x.count - 1} {t("collections.moreOfDesign" as never)}<IconArrow className="ml-1.5 inline h-4 w-4 align-[-3px]" />
                      </Link>
                    )}
                  </Reveal>
                ))}
            </div>
          ) : products.length ? (
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

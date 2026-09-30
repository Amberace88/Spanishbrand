import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { getBestsellers, getCollectionCounts, getCollections, getDrops, getOpenPoll, getPublishedProducts } from "@/lib/products/queries";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { CollectionsShowcase } from "@/components/home/CollectionsShowcase";
import { ProductCard } from "@/components/product/ProductCard";
import { Manifesto } from "@/components/home/Manifesto";
import { HeritageRail } from "@/components/home/HeritageRail";
import { Countdown } from "@/components/home/Countdown";
import { Newsletter } from "@/components/home/Newsletter";
import { PollCard } from "@/components/community/PollCard";
import { CollectionArt } from "@/components/art/CollectionArt";
import { Container, SectionHead } from "@/components/ui/Section";
import { MaskLines, Reveal } from "@/components/ui/Reveal";

export const revalidate = 300;

export default async function Home() {
  const [brand, t, collections, counts, bestsellers, newest, drops, poll] = await Promise.all([
    getBrand(),
    getT(),
    getCollections(),
    getCollectionCounts(),
    getBestsellers(8),
    getPublishedProducts({ limit: 8 }),
    getDrops(),
    getOpenPoll(),
  ]);
  const featured = collections.find((c) => c.featured) ?? collections[0];
  const products = bestsellers.length ? bestsellers : newest;
  const productsTitle = bestsellers.length ? t("home.bestsellers.title") : t("home.newest.title");
  const activeDrop = drops.find((d) => d.status === "LIVE") ?? drops.find((d) => d.status === "SCHEDULED");
  const cardLabels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const pollOptions = (poll?.options ?? []) as { key: string; label: string }[];

  return (
    <>
      {/* 1. HERO */}
      <Hero foundedYear={brand.foundedYear} />
      <Marquee items={collections.map((c) => c.name)} />

      {/* 2. FEATURED COLLECTION */}
      {featured && (
        <section className="bg-warm py-24 sm:py-32">
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <Reveal className="relative aspect-[4/5] overflow-hidden">
                <CollectionArt slug={featured.slug} animated className="absolute inset-0" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-6">
                  <p className="eyebrow text-bone/80">{t("home.featured.eyebrow")}</p>
                </div>
              </Reveal>
              <div>
                <Reveal>
                  <p className="eyebrow text-rojo">
                    {t("home.featured.eyebrow")} · {counts[featured.slug] ? t("collections.pieces", { n: counts[featured.slug] }) : t("collections.soon")}
                  </p>
                </Reveal>
                <h2 className="display mt-5 text-[20vw] sm:text-[13vw] lg:text-[9vw]">
                  <MaskLines lines={[featured.name]} />
                </h2>
                <Reveal delay={0.1}>
                  <p className="serif mt-6 text-3xl italic leading-snug text-ink/80 sm:text-4xl">{featured.tagline}</p>
                  {featured.story && <p className="mt-6 max-w-lg text-base leading-relaxed text-stone-2">{featured.story}</p>}
                  <div className="mt-10 flex flex-wrap gap-3">
                    <Link href={`/collections/${featured.slug}`} className="btn btn-ink">
                      {t("collections.explore")} <span aria-hidden>→</span>
                    </Link>
                    <Link href="/collections" className="btn btn-ghost">
                      {t("nav.collections")}
                    </Link>
                  </div>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Collections grid */}
      <section className="bg-warm pb-24 sm:pb-32">
        <Container>
          <SectionHead eyebrow={t("nav.collections")} title={t("home.collections.title")} sub={t("home.collections.sub")} />
          <CollectionsShowcase collections={collections} counts={counts} labels={{ explore: t("collections.explore"), pieces: (n) => t("collections.pieces", { n }), soon: t("collections.soon") }} />
        </Container>
      </section>

      {/* 3. BESTSELLERS (real sales only) / NEWEST */}
      <section className="border-t border-ink/10 bg-bone py-24 sm:py-32">
        <Container>
          <SectionHead
            eyebrow={t("nav.shop")}
            title={products.length ? productsTitle : t("home.products.empty.title")}
            action={
              products.length ? (
                <Link href="/shop" className="btn btn-ghost">
                  {t("nav.shop")} →
                </Link>
              ) : undefined
            }
          />
          {products.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.06}>
                  <ProductCard p={p} labels={cardLabels} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal>
              <div className="grid gap-10 border border-ink/10 bg-warm p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                <p className="serif text-2xl leading-snug text-ink/85 sm:text-3xl">{t("home.products.empty.body")}</p>
                <Newsletter source="empty-catalog" />
              </div>
            </Reveal>
          )}
        </Container>
      </section>

      {/* 4. BRAND STORY */}
      <section className="relative overflow-hidden bg-warm py-24 sm:py-36">
        <Container>
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal>
                <p className="eyebrow text-rojo">{t("home.story.eyebrow")}</p>
              </Reveal>
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-ink/15 pt-8 lg:grid-cols-1 lg:gap-10">
                {[
                  ["0", "Stock"],
                  ["100%", "Bajo pedido"],
                  [String(brand.foundedYear ?? "—"), "Fundación"],
                ].map(([n, l], i) => (
                  <Reveal key={l} delay={i * 0.08}>
                    <p className="display text-6xl sm:text-8xl">{n}</p>
                    <p className="eyebrow mt-2 text-stone-2">{l}</p>
                  </Reveal>
                ))}
              </div>
            </div>
            <div className="lg:col-span-7">
              <h2 className="serif text-[10vw] leading-[1.02] sm:text-6xl lg:text-7xl">
                <MaskLines lines={[t("home.story.title")]} />
              </h2>
              <Reveal delay={0.1}>
                <p className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-2">{t("home.story.body")}</p>
                <Link href="/about" className="btn btn-ink mt-10">
                  {t("home.story.cta")} →
                </Link>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. EDITORIAL (manifesto sequence) */}
      <Manifesto eyebrow={t("home.editorial.eyebrow")} />

      {/* 6. LIMITED DROP */}
      <section className="relative overflow-hidden bg-rojo py-24 text-white sm:py-32">
        <div className="pointer-events-none absolute -bottom-10 right-0 select-none opacity-10">
          <p className="display whitespace-nowrap text-[28vw] leading-none">{activeDrop ? `DROP ${String(activeDrop.number ?? 1).padStart(3, "0")}` : "DROP 001"}</p>
        </div>
        <Container className="relative">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-end">
            <div>
              <Reveal>
                <p className="eyebrow text-white/80">{activeDrop?.status === "LIVE" ? t("drops.live") : t("home.drop.eyebrow")}</p>
              </Reveal>
              <h2 className="display mt-5 text-7xl sm:text-8xl lg:text-9xl">
                <MaskLines lines={[activeDrop ? activeDrop.name : t("home.drop.title")]} />
              </h2>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/85">{activeDrop?.description ?? t("home.drop.body")}</p>
              </Reveal>
            </div>
            <Reveal delay={0.15}>
              {activeDrop?.status === "SCHEDULED" && activeDrop.startDate ? (
                <Countdown to={activeDrop.startDate} />
              ) : activeDrop?.status === "LIVE" ? (
                <Link href="/drops" className="btn bg-white text-ink hover:bg-bone">
                  {t("drops.title")} →
                </Link>
              ) : (
                <div className="max-w-md">
                  <Newsletter dark source="drop-teaser" />
                </div>
              )}
            </Reveal>
          </div>
        </Container>
      </section>

      {/* 7. HERITAGE / CULTURE */}
      <section className="bg-warm py-24 sm:py-32">
        <Container>
          <SectionHead eyebrow={t("home.heritage.eyebrow")} title={t("home.heritage.title")} />
          <HeritageRail />
        </Container>
      </section>

      {/* 8. COMMUNITY */}
      <section className="grain relative overflow-hidden bg-navy py-24 text-bone sm:py-32">
        <Container className="relative">
          {poll && pollOptions.length ? (
            <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="eyebrow text-oro-2">{t("home.community.eyebrow")}</p>
                <p className="serif mt-5 text-4xl leading-tight sm:text-5xl">{t("home.community.title")}</p>
              </div>
              <PollCard dark post={{ id: poll.id, title: poll.title, body: poll.body, options: pollOptions }} />
            </div>
          ) : (
            <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
              <div>
                <Reveal>
                  <p className="eyebrow text-oro-2">{t("home.community.eyebrow")}</p>
                </Reveal>
                <h2 className="display mt-5 text-6xl sm:text-7xl lg:text-8xl">
                  <MaskLines lines={[t("home.community.title")]} />
                </h2>
              </div>
              <Reveal delay={0.1}>
                <p className="max-w-lg text-lg leading-relaxed text-bone/75">{t("home.community.body")}</p>
                <Link href="/community" className="btn btn-primary mt-8">
                  {t("home.community.cta")} →
                </Link>
              </Reveal>
            </div>
          )}
        </Container>
      </section>

      {/* 9. NEWSLETTER */}
      <section className="bg-bone py-24 sm:py-32" id="newsletter">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="eyebrow text-rojo">Newsletter</p>
            </Reveal>
            <h2 className="display mt-5 text-7xl sm:text-8xl">
              <MaskLines lines={[t("newsletter.title")]} />
            </h2>
            <Reveal delay={0.1}>
              <p className="serif mx-auto mt-6 max-w-xl text-2xl italic text-ink/75">{t("newsletter.body")}</p>
              <div className="mx-auto mt-10 max-w-lg text-left">
                <Newsletter source="home" />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
      {/* 10. FOOTER — rendered by layout */}
    </>
  );
}

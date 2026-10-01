import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { getBestsellers, getCollectionCounts, getCollections, getDrops, getOpenPoll, getPublishedProducts } from "@/lib/products/queries";
import { Hero } from "@/components/home/Hero";
import { BrandPromise, CategoryGrid, CollectionsLight, ComingSoonGrid, TrustBar } from "@/components/home/ShopSections";
import { ProductCard } from "@/components/product/ProductCard";
import { Countdown } from "@/components/home/Countdown";
import { Newsletter } from "@/components/home/Newsletter";
import { PollCard } from "@/components/community/PollCard";
import { Container, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const revalidate = 300;

export default async function Home() {
  const [, t, collections, counts, bestsellers, newest, drops, poll] = await Promise.all([
    getBrand(),
    getT(),
    getCollections(),
    getCollectionCounts(),
    getBestsellers(8),
    getPublishedProducts({ limit: 8 }),
    getDrops(),
    getOpenPoll(),
  ]);
  const products = bestsellers.length ? bestsellers : newest;
  const productsTitle = bestsellers.length ? t("home.bestsellers.title") : t("home.newest.title");
  const activeDrop = drops.find((d) => d.status === "LIVE") ?? drops.find((d) => d.status === "SCHEDULED");
  const cardLabels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const pollOptions = (poll?.options ?? []) as { key: string; label: string }[];

  return (
    <>
      <Hero />
      <TrustBar />
      <CategoryGrid />

      {products.length ? (
        <section className="bg-white py-16 sm:py-24">
          <Container>
            <SectionHead
              eyebrow={t("nav.shop")}
              title={productsTitle}
              action={
                <Link href="/shop" className="btn btn-ghost">
                  {t("cats.shop")} <IconArrow className="h-4 w-4" />
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <ProductCard p={p} labels={cardLabels} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      ) : (
        <ComingSoonGrid collections={collections} />
      )}

      <CollectionsLight collections={collections} counts={counts} />

      {/* Drop banner */}
      <section className="bg-warm pb-16 sm:pb-24">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-rojo px-6 py-12 text-white sm:px-12 sm:py-16">
              <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-oro-2/30 blur-2xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-6 right-6 select-none text-[9rem] font-extrabold leading-none text-white/10 sm:text-[13rem]" aria-hidden>
                {activeDrop ? String(activeDrop.number ?? 1).padStart(3, "0") : "001"}
              </div>
              <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-oro-2" /> {activeDrop?.status === "LIVE" ? t("drops.live") : t("home.drop.eyebrow")}
                  </p>
                  <h2 className="headline mt-5 text-4xl sm:text-6xl">{activeDrop ? activeDrop.name : t("home.drop.title")}</h2>
                  <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/85">{activeDrop?.description ?? t("home.drop.body")}</p>
                </div>
                <div>
                  {activeDrop?.status === "SCHEDULED" && activeDrop.startDate ? (
                    <Countdown to={activeDrop.startDate} />
                  ) : activeDrop?.status === "LIVE" ? (
                    <Link href="/drops" className="btn bg-white text-ink hover:bg-cream">
                      {t("drops.title")} <IconArrow className="h-4 w-4" />
                    </Link>
                  ) : (
                    <div className="max-w-md rounded-2xl bg-white/10 p-5 backdrop-blur sm:p-6">
                      <Newsletter dark source="drop-teaser" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <BrandPromise />

      {/* Community */}
      <section className="bg-azul-50 py-16 sm:py-24">
        <Container>
          {poll && pollOptions.length ? (
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="eyebrow text-rojo">{t("home.community.eyebrow")}</p>
                <h2 className="headline mt-3 text-4xl sm:text-5xl">{t("home.community.title")}</h2>
                <p className="mt-4 max-w-md text-lg text-stone-2">{t("home.community.body")}</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <PollCard post={{ id: poll.id, title: poll.title, body: poll.body, options: pollOptions }} />
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <Reveal>
                <p className="eyebrow text-rojo">{t("home.community.eyebrow")}</p>
                <h2 className="headline mt-3 text-4xl sm:text-5xl">{t("home.community.title")}</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="max-w-lg text-lg leading-relaxed text-stone-2">{t("home.community.body")}</p>
                <Link href="/community" className="btn btn-primary mt-7">
                  {t("home.community.cta")} <IconArrow className="h-4 w-4" />
                </Link>
              </Reveal>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

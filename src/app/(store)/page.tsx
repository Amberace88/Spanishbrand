import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { getBestsellers, getCollectionCounts, getCollections, getCollectionsBySlugs, getDrops, getOpenPoll, getPublishedProducts } from "@/lib/products/queries";
import { BigMarquee, Hero, Manifesto } from "@/components/home/Hero";
import { BrandEssentials, BrandPromise, CategoryGrid, ClubTeaser, CollectionsBento, ComingSoonGrid, FiestasCalendar, PersonalizeTeaser, ThemesBento, TrustBar } from "@/components/home/ShopSections";
import { ProductCard } from "@/components/product/ProductCard";
import { Countdown } from "@/components/home/Countdown";
import { Newsletter } from "@/components/home/Newsletter";
import { PollCard } from "@/components/community/PollCard";
import { Container, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const revalidate = 300;

export default async function Home() {
  const [brand, t, collections, counts, bestsellers, newest, drops, poll, themes] = await Promise.all([
    getBrand(),
    getT(),
    getCollections(),
    getCollectionCounts(),
    getBestsellers(8),
    getPublishedProducts({ limit: 8 }),
    getDrops(),
    getOpenPoll(),
    getCollectionsBySlugs(["futbol", "padel", "ciclismo", "motor", "fiestas", "mi-pueblo", "playa", "tapas", "camino"]),
  ]);
  const core = collections.filter((c) => ["espana", "heritage", "mediterraneo"].includes(c.slug));
  const products = bestsellers.length ? bestsellers : newest;
  const productsTitle = bestsellers.length ? t("home.bestsellers.title") : t("home.newest.title");
  const activeDrop = drops.find((d) => d.status === "LIVE") ?? drops.find((d) => d.status === "SCHEDULED");
  const cardLabels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const pollOptions = (poll?.options ?? []) as { key: string; label: string }[];

  return (
    <>
      <Hero brandName={brand.name} />
      <TrustBar />
      <BrandEssentials />
      <CategoryGrid />

      {products.length ? (
        <section className="bg-bg py-16 sm:py-24">
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <ProductCard p={p} labels={cardLabels} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <ThemesBento collections={themes} />
      <BigMarquee words={t("marquee.words").split("|")} />
      <PersonalizeTeaser />
      <FiestasCalendar />
      {!products.length && <ComingSoonGrid collections={core.length ? [...core, ...collections.filter((c) => c.slug === "motor")] : collections} />}
      <Manifesto kicker={t("manifesto.kicker")} text={t("manifesto.text")} highlight={["identidad", "españa", "identity", "spain"]} />
      <CollectionsBento collections={core.length ? core : collections} counts={counts} />

      {/* Drop */}
      <section className="bg-bg pb-16 sm:pb-24">
        <Container>
          <Reveal>
            <div className="grain-soft relative overflow-hidden rounded-[2rem] bg-[#0d0d0d] px-6 py-14 text-white sm:px-14 sm:py-20">
              <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#e3051b]/40 blur-3xl" aria-hidden />
              <p className="mega pointer-events-none absolute -bottom-6 right-4 select-none text-[10rem] text-white/[0.06] sm:text-[18rem]" aria-hidden>
                {activeDrop ? String(activeDrop.number ?? 1).padStart(3, "0") : "001"}
              </p>
              <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#ffc400]" /> {activeDrop?.status === "LIVE" ? t("drops.live") : t("home.drop.eyebrow")}
                  </p>
                  <h2 className="mega mt-6 text-6xl sm:text-8xl">{activeDrop ? activeDrop.name : t("home.drop.title")}</h2>
                  <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">{activeDrop?.description ?? t("home.drop.body")}</p>
                </div>
                <div>
                  {activeDrop?.status === "SCHEDULED" && activeDrop.startDate ? (
                    <Countdown to={activeDrop.startDate} />
                  ) : activeDrop?.status === "LIVE" ? (
                    <Link href="/drops" className="btn btn-light">
                      {t("drops.title")} <IconArrow className="h-4 w-4" />
                    </Link>
                  ) : (
                    <div className="force-light max-w-md rounded-3xl bg-white p-6 text-[#0d0d0d]">
                      <Newsletter source="drop-teaser" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <ClubTeaser brandName={brand.name} />
      <BrandPromise />

      {poll && pollOptions.length ? (
        <section className="bg-bg pb-16 sm:pb-24">
          <Container>
            <div className="grid gap-10 rounded-[2rem] bg-surface-2 p-8 sm:p-12 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="kicker text-accent">{t("home.community.eyebrow")}</p>
                <h2 className="headline mt-3 text-4xl sm:text-5xl">{t("home.community.title")}</h2>
                <p className="mt-4 max-w-md text-lg text-muted">{t("home.community.body")}</p>
              </div>
              <PollCard post={{ id: poll.id, title: poll.title, body: poll.body, options: pollOptions }} />
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
}

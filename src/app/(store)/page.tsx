import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { getLocale, getT } from "@/lib/i18n/server";
import { listSiteImages } from "@/lib/site-images";
import { getBestsellers, getCollectionCounts, getCollections, getCollectionsBySlugs, getDrops, getOpenPoll, getPublishedProducts, getShowcase } from "@/lib/products/queries";
import { BigMarquee, Hero, Manifesto } from "@/components/home/Hero";
import { BrandEssentials, BrandPromise, CategoryGrid, ClubTeaser, CollectionsBento, ComingSoonGrid, FiestasCalendar, PersonalizeTeaser, ThemesBento, TrustBar } from "@/components/home/ShopSections";
import { ProductCard } from "@/components/product/ProductCard";
import { LookbookLeon } from "@/components/home/LookbookLeon";
import { ArteBand } from "@/components/home/ArteBand";
import { ART_SERIES, siteArtSrc } from "@/lib/catalog/art-series";
import { Countdown } from "@/components/home/Countdown";
import { merchandise, merchandiseUnique, withHero } from "@/lib/catalog/merch";
import { Newsletter } from "@/components/home/Newsletter";
import { CausesBand } from "@/components/home/CausesBand";
import { getCausesData, getDonation } from "@/lib/causes";
import { PollCard } from "@/components/community/PollCard";
import { Container, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const revalidate = 300;

export default async function Home() {
  const [donation, causes] = await Promise.all([getDonation(), getCausesData()]);
  const [show, brand, t, collections, counts, bestsellers, newest, drops, poll, themes, locale, catalog, site] = await Promise.all([
    getShowcase(),
    getBrand(),
    getT(),
    getCollections(),
    getCollectionCounts(),
    getBestsellers(8),
    getPublishedProducts({ limit: 48 }),
    getDrops(),
    getOpenPoll(),
    getCollectionsBySlugs(["futbol", "fiestas", "playa", "tapas", "sabiduria", "heritage", "mediterraneo", "profesiones"]),
    getLocale(),
    getPublishedProducts({ limit: 5000 }),
    listSiteImages(),
  ]);
  // lookbook line: one piece per design first (tee, hoodie, art…), garments before accessories
  const lookbookAll = catalog.filter((p) => p.tags.includes("lookbook"));
  const lookbook = lookbookAll.length >= 8 ? merchandiseUnique(lookbookAll, 12) : merchandise(lookbookAll);
  // art series: one garment per illustration (big art first, «· Frase» variants last), curated order
  const arte = merchandiseUnique(catalog.filter((p) => p.tags.includes("serie-arte") && p.categoryCode === "APPAREL"), 24);
  const LOOKS: [string, string, string][] = [
    ["look-flamenca-mujer", "La Flamenca", "art-flamenca"],
    ["look-toro-hombre", "Toro Bravo", "art-toro"],
    ["look-quijote-hombre", "Quijote y Sancho", "art-quijote"],
    ["look-faro-pareja", "El Faro", "art-faro"],
    ["look-barca-nino", "La Barca", "art-barca"],
  ];
  const looks = LOOKS.filter(([k]) => site[k]).map(([k, alt, art]) => ({ src: site[k], alt, href: `/disena?arte=${art}` }));
  const arts = ART_SERIES.map((p) => ({ key: p.art, name: p.name, src: siteArtSrc(p.art) }));
  // collections not already in the themes bento above (no tile shown twice on the page)
  const CORE = ["statement", "leon", "espana"];
  const THEMED = ["futbol", "fiestas", "playa", "tapas", "sabiduria", "heritage", "mediterraneo", "profesiones"];
  const withStock = (c: { slug: string }) => !catalog.length || counts[c.slug];
  const picked = collections.filter((c) => CORE.includes(c.slug) && withStock(c)).sort((a, b) => CORE.indexOf(a.slug) - CORE.indexOf(b.slug));
  // top up to three with other collections that are not in the themes bento
  const core = [...picked, ...collections.filter((c) => !picked.includes(c) && !THEMED.includes(c.slug) && withStock(c))].slice(0, 3);
  // real bestsellers keep their sales order (each card leads with its best colour); otherwise the newest pieces, curated
  const products = bestsellers.length ? bestsellers.map((p) => withHero(p)) : merchandiseUnique(newest, 8);
  const productsTitle = bestsellers.length ? t("home.bestsellers.title") : t("home.newest.title");
  const activeDrop = drops.find((d) => d.status === "LIVE") ?? drops.find((d) => d.status === "SCHEDULED");
  const cardLabels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const pollOptions = (poll?.options ?? []) as { key: string; label: string }[];

  return (
    <>
      <Hero brandName={brand.name} jerseyImg={show.jersey} blankImg={show.blank} persoPhoto={site["hero-personaliza"] ?? null} designPhoto={site["hero-disena"] ?? null} />
      <TrustBar />
      <BrandEssentials />
      {/* below the fold: each section skips style/layout/paint (≈1500 nodes) until it nears the viewport */}
      <div className="cv-sections">
      <CategoryGrid products={catalog} />
      <LookbookLeon products={lookbook} photo={site["look-leon-mujer"] ?? null} en={locale === "en"} labels={{ madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") }} />
      <ArteBand arts={arts} looks={looks} products={arte} en={locale === "en"} labels={cardLabels} />

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

      {/* only themes with something to buy (retired lines leave some collections empty) */}
      <ThemesBento collections={catalog.length ? themes.filter((c) => counts[c.slug]) : themes} products={catalog} />
      <BigMarquee words={t("marquee.words").split("|")} />
      <PersonalizeTeaser />
      <FiestasCalendar />
      {!products.length && <ComingSoonGrid collections={core.length ? core : collections} />}
      <Manifesto kicker={t("manifesto.kicker")} text={t("manifesto.text")} highlight={["identidad", "españa", "identity", "spain"]} />
      {donation.enabled && <CausesBand perItem={donation.perItem} month={causes.month} locale={locale} />}
      <CollectionsBento collections={core.length ? core : collections} counts={counts} products={catalog} />

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
                    // one sign-up form per page: the drop points to the newsletter band in the footer
                    <a href="#newsletter" className="btn btn-light w-fit px-7 py-4 text-[15px]">
                      {t("home.drop.notify")} <IconArrow className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      </div>
      <ClubTeaser brandName={brand.name} />
      <BrandPromise />

      {poll && pollOptions.length ? (
        <section className="bg-bg pb-16 sm:pb-24">
          <Container>
            <div className="grid gap-10 rounded-[2rem] bg-surface-2 p-8 sm:p-12 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <h2 className="headline text-4xl sm:text-5xl">{t("home.community.title")}</h2>
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

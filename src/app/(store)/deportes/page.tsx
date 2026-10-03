import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import Image from "next/image";
import { getCollectionsBySlugs, getPublishedProducts, getShowcase } from "@/lib/products/queries";
import { listSiteImages } from "@/lib/site-images";
import { SPORT_SLUGS, themeFor } from "@/lib/themes";
import { Container, PageHero, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Mockup } from "@/components/art/Mockup";
import { JerseyBack } from "@/components/art/Jersey";
import { ProductCard } from "@/components/product/ProductCard";
import { IconArrow } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Deportes — fútbol, pádel, ciclismo y motor",
  description: "Camisetas de afición, pádel, ciclismo y motor con diseño español. Personaliza tu camiseta con nombre y dorsal.",
  alternates: { canonical: "/deportes" },
};
export const revalidate = 300;

export default async function SportsPage() {
  const [t, cols, all, show, site] = await Promise.all([getT(), getCollectionsBySlugs(SPORT_SLUGS.length ? ["futbol", "padel", "ciclismo", "motor"] : []), getPublishedProducts({ limit: 300 }), getShowcase(), listSiteImages()]);
  const products = all.filter((p) => p.collection && SPORT_SLUGS.includes(p.collection.slug));
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  return (
    <>
      <PageHero eyebrow={t("nav.sports")} title={t("sports.title")} sub={t("sports.sub")} />
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2">
            {cols.map((c, i) => {
              const th = themeFor(c.slug);
              return (
                <Reveal key={c.slug} delay={i * 0.05}>
                  <Link href={c.slug === "futbol" ? "/futbol" : `/collections/${c.slug}`} className={`group relative flex min-h-[340px] flex-col overflow-hidden rounded-[2rem] p-8 ${th.tile}`}>
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <h2 className="mega text-6xl sm:text-7xl">{c.name}</h2>
                        <p className="mt-2 max-w-xs opacity-85">{c.tagline}</p>
                      </div>
                      <IconArrow className="h-6 w-6 -rotate-45 transition-transform group-hover:rotate-0" />
                    </div>
                    <div className="pointer-events-none absolute -bottom-[10%] -right-[6%] w-[52%] transition-transform duration-700 group-hover:-translate-y-2 group-hover:scale-105">
                      {show.byCollection[c.slug]?.[0] ? (
                        <div className="relative aspect-square rotate-[-5deg] overflow-hidden rounded-[1.4rem] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)] ring-1 ring-black/5">
                          <Image src={show.byCollection[c.slug][0]} alt={c.name} fill sizes="(min-width:640px) 25vw, 50vw" className="object-cover" />
                        </div>
                      ) : c.slug === "futbol" ? (
                        <JerseyBack name="AFICIÓN" number="10" shirt="#ffffff" ink="#0f7a3d" trim="#c8102e" />
                      ) : (
                        <Mockup kind={th.kind} color={th.garment} slug={th.art} />
                      )}
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <Reveal>
            <Link href="/personaliza?t=jersey" className="group mt-3 grid overflow-hidden rounded-[2rem] bg-fg text-bg sm:grid-cols-[1.3fr_1fr]">
              <div className="p-8 sm:p-12">
                <p className="kicker text-gold">{t("perso.opt.jersey")}</p>
                <p className="mega mt-3 text-6xl sm:text-8xl">{t("sports.jersey")}</p>
                <p className="mt-4 max-w-md text-bg/70">{t("sports.jerseyBody")}</p>
                <span className="btn btn-primary mt-7">
                  {t("perso.cta")} <IconArrow className="h-4 w-4" />
                </span>
              </div>
              {site["campaign-garcia"] ? (
                <div className="relative min-h-[320px] overflow-hidden">
                  <Image src={site["campaign-garcia"]} alt={t("sports.jersey")} fill sizes="(min-width:640px) 40vw, 100vw" className="object-cover transition-transform duration-[1.4s] group-hover:scale-105" />
                </div>
              ) : (
                <div className="flex items-center justify-center bg-accent p-8">
                  <div className="floaty w-[72%]">
                    <JerseyBack name="TU NOMBRE" number="9" shirt="#0d0d0d" ink="#e0b84a" trim="#c8102e" />
                  </div>
                </div>
              )}
            </Link>
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

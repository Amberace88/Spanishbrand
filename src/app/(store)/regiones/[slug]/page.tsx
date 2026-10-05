import { merchandise } from "@/lib/catalog/merch";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import Image from "next/image";
import { getPublishedProducts, getShowcase } from "@/lib/products/queries";
import { REGIONS, isRedundantProvince, provincesOf, regionBySlug } from "@/lib/regions";
import { Container, PageHero, SectionHead } from "@/components/ui/Section";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { Mockup } from "@/components/art/Mockup";
import { IconArrow } from "@/components/ui/Icons";

export const revalidate = 600;

export function generateStaticParams() {
  return REGIONS.filter((r) => !isRedundantProvince(r)).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = regionBySlug(slug);
  if (!r) return {};
  return {
    title: `Camisetas de ${r.name}`,
    description: `Camisetas, sudaderas, tazas y regalos con orgullo de ${r.name}. Personaliza con el nombre de tu pueblo. Fabricado bajo pedido y enviado a toda España.`,
    alternates: { canonical: `/regiones/${r.slug}` },
  };
}

export default async function RegionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = regionBySlug(slug);
  if (!r || isRedundantProvince(r)) notFound();
  const [t, all, show] = await Promise.all([getT(), getPublishedProducts({ limit: 300 }), getShowcase()]);
  const ctaPhoto = show.byCollection["mi-pueblo"]?.[0] ?? null;
  const keys = new Set([r.slug, r.parent].filter(Boolean) as string[]);
  const products = merchandise(all.filter((p) => p.tags.some((tag) => tag.startsWith("region:") && keys.has(tag.slice(7))) || (p.collection && keys.has(p.collection.slug))));
  const parent = r.parent ? regionBySlug(r.parent) : null;
  const provs = provincesOf(r.slug).filter((p) => !isRedundantProvince(p));
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Regiones", item: "/regiones" },
      ...(parent ? [{ "@type": "ListItem", position: 2, name: parent.name, item: `/regiones/${parent.slug}` }] : []),
      { "@type": "ListItem", position: parent ? 3 : 2, name: r.name, item: `/regiones/${r.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero eyebrow={parent ? `${parent.name} · ${t("regions.province")}` : t("regions.kicker")} title={r.name} sub={t("regions.pageSub", { name: r.name })}>
        {provs.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {provs.map((p) => (
              <Link key={p.slug} href={`/regiones/${p.slug}`} className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium hover:border-fg">
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </PageHero>

      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <Reveal>
            <Link href="/personaliza?t=pueblo" className="group grid overflow-hidden rounded-[2rem] bg-fg text-bg sm:grid-cols-[1.3fr_1fr]">
              <div className="p-8 sm:p-12">
                <p className="kicker text-gold">{t("perso.opt.pueblo")}</p>
                <p className="mega mt-3 text-5xl sm:text-7xl">{t("regions.ctaTitle", { name: r.name })}</p>
                <p className="mt-4 max-w-md text-bg/70">{t("regions.ctaBody")}</p>
                <span className="btn btn-primary mt-7">
                  {t("perso.cta")} <IconArrow className="h-4 w-4" />
                </span>
              </div>
              <div className="relative flex items-center justify-center bg-accent p-8">
                <div className="w-[70%] transition-transform duration-700 group-hover:scale-105">
                  {ctaPhoto ? (
                    <div className="relative aspect-square rotate-[-4deg] overflow-hidden rounded-[1.4rem] shadow-2xl">
                      <Image src={ctaPhoto} alt="" fill sizes="(min-width:640px) 30vw, 70vw" className="object-cover" />
                    </div>
                  ) : (
                    <Mockup kind="tee" color="#111111" slug="mi-pueblo" />
                  )}
                </div>
              </div>
            </Link>
          </Reveal>

          <div className="mt-16">
            <SectionHead eyebrow={t("nav.shop")} title={t("regions.designs", { name: r.name })} />
            {products.length ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4">
                {products.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 0.05}>
                    <ProductCard p={p} labels={labels} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="rounded-3xl bg-surface-2 p-8 text-lg text-muted">{t("regions.empty", { name: r.name })}</p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}

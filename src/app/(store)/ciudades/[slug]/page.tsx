import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getT } from "@/lib/i18n/server";
import { getPublishedProducts } from "@/lib/products/queries";
import { CITIES } from "@/lib/catalog/cities";
import { designBySlug } from "@/lib/catalog/designs";
import { productsForCity } from "@/lib/catalog/city-products";
import { regionBySlug } from "@/lib/regions";
import { Container, PageHero, SectionHead } from "@/components/ui/Section";
import { ProductCard } from "@/components/product/ProductCard";
import { DesignArt } from "@/components/catalog/DesignArt";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const revalidate = 600;

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = CITIES.find((x) => x.slug === slug);
  if (!c) return {};
  return {
    title: `${c.label}: camisetas, tazas y regalos`,
    description: `Camisetas, sudaderas, tazas, bolsas, pósters y postales de ${c.label}. ${c.line} Fabricado bajo pedido en Europa y enviado a toda España.`,
    alternates: { canonical: `/ciudades/${c.slug}` },
  };
}

const TYPE_ORDER = ["TSHIRT", "HOODIE", "SWEATSHIRT", "MUG", "TOTE", "POSTER", "FRAMED_PRINT", "CANVAS", "POSTCARD", "COASTER", "FLAG", "BEACH_TOWEL", "PUZZLE"];

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = CITIES.find((x) => x.slug === slug);
  if (!c) notFound();
  const [t, locale, all] = await Promise.all([getT(), getLocale(), getPublishedProducts({ limit: 1000 })]);
  const en = locale === "en";
  const own = productsForCity(c.slug, all).sort((a, b) => (TYPE_ORDER.indexOf(a.productType) + 99) % 99 - (TYPE_ORDER.indexOf(b.productType) + 99) % 99);
  const extras = all.filter((p) => p.tags.includes("calendario") && p.tags.includes("ciudad"));
  const region = regionBySlug(c.region);
  const design = designBySlug(`ciudad-${c.slug}-cartel`);
  const neighbours = CITIES.filter((x) => x.region === c.region && x.slug !== c.slug);
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${c.label}: ROJO Y GUALDA`,
    about: { "@type": "City", name: c.label, geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lon } },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow={`${region?.name ?? ""} · ${c.sub}`} title={c.label} sub={c.line}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/disena?style=ciudad-${c.slug}-cartel`} className="btn btn-primary px-6 py-3.5">
            {en ? "Customise this design" : "Personaliza este diseño"} <IconArrow className="h-4 w-4" />
          </Link>
          <Link href="/ciudades" className="btn btn-ghost px-6 py-3.5">
            {en ? "All cities" : "Todas las ciudades"}
          </Link>
        </div>
      </PageHero>

      <section className="bg-bg py-12 sm:py-16">
        <Container>
          {own.length ? (
            <>
              <SectionHead eyebrow={en ? `${own.length} items` : `${own.length} piezas`} title={en ? `Everything from ${c.label}` : `Todo de ${c.label}`} />
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
                {own.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 0.04}>
                    <ProductCard p={p} labels={labels} />
                  </Reveal>
                ))}
              </div>
            </>
          ) : (
            design && (
              <div className="grid items-center gap-8 rounded-[2rem] border border-line bg-surface-2 p-6 sm:grid-cols-[1fr_1.2fr] sm:p-10">
                <div className="mx-auto w-full max-w-sm">
                  <DesignArt layers={design.layers} tone={design.tone} kind="tee" />
                </div>
                <div>
                  <p className="kicker text-gold">{en ? "Coming very soon" : "Muy pronto"}</p>
                  <h2 className="headline mt-2 text-3xl sm:text-4xl">{en ? `The ${c.label} collection is being produced` : `La colección de ${c.label} está en producción`}</h2>
                  <p className="mt-3 text-muted">{en ? "Meanwhile you can make it your own in the designer." : "Mientras tanto, puedes hacerla tuya en el diseñador."}</p>
                  <Link href={`/disena?style=ciudad-${c.slug}-cartel`} className="btn btn-primary mt-6 px-6 py-3.5">
                    {en ? "Design it" : "Diséñala"}<IconArrow className="ml-1.5 inline h-4 w-4 align-[-3px]" />
                  </Link>
                </div>
              </div>
            )
          )}

          {extras.length > 0 && (
            <div className="mt-16">
              <SectionHead eyebrow={en ? "Also" : "También"} title={en ? "Cities of Spain" : "Ciudades de España"} />
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
                {extras.map((p) => (
                  <ProductCard key={p.id} p={p} labels={labels} />
                ))}
              </div>
            </div>
          )}

          {neighbours.length > 0 && (
            <div className="mt-16">
              <p className="eyebrow mb-3 text-muted">{en ? `More in ${region?.name}` : `Más en ${region?.name}`}</p>
              <div className="flex flex-wrap gap-2">
                {neighbours.map((n) => (
                  <Link key={n.slug} href={`/ciudades/${n.slug}`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-fg">
                    {n.label}
                  </Link>
                ))}
                {region && (
                  <Link href={`/regiones/${region.slug}`} className="rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg">
                    {region.name}<IconArrow className="ml-1.5 inline h-4 w-4 align-[-3px]" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

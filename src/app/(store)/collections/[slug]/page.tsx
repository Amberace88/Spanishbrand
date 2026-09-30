import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionBySlug, getPublishedProducts } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { CollectionArt } from "@/components/art/CollectionArt";
import { ProductCard } from "@/components/product/ProductCard";
import { Newsletter } from "@/components/home/Newsletter";
import { TrackView } from "@/components/analytics/TrackView";
import { Container } from "@/components/ui/Section";
import { MaskLines, Reveal } from "@/components/ui/Reveal";

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

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) notFound();
  const [t, all] = await Promise.all([getT(), getPublishedProducts({ limit: 200 })]);
  const products = all.filter((p) => p.collection?.slug === c.slug);
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };

  return (
    <>
      <TrackView event="collection_view" collectionId={/^[0-9a-f-]{36}$/.test(c.id) ? c.id : undefined} />
      <section className="grain relative flex min-h-[88svh] items-end overflow-hidden bg-ink text-bone">
        <CollectionArt slug={c.slug} animated className="absolute inset-0 opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
        <Container className="relative pb-16 pt-40">
          <Reveal>
            <p className="eyebrow text-oro-2">{t("nav.collections")} · {products.length ? t("collections.pieces", { n: products.length }) : t("collections.soon")}</p>
          </Reveal>
          <h1 className="display mt-5 text-[22vw] sm:text-[16vw] lg:text-[12vw]">
            <MaskLines lines={[c.name]} />
          </h1>
          {c.tagline && (
            <Reveal delay={0.1}>
              <p className="serif mt-4 text-3xl italic text-bone/85 sm:text-5xl">{c.tagline}</p>
            </Reveal>
          )}
        </Container>
      </section>
      {c.story && (
        <section className="bg-warm py-20 sm:py-28">
          <Container>
            <Reveal>
              <p className="serif mx-auto max-w-4xl text-center text-3xl leading-snug sm:text-5xl">{c.story}</p>
            </Reveal>
          </Container>
        </section>
      )}
      <section className="border-t border-ink/10 bg-bone py-20">
        <Container>
          {products.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <ProductCard p={p} labels={labels} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="display text-6xl">{t("collections.soon")}</p>
                <p className="mt-4 max-w-md text-stone-2">{t("home.products.empty.body")}</p>
              </div>
              <Newsletter source={`collection-${c.slug}`} />
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

import Link from "next/link";
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
      <section className="relative overflow-hidden border-b border-ink/[0.07] bg-cream">
        <Container className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <nav className="text-sm text-stone-2">
              <Link href="/" className="hover:text-ink">Inicio</Link> <span className="mx-1.5">/</span>
              <Link href="/collections" className="hover:text-ink">{t("nav.collections")}</Link> <span className="mx-1.5">/</span>
              <span className="text-ink">{c.name}</span>
            </nav>
            <p className="eyebrow mt-6 text-rojo">{products.length ? t("collections.pieces", { n: products.length }) : t("collections.soon")}</p>
            <h1 className="headline mt-3 text-5xl sm:text-7xl">{c.name}</h1>
            {c.tagline && <p className="serif mt-3 text-2xl italic text-stone-2 sm:text-3xl">{c.tagline}</p>}
            {c.story && <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-2">{c.story}</p>}
          </Reveal>
          <Reveal delay={0.08} className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[2rem]">
            <CollectionArt slug={c.slug} animated className="absolute inset-0" />
          </Reveal>
        </Container>
      </section>
      <section className="bg-warm py-14 sm:py-20">
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
            <div className="grid gap-10 rounded-3xl bg-white p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="headline text-4xl">{t("collections.soon")}</p>
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

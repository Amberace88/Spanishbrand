import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getPublishedProducts } from "@/lib/products/queries";
import { getBrand } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { Gallery } from "@/components/product/Gallery";
import { ProductBuyBox } from "@/components/product/ProductBuyBox";
import { ProductCard } from "@/components/product/ProductCard";
import { CollectionArt } from "@/components/art/CollectionArt";
import { TrackView } from "@/components/analytics/TrackView";
import { Container } from "@/components/ui/Section";
import { dbOrNull } from "@/lib/supabase/admin";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Producto" };
  const title = p.seoTitle ?? p.name;
  const description = p.seoDescription ?? p.shortDescription ?? p.description?.slice(0, 155) ?? undefined;
  const image = p.ogImage ?? p.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title, description, images: image ? [{ url: image }] : undefined, type: "website" },
  };
}

async function realRating(productId: string) {
  const sb = dbOrNull();
  if (!sb) return null;
  const { data } = await sb.from("reviews").select("rating").eq("product_id", productId).eq("status", "APPROVED").eq("verified_purchase", true);
  if (!data?.length) return null;
  return { count: data.length, avg: data.reduce((s, r) => s + r.rating, 0) / data.length };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const [brand, t, rating, related] = await Promise.all([
    getBrand(),
    getT(),
    realRating(p.id),
    p.collection ? getPublishedProducts({ limit: 12 }).then((all) => all.filter((x) => x.collection?.slug === p.collection?.slug && x.id !== p.id).slice(0, 4)) : Promise.resolve([]),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const minPrice = Math.min(...p.variants.map((v) => v.price), p.price);

  // Structured data: Product + Offer; AggregateRating ONLY from real verified reviews.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDescription ?? p.description ?? undefined,
    image: p.images.map((i) => i.url),
    brand: { "@type": "Brand", name: brand.name },
    sku: p.id,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: p.currency,
      lowPrice: minPrice.toFixed(2),
      highPrice: Math.max(...p.variants.map((v) => v.price), p.price).toFixed(2),
      offerCount: p.variants.length,
      availability: p.variants.some((v) => v.available) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site}/products/${p.slug}`,
    },
    ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.avg.toFixed(1), reviewCount: rating.count } } : {}),
  };

  const cardLabels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackView event="product_view" productId={p.id} />
      <section className="bg-warm pb-20 pt-20 sm:pt-28">
        <Container>
          <nav className="eyebrow mb-6 flex gap-2 text-[0.6rem] text-stone">
            <Link href="/shop" className="link-u">
              {t("nav.shop")}
            </Link>
            {p.collection && (
              <>
                <span>/</span>
                <Link href={`/collections/${p.collection.slug}`} className="link-u">
                  {p.collection.name}
                </Link>
              </>
            )}
          </nav>
          <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
            <div>
              {p.images.length ? (
                <Gallery images={p.images} name={p.name} />
              ) : (
                <div className="relative aspect-[4/5]">
                  <CollectionArt slug={p.collection?.slug ?? "default"} className="absolute inset-0" />
                </div>
              )}
            </div>
            <div className="lg:sticky lg:top-28 lg:self-start">
              {p.collection && <p className="eyebrow text-rojo">{p.collection.name}</p>}
              <h1 className="display mt-3 text-5xl sm:text-6xl">{p.name}</h1>
              {p.shortDescription && <p className="serif mt-4 text-2xl italic leading-snug text-ink/75">{p.shortDescription}</p>}
              {p.limited && (
                <p className="eyebrow mt-5 inline-block bg-rojo px-3 py-1.5 text-[0.62rem] text-white">
                  {p.limitedRemaining != null ? t("product.limitedRemaining", { n: p.limitedRemaining }) : t("product.limitedTime")}
                  {p.limitedUntil && p.limitedRemaining == null ? ` · hasta ${new Date(p.limitedUntil).toLocaleDateString("es-ES")}` : ""}
                </p>
              )}
              <div className="mt-8">
                <ProductBuyBox variants={p.variants} currency={p.currency} />
              </div>
              <div className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
                {[
                  [t("product.details"), p.description],
                  [t("product.story"), p.story],
                  [t("product.shipping"), t("product.shippingBody")],
                ]
                  .filter(([, body]) => body)
                  .map(([title, body], i) => (
                    <details key={title} open={i === 0} className="group py-5">
                      <summary className="eyebrow flex cursor-pointer list-none items-center justify-between">
                        {title}
                        <span className="text-lg transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-stone-2">{body}</p>
                    </details>
                  ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
      {related.length > 0 && (
        <section className="border-t border-ink/10 bg-bone py-20">
          <Container>
            <h2 className="display mb-10 text-5xl sm:text-6xl">{t("product.related")}</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
              {related.map((r) => (
                <ProductCard key={r.id} p={r} labels={cardLabels} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

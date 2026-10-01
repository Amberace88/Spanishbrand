import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { notFound } from "next/navigation";
import { getProductBySlug, getPublishedProducts } from "@/lib/products/queries";
import { getBrand } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { Gallery } from "@/components/product/Gallery";
import { ProductBuyBox } from "@/components/product/ProductBuyBox";
import { ProductCard } from "@/components/product/ProductCard";
import { CollectionArt } from "@/components/art/CollectionArt";
import { TrackView } from "@/components/analytics/TrackView";
import { IconArrow, IconLock, IconReturn, IconTruck } from "@/components/ui/Icons";
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
      <section className="bg-bg pb-20 pt-6 sm:pt-10">
        <Container>
          <nav className="mb-6 flex gap-2 text-sm text-muted">
            <Link href="/shop" className="hover:text-fg">
              {t("nav.shop")}
            </Link>
            {p.collection && (
              <>
                <span>/</span>
                <Link href={`/collections/${p.collection.slug}`} className="hover:text-fg">
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
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
                  <CollectionArt slug={p.collection?.slug ?? "default"} className="absolute inset-0" />
                </div>
              )}
            </div>
            <div className="lg:sticky lg:top-28 lg:self-start">
              {p.collection && <p className="eyebrow text-accent">{p.collection.name}</p>}
              <h1 className="headline mt-2 text-3xl sm:text-[2.6rem]">{p.name}</h1>
              {p.shortDescription && <p className="mt-3 text-lg leading-relaxed text-muted">{p.shortDescription}</p>}
              {p.limited && (
                <p className="mt-5 inline-block rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white">
                  {p.limitedRemaining != null ? t("product.limitedRemaining", { n: p.limitedRemaining }) : t("product.limitedTime")}
                  {p.limitedUntil && p.limitedRemaining == null ? ` · hasta ${new Date(p.limitedUntil).toLocaleDateString("es-ES")}` : ""}
                </p>
              )}
              {p.personalization && (
                <Link href={p.personalization.mode === "designer" ? "/disena" : `/personaliza?t=${p.personalization.template}`} className="group mt-6 flex items-center justify-between gap-4 rounded-2xl bg-fg p-5 text-bg">
                  <span>
                    <span className="kicker text-gold">{t("perso.kicker")}</span>
                    <span className="headline mt-1 block text-xl">{p.personalization.mode === "designer" ? t("hero3.design") : t("perso.title")}</span>
                    {p.personalization.extraPrice > 0 && <span className="text-xs text-bg/60">+{formatMoney(p.personalization.extraPrice, p.currency)}</span>}
                  </span>
                  <IconArrow className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
              <div className="mt-8">
                <ProductBuyBox variants={p.variants} currency={p.currency} />
              </div>
              <ul className="mt-6 grid gap-3 rounded-2xl bg-surface-2 p-5 text-sm">
                {[
                  [IconTruck, t("trust.shipping.t"), t("trust.shipping.b")],
                  [IconReturn, t("trust.returns.t"), t("trust.returns.b")],
                  [IconLock, t("trust.secure.t"), t("trust.secure.b")],
                ].map(([Icon, title, body]) => {
                  const I = Icon as typeof IconTruck;
                  return (
                    <li key={title as string} className="flex items-start gap-3">
                      <I className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      <span>
                        <span className="font-semibold">{title as string}</span> <span className="text-muted">· {body as string}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-10 divide-y divide-line border-y border-line">
                {[
                  [t("product.details"), p.description],
                  [t("product.story"), p.story],
                  [t("product.shipping"), t("product.shippingBody")],
                ]
                  .filter(([, body]) => body)
                  .map(([title, body], i) => (
                    <details key={title} open={i === 0} className="group py-5">
                      <summary className="flex cursor-pointer font-semibold list-none items-center justify-between">
                        {title}
                        <span className="text-lg transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted">{body}</p>
                    </details>
                  ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
      {related.length > 0 && (
        <section className="border-t border-line bg-surface py-16 sm:py-20">
          <Container>
            <h2 className="headline mb-8 text-3xl sm:text-4xl">{t("product.related")}</h2>
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

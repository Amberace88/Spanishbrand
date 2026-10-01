import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { notFound } from "next/navigation";
import { getProductBySlug, getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { getBrand } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { designBySlug } from "@/lib/catalog/designs";
import { ProductView } from "@/components/product/ProductView";
import { ProductCard } from "@/components/product/ProductCard";
import { CollectionArt } from "@/components/art/CollectionArt";
import { DesignArt } from "@/components/catalog/DesignArt";
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

/** Business-day estimate for Spain: 2–4 days production + 2–5 days delivery. */
function deliveryWindow(locale: string) {
  const add = (from: Date, days: number) => {
    const d = new Date(from);
    let n = 0;
    while (n < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) n++;
    }
    return d;
  };
  const now = new Date();
  const f = (d: Date) => d.toLocaleDateString(locale === "es" ? "es-ES" : locale, { weekday: "short", day: "numeric", month: "short" });
  return [f(add(now, 4)), f(add(now, 9))] as const;
}

const KIND_FOR_TYPE: Record<string, "tee" | "hoodie" | "tote" | "poster" | "flat"> = { TSHIRT: "tee", KIDS_TSHIRT: "tee", HOODIE: "hoodie", SWEATSHIRT: "hoodie", TOTE: "tote", POSTER: "poster" };

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const [brand, t, rating, all] = await Promise.all([getBrand(), getT(), realRating(p.id), getPublishedProducts({ limit: 500 })]);
  const design = p.design ? designBySlug(p.design) : null;
  const sameDesign = design ? all.filter((x) => x.design === design.slug && x.id !== p.id).slice(0, 4) : [];
  const related = all.filter((x) => x.collection?.slug === p.collection?.slug && x.id !== p.id && x.design !== p.design).slice(0, 4);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const minPrice = Math.min(...p.variants.map((v) => v.price), p.price);
  const [d1, d2] = deliveryWindow("es");

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
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("nav.shop"), item: `${site}/shop` },
      ...(p.collection ? [{ "@type": "ListItem", position: 2, name: p.collection.name, item: `${site}/collections/${p.collection.slug}` }] : []),
      { "@type": "ListItem", position: p.collection ? 3 : 2, name: p.name, item: `${site}/products/${p.slug}` },
    ],
  };

  const cardLabels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const [details, care] = (p.description ?? "").split(/\n\nCuidados: /);

  const header = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {p.collection && (
          <Link href={`/collections/${p.collection.slug}`} className="kicker rounded-full bg-accent/10 px-3 py-1 text-accent hover:bg-accent hover:text-white">
            {p.collection.name}
          </Link>
        )}
        {p.featured && <span className="kicker rounded-full bg-gold/15 px-3 py-1 text-[color:var(--gold)]">{t("product.favourite")}</span>}
      </div>
      <h1 className="headline mt-3 text-3xl sm:text-[2.6rem]">{p.name}</h1>
      {p.shortDescription && <p className="mt-3 text-lg leading-relaxed text-muted">{p.shortDescription}</p>}
      {rating && (
        <p className="mt-3 text-sm">
          <span className="text-[color:var(--gold)]">★</span> {rating.avg.toFixed(1)} · {rating.count} {t("product.reviews")}
        </p>
      )}
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
    </>
  );

  const footer = (
    <>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-line p-4 text-sm">
        <IconTruck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p>
          <span className="font-semibold">{t("product.eta", { from: d1, to: d2 })}</span>
          <span className="block text-xs text-muted">{t("product.etaNote")}</span>
        </p>
      </div>
      {design && (
        <Link href={`/disena?style=${design.slug}`} className="group mt-3 flex items-center gap-4 rounded-2xl border border-line p-3 pr-5 transition-colors hover:border-fg">
          <span className="w-16 shrink-0 overflow-hidden rounded-xl">
            <DesignArt layers={design.layers} tone={design.tone} kind="flat" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t("product.styleTitle")}</span>
            <span className="block text-xs text-muted">{t("product.styleBody")}</span>
          </span>
          <IconArrow className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
      <ul className="mt-5 grid gap-3 rounded-2xl bg-surface-2 p-5 text-sm">
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
      <div className="mt-8 divide-y divide-line border-y border-line">
        <Acc title={t("product.details")} open>
          <p className="whitespace-pre-line">{details}</p>
        </Acc>
        {p.sizeGuide && (
          <Acc title={t("product.sizeGuide")}>
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13px] tabular-nums">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-semibold text-fg">{p.sizeGuide.unit}</th>
                    {p.sizeGuide.sizes.map((s) => (
                      <th key={s} className="px-2 py-2 font-semibold text-fg">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.sizeGuide.rows.map((r) => (
                    <tr key={r.label} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium text-fg">{r.label}</td>
                      {r.values.map((v, i) => (
                        <td key={i} className="px-2 py-2">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs">{t("product.sizeNote")}</p>
          </Acc>
        )}
        {care && (
          <Acc title={t("product.care")}>
            <p>{care}</p>
          </Acc>
        )}
        {p.story && (
          <Acc title={t("product.story")}>
            <p className="whitespace-pre-line">{p.story}</p>
          </Acc>
        )}
        <Acc title={t("product.shipping")}>
          <p>{t("product.shippingBody")}</p>
          <Link href="/shipping" className="mt-2 inline-block font-semibold text-fg underline">
            {t("product.shippingMore")}
          </Link>
        </Acc>
      </div>
    </>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, "\\u003c") }} />
      <TrackView event="product_view" productId={p.id} />
      <section className="bg-bg pb-20 pt-6 sm:pt-10">
        <Container>
          <nav className="mb-6 flex flex-wrap gap-2 text-sm text-muted">
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
            <span>/</span>
            <span className="text-fg">{p.name}</span>
          </nav>
          <ProductView
            p={p}
            header={header}
            footer={footer}
            fallback={
              design ? (
                <div className="overflow-hidden rounded-3xl bg-surface-2 p-8">
                  <DesignArt layers={design.layers} tone={design.tone} kind={KIND_FOR_TYPE[p.productType] ?? "flat"} />
                </div>
              ) : (
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
                  <CollectionArt slug={p.collection?.slug ?? "default"} className="absolute inset-0" />
                </div>
              )
            }
          />
        </Container>
      </section>
      {sameDesign.length > 0 && <Rail title={t("product.sameDesign")} items={sameDesign} labels={cardLabels} tone="surface" />}
      {related.length > 0 && <Rail title={t("product.related")} items={related} labels={cardLabels} tone="bg" href={p.collection ? `/collections/${p.collection.slug}` : undefined} more={t("collections.explore")} />}
    </>
  );
}

function Acc({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
        {title}
        <span className="text-lg transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 text-sm leading-relaxed text-muted">{children}</div>
    </details>
  );
}

function Rail({ title, items, labels, tone, href, more }: { title: string; items: PublicProduct[]; labels: { madeToOrder: string; from: string; limited: string }; tone: "surface" | "bg"; href?: string; more?: string }) {
  return (
    <section className={`border-t border-line py-16 sm:py-20 ${tone === "surface" ? "bg-surface" : "bg-bg"}`}>
      <Container>
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="headline text-3xl sm:text-4xl">{title}</h2>
          {href && more && (
            <Link href={href} className="text-sm font-semibold underline-offset-4 hover:underline">
              {more} →
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
          {items.map((r) => (
            <ProductCard key={r.id} p={r} labels={labels} />
          ))}
        </div>
      </Container>
    </section>
  );
}

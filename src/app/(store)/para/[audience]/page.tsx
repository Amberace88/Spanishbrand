import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getT } from "@/lib/i18n/server";
import { getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { listSiteImages } from "@/lib/site-images";
import { AUDIENCES, AUDIENCE_COVER, AUDIENCE_LOCAL, AUDIENCE_EXTRAS, AUDIENCE_TYPE_ORDER, audienceTypeLabel, isAudience, isFor, type Audience } from "@/lib/catalog/audience";
import { ACTIVE_DESIGNS, artUrl, type BlueprintKey, type Design } from "@/lib/catalog/designs";
import { ProductCard } from "@/components/product/ProductCard";
import { merchandise, merchandiseUnique } from "@/lib/catalog/merch";
import { DesignArt } from "@/components/catalog/DesignArt";
import { Container, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";
import { AudienceTile } from "@/components/merch/AudienceTile";
import { campaignPhoto } from "@/lib/campaign";

export const revalidate = 120;
export const dynamicParams = false;

export function generateStaticParams() {
  return AUDIENCES.map((audience) => ({ audience }));
}

/** SEO copy (Spanish storefront) and the visual identity of each landing. */
const PAGE: Record<Audience, { seoTitle: string; seoDesc: string; word: string; accent: string; photos: string[]; tag?: string; garments: BlueprintKey[] }> = {
  mujer: {
    seoTitle: "Ropa de mujer con orgullo español: camisetas y sudaderas",
    seoDesc: "Camisetas de mujer, sudaderas cortas y sudaderas con el león coronado y diseños de identidad española. Fabricado bajo pedido en Europa.",
    word: "ELLA",
    accent: "#c8102e",
    photos: ["look-leon-mujer", "campaign:mujer", "campaign:fiestas"],
    garments: ["womtee", "womcrop", "womsweat"],
  },
  hombre: {
    seoTitle: "Ropa de hombre con orgullo español: camisetas, sudaderas y gorras",
    seoDesc: "Camisetas, sudaderas y gorras de hombre con el león coronado, la bandera y diseños originales de España. Fabricado bajo pedido en Europa.",
    word: "ÉL",
    accent: "#1f3a63",
    photos: ["look-toro-hombre", "campaign:hombre", "campaign:heritage"],
    garments: ["tee", "hoodie", "sweat"],
  },
  ninos: {
    seoTitle: "Ropa infantil con orgullo español: camisetas y sudaderas para niños",
    seoDesc: "Camisetas y sudaderas infantiles y para peques de 2 a 5 años: Pequeño León, Mi Primer Mundial y más. Tintas al agua, fabricado en Europa.",
    word: "PEQUES",
    accent: "#d4a62a",
    photos: ["/lifestyle/kids-1.webp", "/lifestyle/kids-5.webp", "/lifestyle/kids-3.webp"],
    tag: "ninos",
    garments: ["kids", "kidshoodie", "toddler"],
  },
  bebes: {
    seoTitle: "Bodies de bebé con orgullo español: regalos para recién nacidos",
    seoDesc: "Bodies de bebé Hecho en España, Pequeño León y Mi Primer Mundial. Algodón suave con corchetes, fabricado bajo pedido en Europa.",
    word: "BEBÉ",
    accent: "#d98b96",
    photos: ["/lifestyle/kids-2.webp", "campaign:familia"],
    tag: "bebes",
    garments: ["baby"],
  },
  abuelos: {
    seoTitle: "Regalos para abuelos: El mejor abuelo de España, Abuela de oro",
    seoDesc: "Camisetas, sudaderas, tazas y delantales para abuelos y abuelas: El mejor abuelo de España, Abuela de oro y regalos con el león coronado.",
    word: "ABUELOS",
    accent: "#9a7222",
    photos: ["/lifestyle/kids-4.webp", "campaign:servicio", "campaign:pueblo"],
    tag: "abuelos",
    garments: [],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ audience: string }> }): Promise<Metadata> {
  const { audience } = await params;
  if (!isAudience(audience)) return {};
  const c = PAGE[audience];
  return { title: c.seoTitle, description: c.seoDesc, alternates: { canonical: `/para/${audience}` }, openGraph: { title: c.seoTitle, description: c.seoDesc } };
}

const PAGE_SIZE = 24;

/** House designs that belong on this landing (lion first). */
function designsFor(a: Audience): Design[] {
  const g = PAGE[a].garments;
  const tag = PAGE[a].tag;
  const list = ACTIVE_DESIGNS.filter((d) => {
    if (tag) return d.tags?.includes(tag) || g.some((k) => d.products.includes(k) || AUDIENCE_EXTRAS[k]?.includes(d.slug));
    if (a === "mujer") return g.some((k) => d.products.includes(k) || AUDIENCE_EXTRAS[k]?.includes(d.slug));
    return d.tags?.includes("leon") && d.products.includes("tee") && !d.tags.includes("abuelos");
  });
  return list.sort((x, y) => Number(Boolean(y.tags?.includes("familia"))) - Number(Boolean(x.tags?.includes("familia"))) || Number(Boolean(y.tags?.includes("leon"))) - Number(Boolean(x.tags?.includes("leon")))).slice(0, 6);
}

export default async function AudiencePage({ params, searchParams }: { params: Promise<{ audience: string }>; searchParams: Promise<{ t?: string; page?: string }> }) {
  const [{ audience }, sp] = await Promise.all([params, searchParams]);
  if (!isAudience(audience)) notFound();
  const a = audience;
  const cfg = PAGE[a];
  const [t, locale, all, site] = await Promise.all([getT(), getLocale(), getPublishedProducts({ limit: 5000 }), listSiteImages()]);

  // curated order (lib/catalog/merch.ts) with this landing's own bonus: audience-specific pieces lead
  const boost = (p: PublicProduct) => (cfg.tag && p.tags.includes(cfg.tag) ? 3 : 0) + (a === "mujer" && p.productType.startsWith("WOMENS_") ? 2.5 : 0) + (p.tags.includes("leon") ? 1 : 0);
  const own = all.filter((p) => isFor(p, a));
  const typeIdx = (code: string) => (AUDIENCE_TYPE_ORDER.indexOf(code) + 999) % 999;
  const types = [...new Set(own.map((p) => p.productType))].sort((x, y) => typeIdx(x) - typeIdx(y));
  const type = types.find((x) => x === sp.t);
  const products = merchandise(type ? own.filter((x) => x.productType === type) : own, { boost });
  const page = Math.max(1, Math.min(40, Number(sp.page) || 1));
  const shown = products.slice(0, page * PAGE_SIZE);
  const designs = designsFor(a);
  const more = a === "abuelos" ? merchandiseUnique(all.filter((p) => !isFor(p, "abuelos") && ["tapas", "heritage", "mi-pueblo"].includes(p.collection?.slug ?? "") && p.images[0]), 8) : [];
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };

  // hero collage: campaign photos first, then real product photos, then live design previews
  const photos = [...cfg.photos.map((k) => (k.startsWith("/") ? k : k.startsWith("campaign:") ? campaignPhoto(k.slice(9)) : site[k])).filter(Boolean), ...merchandiseUnique(own, 3, { boost }).map((p) => p.images[0]?.url).filter(Boolean)].slice(0, 3) as string[];
  const heroDesigns = designs.slice(0, 3 - Math.min(3, photos.length));
  const href = (patch: { t?: string; page?: string }) => {
    const q = new URLSearchParams();
    const merged = { t: type, ...patch };
    if (merged.t) q.set("t", merged.t);
    if (merged.page) q.set("page", merged.page);
    const s = q.toString();
    return `/para/${a}${s ? `?${s}` : ""}#productos`;
  };
  const chip = (active: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-fg/40"}`;
  const ring = `${t(`audience.${a}`)} · ROJO Y GUALDA · `;
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: `${t(`audience.${a}.title`)}: ROJO Y GUALDA`, description: cfg.seoDesc, numberOfItems: own.length };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ───────── hero ───────── */}
      <section className="relative isolate overflow-hidden border-b border-line bg-surface-2">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden style={{ background: `radial-gradient(60% 70% at 85% 30%, ${cfg.accent}2e, transparent 70%), radial-gradient(40% 50% at 0% 100%, ${cfg.accent}14, transparent 70%)` }} />
        <p className="text-stroke-fg pointer-events-none absolute -bottom-[0.18em] right-[-0.04em] -z-10 select-none font-[family-name:var(--font-logo)] text-[30vw] font-bold leading-none opacity-[0.07] lg:text-[22vw]" aria-hidden>
          {cfg.word}
        </p>
        <Container className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <Reveal>
            <nav className="text-sm text-muted" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-fg">{t("nav.home")}</Link> <span className="mx-1.5">/</span>
              <Link href="/shop" className="hover:text-fg">{t("nav.shop")}</Link> <span className="mx-1.5">/</span>
              <span className="text-fg">{t("audience.title")}</span>
            </nav>
            <h1 className="mt-6 font-[family-name:var(--font-logo)] text-[13vw] font-bold leading-[0.95] tracking-[0.01em] text-fg sm:text-7xl lg:text-[6.2rem]">{t(`audience.${a}.title`)}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{t(`audience.${a}.sub`)}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#productos" className="btn btn-primary px-6 py-3.5">
                {t("audience.viewPieces")} <IconArrow className="h-4 w-4" />
              </a>
              {designs[0] && (
                <Link href={`/disena?style=${designs[0].slug}`} className="btn btn-ghost px-6 py-3.5">
                  {t("audience.designOwn")}
                </Link>
              )}
            </div>
            {/* audience switcher: the five recipients, always one tap away */}
            <nav className="no-scrollbar -mx-4 mt-9 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("audience.title")}>
              {AUDIENCES.map((x) => (
                <Link key={x} href={`/para/${x}`} aria-current={x === a ? "page" : undefined} className={chip(x === a)}>
                  {t(`audience.${x}`)}
                </Link>
              ))}
            </nav>
          </Reveal>

          <Reveal delay={0.08} className="relative mx-auto w-full max-w-xl">
            <div className="grid grid-cols-[1.35fr_1fr] gap-3 sm:gap-4">
              <div className="relative row-span-2 aspect-[4/5] overflow-hidden rounded-[2rem] bg-surface shadow-[0_40px_80px_-40px_rgba(0,0,0,0.5)]">
                {photos[0] ? (
                  <Image src={photos[0]} alt={t(`audience.${a}.title`)} fill preload sizes="(min-width:1024px) 28vw, 60vw" className="object-cover" />
                ) : heroDesigns[0] ? (
                  <div className="absolute inset-0 grid place-items-center p-4">
                    <DesignArt layers={heroDesigns[0].layers} tone={heroDesigns[0].tone} kind="tee" className="w-full" />
                  </div>
                ) : null}
              </div>
              {[1, 2].map((i) => {
                const src = photos[i];
                const d = src ? null : heroDesigns[i - photos.length] ?? heroDesigns[0];
                return (
                  <div key={i} className={`relative aspect-square overflow-hidden rounded-[1.6rem] bg-surface ${i === 1 ? "floaty" : "floaty-slow"} motion-reduce:animate-none`}>
                    {src ? <Image src={src} alt="" fill sizes="(min-width:1024px) 18vw, 40vw" className="object-cover" /> : d ? <DesignArt layers={d.layers} tone={d.tone} kind="tee" className="absolute inset-0" /> : null}
                  </div>
                );
              })}
            </div>
            {/* crowned-lion seal, slowly turning ring of text */}
            <div className="absolute -bottom-6 -left-4 grid h-28 w-28 place-items-center rounded-full bg-bg shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)] ring-1 ring-line sm:-left-8 sm:h-36 sm:w-36" aria-hidden>
              <svg viewBox="0 0 100 100" className="spin-slow absolute inset-0 h-full w-full text-fg motion-reduce:animate-none">
                <defs>
                  <path id={`ring-${a}`} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                </defs>
                <text className="fill-current text-[8.5px] font-bold uppercase tracking-[0.2em]">
                  <textPath href={`#ring-${a}`}>{ring}</textPath>
                </text>
              </svg>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artUrl("lion-crowned")} alt="" className="lion-float h-14 w-14 object-contain sm:h-[4.5rem] sm:w-[4.5rem]" />
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ───────── products ───────── */}
      <section id="productos" className="scroll-mt-24 bg-bg pb-20">
        {types.length > 1 && (
          <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] z-20 border-b border-line bg-surface/90 backdrop-blur-xl">
            <Container>
              <nav className="no-scrollbar flex gap-2 overflow-x-auto py-3">
                <Link href={href({ t: undefined, page: undefined })} className={chip(!type)} scroll={false}>
                  {t("audience.allTypes")}
                </Link>
                {types.map((x) => (
                  <Link key={x} href={href({ t: x, page: undefined })} className={chip(type === x)} scroll={false}>
                    {audienceTypeLabel(x, locale)}
                  </Link>
                ))}
              </nav>
            </Container>
          </div>
        )}
        <Container className="pt-10">
          {shown.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
                {shown.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 0.05}>
                    <ProductCard p={p} labels={labels} />
                  </Reveal>
                ))}
              </div>
              <div className="mt-14 flex flex-col items-center gap-3">
                <p className="text-sm text-muted">{t("audience.showing", { n: shown.length, total: products.length })}</p>
                {shown.length < products.length && (
                  <Link href={href({ page: String(page + 1) })} scroll={false} className="btn btn-ink px-8">
                    {t("audience.showMore")}
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="grid items-center gap-6 rounded-[2rem] border border-line bg-surface p-8 sm:grid-cols-[auto_1fr] sm:p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artUrl("lion-crowned")} alt="" className="lion-float h-24 w-24 object-contain" />
              <div>
                <p className="headline text-2xl sm:text-3xl">{t(`audience.${a}.title`)}</p>
                <p className="mt-2 max-w-xl text-muted">{t("audience.empty")}</p>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* ───────── house designs for this audience ───────── */}
      {designs.length > 0 && (
        <section className="border-t border-line bg-surface py-16 sm:py-20">
          <Container>
            <SectionHead eyebrow={t(`audience.${a}`)} title={t("audience.designsTitle")} sub={t("audience.designsSub")} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {designs.map((d, i) => (
                <Reveal key={d.slug} delay={(i % 3) * 0.05}>
                  <div className="group overflow-hidden rounded-[1.75rem] border border-line bg-bg transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(0,0,0,0.45)]">
                    <div className="bg-surface-2 p-6 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.02]">
                      <DesignArt layers={d.layers} tone={d.tone} kind="tee" />
                    </div>
                    <div className="p-6">
                      <h3 className="headline text-2xl">{d.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{d.line}</p>
                      <Link href={`/disena?style=${d.slug}`} className="btn btn-ink mt-5 !px-4 !py-2.5 text-[12px]">
                        {t("audience.designOwn")}
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {more.length > 0 && (
        <section className="bg-bg py-16 sm:py-20">
          <Container>
            <SectionHead eyebrow={t("audience.abuelos")} title={t("audience.more")} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
              {more.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <ProductCard p={p} labels={labels} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ───────── the other recipients ───────── */}
      <section className="border-t border-line bg-bg py-14 sm:py-16">
        <Container>
          <h2 className="headline text-[2.1rem] sm:text-5xl">{t("audience.others")}</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {AUDIENCES.filter((x) => x !== a).map((x, i) => (
              <Reveal key={x} delay={i * 0.04}>
                <AudienceTile href={`/para/${x}`} label={t(`audience.${x}.title`)} cover={campaignPhoto(x) || (AUDIENCE_COVER[x] && site[AUDIENCE_COVER[x]]) || AUDIENCE_LOCAL[x] || null} sizes="(min-width:1024px) 25vw, 50vw" />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

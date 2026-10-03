import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { DESIGNS, type Design } from "@/lib/catalog/designs";
import { FUTBOL_AOP, FUTBOL_CITIES, FUTBOL_SERIES, type FutbolCity } from "@/lib/catalog/futbol-pro";
import { Container } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/product/ProductCard";
import { FutbolTee } from "@/components/futbol/FutbolTee";
import { AopShirt } from "@/components/futbol/AopShirt";
import { IconArrow } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Fútbol — Campeones del mundo, colores de tu ciudad y grada",
  description: "Camisetas y sudaderas de fútbol con estampados enormes: CAMPEONES 2010 · 2026, los colores de tu ciudad, grada y retro 90. Diseños originales de afición, fabricados bajo pedido en Europa.",
  alternates: { canonical: "/futbol" },
};
export const revalidate = 120;

const artOf = (d: Design, layer: "front" | "back") => {
  const l = (layer === "front" ? d.layers : d.back ?? [])[0];
  return l && l.type === "image" ? l.path.slice(7, -4) : undefined; // "art/fp-x.png" → "x"
};
const garmentOf = (d: Design) => (d.tone === "dark" ? "#141414" : "#f4f1ea");
const cityLabel = (c: FutbolCity) => {
  const name = c.name.charAt(0) + c.name.slice(1).toLowerCase().replace(/ (\p{L})/gu, (_, l: string) => ` ${l.toUpperCase()}`);
  if (c.key === "madrid") return `${name} · blanco`;
  if (c.key === "madrid-rojiblanco") return `${name} · rojiblanco`;
  if (c.key === "sevilla") return `${name} · blanco y rojo`;
  if (c.key === "sevilla-verdiblanco") return `${name} · verdiblanco`;
  return name;
};
/** CSS swatch of a city's shirt pattern. */
function swatch(c: FutbolCity) {
  const { type, a, b = a, n = 5 } = c.pat;
  if (type === "stripes") return `repeating-linear-gradient(90deg, ${a} 0 ${100 / (n * 2 - 1)}%, ${b} ${100 / (n * 2 - 1)}% ${200 / (n * 2 - 1)}%)`;
  if (type === "hoops") return `repeating-linear-gradient(180deg, ${a} 0 ${100 / (n * 2 - 1)}%, ${b} ${100 / (n * 2 - 1)}% ${200 / (n * 2 - 1)}%)`;
  if (type === "band") return `linear-gradient(180deg, ${a} 0 32%, ${b} 32% 50%, ${a} 50%)`;
  return `linear-gradient(135deg, ${a} 0 72%, ${c.trim} 72% 80%, ${a} 80%)`;
}

function DesignCard({ d, products, labels, backLabel, soon }: { d: Design; products: PublicProduct[]; labels: Parameters<typeof ProductCard>[0]["labels"]; backLabel: string; soon: string }) {
  const lead = products.find((p) => p.categoryCode === "APPAREL") ?? products[0];
  if (lead) return <ProductCard p={lead} labels={labels} />;
  const front = artOf(d, "front"), back = artOf(d, "back");
  const aop = d.products.includes("jersey");
  const city = d.tags?.find((t) => t.startsWith("color-"))?.slice(6);
  return (
    <Link href={`/disena?style=${d.slug}`} className="group block">
      <div className={`relative aspect-[4/5] overflow-hidden rounded-2xl ${d.tone === "dark" ? "bg-[#2a2a2a]" : "bg-[#d9d4c8]"}`}>
        <div className="absolute inset-[6%] transition-transform duration-700 group-hover:scale-[1.04]">{aop && city ? <AopShirt city={city} /> : front && <FutbolTee front={front} back={back} garment={garmentOf(d)} />}</div>
        <span className="absolute left-2.5 top-2.5 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-black">{soon}</span>
        {back && <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">{backLabel}</span>}
      </div>
      <p className="mt-3 text-[15px] font-semibold leading-snug">{d.name}</p>
    </Link>
  );
}

export default async function FutbolPage({ searchParams }: { searchParams: Promise<{ ciudad?: string }> }) {
  const [t, all, sp] = await Promise.all([getT(), getPublishedProducts({ limit: 1500 }), searchParams]);
  const designs = DESIGNS.filter((d) => d.tags?.includes("futbol-pro"));
  const products = all.filter((p) => p.tags.includes("futbol-pro"));
  const byDesign = new Map<string, PublicProduct[]>();
  for (const p of products) if (p.design) byDesign.set(p.design, [...(byDesign.get(p.design) ?? []), p]);
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const city = FUTBOL_CITIES.find((c) => c.key === sp.ciudad) ?? null;
  const cityDesigns = city ? designs.filter((d) => d.tags?.includes(`color-${city.key}`)) : [];
  const cityProducts = city ? products.filter((p) => p.tags.includes(`color-${city.key}`)) : [];
  const card = (d: Design) => <DesignCard d={d} products={byDesign.get(d.slug) ?? []} labels={labels} backLabel={t("futbol.backPrint")} soon={t("futbol.soon")} />;

  return (
    <>
      {/* ───── hero ───── */}
      <section className="relative overflow-hidden bg-[#0b0b0b] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#c8102e_1.4px,transparent_1.6px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-[linear-gradient(90deg,#c8102e_0_25%,#f1bf00_25%_75%,#c8102e_75%)]" aria-hidden />
        <Container className="relative grid items-center gap-6 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <Reveal>
            <nav className="text-sm text-white/50">
              <Link href="/" className="hover:text-white">Inicio</Link> <span className="mx-1.5">/</span>
              <Link href="/deportes" className="hover:text-white">{t("nav.sports")}</Link> <span className="mx-1.5">/</span>
              <span className="text-white">Fútbol</span>
            </nav>
            <p className="kicker mt-6 text-gold">{t("futbol.eyebrow")}</p>
            <div className="mt-4 flex gap-3" aria-hidden>
              {[0, 1].map((i) => (
                <svg key={i} viewBox="0 0 24 24" className="h-10 w-10 animate-[floaty_4s_ease-in-out_infinite] fill-gold sm:h-14 sm:w-14" style={{ animationDelay: `${i * 0.6}s` }}>
                  <path d="M12 1.5l3.09 6.9 7.41.6-5.64 4.9 1.72 7.3L12 17.3l-6.58 3.9 1.72-7.3L1.5 9l7.41-.6z" />
                </svg>
              ))}
            </div>
            <h1 className="mega mt-3 text-[18vw] leading-[0.8] sm:text-[9rem] lg:text-[11rem]">{t("futbol.title")}</h1>
            <p className="mt-3 font-mono text-2xl tracking-[0.3em] text-gold sm:text-3xl">2010 · 2026</p>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/70">{t("futbol.sub")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#serie-campeones" className="btn btn-primary">{t("futbol.ctaShop")} <IconArrow className="h-4 w-4" /></a>
              <a href="#ciudad" className="btn border border-white/25 text-white hover:bg-white hover:text-black">{t("futbol.ctaCity")}</a>
            </div>
            <dl className="mt-10 flex gap-8 border-t border-white/10 pt-6 sm:gap-12">
              {[
                [designs.length, t("futbol.stat.designs")],
                [new Set(FUTBOL_CITIES.map((c) => c.name)).size, t("futbol.stat.cities")],
                [2, t("futbol.stat.stars")],
              ].map(([n, l]) => (
                <div key={String(l)}>
                  <dt className="mega text-5xl text-white">{n}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.1} className="relative mx-auto w-full max-w-xl">
            <div className="relative aspect-square">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(200,16,46,0.45),transparent_65%)] blur-2xl" aria-hidden />
              <div className="absolute left-0 top-[8%] w-[62%] -rotate-6 animate-[floaty_6s_ease-in-out_infinite]">
                <FutbolTee front="campeones-mundo-noche" back="campeones-mundo-noche-espalda" />
              </div>
              <div className="absolute bottom-0 right-0 w-[56%] rotate-[7deg] animate-[floaty_7s_ease-in-out_infinite] [animation-delay:1.2s]">
                <FutbolTee front="campeones-espalda-noche" garment="#1b1b1b" />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ───── series index ───── */}
      <nav className="sticky top-[var(--header-h,64px)] z-20 border-b border-line bg-bg/90 backdrop-blur">
        <Container className="no-scrollbar flex gap-2 overflow-x-auto py-3">
          {FUTBOL_SERIES.map((s) => (
            <a key={s.key} href={s.key === "ciudad" ? "#ciudad" : `#${s.tag}`} className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-fg/40">
              {t(`futbol.series.${s.key}` as never)}
            </a>
          ))}
        </Container>
      </nav>

      {/* ───── series ───── */}
      {FUTBOL_SERIES.map((s, si) => {
        if (s.key === "ciudad") {
          return (
            <section key={s.key} id="ciudad" className="scroll-mt-28 bg-[#0b0b0b] py-14 text-white sm:py-20">
              <Container>
                <Reveal>
                  <p className="kicker text-gold">{t("futbol.picker.title")}</p>
                  <h2 className="mega mt-3 text-6xl sm:text-8xl">{t("futbol.series.ciudad")}</h2>
                  <p className="mt-4 max-w-2xl text-lg text-white/65">{t("futbol.series.ciudadSub")} {t("futbol.picker.sub")}</p>
                </Reveal>
                <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                  <Link href="/futbol#ciudad" scroll={false} className={`flex items-center justify-center rounded-xl border px-2 py-3 text-xs font-bold uppercase tracking-wider ${!city ? "border-white bg-white text-black" : "border-white/20 hover:border-white/60"}`}>
                    {t("futbol.picker.all")}
                  </Link>
                  {FUTBOL_CITIES.map((c) => (
                    <Link key={c.key} href={`/futbol?ciudad=${c.key}#ciudad`} scroll={false} className={`group rounded-xl border p-1.5 transition-colors ${city?.key === c.key ? "border-gold bg-white/10" : "border-white/10 hover:border-white/50"}`}>
                      <span className="block aspect-[5/3] rounded-lg ring-1 ring-white/20 transition-transform group-hover:scale-[1.03]" style={{ background: swatch(c) }} />
                      <span className="mt-1.5 block truncate px-0.5 text-[11px] font-semibold leading-tight text-white/85">{cityLabel(c)}</span>
                    </Link>
                  ))}
                </div>

                {city ? (
                  <div className="mt-12">
                    <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
                      <div className="grid grid-cols-2 gap-3">
                        <FutbolTee front={`ciudad-${city.key}`} />
                        <FutbolTee front={`ciudad-${city.key}-espalda`} />
                      </div>
                      <div>
                        <h3 className="mega text-6xl sm:text-7xl" style={{ color: city.name2 }}>{cityLabel(city)}</h3>
                        <p className="mt-3 text-white/65">{designs.find((d) => d.slug === `fp-ciudad-${city.key}`)?.line}</p>
                        {FUTBOL_AOP.includes(city.key) && (
                          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white/5 p-4">
                            <div className="h-28 w-28 shrink-0"><AopShirt city={city.key} /></div>
                            <div>
                              <p className="font-semibold">{t("futbol.series.camiseta")}</p>
                              <p className="text-sm text-white/60">{t("futbol.series.camisetaSub")}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 text-white sm:gap-x-5 lg:grid-cols-4 [&_p]:text-white">
                      {cityProducts.length
                        ? cityProducts.map((p) => <ProductCard key={p.id} p={p} labels={labels} />)
                        : cityDesigns.map((d) => <div key={d.slug}>{card(d)}</div>)}
                    </div>
                    {!cityProducts.length && <p className="mt-4 text-sm text-white/50">{t("futbol.picker.empty")}</p>}
                  </div>
                ) : (
                  <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 [&_p]:text-white">
                    {designs.filter((d) => d.tags?.includes("serie-ciudad")).map((d, i) => (
                      <Reveal key={d.slug} delay={(i % 4) * 0.05}>{card(d)}</Reveal>
                    ))}
                  </div>
                )}
              </Container>
            </section>
          );
        }
        const list = designs.filter((d) => d.tags?.includes(s.tag));
        if (!list.length) return null;
        return (
          <section key={s.key} id={s.tag} className={`scroll-mt-28 py-14 sm:py-20 ${si % 2 ? "bg-surface" : "bg-bg"}`}>
            <Container>
              <Reveal className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="kicker flex items-center gap-2 text-gold"><span className="flag-line inline-block h-[3px] w-6 rounded-full" />{t("futbol.pieces", { n: list.reduce((a, d) => a + (byDesign.get(d.slug)?.length ?? 0), 0) || list.length })}</p>
                  <h2 className="mega mt-2 text-5xl sm:text-7xl">{t(`futbol.series.${s.key}` as never)}</h2>
                  <p className="mt-3 max-w-xl text-muted">{t(`futbol.series.${s.key}Sub` as never)}</p>
                </div>
              </Reveal>
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
                {list.map((d, i) => (
                  <Reveal key={d.slug} delay={(i % 4) * 0.05}>{card(d)}</Reveal>
                ))}
              </div>
            </Container>
          </section>
        );
      })}

      <section className="border-t border-line bg-bg py-10">
        <Container className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-xs text-muted">{t("sports.legal")}</p>
          <Link href="/collections/futbol" className="btn btn-ghost">{t("futbol.more")} <IconArrow className="h-4 w-4" /></Link>
        </Container>
      </section>
    </>
  );
}

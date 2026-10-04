import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { designBySlug } from "@/lib/catalog/designs";
import { SAB_CATS, SAYINGS, sabSlug, tonesOf, type SabStyle } from "@/lib/catalog/sabiduria";
import { DesignArt } from "@/components/catalog/DesignArt";
import { Container, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Refranero y sabiduría: camisetas con refranes y frases españolas",
  description: "Al mal tiempo, buena cara. Contigo, pan y cebolla. Come, que estás muy delgado. Refranes de siempre, frases de abuela y humor español en camisetas, sudaderas, tazas, delantales, cojines y láminas. Fabricado bajo pedido en Europa.",
  alternates: { canonical: "/sabiduria" },
};

const STYLE_NAMES: Record<SabStyle, [string, string]> = {
  bloque: ["Bloque XL", "XL block"],
  clasico: ["Clásica", "Classic serif"],
  manuscrito: ["Manuscrita", "Hand script"],
  sello: ["Sello vintage", "Vintage seal"],
  azulejo: ["Azulejo", "Azulejo tile"],
  bicolor: ["Bicolor", "Two-tone"],
  ilustracion: ["Con ilustración", "Illustrated"],
  leon: ["León de la casa", "House lion"],
  pop: ["Peques", "Little ones"],
};
/** One showcase saying per look, for the "nine ways" strip. */
const STYLE_SHOWCASE: [SabStyle, string][] = [
  ["bloque", "sab-al-mal-tiempo-noche"],
  ["clasico", "sab-poco-a-poco"],
  ["manuscrito", "sab-pan-y-cebolla"],
  ["sello", "sab-caballo-regalado"],
  ["azulejo", "sab-come-delgado"],
  ["bicolor", "sab-para-manana-noche"],
  ["ilustracion", "sab-buen-arbol"],
  ["leon", "sab-hecho-con-alma-noche"],
  ["pop", "sab-pequeno-maton"],
];

const TYPE_ORDER = ["tshirt", "hoodie", "sweatshirt", "womens", "kids", "toddler", "baby", "mug", "apron", "tote", "pillow", "poster", "framed"];
const rankType = (p: PublicProduct) => {
  const i = TYPE_ORDER.findIndex((t) => p.productType.toLowerCase().includes(t));
  return i < 0 ? 99 : i;
};

export default async function SabiduriaPage() {
  const [locale, t, all] = await Promise.all([getLocale(), getT(), getPublishedProducts({ limit: 1500 })]);
  const en = locale === "en";
  const from = t("common.from");
  const byDesign = new Map<string, PublicProduct[]>();
  for (const p of all) if (p.design?.startsWith("sab-")) byDesign.set(p.design, [...(byDesign.get(p.design) ?? []), p]);
  const hero = ["sab-al-mal-tiempo-noche", "sab-come-delgado", "sab-hecho-con-alma-noche"].map((s) => designBySlug(s)!).filter(Boolean);
  const total = SAYINGS.reduce((n, s) => n + tonesOf(s).length, 0);

  return (
    <>
      {/* ───────── hero ───────── */}
      <section className="bg-bg px-3 pt-3 sm:px-5">
        <div className="relative mx-auto grid max-w-[1600px] overflow-hidden rounded-[28px] bg-[#f3ead7] text-[#1c1a17] lg:grid-cols-[1fr_1.1fr]">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#a3162b]/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col justify-center p-7 sm:p-12 lg:p-20">
            <div className="flex items-center gap-3">
              <span className="flag-stripe h-3.5 w-5 rounded-[3px]" aria-hidden />
              <p className="kicker text-[#a3162b]">{t("sab.kicker")}</p>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-logo)] text-[15vw] font-bold leading-[0.9] sm:text-7xl lg:text-[5.6vw] 2xl:text-8xl">
              {t("sab.title1")}
              <span className="block text-[#a3162b]">{t("sab.title2")}</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[#1c1a17]/75">{t("sab.intro")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#frases" className="btn bg-[#a3162b] px-7 py-4 text-[15px] text-white transition-transform hover:-translate-y-px">
                {t("sab.cta")} <IconArrow className="h-4 w-4" />
              </a>
              <Link href="/disena?style=sab-al-mal-tiempo" className="btn border border-[#1c1a17]/25 px-7 py-4 text-[15px] text-[#1c1a17] hover:bg-[#1c1a17] hover:text-[#f3ead7]">
                {t("sab.ctaDesign")}
              </Link>
            </div>
            <p className="mt-8 text-sm font-semibold text-[#1c1a17]/55">
              {SAYINGS.length} {en ? "sayings" : "frases"} · {t("sab.designs", { n: total })} · {en ? "9 lettering styles" : "9 estilos de letra"}
            </p>
          </div>
          <div className="relative flex min-h-[420px] items-center justify-center p-4 sm:p-8 lg:min-h-[640px]" aria-hidden>
            <div className="relative grid w-full max-w-[720px] grid-cols-3 items-center">
              {hero.map((d, i) => (
                <Reveal key={d.slug} delay={0.08 * i} className={i === 1 ? "relative z-10" : ""}>
                  <div className={i === 1 ? "scale-110" : i === 0 ? "translate-x-6 -rotate-6" : "-translate-x-6 rotate-6"}>
                    <DesignArt layers={d.layers} tone={d.tone} kind="tee" className="transition-transform duration-500 hover:-translate-y-2" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── category chips ───────── */}
      <nav id="frases" className="scroll-mt-28 border-b border-line bg-bg">
        <Container className="no-scrollbar flex gap-2 overflow-x-auto py-3">
          {SAB_CATS.map((c) => (
            <a key={c.key} href={`#${c.key}`} className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:border-fg/40">
              {en ? c.en : c.es}
            </a>
          ))}
        </Container>
      </nav>

      {/* ───────── nine looks ───────── */}
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <SectionHead eyebrow={en ? "Lettering" : "Tipografía"} title={t("sab.stylesTitle")} sub={t("sab.stylesSub")} />
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-9">
            {STYLE_SHOWCASE.map(([style, slug], i) => {
              const d = designBySlug(slug);
              if (!d) return null;
              return (
                <Reveal key={style} delay={(i % 9) * 0.03} className="w-[42vw] shrink-0 snap-start sm:w-auto">
                  <Link href={`/disena?style=${slug}`} className="group block">
                    <DesignArt layers={d.layers} tone={d.tone} kind="flat" className="rounded-2xl border border-line transition-transform duration-500 group-hover:-translate-y-1" />
                    <p className="mt-2 text-center text-sm font-semibold">{STYLE_NAMES[style][en ? 1 : 0]}</p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ───────── sections per category ───────── */}
      {SAB_CATS.map((c, ci) => {
        const items = SAYINGS.filter((s) => s.cat === c.key);
        return (
          <section key={c.key} id={c.key} className={`scroll-mt-36 py-12 sm:py-16 ${ci % 2 ? "bg-surface-2" : "bg-bg"}`}>
            <Container>
              <SectionHead eyebrow={`${items.length} ${en ? "sayings" : "frases"}`} title={en ? c.en : c.es} sub={en ? c.sub[1] : c.sub[0]} />
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {items.map((s, i) => {
                  const tones = tonesOf(s);
                  const slug = sabSlug(s, tones[0]);
                  const d = designBySlug(slug);
                  if (!d) return null;
                  const prods = tones.flatMap((tn) => byDesign.get(sabSlug(s, tn)) ?? []);
                  const lead = [...prods].sort((a, b) => rankType(a) - rankType(b))[0];
                  const price = prods.length ? Math.min(...prods.map((p) => p.price)) : null;
                  const night = tones.includes("dark") ? designBySlug(sabSlug(s, "dark")) : null;
                  return (
                    <Reveal key={s.key} delay={(i % 4) * 0.05}>
                      <div className="group flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-line bg-surface">
                        <Link href={lead ? `/products/${lead.slug}` : `/disena?style=${slug}`} className="relative block overflow-hidden">
                          {lead?.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={lead.images[0].url} alt={s.text} loading="lazy" className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
                          ) : (
                            <DesignArt layers={d.layers} tone={d.tone} kind="flat" className="transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />
                          )}
                          {night && (
                            <span className="absolute bottom-3 right-3 w-[26%] overflow-hidden rounded-lg border border-white/20 shadow-lg" title={t("sab.night")}>
                              <DesignArt layers={night.layers} tone="dark" kind="flat" />
                            </span>
                          )}
                        </Link>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="font-serif text-[15px] font-semibold leading-snug sm:text-base">«{s.text}»</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted sm:text-sm">{s.line}</p>
                          <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs font-semibold">
                            {prods.length > 0 ? (
                              <Link href={`/shop?q=${encodeURIComponent(s.text)}`} className="rounded-full border border-line px-3 py-1.5 hover:border-fg/40">
                                {t("sab.products", { n: prods.length })}
                                {price != null && ` · ${from} ${price.toFixed(2).replace(".", ",")} €`}
                              </Link>
                            ) : (
                              <span className="rounded-full bg-surface-2 px-3 py-1.5 text-muted">{t("sab.inProduction")}</span>
                            )}
                            <Link href={`/disena?style=${slug}`} className="rounded-full border border-line px-3 py-1.5 hover:border-fg/40">
                              {t("sab.customise")}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </Container>
          </section>
        );
      })}
    </>
  );
}

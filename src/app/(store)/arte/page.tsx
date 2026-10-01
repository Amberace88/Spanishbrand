import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listSiteImages } from "@/lib/site-images";
import { getLocale, getT } from "@/lib/i18n/server";
import { getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { ART_SERIES, siteArtSrc } from "@/lib/catalog/art-series";
import { Container, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Arte de autor — ilustraciones de España a gran tamaño",
  description: "Toro bravo, flamenca, Quijote, Alhambra, faro, paella, castellers… Ilustraciones de autor impresas a gran tamaño en camisetas, sudaderas, láminas y lienzos. Fabricado bajo pedido en Europa.",
  alternates: { canonical: "/arte" },
  openGraph: { images: ["/catalog/art/art-toro.png"] },
};

/* Series of 3–6 pieces each: every piece is a different illustration, printed big. */
const SERIES: { key: string; es: string; en: string; sub: [string, string]; pieces: string[] }[] = [
  { key: "espana", es: "España eterna", en: "Timeless Spain", sub: ["Los símbolos de siempre, grabados como en un museo.", "The timeless symbols, engraved like museum pieces."], pieces: ["toro", "flamenca", "guitarra", "quijote", "alhambra", "galeon"] },
  { key: "mar", es: "Mediterráneo", en: "Mediterranean", sub: ["Cal, sal y olivo: la costa y el campo del sur.", "Whitewash, salt and olive: the southern coast and countryside."], pieces: ["pueblo-blanco", "barca", "faro", "chiringuito", "olivo"] },
  { key: "mesa", es: "La mesa", en: "At the table", sub: ["Lo que se comparte: vino, jamón, paella, churros y vermut.", "What we share: wine, ham, paella, churros and vermouth."], pieces: ["vino", "jamon", "paella", "churros", "vermut"] },
  { key: "fiesta", es: "Fiesta y camino", en: "Fiesta and pilgrimage", sub: ["Fallas, castellers, feria, San Fermín y el Camino.", "Fallas, human towers, the fair, San Fermín and the Way."], pieces: ["fallas", "castellers", "feria", "sanfermin", "peregrino"] },
  { key: "deporte", es: "Deporte y motor", en: "Sport and motor", sub: ["Estadio, parada, remate, puerto, rally y carretera.", "Stadium, save, smash, mountain pass, rally and the open road."], pieces: ["estadio", "portero", "padel", "ciclista", "rally", "moto"] },
];

const TYPE_ORDER = ["tee", "hoodie", "sweat", "poster", "canvas", "framed", "tote", "mug"];
const rankType = (p: PublicProduct) => {
  const i = TYPE_ORDER.findIndex((t) => p.productType.toLowerCase().includes(t));
  return i < 0 ? 99 : i;
};

export default async function ArtePage() {
  const [locale, t, all, site] = await Promise.all([getLocale(), getT(), getPublishedProducts({ limit: 1500 }), listSiteImages()]);
  const looks = ([["look-flamenca-mujer", "La Flamenca", "art-flamenca"], ["look-toro-hombre", "Toro Bravo", "art-toro"], ["look-quijote-hombre", "Quijote y Sancho", "art-quijote"], ["look-faro-pareja", "El Faro", "art-faro"], ["look-barca-nino", "La Barca", "art-barca"]] as const).filter(([k]) => site[k]);
  const en = locale === "en";
  const from = t("common.from");
  const byDesign = new Map<string, PublicProduct[]>();
  for (const p of all) if (p.design?.startsWith("arte-")) byDesign.set(p.design, [...(byDesign.get(p.design) ?? []), p]);
  const piece = (key: string) => ART_SERIES.find((x) => x.key === key)!;

  return (
    <>
      <section className="bg-bg px-3 pt-3 sm:px-5">
        <div className="relative mx-auto grid max-w-[1600px] overflow-hidden rounded-[28px] bg-[#f3ead7] text-[#1c1a17] lg:grid-cols-2">
          <div className="relative flex flex-col justify-center p-7 sm:p-12 lg:p-20">
            <div className="flex items-center gap-3">
              <span className="flag-stripe h-3.5 w-5 rounded-[3px]" aria-hidden />
              <p className="kicker text-[#a3162b]">{en ? "Author illustration" : "Ilustración de autor"}</p>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-logo)] text-[12vw] font-bold leading-[0.95] sm:text-6xl lg:text-[4.4vw] 2xl:text-7xl">
              {en ? "WEARABLE" : "ARTE QUE"}
              <span className="block text-[#a3162b]">{en ? "ART" : "SE LLEVA"}</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[#1c1a17]/75">
              {en
                ? "Engraved, painterly illustrations of Spain printed as large as the garment allows — on their own, or with a saying worth remembering. Made to order in Europe."
                : "Ilustraciones grabadas y pintadas de España, impresas tan grandes como permite la prenda: solas, o con un refrán que merece recordarse. Fabricado bajo pedido en Europa."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#series" className="btn bg-[#a3162b] px-7 py-4 text-[15px] text-white">
                {en ? "See the series" : "Ver las series"} <IconArrow className="h-4 w-4" />
              </a>
              <Link href="/disena?style=arte-toro" className="btn border border-[#1c1a17]/25 px-7 py-4 text-[15px] text-[#1c1a17] hover:bg-[#1c1a17] hover:text-[#f3ead7]">
                {en ? "Make it yours" : "Hazlo tuyo"}
              </Link>
            </div>
          </div>
          <div className="relative grid min-h-[420px] grid-cols-3 gap-2 p-4 sm:p-8 lg:min-h-[640px]" aria-hidden>
            {["toro", "flamenca", "quijote", "alhambra", "faro", "fallas", "paella", "galeon", "castellers"].map((k, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={siteArtSrc(`art-${k}`)} alt="" loading="eager" fetchPriority={i < 3 ? "high" : "auto"} className="aspect-square h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.18)]" />
            ))}
          </div>
        </div>
      </section>

      {looks.length > 0 && (
        <section className="bg-bg pt-12 sm:pt-16">
          <Container>
            <SectionHead eyebrow={en ? "On the street" : "En la calle"} title={en ? "Worn in Spain" : "Llevado en España"} sub={en ? "Seville, La Mancha, Asturias, the Costa Blanca: the series where it belongs." : "Sevilla, La Mancha, Asturias, la Costa Blanca: la serie donde pertenece."} />
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
              {looks.map(([k, alt, art]) => (
                <Link key={k} href={`/disena?arte=${art}`} className="group relative block aspect-[4/5] w-[64vw] shrink-0 snap-start overflow-hidden rounded-2xl sm:w-auto">
                  <Image src={site[k]} alt={alt} fill sizes="(min-width:1024px) 19vw, 64vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-12 text-sm font-semibold text-white">{alt}</span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      <div id="series" className="scroll-mt-28">
        {SERIES.map((s) => (
          <section key={s.key} className="bg-bg py-12 sm:py-16">
            <Container>
              <SectionHead eyebrow={`${s.pieces.length} ${en ? "illustrations" : "ilustraciones"}`} title={en ? s.en : s.es} sub={en ? s.sub[1] : s.sub[0]} />
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                {s.pieces.map((k, i) => {
                  const pc = piece(k);
                  const items = [...(byDesign.get(`arte-${k}`) ?? []), ...(byDesign.get(`arte-${k}-frase`) ?? [])];
                  const lead = [...items].sort((a, b) => rankType(a) - rankType(b))[0];
                  const price = items.length ? Math.min(...items.map((p) => p.price)) : null;
                  return (
                    <Reveal key={k} delay={(i % 3) * 0.05}>
                      <div className="group overflow-hidden rounded-[1.6rem] border border-line bg-surface">
                        <Link href={lead ? `/products/${lead.slug}` : `/disena?style=arte-${k}`} className="relative block aspect-square overflow-hidden bg-[#f3ead7]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={lead?.images[0]?.url ?? siteArtSrc(pc.art)} alt={pc.name} loading="lazy" className={`h-full w-full transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105 ${lead?.images[0] ? "object-cover" : "object-contain p-8"}`} />
                        </Link>
                        <div className="p-4 sm:p-5">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="headline text-lg leading-tight sm:text-xl">{pc.name}</p>
                            {price != null && (
                              <p className="shrink-0 text-sm text-muted">
                                {from} {price.toFixed(2).replace(".", ",")} €
                              </p>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{pc.line}</p>
                          <p className="mt-2 font-serif text-xs uppercase tracking-wider text-[#a3162b]">«{pc.saying.join(" ")}»</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            {items.length > 0 ? (
                              <Link href={`/shop?q=${encodeURIComponent(pc.name)}`} className="rounded-full border border-line px-3 py-1.5 hover:border-fg/40">
                                {items.length} {en ? "products" : "productos"}
                              </Link>
                            ) : (
                              <span className="rounded-full bg-surface-2 px-3 py-1.5 text-muted">{en ? "In production" : "En producción"}</span>
                            )}
                            <Link href={`/disena?arte=${pc.art}`} className="rounded-full border border-line px-3 py-1.5 hover:border-fg/40">
                              {en ? "Customise" : "Personalizar"}
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
        ))}
      </div>
    </>
  );
}

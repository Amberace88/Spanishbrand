import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { getDesignerProducts } from "@/lib/products/queries";
import { Designer, type DesignerArt, type DesignerProduct, type DesignerStyle } from "@/components/designer/Designer";
import { ART_SERIES, siteArtSrc } from "@/lib/catalog/art-series";
import { artAspect } from "@/lib/catalog/designs-art";
import { ACTIVE_DESIGNS } from "@/lib/catalog/designs";
import { isRetiredDesign, replacementFor, seriesOf } from "@/lib/catalog/retired";
import { KINDS, kindFromProduct } from "@/lib/personalization/kinds";
import { Container, PageHero } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Diseña tu camiseta, taza, póster o gorra",
  description: "Crea tu propio diseño en camisetas, sudaderas, ropa infantil, tazas, cojines, pósters, fundas, gorras bordadas y más: textos con tipografías de la casa, plantillas, nuestro arte o tu imagen. Lo fabricamos para ti.",
  alternates: { canonical: "/disena" },
};
export const revalidate = 120;

type SP = { p?: string; style?: string; arte?: string; texto?: string; tinta?: string; font?: string; tpl?: string };

/** Catalogue order inside the picker (by kind), then cheapest first. */
const ORDER = Object.keys(KINDS);

/** "Estilos de la casa": only active, full designs, strongest series first (embroidery and calendars have their own flows). */
const STYLE_SERIES = ["lookbook", "leon", "arte", "oficios-arte", "sabiduria", "futbol-pro", "refranero", "familia", "ciudades-cartel", "oficios-cartel", "base"];
const HOUSE_STYLES: DesignerStyle[] = ACTIVE_DESIGNS.filter((d) => STYLE_SERIES.includes(seriesOf(d)) && !d.products.every((p) => p === "jersey"))
  .map((d, i) => ({ d, i, rank: STYLE_SERIES.indexOf(seriesOf(d)) }))
  .sort((a, b) => a.rank - b.rank || a.i - b.i)
  .map(({ d }) => ({ slug: d.slug, name: d.name, collection: d.collection, tone: d.tone, layers: d.layers }));

export default async function DesignPage({ searchParams }: { searchParams: Promise<SP> }) {
  const [t, products, sp] = await Promise.all([getT(), getDesignerProducts(), searchParams]);
  const styles = HOUSE_STYLES;
  // old "Diseña en este estilo" links to a retired look open its replacement
  const style = sp.style && isRetiredDesign(sp.style) ? (replacementFor(sp.style) ?? undefined) : sp.style;
  const arts: DesignerArt[] = [
    { name: "lion-crowned", label: "León Coronado", aspect: artAspect("lion-crowned"), src: "/catalog/art/lion-crowned.png" },
    ...ART_SERIES.map((p) => ({ name: p.art, label: p.name, aspect: artAspect(p.art), src: siteArtSrc(p.art) })),
  ];
  const list: DesignerProduct[] = products
    .map((p): DesignerProduct | null => {
      const perso = p.personalization;
      if (!perso || perso.mode !== "designer") return null;
      const kind = kindFromProduct({ kind: perso.kind ?? null, tags: p.tags, productType: p.productType });
      if (!kind) return null;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        kind,
        price: p.price,
        extra: Number(perso.extraPrice ?? 0),
        backPrice: Number(perso.backPrice ?? 0),
        currency: p.currency,
        placements: perso.placements,
        image: p.images.find((i) => i.kind !== "PRINT_FILE")?.url ?? null,
        embroidery: Boolean(perso.embroidery) || KINDS[kind].layout === "emb",
        variants: p.variants,
      };
    })
    .filter((x): x is DesignerProduct => x !== null)
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.price - b.price);

  const clip = (s: string | undefined, n: number) => (s ? s.trim().slice(0, n) || null : null);
  return (
    <>
      <PageHero eyebrow={t("designer.kicker")} title={t("hero3.design")} sub={t("designer.sub2")} />
      <section className="bg-bg py-8 sm:py-12">
        <Container>
          <Designer
            products={list}
            styles={styles}
            arts={arts}
            initial={{ product: clip(sp.p, 120), style: clip(style, 80), art: clip(sp.arte, 80), text: clip(sp.texto, 40), ink: clip(sp.tinta, 7), font: clip(sp.font, 12), tpl: clip(sp.tpl, 20) }}
          />
        </Container>
      </section>
    </>
  );
}

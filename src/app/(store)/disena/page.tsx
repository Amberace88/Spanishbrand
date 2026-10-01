import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { getDesignerProducts } from "@/lib/products/queries";
import { Designer, type DesignKind, type DesignerProduct, type DesignerStyle } from "@/components/designer/Designer";
import { DESIGNS } from "@/lib/catalog/designs";
import { Container, PageHero } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Diseña tu camiseta",
  description: "Crea tu propia camiseta, sudadera, bolsa o póster: añade texto, sube tu imagen y nosotros lo fabricamos para ti.",
  alternates: { canonical: "/disena" },
};
export const revalidate = 120;

function kindOf(productType: string): DesignKind | null {
  const t = productType.toUpperCase();
  if (/HOOD|SWEAT/.test(t)) return "hoodie";
  if (/TOTE|BAG/.test(t)) return "tote";
  if (/POSTER|PRINT|CANVAS/.test(t)) return "poster";
  if (/SHIRT|TEE/.test(t)) return "tee";
  return null;
}

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ style?: string }> }) {
  const [t, products, sp] = await Promise.all([getT(), getDesignerProducts(), searchParams]);
  const styles: DesignerStyle[] = DESIGNS.map((d) => ({ slug: d.slug, name: d.name, collection: d.collection, tone: d.tone, layers: d.layers }));
  const initialStyle = sp.style && styles.some((s) => s.slug === sp.style) ? sp.style : null;
  const list: DesignerProduct[] = products
    .map((p) => {
      const kind = kindOf(p.productType);
      if (!kind || p.personalization?.mode !== "designer") return null;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        kind,
        price: p.price,
        extra: Number(p.personalization.extraPrice ?? 0),
        currency: p.currency,
        placements: p.personalization.placements,
        variants: p.variants,
      } satisfies DesignerProduct;
    })
    .filter(Boolean) as DesignerProduct[];

  return (
    <>
      <PageHero eyebrow={t("designer.kicker")} title={t("hero3.design")} sub={t("designer.sub")} />
      <section className="bg-bg py-10 sm:py-14">
        <Container>
          <Designer products={list} styles={styles} initialStyle={initialStyle} />
        </Container>
      </section>
    </>
  );
}

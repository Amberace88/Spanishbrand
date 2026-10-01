import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getTemplateProducts } from "@/lib/products/queries";
import { Studio, type TemplateProduct } from "@/components/personalize/Studio";
import { Container, PageHero } from "@/components/ui/Section";
import { TEMPLATES, type TemplateKey } from "@/lib/personalization/types";
import { IconArrow } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Camisetas personalizadas",
  description: "Personaliza tu camiseta con tu nombre y dorsal, el nombre de tu pueblo o tu año. Vista previa al instante y fabricación bajo pedido.",
  alternates: { canonical: "/personaliza" },
};
export const revalidate = 120;

export default async function PersonalizePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const [{ t: tp }, t, products] = await Promise.all([searchParams, getT(), getTemplateProducts()]);
  const list: TemplateProduct[] = products
    .filter((p) => p.personalization?.mode === "fields")
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, price: p.price, currency: p.currency, config: p.personalization as TemplateProduct["config"], variants: p.variants }));
  const initial = (TEMPLATES as readonly string[]).includes(tp ?? "") ? (tp as TemplateKey) : "jersey";
  return (
    <>
      <PageHero eyebrow={t("perso.kicker")} title={t("perso.title")} sub={t("perso.pageSub")}>
        <Link href="/disena" className="btn btn-ghost mt-6">
          {t("hero3.design")} <IconArrow className="h-4 w-4" />
        </Link>
      </PageHero>
      <section className="bg-bg py-10 sm:py-14">
        <Container>
          <Studio products={list} initial={initial} />
        </Container>
      </section>
    </>
  );
}

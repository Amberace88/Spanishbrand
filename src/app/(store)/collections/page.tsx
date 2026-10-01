import type { Metadata } from "next";
import Link from "next/link";
import { getCollectionCounts, getCollections } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { Mockup, type MockupKind } from "@/components/art/Mockup";
import { IconArrow } from "@/components/ui/Icons";

import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Colecciones", alternates: { canonical: "/collections" } };
export const revalidate = 300;

const KIND: Record<string, MockupKind> = { espana: "tee", heritage: "hoodie", mediterraneo: "tote", motor: "tee", "1492": "poster", madrid: "mug", valencia: "tote", alicante: "cap", cities: "poster", founders: "hoodie" };
const BG = ["bg-rojo-50", "bg-oro-50", "bg-azul-50", "bg-cream", "bg-terra-50", "bg-oliva-50"];

export default async function CollectionsPage() {
  const [t, collections, counts] = await Promise.all([getT(), getCollections(), getCollectionCounts()]);
  return (
    <>
      <PageHero eyebrow={`${collections.length} · ${t("nav.collections")}`} title={t("collections.title")} sub={t("home.collections.sub")} />
      <section className="bg-warm py-12 sm:py-16">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {collections.map((c, i) => (
              <Reveal key={c.slug} delay={(i % 3) * 0.05}>
                <Link href={`/collections/${c.slug}`} className="group block overflow-hidden rounded-[1.75rem] border border-ink/[0.06] bg-white transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(28,23,18,0.35)]">
                  <div className={`relative p-8 ${BG[i % BG.length]}`}>
                    <div className="mx-auto w-3/4 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105">
                      <Mockup kind={KIND[c.slug] ?? "tee"} color={c.slug === "heritage" ? "#efe4cf" : "#fffcf7"} slug={c.slug} />
                    </div>
                    <span className="absolute left-4 top-4 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-rojo shadow-sm">{counts[c.slug] ? t("collections.pieces", { n: counts[c.slug] }) : t("collections.soon")}</span>
                  </div>
                  <div className="flex items-end justify-between gap-4 p-6">
                    <div>
                      <h2 className="headline text-3xl">{c.name}</h2>
                      <p className="mt-1 text-stone-2">{c.tagline}</p>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream transition-colors group-hover:bg-rojo group-hover:text-white">
                      <IconArrow className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

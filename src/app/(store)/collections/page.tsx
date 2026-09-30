import type { Metadata } from "next";
import Link from "next/link";
import { getCollectionCounts, getCollections } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { CollectionArt } from "@/components/art/CollectionArt";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Colecciones", alternates: { canonical: "/collections" } };
export const revalidate = 300;

export default async function CollectionsPage() {
  const [t, collections, counts] = await Promise.all([getT(), getCollections(), getCollectionCounts()]);
  return (
    <>
      <PageHero dark eyebrow={`${collections.length} · ${t("nav.collections")}`} title={t("collections.title")} sub={t("home.collections.sub")} />
      <section className="bg-ink pb-24 text-bone">
        <Container>
          <div className="divide-y divide-bone/10 border-y border-bone/10">
            {collections.map((c, i) => (
              <Reveal key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="group grid items-center gap-6 py-8 sm:grid-cols-[80px_1fr_220px] sm:py-10">
                  <span className="eyebrow text-bone/40">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 className="display text-6xl transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-3 sm:text-8xl lg:text-9xl">{c.name}</h2>
                    <p className="serif mt-2 text-xl italic text-bone/70">{c.tagline}</p>
                    <p className="eyebrow mt-3 text-oro-2">{counts[c.slug] ? t("collections.pieces", { n: counts[c.slug] }) : t("collections.soon")}</p>
                  </div>
                  <div className="relative hidden aspect-[4/5] overflow-hidden sm:block">
                    <CollectionArt slug={c.slug} className="absolute inset-0 transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-110" />
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

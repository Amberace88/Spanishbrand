import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FALLBACK_COLLECTIONS, getCollections, getPublishedProducts } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { designsFor } from "@/lib/catalog/designs";
import { DesignArt } from "@/components/catalog/DesignArt";
import { IconArrow } from "@/components/ui/Icons";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Colecciones", description: "España, Heritage, Mediterráneo, Motor, fútbol, pádel, fiestas, playa, tapas y Camino: colecciones con diseños originales de identidad española.", alternates: { canonical: "/collections" } };
export const revalidate = 300;

export default async function CollectionsPage() {
  const [t, dbCollections, products] = await Promise.all([getT(), getCollections(), getPublishedProducts({ limit: 5000 })]);
  // DB collections first, then the theme hubs that always exist editorially.
  // Only collections with something to buy (retired lines leave some empty); with no listing at all (DB down) the active designs decide.
  const collections = [...dbCollections, ...FALLBACK_COLLECTIONS.filter((f) => !dbCollections.some((c) => c.slug === f.slug))].filter((c) => (products.length ? products.some((p) => p.collection?.slug === c.slug) : designsFor(c.slug).length > 0));

  return (
    <>
      <PageHero eyebrow={`${collections.length} · ${t("nav.collections")}`} title={t("collections.title")} sub={t("home.collections.sub")} />
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {collections.map((c, i) => {
              const own = products.filter((p) => p.collection?.slug === c.slug);
              const cover = own.find((p) => p.featured && p.images[0])?.images[0] ?? own.find((p) => p.images[0])?.images[0];
              const designs = designsFor(c.slug);
              return (
                <Reveal key={c.slug} delay={(i % 3) * 0.05}>
                  <Link href={`/collections/${c.slug}`} className="group block overflow-hidden rounded-[1.75rem] border border-line bg-surface transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(28,23,18,0.35)]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                      {cover ? (
                        <Image src={cover.url} alt={cover.alt ?? c.name} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
                      ) : designs.length ? (
                        <div className="absolute inset-0 grid grid-cols-2 gap-2 p-5">
                          {designs.slice(0, 2).map((d) => (
                            <div key={d.slug} className="transition-transform duration-700 group-hover:scale-105">
                              <DesignArt layers={d.layers} tone={d.tone} kind="tee" />
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <span className="absolute left-4 top-4 rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-accent shadow-sm">
                        {own.length ? t("collections.pieces", { n: own.length }) : t("collections.designs", { n: designs.length })}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-4 p-6">
                      <div>
                        <h2 className="headline text-3xl">{c.name}</h2>
                        <p className="mt-1 text-muted">{c.tagline}</p>
                      </div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 transition-colors group-hover:bg-accent group-hover:text-white">
                        <IconArrow className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}

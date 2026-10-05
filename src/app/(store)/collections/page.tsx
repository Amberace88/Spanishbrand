import type { Metadata } from "next";
import { FALLBACK_COLLECTIONS, getCollections, getPublishedProducts } from "@/lib/products/queries";
import { getLocale, getT } from "@/lib/i18n/server";
import { listSiteImages } from "@/lib/site-images";
import { lookFor } from "@/lib/catalog/tones";
import { tileCards, tileCount, tilePhoto } from "@/lib/catalog/tiles";
import { EditorialTile } from "@/components/merch/EditorialTile";
import { designsFor } from "@/lib/catalog/designs";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Colecciones", description: "España, Heritage, Mediterráneo, Motor, fútbol, pádel, fiestas, playa, tapas y Camino: colecciones con diseños originales de identidad española.", alternates: { canonical: "/collections" } };
export const revalidate = 300;

/** The last tile widens to close the row, so the grid never ends on an empty slot (2 columns on tablets, 3 on desktop). */
function fill(i: number, n: number) {
  if (i !== n - 1) return "";
  const sm = n % 2 === 1 ? "sm:col-span-2 sm:aspect-[16/10]" : "";
  const lg = n % 3 === 2 ? "lg:col-span-2 lg:aspect-auto" : n % 3 === 1 ? "lg:col-span-3 lg:aspect-[21/9]" : sm ? "lg:col-span-1 lg:aspect-[4/5]" : "";
  return `${sm} ${lg}`;
}

export default async function CollectionsPage() {
  const [t, dbCollections, products, site, locale] = await Promise.all([getT(), getCollections(), getPublishedProducts({ limit: 5000 }), listSiteImages(), getLocale()]);
  const en = locale === "en";
  // DB collections first, then the theme hubs that always exist editorially.
  // Only collections with something to buy (retired lines leave some empty); with no listing at all (DB down) the active designs decide.
  const collections = [...dbCollections, ...FALLBACK_COLLECTIONS.filter((f) => !dbCollections.some((c) => c.slug === f.slug))].filter((c) => (products.length ? products.some((p) => p.collection?.slug === c.slug) : designsFor(c.slug).length > 0));

  return (
    <>
      <PageHero eyebrow={`${collections.length} · ${t("nav.collections")}`} title={t("collections.title")} sub={t("home.collections.sub")} />
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {collections.map((c, i) => {
              const own = products.filter((p) => p.collection?.slug === c.slug);
              const look = lookFor(c.slug);
              return (
                <Reveal key={c.slug} delay={(i % 3) * 0.05} className={`aspect-[4/5] ${fill(i, collections.length)}`}>
                  <EditorialTile
                    href={`/collections/${c.slug}`}
                    title={c.name}
                    kicker={own.length ? tileCount(own, en) : t("collections.designs", { n: designsFor(c.slug).length })}
                    tagline={c.tagline}
                    cta={en ? "See the collection" : "Ver colección"}
                    tone={look.tone}
                    texture={look.texture}
                    word={look.word}
                    photo={tilePhoto(look, site)}
                    cards={tileCards(own, 3)}
                    size="tall"
                  />
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}

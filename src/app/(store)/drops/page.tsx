import type { Metadata } from "next";
import Link from "next/link";
import { getDrops } from "@/lib/products/queries";
import { getT } from "@/lib/i18n/server";
import { CollectionArt } from "@/components/art/CollectionArt";
import { Countdown } from "@/components/home/Countdown";
import { Newsletter } from "@/components/home/Newsletter";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Drops", alternates: { canonical: "/drops" } };
export const revalidate = 120;

export default async function DropsPage() {
  const [t, drops] = await Promise.all([getT(), getDrops()]);
  const label = (s: string) => (s === "LIVE" ? t("drops.live") : s === "SCHEDULED" ? t("drops.scheduled") : t("drops.ended"));
  return (
    <>
      <PageHero dark eyebrow="Drops" title={t("drops.title")} sub={t("drops.sub")} />
      <section className="bg-warm py-20">
        <Container>
          {drops.length === 0 ? (
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <p className="display text-6xl sm:text-7xl">{t("drops.empty")}</p>
              <Newsletter source="drops" />
            </div>
          ) : (
            <div className="space-y-6">
              {drops.map((d) => (
                <Reveal key={d.id}>
                  <article id={d.slug} className="grid overflow-hidden border border-ink/10 bg-bone lg:grid-cols-2">
                    <div className="relative aspect-[16/10] lg:aspect-auto">
                      <CollectionArt slug={d.collection?.slug ?? "heritage"} className="absolute inset-0" />
                    </div>
                    <div className="p-8 sm:p-12">
                      <p className={`eyebrow ${d.status === "LIVE" ? "text-rojo" : "text-stone-2"}`}>
                        {d.number ? `Drop ${String(d.number).padStart(3, "0")} · ` : ""}
                        {label(d.status)}
                      </p>
                      <h2 className="display mt-4 text-6xl sm:text-7xl">{d.name}</h2>
                      {d.description && <p className="mt-5 max-w-lg text-stone-2">{d.description}</p>}
                      <div className="mt-8">
                        {d.status === "SCHEDULED" && d.startDate ? (
                          <Countdown to={d.startDate} />
                        ) : d.collection ? (
                          <Link href={`/collections/${d.collection.slug}`} className="btn btn-ink">
                            {t("collections.explore")} →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

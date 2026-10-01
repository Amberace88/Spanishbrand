import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { COMUNIDADES, isRedundantProvince, provincesOf } from "@/lib/regions";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Camisetas de tu tierra — regiones y provincias de España",
  description: "Camisetas, sudaderas y regalos de cada comunidad autónoma y provincia de España. Personaliza con el nombre de tu pueblo.",
  alternates: { canonical: "/regiones" },
};

export default async function RegionsPage() {
  const t = await getT();
  return (
    <>
      <PageHero eyebrow={t("regions.kicker")} title={t("regions.title")} sub={t("regions.sub")} />
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMUNIDADES.map((c, i) => {
              const provs = provincesOf(c.slug).filter((p) => !isRedundantProvince(p));
              return (
                <Reveal key={c.slug} delay={(i % 3) * 0.04}>
                  <div className="group h-full rounded-3xl border border-line p-6 transition-colors hover:border-fg">
                    <Link href={`/regiones/${c.slug}`} className="flex items-start justify-between gap-3">
                      <span>
                        <span className="headline block text-2xl">{c.name}</span>
                        <span className="text-[13px] text-muted">{c.capital}</span>
                      </span>
                      <IconArrow className="mt-1 h-5 w-5 -rotate-45 transition-transform group-hover:rotate-0 group-hover:text-accent" />
                    </Link>
                    {provs.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {provs.map((p) => (
                          <Link key={p.slug} href={`/regiones/${p.slug}`} className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-medium hover:bg-fg hover:text-bg">
                            {p.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}

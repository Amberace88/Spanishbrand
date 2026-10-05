import type { Metadata } from "next";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { CollectionArt } from "@/components/art/CollectionArt";
import Image from "next/image";
import Link from "next/link";
import { campaignPhoto } from "@/lib/campaign";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Journal", alternates: { canonical: "/journal" } };
export const revalidate = 300;

const UPCOMING = [
  { key: "camino", title: "Buen Camino: de Sarria a Santiago", href: "/collections/camino" },
  { key: "motor", title: "La carretera nacional y el SEAT de mi padre", href: "/collections/motor" },
  { key: "mediterraneo", title: "Sal, luz y tiempo lento en el Mediterráneo", href: "/collections/mediterraneo" },
];

export default async function JournalPage() {
  const sb = dbOrNull();
  const { data: posts } = sb
    ? await sb.from("content").select("id, title, slug, body, cover_image, published_at, collection_id, collections:collection_id(slug)").eq("brand_id", env.brandId()).eq("type", "JOURNAL").eq("status", "PUBLISHED").order("published_at", { ascending: false }).limit(30)
    : { data: [] };
  return (
    <>
      <PageHero eyebrow="Editorial" title="Journal" sub="Historias de ciudades, carreteras, mar y oficio." />
      <section className="bg-bg pb-24 pt-12">
        <Container>
          {!posts?.length ? (
            <>
              <p className="max-w-2xl text-xl leading-relaxed text-muted">Las primeras historias están en camino: el Camino de Santiago, las carreteras de siempre y el Mediterráneo. Apúntate abajo para leerlas antes que nadie.</p>
              <div className="mt-10 grid gap-3 sm:grid-cols-3 sm:gap-4">
                {UPCOMING.map((u, i) => {
                  const photo = campaignPhoto(u.key);
                  return (
                    <Reveal key={u.key} delay={i * 0.06}>
                      <Link href={u.href} className="group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[#0b0b0b]">
                        {photo && <Image src={photo} alt="" fill sizes="(min-width:640px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">Próximamente</span>
                          <p className="headline mt-3 text-2xl leading-tight">{u.title}</p>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 0.06}>
                  <article id={p.slug ?? p.id}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.cover_image ? <img src={p.cover_image} alt="" className="h-full w-full object-cover" /> : <CollectionArt slug={(p.collections as unknown as { slug: string } | null)?.slug ?? "heritage"} className="absolute inset-0" />}
                    </div>
                    <p className="eyebrow mt-5 text-muted">{formatDate(p.published_at)}</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight">{p.title}</h2>
                    {p.body && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{p.body}</p>}
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

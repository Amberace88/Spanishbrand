import type { Metadata } from "next";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { CollectionArt } from "@/components/art/CollectionArt";
import { Newsletter } from "@/components/home/Newsletter";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Journal", alternates: { canonical: "/journal" } };
export const revalidate = 300;

export default async function JournalPage() {
  const sb = dbOrNull();
  const { data: posts } = sb
    ? await sb.from("content").select("id, title, slug, body, cover_image, published_at, collection_id, collections:collection_id(slug)").eq("brand_id", env.brandId()).eq("type", "JOURNAL").eq("status", "PUBLISHED").order("published_at", { ascending: false }).limit(30)
    : { data: [] };
  return (
    <>
      <PageHero eyebrow="Editorial" title="Journal" sub="Historias de ciudades, carreteras, mar y oficio." />
      <section className="bg-warm pb-24 pt-12">
        <Container>
          {!posts?.length ? (
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <p className="serif text-3xl leading-snug text-ink/80">Las primeras historias están en camino. Suscríbete para leerlas antes que nadie.</p>
              <Newsletter source="journal" />
            </div>
          ) : (
            <div className="grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 0.06}>
                  <article id={p.slug ?? p.id}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.cover_image ? <img src={p.cover_image} alt="" className="h-full w-full object-cover" /> : <CollectionArt slug={(p.collections as unknown as { slug: string } | null)?.slug ?? "heritage"} className="absolute inset-0" />}
                    </div>
                    <p className="eyebrow mt-5 text-stone">{formatDate(p.published_at)}</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight">{p.title}</h2>
                    {p.body && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-2">{p.body}</p>}
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

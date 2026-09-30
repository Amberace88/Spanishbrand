import type { Metadata } from "next";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { PollCard } from "@/components/community/PollCard";
import { Newsletter } from "@/components/home/Newsletter";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Comunidad", alternates: { canonical: "/community" } };
export const revalidate = 60;

export default async function CommunityPage() {
  const t = await getT();
  const sb = dbOrNull();
  const { data: posts } = sb
    ? await sb.from("community_posts").select("id, type, title, body, options, status, result").eq("brand_id", env.brandId()).in("status", ["OPEN", "CLOSED", "PUBLISHED"]).order("created_at", { ascending: false }).limit(20)
    : { data: [] };
  const open = (posts ?? []).filter((p) => p.status === "OPEN" && ["POLL", "DESIGN_VOTE", "COLLECTION_VOTE"].includes(p.type));
  const highlights = (posts ?? []).filter((p) => p.type === "HIGHLIGHT" || p.status === "CLOSED");

  return (
    <>
      <PageHero dark eyebrow={t("home.community.eyebrow")} title={t("community.title")} sub={t("community.sub")} />
      <section className="bg-warm py-20">
        <Container>
          {open.length === 0 ? (
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <p className="serif text-3xl leading-snug text-ink/80">{t("community.empty")}</p>
              <Newsletter source="community" />
            </div>
          ) : (
            <div className="space-y-16">
              {open.map((p) => (
                <Reveal key={p.id} className="border-t border-ink/10 pt-10">
                  <PollCard post={{ id: p.id, title: p.title, body: p.body, options: (p.options ?? []) as { key: string; label: string }[] }} />
                </Reveal>
              ))}
            </div>
          )}
          {highlights.length > 0 && (
            <div className="mt-24">
              <p className="eyebrow text-rojo">{t("community.results")}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {highlights.map((h) => (
                  <div key={h.id} className="border border-ink/10 bg-bone p-6">
                    <h3 className="display text-3xl">{h.title}</h3>
                    {h.body && <p className="mt-2 text-sm text-stone-2">{h.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

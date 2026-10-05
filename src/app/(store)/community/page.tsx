import { IconArrow } from "@/components/ui/Icons";
import { campaignPhoto } from "@/lib/campaign";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { PollCard } from "@/components/community/PollCard";
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
      <section className="bg-bg py-20">
        <Container>
          {open.length === 0 ? (
<Link href="/club" className="group relative grid overflow-hidden rounded-[2rem] bg-[#0b0b0b] text-white sm:grid-cols-[1.1fr_1fr]">
              <div className="relative order-2 p-8 sm:order-1 sm:p-12">
                <p className="headline text-3xl leading-tight sm:text-4xl">{t("community.empty")}</p>
                <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/70">Los socios del club votan los próximos diseños y colecciones. Únete gratis y te avisamos cuando se abra la próxima votación.</p>
                <span className="btn btn-light press mt-8">Únete al club <IconArrow className="h-4 w-4" /></span>
              </div>
              <div className="relative order-1 aspect-[16/10] sm:order-2 sm:aspect-auto sm:min-h-[340px]">
                {campaignPhoto("ciudades") && <Image src={campaignPhoto("ciudades")!} alt="" fill sizes="(min-width:640px) 45vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0b] via-transparent to-transparent max-sm:bg-gradient-to-t" />
              </div>
            </Link>
          ) : (
            <div className="space-y-16">
              {open.map((p) => (
                <Reveal key={p.id} className="border-t border-line pt-10">
                  <PollCard post={{ id: p.id, title: p.title, body: p.body, options: (p.options ?? []) as { key: string; label: string }[] }} />
                </Reveal>
              ))}
            </div>
          )}
          {highlights.length > 0 && (
            <div className="mt-24">
              <p className="eyebrow text-accent">{t("community.results")}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {highlights.map((h) => (
                  <div key={h.id} className="border border-line bg-surface-2 p-6">
                    <h3 className="headline text-2xl">{h.title}</h3>
                    {h.body && <p className="mt-2 text-sm text-muted">{h.body}</p>}
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

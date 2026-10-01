import "server-only";
import { cache } from "react";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getBrand } from "@/lib/brand";

export const CAUSES = ["VETERANOS", "MAYORES", "INFANCIA", "ANIMALES"] as const;
export type Cause = (typeof CAUSES)[number];

export interface CausePartnerPublic {
  id: string;
  cause: Cause;
  name: string;
  legalForm: string | null;
  registryNumber: string | null;
  website: string | null;
  donateUrl: string | null;
  logo: string | null;
}

/** Public, aggregated data only: signed partners, published reports and month-to-date totals. */
export const getCausesData = cache(async () => {
  const brand = await getBrand();
  const perItem = Number((brand.settings as { donation_per_item?: number }).donation_per_item ?? 1);
  const sb = dbOrNull();
  const empty = { perItem, partners: [] as CausePartnerPublic[], reports: [] as { period: string; cause: Cause; amount: number; certificateUrl: string | null; partner: string | null }[], month: {} as Record<string, number>, totalPublished: 0 };
  if (!sb) return empty;
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const [{ data: partners }, { data: reports }, { data: totals }] = await Promise.all([
    sb.from("cause_partners").select("id, cause, name, legal_form, registry_number, website, donate_url, logo").eq("brand_id", env.brandId()).eq("active", true).eq("agreement_signed", true),
    sb.from("cause_reports").select("period, cause, amount, certificate_url, cause_partners(name)").eq("brand_id", env.brandId()).eq("published", true).order("period", { ascending: false }).limit(48),
    sb.rpc("cause_totals", { p_brand: env.brandId(), p_from: from.toISOString(), p_to: to.toISOString() }),
  ]);
  const month: Record<string, number> = {};
  for (const r of (totals ?? []) as { cause: string; items: number }[]) month[r.cause] = Math.round(Number(r.items) * perItem * 100) / 100;
  const rep = (reports ?? []).map((r) => ({ period: r.period as string, cause: r.cause as Cause, amount: Number(r.amount), certificateUrl: (r.certificate_url as string) ?? null, partner: ((r.cause_partners as unknown as { name: string } | null)?.name ?? null) as string | null }));
  return {
    perItem,
    partners: (partners ?? []).map((p) => ({ id: p.id, cause: p.cause as Cause, name: p.name, legalForm: p.legal_form, registryNumber: p.registry_number, website: p.website, donateUrl: p.donate_url, logo: p.logo })),
    reports: rep,
    month,
    totalPublished: rep.reduce((s, r) => s + r.amount, 0),
  };
});

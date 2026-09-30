import { NextResponse } from "next/server";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics/track";

export const runtime = "nodejs";

/** Creator tracking links: /r/<slug> → 30-day attribution cookie → target page. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sb = dbOrNull();
  const site = env.siteUrl();
  if (!sb) return NextResponse.redirect(new URL("/", site));
  const { data: link } = await sb.from("creator_links").select("id, creator_id, target_path, campaign_id, clicks, creators(status)").eq("slug", slug).maybeSingle();
  const active = (link?.creators as unknown as { status: string } | null)?.status === "ACTIVE";
  if (!link || !active) return NextResponse.redirect(new URL("/", site));
  await sb.from("creator_links").update({ clicks: link.clicks + 1 }).eq("id", link.id);
  await sb.rpc("increment_creator_clicks", { p_creator_id: link.creator_id });
  await track({ event: "creator_click", creatorId: link.creator_id, campaignId: link.campaign_id, path: `/r/${slug}` });
  const target = link.target_path.startsWith("/") ? link.target_path : "/";
  const res = NextResponse.redirect(new URL(target, site));
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };
  res.cookies.set("ref_creator", link.creator_id, opts);
  if (link.campaign_id) res.cookies.set("ref_campaign", link.campaign_id, opts);
  return res;
}

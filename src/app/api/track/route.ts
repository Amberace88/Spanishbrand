import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics/track";

export const runtime = "nodejs";

const CLIENT_EVENTS = ["page_view", "product_view", "collection_view", "search", "content_view", "content_click", "campaign_click"] as const;
const schema = z.object({
  event: z.enum(ANALYTICS_EVENTS).refine((e) => (CLIENT_EVENTS as readonly string[]).includes(e), "not a client event"),
  productId: z.string().uuid().optional(),
  collectionId: z.string().uuid().optional(),
  contentId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  utm: z.record(z.string(), z.string().max(100)).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

/** First-party analytics collection (only after analytics consent — enforced client-side). */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const c = await cookies();
  if (c.get("consent")?.value !== "all") return NextResponse.json({ ok: true, skipped: "no consent" });
  const creatorId = c.get("ref_creator")?.value ?? null;
  await track({ ...parsed.data, sessionId: c.get("sid")?.value ?? null, creatorId });
  return NextResponse.json({ ok: true });
}

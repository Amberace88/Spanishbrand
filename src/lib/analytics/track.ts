import "server-only";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export const ANALYTICS_EVENTS = [
  "page_view",
  "product_view",
  "collection_view",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "checkout_started",
  "payment_started",
  "purchase",
  "refund",
  "email_open",
  "email_click",
  "content_view",
  "content_click",
  "creator_click",
  "campaign_click",
  "vote",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export interface TrackInput {
  event: AnalyticsEvent;
  userId?: string | null;
  sessionId?: string | null;
  productId?: string | null;
  collectionId?: string | null;
  campaignId?: string | null;
  creatorId?: string | null;
  contentId?: string | null;
  orderId?: string | null;
  value?: number | null;
  path?: string | null;
  referrer?: string | null;
  utm?: Record<string, string> | null;
  metadata?: Record<string, unknown>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidOrNull = (v?: string | null) => (v && UUID.test(v) ? v : null);

/** Internal event store (real events only). */
export async function track(e: TrackInput) {
  const sb = dbOrNull();
  if (!sb) return;
  const { error } = await sb.from("analytics_events").insert({
    brand_id: env.brandId(),
    event: e.event,
    user_id: uuidOrNull(e.userId),
    session_id: e.sessionId?.slice(0, 64) ?? null,
    product_id: uuidOrNull(e.productId),
    collection_id: uuidOrNull(e.collectionId),
    campaign_id: uuidOrNull(e.campaignId),
    creator_id: uuidOrNull(e.creatorId),
    content_id: uuidOrNull(e.contentId),
    order_id: uuidOrNull(e.orderId),
    value: e.value ?? null,
    path: e.path?.slice(0, 500) ?? null,
    referrer: e.referrer?.slice(0, 500) ?? null,
    utm: e.utm ?? null,
    metadata: e.metadata ?? {},
  });
  if (error) log.warn("ADMIN", "analytics insert failed", { error: error.message, event: e.event });
}

import "server-only";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

/**
 * EVENT-DRIVEN AUTOMATION ENGINE.
 * Every event is persisted (automation_events) then its handlers run.
 * Handlers are isolated: one failing handler never blocks the others.
 */
export type AutomationEventType =
  | "CUSTOMER_CREATED"
  | "CART_CREATED"
  | "CART_ABANDONED"
  | "ORDER_CREATED"
  | "PAYMENT_CONFIRMED"
  | "ORDER_SENT_TO_PROVIDER"
  | "ORDER_ACCEPTED"
  | "ORDER_FAILED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_REFUNDED"
  | "PRODUCT_OUT_OF_STOCK"
  | "PRODUCT_DISCONTINUED"
  | "PROVIDER_OFFLINE"
  | "DROP_STARTED"
  | "DROP_ENDED"
  | "CONTENT_PUBLISHED";

export type EventPayload = Record<string, unknown>;
type Handler = (payload: EventPayload) => Promise<void>;

export async function emitEvent(type: AutomationEventType, payload: EventPayload) {
  const sb = dbOrNull();
  let id: string | null = null;
  if (sb) {
    const { data } = await sb.from("automation_events").insert({ brand_id: env.brandId(), type, payload }).select("id").single();
    id = data?.id ?? null;
  }
  const { HANDLERS } = await import("./handlers");
  const handlers: Handler[] = HANDLERS[type] ?? [];
  const errors: string[] = [];
  for (const h of handlers) {
    try {
      await h(payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      log.error("ORDER", "automation handler failed", { type, msg });
    }
  }
  if (sb && id) {
    await sb
      .from("automation_events")
      .update({ status: errors.length ? "FAILED" : "PROCESSED", error: errors.join("; ") || null, processed_at: new Date().toISOString() })
      .eq("id", id);
  }
}

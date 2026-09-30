import "server-only";
import { db } from "@/lib/supabase/admin";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import type { NormalizedWebhookEvent } from "@/lib/fulfillment/types";
import { recordWebhook, markWebhook } from "@/lib/webhooks/idempotency";
import { applyProviderSnapshot } from "./fulfillment-engine";
import { emitEvent } from "@/lib/events/bus";
import { log } from "@/lib/logger";

export type WebhookOutcome = { status: number; body: Record<string, unknown> };

/**
 * Generic provider webhook pipeline (same for every provider):
 * authenticate → parse → idempotency → re-fetch order from provider API (payloads are
 * unsigned, so the provider API is the source of truth) → apply → mark processed.
 */
export async function handleProviderWebhook(providerId: string, req: { url: URL; headers: Headers; rawBody: string }): Promise<WebhookOutcome> {
  if (!fulfillmentProviderFactory.has(providerId)) return { status: 404, body: { error: "unknown provider" } };
  const provider = fulfillmentProviderFactory.getProvider(providerId);

  let ev: NormalizedWebhookEvent;
  try {
    ev = await provider.handleWebhook(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "WEBHOOK_AUTH_FAILED") {
      log.warn("SECURITY", "webhook auth failed", { providerId });
      return { status: 401, body: { error: "unauthorized" } };
    }
    log.warn("WEBHOOK", "invalid payload", { providerId, msg });
    return { status: 400, body: { error: "invalid payload" } };
  }

  const rec = await recordWebhook({ provider: providerId, eventId: ev.eventId, eventType: ev.rawType, payload: ev.payload, signatureValid: provider.capabilities.webhook_signature ? true : null });
  if (rec.duplicate) return { status: 200, body: { ok: true, duplicate: true } };

  const sb = db();
  await sb.from("providers").update({ last_webhook_at: new Date().toISOString() }).eq("id", providerId);

  try {
    if (ev.type === "STOCK_UPDATED" && ev.stock) {
      await applyStockUpdate(providerId, ev.stock);
    } else if (ev.providerOrderId || ev.externalOrderId) {
      const fo = await findFulfillmentOrder(providerId, ev);
      if (!fo) {
        log.warn("WEBHOOK", "no matching fulfillment order", { providerId, providerOrderId: ev.providerOrderId, externalOrderId: ev.externalOrderId });
      } else {
        const providerOrderId = ev.providerOrderId ?? fo.provider_order_id;
        if (providerOrderId) {
          const snapshot = await provider.getOrder(providerOrderId); // trusted re-fetch
          if (!fo.provider_order_id) await sb.from("fulfillment_orders").update({ provider_order_id: providerOrderId }).eq("id", fo.id);
          await applyProviderSnapshot(fo.id, snapshot);
        }
      }
    }
    await markWebhook(rec.id, {});
    return { status: 200, body: { ok: true } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markWebhook(rec.id, { error: msg });
    log.error("WEBHOOK", "processing failed", { providerId, eventId: ev.eventId, msg });
    // 500 → provider retries later; idempotency makes the retry safe.
    return { status: 500, body: { error: "processing failed" } };
  }
}

async function findFulfillmentOrder(providerId: string, ev: NormalizedWebhookEvent) {
  const sb = db();
  if (ev.providerOrderId) {
    const { data } = await sb.from("fulfillment_orders").select("id, provider_order_id").eq("provider_id", providerId).eq("provider_order_id", ev.providerOrderId).maybeSingle();
    if (data) return data;
  }
  // external id format: "<order_number>-<provider>"
  const m = ev.externalOrderId?.match(/^(\d+)-/);
  if (m) {
    const { data: order } = await sb.from("orders").select("id").eq("order_number", Number(m[1])).maybeSingle();
    if (order) {
      const { data } = await sb.from("fulfillment_orders").select("id, provider_order_id").eq("order_id", order.id).eq("provider_id", providerId).maybeSingle();
      return data;
    }
  }
  return null;
}

async function applyStockUpdate(providerId: string, stock: { outOfStock: string[]; discontinued: string[] }) {
  const sb = db();
  const affected = new Set<string>();
  for (const [ids, status] of [
    [stock.outOfStock, "OUT_OF_STOCK"],
    [stock.discontinued, "DISCONTINUED"],
  ] as const) {
    if (!ids.length) continue;
    await sb.from("provider_variants").update({ status }).eq("provider_id", providerId).in("external_id", ids);
    const { data: vms } = await sb
      .from("variant_provider_mappings")
      .select("id, product_provider_mappings!inner(product_id, provider_id)")
      .in("provider_variant_id", ids)
      .eq("product_provider_mappings.provider_id", providerId);
    const vmIds = (vms ?? []).map((v) => v.id);
    if (vmIds.length) await sb.from("variant_provider_mappings").update({ status }).in("id", vmIds);
    for (const v of vms ?? []) affected.add((v.product_provider_mappings as unknown as { product_id: string }).product_id);
  }
  if (affected.size) {
    await emitEvent(stock.discontinued.length ? "PRODUCT_DISCONTINUED" : "PRODUCT_OUT_OF_STOCK", { providerId, productIds: [...affected] });
  }
}

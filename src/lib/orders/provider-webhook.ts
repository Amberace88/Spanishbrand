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
  if (rec.inFlight) return { status: 409, body: { error: "in progress" } };

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

async function applyStockUpdate(providerId: string, stock: { outOfStock: string[]; discontinued: string[]; providerProductId?: string | null }) {
  const sb = db();
  const affected = new Set<string>();
  const touch = async (ids: string[], status: "OUT_OF_STOCK" | "DISCONTINUED" | "ACTIVE") => {
    if (!ids.length) return;
    await sb.from("provider_variants").update({ status }).eq("provider_id", providerId).in("external_id", ids);
    const { data: vms } = await sb
      .from("variant_provider_mappings")
      .select("id, variant_id, product_provider_mappings!inner(product_id, provider_id, role)")
      .in("provider_variant_id", ids)
      .eq("product_provider_mappings.provider_id", providerId);
    for (const v of vms ?? []) {
      await sb.from("variant_provider_mappings").update({ status }).eq("id", v.id);
      const m = v.product_provider_mappings as unknown as { product_id: string; role: string };
      if (m.role === "PRIMARY") {
        // Per-variant enforcement: cart/checkout block only this variant.
        await sb.from("product_variants").update({ stock_status: status === "ACTIVE" ? "ON_DEMAND" : status, provider_status: status }).eq("id", v.variant_id);
      }
      affected.add(m.product_id);
    }
  };
  await touch(stock.outOfStock, "OUT_OF_STOCK");
  await touch(stock.discontinued, "DISCONTINUED");

  // Restock: mapped variants of this provider product that are no longer listed as out of stock.
  if (stock.providerProductId) {
    const listed = new Set([...stock.outOfStock, ...stock.discontinued]);
    const { data: maps } = await sb
      .from("product_provider_mappings")
      .select("variant_provider_mappings(provider_variant_id, status)")
      .eq("provider_id", providerId)
      .eq("provider_product_id", stock.providerProductId);
    const back = (maps ?? [])
      .flatMap((m) => (m.variant_provider_mappings as { provider_variant_id: string; status: string }[]) ?? [])
      .filter((v) => v.status === "OUT_OF_STOCK" && !listed.has(v.provider_variant_id))
      .map((v) => v.provider_variant_id);
    await touch(back, "ACTIVE");
  }

  for (const id of affected) await sb.rpc("refresh_product_eligibility", { p_product_id: id });
  if (affected.size) {
    await emitEvent(stock.discontinued.length ? "PRODUCT_DISCONTINUED" : "PRODUCT_OUT_OF_STOCK", { providerId, productIds: [...affected] });
  }
}

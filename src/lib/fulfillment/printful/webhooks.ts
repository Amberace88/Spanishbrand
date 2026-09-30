import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { pf } from "./client";
import { pfEnvelope, pfWebhookPayload } from "./types";
import type { NormalizedWebhookEvent, NormalizedWebhookType, WebhookRequest } from "../types";

export const PRINTFUL_WEBHOOK_TYPES = [
  "package_shipped",
  "package_returned",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_remove_hold",
  "order_updated",
  "stock_updated",
  "product_updated",
] as const;

/** POST /webhooks — one URL per store; secret token travels in the URL (v1 has no signatures). */
export async function registerWebhook(baseUrl: string) {
  const secret = env.printfulWebhookSecret();
  if (!secret) throw new Error("PRINTFUL_WEBHOOK_SECRET is required before registering the webhook");
  const url = `${baseUrl}?token=${encodeURIComponent(secret)}`;
  await pf("/webhooks", pfEnvelope(z.unknown()), { method: "POST", body: { url, types: PRINTFUL_WEBHOOK_TYPES } });
  return { registered: true, note: "Printful v1 webhooks are unsigned: URL token + order re-fetch are enforced." };
}

export function verifyToken(url: URL, secret: string | undefined): boolean {
  const token = url.searchParams.get("token");
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const TYPE_MAP: Record<string, NormalizedWebhookType> = {
  package_shipped: "SHIPMENT_SENT",
  package_returned: "SHIPMENT_RETURNED",
  order_failed: "ORDER_FAILED",
  order_canceled: "ORDER_CANCELLED",
  order_put_hold: "ORDER_ON_HOLD",
  order_remove_hold: "ORDER_UPDATED",
  order_updated: "ORDER_UPDATED",
  order_created: "ORDER_UPDATED",
  stock_updated: "STOCK_UPDATED",
  product_updated: "PRODUCT_UPDATED",
  product_synced: "PRODUCT_UPDATED",
};

export function parsePrintfulWebhook(req: WebhookRequest): NormalizedWebhookEvent {
  if (!verifyToken(req.url, env.printfulWebhookSecret())) {
    throw new Error("WEBHOOK_AUTH_FAILED");
  }
  const body = pfWebhookPayload.parse(JSON.parse(req.rawBody));
  const data = (body.data ?? {}) as Record<string, unknown>;
  const order = (data.order ?? null) as { id?: number; external_id?: string } | null;
  const shipment = (data.shipment ?? null) as { id?: number } | null;

  // Printful payloads carry no event id: derive a stable one (retries counter excluded).
  const eventId = createHash("sha256")
    .update([body.type, body.created, body.store ?? "", order?.id ?? "", shipment?.id ?? "", JSON.stringify(data.variant_stock ?? "")].join("|"))
    .digest("hex");

  const variantStock = (data.variant_stock ?? null) as { out?: number[]; discontinued?: number[] } | null;

  return {
    eventId,
    rawType: body.type,
    type: TYPE_MAP[body.type] ?? "UNKNOWN",
    providerOrderId: order?.id != null ? String(order.id) : null,
    externalOrderId: order?.external_id ?? null,
    reason: typeof data.reason === "string" ? data.reason : null,
    stock: variantStock
      ? { outOfStock: (variantStock.out ?? []).map(String), discontinued: (variantStock.discontinued ?? []).map(String) }
      : null,
    payload: body,
  };
}

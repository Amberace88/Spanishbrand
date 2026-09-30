import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { glWebhook } from "./types";
import { mapOrderStatus, mapStockStatus } from "./mapper";
import type { NormalizedWebhookEvent, NormalizedWebhookType, WebhookRequest } from "../types";

/** Gelato webhooks are configured in the API portal only (no registration API). */
export async function registerWebhook(url: string) {
  const secret = env.gelatoWebhookSecret();
  return {
    registered: false,
    note: `Register manually in the Gelato API portal: ${url}?token=${secret ? "<GELATO_WEBHOOK_SECRET>" : "(set GELATO_WEBHOOK_SECRET first)"} — events: order_status_updated, order_item_tracking_code_updated, order_delivery_estimate_updated, catalog_product_stock_availability_updated`,
  };
}

function verifyToken(url: URL, secret: string | undefined) {
  const token = url.searchParams.get("token");
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseGelatoWebhook(req: WebhookRequest): NormalizedWebhookEvent {
  if (!verifyToken(req.url, env.gelatoWebhookSecret())) throw new Error("WEBHOOK_AUTH_FAILED");
  const body = glWebhook.parse(JSON.parse(req.rawBody));

  let type: NormalizedWebhookType = "UNKNOWN";
  switch (body.event) {
    case "order_status_updated": {
      const s = mapOrderStatus(body.fulfillmentStatus ?? "");
      type =
        s === "FAILED" ? "ORDER_FAILED" : s === "CANCELLED" ? "ORDER_CANCELLED" : s === "SHIPPED" ? "SHIPMENT_SENT" : s === "RETURNED" ? "SHIPMENT_RETURNED" : "ORDER_UPDATED";
      break;
    }
    case "order_item_status_updated":
    case "order_delivery_estimate_updated":
      type = "ORDER_UPDATED";
      break;
    case "order_item_tracking_code_updated":
      type = "TRACKING_UPDATED";
      break;
    case "catalog_product_stock_availability_updated":
      type = "STOCK_UPDATED";
      break;
    case "store_product_updated":
    case "store_product_deleted":
      type = "PRODUCT_UPDATED";
      break;
  }

  let stock: NormalizedWebhookEvent["stock"] = null;
  if (body.productAvailability) {
    const out: string[] = [];
    const disc: string[] = [];
    for (const p of body.productAvailability) {
      const eu = p.availability.find((a) => a.stockRegionUid === "EU") ?? p.availability[0];
      const st = eu ? mapStockStatus(eu.status) : "UNKNOWN";
      if (st === "OUT_OF_STOCK") out.push(p.productUid);
      if (st === "DISCONTINUED") disc.push(p.productUid);
    }
    stock = { outOfStock: out, discontinued: disc };
  }

  return {
    eventId: body.id,
    rawType: body.event,
    type,
    providerOrderId: body.orderId ?? null,
    externalOrderId: body.orderReferenceId ?? null,
    reason: body.comment ?? null,
    stock,
    payload: body,
  };
}

import "server-only";
import { z } from "zod";
import { pf } from "./client";
import { pfCostEstimate, pfEnvelope, pfOrder } from "./types";
import { mapOrder, toPrintfulOrderBody } from "./mapper";
import { toNumber } from "../http";
import { isProviderError } from "../errors";
import type { CostEstimate, ProviderOrderInput, ProviderOrderSnapshot } from "../types";

/** POST /orders?confirm=true — creates and submits for fulfillment in one call. */
export async function createOrder(input: ProviderOrderInput): Promise<ProviderOrderSnapshot> {
  const q = input.confirm ? "?confirm=true" : "";
  const res = await pf(`/orders${q}`, pfEnvelope(pfOrder), { method: "POST", body: toPrintfulOrderBody(input), timeoutMs: 30_000 });
  return mapOrder(res.result);
}

/** POST /orders/{id}/confirm */
export async function confirmOrder(id: string) {
  const res = await pf(`/orders/${encodeURIComponent(id)}/confirm`, pfEnvelope(pfOrder), { method: "POST" });
  return mapOrder(res.result);
}

/** GET /orders/{id} */
export async function getOrder(id: string) {
  const res = await pf(`/orders/${encodeURIComponent(id)}`, pfEnvelope(pfOrder));
  return mapOrder(res.result);
}

/** GET /orders/@{external_id} — recovers an order created before a timeout. */
export async function getOrderByExternalId(externalId: string): Promise<ProviderOrderSnapshot | null> {
  try {
    const res = await pf(`/orders/@${encodeURIComponent(externalId)}`, pfEnvelope(pfOrder));
    return mapOrder(res.result);
  } catch (e) {
    if (isProviderError(e) && e.status === 404) return null;
    throw e;
  }
}

/** DELETE /orders/{id} — only drafts/pending orders can be cancelled. */
export async function cancelOrder(id: string) {
  await pf(`/orders/${encodeURIComponent(id)}`, pfEnvelope(z.unknown()), { method: "DELETE" });
}

/** POST /orders/estimate-costs — used as the non-charging "test fulfillment flow". */
export async function estimateCosts(input: ProviderOrderInput): Promise<CostEstimate> {
  const res = await pf("/orders/estimate-costs", pfEnvelope(pfCostEstimate), {
    method: "POST",
    body: toPrintfulOrderBody(input),
  });
  const c = res.result.costs;
  return {
    currency: c.currency,
    production: toNumber(c.subtotal),
    shipping: toNumber(c.shipping),
    tax: (toNumber(c.tax) ?? 0) + (toNumber(c.vat) ?? 0),
    total: toNumber(c.total),
    raw: res.result,
  };
}

import "server-only";
import { z } from "zod";
import { pf } from "./client";
import { pfCostEstimate, pfEnvelope, pfOrder } from "./types";
import { mapOrder, toPrintfulOrderBody } from "./mapper";
import { toNumber } from "../http";
import { isProviderError } from "../errors";
import type { CostEstimate, ProviderOrderInput, ProviderOrderSnapshot } from "../types";

/**
 * Some Printful products (all-over print pillows, bandanas…) require product options such as
 * `stitch_color`. Printful names the missing option and its allowed values in the 400 error, so we
 * fill it in (preferred value, else the first allowed) and retry — no per-product table to maintain.
 */
const PREFERRED_OPTION_VALUES: Record<string, string[]> = { stitch_color: ["black", "white"], thread_colors: ["#000000"] };
type PfBody = ReturnType<typeof toPrintfulOrderBody>;
export function fillMissingOption(body: PfBody, message: string): boolean {
  const m = message.match(/Item (\d+): (?:Item '([\w-]+)' option missing or has an invalid value|([\w-]+) option is missing or incorrect)! Allowed values: ([^\n"]+)/i);
  if (!m) return false;
  const idx = Number(m[1]);
  const id = m[2] ?? m[3];
  const allowed = m[4].split(",").map((x) => x.trim().replace(/[.!]$/, "")).filter(Boolean);
  const item = body.items[idx];
  if (!item || !allowed.length) return false;
  const value = PREFERRED_OPTION_VALUES[id]?.find((v) => allowed.includes(v)) ?? allowed[0];
  const opts = (item.options ?? []).filter((o) => o.id !== id);
  if ((item.options ?? []).some((o) => o.id === id && o.value === value)) return false; // already tried
  item.options = [...opts, { id, value }];
  return true;
}
async function withOptionRetry<T>(body: PfBody, send: (b: PfBody) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await send(body);
    } catch (e) {
      if (attempt < 4 && isProviderError(e) && e.status === 400 && fillMissingOption(body, e.message)) continue;
      throw e;
    }
  }
}

/** POST /orders?confirm=true — creates and submits for fulfillment in one call. */
export async function createOrder(input: ProviderOrderInput): Promise<ProviderOrderSnapshot> {
  const q = input.confirm ? "?confirm=true" : "";
  const res = await withOptionRetry(toPrintfulOrderBody(input), (body) => pf(`/orders${q}`, pfEnvelope(pfOrder), { method: "POST", body, timeoutMs: 30_000 }));
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
  const res = await withOptionRetry(toPrintfulOrderBody(input), (body) => pf("/orders/estimate-costs", pfEnvelope(pfCostEstimate), { method: "POST", body }));
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

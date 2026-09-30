import "server-only";
import { z } from "zod";
import { gl } from "./client";
import { glOrder, glQuote } from "./types";
import { mapOrder, toGelatoAddress, toGelatoOrderBody } from "./mapper";
import { UnsupportedCapabilityError } from "../errors";
import type { CostEstimate, ProviderOrderInput, ProviderOrderSnapshot, ShippingQuoteInput, ShippingRate } from "../types";

/** POST /v4/orders */
export async function createOrder(input: ProviderOrderInput): Promise<ProviderOrderSnapshot> {
  const o = await gl("order", "/orders", glOrder, { method: "POST", body: toGelatoOrderBody(input), timeoutMs: 30_000 });
  return mapOrder(o);
}

/** GET /v4/orders/{id} */
export async function getOrder(id: string) {
  return mapOrder(await gl("order", `/orders/${encodeURIComponent(id)}`, glOrder));
}

/**
 * Draft → order promotion is not confirmed in the official docs, so it is not implemented.
 * Our flow always creates orders with orderType "order" (confirm=true).
 */
export async function confirmOrder(id: string) {
  const o = await getOrder(id);
  if (o.status === "DRAFT") throw new UnsupportedCapabilityError("gelato", "confirm draft order");
  return o;
}

/** Lookup by orderReferenceId: search endpoint not confirmed in docs → not used. */
export async function getOrderByExternalId(): Promise<ProviderOrderSnapshot | null> {
  return null;
}

/** POST /v4/orders/{id}:cancel (409 when already printed/shipped). */
export async function cancelOrder(id: string) {
  await gl("order", `/orders/${encodeURIComponent(id)}:cancel`, z.unknown(), { method: "POST" });
}

async function quote(body: unknown) {
  return gl("order", "/orders:quote", glQuote, { method: "POST", body });
}

/** POST /v4/orders:quote — non-charging test flow & cost estimate. */
export async function estimateCosts(input: ProviderOrderInput): Promise<CostEstimate> {
  const res = await quote({
    orderReferenceId: input.externalId,
    customerReferenceId: input.recipient.email,
    currency: input.currency,
    allowMultipleQuotes: false,
    recipient: toGelatoAddress(input.recipient),
    products: input.items.map((i) => ({
      itemReferenceId: i.referenceId,
      productUid: i.providerVariantId,
      quantity: i.quantity,
      files: i.files.map((f) => ({ type: f.type, url: f.url })),
    })),
  });
  let production = 0;
  let shipping = 0;
  for (const q of res.quotes) {
    production += q.products.reduce((s, p) => s + p.price, 0);
    const cheapest = [...q.shipmentMethods].sort((a, b) => a.price - b.price)[0];
    shipping += cheapest?.price ?? 0;
  }
  return { currency: input.currency, production, shipping, tax: null, total: production + shipping, raw: res };
}

export async function shippingRates(input: ShippingQuoteInput): Promise<ShippingRate[]> {
  const res = await quote({
    orderReferenceId: `quote-${Date.now()}`,
    customerReferenceId: "quote",
    currency: input.currency,
    allowMultipleQuotes: false,
    recipient: {
      firstName: "Quote",
      lastName: "Quote",
      addressLine1: "Quote",
      city: "Quote",
      postCode: input.postalCode ?? "28001",
      country: input.country,
      email: "quote@example.com",
    },
    products: input.items.map((i, idx) => ({
      itemReferenceId: `q${idx}`,
      productUid: i.providerVariantId,
      quantity: i.quantity,
      files: i.files?.map((f) => ({ type: f.type, url: f.url })),
    })),
  });
  return (res.quotes[0]?.shipmentMethods ?? []).map((m) => ({
    id: m.shipmentMethodUid,
    name: m.name,
    rate: m.price,
    currency: m.currency,
    minDays: m.minDeliveryDays ?? null,
    maxDays: m.maxDeliveryDays ?? null,
  }));
}

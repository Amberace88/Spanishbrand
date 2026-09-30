import "server-only";
import { z } from "zod";
import { pf } from "./client";
import { pfEnvelope, pfShippingRate } from "./types";
import { getOrder } from "./orders";
import { toNumber } from "../http";
import type { ShippingQuoteInput, ShippingRate } from "../types";

/** POST /shipping/rates */
export async function shippingRates(input: ShippingQuoteInput): Promise<ShippingRate[]> {
  const res = await pf("/shipping/rates", pfEnvelope(z.array(pfShippingRate)), {
    method: "POST",
    body: {
      recipient: { country_code: input.country, zip: input.postalCode, state_code: input.state },
      items: input.items.map((i) => ({ variant_id: Number(i.providerVariantId), quantity: i.quantity })),
      currency: input.currency,
      locale: "es_ES",
    },
  });
  return res.result.map((r) => ({
    id: r.id,
    name: r.name,
    rate: toNumber(r.rate) ?? 0,
    currency: r.currency,
    minDays: r.minDeliveryDays ?? null,
    maxDays: r.maxDeliveryDays ?? null,
  }));
}

export async function getShipments(providerOrderId: string) {
  return (await getOrder(providerOrderId)).shipments;
}

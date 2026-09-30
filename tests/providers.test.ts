import { describe, expect, it, beforeAll } from "vitest";
import { mapOrder as mapPfOrder, mapVariantStatus, toPrintfulOrderBody, categoryFromPrintful } from "@/lib/fulfillment/printful/mapper";
import { mapOrder as mapGlOrder, mapStockStatus, toGelatoOrderBody } from "@/lib/fulfillment/gelato/mapper";
import type { ProviderOrderInput } from "@/lib/fulfillment/types";

beforeAll(() => {
  process.env.PRINTFUL_WEBHOOK_SECRET = "pf-secret-123";
  process.env.GELATO_WEBHOOK_SECRET = "gl-secret-456";
});

const input: ProviderOrderInput = {
  externalId: "10025-printful",
  currency: "EUR",
  confirm: true,
  recipient: { name: "María García López", line1: "Calle Mayor 1", city: "Madrid", postalCode: "28013", country: "ES", email: "m@example.com" },
  items: [{ referenceId: "oi-1", providerProductId: "71", providerVariantId: "4012", quantity: 2, retailPrice: 39.9, name: "Heritage Tee — M / Black", files: [{ type: "front", url: "https://x/f.png" }] }],
};

describe("Printful adapter", () => {
  it("builds a valid POST /orders body", () => {
    const b = toPrintfulOrderBody(input);
    expect(b.external_id).toBe("10025-printful");
    expect(b.recipient.country_code).toBe("ES");
    expect(b.items[0]).toMatchObject({ variant_id: 4012, quantity: 2, retail_price: "39.90", files: [{ type: "front", url: "https://x/f.png" }] });
  });
  it("maps order status + shipments", () => {
    const s = mapPfOrder({ id: 99, external_id: "10025-printful", status: "fulfilled", shipments: [{ id: 5, carrier: "DHL", service: "Express", tracking_number: "JD01", tracking_url: "https://t/JD01", shipped_at: 1759000000 }], costs: { currency: "EUR", total: "18.20", shipping: "4.50" } } as never);
    expect(s.status).toBe("SHIPPED");
    expect(s.shipments[0]).toMatchObject({ trackingNumber: "JD01", carrier: "DHL" });
    expect(s.costs.total).toBe(18.2);
  });
  it("reads regional availability", () => {
    expect(mapVariantStatus({ id: 1, product_id: 1, name: "x", availability_status: [{ region: "EU", status: "discontinued" }] } as never)).toBe("DISCONTINUED");
  });
  it("maps categories", () => {
    expect(categoryFromPrintful({ type: "T-SHIRT", type_name: "T-Shirt", title: "Unisex Staple T-Shirt" })).toBe("APPAREL");
    expect(categoryFromPrintful({ type: "POSTER", type_name: "Poster", title: "Enhanced Matte Paper Poster" })).toBe("WALL_ART");
  });
  it("webhook: rejects missing token, derives stable id ignoring retries", async () => {
    const { parsePrintfulWebhook } = await import("@/lib/fulfillment/printful/webhooks");
    const body = (retries: number) => JSON.stringify({ type: "package_shipped", created: 1759000000, retries, store: 1, data: { order: { id: 99, external_id: "10025-printful" }, shipment: { id: 5 } } });
    expect(() => parsePrintfulWebhook({ url: new URL("https://s/api/webhooks/printful"), headers: new Headers(), rawBody: body(0) })).toThrow("WEBHOOK_AUTH_FAILED");
    const a = parsePrintfulWebhook({ url: new URL("https://s/api/webhooks/printful?token=pf-secret-123"), headers: new Headers(), rawBody: body(0) });
    const b = parsePrintfulWebhook({ url: new URL("https://s/api/webhooks/printful?token=pf-secret-123"), headers: new Headers(), rawBody: body(3) });
    expect(a.eventId).toBe(b.eventId);
    expect(a).toMatchObject({ type: "SHIPMENT_SENT", providerOrderId: "99", externalOrderId: "10025-printful" });
  });
});

describe("Gelato adapter", () => {
  it("builds a valid POST /v4/orders body with split names and limits", () => {
    const b = toGelatoOrderBody({ ...input, externalId: "10025-gelato" });
    expect(b.orderType).toBe("order");
    expect(b.shippingAddress).toMatchObject({ firstName: "María", lastName: "García López", country: "ES", postCode: "28013" });
    expect(b.items[0]).toMatchObject({ itemReferenceId: "oi-1", productUid: "4012", quantity: 2 });
  });
  it("maps statuses and tracking packages", () => {
    const s = mapGlOrder({ id: "g1", orderReferenceId: "10025-gelato", fulfillmentStatus: "in_transit", shipment: { id: "s1", shipmentMethodName: "DHL", packages: [{ id: "p1", trackingCode: "TC1", trackingUrl: "https://t/TC1" }] } } as never);
    expect(s.status).toBe("SHIPPED");
    expect(s.shipments[0].trackingNumber).toBe("TC1");
    expect(mapStockStatus("non-stockable")).toBe("ACTIVE");
    expect(mapStockStatus("not-supported")).toBe("DISCONTINUED");
  });
  it("webhook auth + normalization", async () => {
    const { parseGelatoWebhook } = await import("@/lib/fulfillment/gelato/webhooks");
    const raw = JSON.stringify({ id: "evt1", event: "order_status_updated", orderId: "g1", orderReferenceId: "10025-gelato", fulfillmentStatus: "failed" });
    expect(() => parseGelatoWebhook({ url: new URL("https://s/x?token=nope"), headers: new Headers(), rawBody: raw })).toThrow("WEBHOOK_AUTH_FAILED");
    expect(parseGelatoWebhook({ url: new URL("https://s/x?token=gl-secret-456"), headers: new Headers(), rawBody: raw })).toMatchObject({ eventId: "evt1", type: "ORDER_FAILED", providerOrderId: "g1" });
  });
});

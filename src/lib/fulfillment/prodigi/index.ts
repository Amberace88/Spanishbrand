import "server-only";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env, isConfigured } from "@/lib/env";
import { providerRequest } from "../http";
import { ProviderNotConfiguredError, isProviderError } from "../errors";
import type {
  CostEstimate,
  FulfillmentProvider,
  HealthResult,
  NormalizedOrderStatus,
  NormalizedVariant,
  NormalizedWebhookEvent,
  ProviderCapabilities,
  ProviderOrderInput,
  ProviderOrderSnapshot,
  ShippingQuoteInput,
  ShippingRate,
  WebhookRequest,
} from "../types";

/**
 * Prodigi Print API v4 (https://www.prodigi.com/print-api/docs/reference/).
 * Product ID = SKU; variant ID = "<SKU>|<attr>=<value>,…" so attributes (frame colour, wrap…) travel with the order.
 */
const base = () => (env.prodigiSandbox() ? "https://api.sandbox.prodigi.com/v4.0" : "https://api.prodigi.com/v4.0");

function headers() {
  const key = env.prodigiApiKey();
  if (!key) throw new ProviderNotConfiguredError("prodigi");
  return { "X-API-Key": key };
}
const errorMessage = (body: unknown) => {
  const b = body as { outcome?: string; failures?: unknown; statusText?: string } | null;
  return b ? [b.outcome, b.statusText, b.failures ? JSON.stringify(b.failures).slice(0, 300) : ""].filter(Boolean).join(" ") || undefined : undefined;
};

export function pdg<T>(path: string, schema: z.ZodType<T>, init: { method?: "GET" | "POST"; body?: unknown; timeoutMs?: number } = {}) {
  return providerRequest<T>({ provider: "prodigi", baseUrl: base(), path, method: init.method, body: init.body, headers: headers(), schema, timeoutMs: init.timeoutMs, errorMessage });
}

/* ───────────── products ───────────── */

const product = z
  .object({
    sku: z.string(),
    description: z.string().optional(),
    productDimensions: z.object({ width: z.number(), height: z.number(), units: z.string() }).partial().optional(),
    attributes: z.record(z.string(), z.array(z.string())).optional().default({}),
    printAreas: z.record(z.string(), z.unknown()).optional(),
    variants: z
      .array(
        z
          .object({
            attributes: z.record(z.string(), z.string()).optional().default({}),
            shipsTo: z.array(z.string()).optional(),
            printAreaSizes: z.record(z.string(), z.object({ horizontalResolution: z.number(), verticalResolution: z.number() })).optional(),
          })
          .passthrough(),
      )
      .optional()
      .default([]),
  })
  .passthrough();
export type ProdigiProduct = z.infer<typeof product>;

export async function getProdigiProduct(sku: string) {
  const r = await pdg(`/products/${encodeURIComponent(sku)}`, z.object({ outcome: z.string().optional(), product }).passthrough());
  return r.product;
}

export const variantId = (sku: string, attrs: Record<string, string>) => `${sku}|${Object.entries(attrs).map(([k, v]) => `${k}=${v}`).join(",")}`;
export function parseVariant(id: string) {
  const [sku, attrStr = ""] = id.split("|");
  const attributes = Object.fromEntries(attrStr.split(",").filter(Boolean).map((p) => p.split("=") as [string, string]));
  return { sku, attributes };
}

export function mapProdigiVariant(sku: string, attrs: Record<string, string>, label: string, cost: number | null): NormalizedVariant {
  return { externalId: variantId(sku, attrs), name: label, size: label, color: attrs.color ?? attrs.frameColour ?? null, colorCode: null, cost, currency: cost != null ? "EUR" : null, inStock: null, status: "ACTIVE", availability: {}, image: null, raw: { sku, attrs } };
}

/* ───────────── quotes ───────────── */

const quotes = z
  .object({
    quotes: z.array(
      z
        .object({
          shipmentMethod: z.string(),
          costSummary: z.object({ items: z.object({ amount: z.string(), currency: z.string() }), shipping: z.object({ amount: z.string(), currency: z.string() }), totalCost: z.object({ amount: z.string(), currency: z.string() }).optional() }).passthrough(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export async function quote(items: { sku: string; attributes: Record<string, string>; copies: number }[], country: string, method = "Standard") {
  return pdg("/quotes", quotes, { method: "POST", body: { shippingMethod: method, destinationCountryCode: country, currencyCode: "EUR", items: items.map((i) => ({ sku: i.sku, copies: i.copies, attributes: i.attributes, assets: [{ printArea: "default" }] })) } });
}

export async function estimateCosts(input: ProviderOrderInput): Promise<CostEstimate> {
  const res = await quote(input.items.map((i) => ({ ...parseVariant(i.providerVariantId), copies: i.quantity })), input.recipient.country);
  const q = res.quotes.find((x) => x.shipmentMethod === "Standard") ?? res.quotes[0];
  const production = q ? Number(q.costSummary.items.amount) : null;
  const shipping = q ? Number(q.costSummary.shipping.amount) : null;
  return { currency: q?.costSummary.items.currency ?? "EUR", production, shipping, tax: null, total: production != null && shipping != null ? production + shipping : null, raw: res };
}

export async function shippingRates(input: ShippingQuoteInput): Promise<ShippingRate[]> {
  const out: ShippingRate[] = [];
  for (const method of ["Budget", "Standard", "Express"]) {
    try {
      const r = await quote(input.items.map((i) => ({ ...parseVariant(i.providerVariantId), copies: i.quantity })), input.country, method);
      const q = r.quotes[0];
      if (q) out.push({ id: method, name: method, rate: Number(q.costSummary.shipping.amount), currency: q.costSummary.shipping.currency, minDays: null, maxDays: null });
    } catch {
      /* method not available for this destination */
    }
  }
  return out;
}

/* ───────────── orders ───────────── */

const order = z
  .object({
    id: z.string(),
    merchantReference: z.string().nullable().optional(),
    status: z.object({ stage: z.string(), details: z.record(z.string(), z.string()).optional(), issues: z.array(z.unknown()).optional() }).passthrough(),
    charges: z.array(z.object({ totalCost: z.object({ amount: z.string(), currency: z.string() }).optional() }).passthrough()).optional(),
    shipments: z
      .array(z.object({ id: z.string(), status: z.string().optional(), carrier: z.object({ name: z.string().nullable().optional(), service: z.string().nullable().optional() }).partial().optional(), tracking: z.object({ url: z.string().nullable().optional(), number: z.string().nullable().optional() }).partial().nullable().optional(), dispatchDate: z.string().nullable().optional() }).passthrough())
      .optional(),
  })
  .passthrough();

function mapStatus(o: z.infer<typeof order>): NormalizedOrderStatus {
  if (o.status.stage === "Cancelled") return "CANCELLED";
  if (o.status.stage === "Complete") return "SHIPPED";
  if ((o.status.issues ?? []).length) return "ON_HOLD";
  const d = o.status.details ?? {};
  if (d.shipping === "InProgress" || d.shipping === "Complete") return "PARTIALLY_SHIPPED";
  if (d.inProduction === "InProgress" || d.inProduction === "Complete") return "IN_PRODUCTION";
  return "ACCEPTED";
}

function mapOrder(o: z.infer<typeof order>): ProviderOrderSnapshot {
  const total = o.charges?.reduce((s, c) => s + Number(c.totalCost?.amount ?? 0), 0) ?? null;
  return {
    providerOrderId: o.id,
    externalId: o.merchantReference ?? null,
    status: mapStatus(o),
    rawStatus: `${o.status.stage}`,
    costs: { total, shipping: null, currency: o.charges?.[0]?.totalCost?.currency ?? null },
    shipments: (o.shipments ?? []).map((s) => ({ providerShipmentId: s.id, carrier: s.carrier?.name ?? null, service: s.carrier?.service ?? null, trackingNumber: s.tracking?.number ?? null, trackingUrl: s.tracking?.url ?? null, shippedAt: s.dispatchDate ?? null })),
    raw: o,
  };
}

function callbackUrl() {
  const secret = env.prodigiWebhookSecret();
  const site = env.siteUrl().replace(/\/$/, "");
  return secret ? `${site}/api/webhooks/prodigi?token=${encodeURIComponent(secret)}` : undefined;
}

export async function createOrder(input: ProviderOrderInput): Promise<ProviderOrderSnapshot> {
  const r = await pdg("/orders", z.object({ outcome: z.string(), order }).passthrough(), {
    method: "POST",
    timeoutMs: 30_000,
    body: {
      merchantReference: input.externalId,
      idempotencyKey: input.externalId,
      shippingMethod: input.shippingMethod ?? "Standard",
      callbackUrl: callbackUrl(),
      recipient: {
        name: input.recipient.name,
        email: input.recipient.email,
        phoneNumber: input.recipient.phone ?? undefined,
        address: { line1: input.recipient.line1, line2: input.recipient.line2 ?? undefined, postalOrZipCode: input.recipient.postalCode, countryCode: input.recipient.country, townOrCity: input.recipient.city, stateOrCounty: input.recipient.state ?? undefined },
      },
      items: input.items.map((i) => {
        const v = parseVariant(i.providerVariantId);
        return { merchantReference: i.referenceId, sku: v.sku, copies: i.quantity, sizing: "fillPrintArea", attributes: v.attributes, assets: i.files.map((f) => ({ printArea: f.type === "front" ? "default" : f.type, url: f.url })) };
      }),
    },
  });
  return mapOrder(r.order);
}

export async function getOrder(id: string) {
  const r = await pdg(`/orders/${encodeURIComponent(id)}`, z.object({ order }).passthrough());
  return mapOrder(r.order);
}

export async function getOrderByExternalId(externalId: string) {
  const r = await pdg(`/orders?merchantReferences=${encodeURIComponent(externalId)}&top=1`, z.object({ orders: z.array(order).optional().default([]) }).passthrough());
  return r.orders[0] ? mapOrder(r.orders[0]) : null;
}

export async function cancelOrder(id: string) {
  await pdg(`/orders/${encodeURIComponent(id)}/actions/cancel`, z.unknown(), { method: "POST" });
}

/* ───────────── callbacks ───────────── */

export function parseProdigiCallback(req: WebhookRequest): NormalizedWebhookEvent {
  const secret = env.prodigiWebhookSecret();
  const token = req.url.searchParams.get("token") ?? "";
  if (!secret || token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) throw new Error("WEBHOOK_AUTH_FAILED");
  const body = z.object({ id: z.string(), type: z.string(), data: z.object({ order: order.partial().extend({ id: z.string() }).passthrough() }).passthrough().optional() }).passthrough().parse(JSON.parse(req.rawBody));
  const t = body.type;
  const type: NormalizedWebhookEvent["type"] = /shipment/i.test(t) ? "SHIPMENT_SENT" : /Cancelled/.test(t) ? "ORDER_CANCELLED" : /issue|OnHold/i.test(t) ? "ORDER_ON_HOLD" : "ORDER_UPDATED";
  return { eventId: body.id, rawType: t, type, providerOrderId: body.data?.order?.id ?? null, externalOrderId: (body.data?.order?.merchantReference as string | undefined) ?? null, reason: null, stock: null, payload: body };
}

export async function prodigiHealth(): Promise<HealthResult> {
  const started = Date.now();
  try {
    await getProdigiProduct("GLOBAL-FAP-16X20");
    const latency = Date.now() - started;
    return { status: latency > 5000 ? "DEGRADED" : "ONLINE", latencyMs: latency, checks: { authentication: { ok: true }, products: { ok: true } } };
  } catch (e) {
    const status = isProviderError(e) ? e.status : null;
    return { status: status === 401 || status === 403 ? "ERROR" : "OFFLINE", latencyMs: Date.now() - started, checks: { authentication: { ok: false, detail: e instanceof Error ? e.message : String(e) } } };
  }
}

export const PRODIGI_CAPABILITIES: ProviderCapabilities = {
  catalog_api: false, // per-SKU product details only (no catalogue listing)
  product_api: true,
  variant_api: true,
  order_api: true,
  shipping_api: true,
  tracking_api: true,
  webhook_api: true,
  webhook_registration_api: true, // callbackUrl is sent with each order
  webhook_signature: false,
  stock_api: false,
  mockup_api: false,
  product_creation_api: false,
  cost_estimate_api: true,
  cancel_api: true,
};

export class ProdigiProvider implements FulfillmentProvider {
  readonly id = "prodigi";
  readonly name = "Prodigi";
  readonly capabilities = PRODIGI_CAPABILITIES;
  readonly externalIdLookup = true;
  isConfigured() {
    return isConfigured.prodigi();
  }
  async getCatalogProducts() {
    return [];
  }
  async getProduct(sku: string) {
    const p = await getProdigiProduct(sku);
    return { externalId: p.sku, title: p.description ?? p.sku, type: null, brand: null, model: null, image: null, categoryHint: "WALL_ART", techniques: ["DIGITAL"], placements: Object.keys(p.printAreas ?? { default: 1 }), discontinued: false, variantCount: p.variants.length, currency: "EUR", raw: p };
  }
  async getProductVariants(sku: string) {
    const p = await getProdigiProduct(sku);
    return p.variants.map((v) => mapProdigiVariant(p.sku, v.attributes, Object.values(v.attributes).join(" / ") || p.sku, null));
  }
  async getProductAvailability(sku: string) {
    const v = await this.getProductVariants(sku);
    return { productId: sku, variants: v.map((x) => ({ externalId: x.externalId, status: x.status, regions: {} })) };
  }
  async createProduct(): Promise<{ id: string }> {
    throw new Error("Prodigi has no product creation API");
  }
  async updateProduct(id: string) {
    return { id };
  }
  createOrder = createOrder;
  async confirmOrder(id: string) {
    return getOrder(id);
  }
  getOrder = getOrder;
  getOrderByExternalId = getOrderByExternalId;
  cancelOrder = cancelOrder;
  async getShipment(id: string) {
    return (await getOrder(id)).shipments;
  }
  async getTracking(id: string) {
    return (await getOrder(id)).shipments;
  }
  async registerWebhook() {
    return { registered: Boolean(env.prodigiWebhookSecret()), note: "Prodigi callbacks are sent per order (callbackUrl). Set PRODIGI_WEBHOOK_SECRET." };
  }
  async handleWebhook(req: WebhookRequest) {
    return parseProdigiCallback(req);
  }
  calculateCost = estimateCosts;
  calculateShipping = shippingRates;
  healthCheck = prodigiHealth;
}

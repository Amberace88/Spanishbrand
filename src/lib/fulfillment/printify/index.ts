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
  NormalizedCatalogProduct,
  NormalizedOrderStatus,
  NormalizedVariant,
  NormalizedWebhookEvent,
  ProviderCapabilities,
  ProviderOrderInput,
  ProviderOrderSnapshot,
  ProviderShipment,
  ShippingQuoteInput,
  ShippingRate,
  WebhookRequest,
} from "../types";

/**
 * Printify adapter (REST v1, https://developers.printify.com).
 * Product IDs in our mappings are "<blueprint_id>:<print_provider_id>"; variant IDs are Printify catalog variant IDs.
 * Orders are created from catalog data + print file URLs (no dependency on Printify shop products).
 */
export const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

function headers() {
  const token = env.printifyApiToken();
  if (!token) throw new ProviderNotConfiguredError("printify");
  return { Authorization: `Bearer ${token}`, "User-Agent": "ROJO-Y-GUALDA-Store/1.0" };
}

const errBody = z.object({ message: z.string().optional(), error: z.unknown().optional(), errors: z.unknown().optional() }).passthrough();
const errorMessage = (body: unknown) => {
  const p = errBody.safeParse(body);
  if (!p.success) return undefined;
  const extra = p.data.errors ? ` ${JSON.stringify(p.data.errors).slice(0, 300)}` : "";
  return (p.data.message ?? (typeof p.data.error === "string" ? p.data.error : undefined) ?? "") + extra || undefined;
};

export function pfy<T>(path: string, schema: z.ZodType<T>, init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; timeoutMs?: number } = {}) {
  return providerRequest<T>({ provider: "printify", baseUrl: PRINTIFY_BASE_URL, path, method: init.method, body: init.body, headers: headers(), schema, timeoutMs: init.timeoutMs, errorMessage });
}

/* ───────────── shop ───────────── */

let shopCache: string | null = null;
export async function shopId(): Promise<string> {
  const configured = env.printifyShopId();
  if (configured) return configured;
  if (shopCache) return shopCache;
  const shops = await pfy("/shops.json", z.array(z.object({ id: z.number(), title: z.string(), sales_channel: z.string().optional() }).passthrough()));
  // Prefer an API / custom-integration shop; otherwise the first one.
  const s = shops.find((x) => /api|custom|other/i.test(x.sales_channel ?? "")) ?? shops[0];
  if (!s) throw new Error("PRINTIFY_NO_SHOP: create a shop (Manual order / API) in Printify first");
  shopCache = String(s.id);
  return shopCache;
}

/* ───────────── catalog ───────────── */

const blueprint = z.object({ id: z.number(), title: z.string(), description: z.string().optional(), brand: z.string().optional(), model: z.string().optional(), images: z.array(z.string()).optional() }).passthrough();
export type PrintifyBlueprint = z.infer<typeof blueprint>;

export async function listBlueprints() {
  return pfy("/catalog/blueprints.json", z.array(blueprint), { timeoutMs: 30_000 });
}
export async function getBlueprint(id: string) {
  return pfy(`/catalog/blueprints/${encodeURIComponent(id)}.json`, blueprint);
}
export async function blueprintProviders(id: string) {
  return pfy(`/catalog/blueprints/${encodeURIComponent(id)}/print_providers.json`, z.array(z.object({ id: z.number(), title: z.string(), location: z.object({ country: z.string().optional() }).passthrough().optional() }).passthrough()));
}
const providerDetail = z
  .object({
    id: z.number(),
    title: z.string(),
    location: z.object({ country: z.string().optional(), city: z.string().optional() }).passthrough().optional(),
    blueprints: z.array(z.object({ id: z.number(), title: z.string() }).passthrough()).optional(),
  })
  .passthrough();
export async function printProvider(id: string) {
  return pfy(`/catalog/print_providers/${encodeURIComponent(id)}.json`, providerDetail);
}
export async function listPrintProviders() {
  return pfy("/catalog/print_providers.json", z.array(z.object({ id: z.number(), title: z.string(), location: z.object({ country: z.string().optional() }).passthrough().optional() }).passthrough()), { timeoutMs: 20_000 });
}

/** EU-located print providers with the blueprints each one makes (cached per instance for 1h). */
let euIndexCache: { at: number; data: { id: number; title: string; country: string; blueprints: { id: number; title: string }[] }[] } | null = null;
export async function euProviderIndex(countries: readonly string[]) {
  if (euIndexCache && Date.now() - euIndexCache.at < 3_600_000) return euIndexCache.data;
  const all = await listPrintProviders();
  const eu = all.filter((p) => countries.includes(p.location?.country ?? ""));
  const details = await Promise.all(eu.map((p) => printProvider(String(p.id)).catch(() => null)));
  const data = details.filter((d): d is z.infer<typeof providerDetail> => Boolean(d)).map((d) => ({ id: d.id, title: d.title, country: d.location?.country ?? "", blueprints: (d.blueprints ?? []).map((b) => ({ id: b.id, title: b.title })) }));
  euIndexCache = { at: Date.now(), data };
  return data;
}
const pVariant = z
  .object({
    id: z.number(),
    title: z.string(),
    options: z.record(z.string(), z.unknown()).optional(),
    placeholders: z.array(z.object({ position: z.string(), height: z.number(), width: z.number() }).passthrough()).optional(),
  })
  .passthrough();
export async function providerVariants(blueprintId: string, providerId: string) {
  const r = await pfy(`/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, z.object({ id: z.number().optional(), title: z.string().optional(), variants: z.array(pVariant) }).passthrough());
  return r.variants;
}
export async function providerShipping(blueprintId: string, providerId: string) {
  return pfy(
    `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/shipping.json`,
    z.object({ handling_time: z.object({ value: z.number(), unit: z.string() }).partial().optional(), profiles: z.array(z.object({ variant_ids: z.array(z.number()), first_item: z.object({ cost: z.number(), currency: z.string() }), countries: z.array(z.string()) }).passthrough()) }).passthrough(),
  );
}

const opt = (o: Record<string, unknown> | undefined, k: string) => (o && typeof o[k] === "string" ? (o[k] as string) : null);
export function mapPrintifyVariant(v: z.infer<typeof pVariant>, cost: number | null = null): NormalizedVariant {
  return {
    externalId: String(v.id),
    name: v.title,
    size: opt(v.options, "size") ?? opt(v.options, "sizes"),
    color: opt(v.options, "color") ?? opt(v.options, "colors"),
    colorCode: null,
    cost,
    currency: cost != null ? "EUR" : null,
    inStock: null,
    status: "ACTIVE",
    availability: {},
    image: null,
    raw: v,
  };
}

/** Upload an image by URL into the Printify media library. */
export async function uploadImage(url: string, fileName: string) {
  return pfy("/uploads/images.json", z.object({ id: z.string(), preview_url: z.string().optional(), width: z.number().optional(), height: z.number().optional() }).passthrough(), { method: "POST", body: { file_name: fileName, url }, timeoutMs: 30_000 });
}

/** Create a shop product (used for mockups + exact variant costs). Prices in cents. */
export async function createShopProduct(input: { title: string; description: string; blueprintId: number; providerId: number; variants: { id: number; price: number }[]; position: string; imageId: string; scale?: number }) {
  const sid = await shopId();
  return pfy(
    `/shops/${sid}/products.json`,
    z
      .object({
        id: z.string(),
        images: z.array(z.object({ src: z.string(), variant_ids: z.array(z.number()), position: z.string().optional(), is_default: z.boolean().optional() }).passthrough()).optional(),
        variants: z.array(z.object({ id: z.number(), cost: z.number().optional(), price: z.number().optional(), is_enabled: z.boolean().optional() }).passthrough()).optional(),
      })
      .passthrough(),
    {
      method: "POST",
      timeoutMs: 30_000,
      body: {
        title: input.title,
        description: input.description,
        blueprint_id: input.blueprintId,
        print_provider_id: input.providerId,
        variants: input.variants.map((v, i) => ({ id: v.id, price: v.price, is_enabled: true, is_default: i === 0 })),
        print_areas: [{ variant_ids: input.variants.map((v) => v.id), placeholders: [{ position: input.position, images: [{ id: input.imageId, x: 0.5, y: 0.5, scale: input.scale ?? 1, angle: 0 }] }] }],
      },
    },
  );
}
export async function getShopProduct(productId: string) {
  const sid = await shopId();
  return pfy(
    `/shops/${sid}/products/${encodeURIComponent(productId)}.json`,
    z.object({ id: z.string(), images: z.array(z.object({ src: z.string(), variant_ids: z.array(z.number()), position: z.string().optional(), is_default: z.boolean().optional() }).passthrough()).optional(), variants: z.array(z.object({ id: z.number(), cost: z.number().optional() }).passthrough()).optional() }).passthrough(),
  );
}

/* ───────────── orders ───────────── */

const order = z
  .object({
    id: z.string(),
    status: z.string().optional(),
    external_id: z.string().nullable().optional(),
    total_price: z.number().nullable().optional(),
    total_shipping: z.number().nullable().optional(),
    shipments: z.array(z.object({ carrier: z.string().nullable().optional(), number: z.string().nullable().optional(), url: z.string().nullable().optional(), delivered_at: z.string().nullable().optional() }).passthrough()).optional(),
    shipped_at: z.string().nullable().optional(),
  })
  .passthrough();

function mapStatus(s: string): NormalizedOrderStatus {
  switch (s) {
    case "pending":
    case "on-hold":
    case "payment-not-received":
      return "PENDING";
    case "sending-to-production":
    case "in-production":
      return "IN_PRODUCTION";
    case "partially-fulfilled":
      return "PARTIALLY_SHIPPED";
    case "fulfilled":
      return "SHIPPED";
    case "canceled":
    case "cancelled":
      return "CANCELLED";
    case "had-issues":
      return "ON_HOLD";
    default:
      return "ACCEPTED";
  }
}

function mapOrder(o: z.infer<typeof order>): ProviderOrderSnapshot {
  const shipments: ProviderShipment[] = (o.shipments ?? []).map((s, i) => ({ providerShipmentId: `${o.id}-${i}`, carrier: s.carrier ?? null, service: null, trackingNumber: s.number ?? null, trackingUrl: s.url ?? null, shippedAt: o.shipped_at ?? null }));
  return {
    providerOrderId: o.id,
    externalId: o.external_id ?? null,
    status: mapStatus(o.status ?? ""),
    rawStatus: o.status ?? "",
    costs: { total: o.total_price != null ? o.total_price / 100 : null, shipping: o.total_shipping != null ? o.total_shipping / 100 : null, currency: "EUR" },
    shipments,
    raw: o,
  };
}

const [bpOf, ppOf] = [(pid: string | null) => Number((pid ?? "").split(":")[0]), (pid: string | null) => Number((pid ?? "").split(":")[1])];

function address(r: ProviderOrderInput["recipient"]) {
  const [first, ...rest] = r.name.trim().split(/\s+/);
  return { first_name: first ?? r.name, last_name: rest.join(" ") || first || "-", email: r.email, phone: r.phone ?? "", country: r.country, region: r.state ?? "", address1: r.line1, address2: r.line2 ?? "", city: r.city, zip: r.postalCode };
}

function lineItems(input: ProviderOrderInput) {
  return input.items.map((i) => ({
    print_provider_id: ppOf(i.providerProductId),
    blueprint_id: bpOf(i.providerProductId),
    variant_id: Number(i.providerVariantId),
    quantity: i.quantity,
    print_areas: Object.fromEntries(i.files.map((f) => [f.type === "default" ? "front" : f.type, f.url])),
  }));
}

export async function createOrder(input: ProviderOrderInput): Promise<ProviderOrderSnapshot> {
  const sid = await shopId();
  const created = await pfy(`/shops/${sid}/orders.json`, z.object({ id: z.string() }).passthrough(), {
    method: "POST",
    timeoutMs: 30_000,
    body: { external_id: input.externalId, label: input.externalId, line_items: lineItems(input), shipping_method: 1, send_shipping_notification: false, address_to: address(input.recipient) },
  });
  if (input.confirm) {
    await pfy(`/shops/${sid}/orders/${created.id}/send_to_production.json`, z.unknown(), { method: "POST" });
  }
  return getOrder(created.id);
}
export async function getOrder(id: string) {
  const sid = await shopId();
  return mapOrder(await pfy(`/shops/${sid}/orders/${encodeURIComponent(id)}.json`, order));
}
export async function confirmOrder(id: string) {
  const sid = await shopId();
  await pfy(`/shops/${sid}/orders/${encodeURIComponent(id)}/send_to_production.json`, z.unknown(), { method: "POST" });
  return getOrder(id);
}
export async function cancelOrder(id: string) {
  const sid = await shopId();
  await pfy(`/shops/${sid}/orders/${encodeURIComponent(id)}/cancel.json`, z.unknown(), { method: "POST" });
}

const shippingCalc = z.record(z.string(), z.number());
async function shippingFor(country: string, items: { blueprintId: number; providerId: number; variantId: number; quantity: number }[], recipient?: ProviderOrderInput["recipient"]) {
  const sid = await shopId();
  return pfy(`/shops/${sid}/orders/shipping.json`, shippingCalc, {
    method: "POST",
    body: {
      line_items: items.map((i) => ({ print_provider_id: i.providerId, blueprint_id: i.blueprintId, variant_id: i.variantId, quantity: i.quantity })),
      address_to: recipient ? address(recipient) : { first_name: "Quote", last_name: "Quote", email: "quote@example.com", phone: "", country, region: "", address1: "Calle Mayor 1", address2: "", city: "Madrid", zip: "28013" },
    },
  });
}

/**
 * Non-charging cost check: shipping via the calculator + production cost from the catalog mapping
 * (Printify does not expose a quote endpoint for production cost; costs come from shop products).
 */
export async function estimateCosts(input: ProviderOrderInput): Promise<CostEstimate> {
  const res = await shippingFor(input.recipient.country, input.items.map((i) => ({ blueprintId: bpOf(i.providerProductId), providerId: ppOf(i.providerProductId), variantId: Number(i.providerVariantId), quantity: i.quantity })), input.recipient);
  const shipping = (res.standard ?? Object.values(res)[0] ?? 0) / 100;
  return { currency: "EUR", production: null, shipping, tax: null, total: null, raw: res };
}

export async function shippingRates(input: ShippingQuoteInput): Promise<ShippingRate[]> {
  const res = await shippingFor(input.country, input.items.map((i) => ({ blueprintId: bpOf(i.providerProductId ?? null), providerId: ppOf(i.providerProductId ?? null), variantId: Number(i.providerVariantId), quantity: i.quantity })));
  return Object.entries(res).map(([k, v]) => ({ id: k, name: k, rate: v / 100, currency: "EUR", minDays: null, maxDays: null }));
}

/* ───────────── webhooks ───────────── */

export async function registerWebhook(url: string) {
  const secret = env.printifyWebhookSecret();
  if (!secret) return { registered: false, note: "Set PRINTIFY_WEBHOOK_SECRET first" };
  const sid = await shopId();
  const target = `${url}?token=${encodeURIComponent(secret)}`;
  // Idempotent: keep hooks that already point at the current URL+token, drop stale ones for our endpoint.
  const existing = await pfy(`/shops/${sid}/webhooks.json`, z.array(z.object({ id: z.string(), topic: z.string(), url: z.string() }).passthrough())).catch(() => []);
  const have = new Set<string>();
  for (const h of existing) {
    if (!h.url.startsWith(url)) continue;
    if (h.url === target) {
      have.add(h.topic);
      continue;
    }
    await pfy(`/shops/${sid}/webhooks/${h.id}.json?host=${encodeURIComponent(new URL(url).host)}`, z.unknown(), { method: "DELETE" }).catch(() => null);
  }
  for (const topic of ["order:updated", "order:sent-to-production", "order:shipment:created", "order:shipment:delivered"]) {
    if (have.has(topic)) continue;
    try {
      await pfy(`/shops/${sid}/webhooks.json`, z.unknown(), { method: "POST", body: { topic, url: target, secret } });
    } catch (e) {
      if (!(isProviderError(e) && (e.status === 409 || e.status === 400))) throw e;
    }
  }
  return { registered: true };
}

export function parsePrintifyWebhook(req: WebhookRequest): NormalizedWebhookEvent {
  const secret = env.printifyWebhookSecret();
  const token = req.url.searchParams.get("token") ?? "";
  if (!secret || token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) throw new Error("WEBHOOK_AUTH_FAILED");
  const body = z.object({ id: z.string(), type: z.string(), resource: z.object({ id: z.string(), type: z.string().optional(), data: z.record(z.string(), z.unknown()).optional() }).passthrough() }).passthrough().parse(JSON.parse(req.rawBody));
  const t = body.type;
  const status = String(body.resource.data?.status ?? "");
  const type: NormalizedWebhookEvent["type"] = t.includes("shipment") ? "SHIPMENT_SENT" : status === "canceled" ? "ORDER_CANCELLED" : status === "had-issues" ? "ORDER_ON_HOLD" : t.startsWith("order") ? "ORDER_UPDATED" : t.startsWith("product") ? "PRODUCT_UPDATED" : "UNKNOWN";
  return { eventId: body.id, rawType: t, type, providerOrderId: body.resource.type === "order" || t.startsWith("order") ? body.resource.id : null, externalOrderId: null, reason: null, stock: null, payload: body };
}

/* ───────────── health ───────────── */

export async function printifyHealth(): Promise<HealthResult> {
  const started = Date.now();
  try {
    await shopId();
    const latency = Date.now() - started;
    return { status: latency > 5000 ? "DEGRADED" : "ONLINE", latencyMs: latency, checks: { authentication: { ok: true }, shop: { ok: true } } };
  } catch (e) {
    const status = isProviderError(e) ? e.status : null;
    return { status: status === 401 || status === 403 ? "ERROR" : "OFFLINE", latencyMs: Date.now() - started, checks: { authentication: { ok: false, detail: e instanceof Error ? e.message : String(e) } } };
  }
}

export const PRINTIFY_CAPABILITIES: ProviderCapabilities = {
  catalog_api: true,
  product_api: true,
  variant_api: true,
  order_api: true,
  shipping_api: true,
  tracking_api: true,
  webhook_api: true,
  webhook_registration_api: true,
  webhook_signature: false, // verified with a secret URL token + order re-fetch
  stock_api: false,
  mockup_api: true, // via shop products
  product_creation_api: true,
  cost_estimate_api: true, // shipping calculator; production cost from shop products
  cancel_api: true,
};

export class PrintifyProvider implements FulfillmentProvider {
  readonly id = "printify";
  readonly name = "Printify";
  readonly capabilities = PRINTIFY_CAPABILITIES;
  readonly externalIdLookup = false;
  isConfigured() {
    return isConfigured.printify();
  }
  async getCatalogProducts(): Promise<NormalizedCatalogProduct[]> {
    const list = await listBlueprints();
    return list.map((b) => ({ externalId: String(b.id), title: b.title, type: null, brand: b.brand ?? null, model: b.model ?? null, image: b.images?.[0] ?? null, categoryHint: null, techniques: [], placements: [], discontinued: false, variantCount: 0, currency: "EUR", raw: b }));
  }
  async getProduct(id: string) {
    const b = await getBlueprint(id.split(":")[0]);
    return { externalId: id, title: b.title, type: null, brand: b.brand ?? null, model: b.model ?? null, image: b.images?.[0] ?? null, categoryHint: null, techniques: [], placements: [], discontinued: false, variantCount: 0, currency: "EUR", raw: b };
  }
  async getProductVariants(id: string) {
    const [bp, pp] = id.split(":");
    if (!pp) return [];
    return (await providerVariants(bp, pp)).map((v) => mapPrintifyVariant(v));
  }
  async getProductAvailability(id: string) {
    const v = await this.getProductVariants(id);
    return { productId: id, variants: v.map((x) => ({ externalId: x.externalId, status: x.status, regions: {} })) };
  }
  async createProduct(): Promise<{ id: string }> {
    throw new Error("Use the catalog builder to create Printify products");
  }
  async updateProduct(id: string) {
    return { id };
  }
  createOrder = createOrder;
  confirmOrder = confirmOrder;
  getOrder = getOrder;
  async getOrderByExternalId() {
    return null;
  }
  cancelOrder = cancelOrder;
  async getShipment(id: string) {
    return (await getOrder(id)).shipments;
  }
  async getTracking(id: string) {
    return (await getOrder(id)).shipments;
  }
  registerWebhook = registerWebhook;
  async handleWebhook(req: WebhookRequest) {
    return parsePrintifyWebhook(req);
  }
  calculateCost = estimateCosts;
  calculateShipping = shippingRates;
  healthCheck = printifyHealth;
}

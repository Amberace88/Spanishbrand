/**
 * Generic fulfillment provider abstraction.
 * The application talks ONLY to this interface — never `if (provider === "printful")`.
 */

export type ProviderId = "printful" | "gelato" | (string & {});

export const CAPABILITIES = [
  "catalog_api",
  "product_api",
  "variant_api",
  "order_api",
  "shipping_api",
  "tracking_api",
  "webhook_api",
  "webhook_registration_api",
  "webhook_signature",
  "stock_api",
  "mockup_api",
  "product_creation_api",
  "cost_estimate_api",
  "cancel_api",
] as const;
export type Capability = (typeof CAPABILITIES)[number];
export type ProviderCapabilities = Record<Capability, boolean>;

export type HealthStatus = "ONLINE" | "DEGRADED" | "OFFLINE" | "ERROR" | "UNKNOWN";

export interface HealthResult {
  status: HealthStatus;
  latencyMs: number | null;
  checks: Record<string, { ok: boolean; detail?: string }>;
}

export interface NormalizedVariant {
  externalId: string;
  name: string;
  size: string | null;
  color: string | null;
  colorCode: string | null;
  cost: number | null;
  currency: string | null;
  inStock: boolean | null;
  status: "ACTIVE" | "OUT_OF_STOCK" | "DISCONTINUED" | "UNKNOWN";
  availability: Record<string, string>;
  image: string | null;
  raw: unknown;
}

export interface NormalizedCatalogProduct {
  externalId: string;
  title: string;
  type: string | null;
  brand: string | null;
  model: string | null;
  image: string | null;
  categoryHint: string | null;
  techniques: string[];
  placements: string[];
  discontinued: boolean;
  variantCount: number;
  currency: string | null;
  raw: unknown;
}

export interface AvailabilityResult {
  productId: string;
  variants: { externalId: string; status: NormalizedVariant["status"]; regions: Record<string, string> }[];
}

export interface Address {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  postalCode: string;
  state?: string | null;
  country: string; // ISO2
  email: string;
  phone?: string | null;
}

export interface PrintFile {
  type: string; // placement: front, back, default, ...
  url: string;
}

export interface ProviderOrderItem {
  referenceId: string; // our order_item id
  providerProductId: string | null;
  providerVariantId: string;
  quantity: number;
  retailPrice: number;
  name: string;
  files: PrintFile[];
  options?: { id: string; value: unknown }[];
}

export interface ProviderOrderInput {
  externalId: string; // idempotency key e.g. "10025-printful"
  currency: string;
  recipient: Address;
  items: ProviderOrderItem[];
  shippingMethod?: string | null;
  retail?: { subtotal: number; discount: number; shipping: number; tax: number };
  confirm: boolean;
}

export type NormalizedOrderStatus =
  | "DRAFT"
  | "PENDING"
  | "ACCEPTED"
  | "IN_PRODUCTION"
  | "ON_HOLD"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"
  | "RETURNED";

export interface ProviderShipment {
  providerShipmentId: string;
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  estimatedMin?: string | null;
  estimatedMax?: string | null;
}

export interface ProviderOrderSnapshot {
  providerOrderId: string;
  externalId: string | null;
  status: NormalizedOrderStatus;
  rawStatus: string;
  costs: { total: number | null; shipping: number | null; currency: string | null };
  shipments: ProviderShipment[];
  raw: unknown;
}

export interface CostEstimate {
  currency: string;
  production: number | null;
  shipping: number | null;
  tax: number | null;
  total: number | null;
  raw: unknown;
}

export interface ShippingRate {
  id: string;
  name: string;
  rate: number;
  currency: string;
  minDays: number | null;
  maxDays: number | null;
}

export interface ShippingQuoteInput {
  country: string;
  postalCode?: string;
  state?: string;
  currency: string;
  items: { providerVariantId: string; providerProductId?: string | null; quantity: number; files?: PrintFile[] }[];
}

export type NormalizedWebhookType =
  | "ORDER_UPDATED"
  | "ORDER_FAILED"
  | "ORDER_CANCELLED"
  | "ORDER_ON_HOLD"
  | "SHIPMENT_SENT"
  | "SHIPMENT_RETURNED"
  | "TRACKING_UPDATED"
  | "STOCK_UPDATED"
  | "PRODUCT_UPDATED"
  | "UNKNOWN";

export interface NormalizedWebhookEvent {
  eventId: string;
  rawType: string;
  type: NormalizedWebhookType;
  providerOrderId: string | null;
  externalOrderId: string | null;
  reason: string | null;
  stock?: { outOfStock: string[]; discontinued: string[] } | null;
  payload: unknown;
}

export interface WebhookRequest {
  url: URL;
  headers: Headers;
  rawBody: string;
}

export interface CreateStoreProductInput {
  title: string;
  providerProductId: string;
  variants: { providerVariantId: string; retailPrice: number; files: PrintFile[] }[];
  externalId?: string;
}

export interface FulfillmentProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  isConfigured(): boolean;

  getCatalogProducts(opts?: { limit?: number; offset?: number; categoryId?: string }): Promise<NormalizedCatalogProduct[]>;
  getProduct(productId: string): Promise<NormalizedCatalogProduct | null>;
  getProductVariants(productId: string): Promise<NormalizedVariant[]>;
  getProductAvailability(productId: string): Promise<AvailabilityResult>;
  createProduct(input: CreateStoreProductInput): Promise<{ id: string }>;
  updateProduct(id: string, input: Partial<CreateStoreProductInput>): Promise<{ id: string }>;

  createOrder(input: ProviderOrderInput): Promise<ProviderOrderSnapshot>;
  confirmOrder(providerOrderId: string): Promise<ProviderOrderSnapshot>;
  getOrder(providerOrderId: string): Promise<ProviderOrderSnapshot>;
  getOrderByExternalId(externalId: string): Promise<ProviderOrderSnapshot | null>;
  cancelOrder(providerOrderId: string): Promise<void>;
  getShipment(providerOrderId: string): Promise<ProviderShipment[]>;
  getTracking(providerOrderId: string): Promise<ProviderShipment[]>;

  registerWebhook(url: string): Promise<{ registered: boolean; note?: string }>;
  handleWebhook(req: WebhookRequest): Promise<NormalizedWebhookEvent>;

  calculateCost(input: ProviderOrderInput): Promise<CostEstimate>;
  calculateShipping(input: ShippingQuoteInput): Promise<ShippingRate[]>;
  healthCheck(): Promise<HealthResult>;
}

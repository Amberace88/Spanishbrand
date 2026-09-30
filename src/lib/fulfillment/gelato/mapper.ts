import type {
  NormalizedCatalogProduct,
  NormalizedOrderStatus,
  NormalizedVariant,
  ProviderOrderInput,
  ProviderOrderSnapshot,
  ProviderShipment,
} from "../types";
import type { GlOrder, GlProduct } from "./types";

/**
 * Normalization: a Gelato *catalog* (e.g. "t-shirts", "posters") is our provider product;
 * each Gelato *productUid* (fully-specified size/color/paper) is a provider variant.
 */
const CATALOG_TO_CATEGORY: Array<[RegExp, string]> = [
  [/t-?shirt|hoodie|sweatshirt|tank|polo|apparel|long-sleeve/i, "APPAREL"],
  [/cap|hat|beanie/i, "HEADWEAR"],
  [/tote|bag/i, "BAGS"],
  [/phone|case/i, "TECH_ACCESSORIES"],
  [/mug|bottle|tumbler/i, "DRINKWARE"],
  [/poster|canvas|frame|acrylic|metallic|wood|foam|wall/i, "WALL_ART"],
  [/blanket|pillow|towel/i, "HOME_LIVING"],
  [/card|notebook|brochure|flyer|sticker/i, "STATIONERY"],
  [/calendar/i, "CALENDARS"],
];

export function categoryFromGelato(catalogUid: string, title: string): string | null {
  const hay = `${catalogUid} ${title}`;
  for (const [re, code] of CATALOG_TO_CATEGORY) if (re.test(hay)) return code;
  return null;
}

export function mapCatalog(c: { catalogUid: string; title: string }, variantCount = 0): NormalizedCatalogProduct {
  return {
    externalId: c.catalogUid,
    title: c.title,
    type: c.title,
    brand: null,
    model: null,
    image: null,
    categoryHint: categoryFromGelato(c.catalogUid, c.title),
    techniques: [],
    placements: [],
    discontinued: false,
    variantCount,
    currency: null,
    raw: c,
  };
}

const SIZE_KEYS = ["GarmentSize", "PaperFormat", "MugSize", "ProductSize", "Size", "CanvasFormat", "FrameSize"];
const COLOR_KEYS = ["GarmentColor", "ColorType", "FrameColor", "Color", "MugMaterial"];

function pick(attrs: Record<string, string>, keys: string[]) {
  for (const k of keys) if (attrs[k]) return attrs[k];
  return null;
}

export function mapProductAsVariant(p: GlProduct): NormalizedVariant {
  const attrs = p.attributes ?? {};
  const size = pick(attrs, SIZE_KEYS);
  const color = pick(attrs, COLOR_KEYS);
  return {
    externalId: p.productUid,
    name: [size, color].filter(Boolean).join(" / ") || p.productUid,
    size,
    color,
    colorCode: null,
    cost: null, // resolved on demand via GET /products/{uid}/prices
    currency: null,
    inStock: null,
    status: p.isPrintable === false ? "UNKNOWN" : "ACTIVE",
    availability: {},
    image: null,
    raw: p,
  };
}

export function mapStockStatus(status: string): NormalizedVariant["status"] {
  switch (status) {
    case "in-stock":
    case "non-stockable": // made on demand
      return "ACTIVE";
    case "out-of-stock-replenishable":
    case "out-of-stock":
      return "OUT_OF_STOCK";
    case "not-supported":
      return "DISCONTINUED";
    default:
      return "UNKNOWN";
  }
}

export function mapOrderStatus(s: string): NormalizedOrderStatus {
  switch (s) {
    case "draft":
      return "DRAFT";
    case "created":
    case "uploading":
    case "passed":
    case "pending_approval":
    case "pending_personalization":
    case "not_connected":
      return "ACCEPTED";
    case "in_production":
    case "printed":
    case "digitizing":
      return "IN_PRODUCTION";
    case "on_hold":
      return "ON_HOLD";
    case "shipped":
    case "in_transit":
      return "SHIPPED";
    case "delivered":
      return "DELIVERED";
    case "returned":
      return "RETURNED";
    case "failed":
      return "FAILED";
    case "canceled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export function mapShipments(o: GlOrder): ProviderShipment[] {
  const s = o.shipment;
  if (!s) return [];
  return (s.packages ?? [])
    .filter((p) => p.trackingCode || p.trackingUrl)
    .map((p, idx) => ({
      providerShipmentId: p.id ?? `${s.id ?? o.id}-${idx}`,
      carrier: s.shipmentMethodName ?? null,
      service: s.shipmentMethodUid ?? null,
      trackingNumber: p.trackingCode ?? null,
      trackingUrl: p.trackingUrl ?? null,
      shippedAt: null,
      estimatedMin: s.minDeliveryDate ?? null,
      estimatedMax: s.maxDeliveryDate ?? null,
    }));
}

export function mapOrder(o: GlOrder): ProviderOrderSnapshot {
  const receipt = o.receipts?.[0];
  return {
    providerOrderId: o.id,
    externalId: o.orderReferenceId ?? null,
    status: mapOrderStatus(o.fulfillmentStatus),
    rawStatus: o.fulfillmentStatus,
    costs: { total: receipt?.totalInclVat ?? null, shipping: null, currency: receipt?.currency ?? o.currency ?? null },
    shipments: mapShipments(o),
    raw: o,
  };
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  const first = parts.shift() ?? full;
  const last = parts.join(" ") || first;
  return { firstName: first.slice(0, 25), lastName: last.slice(0, 25) };
}

export function toGelatoAddress(a: ProviderOrderInput["recipient"]) {
  return {
    ...splitName(a.name),
    addressLine1: a.line1.slice(0, 35),
    addressLine2: a.line2 ? a.line2.slice(0, 35) : undefined,
    city: a.city.slice(0, 30),
    postCode: a.postalCode.slice(0, 15),
    state: a.state ?? undefined,
    country: a.country,
    email: a.email,
    phone: a.phone ?? undefined,
  };
}

export function toGelatoOrderBody(input: ProviderOrderInput) {
  return {
    orderType: input.confirm ? "order" : "draft",
    orderReferenceId: input.externalId,
    customerReferenceId: input.recipient.email,
    currency: input.currency,
    items: input.items.map((i) => ({
      itemReferenceId: i.referenceId,
      productUid: i.providerVariantId,
      quantity: i.quantity,
      files: i.files.map((f) => ({ type: f.type, url: f.url })),
    })),
    shipmentMethodUid: input.shippingMethod ?? "normal",
    shippingAddress: toGelatoAddress(input.recipient),
  };
}

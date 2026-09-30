import { toNumber } from "../http";
import type {
  NormalizedCatalogProduct,
  NormalizedOrderStatus,
  NormalizedVariant,
  ProviderOrderInput,
  ProviderOrderSnapshot,
  ProviderShipment,
} from "../types";
import type { PfCatalogProduct, PfCatalogVariant, PfOrder } from "./types";

/** Printful catalog `type` → internal category code (brand approval still required). */
const TYPE_TO_CATEGORY: Array<[RegExp, string]> = [
  [/t-?shirt|shirt|tank|polo|hoodie|sweatshirt|jacket|long sleeve|crop|dress|leggings/i, "APPAREL"],
  [/hat|cap|beanie|bucket|visor|trucker/i, "HEADWEAR"],
  [/bag|tote|backpack|fanny|duffle|drawstring/i, "BAGS"],
  [/phone|case|laptop|mouse ?pad|airpods/i, "TECH_ACCESSORIES"],
  [/mug|bottle|tumbler|glass|drinkware/i, "DRINKWARE"],
  [/poster|canvas|framed|print|wall/i, "WALL_ART"],
  [/blanket|pillow|towel|cushion|home|apron/i, "HOME_LIVING"],
  [/notebook|journal|sticker|card|postcard/i, "STATIONERY"],
  [/calendar/i, "CALENDARS"],
];

export function categoryFromPrintful(p: Pick<PfCatalogProduct, "type" | "type_name" | "title">): string | null {
  const hay = `${p.type ?? ""} ${p.type_name ?? ""} ${p.title}`;
  for (const [re, code] of TYPE_TO_CATEGORY) if (re.test(hay)) return code;
  return null;
}

export function mapCatalogProduct(p: PfCatalogProduct): NormalizedCatalogProduct {
  return {
    externalId: String(p.id),
    title: p.title,
    type: p.type_name ?? p.type ?? null,
    brand: p.brand ?? null,
    model: p.model ?? null,
    image: p.image ?? null,
    categoryHint: categoryFromPrintful(p),
    techniques: (p.techniques ?? []).map((t) => t.key),
    placements: (p.files ?? []).map((f) => f.type),
    discontinued: Boolean(p.is_discontinued),
    variantCount: p.variant_count ?? 0,
    currency: p.currency ?? null,
    raw: p,
  };
}

export function mapVariantStatus(v: PfCatalogVariant, region = "EU"): NormalizedVariant["status"] {
  const statuses = v.availability_status ?? [];
  const forRegion = statuses.find((s) => s.region === region) ?? statuses[0];
  const s = forRegion?.status?.toLowerCase();
  if (s === "discontinued") return "DISCONTINUED";
  if (s === "out_of_stock" || s === "temporary_out_of_stock") return "OUT_OF_STOCK";
  if (s === "in_stock" || s === "stocked_on_demand" || s === "active") return "ACTIVE";
  if (v.in_stock === false) return "OUT_OF_STOCK";
  if (v.in_stock === true) return "ACTIVE";
  return "UNKNOWN";
}

export function mapCatalogVariant(v: PfCatalogVariant, currency: string | null): NormalizedVariant {
  const availability: Record<string, string> = {};
  for (const s of v.availability_status ?? []) availability[s.region] = s.status;
  return {
    externalId: String(v.id),
    name: v.name,
    size: v.size ?? null,
    color: v.color ?? null,
    colorCode: v.color_code ?? null,
    cost: toNumber(v.price),
    currency,
    inStock: v.in_stock ?? null,
    status: mapVariantStatus(v),
    availability,
    image: v.image ?? null,
    raw: v,
  };
}

/** Printful order status → normalized status. */
export function mapOrderStatus(status: string, shipments: ProviderShipment[] = []): NormalizedOrderStatus {
  switch (status) {
    case "draft":
      return "DRAFT";
    case "pending":
      return "ACCEPTED";
    case "inreview":
    case "inprocess":
      return "IN_PRODUCTION";
    case "onhold":
      return "ON_HOLD";
    case "partial":
      return shipments.length > 0 ? "PARTIALLY_SHIPPED" : "IN_PRODUCTION";
    case "fulfilled":
    case "archived":
      return "SHIPPED";
    case "failed":
      return "FAILED";
    case "canceled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export function mapShipments(o: PfOrder): ProviderShipment[] {
  return (o.shipments ?? []).map((s) => ({
    providerShipmentId: String(s.id),
    carrier: s.carrier ?? null,
    service: s.service ?? null,
    trackingNumber: s.tracking_number != null ? String(s.tracking_number) : null,
    trackingUrl: s.tracking_url ?? null,
    shippedAt: s.shipped_at ? new Date(s.shipped_at * 1000).toISOString() : s.ship_date ?? null,
  }));
}

export function mapOrder(o: PfOrder): ProviderOrderSnapshot {
  const shipments = mapShipments(o);
  return {
    providerOrderId: String(o.id),
    externalId: o.external_id ?? null,
    status: mapOrderStatus(o.status, shipments),
    rawStatus: o.status,
    costs: {
      total: toNumber(o.costs?.total),
      shipping: toNumber(o.costs?.shipping),
      currency: o.costs?.currency ?? null,
    },
    shipments,
    raw: o,
  };
}

/** Internal order input → Printful POST /orders body. */
export function toPrintfulOrderBody(input: ProviderOrderInput) {
  return {
    external_id: input.externalId,
    shipping: input.shippingMethod ?? "STANDARD",
    recipient: {
      name: input.recipient.name,
      address1: input.recipient.line1,
      address2: input.recipient.line2 ?? undefined,
      city: input.recipient.city,
      state_code: input.recipient.state ?? undefined,
      country_code: input.recipient.country,
      zip: input.recipient.postalCode,
      email: input.recipient.email,
      phone: input.recipient.phone ?? undefined,
    },
    items: input.items.map((i) => ({
      variant_id: Number(i.providerVariantId),
      external_id: i.referenceId,
      quantity: i.quantity,
      retail_price: i.retailPrice.toFixed(2),
      name: i.name,
      files: i.files.map((f) => ({ type: f.type, url: f.url })),
      options: i.options,
    })),
    retail_costs: input.retail
      ? {
          currency: input.currency,
          subtotal: input.retail.subtotal.toFixed(2),
          discount: input.retail.discount.toFixed(2),
          shipping: input.retail.shipping.toFixed(2),
          tax: input.retail.tax.toFixed(2),
        }
      : undefined,
  };
}

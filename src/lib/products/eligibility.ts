/**
 * PRODUCT ELIGIBILITY ENGINE (pure — no I/O, fully unit-tested).
 * Mirrors public.product_eligibility() in the database, which is the final guard.
 *
 * "Can I sell this product automatically?"  YES → may publish.  NO → draft only.
 */

import type { Capability } from "@/lib/fulfillment/types";

export type EligibilityFailure =
  | "NO_PRIMARY_PROVIDER_MAPPING"
  | "PROVIDER_INACTIVE"
  | "PROVIDER_NO_ORDER_API"
  | "MISSING_PROVIDER_PRODUCT_ID"
  | "MISSING_PRINT_CONFIG"
  | "MISSING_FULFILLMENT_METHOD"
  | "MAPPING_NOT_APPROVED"
  | "FULFILLMENT_TEST_NOT_PASSED"
  | "NO_ACTIVE_VARIANTS"
  | "UNMAPPED_VARIANTS"
  | "ALL_VARIANTS_OUT_OF_STOCK"
  | "MISSING_PRODUCTION_COST"
  | "MISSING_RETAIL_PRICE"
  | "MISSING_IMAGES"
  | "INCOMPLETE_CONTENT"
  | "NOT_BRAND_APPROVED";

export interface EligibilityInput {
  product: {
    name: string | null;
    slug: string | null;
    description: string | null;
    retailPrice: number | null;
    productionCost: number | null;
    brandApproved: boolean;
    imageCount: number;
  };
  primaryMapping: {
    providerId: string;
    providerActive: boolean;
    capabilities: Partial<Record<Capability, boolean>>;
    providerProductId: string | null;
    printConfig: unknown;
    fulfillmentMethod: string | null;
    approved: boolean;
    testPassedAt: string | null;
  } | null;
  variants: {
    active: boolean;
    discontinued: boolean;
    productionCost: number | null;
    providerVariantId: string | null;
    mappingActive: boolean; // mapping exists and is not discontinued
    outOfStock?: boolean; // temporary — blocks only this variant
  }[];
}

export interface EligibilityResult {
  eligible: boolean;
  failures: EligibilityFailure[];
}

const blank = (s: string | null | undefined) => !s || s.trim() === "";

function hasPrintConfig(cfg: unknown): boolean {
  if (!cfg || typeof cfg !== "object") return false;
  return Object.keys(cfg as object).length > 0;
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const f: EligibilityFailure[] = [];
  const m = input.primaryMapping;

  if (!m) {
    f.push("NO_PRIMARY_PROVIDER_MAPPING");
  } else {
    if (!m.providerActive) f.push("PROVIDER_INACTIVE");
    if (!m.capabilities.order_api) f.push("PROVIDER_NO_ORDER_API");
    if (blank(m.providerProductId)) f.push("MISSING_PROVIDER_PRODUCT_ID");
    if (!hasPrintConfig(m.printConfig)) f.push("MISSING_PRINT_CONFIG");
    if (blank(m.fulfillmentMethod)) f.push("MISSING_FULFILLMENT_METHOD");
    if (!m.approved) f.push("MAPPING_NOT_APPROVED");
    if (!m.testPassedAt) f.push("FULFILLMENT_TEST_NOT_PASSED");

    const active = input.variants.filter((v) => v.active && !v.discontinued);
    if (active.length === 0) f.push("NO_ACTIVE_VARIANTS");
    if (active.some((v) => !v.mappingActive || blank(v.providerVariantId))) f.push("UNMAPPED_VARIANTS");
    if (active.length > 0 && active.every((v) => v.outOfStock)) f.push("ALL_VARIANTS_OUT_OF_STOCK");
    if (active.some((v) => (v.productionCost ?? input.product.productionCost) == null)) f.push("MISSING_PRODUCTION_COST");
  }

  const p = input.product;
  if (p.retailPrice == null || p.retailPrice <= 0) f.push("MISSING_RETAIL_PRICE");
  if (p.imageCount <= 0) f.push("MISSING_IMAGES");
  if (blank(p.name) || blank(p.slug) || blank(p.description)) f.push("INCOMPLETE_CONTENT");
  if (!p.brandApproved) f.push("NOT_BRAND_APPROVED");

  return { eligible: f.length === 0, failures: f };
}

/** Human-readable labels for admin UI (Spanish-first). */
export const FAILURE_LABELS: Record<EligibilityFailure, string> = {
  NO_PRIMARY_PROVIDER_MAPPING: "Sin proveedor principal asignado",
  PROVIDER_INACTIVE: "Proveedor inactivo",
  PROVIDER_NO_ORDER_API: "El proveedor no admite pedidos por API",
  MISSING_PROVIDER_PRODUCT_ID: "Falta ID de producto del proveedor",
  MISSING_PRINT_CONFIG: "Falta configuración de impresión (archivos)",
  MISSING_FULFILLMENT_METHOD: "Falta método de producción",
  MAPPING_NOT_APPROVED: "Mapeo del proveedor no aprobado",
  FULFILLMENT_TEST_NOT_PASSED: "Test de fulfillment no superado",
  NO_ACTIVE_VARIANTS: "Sin variantes activas",
  UNMAPPED_VARIANTS: "Variantes sin mapear al proveedor",
  ALL_VARIANTS_OUT_OF_STOCK: "Todas las variantes sin stock en el proveedor",
  MISSING_PRODUCTION_COST: "Falta coste de producción",
  MISSING_RETAIL_PRICE: "Falta precio de venta",
  MISSING_IMAGES: "Faltan imágenes",
  INCOMPLETE_CONTENT: "Contenido incompleto (nombre, slug, descripción)",
  NOT_BRAND_APPROVED: "Pendiente de aprobación de marca",
};

/**
 * Catalog-level pre-check for imported provider products (before any configuration):
 * provider supports orders, product not discontinued, has variants with known cost.
 */
export function catalogEligibility(input: {
  capabilities: Partial<Record<Capability, boolean>>;
  discontinued: boolean;
  variants: { status: string; cost: number | null }[];
  categoryCode: string | null;
}) {
  const reasons: string[] = [];
  if (!input.capabilities.order_api) reasons.push("PROVIDER_NO_ORDER_API");
  if (input.discontinued) reasons.push("DISCONTINUED");
  const usable = input.variants.filter((v) => v.status === "ACTIVE" || v.status === "UNKNOWN");
  if (usable.length === 0) reasons.push("NO_AVAILABLE_VARIANTS");
  if (!input.categoryCode) reasons.push("UNMAPPED_CATEGORY");
  const costKnown = usable.some((v) => v.cost != null);
  return { eligible: reasons.length === 0, reasons, costKnown };
}

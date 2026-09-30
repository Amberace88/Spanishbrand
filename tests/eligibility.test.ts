import { describe, expect, it } from "vitest";
import { catalogEligibility, evaluateEligibility, type EligibilityInput } from "@/lib/products/eligibility";

const good: EligibilityInput = {
  product: { name: "Heritage Tee", slug: "heritage-tee", description: "Camiseta", retailPrice: 39.9, productionCost: 12, brandApproved: true, imageCount: 2 },
  primaryMapping: {
    providerId: "printful",
    providerActive: true,
    capabilities: { order_api: true },
    providerProductId: "71",
    printConfig: { files: [{ type: "front", url: "https://x/y.png" }] },
    fulfillmentMethod: "DTG",
    approved: true,
    testPassedAt: "2026-09-30T10:00:00Z",
  },
  variants: [{ active: true, discontinued: false, productionCost: 12, providerVariantId: "4012", mappingActive: true }],
};

describe("API fulfillment eligibility engine", () => {
  it("accepts a fully configured product", () => {
    expect(evaluateEligibility(good)).toEqual({ eligible: true, failures: [] });
  });
  it("rejects without primary provider mapping", () => {
    const r = evaluateEligibility({ ...good, primaryMapping: null });
    expect(r.eligible).toBe(false);
    expect(r.failures).toContain("NO_PRIMARY_PROVIDER_MAPPING");
  });
  it("rejects providers without order API", () => {
    const r = evaluateEligibility({ ...good, primaryMapping: { ...good.primaryMapping!, capabilities: { order_api: false } } });
    expect(r.failures).toContain("PROVIDER_NO_ORDER_API");
  });
  it("requires a passed fulfillment test and approval", () => {
    const r = evaluateEligibility({ ...good, primaryMapping: { ...good.primaryMapping!, testPassedAt: null, approved: false } });
    expect(r.failures).toEqual(expect.arrayContaining(["FULFILLMENT_TEST_NOT_PASSED", "MAPPING_NOT_APPROVED"]));
  });
  it("rejects unmapped variants and unknown cost", () => {
    const r = evaluateEligibility({ ...good, product: { ...good.product, productionCost: null }, variants: [{ active: true, discontinued: false, productionCost: null, providerVariantId: null, mappingActive: false }] });
    expect(r.failures).toEqual(expect.arrayContaining(["UNMAPPED_VARIANTS", "MISSING_PRODUCTION_COST"]));
  });
  it("ignores discontinued variants but requires at least one active", () => {
    const r = evaluateEligibility({ ...good, variants: [{ active: true, discontinued: true, productionCost: 1, providerVariantId: "1", mappingActive: true }] });
    expect(r.failures).toContain("NO_ACTIVE_VARIANTS");
  });
  it("requires price, images, content and brand approval", () => {
    const r = evaluateEligibility({ ...good, product: { ...good.product, retailPrice: 0, imageCount: 0, description: " ", brandApproved: false } });
    expect(r.failures).toEqual(expect.arrayContaining(["MISSING_RETAIL_PRICE", "MISSING_IMAGES", "INCOMPLETE_CONTENT", "NOT_BRAND_APPROVED"]));
  });
  it("one out-of-stock variant keeps the product sellable; all out of stock does not", () => {
    const base = { active: true, discontinued: false, productionCost: 1, providerVariantId: "1", mappingActive: true };
    expect(evaluateEligibility({ ...good, variants: [{ ...base, outOfStock: true }, base] }).eligible).toBe(true);
    expect(evaluateEligibility({ ...good, variants: [{ ...base, outOfStock: true }] }).failures).toContain("ALL_VARIANTS_OUT_OF_STOCK");
  });
  it("catalog pre-check flags discontinued and unmapped category", () => {
    const r = catalogEligibility({ capabilities: { order_api: true }, discontinued: true, variants: [{ status: "DISCONTINUED", cost: 1 }], categoryCode: null });
    expect(r.reasons).toEqual(expect.arrayContaining(["DISCONTINUED", "NO_AVAILABLE_VARIANTS", "UNMAPPED_CATEGORY"]));
  });
});

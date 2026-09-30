import { describe, expect, it } from "vitest";
import { computeContributionMargin, taxFromGross } from "@/lib/pricing/cost-engine";
import { TaxService, spanishRegionFromPostalCode } from "@/lib/tax/tax-service";
import { quoteFromRules } from "@/lib/shipping/rules";

describe("cost engine", () => {
  it("computes contribution margin from the spec example", () => {
    const r = computeContributionMargin({ retailPriceGross: 39.9, taxRate: 0.21, pricesIncludeTax: true, productionCost: 14, productionCostActual: true, shippingCost: 5.5, shippingCostActual: true, paymentFeePercent: 0, paymentFeeFixed: 0, paymentFeeActual: 1.5, discount: 0, refundReservePercent: 0, creatorCommissionRate: 0 });
    expect(r.tax).toBe(6.92);
    expect(r.netRevenue).toBe(32.98);
    expect(r.contributionMargin).toBe(11.98);
  });
  it("returns null margin when costs are unknown (never hypothetical as actual)", () => {
    const r = computeContributionMargin({ retailPriceGross: 30, taxRate: 0.21, pricesIncludeTax: true, productionCost: null, productionCostActual: false, shippingCost: 4, shippingCostActual: false, paymentFeePercent: 0.015, paymentFeeFixed: 0.25, discount: 0, refundReservePercent: 0.02, creatorCommissionRate: 0.1 });
    expect(r.contributionMargin).toBeNull();
    expect(r.isActual).toBe(false);
  });
  it("tax from VAT-inclusive price", () => {
    expect(taxFromGross(121, 0.21)).toBe(21);
  });
});

describe("TaxService", () => {
  const svc = new TaxService([
    { country: "ES", region: null, taxClass: "standard", rate: 0.21, requiresReview: false },
    { country: "ES", region: "CN", taxClass: "standard", rate: 0, requiresReview: true },
    { country: "PT", region: null, taxClass: "standard", rate: 0.23, requiresReview: false },
  ]);
  it("resolves Spain mainland vs Canarias by postal code", () => {
    expect(spanishRegionFromPostalCode("35001")).toBe("CN");
    expect(svc.taxFor(121, { country: "ES", postalCode: "28001", pricesIncludeTax: true }).tax).toBe(21);
    expect(svc.taxFor(100, { country: "ES", postalCode: "38001", pricesIncludeTax: true })).toMatchObject({ tax: 0, requiresReview: true });
  });
  it("flags unknown countries for review instead of guessing", () => {
    expect(svc.taxFor(100, { country: "US", pricesIncludeTax: true })).toMatchObject({ tax: 0, requiresReview: true });
  });
});

describe("shipping rules", () => {
  const rules = [{ id: "1", name: "España", countryCodes: ["ES"], method: "STANDARD", baseRate: 4.95, perAdditionalItem: 1.5, freeOver: 75, minDays: 3, maxDays: 7, active: true, sort: 1 }];
  it("quotes configured rules", () => {
    expect(quoteFromRules(rules, "ES", 3, 50)?.amount).toBe(7.95);
    expect(quoteFromRules(rules, "ES", 1, 80)?.amount).toBe(0);
  });
  it("never invents a price for unsupported destinations", () => {
    expect(quoteFromRules(rules, "US", 1, 50)).toBeNull();
  });
});

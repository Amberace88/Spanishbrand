/**
 * PRODUCT COST ENGINE (pure).
 * RETAIL − TAX − PRODUCTION − SHIPPING − PAYMENT FEE − DISCOUNT − REFUND RESERVE − CREATOR COMMISSION
 *   = CONTRIBUTION MARGIN
 * Every component is tagged actual vs estimated — hypothetical margin is never shown as actual.
 */

export interface CostInputs {
  retailPriceGross: number; // price paid by customer (VAT inclusive when pricesIncludeTax)
  taxRate: number; // e.g. 0.21
  pricesIncludeTax: boolean;
  productionCost: number | null;
  productionCostActual: boolean;
  shippingCost: number | null; // our cost from provider (not what the customer paid)
  shippingCostActual: boolean;
  paymentFeePercent: number;
  paymentFeeFixed: number;
  paymentFeeActual?: number | null;
  discount: number;
  refundReservePercent: number;
  creatorCommissionRate: number;
}

export interface CostBreakdown {
  retail: number;
  tax: number;
  netRevenue: number;
  production: number | null;
  shipping: number | null;
  paymentFee: number;
  discount: number;
  refundReserve: number;
  creatorCommission: number;
  contributionMargin: number | null;
  marginPercent: number | null;
  isActual: boolean;
  estimatedComponents: string[];
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function taxFromGross(gross: number, rate: number) {
  return round2(gross - gross / (1 + rate));
}

export function computeContributionMargin(i: CostInputs): CostBreakdown {
  const retail = round2(i.retailPriceGross);
  const afterDiscount = Math.max(0, retail - i.discount);
  const tax = i.pricesIncludeTax ? taxFromGross(afterDiscount, i.taxRate) : round2(afterDiscount * i.taxRate);
  const netRevenue = round2(i.pricesIncludeTax ? afterDiscount - tax : afterDiscount);
  const grossCharged = i.pricesIncludeTax ? afterDiscount : afterDiscount + tax;
  const paymentFee = round2(i.paymentFeeActual ?? grossCharged * i.paymentFeePercent + i.paymentFeeFixed);
  const refundReserve = round2(netRevenue * i.refundReservePercent);
  const creatorCommission = round2(netRevenue * i.creatorCommissionRate);

  const estimated: string[] = [];
  if (!i.productionCostActual) estimated.push("production");
  if (!i.shippingCostActual) estimated.push("shipping");
  if (i.paymentFeeActual == null) estimated.push("payment_fee");
  estimated.push("refund_reserve");

  const margin =
    i.productionCost == null || i.shippingCost == null
      ? null
      : round2(netRevenue - i.productionCost - i.shippingCost - paymentFee - refundReserve - creatorCommission);

  return {
    retail,
    tax,
    netRevenue,
    production: i.productionCost,
    shipping: i.shippingCost,
    paymentFee,
    discount: round2(i.discount),
    refundReserve,
    creatorCommission,
    contributionMargin: margin,
    marginPercent: margin == null || netRevenue === 0 ? null : round2((margin / netRevenue) * 100),
    isActual: estimated.length === 1 && estimated[0] === "refund_reserve",
    estimatedComponents: estimated,
  };
}

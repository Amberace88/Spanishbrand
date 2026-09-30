/**
 * TaxService — VAT architecture kept separate from pricing & UI.
 * Rates are configuration (public.tax_rates). Legal/accounting validation required before production.
 */
import { round2, taxFromGross } from "@/lib/pricing/cost-engine";

export interface TaxRate {
  country: string;
  region: string | null;
  taxClass: string;
  rate: number;
  requiresReview: boolean;
}

export interface TaxContext {
  country: string;
  postalCode?: string | null;
  taxClass?: string;
  pricesIncludeTax: boolean;
}

/** Spanish territories outside the EU VAT area (derived from postal code prefix). */
export function spanishRegionFromPostalCode(postalCode?: string | null): string | null {
  if (!postalCode) return null;
  const p = postalCode.trim();
  if (/^(35|38)/.test(p)) return "CN"; // Canarias
  if (/^51/.test(p)) return "CE"; // Ceuta
  if (/^52/.test(p)) return "ML"; // Melilla
  return null;
}

export class TaxService {
  constructor(private readonly rates: TaxRate[]) {}

  resolveRate(ctx: TaxContext): TaxRate | null {
    const taxClass = ctx.taxClass ?? "standard";
    const region = ctx.country === "ES" ? spanishRegionFromPostalCode(ctx.postalCode) : null;
    return (
      this.rates.find((r) => r.country === ctx.country && r.region === region && r.taxClass === taxClass) ??
      this.rates.find((r) => r.country === ctx.country && r.region === null && r.taxClass === taxClass) ??
      null
    );
  }

  /** Tax contained in (or to add to) an amount. */
  taxFor(amount: number, ctx: TaxContext): { tax: number; rate: number; requiresReview: boolean } {
    const r = this.resolveRate(ctx);
    if (!r) return { tax: 0, rate: 0, requiresReview: true };
    const tax = ctx.pricesIncludeTax ? taxFromGross(amount, r.rate) : round2(amount * r.rate);
    return { tax, rate: r.rate, requiresReview: r.requiresReview };
  }
}

export function rowsToTaxRates(rows: { country: string; region: string | null; tax_class: string; rate: number | string; requires_review: boolean; active?: boolean }[]): TaxRate[] {
  return rows
    .filter((r) => r.active !== false)
    .map((r) => ({ country: r.country, region: r.region, taxClass: r.tax_class, rate: Number(r.rate), requiresReview: r.requires_review }));
}

/**
 * Configured shipping rules (pure). Used only when provider real-time rates are unavailable.
 * Never invents prices: if no rule and no provider rate exists, the destination is unsupported.
 */
import { round2 } from "@/lib/pricing/cost-engine";

export interface ShippingRule {
  id: string;
  name: string;
  countryCodes: string[];
  method: string;
  baseRate: number;
  perAdditionalItem: number;
  freeOver: number | null;
  minDays: number | null;
  maxDays: number | null;
  active: boolean;
  sort: number;
}

export interface ShippingQuote {
  source: "PROVIDER" | "RULE";
  method: string;
  name: string;
  amount: number;
  currency: string;
  minDays: number | null;
  maxDays: number | null;
}

export function quoteFromRules(rules: ShippingRule[], country: string, itemCount: number, subtotal: number, currency = "EUR"): ShippingQuote | null {
  const rule = rules
    .filter((r) => r.active && r.countryCodes.includes(country))
    .sort((a, b) => a.sort - b.sort)[0];
  if (!rule) return null;
  const free = rule.freeOver != null && subtotal >= rule.freeOver;
  const amount = free ? 0 : round2(rule.baseRate + Math.max(0, itemCount - 1) * rule.perAdditionalItem);
  return { source: "RULE", method: rule.method, name: rule.name, amount, currency, minDays: rule.minDays, maxDays: rule.maxDays };
}

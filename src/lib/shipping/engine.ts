import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import { log } from "@/lib/logger";
import { quoteFromRules, type ShippingQuote, type ShippingRule } from "./rules";

/**
 * Provider-aware shipping: real provider rates when every cart item routes to a single provider
 * with a shipping API; otherwise the configured shipping rules. Never invents prices.
 */
export async function quoteShipping(input: { country: string; lines: { variantId: string; quantity: number }[]; subtotal: number; currency: string }): Promise<ShippingQuote | null> {
  const sb = db();
  const itemCount = input.lines.reduce((s, l) => s + l.quantity, 0);

  try {
    const { data: vms } = await sb
      .from("variant_provider_mappings")
      .select("variant_id, provider_variant_id, product_provider_mappings!inner(provider_id, role, provider_product_id, active)")
      .in("variant_id", input.lines.map((l) => l.variantId))
      .eq("product_provider_mappings.role", "PRIMARY")
      .eq("product_provider_mappings.active", true);
    const providers = new Set((vms ?? []).map((v) => (v.product_provider_mappings as unknown as { provider_id: string }).provider_id));
    if (vms && vms.length === input.lines.length && providers.size === 1) {
      const providerId = [...providers][0];
      const provider = fulfillmentProviderFactory.getProvider(providerId);
      if (provider.isConfigured() && provider.capabilities.shipping_api) {
        const rates = await provider.calculateShipping({
          country: input.country,
          currency: input.currency,
          items: input.lines.map((l) => {
            const vm = vms.find((v) => v.variant_id === l.variantId)!;
            return { providerVariantId: vm.provider_variant_id, quantity: l.quantity };
          }),
        });
        const cheapest = rates.filter((r) => r.currency === input.currency).sort((a, b) => a.rate - b.rate)[0];
        if (cheapest) {
          return { source: "PROVIDER", method: cheapest.id, name: cheapest.name, amount: cheapest.rate, currency: cheapest.currency, minDays: cheapest.minDays, maxDays: cheapest.maxDays };
        }
      }
    }
  } catch (e) {
    log.warn("PROVIDER", "provider shipping rates unavailable — using configured rules", { msg: e instanceof Error ? e.message : String(e) });
  }

  const { data: rules } = await sb.from("shipping_rules").select("*").eq("brand_id", env.brandId()).eq("active", true);
  const mapped: ShippingRule[] = (rules ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    countryCodes: r.country_codes,
    method: r.method,
    baseRate: Number(r.base_rate),
    perAdditionalItem: Number(r.per_additional_item),
    freeOver: r.free_over != null ? Number(r.free_over) : null,
    minDays: r.min_days,
    maxDays: r.max_days,
    active: r.active,
    sort: r.sort,
  }));
  return quoteFromRules(mapped, input.country, itemCount, input.subtotal, input.currency);
}

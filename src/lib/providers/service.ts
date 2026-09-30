import "server-only";
import { db } from "@/lib/supabase/admin";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import { catalogEligibility } from "@/lib/products/eligibility";
import { emitEvent } from "@/lib/events/bus";
import { log } from "@/lib/logger";
import type { NormalizedVariant } from "@/lib/fulfillment/types";

/** PROVIDER HEALTH MONITORING — persists status + history, alerts when offline. */
export async function runHealthChecks() {
  const sb = db();
  const results: Record<string, string> = {};
  for (const provider of fulfillmentProviderFactory.list()) {
    const { data: row } = await sb.from("providers").select("health_status").eq("id", provider.id).single();
    const result = provider.isConfigured()
      ? await provider.healthCheck()
      : { status: "UNKNOWN" as const, latencyMs: null, checks: { configuration: { ok: false, detail: "API key not configured" } } };
    await sb.from("providers").update({ health_status: result.status, last_health_check_at: new Date().toISOString() }).eq("id", provider.id);
    await sb.from("provider_health_checks").insert({ provider_id: provider.id, status: result.status, latency_ms: result.latencyMs, details: result.checks });
    if ((result.status === "OFFLINE" || result.status === "ERROR") && row?.health_status !== result.status) {
      await emitEvent("PROVIDER_OFFLINE", { providerId: provider.id, status: result.status, checks: result.checks });
    }
    results[provider.id] = result.status;
  }
  return results;
}

/**
 * CATALOG SYNC: fetch → normalize → category mapping → capability/cost/variant check.
 * Never publishes. New items start as IMPORTED. Missing items → provider_unavailable.
 */
export async function syncProviderCatalog(providerId: string, opts: { maxProducts?: number; withVariants?: boolean } = {}) {
  const sb = db();
  const provider = fulfillmentProviderFactory.getProvider(providerId);
  const { data: logRow } = await sb.from("provider_sync_logs").insert({ provider_id: providerId, kind: "CATALOG" }).select("id").single();
  const stats = { fetched: 0, upserted: 0, variants: 0, eligible: 0, missing: 0, errors: 0 };
  const startedAt = new Date().toISOString();

  try {
    if (!provider.isConfigured()) throw new Error(`${provider.name} API key not configured`);
    const products = await provider.getCatalogProducts();
    stats.fetched = products.length;
    const capabilities = provider.capabilities;
    const slice = products.slice(0, opts.maxProducts ?? products.length);

    for (const p of slice) {
      try {
        let variants: NormalizedVariant[] = [];
        if (opts.withVariants) {
          variants = await provider.getProductVariants(p.externalId);
        }
        const check = catalogEligibility({
          capabilities,
          discontinued: p.discontinued,
          variants: opts.withVariants ? variants.map((v) => ({ status: v.status, cost: v.cost })) : [{ status: "UNKNOWN", cost: null }],
          categoryCode: p.categoryHint,
        });
        const costs = variants.map((v) => v.cost).filter((c): c is number => c != null);
        const { data: pp, error } = await sb
          .from("provider_products")
          .upsert(
            {
              provider_id: providerId,
              external_id: p.externalId,
              title: p.title,
              type: p.type,
              brand: p.brand,
              model: p.model,
              image: p.image,
              internal_category_code: p.categoryHint,
              techniques: p.techniques,
              placements: p.placements,
              variant_count: opts.withVariants ? variants.length : p.variantCount,
              discontinued: p.discontinued,
              available: !p.discontinued,
              eligible: check.eligible,
              eligibility_report: check,
              min_cost: costs.length ? Math.min(...costs) : null,
              currency: p.currency ?? variants[0]?.currency ?? null,
              raw: p.raw as object,
              last_seen_at: startedAt,
            },
            { onConflict: "provider_id,external_id" },
          )
          .select("id")
          .single();
        if (error || !pp) throw error ?? new Error("upsert failed");
        stats.upserted++;
        if (check.eligible) stats.eligible++;

        if (variants.length) {
          const rows = variants.map((v) => ({
            provider_product_id: pp.id,
            provider_id: providerId,
            external_id: v.externalId,
            name: v.name,
            size: v.size,
            color: v.color,
            color_code: v.colorCode,
            cost: v.cost,
            currency: v.currency,
            in_stock: v.inStock,
            status: v.status,
            availability: v.availability,
            raw: v.raw as object,
            last_seen_at: startedAt,
          }));
          for (let i = 0; i < rows.length; i += 500) {
            await sb.from("provider_variants").upsert(rows.slice(i, i + 500), { onConflict: "provider_id,external_id" });
          }
          stats.variants += rows.length;
        }
      } catch (e) {
        stats.errors++;
        log.warn("CATALOG", "product sync failed", { providerId, externalId: p.externalId, msg: e instanceof Error ? e.message : String(e) });
      }
    }

    // Products no longer returned by the provider → unavailable (history preserved, never deleted).
    if (!opts.maxProducts) {
      const { data: gone } = await sb
        .from("provider_products")
        .update({ available: false, eligible: false })
        .eq("provider_id", providerId)
        .lt("last_seen_at", startedAt)
        .select("external_id");
      stats.missing = gone?.length ?? 0;
      if (gone?.length) {
        const { data: affected } = await sb
          .from("product_provider_mappings")
          .select("product_id")
          .eq("provider_id", providerId)
          .eq("role", "PRIMARY")
          .in("provider_product_id", gone.map((g) => g.external_id));
        for (const a of affected ?? []) {
          await sb.from("products").update({ status: "PROVIDER_UNAVAILABLE" }).eq("id", a.product_id).neq("status", "ARCHIVED");
          await sb.rpc("refresh_product_eligibility", { p_product_id: a.product_id });
        }
      }
    }

    await sb.from("providers").update({ last_sync_at: new Date().toISOString() }).eq("id", providerId);
    await sb.from("provider_sync_logs").update({ status: stats.errors ? "PARTIAL" : "SUCCESS", stats, finished_at: new Date().toISOString() }).eq("id", logRow!.id);
    return stats;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb.from("provider_sync_logs").update({ status: "FAILED", stats, error: msg, finished_at: new Date().toISOString() }).eq("id", logRow!.id);
    log.error("CATALOG", "sync failed", { providerId, msg });
    throw e;
  }
}

/** Sync variants for a single provider product (called when admin opens/approves it). */
export async function syncProviderProductVariants(providerProductRowId: string) {
  const sb = db();
  const { data: pp } = await sb.from("provider_products").select("id, provider_id, external_id").eq("id", providerProductRowId).single();
  if (!pp) throw new Error("provider product not found");
  const provider = fulfillmentProviderFactory.getProvider(pp.provider_id);
  const variants = await provider.getProductVariants(pp.external_id);
  const rows = variants.map((v) => ({
    provider_product_id: pp.id,
    provider_id: pp.provider_id,
    external_id: v.externalId,
    name: v.name,
    size: v.size,
    color: v.color,
    color_code: v.colorCode,
    cost: v.cost,
    currency: v.currency,
    in_stock: v.inStock,
    status: v.status,
    availability: v.availability,
    raw: v.raw as object,
    last_seen_at: new Date().toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 500) await sb.from("provider_variants").upsert(rows.slice(i, i + 500), { onConflict: "provider_id,external_id" });
  const costs = variants.map((v) => v.cost).filter((c): c is number => c != null);
  await sb.from("provider_products").update({ variant_count: variants.length, min_cost: costs.length ? Math.min(...costs) : null }).eq("id", pp.id);
  return variants.length;
}

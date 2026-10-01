import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import { isProviderError } from "@/lib/fulfillment/errors";
import { slugify } from "@/lib/format";
import { audit } from "@/lib/audit";
import { getUnitPrice } from "@/lib/fulfillment/gelato";
import type { StaffSession } from "@/lib/auth/rbac";

/** Test destination for the non-charging fulfillment test (estimate/quote only — no order is created). */
const TEST_RECIPIENT = {
  name: "Test Fulfillment",
  line1: "Calle de Alcalá 1",
  city: "Madrid",
  postalCode: "28014",
  country: "ES",
  email: "fulfillment-test@example.com",
  phone: "+34600000000",
};

/**
 * Create an internal DRAFT product from an approved provider catalog product.
 * Variants and provider variant mappings are created from the chosen provider variants.
 */
export async function createProductFromProvider(
  staff: StaffSession,
  input: {
    providerProductRowId: string;
    name: string;
    productType: string;
    collectionId?: string | null;
    variantExternalIds: string[];
    retailPrice?: number | null;
    fulfillmentMethod?: string | null;
  },
) {
  const sb = db();
  const { data: pp } = await sb.from("provider_products").select("*").eq("id", input.providerProductRowId).single();
  if (!pp) throw new Error("Provider product not found");
  if (pp.review_status !== "APPROVED") throw new Error("Approve the provider product first");

  const { data: cat } = await sb.from("categories").select("id").eq("brand_id", env.brandId()).eq("code", pp.internal_category_code ?? "OTHER_POD").maybeSingle();
  const { data: pvs } = await sb.from("provider_variants").select("*").eq("provider_product_id", pp.id).in("external_id", input.variantExternalIds);
  if (!pvs?.length) throw new Error("Select at least one provider variant");

  // Gelato catalog prices are resolved on demand (not included in catalog search).
  if (pp.provider_id === "gelato") {
    for (const v of pvs) {
      if (v.cost == null) {
        try {
          const price = await getUnitPrice(v.external_id);
          if (price) {
            v.cost = price.price;
            v.currency = price.currency;
            await sb.from("provider_variants").update({ cost: price.price, currency: price.currency }).eq("id", v.id);
          }
        } catch {
          /* cost stays unknown → eligibility will block publishing */
        }
      }
    }
  }

  const baseSlug = slugify(input.name) || `producto-${Date.now()}`;
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { data } = await sb.from("products").select("id").eq("brand_id", env.brandId()).eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${i}`;
  }
  const costs = pvs.map((v) => (v.cost == null ? null : Number(v.cost)));
  const { data: product, error } = await sb
    .from("products")
    .insert({
      brand_id: env.brandId(),
      name: input.name,
      slug,
      product_type: input.productType,
      category_id: cat?.id ?? null,
      collection_id: input.collectionId ?? null,
      status: "READY_FOR_CONFIGURATION",
      supplier_id: pp.provider_id,
      primary_provider: pp.provider_id,
      provider_product_id: pp.external_id,
      production_cost: costs.every((c) => c != null) ? Math.max(...(costs as number[])) : null,
      retail_price: input.retailPrice ?? null,
      currency: "EUR",
    })
    .select("id")
    .single();
  if (error || !product) throw error ?? new Error("product insert failed");

  if (input.collectionId) await sb.from("collection_products").insert({ collection_id: input.collectionId, product_id: product.id });

  const { data: mapping } = await sb
    .from("product_provider_mappings")
    .insert({ product_id: product.id, provider_id: pp.provider_id, role: "PRIMARY", provider_product_id: pp.external_id, fulfillment_method: input.fulfillmentMethod ?? (pp.techniques?.[0] ?? null) })
    .select("id")
    .single();

  for (const [idx, v] of pvs.entries()) {
    const { data: variant } = await sb
      .from("product_variants")
      .insert({
        product_id: product.id,
        variant_name: v.name ?? [v.size, v.color].filter(Boolean).join(" / "),
        size: v.size,
        color: v.color,
        color_hex: v.color_code,
        production_cost: v.cost,
        provider_status: v.status === "UNKNOWN" ? "UNKNOWN" : v.status,
        sort: idx,
      })
      .select("id")
      .single();
    if (variant && mapping) {
      await sb.from("variant_provider_mappings").insert({ mapping_id: mapping.id, variant_id: variant.id, provider_variant_id: v.external_id, production_cost: v.cost });
    }
  }

  await sb.rpc("refresh_product_eligibility", { p_product_id: product.id });
  await audit({ action: "product.create", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: product.id, after: { name: input.name, provider: pp.provider_id } });
  return product.id as string;
}

/**
 * Working test fulfillment flow: runs the provider's non-charging cost estimate/quote
 * with the real variant IDs + print files. Success stamps test_passed_at.
 */
export async function runFulfillmentTest(staff: StaffSession, productId: string, role: "PRIMARY" | "BACKUP" = "PRIMARY") {
  const sb = db();
  const { data: m } = await sb
    .from("product_provider_mappings")
    .select("id, provider_id, provider_product_id, print_config, variant_provider_mappings(provider_variant_id, files, status)")
    .eq("product_id", productId)
    .eq("role", role)
    .single();
  if (!m) throw new Error("No mapping");
  const provider = fulfillmentProviderFactory.getProvider(m.provider_id);
  if (!provider.capabilities.cost_estimate_api) throw new Error(`${provider.name}: no cost estimate API — test cannot run automatically`);
  const vm = (m.variant_provider_mappings ?? []).find((v: { status: string }) => v.status === "ACTIVE") as { provider_variant_id: string; files: unknown } | undefined;
  if (!vm) throw new Error("No active mapped variant");
  const cfgFiles = ((m.print_config as { files?: { type: string; url: string }[] } | null)?.files ?? []) as { type: string; url: string }[];
  let files = (Array.isArray(vm.files) && vm.files.length ? vm.files : cfgFiles) as { type: string; url: string }[];
  // Customer-designed (blank) products: test with a sample print file — the real one is rendered per order.
  if (!files.length && (m.print_config as { personalized?: boolean } | null)?.personalized) {
    files = [{ type: "front", url: `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/brand/print-sample.png` }];
  }
  if (!files.length) throw new Error("Add print files (print_config.files) before testing");

  const started = new Date().toISOString();
  try {
    const est = await provider.calculateCost({
      externalId: `test-${productId.slice(0, 8)}-${Date.now()}`,
      currency: "EUR",
      confirm: false,
      recipient: TEST_RECIPIENT,
      items: [{ referenceId: "test-1", providerProductId: m.provider_product_id, providerVariantId: vm.provider_variant_id, quantity: 1, retailPrice: 1, name: "Fulfillment test", files }],
    });
    const result = { ok: true, at: started, production: est.production, shipping: est.shipping, total: est.total, currency: est.currency };
    await sb.from("product_provider_mappings").update({ test_passed_at: started, test_result: result }).eq("id", m.id);
    if (est.shipping != null && role === "PRIMARY") await sb.from("products").update({ shipping_cost: est.shipping }).eq("id", productId);
    await audit({ action: "provider.fulfillment_test", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: productId, after: result });
    await sb.rpc("refresh_product_eligibility", { p_product_id: productId });
    return result;
  } catch (e) {
    const result = { ok: false, at: started, error: isProviderError(e) ? e.toAdminJSON() : e instanceof Error ? e.message : String(e) };
    await sb.from("product_provider_mappings").update({ test_passed_at: null, test_result: result }).eq("id", m.id);
    await sb.rpc("refresh_product_eligibility", { p_product_id: productId });
    return result;
  }
}

export async function approveMapping(staff: StaffSession, productId: string, role: "PRIMARY" | "BACKUP") {
  const sb = db();
  await sb.from("product_provider_mappings").update({ approved: true, approved_by: staff.userId, approved_at: new Date().toISOString() }).eq("product_id", productId).eq("role", role);
  await audit({ action: "provider.mapping_approve", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: productId, after: { role } });
  return sb.rpc("refresh_product_eligibility", { p_product_id: productId });
}

/** Publish: DB trigger enforces API_FULFILLMENT_ELIGIBILITY = TRUE. */
export async function publishProduct(staff: StaffSession, productId: string) {
  const sb = db();
  const { data: report } = await sb.rpc("refresh_product_eligibility", { p_product_id: productId });
  if (!(report as { eligible?: boolean } | null)?.eligible) {
    return { ok: false as const, failures: ((report as { failures?: string[] } | null)?.failures ?? []) as string[] };
  }
  const { error } = await sb.from("products").update({ status: "PUBLISHED" }).eq("id", productId);
  if (error) return { ok: false as const, failures: [error.message] };
  await audit({ action: "product.publish", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: productId });
  return { ok: true as const };
}

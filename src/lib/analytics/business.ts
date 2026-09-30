import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getBrand } from "@/lib/brand";
import { computeContributionMargin, round2 } from "@/lib/pricing/cost-engine";

/**
 * Business analytics computed ONLY from real database rows.
 * No synthetic numbers: empty data → zeros / empty lists, clearly labelled.
 */
export async function getBusinessMetrics(days = 30) {
  const sb = db();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const brand = await getBrand();

  const [{ data: orders }, { data: refunds }, { data: fos }, { data: commissions }, { data: views }, { count: customers }, { count: newCustomers }] = await Promise.all([
    sb.from("orders").select("id, status, payment_status, total, subtotal, discount, shipping, tax, customer_id, created_at, paid_at").eq("brand_id", env.brandId()).gte("created_at", since),
    sb.from("refunds").select("amount, status, created_at").gte("created_at", since),
    sb.from("fulfillment_orders").select("cost_total, status, provider_id, created_at").gte("created_at", since),
    sb.from("creator_commissions").select("amount, status, created_at").gte("created_at", since),
    sb.from("analytics_events").select("session_id, event").eq("brand_id", env.brandId()).gte("created_at", since).in("event", ["page_view", "purchase"]).limit(50000),
    sb.from("customers").select("id", { count: "exact", head: true }).eq("brand_id", env.brandId()),
    sb.from("customers").select("id", { count: "exact", head: true }).eq("brand_id", env.brandId()).gte("created_at", since),
  ]);

  const paid = (orders ?? []).filter((o) => o.payment_status === "PAID" || o.payment_status === "PARTIALLY_REFUNDED" || o.payment_status === "REFUNDED");
  const sum = (arr: { [k: string]: unknown }[], k: string) => round2(arr.reduce((s, r) => s + Number(r[k] ?? 0), 0));
  const gross = sum(paid, "subtotal");
  const revenue = sum(paid, "total");
  const refundTotal = sum((refunds ?? []).filter((r) => r.status === "SUCCEEDED"), "amount");
  const fulfillmentCost = sum((fos ?? []).filter((f) => f.cost_total != null), "cost_total");
  const fee = brand.settings.payment_fee_percent ?? 0.015;
  const feeFixed = brand.settings.payment_fee_fixed ?? 0.25;
  const paymentFeesEstimated = round2(paid.reduce((s, o) => s + Number(o.total) * fee + feeFixed, 0));
  const commissionTotal = sum((commissions ?? []).filter((c) => c.status !== "VOID"), "amount");
  const tax = sum(paid, "tax");
  const contribution = round2(revenue - tax - refundTotal - fulfillmentCost - paymentFeesEstimated - commissionTotal);

  const sessions = new Set((views ?? []).filter((v) => v.event === "page_view" && v.session_id).map((v) => v.session_id));
  const purchaseSessions = new Set((views ?? []).filter((v) => v.event === "purchase" && v.session_id).map((v) => v.session_id));
  const byCustomer = new Map<string, number>();
  for (const o of paid) if (o.customer_id) byCustomer.set(o.customer_id, (byCustomer.get(o.customer_id) ?? 0) + 1);
  const repeat = [...byCustomer.values()].filter((n) => n > 1).length;

  const statusCounts: Record<string, number> = {};
  for (const o of orders ?? []) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  return {
    periodDays: days,
    orders: paid.length,
    revenue,
    grossSales: gross,
    discounts: sum(paid, "discount"),
    refunds: refundTotal,
    tax,
    shippingRevenue: sum(paid, "shipping"),
    fulfillmentCost,
    paymentFeesEstimated,
    creatorCommissions: commissionTotal,
    contributionMargin: contribution,
    contributionIsEstimate: true, // payment fees estimated until Stripe balance transactions are reconciled
    aov: paid.length ? round2(revenue / paid.length) : 0,
    conversionRate: sessions.size ? round2((purchaseSessions.size / sessions.size) * 100) : null,
    repeatPurchaseRate: byCustomer.size ? round2((repeat / byCustomer.size) * 100) : null,
    customers: customers ?? 0,
    newCustomers: newCustomers ?? 0,
    statusCounts,
    failedFulfillment: (fos ?? []).filter((f) => f.status === "FAILED" || f.status === "REQUIRES_REVIEW").length,
  };
}

export async function getTopProducts(limit = 10) {
  const { data } = await db().from("v_product_performance").select("*").eq("brand_id", env.brandId()).gt("units_sold", 0).order("gross_revenue", { ascending: false }).limit(limit);
  return (data ?? []).map((p) => ({ ...p, contribution: round2(Number(p.gross_revenue) - Number(p.production_cost_total)) }));
}

export async function getTopCollections(limit = 10) {
  const sb = db();
  const [{ data: perf }, { data: cols }] = await Promise.all([
    sb.from("v_product_performance").select("collection_id, gross_revenue, units_sold, production_cost_total").eq("brand_id", env.brandId()),
    sb.from("collections").select("id, name").eq("brand_id", env.brandId()),
  ]);
  const agg = new Map<string, { revenue: number; units: number; cost: number }>();
  for (const p of perf ?? []) {
    if (!p.collection_id) continue;
    const a = agg.get(p.collection_id) ?? { revenue: 0, units: 0, cost: 0 };
    a.revenue += Number(p.gross_revenue);
    a.units += Number(p.units_sold);
    a.cost += Number(p.production_cost_total);
    agg.set(p.collection_id, a);
  }
  return [...agg.entries()]
    .map(([id, a]) => ({ id, name: cols?.find((c) => c.id === id)?.name ?? id, revenue: round2(a.revenue), units: a.units, contribution: round2(a.revenue - a.cost) }))
    .filter((c) => c.units > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/** Content winners — ranked by orders, revenue & conversion, not views. */
export async function getTopContent(limit = 10) {
  const { data } = await db().from("v_content_performance").select("*").eq("brand_id", env.brandId()).limit(500);
  return (data ?? [])
    .map((c) => ({
      ...c,
      score: Number(c.orders) * 10 + Number(c.revenue) / 10 + Number(c.conversion_rate ?? 0) * 100 + Number(c.ctr ?? 0) * 20,
    }))
    .filter((c) => Number(c.views) > 0 || Number(c.orders) > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function productMargin(p: { retail: number; production: number | null; shipping: number | null; taxRate?: number }, settings: { payment_fee_percent?: number; payment_fee_fixed?: number; refund_reserve_percent?: number }) {
  return computeContributionMargin({
    retailPriceGross: p.retail,
    taxRate: p.taxRate ?? 0.21,
    pricesIncludeTax: true,
    productionCost: p.production,
    productionCostActual: false,
    shippingCost: p.shipping,
    shippingCostActual: false,
    paymentFeePercent: settings.payment_fee_percent ?? 0.015,
    paymentFeeFixed: settings.payment_fee_fixed ?? 0.25,
    discount: 0,
    refundReservePercent: settings.refund_reserve_percent ?? 0.02,
    creatorCommissionRate: 0,
  });
}

/** Data pack for the AI Business Assistant (answers ONLY from this). */
export async function getAssistantDataPack() {
  const sb = db();
  const [metrics, topProducts, topCollections, topContent, { data: providerFailures }, { data: unavailable }, { data: products }] = await Promise.all([
    getBusinessMetrics(30),
    getTopProducts(20),
    getTopCollections(20),
    getTopContent(20),
    sb.from("fulfillment_errors").select("provider, permanent, resolved, created_at").gte("created_at", new Date(Date.now() - 90 * 86400_000).toISOString()),
    sb.from("products").select("name, status").eq("brand_id", env.brandId()).in("status", ["PROVIDER_UNAVAILABLE", "OUT_OF_STOCK", "PAUSED"]),
    sb.from("products").select("name, retail_price, production_cost, shipping_cost, status").eq("brand_id", env.brandId()).eq("status", "PUBLISHED"),
  ]);
  const brand = await getBrand();
  const failuresByProvider: Record<string, number> = {};
  for (const f of providerFailures ?? []) failuresByProvider[f.provider ?? "unknown"] = (failuresByProvider[f.provider ?? "unknown"] ?? 0) + 1;
  return {
    generated_at: new Date().toISOString(),
    last_30_days: metrics,
    top_products_all_time: topProducts,
    top_collections_all_time: topCollections,
    top_content: topContent,
    fulfillment_failures_last_90_days_by_provider: failuresByProvider,
    unavailable_products: unavailable ?? [],
    published_product_margins_estimated: (products ?? []).map((p) => ({
      name: p.name,
      ...productMargin({ retail: Number(p.retail_price), production: p.production_cost != null ? Number(p.production_cost) : null, shipping: p.shipping_cost != null ? Number(p.shipping_cost) : null }, brand.settings),
    })),
  };
}

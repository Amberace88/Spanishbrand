import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env, isConfigured } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { runHealthChecks, syncProviderCatalog } from "@/lib/providers/service";
import { retryDueFulfillments, sweepStuckFulfillment } from "@/lib/orders/fulfillment-engine";
import { emitEvent } from "@/lib/events/bus";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import { applyProviderSnapshot } from "@/lib/orders/fulfillment-engine";
import { getBrand } from "@/lib/brand";
import { log } from "@/lib/logger";
import { runCatalogBatch } from "@/lib/fulfillment/catalog-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request) {
  const secret = env.cronSecret();
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Staff identity for unattended catalog steps (audit trail points at the owner account). */
async function systemStaff() {
  const { data } = await db().from("user_roles").select("user_id, role").eq("brand_id", env.brandId()).in("role", ["SUPER_ADMIN", "ADMIN"]).order("role", { ascending: false }).limit(1).maybeSingle();
  if (!data) throw new Error("no admin user for system staff");
  return { userId: data.user_id as string, email: "system@cron", roles: ["SUPER_ADMIN", "ADMIN"] as const } as unknown as import("@/lib/auth/rbac").StaffSession;
}

const JOBS: Record<string, () => Promise<unknown>> = {
  /** Every minute: advance the catalog builder server-side (safe next to the admin page runner). */
  catalog: async () => runCatalogBatch(await systemStaff(), { budgetMs: 9_000, workers: 3 }),
  /** Daily: catalog sync for configured providers (never publishes). */
  "catalog-sync": async () => {
    const out: Record<string, unknown> = {};
    for (const p of fulfillmentProviderFactory.list()) {
      if (!p.isConfigured()) {
        out[p.id] = "not configured";
        continue;
      }
      out[p.id] = await syncProviderCatalog(p.id).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
    }
    return out;
  },
  health: runHealthChecks,
  "retry-fulfillment": async () => {
    const swept = await sweepStuckFulfillment();
    return { swept, retried: await retryDueFulfillments() };
  },
  /** Poll open provider orders as a safety net for missed webhooks. */
  "reconcile-orders": async () => {
    const { data } = await db()
      .from("fulfillment_orders")
      .select("id, provider_id, provider_order_id")
      .in("status", ["SENT_TO_PROVIDER", "PROVIDER_ACCEPTED", "IN_PRODUCTION", "PARTIALLY_SHIPPED", "SHIPPED"])
      .not("provider_order_id", "is", null)
      .lt("updated_at", new Date(Date.now() - 6 * 3600_000).toISOString())
      .limit(50);
    let n = 0;
    for (const fo of data ?? []) {
      try {
        const provider = fulfillmentProviderFactory.getProvider(fo.provider_id);
        if (!provider.isConfigured()) continue;
        await applyProviderSnapshot(fo.id, await provider.getOrder(fo.provider_order_id!));
        n++;
      } catch (e) {
        log.warn("CRON", "reconcile failed", { foId: fo.id, msg: e instanceof Error ? e.message : String(e) });
      }
    }
    return { reconciled: n };
  },
  "abandoned-carts": async () => {
    const brand = await getBrand();
    const hours = brand.settings.abandoned_cart_hours ?? 4;
    const sb = db();
    const { data: carts } = await sb
      .from("carts")
      .select("id, email, customer_id, customers(marketing_consent, unsubscribe_token)")
      .eq("status", "CHECKOUT_STARTED")
      .is("abandoned_notified_at", null)
      .lt("checkout_started_at", new Date(Date.now() - hours * 3600_000).toISOString())
      .gt("checkout_started_at", new Date(Date.now() - 7 * 86400_000).toISOString())
      .limit(100);
    for (const c of carts ?? []) {
      const cust = c.customers as unknown as { marketing_consent: boolean; unsubscribe_token: string } | null;
      await sb.from("carts").update({ status: "ABANDONED", abandoned_notified_at: new Date().toISOString() }).eq("id", c.id);
      await emitEvent("CART_ABANDONED", {
        cartId: c.id,
        email: c.email,
        customerId: c.customer_id,
        marketingConsent: Boolean(cust?.marketing_consent),
        unsubscribeUrl: cust ? `${env.siteUrl()}/api/unsubscribe?c=${cust.unsubscribe_token}` : undefined,
      });
    }
    return { processed: carts?.length ?? 0 };
  },
  /** Scheduled drops start/end automatically. */
  drops: async () => {
    const sb = db();
    const now = new Date().toISOString();
    const { data: starting } = await sb.from("drops").select("id").eq("status", "SCHEDULED").lte("start_date", now);
    for (const d of starting ?? []) await emitEvent("DROP_STARTED", { dropId: d.id });
    const { data: ending } = await sb.from("drops").select("id").eq("status", "LIVE").lte("end_date", now);
    for (const d of ending ?? []) await emitEvent("DROP_ENDED", { dropId: d.id });
    return { started: starting?.length ?? 0, ended: ending?.length ?? 0 };
  },
  /** Internal content metrics: attribute real orders to content via analytics events. */
  "content-aggregation": async () => {
    const sb = db();
    const since = new Date(Date.now() - 2 * 86400_000).toISOString();
    const { data: evs } = await sb.from("analytics_events").select("content_id, event, value, created_at").not("content_id", "is", null).gte("created_at", since).in("event", ["content_view", "content_click", "purchase"]);
    const agg = new Map<string, { views: number; clicks: number; orders: number; revenue: number }>();
    for (const e of evs ?? []) {
      const key = `${e.content_id}|${e.created_at.slice(0, 10)}`;
      const a = agg.get(key) ?? { views: 0, clicks: 0, orders: 0, revenue: 0 };
      if (e.event === "content_view") a.views++;
      if (e.event === "content_click") a.clicks++;
      if (e.event === "purchase") {
        a.orders++;
        a.revenue += Number(e.value ?? 0);
      }
      agg.set(key, a);
    }
    for (const [key, a] of agg) {
      const [content_id, date] = key.split("|");
      await sb.from("content_metrics").upsert({ content_id, date, views: a.views, clicks: a.clicks, orders: a.orders, revenue: a.revenue, source: "INTERNAL" }, { onConflict: "content_id,date" });
    }
    return { rows: agg.size };
  },
  /** Product availability check: re-evaluate eligibility of all published products. */
  availability: async () => {
    const sb = db();
    const { data } = await sb.from("products").select("id").eq("status", "PUBLISHED");
    let paused = 0;
    for (const p of data ?? []) {
      const { data: r } = await sb.rpc("refresh_product_eligibility", { p_product_id: p.id });
      if (!(r as { eligible?: boolean })?.eligible) paused++;
    }
    return { checked: data?.length ?? 0, paused };
  },
};

async function run(req: Request, ctx: { params: Promise<{ job: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured.db()) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  const { job } = await ctx.params;
  const fn = JOBS[job];
  if (!fn) return NextResponse.json({ error: "unknown job", jobs: Object.keys(JOBS) }, { status: 404 });
  const started = Date.now();
  try {
    const result = await fn();
    log.info("CRON", "job done", { job, ms: Date.now() - started });
    return NextResponse.json({ ok: true, job, result, ms: Date.now() - started });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("CRON", "job failed", { job, msg });
    return NextResponse.json({ ok: false, job, error: msg }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;

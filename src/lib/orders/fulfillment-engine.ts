import "server-only";
import { mergeFiles, preparePersonalization, type PrepareResult } from "@/lib/personalization/prepare";
import { db } from "@/lib/supabase/admin";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import { isProviderError, ProviderNotConfiguredError } from "@/lib/fulfillment/errors";
import type { ProviderOrderInput, ProviderOrderSnapshot } from "@/lib/fulfillment/types";
import { log } from "@/lib/logger";
import { addOrderEvent } from "./events";
import { planFulfillment, type ProviderState, type RoutableItem, type RoutableMapping } from "./router";
import {
  aggregateOrderStatus,
  fulfillmentStatusFromProvider,
  isForwardTransition,
  nextRetryDelayMs,
  type FulfillmentOrderStatus,
} from "./status";
import { emitEvent } from "@/lib/events/bus";

const CLAIMABLE: FulfillmentOrderStatus[] = ["PENDING", "RETRY_SCHEDULED"];
const TRANSIENT_ROUTING = /^PRIMARY:PROVIDER_(OFFLINE|ERROR)$/;

type PrintFile = { type: string; url: string };

function filesFrom(cfg: unknown): PrintFile[] {
  if (!cfg || typeof cfg !== "object") return [];
  const files = (cfg as { files?: unknown }).files;
  if (!Array.isArray(files)) return [];
  return files.filter((f): f is PrintFile => !!f && typeof f === "object" && typeof (f as PrintFile).url === "string" && typeof (f as PrintFile).type === "string");
}

async function loadProviderStates(): Promise<ProviderState[]> {
  const sb = db();
  const [{ data: providers }, { data: caps }] = await Promise.all([
    sb.from("providers").select("id, active, health_status, auto_routing_enabled"),
    sb.from("provider_capabilities").select("provider_id, capability, supported").eq("capability", "order_api"),
  ]);
  return (providers ?? []).map((p) => ({
    id: p.id,
    active: p.active,
    health: p.health_status,
    autoRoutingEnabled: p.auto_routing_enabled,
    supportsOrders: Boolean(caps?.find((c) => c.provider_id === p.id)?.supported),
    supportedCountries: null,
  }));
}

/** Loads routable items (with primary/backup mappings) for an order. */
async function loadRoutableItems(orderId: string): Promise<RoutableItem[]> {
  const sb = db();
  const { data: items, error } = await sb.from("order_items").select("id, product_id, variant_id, quantity, print_files").eq("order_id", orderId);
  if (error) throw error;
  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: maps } = await sb
    .from("product_provider_mappings")
    .select("id, product_id, provider_id, role, approved, active, provider_product_id, print_config, variant_provider_mappings(variant_id, provider_variant_id, status, files)")
    .in("product_id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);

  return (items ?? []).map((it) => ({
    orderItemId: it.id,
    productId: it.product_id,
    variantId: it.variant_id,
    quantity: it.quantity,
    mappings: (maps ?? [])
      .filter((m) => m.product_id === it.product_id)
      .map((m): RoutableMapping => {
        const vms = (m.variant_provider_mappings ?? []) as { variant_id: string; provider_variant_id: string; status: RoutableMapping["variantMappingStatus"]; files: unknown }[];
        const vm = vms.find((v) => v.variant_id === it.variant_id);
        const vFiles = filesFrom({ files: vm?.files });
        return {
          providerId: m.provider_id,
          role: m.role,
          approved: m.approved,
          active: m.active,
          providerProductId: m.provider_product_id,
          providerVariantId: vm?.provider_variant_id ?? null,
          variantMappingStatus: vm?.status ?? null,
          files: mergeFiles(vFiles.length ? vFiles : filesFrom(m.print_config), it.print_files),
        };
      }),
  }));
}

async function recordFulfillmentError(input: {
  orderId: string;
  fulfillmentOrderId?: string | null;
  provider?: string | null;
  code?: string | null;
  message: string;
  endpoint?: string | null;
  httpStatus?: number | null;
  requestId?: string | null;
  payload?: unknown;
  retryCount?: number;
  permanent: boolean;
}) {
  await db().from("fulfillment_errors").insert({
    order_id: input.orderId,
    fulfillment_order_id: input.fulfillmentOrderId ?? null,
    provider: input.provider ?? null,
    error_code: input.code ?? null,
    error_message: input.message,
    endpoint: input.endpoint ?? null,
    http_status: input.httpStatus ?? null,
    request_id: input.requestId ?? null,
    payload: (input.payload ?? null) as object | null,
    retry_count: input.retryCount ?? 0,
    permanent: input.permanent,
  });
}

/**
 * PAYMENT_CONFIRMED → route & submit. Idempotent: safe to call repeatedly.
 */
export async function processPaidOrder(orderId: string) {
  const sb = db();
  const { data: order } = await sb.from("orders").select("id, status, payment_status, shipping_address").eq("id", orderId).single();
  if (!order || order.payment_status !== "PAID") {
    log.warn("FULFILLMENT", "processPaidOrder skipped (not paid)", { orderId });
    return;
  }
  if (order.status === "REQUIRES_REVIEW") return; // held for a human

  const { data: existing } = await sb.from("fulfillment_orders").select("id, status").eq("order_id", orderId);
  if (existing && existing.length > 0) {
    for (const fo of existing) if (CLAIMABLE.includes(fo.status)) await submitFulfillmentOrder(fo.id);
    return;
  }

  const country = (order.shipping_address as { country?: string } | null)?.country;
  if (!country) {
    await holdForReview(orderId, "MISSING_SHIPPING_ADDRESS");
    return;
  }

  // Customer personalization / own designs: render print files, hold uploads for human approval.
  const perso = await preparePersonalization(orderId).catch((e): PrepareResult => ({ status: "FAILED", reason: e instanceof Error ? e.message : String(e) }));
  if (perso.status === "FAILED") {
    await recordFulfillmentError({ orderId, code: "PERSONALIZATION_FAILED", message: perso.reason ?? "unknown", permanent: false });
    await holdForReview(orderId, `PERSONALIZATION_FAILED: ${perso.reason ?? ""}`);
    return;
  }
  if (perso.status === "NEEDS_REVIEW") {
    await holdForReview(orderId, `PERSONALIZATION_REVIEW: ${perso.reason ?? ""}`);
    return;
  }

  const [items, providers] = await Promise.all([loadRoutableItems(orderId), loadProviderStates()]);
  const plan = planFulfillment(items, providers, country);

  // Primary provider temporarily down and no approved backup → schedule retry instead of review.
  const transientOnly = plan.unroutable.length > 0 && plan.unroutable.every((u) => u.reasons.every((r) => TRANSIENT_ROUTING.test(r) || r.startsWith("BACKUP:")) && u.reasons.some((r) => TRANSIENT_ROUTING.test(r)));
  if (plan.unroutable.length > 0 && !transientOnly) {
    for (const u of plan.unroutable) {
      await recordFulfillmentError({ orderId, code: "ROUTING_FAILED", message: `Item ${u.orderItemId}: ${u.reasons.join(", ")}`, permanent: true, payload: u });
    }
    await holdForReview(orderId, `ROUTING_FAILED: ${plan.unroutable.flatMap((u) => u.reasons).join(", ")}`);
    return;
  }

  await sb.from("orders").update({ status: "PROCESSING", fulfillment_status: "PROCESSING" }).eq("id", orderId);
  await addOrderEvent(orderId, "FULFILLMENT_ROUTED", { from: order.status, to: "PROCESSING", data: { groups: plan.groups.map((g) => ({ provider: g.providerId, role: g.role, items: g.items.length })) } });

  if (transientOnly) {
    // Build primary groups for retry later.
    const retryAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const unroutableIds = new Set(plan.unroutable.map((u) => u.orderItemId));
    for (const it of items.filter((x) => unroutableIds.has(x.orderItemId))) {
      const primary = it.mappings.find((m) => m.role === "PRIMARY");
      if (!primary?.providerVariantId) continue;
      plan.groups.push({ providerId: primary.providerId, role: "PRIMARY", items: [{ orderItemId: it.orderItemId, providerProductId: primary.providerProductId, providerVariantId: primary.providerVariantId, quantity: it.quantity, files: primary.files }] });
    }
    // Items routed to a healthy provider (e.g. approved backup) are submitted now; the rest retry later.
    for (const g of mergeGroups(plan.groups)) {
      const allRetry = g.items.every((i) => unroutableIds.has(i.orderItemId));
      const id = await createGroup(orderId, g, allRetry ? "RETRY_SCHEDULED" : "PENDING", allRetry ? retryAt : null);
      if (id && !allRetry) await submitFulfillmentOrder(id);
    }
    await syncOrderStatus(orderId);
    return;
  }

  const ids: string[] = [];
  for (const g of plan.groups) {
    const id = await createGroup(orderId, g, "PENDING");
    if (id) ids.push(id); // only groups created by THIS call are submitted (concurrency-safe)
  }
  for (const id of ids) await submitFulfillmentOrder(id);
}

type GroupPlan = { providerId: string; role: "PRIMARY" | "BACKUP"; items: { orderItemId: string; providerProductId: string; providerVariantId: string; quantity: number; files: PrintFile[] }[] };

function mergeGroups(groups: GroupPlan[]): GroupPlan[] {
  const m = new Map<string, GroupPlan>();
  for (const g of groups) {
    const e = m.get(g.providerId);
    if (e) e.items.push(...g.items);
    else m.set(g.providerId, { ...g, items: [...g.items] });
  }
  return [...m.values()];
}

/** Inserts a fulfillment group; returns its id, or null if another worker already created it. */
async function createGroup(
  orderId: string,
  g: GroupPlan,
  status: FulfillmentOrderStatus,
  nextRetryAt: string | null = null,
): Promise<string | null> {
  const sb = db();
  const { data: rows, error } = await sb
    .from("fulfillment_orders")
    .upsert({ order_id: orderId, provider_id: g.providerId, mapping_role: g.role, status, next_retry_at: nextRetryAt }, { onConflict: "order_id,provider_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  const fo = rows?.[0];
  if (!fo) return null;
  await sb.from("fulfillment_items").upsert(
    g.items.map((i) => ({
      fulfillment_order_id: fo.id,
      order_item_id: i.orderItemId,
      provider_product_id: i.providerProductId,
      provider_variant_id: i.providerVariantId,
      quantity: i.quantity,
      files: i.files,
    })),
    { onConflict: "fulfillment_order_id,order_item_id" },
  );
  return fo.id;
}

export async function holdForReview(orderId: string, reason: string) {
  const sb = db();
  const { data: o } = await sb.from("orders").select("status").eq("id", orderId).single();
  await sb.from("orders").update({ status: "REQUIRES_REVIEW", fulfillment_status: "REQUIRES_REVIEW", review_reason: reason.slice(0, 1000) }).eq("id", orderId);
  await addOrderEvent(orderId, "REQUIRES_REVIEW", { from: o?.status, to: "REQUIRES_REVIEW", message: reason });
  log.warn("FULFILLMENT", "order requires review", { orderId, reason });
  await emitEvent("ORDER_FAILED", { orderId, reason });
}

async function buildProviderInput(foId: string, externalId: string): Promise<ProviderOrderInput> {
  const sb = db();
  const { data: fo } = await sb
    .from("fulfillment_orders")
    .select("id, order_id, orders(id, order_number, currency, customer_email, customer_name, customer_phone, shipping_address, subtotal, discount, shipping, tax, shipping_method), fulfillment_items(order_item_id, provider_product_id, provider_variant_id, quantity, files, order_items(product_name, variant_name, unit_price))")
    .eq("id", foId)
    .single();
  if (!fo) throw new Error("fulfillment order not found");
  const order = fo.orders as unknown as {
    currency: string;
    customer_email: string;
    customer_name: string | null;
    customer_phone: string | null;
    shipping_address: { name?: string; line1: string; line2?: string; city: string; postal_code: string; state?: string; country: string; phone?: string } | null;
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    shipping_method: string | null;
  };
  const a = order.shipping_address;
  if (!a) throw new Error("MISSING_SHIPPING_ADDRESS");
  const items = (fo.fulfillment_items ?? []) as unknown as {
    order_item_id: string;
    provider_product_id: string | null;
    provider_variant_id: string;
    quantity: number;
    files: PrintFile[] | null;
    order_items: { product_name: string; variant_name: string | null; unit_price: number };
  }[];
  return {
    externalId,
    currency: order.currency,
    confirm: true,
    shippingMethod: null,
    recipient: {
      name: a.name ?? order.customer_name ?? order.customer_email,
      line1: a.line1,
      line2: a.line2 ?? null,
      city: a.city,
      postalCode: a.postal_code,
      state: a.state ?? null,
      country: a.country,
      email: order.customer_email,
      phone: a.phone ?? order.customer_phone ?? null,
    },
    items: items.map((i) => ({
      referenceId: i.order_item_id,
      providerProductId: i.provider_product_id,
      providerVariantId: i.provider_variant_id,
      quantity: i.quantity,
      retailPrice: Number(i.order_items.unit_price),
      name: [i.order_items.product_name, i.order_items.variant_name].filter(Boolean).join(" — "),
      files: i.files ?? [],
    })),
    retail: { subtotal: Number(order.subtotal), discount: Number(order.discount), shipping: Number(order.shipping), tax: Number(order.tax) },
  };
}

/** Submits one fulfillment group to its provider with retry classification. */
export async function submitFulfillmentOrder(foId: string) {
  const sb = db();
  const { data: row } = await sb.from("fulfillment_orders").select("id, order_id, provider_id, status, attempts, orders(order_number, status, payment_status)").eq("id", foId).single();
  if (!row || !CLAIMABLE.includes(row.status)) return;
  const ord = row.orders as unknown as { order_number: number; status: string; payment_status: string };
  if (ord.payment_status !== "PAID" || ["CANCELLED", "REFUNDED"].includes(ord.status)) {
    // Never produce an order that is no longer paid (refunded/cancelled while waiting for retry).
    await sb.from("fulfillment_orders").update({ status: "CANCELLED", next_retry_at: null }).eq("id", foId).in("status", CLAIMABLE);
    await addOrderEvent(row.order_id, "FULFILLMENT_SKIPPED", { message: `order ${ord.status}/${ord.payment_status}` });
    return;
  }

  // Optimistic claim → no concurrent double submission.
  const { data: claimed } = await sb
    .from("fulfillment_orders")
    .update({ status: "SUBMITTING", attempts: row.attempts + 1 })
    .eq("id", foId)
    .eq("attempts", row.attempts)
    .in("status", CLAIMABLE)
    .select("id");
  if (!claimed || claimed.length === 0) return;

  const attempt = row.attempts + 1;
  const externalId = `${ord.order_number}-${row.provider_id}`;
  let lookupSupported = false;

  try {
    const provider = fulfillmentProviderFactory.getProvider(row.provider_id);
    lookupSupported = provider.externalIdLookup;
    if (!provider.isConfigured()) throw new ProviderNotConfiguredError(provider.id);
    // Always check first: an earlier attempt may have been committed despite an error/timeout.
    let snapshot: ProviderOrderSnapshot | null = provider.externalIdLookup ? await provider.getOrderByExternalId(externalId) : null;
    if (!snapshot) {
      const input = await buildProviderInput(foId, externalId);
      snapshot = await provider.createOrder(input);
    }
    const status = fulfillmentStatusFromProvider(snapshot.status);
    await sb
      .from("fulfillment_orders")
      .update({
        status,
        provider_order_id: snapshot.providerOrderId,
        provider_status: snapshot.rawStatus,
        cost_total: snapshot.costs.total,
        shipping_cost: snapshot.costs.shipping,
        currency: snapshot.costs.currency,
        submitted_at: new Date().toISOString(),
        accepted_at: status === "PROVIDER_ACCEPTED" || status === "IN_PRODUCTION" ? new Date().toISOString() : null,
        next_retry_at: null,
        last_error: null,
        raw: snapshot.raw as object,
      })
      .eq("id", foId);
    await addOrderEvent(row.order_id, "SENT_TO_PROVIDER", { to: status, data: { provider: row.provider_id, providerOrderId: snapshot.providerOrderId, attempt } });
    log.info("FULFILLMENT", "submitted", { foId, provider: row.provider_id, providerOrderId: snapshot.providerOrderId });
  } catch (e) {
    // Ambiguous create failures (timeout/5xx/bad 2xx) on providers without an external-id lookup
    // could have created the order → a human must verify instead of an automatic retry (no duplicates).
    const ambiguousNoLookup = isProviderError(e) && e.ambiguous && !lookupSupported;
    const permanent = ambiguousNoLookup || e instanceof ProviderNotConfiguredError || (isProviderError(e) ? e.permanent : e instanceof Error && e.message === "MISSING_SHIPPING_ADDRESS");
    const message = (ambiguousNoLookup ? "AMBIGUOUS: verify in the provider dashboard whether this order exists before retrying — " : "") + (e instanceof Error ? e.message : String(e));
    await recordFulfillmentError({
      orderId: row.order_id,
      fulfillmentOrderId: foId,
      provider: row.provider_id,
      code: isProviderError(e) ? e.code ?? `HTTP_${e.status ?? "NETWORK"}` : e instanceof Error ? e.name : "ERROR",
      message,
      endpoint: isProviderError(e) ? e.endpoint : null,
      httpStatus: isProviderError(e) ? e.status : null,
      requestId: isProviderError(e) ? e.requestId : null,
      payload: isProviderError(e) ? e.payload : null,
      retryCount: attempt,
      permanent,
    });
    const delay = permanent ? null : nextRetryDelayMs(attempt);
    const next: FulfillmentOrderStatus = permanent ? "REQUIRES_REVIEW" : delay === null ? "FAILED" : "RETRY_SCHEDULED";
    await sb
      .from("fulfillment_orders")
      .update({ status: next, last_error: message.slice(0, 1000), next_retry_at: delay ? new Date(Date.now() + delay).toISOString() : null })
      .eq("id", foId);
    await addOrderEvent(row.order_id, "FULFILLMENT_ERROR", { to: next, message, data: { provider: row.provider_id, attempt, permanent } });
    log.error("FULFILLMENT", "submit failed", { foId, provider: row.provider_id, attempt, permanent, message });
  }
  await syncOrderStatus(row.order_id);
}

/** Cron: retry due groups (exponential backoff, max attempts enforced in status.ts). */
export async function retryDueFulfillments(limit = 25) {
  const { data } = await db()
    .from("fulfillment_orders")
    .select("id")
    .eq("status", "RETRY_SCHEDULED")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at")
    .limit(limit);
  for (const r of data ?? []) await submitFulfillmentOrder(r.id);
  return (data ?? []).length;
}

/** Applies a trusted provider snapshot (fetched from the provider API) to our records. */
export async function applyProviderSnapshot(foId: string, snapshot: ProviderOrderSnapshot) {
  const sb = db();
  const { data: fo } = await sb.from("fulfillment_orders").select("id, order_id, status, shipped_at, delivered_at").eq("id", foId).single();
  if (!fo) return;

  for (const s of snapshot.shipments) {
    await sb.from("shipments").upsert(
      {
        order_id: fo.order_id,
        fulfillment_order_id: foId,
        provider_shipment_id: s.providerShipmentId,
        carrier: s.carrier,
        service: s.service,
        tracking_number: s.trackingNumber,
        tracking_url: s.trackingUrl,
        shipped_at: s.shippedAt,
        estimated_delivery_min: s.estimatedMin?.slice(0, 10) ?? null,
        estimated_delivery_max: s.estimatedMax?.slice(0, 10) ?? null,
        status: snapshot.status === "DELIVERED" ? "DELIVERED" : "SHIPPED",
      },
      { onConflict: "fulfillment_order_id,provider_shipment_id" },
    );
  }

  const next = fulfillmentStatusFromProvider(snapshot.status);
  if (isForwardTransition(fo.status, next) && next !== fo.status) {
    const now = new Date().toISOString();
    await sb
      .from("fulfillment_orders")
      .update({
        status: next,
        provider_status: snapshot.rawStatus,
        shipped_at: next === "SHIPPED" || next === "PARTIALLY_SHIPPED" ? fo.shipped_at ?? now : fo.shipped_at,
        delivered_at: next === "DELIVERED" ? now : fo.delivered_at,
        raw: snapshot.raw as object,
      })
      .eq("id", foId);
    if (next === "FAILED" || next === "REQUIRES_REVIEW") {
      await recordFulfillmentError({ orderId: fo.order_id, fulfillmentOrderId: foId, code: `PROVIDER_${snapshot.rawStatus.toUpperCase()}`, message: `Provider reported status ${snapshot.rawStatus}`, permanent: true, payload: snapshot.raw });
    }
    await addOrderEvent(fo.order_id, "PROVIDER_STATUS", { from: fo.status, to: next, data: { rawStatus: snapshot.rawStatus } });
  }

  const first = snapshot.shipments.find((s) => s.trackingNumber || s.trackingUrl);
  if (first) {
    await sb.from("orders").update({ tracking_number: first.trackingNumber, tracking_url: first.trackingUrl, carrier: first.carrier }).eq("id", fo.order_id);
  }
  await syncOrderStatus(fo.order_id);
}

/** Recomputes order status from its groups, logs the transition, emits automation events. */
export async function syncOrderStatus(orderId: string) {
  const sb = db();
  const [{ data: order }, { data: groups }] = await Promise.all([
    sb.from("orders").select("id, status, fulfillment_status").eq("id", orderId).single(),
    sb.from("fulfillment_orders").select("provider_id, provider_order_id, status").eq("order_id", orderId),
  ]);
  if (!order || !groups || groups.length === 0) return; // held/unrouted orders keep their status
  if (["CANCELLED", "REFUNDED"].includes(order.status)) return;
  const agg = aggregateOrderStatus(groups.map((g) => g.status));
  if (agg.status === order.status && agg.fulfillmentStatus === order.fulfillment_status) return;

  const single = groups.length === 1 ? groups[0] : null;
  await sb
    .from("orders")
    .update({
      status: agg.status,
      fulfillment_status: agg.fulfillmentStatus,
      provider: single?.provider_id ?? null,
      provider_order_id: single?.provider_order_id ?? null,
    })
    .eq("id", orderId);
  await addOrderEvent(orderId, "STATUS_CHANGED", { from: order.status, to: agg.status });

  const map: Record<string, Parameters<typeof emitEvent>[0] | undefined> = {
    SENT_TO_PROVIDER: "ORDER_SENT_TO_PROVIDER",
    PROVIDER_ACCEPTED: "ORDER_ACCEPTED",
    IN_PRODUCTION: "ORDER_ACCEPTED",
    SHIPPED: "ORDER_SHIPPED",
    DELIVERED: "ORDER_DELIVERED",
    FULFILLMENT_FAILED: "ORDER_FAILED",
    REQUIRES_REVIEW: "ORDER_FAILED",
  };
  const ev = map[agg.status];
  if (ev) await emitEvent(ev, { orderId });
}

/**
 * Safety net for paid orders that got stuck (crash mid-flow, swallowed handler error, lost claim):
 * PAID/PROCESSING orders without groups → re-route; PENDING/SUBMITTING groups older than 10 min → retry.
 */
export async function sweepStuckFulfillment() {
  const sb = db();
  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: orders } = await sb.from("orders").select("id, fulfillment_orders(id)").eq("payment_status", "PAID").in("status", ["PAID", "PROCESSING"]).lt("paid_at", cutoff).limit(50);
  let rerouted = 0;
  for (const o of orders ?? []) {
    if (((o.fulfillment_orders as unknown as unknown[]) ?? []).length === 0) {
      await processPaidOrder(o.id);
      rerouted++;
    }
  }
  const { data: stuck } = await sb.from("fulfillment_orders").select("id, order_id, provider_id, status").in("status", ["PENDING", "SUBMITTING"]).lt("updated_at", cutoff).limit(100);
  let requeued = 0;
  let review = 0;
  for (const g of stuck ?? []) {
    const safe = g.status === "PENDING" || fulfillmentProviderFactory.getProvider(g.provider_id).externalIdLookup;
    if (safe) {
      await sb.from("fulfillment_orders").update({ status: "RETRY_SCHEDULED", next_retry_at: new Date().toISOString() }).eq("id", g.id).eq("status", g.status);
      requeued++;
    } else {
      const msg = "AMBIGUOUS: submission interrupted — verify in the provider dashboard whether this order exists before retrying";
      await sb.from("fulfillment_orders").update({ status: "REQUIRES_REVIEW", last_error: msg }).eq("id", g.id).eq("status", "SUBMITTING");
      await recordFulfillmentError({ orderId: g.order_id, fulfillmentOrderId: g.id, provider: g.provider_id, code: "AMBIGUOUS_SUBMISSION", message: msg, permanent: true });
      await syncOrderStatus(g.order_id);
      review++;
    }
  }
  return { rerouted, requeued, review };
}

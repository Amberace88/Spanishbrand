import "server-only";
import { activateGiftCard } from "./gift-cards";
import type Stripe from "stripe";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { addOrderEvent } from "@/lib/orders/events";
import { emitEvent } from "@/lib/events/bus";
import { holdForReview } from "@/lib/orders/fulfillment-engine";
import { spanishRegionFromPostalCode } from "@/lib/tax/tax-service";
import { round2 } from "@/lib/pricing/cost-engine";
import { fromCents, stripe } from "./stripe";
import { log } from "@/lib/logger";

type Addr = Stripe.Address | null | undefined;

function toAddress(name: string | null | undefined, a: Addr, phone?: string | null) {
  if (!a) return null;
  return {
    name: name ?? null,
    line1: a.line1 ?? "",
    line2: a.line2 ?? null,
    city: a.city ?? "",
    postal_code: a.postal_code ?? "",
    state: a.state ?? null,
    country: a.country ?? "",
    phone: phone ?? null,
  };
}

/** checkout.session.completed / async_payment_succeeded → PAID → PAYMENT_CONFIRMED. Idempotent. */
export async function handleCheckoutPaid(session: Stripe.Checkout.Session) {
  if (session.metadata?.type === "gift_card") return activateGiftCard(session);
  const sb = db();
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) throw new Error("session without order_id");
  const { data: order } = await sb.from("orders").select("id, status, payment_status, total, customer_id, cart_id, creator_id, discount_code, metadata, currency").eq("id", orderId).single();
  if (!order) throw new Error(`order ${orderId} not found`);
  if (order.payment_status === "PAID") return; // already processed
  if (session.payment_status !== "paid") {
    log.info("PAYMENT", "session completed but not paid yet (async)", { orderId });
    return;
  }

  // Shipping details moved to collected_information in newer API versions.
  const collected = (session as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Stripe.Address } } }).collected_information;
  const legacy = (session as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } }).shipping_details;
  const ship = collected?.shipping_details ?? legacy;
  const cd = session.customer_details;
  const shippingAddress = toAddress(ship?.name ?? cd?.name, ship?.address ?? cd?.address, cd?.phone);
  const billingAddress = toAddress(cd?.name, cd?.address, cd?.phone);
  const paid = fromCents(session.amount_total);
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  const { data: claimed } = await sb
    .from("orders")
    .update({
      status: "PAID",
      payment_status: "PAID",
      paid_at: new Date().toISOString(),
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      customer_name: shippingAddress?.name ?? cd?.name ?? null,
      customer_phone: cd?.phone ?? null,
      stripe_payment_intent_id: piId,
    })
    .eq("id", orderId)
    .eq("payment_status", "PENDING")
    .select("id");
  if (!claimed?.length) {
    // Another delivery won the race, or the order was cancelled/expired before the payment landed.
    const { data: now } = await sb.from("orders").select("payment_status").eq("id", orderId).single();
    if (now?.payment_status !== "PAID") {
      await sb.from("orders").update({ payment_status: "PAID", paid_at: new Date().toISOString(), stripe_payment_intent_id: piId, shipping_address: shippingAddress, billing_address: billingAddress }).eq("id", orderId);
      await holdForReview(orderId, `PAID_BUT_ORDER_NOT_PENDING (was ${now?.payment_status})`);
    }
    return;
  }
  await addOrderEvent(orderId, "PAYMENT_CONFIRMED", { from: order.status, to: "PAID", data: { amount: paid, session: session.id } });

  if (piId) {
    await sb.from("payments").upsert(
      { order_id: orderId, provider: "stripe", provider_payment_id: piId, amount: paid, currency: (session.currency ?? "eur").toUpperCase(), status: "SUCCEEDED", raw: { session_id: session.id } },
      { onConflict: "provider,provider_payment_id" },
    );
  }

  // Post-payment bookkeeping
  if (order.cart_id) await sb.from("carts").update({ status: "CONVERTED", converted_order_id: orderId }).eq("id", order.cart_id);
  const meta = (order.metadata ?? {}) as { discount_id?: string | null };
  if (meta.discount_id) {
    await sb.from("discount_usage").upsert({ discount_id: meta.discount_id, order_id: orderId, customer_id: order.customer_id, amount: 0 }, { onConflict: "discount_id,order_id" });
    const { data: d } = await sb.from("discounts").select("uses").eq("id", meta.discount_id).single();
    if (d) await sb.from("discounts").update({ uses: d.uses + 1 }).eq("id", meta.discount_id);
    await sb.from("gift_cards").update({ status: "REDEEMED" }).eq("discount_id", meta.discount_id).eq("status", "ACTIVE");
  }
  if (order.creator_id) {
    const { data: creator } = await sb.from("creators").select("id, commission_rate, total_orders, total_revenue").eq("id", order.creator_id).single();
    if (creator) {
      const base = round2(paid);
      await sb.from("creator_commissions").upsert(
        { creator_id: creator.id, order_id: orderId, base_amount: base, rate: creator.commission_rate, amount: round2(base * Number(creator.commission_rate)) },
        { onConflict: "creator_id,order_id" },
      );
      await sb.from("creators").update({ total_orders: creator.total_orders + 1, total_revenue: round2(Number(creator.total_revenue) + base) }).eq("id", creator.id);
    }
  }
  if (order.customer_id) {
    await sb.rpc("recalc_customer", { p_customer_id: order.customer_id });
    await sb.rpc("award_order_points", { p_order_id: orderId }); // club members: 1 point per €
    await sb.from("customer_events").insert({ brand_id: env.brandId(), customer_id: order.customer_id, type: "purchase", data: { order_id: orderId, total: paid } });
  }

  // Safety checks that require a human before fulfillment
  const reasons: string[] = [];
  if (Math.abs(paid - Number(order.total)) > 0.01) reasons.push(`AMOUNT_MISMATCH paid=${paid} expected=${order.total}`);
  if (!shippingAddress?.line1 || !shippingAddress.postal_code) reasons.push("INCOMPLETE_SHIPPING_ADDRESS");
  if (shippingAddress?.country === "ES" && spanishRegionFromPostalCode(shippingAddress.postal_code)) reasons.push("TAX_TERRITORY_REVIEW (Canarias/Ceuta/Melilla)");
  const { data: items } = await sb.from("order_items").select("product_id, quantity").eq("order_id", orderId);
  for (const it of items ?? []) {
    const { data: ok } = await sb.rpc("reserve_limited_quantity", { p_product_id: it.product_id, p_qty: it.quantity });
    if (ok === false) reasons.push(`LIMITED_QUANTITY_EXCEEDED ${it.product_id}`);
  }

  if (reasons.length) {
    await holdForReview(orderId, reasons.join("; "));
    await emitEvent("PAYMENT_CONFIRMED", { orderId, held: true });
    return;
  }
  await emitEvent("PAYMENT_CONFIRMED", { orderId });
}

export async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  if (session.metadata?.type === "gift_card") {
    if (session.metadata.gift_card_id) await db().from("gift_cards").update({ status: "CANCELLED" }).eq("id", session.metadata.gift_card_id).eq("status", "PENDING");
    return;
  }
  const sb = db();
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return;
  const { data } = await sb.from("orders").update({ status: "CANCELLED", payment_status: "EXPIRED" }).eq("id", orderId).eq("payment_status", "PENDING").select("cart_id");
  if (data?.[0]?.cart_id) await sb.from("carts").update({ status: "ACTIVE" }).eq("id", data[0].cart_id).eq("status", "CHECKOUT_STARTED");
  await addOrderEvent(orderId, "CHECKOUT_EXPIRED", { to: "CANCELLED" });
}

export async function handlePaymentFailed(session: Stripe.Checkout.Session) {
  if (session.metadata?.type === "gift_card") return;
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return;
  await db().from("orders").update({ payment_status: "FAILED" }).eq("id", orderId).eq("payment_status", "PENDING");
  await addOrderEvent(orderId, "PAYMENT_FAILED");
}

export async function handleChargeRefunded(charge: Stripe.Charge) {
  const sb = db();
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;
  if (charge.metadata?.type === "gift_card" && charge.metadata.gift_card_id && charge.refunded) {
    // Refunded gift card → code no longer valid (if unused).
    const { data: card } = await sb.from("gift_cards").update({ status: "CANCELLED" }).eq("id", charge.metadata.gift_card_id).neq("status", "REDEEMED").select("discount_id");
    if (card?.[0]?.discount_id) await sb.from("discounts").update({ active: false }).eq("id", card[0].discount_id);
    return;
  }
  const { data: order } = await sb.from("orders").select("id, total, status, customer_id").eq("stripe_payment_intent_id", piId).maybeSingle();
  if (!order) return;
  const refunded = fromCents(charge.amount_refunded);
  // charge.refunds is not expanded in current API versions → list explicitly.
  const list = await stripe().refunds.list({ charge: charge.id, limit: 100 });
  for (const r of list.data) {
    await sb.from("refunds").upsert(
      { order_id: order.id, amount: fromCents(r.amount), currency: r.currency.toUpperCase(), reason: r.reason, provider_refund_id: r.id, status: r.status === "succeeded" ? "SUCCEEDED" : r.status === "failed" ? "FAILED" : "PENDING" },
      { onConflict: "provider_refund_id" },
    );
  }
  const full = refunded + 0.001 >= Number(order.total);
  if (full) {
    // Stop anything not yet sent to a provider.
    await sb.from("fulfillment_orders").update({ status: "CANCELLED", next_retry_at: null }).eq("order_id", order.id).is("provider_order_id", null).in("status", ["PENDING", "RETRY_SCHEDULED", "REQUIRES_REVIEW", "FAILED"]);
  }
  await sb.from("orders").update({ payment_status: full ? "REFUNDED" : "PARTIALLY_REFUNDED", ...(full ? { status: "REFUNDED" } : {}) }).eq("id", order.id);
  await sb.from("payments").update({ status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" }).eq("provider_payment_id", piId);
  await addOrderEvent(order.id, "REFUNDED", { from: order.status, to: full ? "REFUNDED" : order.status, data: { refunded } });
  if (order.customer_id) await sb.rpc("recalc_customer", { p_customer_id: order.customer_id });
  await emitEvent("ORDER_REFUNDED", { orderId: order.id, amount: refunded });
}

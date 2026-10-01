import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import { getBrand } from "@/lib/brand";
import { getCart } from "@/lib/cart/cart";
import { quoteShipping } from "@/lib/shipping/engine";
import { TaxService, rowsToTaxRates } from "@/lib/tax/tax-service";
import { round2 } from "@/lib/pricing/cost-engine";
import { stripe, toCents } from "./stripe";
import { track } from "@/lib/analytics/track";
import { log } from "@/lib/logger";

export type CheckoutError =
  | "NOT_CONFIGURED"
  | "EMPTY_CART"
  | "CART_HAS_ISSUES"
  | "PRICE_CHANGED"
  | "DESTINATION_UNSUPPORTED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_DISCOUNT"
  | "CONSENT_REQUIRED"
  | "FAILED";

export interface CheckoutInput {
  email: string;
  country: string;
  marketingConsent: boolean;
  discountCode?: string | null;
  cause?: "VETERANOS" | "MAYORES" | "INFANCIA" | "ANIMALES";
  /** Pre-contract acknowledgments (evidence for returns): terms + returns policy, personalised = no withdrawal (art. 103 c TRLGDCU). */
  consents?: { terms: boolean; personalized: boolean };
}

async function validateDiscount(code: string | null | undefined, subtotal: number) {
  if (!code) return null;
  const { data: d } = await db().from("discounts").select("*").eq("brand_id", env.brandId()).eq("code", code.trim()).maybeSingle();
  const now = Date.now();
  if (!d || !d.active) return { error: true as const };
  if (d.starts_at && new Date(d.starts_at).getTime() > now) return { error: true as const };
  if (d.ends_at && new Date(d.ends_at).getTime() < now) return { error: true as const };
  if (d.max_uses != null && d.uses >= d.max_uses) return { error: true as const };
  if (d.min_subtotal != null && subtotal < Number(d.min_subtotal)) return { error: true as const };
  const amount = d.type === "PERCENT" ? round2((subtotal * Number(d.value)) / 100) : Math.min(subtotal, Number(d.value));
  return { error: false as const, id: d.id as string, code: d.code as string, amount, creatorId: d.creator_id as string | null };
}

/**
 * Pre-payment validation (product active, variant active, fulfillment eligible, provider available,
 * price valid, destination supported) → PENDING_PAYMENT order → Stripe Checkout Session.
 */
export async function createCheckout(input: CheckoutInput): Promise<{ ok: true; url: string } | { ok: false; error: CheckoutError }> {
  if (!isConfigured.db() || !isConfigured.stripe()) return { ok: false, error: "NOT_CONFIGURED" };
  const sb = db();
  const brand = await getBrand();
  const country = input.country.toUpperCase();
  if (!brand.supportedCountries.includes(country)) return { ok: false, error: "DESTINATION_UNSUPPORTED" };

  const cart = await getCart();
  if (!cart.id || cart.lines.length === 0) return { ok: false, error: "EMPTY_CART" };
  if (cart.hasIssues) return { ok: false, error: "CART_HAS_ISSUES" };
  if (cart.lines.some((l) => l.issue === "PRICE_CHANGED")) return { ok: false, error: "PRICE_CHANGED" };
  const hasPersonalized = cart.lines.some((l) => l.personalization && Object.keys(l.personalization).length > 0);
  if (!input.consents?.terms || (hasPersonalized && !input.consents.personalized)) return { ok: false, error: "CONSENT_REQUIRED" };
  const consentAt = new Date().toISOString();

  // Provider availability: primary healthy, or an approved backup exists.
  const productIds = [...new Set(cart.lines.map((l) => l.productId))];
  const [{ data: maps }, { data: providers }] = await Promise.all([
    sb.from("product_provider_mappings").select("product_id, provider_id, role, approved, active").in("product_id", productIds).eq("active", true),
    sb.from("providers").select("id, active, health_status"),
  ]);
  const healthy = (id: string) => {
    const p = providers?.find((x) => x.id === id);
    return !!p && p.active && p.health_status !== "OFFLINE" && p.health_status !== "ERROR";
  };
  for (const pid of productIds) {
    const pm = maps?.filter((m) => m.product_id === pid) ?? [];
    const primary = pm.find((m) => m.role === "PRIMARY");
    const backup = pm.find((m) => m.role === "BACKUP" && m.approved);
    if (!(primary && healthy(primary.provider_id)) && !(backup && healthy(backup.provider_id))) return { ok: false, error: "PROVIDER_UNAVAILABLE" };
  }

  const shipping = await quoteShipping({ country, lines: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), subtotal: cart.subtotal, currency: cart.currency });
  if (!shipping) return { ok: false, error: "DESTINATION_UNSUPPORTED" };

  const discount = await validateDiscount(input.discountCode, cart.subtotal);
  if (discount?.error) return { ok: false, error: "INVALID_DISCOUNT" };
  const discountAmount = discount && !discount.error ? discount.amount : 0;

  const { data: rates } = await sb.from("tax_rates").select("*").eq("active", true);
  const tax = new TaxService(rowsToTaxRates(rates ?? []));
  const pricesIncludeTax = brand.settings.prices_include_tax !== false;
  const taxable = Math.max(0, cart.subtotal - discountAmount) + shipping.amount;
  const taxResult = tax.taxFor(taxable, { country, pricesIncludeTax });
  const total = round2(Math.max(0, cart.subtotal - discountAmount) + shipping.amount + (pricesIncludeTax ? 0 : taxResult.tax));

  // Customer (marketing consent only when explicitly given)
  const email = input.email.trim().toLowerCase();
  const { data: existingCustomer } = await sb.from("customers").select("id, marketing_consent").eq("brand_id", env.brandId()).eq("email", email).maybeSingle();
  let customerId = existingCustomer?.id as string | undefined;
  if (!customerId) {
    const { data: c } = await sb
      .from("customers")
      .insert({ brand_id: env.brandId(), email, country, language: "es", marketing_consent: input.marketingConsent, marketing_consent_at: input.marketingConsent ? new Date().toISOString() : null })
      .select("id")
      .single();
    customerId = c?.id;
    await sb.from("customer_events").insert({ brand_id: env.brandId(), customer_id: customerId, type: "account_created", data: { source: "checkout" } });
  } else if (input.marketingConsent && !existingCustomer?.marketing_consent) {
    await sb.from("customers").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("id", customerId);
  }

  const jar = await cookies();
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let creatorId: string | null = discount && !discount.error && discount.creatorId ? discount.creatorId : jar.get("ref_creator")?.value ?? null;
  if (creatorId && (!UUID.test(creatorId) || !(await sb.from("creators").select("id").eq("id", creatorId).eq("status", "ACTIVE").maybeSingle()).data)) creatorId = null;
  let campaignId: string | null = jar.get("ref_campaign")?.value ?? null;
  if (campaignId && (!UUID.test(campaignId) || !(await sb.from("campaigns").select("id").eq("id", campaignId).maybeSingle()).data)) campaignId = null;

  // Production cost snapshot per variant (internal only)
  const { data: variantCosts } = await sb.from("product_variants").select("id, production_cost").in("id", cart.lines.map((l) => l.variantId));

  const { data: order, error: orderErr } = await sb
    .from("orders")
    .insert({
      brand_id: env.brandId(),
      customer_id: customerId,
      cart_id: cart.id,
      customer_email: email,
      currency: cart.currency,
      subtotal: cart.subtotal,
      discount: discountAmount,
      shipping: shipping.amount,
      tax: taxResult.tax,
      total,
      prices_include_tax: pricesIncludeTax,
      shipping_method: shipping.method,
      discount_code: discount && !discount.error ? discount.code : null,
      creator_id: creatorId,
      campaign_id: campaignId,
      metadata: { shipping_source: shipping.source, tax_rate: taxResult.rate, tax_requires_review: taxResult.requiresReview, marketing_consent: input.marketingConsent, discount_id: discount && !discount.error ? discount.id : null, cause: input.cause ?? null, consents: { terms_and_returns_at: consentAt, personalized_no_withdrawal_at: hasPersonalized ? consentAt : null, personalized_lines: cart.lines.filter((l) => l.personalization && Object.keys(l.personalization).length > 0).map((l) => l.id) } },
    })
    .select("id, order_number")
    .single();
  if (orderErr || !order) {
    log.error("ORDER", "order create failed", { error: orderErr?.message });
    return { ok: false, error: "FAILED" };
  }

  const { error: itemsErr } = await sb.from("order_items").insert(
    cart.lines.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      variant_id: l.variantId,
      product_name: l.productName,
      variant_name: l.variantName,
      quantity: l.quantity,
      unit_price: l.currentPrice,
      total: l.lineTotal,
      production_cost: variantCosts?.find((v) => v.id === l.variantId)?.production_cost ?? null,
      image: l.image,
      personalization: l.personalization ?? {},
    })),
  );
  if (itemsErr) {
    // DB guard rejected a non-purchasable item
    await sb.from("orders").update({ status: "CANCELLED", payment_status: "EXPIRED", review_reason: itemsErr.message }).eq("id", order.id);
    log.warn("ORDER", "order items rejected by eligibility guard", { orderId: order.id, error: itemsErr.message });
    return { ok: false, error: "CART_HAS_ISSUES" };
  }
  await sb.from("order_events").insert({ order_id: order.id, type: "ORDER_CREATED", to_status: "PENDING_PAYMENT" });

  try {
    const s = stripe();
    let couponId: string | undefined;
    if (discountAmount > 0) {
      const coupon = await s.coupons.create({ amount_off: toCents(discountAmount), currency: cart.currency.toLowerCase(), duration: "once", name: discount && !discount.error ? discount.code : "Descuento" }, { idempotencyKey: `coupon-${order.id}` });
      couponId = coupon.id;
    }
    const site = env.siteUrl();
    const session = await s.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: email,
        client_reference_id: order.id,
        locale: "es",
        line_items: cart.lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: cart.currency.toLowerCase(),
            unit_amount: toCents(l.currentPrice),
            product_data: { name: l.productName, description: l.variantName, images: l.image ? [l.image] : undefined },
          },
        })).concat(
          !pricesIncludeTax && taxResult.tax > 0
            ? [{ quantity: 1, price_data: { currency: cart.currency.toLowerCase(), unit_amount: toCents(taxResult.tax), product_data: { name: `IVA ${Math.round(taxResult.rate * 100)}%`, description: "", images: undefined } } }]
            : [],
        ),
        discounts: couponId ? [{ coupon: couponId }] : undefined,
        shipping_address_collection: { allowed_countries: [country as "ES"] },
        phone_number_collection: { enabled: true },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: shipping.name,
              fixed_amount: { amount: toCents(shipping.amount), currency: cart.currency.toLowerCase() },
              delivery_estimate:
                shipping.minDays && shipping.maxDays
                  ? { minimum: { unit: "business_day", value: shipping.minDays }, maximum: { unit: "business_day", value: shipping.maxDays } }
                  : undefined,
            },
          },
        ],
        metadata: { order_id: order.id, order_number: String(order.order_number) },
        payment_intent_data: { metadata: { order_id: order.id, order_number: String(order.order_number) } },
        success_url: `${site}/order-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/cart?cancelled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      { idempotencyKey: `checkout-${order.id}` },
    );
    await sb.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
    await sb.from("carts").update({ status: "CHECKOUT_STARTED", email, customer_id: customerId, country, checkout_started_at: new Date().toISOString() }).eq("id", cart.id);
    const sid = jar.get("sid")?.value ?? null;
    await track({ event: "checkout_started", sessionId: sid, orderId: order.id, value: total, creatorId, campaignId });
    await track({ event: "payment_started", sessionId: sid, orderId: order.id, value: total });
    if (!session.url) throw new Error("Stripe session without URL");
    return { ok: true, url: session.url };
  } catch (e) {
    log.error("PAYMENT", "stripe session failed", { orderId: order.id, msg: e instanceof Error ? e.message : String(e) });
    await sb.from("orders").update({ status: "CANCELLED", payment_status: "FAILED" }).eq("id", order.id);
    return { ok: false, error: "FAILED" };
  }
}

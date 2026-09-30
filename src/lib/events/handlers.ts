import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getBrand } from "@/lib/brand";
import { sendEmail } from "@/lib/email/send";
import type { EmailTemplate } from "@/lib/email/templates";
import { track } from "@/lib/analytics/track";
import { log } from "@/lib/logger";
import { formatMoney } from "@/lib/format";
import type { AutomationEventType, EventPayload } from "./bus";

type Handler = (p: EventPayload) => Promise<void>;

async function orderEmail(orderId: string, template: EmailTemplate) {
  const sb = db();
  const { data: o } = await sb
    .from("orders")
    .select("id, order_number, customer_email, customer_name, customer_id, total, currency, tracking_number, tracking_url, carrier, order_items(product_name, variant_name, quantity, total)")
    .eq("id", orderId)
    .single();
  if (!o) return;
  const brand = await getBrand();
  await sendEmail({
    template,
    to: o.customer_email,
    customerId: o.customer_id,
    orderId: o.id,
    dedupeKey: `${template}:${o.id}`,
    context: {
      brandName: brand.name,
      customerName: o.customer_name,
      orderNumber: o.order_number,
      orderUrl: `${env.siteUrl()}/account/orders/${o.id}`,
      total: formatMoney(Number(o.total), o.currency),
      items: (o.order_items ?? []).map((i: { product_name: string; variant_name: string | null; quantity: number; total: number }) => ({
        name: i.product_name,
        variant: i.variant_name,
        quantity: i.quantity,
        total: formatMoney(Number(i.total), o.currency),
      })),
      trackingNumber: o.tracking_number,
      trackingUrl: o.tracking_url,
      carrier: o.carrier,
    },
  });
}

const onPaymentConfirmed: Handler = async (p) => {
  const orderId = String(p.orderId);
  // 1) fulfillment (dynamic import avoids a module cycle with the engine)
  const { processPaidOrder } = await import("@/lib/orders/fulfillment-engine");
  await processPaidOrder(orderId);
};
const emailConfirmation: Handler = async (p) => orderEmail(String(p.orderId), "ORDER_CONFIRMATION");
const trackPurchase: Handler = async (p) => {
  const { data: o } = await db().from("orders").select("id, total, customer_id, creator_id, campaign_id").eq("id", String(p.orderId)).single();
  if (o) await track({ event: "purchase", orderId: o.id, value: Number(o.total), creatorId: o.creator_id, campaignId: o.campaign_id });
};

const HANDLERS_MAP: Partial<Record<AutomationEventType, Handler[]>> = {
  PAYMENT_CONFIRMED: [emailConfirmation, trackPurchase, onPaymentConfirmed],
  ORDER_ACCEPTED: [async (p) => orderEmail(String(p.orderId), "ORDER_PROCESSING")],
  ORDER_SHIPPED: [async (p) => orderEmail(String(p.orderId), "ORDER_SHIPPED")],
  ORDER_DELIVERED: [async (p) => orderEmail(String(p.orderId), "ORDER_DELIVERED")],
  ORDER_FAILED: [async (p) => orderEmail(String(p.orderId), "ORDER_FAILED")],
  ORDER_REFUNDED: [
    async (p) => orderEmail(String(p.orderId), "ORDER_REFUNDED"),
    async (p) => track({ event: "refund", orderId: String(p.orderId), value: Number(p.amount ?? 0) }),
  ],
  PRODUCT_OUT_OF_STOCK: [
    async (p) => {
      // disable purchasing: recompute eligibility (auto-pauses published products)
      for (const id of (p.productIds as string[]) ?? []) await db().rpc("refresh_product_eligibility", { p_product_id: id });
      log.warn("CATALOG", "ADMIN ALERT: product out of stock", p);
    },
  ],
  PRODUCT_DISCONTINUED: [
    async (p) => {
      for (const id of (p.productIds as string[]) ?? []) await db().rpc("refresh_product_eligibility", { p_product_id: id });
      log.warn("CATALOG", "ADMIN ALERT: product variants discontinued", p);
    },
  ],
  PROVIDER_OFFLINE: [async (p) => log.error("PROVIDER", "ADMIN ALERT: provider offline — routing to this provider pauses automatically", p)],
  CART_ABANDONED: [
    async (p) => {
      if (!p.email) return;
      const brand = await getBrand();
      await sendEmail({
        template: "ABANDONED_CART",
        to: String(p.email),
        customerId: (p.customerId as string) ?? null,
        marketingConsent: Boolean(p.marketingConsent),
        dedupeKey: `ABANDONED_CART:${p.cartId}`,
        context: { brandName: brand.name, cartUrl: `${env.siteUrl()}/cart`, unsubscribeUrl: p.unsubscribeUrl as string | undefined },
      });
    },
  ],
  DROP_STARTED: [
    async (p) => {
      const sb = db();
      const { data: drop } = await sb.from("drops").select("id, name, slug, limited").eq("id", String(p.dropId)).single();
      if (!drop) return;
      await sb.from("drops").update({ status: "LIVE" }).eq("id", drop.id);
      const brand = await getBrand();
      const { data: subs } = await sb.from("newsletter_subscribers").select("email, unsubscribe_token").eq("brand_id", env.brandId()).is("unsubscribed_at", null).limit(2000);
      for (const s of subs ?? []) {
        await sendEmail({
          template: drop.limited ? "LIMITED_COLLECTION" : "NEW_DROP",
          to: s.email,
          marketingConsent: true, // newsletter subscribers opted in explicitly
          dedupeKey: `DROP:${drop.id}:${s.email}`,
          context: { brandName: brand.name, dropName: drop.name, dropUrl: `${env.siteUrl()}/drops#${drop.slug}`, unsubscribeUrl: `${env.siteUrl()}/api/unsubscribe?t=${s.unsubscribe_token}` },
        });
      }
    },
  ],
  DROP_ENDED: [async (p) => void (await db().from("drops").update({ status: "ENDED" }).eq("id", String(p.dropId)))],
};

export const HANDLERS = HANDLERS_MAP as Record<AutomationEventType, Handler[]>;

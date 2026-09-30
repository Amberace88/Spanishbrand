import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env, isConfigured } from "@/lib/env";
import { stripe } from "@/lib/payments/stripe";
import { recordWebhook, markWebhook } from "@/lib/webhooks/idempotency";
import { handleChargeRefunded, handleCheckoutExpired, handleCheckoutPaid, handlePaymentFailed } from "@/lib/payments/stripe-webhook";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stripe webhook: signature-verified, idempotent (unique provider+event_id), logged, retry-safe. */
export async function POST(req: Request) {
  if (!isConfigured.stripe() || !env.stripeWebhookSecret() || !isConfigured.db()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    // constructEvent also enforces the timestamp tolerance (replay protection).
    event = stripe().webhooks.constructEvent(raw, sig ?? "", env.stripeWebhookSecret()!);
  } catch (e) {
    log.warn("SECURITY", "stripe signature invalid", { msg: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const rec = await recordWebhook({ provider: "stripe", eventId: event.id, eventType: event.type, payload: event, signatureValid: true });
  if (rec.duplicate) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutPaid(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Checkout.Session);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }
    await markWebhook(rec.id, {});
    log.info("PAYMENT", "stripe event processed", { type: event.type, id: event.id });
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markWebhook(rec.id, { error: msg });
    log.error("WEBHOOK", "stripe processing failed", { type: event.type, id: event.id, msg });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}

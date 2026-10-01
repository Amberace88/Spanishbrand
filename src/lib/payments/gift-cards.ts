import "server-only";
import { randomInt } from "node:crypto";
import type Stripe from "stripe";
import { db } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import { stripe, toCents } from "./stripe";
import { sendEmail } from "@/lib/email/send";
import { formatMoney } from "@/lib/format";
import { log } from "@/lib/logger";

export const GIFT_AMOUNTS = [25, 50, 75, 100, 150] as const;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function giftCode() {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `RYG-${part()}-${part()}`;
}

export async function createGiftCardCheckout(input: { amount: number; purchaserEmail: string; recipientEmail: string; recipientName?: string | null; senderName?: string | null; message?: string | null }) {
  if (!isConfigured.db() || !isConfigured.stripe()) return { ok: false as const, error: "NOT_CONFIGURED" };
  if (!(GIFT_AMOUNTS as readonly number[]).includes(input.amount)) return { ok: false as const, error: "INVALID_AMOUNT" };
  const sb = db();
  const { data: card, error } = await sb
    .from("gift_cards")
    .insert({
      brand_id: env.brandId(),
      amount: input.amount,
      purchaser_email: input.purchaserEmail,
      recipient_email: input.recipientEmail,
      recipient_name: input.recipientName || null,
      sender_name: input.senderName || null,
      message: input.message || null,
    })
    .select("id")
    .single();
  if (error || !card) return { ok: false as const, error: "FAILED" };
  const site = env.siteUrl();
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.purchaserEmail,
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: toCents(input.amount), product_data: { name: `Tarjeta regalo ${input.amount} € · ROJO Y GUALDA`, description: "Código de un solo uso enviado por email" } } }],
      metadata: { type: "gift_card", gift_card_id: card.id },
      payment_intent_data: { metadata: { type: "gift_card", gift_card_id: card.id } },
      success_url: `${site}/regalos?gift=ok`,
      cancel_url: `${site}/regalos?gift=cancelled`,
    },
    { idempotencyKey: `giftcard-${card.id}` },
  );
  await sb.from("gift_cards").update({ stripe_checkout_session_id: session.id }).eq("id", card.id);
  return session.url ? { ok: true as const, url: session.url } : { ok: false as const, error: "FAILED" };
}

/** Webhook: paid gift card → single-use fixed discount code → emails. Idempotent. */
export async function activateGiftCard(session: Stripe.Checkout.Session) {
  const id = session.metadata?.gift_card_id;
  if (!id || session.payment_status !== "paid") return;
  const sb = db();
  const { data: claimed } = await sb.from("gift_cards").update({ status: "ACTIVE" }).eq("id", id).eq("status", "PENDING").select("*");
  const card = claimed?.[0];
  if (!card) return; // already activated
  let code = giftCode();
  let discountId: string | null = null;
  for (let i = 0; i < 5 && !discountId; i++) {
    const { data, error } = await sb.from("discounts").insert({ brand_id: env.brandId(), code, type: "FIXED", value: card.amount, max_uses: 1, active: true }).select("id").single();
    if (data) discountId = data.id;
    else if (error) code = giftCode();
  }
  if (!discountId) {
    await sb.from("gift_cards").update({ status: "PENDING" }).eq("id", id);
    throw new Error("GIFT_CARD_CODE_FAILED");
  }
  await sb.from("gift_cards").update({ code, discount_id: discountId, delivered_at: new Date().toISOString() }).eq("id", id);
  const amount = formatMoney(Number(card.amount), card.currency ?? "EUR");
  await sendEmail({ template: "GIFT_CARD", to: card.recipient_email, context: { customerName: card.recipient_name, giftCode: code, giftAmount: amount, giftMessage: card.message, senderName: card.sender_name }, dedupeKey: `gift-${id}` });
  await sendEmail({ template: "GIFT_CARD_RECEIPT", to: card.purchaser_email, context: { giftCode: code, giftAmount: amount }, dedupeKey: `gift-receipt-${id}` });
  log.info("PAYMENT", "gift card activated", { giftCardId: id });
}

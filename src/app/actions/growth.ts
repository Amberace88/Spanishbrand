"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { db } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import { getCurrentCustomer } from "@/lib/account";
import { getBrand } from "@/lib/brand";
import { sendEmail } from "@/lib/email/send";
import { createGiftCardCheckout, giftCode } from "@/lib/payments/gift-cards";
import { slugify } from "@/lib/format";
import { log } from "@/lib/logger";
import { REDEEM_POINTS, REDEEM_VALUE } from "@/lib/club";

export type FormState = { ok?: boolean; error?: string } | null;

async function staffRecipients() {
  const brand = await getBrand();
  return [...new Set([brand.supportEmail, ...env.adminEmails()].filter(Boolean) as string[])];
}

/* ---------------- Club ---------------- */

export async function joinClubAction() {
  if (!isConfigured.db()) redirect("/club?error=NOT_CONFIGURED");
  const { user, customer } = await getCurrentCustomer();
  if (!user?.email) redirect("/account?next=/club");
  const sb = db();
  let customerId = customer?.id as string | undefined;
  if (!customerId) {
    const { data } = await sb.from("customers").upsert({ brand_id: env.brandId(), email: user.email.toLowerCase(), user_id: user.id }, { onConflict: "brand_id,email" }).select("id").single();
    customerId = data?.id;
  }
  if (!customerId) redirect("/club?error=FAILED");
  const { data: n } = await sb.rpc("join_club", { p_customer_id: customerId });
  if (n && !customer?.member_number) {
    await sendEmail({ template: "CLUB_WELCOME", to: user.email, context: { memberNumber: String(n).padStart(6, "0") }, customerId, dedupeKey: `club-${customerId}` });
  }
  revalidatePath("/account");
  redirect("/account?club=1");
}


export async function redeemPointsAction() {
  const { customer } = await getCurrentCustomer();
  if (!customer?.member_number) redirect("/club");
  const sb = db();
  const { data: ok } = await sb.rpc("redeem_points", { p_customer_id: customer.id, p_points: REDEEM_POINTS });
  if (!ok) redirect("/account?redeem=insufficient");
  const code = giftCode().replace("RYG-", "SOCIO-");
  await sb.from("discounts").insert({ brand_id: env.brandId(), code, type: "FIXED", value: REDEEM_VALUE, max_uses: 1, active: true });
  revalidatePath("/account");
  redirect(`/account?redeem=${encodeURIComponent(code)}`);
}

/* ---------------- Gift cards ---------------- */

const giftSchema = z.object({
  amount: z.coerce.number().int(),
  purchaserEmail: z.string().email().max(200),
  recipientEmail: z.string().email().max(200),
  recipientName: z.string().max(80).optional(),
  senderName: z.string().max(80).optional(),
  message: z.string().max(400).optional(),
});

export async function giftCardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = giftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "INVALID" };
  const res = await createGiftCardCheckout(parsed.data).catch((e) => {
    log.error("PAYMENT", "gift card checkout failed", { msg: e instanceof Error ? e.message : String(e) });
    return { ok: false as const, error: "FAILED" };
  });
  if (!res.ok) return { error: res.error };
  redirect(res.url);
}

/* ---------------- B2B / events ---------------- */

const b2bSchema = z.object({
  company: z.string().min(2).max(120),
  contactName: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  type: z.enum(["BAR_RESTAURANT", "FIESTA_PENA", "SPORTS_CLUB", "COMPANY", "EVENT", "SCHOOL", "OTHER"]),
  quantity: z.coerce.number().int().positive().max(100000).optional().or(z.literal("").transform(() => undefined)),
  products: z.string().max(400).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().max(2000).optional(),
  privacy: z.literal("on"),
});

export async function b2bRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isConfigured.db()) return { error: "NOT_CONFIGURED" };
  if (formData.get("website")) return { ok: true }; // honeypot
  const parsed = b2bSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "INVALID" };
  const d = parsed.data;
  const { error } = await db().from("b2b_requests").insert({ brand_id: env.brandId(), company: d.company, contact_name: d.contactName, email: d.email, phone: d.phone || null, type: d.type, quantity: d.quantity ?? null, products: d.products || null, deadline: d.deadline ?? null, message: d.message || null });
  if (error) return { error: "FAILED" };
  for (const to of await staffRecipients()) {
    await sendEmail({ template: "B2B_REQUEST", to, context: { lines: [["Empresa", d.company], ["Contacto", d.contactName], ["Email", d.email], ["Teléfono", d.phone ?? "—"], ["Tipo", d.type], ["Cantidad", String(d.quantity ?? "—")], ["Productos", d.products ?? "—"], ["Fecha límite", d.deadline ?? "—"], ["Mensaje", d.message ?? "—"]] } });
  }
  return { ok: true };
}

/* ---------------- Creators / designers ---------------- */

const creatorSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  kind: z.enum(["DESIGNER", "INFLUENCER", "AFFILIATE"]),
  platform: z.string().max(60).optional(),
  handle: z.string().max(80).optional(),
  audience: z.coerce.number().int().min(0).max(1_000_000_000).optional().or(z.literal("").transform(() => undefined)),
  portfolio: z.string().url().max(300).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().max(2000).optional(),
  privacy: z.literal("on"),
});

export async function creatorApplyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isConfigured.db()) return { error: "NOT_CONFIGURED" };
  if (formData.get("website")) return { ok: true }; // honeypot
  const parsed = creatorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "INVALID" };
  const d = parsed.data;
  const sb = db();
  const { data: existing } = await sb.from("creators").select("id").eq("brand_id", env.brandId()).eq("email", d.email).maybeSingle();
  if (existing) return { ok: true };
  const code = `${slugify(d.handle || d.name).slice(0, 16) || "creador"}-${randomInt(100, 999)}`;
  const { error } = await sb.from("creators").insert({ brand_id: env.brandId(), name: d.name, email: d.email, code, status: "PENDING", kind: d.kind, platform: d.platform || null, handle: d.handle || null, audience_size: d.audience ?? null, portfolio_url: d.portfolio ?? null, application_message: d.message || null });
  if (error) return { error: "FAILED" };
  for (const to of await staffRecipients()) {
    await sendEmail({ template: "B2B_REQUEST", to, context: { lines: [["Solicitud de creador", d.kind], ["Nombre", d.name], ["Email", d.email], ["Red", `${d.platform ?? ""} ${d.handle ?? ""}`], ["Audiencia", String(d.audience ?? "—")], ["Portfolio", d.portfolio ?? "—"], ["Mensaje", d.message ?? "—"]] } });
  }
  return { ok: true };
}

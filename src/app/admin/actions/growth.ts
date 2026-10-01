"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

const CAUSE = z.enum(["VETERANOS", "MAYORES", "INFANCIA", "ANIMALES"]);
const optUrl = z.string().url().max(400).optional().or(z.literal("").transform(() => undefined));

export async function setB2BStatusAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const id = String(formData.get("id"));
  const status = z.enum(["NEW", "CONTACTED", "QUOTED", "WON", "LOST"]).parse(formData.get("status"));
  await db().from("b2b_requests").update({ status }).eq("id", id);
  await audit({ action: "b2b.update", actorId: staff.userId, actorEmail: staff.email, entityType: "b2b_request", entityId: id, after: { status } });
  revalidatePath("/admin/b2b");
}

export async function reviewCreatorAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const status = z.enum(["ACTIVE", "REJECTED", "PAUSED"]).parse(formData.get("status"));
  const sb = db();
  await sb.from("creators").update({ status }).eq("id", id);
  if (status === "ACTIVE") {
    const { data: c } = await sb.from("creators").select("code").eq("id", id).single();
    if (c) await sb.from("creator_links").upsert({ creator_id: id, slug: c.code.toLowerCase(), target_path: "/" }, { onConflict: "slug", ignoreDuplicates: true });
  }
  await audit({ action: "creator.review", actorId: staff.userId, actorEmail: staff.email, entityType: "creator", entityId: id, after: { status } });
  revalidatePath("/admin/creators");
}

const partnerSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  cause: CAUSE,
  name: z.string().min(2).max(160),
  legal_form: z.string().max(80).optional(),
  registry_number: z.string().max(80).optional(),
  website: optUrl,
  donate_url: optUrl,
  agreement_signed: z.literal("on").optional(),
  agreement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
});

export async function savePartnerAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const d = partnerSchema.parse(Object.fromEntries(formData));
  const row = { brand_id: env.brandId(), cause: d.cause, name: d.name, legal_form: d.legal_form || null, registry_number: d.registry_number || null, website: d.website ?? null, donate_url: d.donate_url ?? null, agreement_signed: d.agreement_signed === "on", agreement_date: d.agreement_date ?? null };
  const sb = db();
  if (d.id) await sb.from("cause_partners").update(row).eq("id", d.id);
  else await sb.from("cause_partners").insert(row);
  await audit({ action: "cause.update", actorId: staff.userId, actorEmail: staff.email, entityType: "cause_partner", entityId: d.id, after: row });
  revalidatePath("/admin/causas");
  revalidatePath("/causas");
}

const reportSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  cause: CAUSE,
  partner_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  amount: z.coerce.number().min(0).max(1_000_000),
  certificate_url: optUrl,
  published: z.literal("on").optional(),
});

export async function saveReportAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const d = reportSchema.parse(Object.fromEntries(formData));
  const row = { brand_id: env.brandId(), period: `${d.period}-01`, cause: d.cause, partner_id: d.partner_id ?? null, amount: d.amount, certificate_url: d.certificate_url ?? null, published: d.published === "on" };
  await db().from("cause_reports").upsert(row, { onConflict: "brand_id,period,cause" });
  await audit({ action: "cause.update", actorId: staff.userId, actorEmail: staff.email, entityType: "cause_report", after: row });
  revalidatePath("/admin/causas");
  revalidatePath("/causas");
}

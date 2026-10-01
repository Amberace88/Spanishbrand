"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { STATUS_LABELS } from "@/lib/returns/rules";
import { formatAddress, returnsSettings } from "@/lib/returns/service";

const s = (v: FormDataEntryValue | null) => (v == null ? "" : String(v).trim());
const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() === "" || !Number.isFinite(n) ? null : Math.round(n * 100) / 100;
};
const STATUSES = Object.keys(STATUS_LABELS);

/** Status change / notes / amounts. A customer message is shown on the status page and emailed. */
export async function updateReturnAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const id = s(formData.get("id"));
  const sb = db();
  const { data: before } = await sb.from("return_requests").select("id, rma, status, type, customer_email, contact, orders(order_number)").eq("id", id).eq("brand_id", env.brandId()).single();
  if (!before) redirect("/admin/devoluciones");
  const status = s(formData.get("status"));
  const message = s(formData.get("customer_message")).slice(0, 2000);
  const patch: Record<string, unknown> = {
    admin_notes: s(formData.get("admin_notes")).slice(0, 4000) || null,
    refund_amount: num(formData.get("refund_amount")),
    deduction_amount: num(formData.get("deduction_amount")),
    return_tracking: s(formData.get("return_tracking")).slice(0, 120) || null,
  };
  if (STATUSES.includes(status) && status !== before.status) {
    patch.status = status;
    if (["RESOLVED", "REJECTED", "CANCELLED"].includes(status)) patch.resolved_at = new Date().toISOString();
  }
  if (message) patch.customer_message = message;
  await sb.from("return_requests").update(patch).eq("id", id);

  const changed = patch.status as string | undefined;
  if (changed || message) {
    const label = changed ? STATUS_LABELS[changed].es : null;
    await sb.from("return_events").insert({ return_id: id, type: changed ? `STATUS_${changed}` : "MESSAGE", message: [label, message].filter(Boolean).join(" — "), visible_to_customer: true, actor_email: staff.email });
    const addr = changed === "AWAITING_RETURN" || changed === "APPROVED" ? (before.type === "WITHDRAWAL" ? formatAddress((await returnsSettings()).address) : null) : null;
    await sendEmail({
      template: "RETURN_UPDATED",
      to: before.customer_email,
      dedupeKey: `return-upd-${id}-${changed ?? "msg"}-${Date.now()}`,
      context: {
        customerName: (before.contact as { name?: string })?.name ?? null,
        orderNumber: (before.orders as unknown as { order_number: number })?.order_number,
        rma: before.rma,
        returnStatus: label ?? "Mensaje sobre tu solicitud",
        message: message || null,
        returnAddress: addr,
        returnUrl: `${env.siteUrl()}/returns/status?rma=${encodeURIComponent(before.rma)}&email=${encodeURIComponent(before.customer_email)}`,
      },
    }).catch(() => null);
  }
  const note = s(formData.get("internal_event"));
  if (note) await sb.from("return_events").insert({ return_id: id, type: "NOTE", message: note.slice(0, 2000), visible_to_customer: false, actor_email: staff.email });
  await audit({ action: "return.update", actorId: staff.userId, actorEmail: staff.email, entityType: "return", entityId: id, before: { status: before.status }, after: patch });
  revalidatePath(`/admin/devoluciones/${id}`);
  redirect(`/admin/devoluciones/${id}?msg=${encodeURIComponent("Guardado")}`);
}

/** Track the claim with the print provider (no provider exposes a claims API — the pack is submitted in their dashboard). */
export async function providerClaimAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const id = s(formData.get("id"));
  const sb = db();
  const { data: before } = await sb.from("return_requests").select("provider_claim").eq("id", id).eq("brand_id", env.brandId()).single();
  if (!before) redirect("/admin/devoluciones");
  const prev = (before.provider_claim ?? {}) as Record<string, unknown>;
  const status = ["NOT_SUBMITTED", "SUBMITTED", "APPROVED", "REJECTED"].includes(s(formData.get("claim_status"))) ? s(formData.get("claim_status")) : "NOT_SUBMITTED";
  const claim = {
    ...prev,
    status,
    ref: s(formData.get("claim_ref")).slice(0, 120) || null,
    recovered_amount: num(formData.get("recovered_amount")),
    resolution: s(formData.get("claim_resolution")).slice(0, 40) || null,
    submitted_at: status !== "NOT_SUBMITTED" ? (prev.submitted_at ?? new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  };
  await sb.from("return_requests").update({ provider_claim: claim }).eq("id", id);
  await sb.from("return_events").insert({ return_id: id, type: "PROVIDER_CLAIM", message: `Reclamación al proveedor: ${status}${claim.ref ? ` (${claim.ref})` : ""}${claim.recovered_amount != null ? ` · recuperado ${claim.recovered_amount} €` : ""}`, visible_to_customer: false, actor_email: staff.email });
  await audit({ action: "return.claim", actorId: staff.userId, actorEmail: staff.email, entityType: "return", entityId: id, before: prev, after: claim });
  revalidatePath(`/admin/devoluciones/${id}`);
  redirect(`/admin/devoluciones/${id}?msg=${encodeURIComponent("Reclamación actualizada")}`);
}

/** Return address + team notification email, stored in brand_settings.settings.returns. */
export async function saveReturnsSettingsAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const sb = db();
  const { data: before } = await sb.from("brand_settings").select("settings, legal_entity").eq("brand_id", env.brandId()).single();
  const returns = {
    address: {
      name: s(formData.get("r_name")),
      line1: s(formData.get("r_line1")),
      line2: s(formData.get("r_line2")),
      postalCode: s(formData.get("r_postal")),
      city: s(formData.get("r_city")),
      province: s(formData.get("r_province")),
      country: s(formData.get("r_country")) || "España",
      phone: s(formData.get("r_phone")),
    },
    instructions: s(formData.get("r_instructions")).slice(0, 1000),
    notifyEmail: s(formData.get("r_notify")),
  };
  const legal = {
    ...((before?.legal_entity ?? {}) as Record<string, unknown>),
    name: s(formData.get("le_name")) || undefined,
    taxId: s(formData.get("le_tax")) || undefined,
    address: s(formData.get("le_address")) || undefined,
    email: s(formData.get("le_email")) || undefined,
  };
  await sb.from("brand_settings").update({ settings: { ...((before?.settings ?? {}) as object), returns }, legal_entity: legal }).eq("brand_id", env.brandId());
  await audit({ action: "settings.update", actorId: staff.userId, actorEmail: staff.email, entityType: "brand_settings", entityId: env.brandId(), after: { returns, legal } });
  revalidatePath("/admin/devoluciones");
  revalidatePath("/returns");
  redirect(`/admin/devoluciones/ajustes?msg=${encodeURIComponent("Guardado")}`);
}

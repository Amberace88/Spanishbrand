"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { processPaidOrder, submitFulfillmentOrder, syncOrderStatus } from "@/lib/orders/fulfillment-engine";
import { addOrderEvent } from "@/lib/orders/events";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import { stripe, toCents } from "@/lib/payments/stripe";
import { isConfigured } from "@/lib/env";

/** Groups whose last create attempt may have reached the provider need explicit human confirmation. */
async function guardAmbiguous(orderId: string, formData: FormData, foId?: string) {
  let q = db().from("fulfillment_orders").select("id, status, last_error").eq("order_id", orderId);
  if (foId) q = q.eq("id", foId);
  const { data } = await q;
  if ((data ?? []).some((g) => g.status === "SUBMITTING")) back(orderId, "Hay un envío en curso al proveedor — espera unos minutos");
  if ((data ?? []).some((g) => g.last_error?.startsWith("AMBIGUOUS")) && formData.get("confirmNotExists") !== "on") {
    back(orderId, "Confirma que has verificado en el panel del proveedor que el pedido NO existe (evita duplicados)");
  }
}

function back(orderId: string, msg?: string): never {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/fulfillment");
  redirect(`/admin/orders/${orderId}${msg ? `?msg=${encodeURIComponent(msg)}` : ""}`);
}

/** RETRY: re-submit a failed / review fulfillment group that never reached the provider. */
export async function retryFulfillmentAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const orderId = String(formData.get("orderId"));
  const foId = String(formData.get("foId"));
  const sb = db();
  const { data: fo } = await sb.from("fulfillment_orders").select("status, provider_order_id").eq("id", foId).single();
  if (!fo || fo.provider_order_id) back(orderId, "El grupo ya existe en el proveedor — no se puede reenviar");
  await guardAmbiguous(orderId, formData, foId);
  // attempts are NOT reset: the external-id lookup always runs before a new create.
  await sb.from("fulfillment_orders").update({ status: "PENDING", next_retry_at: null, last_error: null }).eq("id", foId).neq("status", "SUBMITTING");
  await sb.from("orders").update({ status: "PROCESSING", review_reason: null }).eq("id", orderId);
  await addOrderEvent(orderId, "MANUAL_RETRY", { actor: staff.email });
  await audit({ action: "order.retry", actorId: staff.userId, actorEmail: staff.email, entityType: "order", entityId: orderId, after: { foId } });
  await submitFulfillmentOrder(foId);
  back(orderId, "Reintento ejecutado");
}

/** Re-run routing after fixing mappings (clears groups that never reached a provider). */
export async function reprocessOrderAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const orderId = String(formData.get("orderId"));
  const sb = db();
  const { data: order } = await sb.from("orders").select("payment_status").eq("id", orderId).single();
  if (order?.payment_status !== "PAID") back(orderId, "Solo pedidos pagados");
  await guardAmbiguous(orderId, formData);
  const { data: unsent } = await sb.from("fulfillment_orders").select("id, provider_id").eq("order_id", orderId).is("provider_order_id", null);
  const { data: num } = await sb.from("orders").select("order_number").eq("id", orderId).single();
  for (const g of unsent ?? []) {
    const provider = fulfillmentProviderFactory.getProvider(g.provider_id);
    const found = provider.externalIdLookup && provider.isConfigured() ? await provider.getOrderByExternalId(`${num?.order_number}-${g.provider_id}`).catch(() => null) : null;
    if (found) {
      // The provider already has it → attach instead of creating a duplicate.
      await sb.from("fulfillment_orders").update({ provider_order_id: found.providerOrderId, status: "SENT_TO_PROVIDER" }).eq("id", g.id);
      const { applyProviderSnapshot } = await import("@/lib/orders/fulfillment-engine");
      await applyProviderSnapshot(g.id, found);
    } else {
      await sb.from("fulfillment_orders").delete().eq("id", g.id);
    }
  }
  await sb.from("fulfillment_errors").update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: staff.userId }).eq("order_id", orderId).eq("resolved", false);
  await sb.from("orders").update({ status: "PAID", fulfillment_status: "UNFULFILLED", review_reason: null }).eq("id", orderId);
  await addOrderEvent(orderId, "MANUAL_REPROCESS", { actor: staff.email, to: "PAID" });
  await audit({ action: "manual.override", actorId: staff.userId, actorEmail: staff.email, entityType: "order", entityId: orderId, after: { reprocess: true } });
  await processPaidOrder(orderId);
  back(orderId, "Pedido reprocesado");
}

/** CHANGE PROVIDER: move a not-yet-submitted group to the product's other mapped provider. */
export async function changeProviderAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const orderId = String(formData.get("orderId"));
  const foId = String(formData.get("foId"));
  const target = String(formData.get("targetProvider"));
  const sb = db();
  const { data: fo } = await sb.from("fulfillment_orders").select("id, provider_id, provider_order_id, fulfillment_items(order_item_id, quantity, order_items(product_id, variant_id))").eq("id", foId).single();
  if (!fo || fo.provider_order_id) back(orderId, "No se puede cambiar: el pedido ya está en el proveedor");
  if (fo!.provider_id === target) back(orderId, "Mismo proveedor");
  await guardAmbiguous(orderId, formData, foId);
  {
    const from = fulfillmentProviderFactory.getProvider(fo!.provider_id);
    const { data: num } = await sb.from("orders").select("order_number").eq("id", orderId).single();
    if (from.externalIdLookup && from.isConfigured() && (await from.getOrderByExternalId(`${num?.order_number}-${fo!.provider_id}`).catch(() => null))) {
      back(orderId, `El pedido ya existe en ${fo!.provider_id} — usa "Actualizar desde proveedor"`);
    }
  }
  const items = (fo!.fulfillment_items ?? []) as unknown as { order_item_id: string; quantity: number; order_items: { product_id: string; variant_id: string } }[];
  const newItems = [];
  for (const it of items) {
    const { data: m } = await sb
      .from("product_provider_mappings")
      .select("provider_product_id, print_config, approved, variant_provider_mappings(variant_id, provider_variant_id, files, status)")
      .eq("product_id", it.order_items.product_id)
      .eq("provider_id", target)
      .eq("active", true)
      .maybeSingle();
    const vm = (m?.variant_provider_mappings as { variant_id: string; provider_variant_id: string; files: unknown; status: string }[] | undefined)?.find((v) => v.variant_id === it.order_items.variant_id && v.status === "ACTIVE");
    if (!m || !vm) back(orderId, `Sin mapeo activo en ${target} para un artículo`);
    if (!m!.approved) back(orderId, `El mapeo de ${target} no está aprobado`);
    const files = (Array.isArray(vm!.files) && (vm!.files as unknown[]).length ? vm!.files : (m!.print_config as { files?: unknown } | null)?.files) ?? [];
    newItems.push({ order_item_id: it.order_item_id, provider_product_id: m!.provider_product_id, provider_variant_id: vm!.provider_variant_id, quantity: it.quantity, files });
  }
  await sb.from("fulfillment_orders").delete().eq("id", foId);
  const { data: nfo } = await sb.from("fulfillment_orders").insert({ order_id: orderId, provider_id: target, mapping_role: "MANUAL", status: "PENDING" }).select("id").single();
  await sb.from("fulfillment_items").insert(newItems.map((i) => ({ ...i, fulfillment_order_id: nfo!.id })));
  await addOrderEvent(orderId, "PROVIDER_CHANGED", { actor: staff.email, data: { from: fo!.provider_id, to: target } });
  await audit({ action: "order.change_provider", actorId: staff.userId, actorEmail: staff.email, entityType: "order", entityId: orderId, before: { provider: fo!.provider_id }, after: { provider: target } });
  await sb.from("orders").update({ status: "PROCESSING", review_reason: null }).eq("id", orderId);
  await submitFulfillmentOrder(nfo!.id);
  back(orderId, `Enviado a ${target}`);
}

export async function cancelOrderAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const orderId = String(formData.get("orderId"));
  const sb = db();
  const { data: groups } = await sb.from("fulfillment_orders").select("id, provider_id, provider_order_id, status").eq("order_id", orderId);
  const problems: string[] = [];
  for (const g of groups ?? []) {
    if (g.provider_order_id && !["CANCELLED", "SHIPPED", "DELIVERED"].includes(g.status)) {
      try {
        await fulfillmentProviderFactory.getProvider(g.provider_id).cancelOrder(g.provider_order_id);
        await sb.from("fulfillment_orders").update({ status: "CANCELLED" }).eq("id", g.id);
      } catch (e) {
        problems.push(`${g.provider_id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else if (!g.provider_order_id) {
      await sb.from("fulfillment_orders").update({ status: "CANCELLED" }).eq("id", g.id);
    }
  }
  if (problems.length) back(orderId, `No se pudo cancelar en proveedor: ${problems.join("; ")}`);
  const { data: o } = await sb.from("orders").select("status").eq("id", orderId).single();
  await sb.from("orders").update({ status: "CANCELLED", fulfillment_status: "CANCELLED" }).eq("id", orderId);
  await addOrderEvent(orderId, "CANCELLED", { from: o?.status, to: "CANCELLED", actor: staff.email });
  await audit({ action: "order.cancel", actorId: staff.userId, actorEmail: staff.email, entityType: "order", entityId: orderId });
  back(orderId, "Pedido cancelado (reembolsa por separado si procede)");
}

export async function refundOrderAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const orderId = String(formData.get("orderId"));
  if (!isConfigured.stripe()) back(orderId, "Stripe no configurado");
  const sb = db();
  const { data: o } = await sb.from("orders").select("stripe_payment_intent_id, total").eq("id", orderId).single();
  if (!o?.stripe_payment_intent_id) back(orderId, "Sin pago asociado");
  const { data: prev } = await sb.from("refunds").select("amount, status").eq("order_id", orderId).neq("status", "FAILED");
  const already = (prev ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const remaining = Math.round((Number(o!.total) - already) * 100) / 100;
  const amount = Number(formData.get("amount") || remaining);
  if (!(amount > 0) || amount > remaining + 0.001) back(orderId, `Importe no válido (máximo reembolsable ${remaining.toFixed(2)} €)`);
  const nonce = String(formData.get("nonce") ?? "").slice(0, 64) || crypto.randomUUID();
  let msg: string;
  try {
    const r = await stripe().refunds.create({ payment_intent: o!.stripe_payment_intent_id!, amount: toCents(amount), reason: "requested_by_customer" }, { idempotencyKey: `refund-${orderId}-${nonce}` });
    await sb.from("refunds").upsert({ order_id: orderId, amount, currency: r.currency.toUpperCase(), provider_refund_id: r.id, status: r.status === "succeeded" ? "SUCCEEDED" : "PENDING", created_by: staff.userId, reason: String(formData.get("reason") ?? "") || null }, { onConflict: "provider_refund_id" });
    await audit({ action: "order.refund", actorId: staff.userId, actorEmail: staff.email, entityType: "order", entityId: orderId, after: { amount, refund: r.id } });
    msg = "Reembolso solicitado — Stripe confirmará vía webhook";
  } catch (e) {
    msg = `Error Stripe: ${e instanceof Error ? e.message : String(e)}`;
  }
  back(orderId, msg);
}

export async function resolveErrorAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const id = String(formData.get("errorId"));
  const orderId = String(formData.get("orderId"));
  await db().from("fulfillment_errors").update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: staff.userId }).eq("id", id);
  await syncOrderStatus(orderId);
  back(orderId);
}

export async function refreshFromProviderAction(formData: FormData) {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const orderId = String(formData.get("orderId"));
  const foId = String(formData.get("foId"));
  const { data: fo } = await db().from("fulfillment_orders").select("provider_id, provider_order_id").eq("id", foId).single();
  if (fo?.provider_order_id) {
    const { applyProviderSnapshot } = await import("@/lib/orders/fulfillment-engine");
    let err: string | null = null;
    try {
      await applyProviderSnapshot(foId, await fulfillmentProviderFactory.getProvider(fo.provider_id).getOrder(fo.provider_order_id));
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    if (err) back(orderId, err);
  }
  back(orderId, "Estado actualizado desde el proveedor");
}

/** Staff approve (or reject) customer personalization / uploaded artwork held for review. */
export async function approvePersonalizationAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const orderId = String(formData.get("orderId"));
  const decision = String(formData.get("decision"));
  const sb = db();
  const { data: order } = await sb.from("orders").select("payment_status, status, review_reason, metadata").eq("id", orderId).single();
  if (order?.payment_status !== "PAID" || !order.review_reason?.startsWith("PERSONALIZATION_")) back(orderId, "No hay diseños pendientes de revisión");
  if (decision === "reject") {
    await addOrderEvent(orderId, "PERSONALIZATION_REJECTED", { actor: staff.email, message: String(formData.get("note") ?? "") || "Diseño rechazado — contactar al cliente / reembolsar" });
    await audit({ action: "personalization.reject", actorId: staff.userId, actorEmail: staff.email, entityType: "order", entityId: orderId });
    back(orderId, "Diseño rechazado. Contacta con el cliente y reembolsa o pide un nuevo diseño.");
  }
  await sb
    .from("orders")
    .update({ status: "PAID", fulfillment_status: "UNFULFILLED", review_reason: null, metadata: { ...((order!.metadata as object) ?? {}), personalization_approved: true, personalization_approved_by: staff.email } })
    .eq("id", orderId);
  await addOrderEvent(orderId, "PERSONALIZATION_APPROVED", { actor: staff.email, to: "PAID" });
  await audit({ action: "personalization.approve", actorId: staff.userId, actorEmail: staff.email, entityType: "order", entityId: orderId });
  await processPaidOrder(orderId);
  back(orderId, "Diseño aprobado y enviado a producción.");
}

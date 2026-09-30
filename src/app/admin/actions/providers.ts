"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { runHealthChecks, syncProviderCatalog, syncProviderProductVariants } from "@/lib/providers/service";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import { createProductFromProvider } from "@/lib/products/admin-service";

export async function syncCatalogAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const providerId = String(formData.get("providerId"));
  const withVariants = formData.get("withVariants") === "on";
  const max = Number(formData.get("max") || 0) || undefined;
  let msg = "ok";
  try {
    const stats = await syncProviderCatalog(providerId, { withVariants, maxProducts: max });
    msg = `fetched ${stats.fetched}, upserted ${stats.upserted}, eligible ${stats.eligible}`;
  } catch (e) {
    msg = e instanceof Error ? e.message : String(e);
  }
  await audit({ action: "provider.sync", actorId: staff.userId, actorEmail: staff.email, entityType: "provider", entityId: providerId, after: { msg } });
  revalidatePath("/admin/providers");
  redirect(`/admin/providers?msg=${encodeURIComponent(`${providerId}: ${msg}`)}`);
}

export async function healthCheckAction() {
  await requireStaff(["ADMIN"]);
  const r = await runHealthChecks();
  revalidatePath("/admin/providers");
  redirect(`/admin/providers?msg=${encodeURIComponent(Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(" · "))}`);
}

export async function registerWebhookAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const providerId = String(formData.get("providerId"));
  const provider = fulfillmentProviderFactory.getProvider(providerId);
  let msg: string;
  try {
    const r = await provider.registerWebhook(`${env.siteUrl()}/api/webhooks/${providerId}`);
    msg = r.registered ? "Webhook registrado" : r.note ?? "Registro manual necesario";
  } catch (e) {
    msg = e instanceof Error ? e.message : String(e);
  }
  await audit({ action: "provider.change", actorId: staff.userId, actorEmail: staff.email, entityType: "provider", entityId: providerId, after: { webhook: msg } });
  redirect(`/admin/providers?msg=${encodeURIComponent(msg)}`);
}

export async function toggleProviderAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const providerId = String(formData.get("providerId"));
  const field = String(formData.get("field")) === "active" ? "active" : "auto_routing_enabled";
  const value = formData.get("value") === "true";
  await db().from("providers").update({ [field]: value }).eq("id", providerId);
  await audit({ action: "provider.change", actorId: staff.userId, actorEmail: staff.email, entityType: "provider", entityId: providerId, after: { [field]: value } });
  revalidatePath("/admin/providers");
}

export async function reviewProviderProductAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) === "APPROVED" ? "APPROVED" : "REJECTED";
  const { data } = await db().from("provider_products").update({ review_status: status }).eq("id", id).select("provider_id").single();
  await audit({ action: "product.approve", actorId: staff.userId, actorEmail: staff.email, entityType: "provider_product", entityId: id, after: { status } });
  if (status === "APPROVED") {
    try {
      await syncProviderProductVariants(id);
    } catch {
      /* variants can be loaded later */
    }
  }
  revalidatePath(`/admin/providers/${data?.provider_id}`);
}

export async function loadVariantsAction(formData: FormData) {
  await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const providerId = String(formData.get("providerId"));
  let msg: string;
  try {
    msg = `${await syncProviderProductVariants(id)} variantes cargadas`;
  } catch (e) {
    msg = e instanceof Error ? e.message : String(e);
  }
  redirect(`/admin/providers/${providerId}?open=${id}&msg=${encodeURIComponent(msg)}`);
}

export async function createProductFromProviderAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const variantIds = formData.getAll("variant").map(String);
  const id = await createProductFromProvider(staff, {
    providerProductRowId: String(formData.get("providerProductRowId")),
    name: String(formData.get("name") || "Nuevo producto"),
    productType: String(formData.get("productType") || "OTHER"),
    collectionId: (formData.get("collectionId") as string) || null,
    variantExternalIds: variantIds,
    retailPrice: Number(formData.get("retailPrice")) || null,
    fulfillmentMethod: (formData.get("fulfillmentMethod") as string) || null,
  });
  redirect(`/admin/products/${id}`);
}

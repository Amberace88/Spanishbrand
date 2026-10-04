"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentCustomer } from "@/lib/account";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { addToCart } from "@/lib/cart/cart";
import { isReorderable, type ProfileState } from "@/lib/account-panel";

export async function signOutAction() {
  const sb = await supabaseServer();
  await sb?.auth.signOut();
  redirect("/");
}

async function saveProfile(formData: FormData): Promise<boolean> {
  const { user, customer } = await getCurrentCustomer();
  if (!user || !customer) return false;
  const name = String(formData.get("name") ?? "").trim().slice(0, 120) || null;
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  const consent = formData.get("marketing") === "on";
  const { error } = await db()
    .from("customers")
    .update({ name, phone, marketing_consent: consent, marketing_consent_at: consent ? customer.marketing_consent_at ?? new Date().toISOString() : null })
    .eq("id", customer.id);
  if (error) return false;
  await db().from("profiles").update({ full_name: name, phone }).eq("id", user.id);
  revalidatePath("/account", "layout");
  return true;
}

export async function updateProfileAction(formData: FormData) {
  await saveProfile(formData);
}

/** Profile form with inline feedback (useActionState). */
export async function saveProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const ok = await saveProfile(formData).catch(() => false);
  return { status: ok ? "ok" : "error", at: Date.now() };
}

/**
 * "Repetir pedido": re-adds the order's non-personalised items through the regular cart path
 * (addToCart re-validates availability and re-prices). Checkout is untouched.
 */
export async function reorderAction(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/account/orders");
  const { customer } = await getCurrentCustomer();
  if (!customer) redirect("/account");
  const { data: o } = await db().from("orders").select("id, order_items(variant_id, quantity, personalization)").eq("id", id).eq("customer_id", customer.id).maybeSingle();
  if (!o) redirect("/account/orders");
  let added = 0;
  for (const it of (o.order_items ?? []) as { variant_id: string; quantity: number; personalization: unknown }[]) {
    if (!isReorderable(it)) continue;
    const res = await addToCart(it.variant_id, it.quantity).catch(() => ({ ok: false as const }));
    if (res.ok) added++;
  }
  if (!added) redirect(`/account/orders/${id}?reorder=none`);
  revalidatePath("/", "layout");
  redirect("/cart");
}

/** GDPR deletion request: recorded for processing (orders are retained as legally required). */
export async function requestDeletionAction() {
  const { user, customer } = await getCurrentCustomer();
  if (!user) return;
  await db().from("gdpr_requests").insert({ brand_id: env.brandId(), customer_id: customer?.id ?? null, user_id: user.id, email: user.email ?? "", type: "DELETE" });
  revalidatePath("/account/profile");
}

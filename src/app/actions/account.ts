"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getCurrentCustomer } from "@/lib/account";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function signOutAction() {
  const sb = await supabaseServer();
  await sb?.auth.signOut();
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const { user, customer } = await getCurrentCustomer();
  if (!user || !customer) return;
  const name = String(formData.get("name") ?? "").slice(0, 120) || null;
  const phone = String(formData.get("phone") ?? "").slice(0, 40) || null;
  const consent = formData.get("marketing") === "on";
  await db()
    .from("customers")
    .update({ name, phone, marketing_consent: consent, marketing_consent_at: consent ? customer.marketing_consent_at ?? new Date().toISOString() : null })
    .eq("id", customer.id);
  await db().from("profiles").update({ full_name: name, phone }).eq("id", user.id);
  revalidatePath("/account/profile");
}

/** GDPR deletion request: recorded for processing (orders are retained as legally required). */
export async function requestDeletionAction() {
  const { user, customer } = await getCurrentCustomer();
  if (!user) return;
  await db().from("gdpr_requests").insert({ brand_id: env.brandId(), customer_id: customer?.id ?? null, user_id: user.id, email: user.email ?? "", type: "DELETE" });
  revalidatePath("/account/profile");
}

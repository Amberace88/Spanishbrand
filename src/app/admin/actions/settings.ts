"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

const s = (v: FormDataEntryValue | null) => (v == null ? "" : String(v).trim());
const HEX = /^#[0-9a-f]{6}$/i;

export async function saveBrandAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const { data: before } = await db().from("brand_settings").select("*").eq("brand_id", env.brandId()).single();
  const socials: Record<string, string> = {};
  for (const k of ["instagram", "tiktok", "youtube", "pinterest", "facebook"]) socials[k] = s(formData.get(`social_${k}`));
  const settings = {
    ...(before?.settings ?? {}),
    payment_fee_percent: Number(formData.get("payment_fee_percent")) || 0,
    payment_fee_fixed: Number(formData.get("payment_fee_fixed")) || 0,
    refund_reserve_percent: Number(formData.get("refund_reserve_percent")) || 0,
    abandoned_cart_hours: Number(formData.get("abandoned_cart_hours")) || 4,
    prices_include_tax: true,
  };
  const row = {
    brand_name: s(formData.get("brand_name")) || before?.brand_name,
    brand_tagline: s(formData.get("brand_tagline")) || null,
    brand_description: s(formData.get("brand_description")) || null,
    brand_logo: s(formData.get("brand_logo")) || null,
    primary_color: HEX.test(s(formData.get("primary_color"))) ? s(formData.get("primary_color")) : before?.primary_color,
    secondary_color: HEX.test(s(formData.get("secondary_color"))) ? s(formData.get("secondary_color")) : before?.secondary_color,
    accent_color: HEX.test(s(formData.get("accent_color"))) ? s(formData.get("accent_color")) : before?.accent_color,
    founded_year: Number(formData.get("founded_year")) || null,
    support_email: s(formData.get("support_email")) || null,
    supported_countries: s(formData.get("supported_countries")).split(",").map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)),
    social_links: socials,
    settings,
  };
  await db().from("brand_settings").update(row).eq("brand_id", env.brandId());
  await db().from("brands").update({ name: row.brand_name }).eq("id", env.brandId());
  await audit({ action: "settings.update", actorId: staff.userId, actorEmail: staff.email, entityType: "brand_settings", entityId: env.brandId(), before, after: row });
  revalidatePath("/", "layout");
  redirect("/admin/settings?msg=Guardado");
}

export async function saveShippingRuleAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = s(formData.get("id"));
  const row = {
    brand_id: env.brandId(),
    name: s(formData.get("name")),
    country_codes: s(formData.get("country_codes")).split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
    base_rate: Number(formData.get("base_rate")) || 0,
    per_additional_item: Number(formData.get("per_additional_item")) || 0,
    free_over: s(formData.get("free_over")) ? Number(formData.get("free_over")) : null,
    min_days: Number(formData.get("min_days")) || null,
    max_days: Number(formData.get("max_days")) || null,
    active: formData.get("active") === "on",
  };
  if (id) await db().from("shipping_rules").update(row).eq("id", id);
  else await db().from("shipping_rules").insert(row);
  await audit({ action: "settings.update", actorId: staff.userId, actorEmail: staff.email, entityType: "shipping_rule", entityId: id || row.name, after: row });
  redirect("/admin/settings?msg=Env%C3%ADo%20guardado");
}

export async function saveTaxRateAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = s(formData.get("id"));
  const rate = Number(formData.get("rate"));
  if (!(rate >= 0 && rate < 1)) redirect("/admin/settings?msg=Tipo%20no%20v%C3%A1lido");
  await db().from("tax_rates").update({ rate, active: formData.get("active") === "on" }).eq("id", id);
  await audit({ action: "settings.update", actorId: staff.userId, actorEmail: staff.email, entityType: "tax_rate", entityId: id, after: { rate } });
  redirect("/admin/settings?msg=IVA%20guardado");
}

export async function assignRoleAction(formData: FormData) {
  const staff = await requireStaff(["SUPER_ADMIN"]);
  const email = s(formData.get("email")).toLowerCase();
  const role = s(formData.get("role"));
  if (!["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "CUSTOMER_SUPPORT", "ANALYST"].includes(role)) redirect("/admin/settings");
  const { data: profile } = await db().from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) redirect(`/admin/settings?msg=${encodeURIComponent("El usuario debe iniciar sesión una vez antes de asignarle un rol")}`);
  await db().from("user_roles").upsert({ user_id: profile!.id, brand_id: env.brandId(), role }, { onConflict: "user_id,brand_id,role" });
  await audit({ action: "role.change", actorId: staff.userId, actorEmail: staff.email, entityType: "user", entityId: profile!.id, after: { role, email } });
  redirect("/admin/settings?msg=Rol%20asignado");
}

export async function removeRoleAction(formData: FormData) {
  const staff = await requireStaff(["SUPER_ADMIN"]);
  const userId = s(formData.get("userId"));
  const role = s(formData.get("role"));
  if (userId === staff.userId && role === "SUPER_ADMIN") redirect("/admin/settings?msg=No%20puedes%20quitarte%20SUPER_ADMIN");
  await db().from("user_roles").delete().eq("user_id", userId).eq("brand_id", env.brandId()).eq("role", role);
  await audit({ action: "role.change", actorId: staff.userId, actorEmail: staff.email, entityType: "user", entityId: userId, after: { removed: role } });
  redirect("/admin/settings?msg=Rol%20eliminado");
}

export async function saveCreatorAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const code = s(formData.get("code")).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const rate = Math.min(1, Math.max(0, Number(formData.get("commission_rate")) / 100 || 0));
  const discountRate = Math.min(0.5, Math.max(0, Number(formData.get("discount_rate")) / 100 || 0));
  if (!code || !s(formData.get("name"))) redirect("/admin/creators?msg=Nombre%20y%20c%C3%B3digo%20obligatorios");
  const { data: c, error } = await db()
    .from("creators")
    .insert({ brand_id: env.brandId(), name: s(formData.get("name")), email: s(formData.get("email")) || null, code, commission_rate: rate, customer_discount_rate: discountRate })
    .select("id")
    .single();
  if (error || !c) redirect(`/admin/creators?msg=${encodeURIComponent(error?.message ?? "error")}`);
  await db().from("creator_links").insert({ creator_id: c!.id, slug: code.toLowerCase(), target_path: s(formData.get("target_path")) || "/" });
  if (discountRate > 0) await db().from("discounts").insert({ brand_id: env.brandId(), code, type: "PERCENT", value: Math.round(discountRate * 100), creator_id: c!.id });
  await audit({ action: "settings.update", actorId: staff.userId, actorEmail: staff.email, entityType: "creator", entityId: c!.id, after: { code, rate } });
  redirect("/admin/creators?msg=Creador%20creado");
}

export async function setCommissionStatusAction(formData: FormData) {
  await requireStaff(["ADMIN"]);
  const status = s(formData.get("status"));
  if (!["APPROVED", "PAID", "VOID"].includes(status)) return;
  await db().from("creator_commissions").update({ status }).eq("id", s(formData.get("id")));
  revalidatePath("/admin/creators");
}

export async function saveDiscountAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const code = s(formData.get("code")).toUpperCase();
  const type = s(formData.get("type")) === "FIXED" ? "FIXED" : "PERCENT";
  const value = Number(formData.get("value"));
  if (!code || !(value > 0)) redirect("/admin/creators?msg=Descuento%20no%20v%C3%A1lido");
  await db().from("discounts").insert({ brand_id: env.brandId(), code, type, value, max_uses: Number(formData.get("max_uses")) || null, ends_at: s(formData.get("ends_at")) ? new Date(s(formData.get("ends_at"))).toISOString() : null });
  await audit({ action: "settings.update", actorId: staff.userId, actorEmail: staff.email, entityType: "discount", entityId: code });
  redirect("/admin/creators?msg=Descuento%20creado");
}

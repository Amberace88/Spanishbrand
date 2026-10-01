"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/format";
import { approveMapping, publishProduct, runFulfillmentTest } from "@/lib/products/admin-service";

const num = (v: FormDataEntryValue | null) => {
  if (v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const str = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : String(v).trim());

function back(id: string, msg?: string): never {
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/", "layout");
  redirect(`/admin/products/${id}${msg ? `?msg=${encodeURIComponent(msg)}` : ""}`);
}

export async function updateProductAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = String(formData.get("id"));
  const sb = db();
  const { data: before } = await sb.from("products").select("*").eq("id", id).single();
  if (!before) return;
  const update = {
    name: String(formData.get("name") ?? before.name),
    slug: slugify(String(formData.get("slug") || formData.get("name") || before.slug)),
    short_description: str(formData.get("short_description")),
    description: str(formData.get("description")),
    story: str(formData.get("story")),
    product_type: String(formData.get("product_type") || before.product_type),
    collection_id: str(formData.get("collection_id")),
    retail_price: num(formData.get("retail_price")),
    compare_at_price: num(formData.get("compare_at_price")),
    margin_target: num(formData.get("margin_target")),
    featured: formData.get("featured") === "on",
    limited: formData.get("limited") === "on",
    limited_type: str(formData.get("limited_type")),
    limited_quantity: num(formData.get("limited_quantity")),
    limited_until: str(formData.get("limited_until")),
    seo_title: str(formData.get("seo_title")),
    seo_description: str(formData.get("seo_description")),
    tags: String(formData.get("tags") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
  if (!update.limited) {
    update.limited_type = null;
    update.limited_quantity = null;
  }
  const { error } = await sb.from("products").update(update).eq("id", id);
  if (error) back(id, `Error: ${error.message}`);
  if (update.collection_id) await sb.from("collection_products").upsert({ collection_id: update.collection_id, product_id: id }, { onConflict: "collection_id,product_id" });
  await audit({ action: "product.update", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: id, before: { name: before.name }, after: { name: update.name } });
  if (Number(before.retail_price) !== Number(update.retail_price)) {
    await audit({ action: "product.price_change", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: id, before: { retail_price: before.retail_price }, after: { retail_price: update.retail_price } });
  }
  await sb.rpc("refresh_product_eligibility", { p_product_id: id });
  back(id, "Guardado");
}

export async function addImageAction(formData: FormData) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = String(formData.get("id"));
  const url = String(formData.get("url") ?? "");
  if (!z.string().url().safeParse(url).success) back(id, "URL no válida");
  const kind = ["IMAGE", "MOCKUP", "LIFESTYLE", "PRINT_FILE"].includes(String(formData.get("kind"))) ? String(formData.get("kind")) : "IMAGE";
  const { count } = await db().from("product_images").select("id", { count: "exact", head: true }).eq("product_id", id);
  await db().from("product_images").insert({ product_id: id, url, kind, alt: str(formData.get("alt")), sort: count ?? 0 });
  await db().rpc("refresh_product_eligibility", { p_product_id: id });
  back(id);
}

export async function removeImageAction(formData: FormData) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = String(formData.get("id"));
  await db().from("product_images").delete().eq("id", String(formData.get("imageId"))).eq("product_id", id);
  await db().rpc("refresh_product_eligibility", { p_product_id: id });
  back(id);
}

export async function updateMappingAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) === "BACKUP" ? "BACKUP" : "PRIMARY";
  const files: { type: string; url: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const type = str(formData.get(`file_type_${i}`));
    const url = str(formData.get(`file_url_${i}`));
    if (type && url && z.string().url().safeParse(url).success) files.push({ type, url });
  }
  const printConfig = files.length ? { files } : null;
  // Any config change invalidates approval + test (must re-approve & re-test).
  await db()
    .from("product_provider_mappings")
    .update({ fulfillment_method: str(formData.get("fulfillment_method")), print_config: printConfig, approved: false, approved_at: null, test_passed_at: null })
    .eq("product_id", id)
    .eq("role", role);
  await audit({ action: "provider.change", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: id, after: { role, files: files.length } });
  await db().rpc("refresh_product_eligibility", { p_product_id: id });
  back(id, "Configuración guardada — aprueba y ejecuta el test de nuevo");
}

export async function approveMappingAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  await approveMapping(staff, id, String(formData.get("role")) === "BACKUP" ? "BACKUP" : "PRIMARY");
  back(id, "Mapeo aprobado");
}

export async function runTestAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) === "BACKUP" ? "BACKUP" : "PRIMARY";
  let msg: string;
  try {
    const r = await runFulfillmentTest(staff, id, role);
    msg = r.ok ? `Test OK — producción ${"production" in r ? r.production : "?"} · envío ${"shipping" in r ? r.shipping : "?"}` : `Test fallido: ${JSON.stringify("error" in r ? r.error : "").slice(0, 300)}`;
  } catch (e) {
    msg = e instanceof Error ? e.message : String(e);
  }
  back(id, msg);
}

export async function brandApproveAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const approved = formData.get("approved") === "true";
  await db().from("products").update({ brand_approved: approved, status: approved ? "APPROVED" : "REVIEW" }).eq("id", id).neq("status", "PUBLISHED");
  await audit({ action: "product.approve", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: id, after: { brand_approved: approved } });
  await db().rpc("refresh_product_eligibility", { p_product_id: id });
  back(id);
}

export async function publishAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const r = await publishProduct(staff, id);
  back(id, r.ok ? "Publicado ✓" : `No publicable: ${r.failures.join(", ")}`);
}

export async function setStatusAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["DRAFT", "REVIEW", "READY_FOR_FULFILLMENT", "PAUSED", "ARCHIVED"].includes(status)) back(id);
  if (status === "READY_FOR_FULFILLMENT") {
    const { data: r } = await db().rpc("refresh_product_eligibility", { p_product_id: id });
    if (!(r as { eligible?: boolean })?.eligible) back(id, "Aún no es elegible para fulfillment");
  }
  await db().from("products").update({ status }).eq("id", id);
  await audit({ action: status === "ARCHIVED" || status === "PAUSED" ? "product.unpublish" : "product.update", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: id, after: { status } });
  back(id);
}

export async function updateVariantAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const variantId = String(formData.get("variantId"));
  await db()
    .from("product_variants")
    .update({ retail_price: num(formData.get("retail_price")), active: formData.get("active") === "on", variant_name: String(formData.get("variant_name") || "") || undefined })
    .eq("id", variantId)
    .eq("product_id", id);
  await audit({ action: "product.price_change", actorId: staff.userId, actorEmail: staff.email, entityType: "variant", entityId: variantId, after: { retail_price: num(formData.get("retail_price")) } });
  await db().rpc("refresh_product_eligibility", { p_product_id: id });
  back(id);
}

/** Backup provider mapping: lines of "<variant uuid>=<provider variant id>". Starts unapproved. */
export async function addBackupMappingAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id"));
  const providerId = String(formData.get("providerId"));
  const providerProductId = String(formData.get("providerProductId") ?? "").trim();
  if (!providerProductId) back(id, "Falta ID de producto del proveedor");
  const sb = db();
  const { data: primary } = await sb.from("product_provider_mappings").select("provider_id").eq("product_id", id).eq("role", "PRIMARY").maybeSingle();
  if (primary?.provider_id === providerId) back(id, "El backup debe ser un proveedor distinto");
  await sb.from("product_provider_mappings").delete().eq("product_id", id).eq("role", "BACKUP");
  const { data: m, error } = await sb.from("product_provider_mappings").insert({ product_id: id, provider_id: providerId, role: "BACKUP", provider_product_id: providerProductId, fulfillment_method: str(formData.get("fulfillment_method")) }).select("id").single();
  if (error || !m) back(id, `Error: ${error?.message}`);
  const lines = String(formData.get("variantMap") ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const l of lines) {
    const [variantId, providerVariantId] = l.split("=").map((s) => s.trim());
    if (variantId && providerVariantId) await sb.from("variant_provider_mappings").insert({ mapping_id: m!.id, variant_id: variantId, provider_variant_id: providerVariantId });
  }
  await sb.from("products").update({ backup_provider: providerId }).eq("id", id);
  await audit({ action: "provider.change", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: id, after: { backup: providerId, variants: lines.length } });
  back(id, "Backup creado (pendiente de aprobación y test)");
}

export async function createManualProductAction() {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const { data } = await db().from("products").insert({ brand_id: (await import("@/lib/env")).env.brandId(), name: "Nuevo producto", slug: `nuevo-${Date.now()}`, product_type: "OTHER", status: "DRAFT" }).select("id").single();
  await audit({ action: "product.create", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: data?.id });
  redirect(`/admin/products/${data?.id}`);
}

/** Configure customer personalization for a product (template presets or the free designer). */
export async function savePersonalizationAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = String(formData.get("id"));
  const kind = String(formData.get("kind"));
  const extraPrice = Math.max(0, Math.min(100, Number(formData.get("extraPrice") ?? 0) || 0));
  const { PRESETS } = await import("@/lib/personalization/presets");
  let config: Record<string, unknown> | null = null;
  if (kind === "designer") {
    const placements = String(formData.get("placements") ?? "front").split(",").filter((x) => x === "front" || x === "back");
    config = { mode: "designer", placements: placements.length ? placements : ["front"], extraPrice, maxLayers: 8 };
  } else if (kind in PRESETS) {
    config = { ...PRESETS[kind as keyof typeof PRESETS], extraPrice };
  }
  const sb = db();
  await sb.from("products").update({ personalization: config }).eq("id", id);
  if (config?.mode === "designer") {
    // Blank products have no brand artwork: mark the mapping as personalized so eligibility/test know.
    const { data: maps } = await sb.from("product_provider_mappings").select("id, print_config").eq("product_id", id);
    for (const m of maps ?? []) {
      const pc = (m.print_config as Record<string, unknown> | null) ?? {};
      await sb.from("product_provider_mappings").update({ print_config: { ...pc, personalized: true } }).eq("id", m.id);
    }
  }
  await audit({ action: "product.update", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: id, after: { personalization: config } });
  revalidatePath(`/admin/products/${id}`);
}

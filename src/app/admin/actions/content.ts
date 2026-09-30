"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/format";
import { CAMPAIGN_SCHEMA, COLLECTION_SCHEMA, CONTENT_SCHEMA, PRODUCT_SCHEMA, generateJSON, prompts, runGeneration } from "@/lib/ai/client";
import { getAssistantDataPack } from "@/lib/analytics/business";
import { emitEvent } from "@/lib/events/bus";

const s = (v: FormDataEntryValue | null) => (v == null ? "" : String(v).trim());
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---------------- AI (never publishes) ----------------
export async function aiProductAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const input = { collection: s(formData.get("collection")), theme: s(formData.get("theme")), target: s(formData.get("target")), productType: s(formData.get("productType")), concept: s(formData.get("concept")), tone: s(formData.get("tone")) };
  let q = "";
  try {
    const r = await runGeneration({ kind: "PRODUCT", input, system: prompts.system, prompt: prompts.product(input), schema: PRODUCT_SCHEMA, actor: staff });
    q = `gen=${r.id}`;
  } catch (e) {
    q = `msg=${encodeURIComponent(errMsg(e))}`;
  }
  redirect(`/admin/ai?${q}`);
}

export async function aiCollectionAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const brief = s(formData.get("brief")).slice(0, 1000);
  let q = "";
  try {
    const r = await runGeneration({ kind: "COLLECTION", input: { brief }, system: prompts.system, prompt: prompts.collection(brief), schema: COLLECTION_SCHEMA, actor: staff });
    q = `gen=${r.id}`;
  } catch (e) {
    q = `msg=${encodeURIComponent(errMsg(e))}`;
  }
  redirect(`/admin/ai?${q}`);
}

export async function aiCampaignAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const collectionId = s(formData.get("collectionId"));
  const { data: c } = await db().from("collections").select("id, name, story, tagline").eq("id", collectionId).single();
  let q = "";
  try {
    if (!c) throw new Error("Colección no encontrada");
    const r = await runGeneration({ kind: "CAMPAIGN", input: { collectionId: c.id, collection: c.name }, system: prompts.system, prompt: prompts.campaign(c.name, `${c.tagline ?? ""} ${c.story ?? ""}`), schema: CAMPAIGN_SCHEMA, actor: staff });
    q = `gen=${r.id}`;
  } catch (e) {
    q = `msg=${encodeURIComponent(errMsg(e))}`;
  }
  redirect(`/admin/content?${q}`);
}

export async function aiContentAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const type = s(formData.get("type")) || "LIFESTYLE";
  const topic = s(formData.get("topic")).slice(0, 500);
  const n = Math.min(10, Math.max(1, Number(formData.get("n")) || 5));
  let q = "";
  try {
    const r = await runGeneration({ kind: "CONTENT", input: { type, topic, n, collectionId: s(formData.get("collectionId")) || null }, system: prompts.system, prompt: prompts.content(type, topic, n), schema: CONTENT_SCHEMA, actor: staff });
    q = `gen=${r.id}`;
  } catch (e) {
    q = `msg=${encodeURIComponent(errMsg(e))}`;
  }
  redirect(`/admin/content?${q}`);
}

export async function reviewGenerationAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = s(formData.get("id"));
  const status = s(formData.get("status")) === "APPROVED" ? "APPROVED" : "REJECTED";
  await db().from("ai_generations").update({ status, reviewed_by: staff.userId, reviewed_at: new Date().toISOString() }).eq("id", id);
  await audit({ action: "ai.review", actorId: staff.userId, actorEmail: staff.email, entityType: "ai_generation", entityId: id, after: { status } });
  revalidatePath("/admin/ai");
  revalidatePath("/admin/content");
}

/** Apply APPROVED product copy to a product (product stays unpublished until eligibility + manual publish). */
export async function applyProductCopyAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const genId = s(formData.get("id"));
  const productId = s(formData.get("productId"));
  const { data: g } = await db().from("ai_generations").select("status, output, kind").eq("id", genId).single();
  if (!g || g.status !== "APPROVED" || g.kind !== "PRODUCT") redirect(`/admin/ai?msg=${encodeURIComponent("Aprueba la generación primero")}`);
  const o = PRODUCT_SCHEMA.parse(g!.output);
  await db().from("products").update({ short_description: o.short_description, description: o.long_description, story: o.product_story, seo_title: o.seo_title.slice(0, 70), seo_description: o.seo_description.slice(0, 170), tags: o.tags }).eq("id", productId);
  await db().from("ai_generations").update({ status: "APPLIED" }).eq("id", genId);
  await audit({ action: "product.update", actorId: staff.userId, actorEmail: staff.email, entityType: "product", entityId: productId, after: { ai_generation: genId } });
  redirect(`/admin/products/${productId}?msg=${encodeURIComponent("Texto IA aplicado (no publicado)")}`);
}

/** Turn an APPROVED content generation into DRAFT content items linked to its collection. */
export async function saveContentItemsAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const genId = s(formData.get("id"));
  const { data: g } = await db().from("ai_generations").select("status, output, input, kind").eq("id", genId).single();
  if (!g || g.status !== "APPROVED" || g.kind !== "CONTENT") redirect(`/admin/content?msg=${encodeURIComponent("Aprueba la generación primero")}`);
  const o = CONTENT_SCHEMA.parse(g!.output);
  const input = (g!.input ?? {}) as { type?: string; collectionId?: string | null };
  const type = ["PRODUCT", "LIFESTYLE", "HERITAGE", "CULTURE", "MOTOR", "MEDITERRANEAN", "COMMUNITY", "UGC", "CREATOR", "DROP", "LIMITED", "EXPERIMENTAL"].includes(input.type ?? "") ? input.type : "LIFESTYLE";
  await db().from("content").insert(
    o.items.map((it) => ({ brand_id: env.brandId(), type, title: it.hook.slice(0, 120), status: "DRAFT", hook: it.hook, script: it.script, caption: it.caption, cta: it.cta, hashtags: it.hashtags, collection_id: input.collectionId || null, ai_generation_id: genId, created_by: staff.userId })),
  );
  await db().from("ai_generations").update({ status: "APPLIED" }).eq("id", genId);
  redirect(`/admin/content?msg=${encodeURIComponent(`${o.items.length} ideas guardadas como borrador`)}`);
}

export async function askAssistantAction(_prev: { answer?: string; error?: string } | null, formData: FormData) {
  const staff = await requireStaff(["ADMIN", "ANALYST"]);
  const question = s(formData.get("question")).slice(0, 500);
  if (!question) return { error: "Escribe una pregunta" };
  try {
    const data = await getAssistantDataPack();
    const out = await generateJSON({
      system:
        "You are the internal business analyst of a Spanish lifestyle brand. Answer ONLY from the JSON data provided. If the data does not contain the answer, say exactly what is missing. Never invent or estimate numbers that are not in the data. Label estimated values as estimates. Answer in Spanish, concise.",
      prompt: `DATA:\n${JSON.stringify(data).slice(0, 60000)}\n\nQUESTION: ${question}\n\nReturn {"answer": "..."}`,
      schema: z.object({ answer: z.string() }),
      maxTokens: 1500,
    });
    await db().from("ai_generations").insert({ brand_id: env.brandId(), kind: "BUSINESS_QUESTION", input: { question }, output: out, status: "APPROVED", created_by: staff.userId, model: env.aiModel() });
    return { answer: out.answer };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

// ---------------- Content ----------------
export async function createContentAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const title = s(formData.get("title"));
  if (!title) redirect("/admin/content");
  await db().from("content").insert({
    brand_id: env.brandId(),
    type: s(formData.get("type")) || "LIFESTYLE",
    platform: s(formData.get("platform")) || null,
    title,
    slug: s(formData.get("type")) === "JOURNAL" ? slugify(title) : null,
    body: s(formData.get("body")) || null,
    hook: s(formData.get("hook")) || null,
    external_url: s(formData.get("external_url")) || null,
    collection_id: s(formData.get("collectionId")) || null,
    product_id: s(formData.get("productId")) || null,
    status: "DRAFT",
    created_by: staff.userId,
  });
  revalidatePath("/admin/content");
}

export async function setContentStatusAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = s(formData.get("id"));
  const status = s(formData.get("status"));
  if (!["DRAFT", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(status)) return;
  await db().from("content").update({ status, published_at: status === "PUBLISHED" ? new Date().toISOString() : null }).eq("id", id);
  if (status === "PUBLISHED") {
    await audit({ action: "content.publish", actorId: staff.userId, actorEmail: staff.email, entityType: "content", entityId: id });
    await emitEvent("CONTENT_PUBLISHED", { contentId: id });
  }
  revalidatePath("/admin/content");
  revalidatePath("/journal");
}

/** Manual platform metrics entry (until social APIs are connected). */
export async function addMetricsAction(formData: FormData) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER", "ANALYST"]);
  const n = (k: string) => Math.max(0, Math.floor(Number(formData.get(k)) || 0));
  await db().from("content_metrics").upsert(
    { content_id: s(formData.get("id")), date: s(formData.get("date")) || new Date().toISOString().slice(0, 10), views: n("views"), likes: n("likes"), comments: n("comments"), shares: n("shares"), saves: n("saves"), clicks: n("clicks"), source: "MANUAL" },
    { onConflict: "content_id,date" },
  );
  revalidatePath("/admin/content");
}

// ---------------- Collections & drops ----------------
export async function saveCollectionAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = s(formData.get("id"));
  const row = {
    brand_id: env.brandId(),
    name: s(formData.get("name")),
    slug: slugify(s(formData.get("slug")) || s(formData.get("name"))),
    tagline: s(formData.get("tagline")) || null,
    story: s(formData.get("story")) || null,
    hero_image: s(formData.get("hero_image")) || null,
    accent_color: s(formData.get("accent_color")) || null,
    status: ["DRAFT", "ACTIVE", "ARCHIVED"].includes(s(formData.get("status"))) ? s(formData.get("status")) : "DRAFT",
    featured: formData.get("featured") === "on",
    sort: Number(formData.get("sort")) || 0,
    seo_title: s(formData.get("seo_title")) || null,
    seo_description: s(formData.get("seo_description")) || null,
  };
  if (!row.name) redirect("/admin/collections");
  if (id) await db().from("collections").update(row).eq("id", id);
  else await db().from("collections").insert(row);
  await audit({ action: "settings.update", actorId: staff.userId, actorEmail: staff.email, entityType: "collection", entityId: id || row.slug, after: row });
  revalidatePath("/", "layout");
  redirect("/admin/collections");
}

export async function saveDropAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = s(formData.get("id"));
  const row = {
    brand_id: env.brandId(),
    name: s(formData.get("name")),
    slug: slugify(s(formData.get("slug")) || s(formData.get("name"))),
    number: Number(formData.get("number")) || null,
    description: s(formData.get("description")) || null,
    collection_id: s(formData.get("collection_id")) || null,
    start_date: s(formData.get("start_date")) ? new Date(s(formData.get("start_date"))).toISOString() : null,
    end_date: s(formData.get("end_date")) ? new Date(s(formData.get("end_date"))).toISOString() : null,
    status: ["DRAFT", "SCHEDULED", "LIVE", "ENDED", "ARCHIVED"].includes(s(formData.get("status"))) ? s(formData.get("status")) : "DRAFT",
    featured: formData.get("featured") === "on",
    limited: formData.get("limited") === "on",
  };
  if (!row.name) redirect("/admin/drops");
  const { data } = id ? await db().from("drops").update(row).eq("id", id).select("id").single() : await db().from("drops").insert(row).select("id").single();
  const productIds = formData.getAll("product").map(String);
  if (data) {
    await db().from("drop_products").delete().eq("drop_id", data.id);
    if (productIds.length) {
      await db().from("drop_products").insert(productIds.map((p, i) => ({ drop_id: data.id, product_id: p, sort: i })));
      await db().from("products").update({ drop_id: data.id }).in("id", productIds);
    }
  }
  await audit({ action: "settings.update", actorId: staff.userId, actorEmail: staff.email, entityType: "drop", entityId: data?.id, after: row });
  revalidatePath("/", "layout");
  redirect("/admin/drops");
}

export async function startDropNowAction(formData: FormData) {
  await requireStaff(["ADMIN"]);
  await emitEvent("DROP_STARTED", { dropId: s(formData.get("id")) });
  revalidatePath("/", "layout");
  redirect("/admin/drops?msg=Drop%20lanzado");
}

// ---------------- Community ----------------
export async function createPollAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const labels = s(formData.get("options")).split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
  if (labels.length < 2) redirect("/admin/community?msg=M%C3%ADnimo%202%20opciones");
  await db().from("community_posts").insert({
    brand_id: env.brandId(),
    type: s(formData.get("type")) || "POLL",
    title: s(formData.get("title")),
    body: s(formData.get("body")) || null,
    options: labels.map((label, i) => ({ key: String.fromCharCode(65 + i), label })),
    status: "OPEN",
    closes_at: s(formData.get("closes_at")) ? new Date(s(formData.get("closes_at"))).toISOString() : null,
    author_user_id: staff.userId,
  });
  revalidatePath("/community");
  redirect("/admin/community");
}

export async function closePollAction(formData: FormData) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const id = s(formData.get("id"));
  const { data: votes } = await db().from("community_votes").select("option_key").eq("post_id", id);
  const result: Record<string, number> = {};
  for (const v of votes ?? []) result[v.option_key] = (result[v.option_key] ?? 0) + 1;
  await db().from("community_posts").update({ status: "CLOSED", result }).eq("id", id);
  revalidatePath("/community");
  redirect("/admin/community");
}

export async function moderateCommentAction(formData: FormData) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  await db().from("community_comments").update({ status: s(formData.get("status")) === "APPROVED" ? "APPROVED" : "REJECTED" }).eq("id", s(formData.get("id")));
  revalidatePath("/admin/community");
}

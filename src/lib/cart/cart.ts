import "server-only";
import { cookies } from "next/headers";
import { dbOrNull, db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { round2 } from "@/lib/pricing/cost-engine";
import type { PersoConfig } from "@/lib/personalization/types";
import { extraPriceFor, validatePersonalization } from "@/lib/personalization/validate";
import { publicUrlFor } from "@/lib/personalization/storage";

const isPersonalized = (p: unknown) => !!p && typeof p === "object" && Object.keys(p as object).length > 0;

export const CART_COOKIE = "cart_id";
export const MAX_QTY = 20;

export interface CartLine {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  image: string | null;
  quantity: number;
  unitPrice: number; // price stored in cart
  currentPrice: number; // live price
  lineTotal: number;
  purchasable: boolean;
  issue: string | null;
  personalization: Record<string, unknown> | null;
  personalizationSummary: string | null;
}

export interface CartView {
  id: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  currency: string;
  hasIssues: boolean;
}

const EMPTY: CartView = { id: null, lines: [], itemCount: 0, subtotal: 0, currency: "EUR", hasIssues: false };

export async function getCartId(): Promise<string | null> {
  const c = await cookies();
  return c.get(CART_COOKIE)?.value ?? null;
}

async function ensureCart(): Promise<string> {
  const existing = await getCartId();
  const sb = db();
  if (existing) {
    const { data } = await sb.from("carts").select("id, status").eq("id", existing).maybeSingle();
    if (data && (data.status === "ACTIVE" || data.status === "CHECKOUT_STARTED")) return data.id;
    if (data && data.status === "ABANDONED") {
      await sb.from("carts").update({ status: "ACTIVE" }).eq("id", data.id);
      return data.id;
    }
  }
  const c = await cookies();
  const ref = c.get("ref_creator")?.value;
  const creatorOk = ref && /^[0-9a-f-]{36}$/i.test(ref) ? (await sb.from("creators").select("id").eq("id", ref).eq("status", "ACTIVE").maybeSingle()).data : null;
  const { data, error } = await sb
    .from("carts")
    .insert({ brand_id: env.brandId(), session_id: c.get("sid")?.value ?? null, creator_id: creatorOk ? ref : null })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("cart create failed");
  c.set(CART_COOKIE, data.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return data.id;
}

/** Live-validated view of the cart (prices always from DB, never from the client). */
export async function getCart(): Promise<CartView> {
  const id = await getCartId();
  const sb = dbOrNull();
  if (!id || !sb) return EMPTY;
  const { data: cart } = await sb.from("carts").select("id, currency, status").eq("id", id).maybeSingle();
  if (!cart || cart.status === "CONVERTED" || cart.status === "EXPIRED") return EMPTY;
  const { data: items } = await sb
    .from("cart_items")
    .select("id, product_id, variant_id, quantity, unit_price, personalization, products(name, slug, status, fulfillment_eligible, retail_price, personalization, product_images(url, sort, kind)), product_variants(variant_name, retail_price, active, stock_status, image)")
    .eq("cart_id", id)
    .order("created_at");

  const lines: CartLine[] = (items ?? []).map((it) => {
    const p = it.products as unknown as { name: string; slug: string; status: string; fulfillment_eligible: boolean; retail_price: number; personalization: PersoConfig | null; product_images: { url: string; sort: number; kind: string }[] };
    const v = it.product_variants as unknown as { variant_name: string; retail_price: number | null; active: boolean; stock_status: string; image: string | null };
    const personalized = isPersonalized(it.personalization);
    const perso = personalized ? validatePersonalization(p.personalization, it.personalization, { publicUrlFor }) : null;
    const currentPrice = round2(Number(v.retail_price ?? p.retail_price) + extraPriceFor(p.personalization, personalized, it.personalization));
    let issue: string | null = null;
    if (p.status !== "PUBLISHED" || !p.fulfillment_eligible) issue = "UNAVAILABLE";
    else if (perso && !perso.ok) issue = "UNAVAILABLE";
    else if (!v.active || v.stock_status === "OUT_OF_STOCK" || v.stock_status === "DISCONTINUED") issue = "VARIANT_UNAVAILABLE";
    else if (round2(currentPrice) !== round2(Number(it.unit_price))) issue = "PRICE_CHANGED";
    const img = v.image ?? p.product_images?.filter((i) => i.kind !== "PRINT_FILE").sort((a, b) => a.sort - b.sort)[0]?.url ?? null;
    return {
      id: it.id,
      productId: it.product_id,
      variantId: it.variant_id,
      productName: p.name,
      productSlug: p.slug,
      variantName: v.variant_name,
      image: img,
      quantity: it.quantity,
      unitPrice: Number(it.unit_price),
      currentPrice,
      lineTotal: round2(currentPrice * it.quantity),
      purchasable: issue === null || issue === "PRICE_CHANGED",
      issue,
      personalization: personalized ? (it.personalization as Record<string, unknown>) : null,
      personalizationSummary: perso && perso.ok ? perso.data.summary : null,
    };
  });
  const valid = lines.filter((l) => l.purchasable);
  return {
    id,
    lines,
    itemCount: valid.reduce((s, l) => s + l.quantity, 0),
    subtotal: round2(valid.reduce((s, l) => s + l.lineTotal, 0)),
    currency: cart.currency,
    hasIssues: lines.some((l) => l.issue && l.issue !== "PRICE_CHANGED"),
  };
}

export async function addToCart(variantId: string, quantity: number, personalization?: unknown) {
  const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(quantity)));
  const sb = db();
  const { data: v } = await sb
    .from("product_variants")
    .select("id, product_id, retail_price, active, stock_status, products(status, fulfillment_eligible, retail_price, personalization)")
    .eq("id", variantId)
    .maybeSingle();
  const p = v?.products as unknown as { status: string; fulfillment_eligible: boolean; retail_price: number; personalization: PersoConfig | null } | undefined;
  if (!v || !p || p.status !== "PUBLISHED" || !p.fulfillment_eligible || !v.active || v.stock_status === "OUT_OF_STOCK" || v.stock_status === "DISCONTINUED") {
    return { ok: false as const, error: "UNAVAILABLE" };
  }
  let persoValue: Record<string, unknown> = {};
  let persoKey = "";
  if (isPersonalized(personalization)) {
    const res = validatePersonalization(p.personalization, personalization, { publicUrlFor });
    if (!res.ok) return { ok: false as const, error: `PERSONALIZATION_${res.error}` };
    persoValue = res.data.value as unknown as Record<string, unknown>;
    persoKey = res.data.key;
  }
  const cartId = await ensureCart();
  const price = round2(Number(v.retail_price ?? p.retail_price) + extraPriceFor(p.personalization, persoKey !== "", persoValue));
  const { data: existing } = await sb.from("cart_items").select("id, quantity").eq("cart_id", cartId).eq("variant_id", variantId).eq("personalization_key", persoKey).maybeSingle();
  if (existing) {
    await sb.from("cart_items").update({ quantity: Math.min(MAX_QTY, existing.quantity + qty), unit_price: price }).eq("id", existing.id);
  } else {
    const { error } = await sb.from("cart_items").insert({ cart_id: cartId, product_id: v.product_id, variant_id: variantId, quantity: qty, unit_price: price, personalization: persoValue, personalization_key: persoKey });
    if (error) return { ok: false as const, error: "UNAVAILABLE" };
  }
  await sb.from("carts").update({ status: "ACTIVE" }).eq("id", cartId);
  return { ok: true as const, productId: v.product_id as string };
}

export async function setLineQuantity(lineId: string, quantity: number) {
  const cartId = await getCartId();
  if (!cartId) return;
  const sb = db();
  if (quantity <= 0) {
    await sb.from("cart_items").delete().eq("id", lineId).eq("cart_id", cartId);
    return;
  }
  const { data: line } = await sb.from("cart_items").select("variant_id, personalization").eq("id", lineId).eq("cart_id", cartId).maybeSingle();
  if (!line) return;
  const { data: v } = await sb.from("product_variants").select("retail_price, products(retail_price, personalization)").eq("id", line.variant_id).single();
  const prod = v?.products as unknown as { retail_price: number; personalization: PersoConfig | null } | undefined;
  const price = round2(Number(v?.retail_price ?? prod?.retail_price) + extraPriceFor(prod?.personalization, isPersonalized(line.personalization), line.personalization));
  await sb.from("cart_items").update({ quantity: Math.min(MAX_QTY, Math.floor(quantity)), unit_price: price }).eq("id", lineId).eq("cart_id", cartId);
}

export async function refreshCartPrices() {
  const cart = await getCart();
  if (!cart.id) return;
  const sb = db();
  for (const l of cart.lines) {
    if (l.issue === "PRICE_CHANGED") await sb.from("cart_items").update({ unit_price: l.currentPrice }).eq("id", l.id);
    if (l.issue === "UNAVAILABLE" || l.issue === "VARIANT_UNAVAILABLE") await sb.from("cart_items").delete().eq("id", l.id);
  }
}

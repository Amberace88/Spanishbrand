import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getBrand } from "@/lib/brand";
import { sendEmail } from "@/lib/email/send";
import { log } from "@/lib/logger";
import { REASONS, RETURN_SHIP_DAYS, addDays, eligibility, fmtDate, isPersonalized, type Eligibility, type ReasonCode, type Resolution, type ReturnType, type PhotoKind, MAX_PHOTOS } from "./rules";

export const RETURNS_BUCKET = "returns";

/* ───────────── simple in-memory throttle (per instance) ───────────── */
const hits = new Map<string, number[]>();
export function throttle(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) return false;
  list.push(now);
  hits.set(key, list);
  return true;
}

/* ───────────── return address (admin → Ajustes → Devoluciones) ───────────── */
export interface ReturnsSettings {
  address?: { name?: string; line1?: string; line2?: string; postalCode?: string; city?: string; province?: string; country?: string; phone?: string };
  instructions?: string;
  notifyEmail?: string;
}
export async function returnsSettings(): Promise<ReturnsSettings> {
  const brand = await getBrand();
  return ((brand.settings as { returns?: ReturnsSettings }).returns ?? {}) as ReturnsSettings;
}
export function formatAddress(a: ReturnsSettings["address"]): string | null {
  if (!a?.line1 || !a.city) return null;
  return [a.name, a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(" "), [a.province, a.country].filter(Boolean).join(", "), a.phone ? `Tel. ${a.phone}` : null].filter(Boolean).join("\n");
}

/* ───────────── order lookup ───────────── */
export interface LookupItem {
  id: string;
  name: string;
  variant: string | null;
  image: string | null;
  quantity: number;
  unitPrice: number;
  personalized: boolean;
  alreadyRequested: number;
  eligibility: Eligibility;
}
export interface LookupResult {
  orderId: string;
  orderNumber: number;
  email: string;
  customerName: string | null;
  shippingAddress: Record<string, unknown> | null;
  currency: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: LookupItem[];
  openRequests: { rma: string; status: string }[];
}

const RETURNABLE_STATUSES = ["PAID", "PROCESSING", "SENT_TO_PROVIDER", "PROVIDER_ACCEPTED", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "REQUIRES_REVIEW"];

export async function lookupOrder(orderNumber: number, email: string): Promise<LookupResult | null> {
  const sb = db();
  const { data: order } = await sb
    .from("orders")
    .select("id, order_number, customer_email, customer_name, shipping_address, currency, status, order_items(id, product_name, variant_name, image, quantity, unit_price, personalization)")
    .eq("brand_id", env.brandId())
    .eq("order_number", orderNumber)
    .maybeSingle();
  // constant-ish response for wrong email vs wrong number (no enumeration hint)
  if (!order || String(order.customer_email).toLowerCase() !== email.trim().toLowerCase()) return null;
  if (!RETURNABLE_STATUSES.includes(order.status)) return null;

  const [{ data: ships }, { data: fos }, { data: prev }] = await Promise.all([
    sb.from("shipments").select("shipped_at, delivered_at, status").eq("order_id", order.id),
    sb.from("fulfillment_orders").select("shipped_at, delivered_at").eq("order_id", order.id),
    sb.from("return_requests").select("rma, status, return_items(order_item_id, quantity)").eq("order_id", order.id).not("status", "in", "(REJECTED,CANCELLED)"),
  ]);
  const dates = (k: "shipped_at" | "delivered_at") => [...(ships ?? []), ...(fos ?? [])].map((r) => r[k] as string | null).filter(Boolean).sort() as string[];
  const shippedAt = dates("shipped_at")[0] ?? null;
  const delivered = dates("delivered_at");
  const deliveredAt = delivered.length ? delivered[delivered.length - 1] : null; // last parcel received
  const requested = new Map<string, number>();
  for (const r of prev ?? []) for (const it of (r.return_items ?? []) as { order_item_id: string; quantity: number }[]) requested.set(it.order_item_id, (requested.get(it.order_item_id) ?? 0) + it.quantity);

  const items = ((order.order_items ?? []) as { id: string; product_name: string; variant_name: string | null; image: string | null; quantity: number; unit_price: number; personalization: unknown }[]).map((it) => {
    const personalized = isPersonalized(it.personalization);
    return {
      id: it.id,
      name: it.product_name,
      variant: it.variant_name,
      image: it.image,
      quantity: it.quantity,
      unitPrice: Number(it.unit_price),
      personalized,
      alreadyRequested: requested.get(it.id) ?? 0,
      eligibility: eligibility({ personalized, shippedAt, deliveredAt }),
    };
  });
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    email: order.customer_email,
    customerName: order.customer_name,
    shippingAddress: order.shipping_address as Record<string, unknown> | null,
    currency: order.currency,
    shippedAt,
    deliveredAt,
    items,
    openRequests: (prev ?? []).map((r) => ({ rma: r.rma, status: r.status })),
  };
}

/* ───────────── create ───────────── */
export interface CreateReturnInput {
  orderNumber: number;
  email: string;
  type: ReturnType;
  items: { id: string; quantity: number; reason: ReasonCode; details?: string }[];
  resolution: Resolution;
  exchangeNote?: string;
  description: string;
  contact: { name: string; phone?: string };
  address?: Record<string, string>;
  photos: { path: string; kind: PhotoKind }[];
  declarations: string[];
  ip?: string | null;
  userAgent?: string | null;
}

export class ReturnError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const REQUIRED_DECLARATIONS: Record<ReturnType, string[]> = {
  ISSUE: ["truthful", "keep_item", "privacy"],
  WITHDRAWAL: ["withdraw", "return_cost", "return_deadline", "condition", "privacy"],
};

function makeRma(orderNumber: number) {
  return `DEV-${orderNumber}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

export async function createReturn(input: CreateReturnInput) {
  const order = await lookupOrder(input.orderNumber, input.email);
  if (!order) throw new ReturnError("ORDER_NOT_FOUND");
  if (!input.items.length) throw new ReturnError("NO_ITEMS");
  for (const d of REQUIRED_DECLARATIONS[input.type]) if (!input.declarations.includes(d)) throw new ReturnError("DECLARATIONS");

  // validate every line against eligibility + reason type
  for (const sel of input.items) {
    const it = order.items.find((x) => x.id === sel.id);
    if (!it) throw new ReturnError("ITEM_NOT_FOUND");
    const reason = REASONS[sel.reason];
    if (!reason || reason.type !== input.type) throw new ReturnError("REASON");
    if (sel.quantity < 1 || sel.quantity > it.quantity - it.alreadyRequested) throw new ReturnError("QUANTITY");
    if (input.type === "WITHDRAWAL" && !it.eligibility.withdrawal) throw new ReturnError(it.eligibility.withdrawalReason === "PERSONALIZED" ? "PERSONALIZED" : "WITHDRAWAL_EXPIRED");
    if (input.type === "ISSUE" && !it.eligibility.issue) throw new ReturnError(it.eligibility.issueReason === "NOT_SHIPPED" ? "NOT_SHIPPED" : "ISSUE_EXPIRED");
  }
  const allowedRes: Resolution[] = input.type === "ISSUE" ? ["REPRINT", "REFUND"] : ["STORE_CREDIT", "EXCHANGE", "REFUND"];
  if (!allowedRes.includes(input.resolution)) throw new ReturnError("RESOLUTION");

  // photos: issues need evidence (≥2 incl. the whole item, except "missing item" which needs the parcel)
  const photos = input.photos.filter((p) => /^pending\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(p.path)).slice(0, MAX_PHOTOS);
  if (input.type === "ISSUE") {
    const needsProduct = input.items.some((i) => i.reason !== "MISSING_ITEM");
    if (photos.length < 2) throw new ReturnError("PHOTOS");
    if (needsProduct && !photos.some((p) => p.kind === "product")) throw new ReturnError("PHOTOS");
  }

  const sb = db();
  const now = new Date();
  const first = order.items[0].eligibility;
  const provider = await providerFor(order.orderId, input.items.map((i) => i.id));
  const rma = makeRma(order.orderNumber);
  const declarations = Object.fromEntries(input.declarations.map((d) => [d, now.toISOString()]));
  const { data: row, error } = await sb
    .from("return_requests")
    .insert({
      brand_id: env.brandId(),
      rma,
      order_id: order.orderId,
      customer_email: order.email,
      type: input.type,
      status: input.type === "WITHDRAWAL" ? "AWAITING_RETURN" : "SUBMITTED",
      resolution: input.resolution,
      exchange_note: input.exchangeNote?.slice(0, 300) || null,
      contact: { name: input.contact.name.slice(0, 120), phone: input.contact.phone?.slice(0, 40) || null },
      address: input.address ?? null,
      description: input.description.slice(0, 4000),
      declarations,
      delivered_at: order.deliveredAt,
      withdrawal_deadline: first.withdrawalDeadline,
      return_deadline: input.type === "WITHDRAWAL" ? addDays(now, RETURN_SHIP_DAYS).toISOString() : null,
      provider_deadline: first.providerDeadline,
      provider_id: provider?.providerId ?? null,
      provider_order_id: provider?.providerOrderId ?? null,
      ip: input.ip ?? null,
      user_agent: input.userAgent?.slice(0, 300) ?? null,
    })
    .select("id")
    .single();
  if (error || !row) {
    log.error("RETURNS", "create return failed", { error: error?.message });
    throw new ReturnError("SAVE_FAILED");
  }
  await sb.from("return_items").insert(
    input.items.map((i) => ({ return_id: row.id, order_item_id: i.id, quantity: i.quantity, reason: i.reason, personalized: order.items.find((x) => x.id === i.id)!.personalized, details: i.details?.slice(0, 1000) || null })),
  );
  // move evidence from pending/ to the request folder
  const moved: { return_id: string; path: string; kind: string }[] = [];
  for (const p of photos) {
    const dest = `${rma}/${p.path.slice("pending/".length)}`;
    const { error: mvErr } = await sb.storage.from(RETURNS_BUCKET).move(p.path, dest);
    if (!mvErr) moved.push({ return_id: row.id, path: dest, kind: p.kind });
  }
  if (moved.length) await sb.from("return_photos").insert(moved);
  await sb.from("return_events").insert({ return_id: row.id, type: "CREATED", message: input.type === "WITHDRAWAL" ? "Desistimiento comunicado por el cliente" : "Incidencia comunicada por el cliente", visible_to_customer: true });
  await sb.from("order_events").insert({ order_id: order.orderId, type: "RETURN_REQUESTED", message: rma, data: { rma, type: input.type }, actor: "customer" }).then(() => null, () => null);

  // acknowledgment on a durable medium (art. 106.3) + team notification
  const settings = await returnsSettings();
  const address = input.type === "WITHDRAWAL" ? formatAddress(settings.address) : null;
  const returnUrl = `${env.siteUrl()}/returns/status?rma=${encodeURIComponent(rma)}&email=${encodeURIComponent(order.email)}`;
  const lines: [string, string][] = [
    ["Tipo", input.type === "WITHDRAWAL" ? "Desistimiento" : "Incidencia con el producto"],
    ...input.items.map((i): [string, string] => {
      const it = order.items.find((x) => x.id === i.id)!;
      return [`${it.name}${it.variant ? ` (${it.variant})` : ""} × ${i.quantity}`, REASONS[i.reason].es];
    }),
    ["Solución preferida", RES_ES[input.resolution]],
  ];
  await sendEmail({
    template: "RETURN_RECEIVED",
    to: order.email,
    orderId: order.orderId,
    dedupeKey: `return-received-${rma}`,
    context: { customerName: input.contact.name, orderNumber: order.orderNumber, rma, returnUrl, lines, returnAddress: address, returnDeadline: input.type === "WITHDRAWAL" ? fmtDate(addDays(now, RETURN_SHIP_DAYS).toISOString()) : null },
  }).catch(() => null);
  const brand = await getBrand();
  const team = settings.notifyEmail || brand.supportEmail;
  if (team)
    await sendEmail({ template: "RETURN_ADMIN", to: team, dedupeKey: `return-admin-${rma}`, context: { orderNumber: order.orderNumber, rma, lines: [...lines, ["Cliente", `${input.contact.name} · ${order.email}`], ["Fotos", String(moved.length)]], returnUrl: `${env.siteUrl()}/admin/devoluciones/${row.id}` } }).catch(() => null);

  return { id: row.id, rma, status: input.type === "WITHDRAWAL" ? "AWAITING_RETURN" : "SUBMITTED", returnAddress: address, returnDeadline: input.type === "WITHDRAWAL" ? addDays(now, RETURN_SHIP_DAYS).toISOString() : null };
}

export const RES_ES: Record<Resolution, string> = { REFUND: "Reembolso", REPRINT: "Reposición sin coste", EXCHANGE: "Cambio de talla", STORE_CREDIT: "Vale de compra (+10 %)" };
export const RES_EN: Record<Resolution, string> = { REFUND: "Refund", REPRINT: "Free replacement", EXCHANGE: "Size exchange", STORE_CREDIT: "Store voucher (+10%)" };

async function providerFor(orderId: string, orderItemIds: string[]) {
  const sb = db();
  const { data } = await sb.from("fulfillment_items").select("order_item_id, fulfillment_orders(provider_id, provider_order_id)").in("order_item_id", orderItemIds);
  const fo = (data ?? []).map((r) => r.fulfillment_orders as unknown as { provider_id: string; provider_order_id: string | null } | null).find(Boolean);
  if (fo) return { providerId: fo.provider_id, providerOrderId: fo.provider_order_id };
  const { data: any } = await sb.from("fulfillment_orders").select("provider_id, provider_order_id").eq("order_id", orderId).limit(1).maybeSingle();
  return any ? { providerId: any.provider_id as string, providerOrderId: any.provider_order_id as string | null } : null;
}

/* ───────────── customer status view ───────────── */
export async function getReturnForCustomer(rma: string, email: string) {
  const sb = db();
  const { data } = await sb
    .from("return_requests")
    .select("id, rma, type, status, resolution, exchange_note, customer_email, created_at, return_deadline, withdrawal_deadline, customer_message, refund_amount, orders(order_number, currency), return_items(quantity, reason, order_items(product_name, variant_name, image)), return_events(type, message, created_at, visible_to_customer)")
    .eq("brand_id", env.brandId())
    .eq("rma", rma.trim().toUpperCase())
    .maybeSingle();
  if (!data || String(data.customer_email).toLowerCase() !== email.trim().toLowerCase()) return null;
  return data;
}

/* ───────────── signed photo URLs (admin) ───────────── */
export async function signedPhotoUrls(paths: string[], seconds = 3600) {
  if (!paths.length) return new Map<string, string>();
  const { data } = await db().storage.from(RETURNS_BUCKET).createSignedUrls(paths, seconds);
  return new Map<string, string>((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]));
}

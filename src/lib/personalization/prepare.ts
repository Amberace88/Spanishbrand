import "server-only";
import { db } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import type { PersoConfig, Placement } from "./types";
import { validatePersonalization } from "./validate";
import { renderPrintFile } from "./render";
import { publicUrlFor, uploadObject } from "./storage";

export type PrepareResult = { status: "NONE" | "READY" | "NEEDS_REVIEW" | "FAILED"; reason?: string };

/**
 * Render (once) the print files of every personalized line of a paid order and decide whether
 * a human must approve them first. Idempotent: lines that already have print files are skipped.
 */
export async function preparePersonalization(orderId: string): Promise<PrepareResult> {
  const sb = db();
  const { data: order } = await sb.from("orders").select("id, order_number, metadata").eq("id", orderId).single();
  if (!order) return { status: "FAILED", reason: "ORDER_NOT_FOUND" };
  const { data: items } = await sb.from("order_items").select("id, product_id, personalization, print_files, products(personalization)").eq("order_id", orderId);
  const personalized = (items ?? []).filter((i) => i.personalization && Object.keys(i.personalization as object).length > 0);
  if (personalized.length === 0) return { status: "NONE" };

  let review = false;
  const reasons: string[] = [];
  for (const it of personalized) {
    const config = (it.products as unknown as { personalization: PersoConfig | null })?.personalization ?? null;
    const v = validatePersonalization(config, it.personalization, { publicUrlFor });
    if (!v.ok) return { status: "FAILED", reason: `ITEM ${it.id}: ${v.error}` };
    if (v.data.needsReview) {
      review = true;
      reasons.push(`${it.id}: ${v.data.summary}`);
    }
    const existing = Array.isArray(it.print_files) ? it.print_files : [];
    if (existing.length > 0) continue;
    const placement: Placement = v.data.value.mode === "designer" ? v.data.value.placement : config && config.mode === "fields" ? config.placement : "front";
    const png = await renderPrintFile(v.data.value, config && config.mode === "fields" ? { ink: config.ink, font: config.font } : {});
    const url = await uploadObject(`orders/${order.order_number}/${it.id}-${placement}.png`, png, "image/png");
    await sb.from("order_items").update({ print_files: [{ type: placement, url }] }).eq("id", it.id);
    log.info("FULFILLMENT", "personalization print file rendered", { orderId, itemId: it.id, placement });
  }

  const approved = Boolean((order.metadata as { personalization_approved?: boolean } | null)?.personalization_approved);
  if (review && !approved) return { status: "NEEDS_REVIEW", reason: reasons.join(" | ").slice(0, 900) };
  return { status: "READY" };
}

/** Personalized print files replace the brand file for the same placement; other placements are kept. */
export function mergeFiles<T extends { type: string; url: string }>(base: T[], personalized: unknown): T[] {
  const extra = (Array.isArray(personalized) ? personalized : []).filter((f): f is T => !!f && typeof f === "object" && typeof (f as T).url === "string" && typeof (f as T).type === "string");
  if (!extra.length) return base;
  const types = new Set(extra.map((f) => f.type));
  return [...base.filter((f) => !types.has(f.type)), ...extra];
}

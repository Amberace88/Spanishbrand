import "server-only";
import { cache } from "react";
import { dbOrNull } from "@/lib/supabase/admin";
import { lifetimePoints } from "@/lib/club";
import { getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { merchandiseUnique } from "@/lib/catalog/merch";

export type LedgerRaw = { id: string; points: number; reason: string; created_at: string; orders: { order_number: number | string } | { order_number: number | string }[] | null };

/** Points ledger of a member (newest first) + lifetime points. Shared by the shell (tier) and the club page. */
export const getClubLedger = cache(async (customerId: string | null, balance: number) => {
  const sb = dbOrNull();
  if (!customerId || !sb) return { rows: [] as LedgerRaw[], lifetime: Math.max(0, balance) };
  const { data } = await sb
    .from("points_ledger")
    .select("id, points, reason, created_at, orders(order_number)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows = (data ?? []) as unknown as LedgerRaw[];
  return { rows, lifetime: lifetimePoints(rows, balance) };
});

export type OrderListRaw = {
  id: string;
  order_number: number;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  order_items: { product_id: string; quantity: number; image: string | null }[] | null;
};

/** The customer's placed orders (unpaid checkouts excluded), newest first. */
export const getCustomerOrders = cache(async (customerId: string | null) => {
  const sb = dbOrNull();
  if (!customerId || !sb) return [] as OrderListRaw[];
  const { data } = await sb
    .from("orders")
    .select("id, order_number, status, total, currency, created_at, paid_at, order_items(product_id, quantity, image)")
    .eq("customer_id", customerId)
    .neq("status", "PENDING_PAYMENT")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as OrderListRaw[];
});

/** Status events of one order (for step dates). Caller has already verified ownership. */
export async function getOrderEvents(orderId: string) {
  const sb = dbOrNull();
  if (!sb) return [];
  const { data } = await sb.from("order_events").select("to_status, created_at").eq("order_id", orderId).not("to_status", "is", null).order("created_at");
  return (data ?? []) as { to_status: string | null; created_at: string }[];
}

/**
 * "Elegido para ti": curated catalogue (merch engine) without what the customer already bought,
 * nudged towards the collections they bought from.
 */
export async function getRecommendations(boughtProductIds: string[], limit = 10): Promise<PublicProduct[]> {
  const all = await getPublishedProducts({ limit: 5000 }).catch(() => [] as PublicProduct[]);
  if (!all.length) return [];
  const bought = new Set(boughtProductIds);
  const likedCollections = new Set(all.filter((p) => bought.has(p.id) && p.collection).map((p) => p.collection!.slug));
  const pool = all.filter((p) => !bought.has(p.id) && p.images.length > 0);
  return merchandiseUnique(pool, limit, likedCollections.size ? { boost: (p) => (p.collection && likedCollections.has(p.collection.slug) ? 1.5 : 0) } : undefined);
}

import "server-only";
import { db } from "@/lib/supabase/admin";

export async function addOrderEvent(
  orderId: string,
  type: string,
  opts: { from?: string | null; to?: string | null; message?: string; data?: unknown; actor?: string } = {},
) {
  await db()
    .from("order_events")
    .insert({
      order_id: orderId,
      type,
      from_status: opts.from ?? null,
      to_status: opts.to ?? null,
      message: opts.message ?? null,
      data: (opts.data ?? {}) as object,
      actor: opts.actor ?? "system",
    });
}

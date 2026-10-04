/**
 * Customer account panel — pure helpers (no server-only imports so they are unit-testable).
 * Order statuses come from the `orders.status` check constraint (core schema).
 */

/** Customer-facing journey of a paid order. Internal provider states collapse into these four steps. */
export const ORDER_STEPS = ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];

const STEP_RANK: Record<string, number> = {
  PAID: 0,
  PROCESSING: 0,
  SENT_TO_PROVIDER: 1,
  PROVIDER_ACCEPTED: 1,
  IN_PRODUCTION: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

/** Index of the current step (0..3), or -1 when the order left the happy path (cancelled, refunded, review…). */
export function orderStepIndex(status: string): number {
  return STEP_RANK[status] ?? -1;
}

export type StatusTone = "done" | "progress" | "attention" | "closed";

/** Badge tone for an order status. */
export function orderStatusTone(status: string): StatusTone {
  if (status === "DELIVERED") return "done";
  if (status in STEP_RANK) return "progress";
  if (status === "CANCELLED" || status === "REFUNDED") return "closed";
  return "attention"; // FAILED, FULFILLMENT_FAILED, REQUIRES_REVIEW, PENDING_PAYMENT
}

/** Statuses from which the customer can open a return / issue request (mirrors the order detail rule). */
const RETURNABLE = new Set(["SENT_TO_PROVIDER", "PROVIDER_ACCEPTED", "IN_PRODUCTION", "SHIPPED", "DELIVERED"]);
export const canRequestReturn = (status: string) => RETURNABLE.has(status);

/**
 * When each customer step was reached, from `order_events.to_status` (earliest wins) with the
 * order's own timestamps as fallbacks for the first step.
 */
export function orderStepDates(
  events: { to_status: string | null; created_at: string }[] | null | undefined,
  order: { created_at: string; paid_at?: string | null },
): Partial<Record<OrderStep, string>> {
  const out: Partial<Record<OrderStep, string>> = {};
  const sorted = [...(events ?? [])].filter((e) => e.to_status).sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const e of sorted) {
    const rank = STEP_RANK[e.to_status!];
    if (rank === undefined) continue;
    const step = ORDER_STEPS[rank];
    if (!out[step]) out[step] = e.created_at;
  }
  if (!out.PAID) out.PAID = order.paid_at ?? order.created_at;
  return out;
}

/** First name for greetings: stored name, else the e-mail local part ("ana.garcia" → "Ana"). */
export function greetingName(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (n) return n.split(/\s+/)[0];
  const local = (email ?? "").split("@")[0] ?? "";
  const first = local.split(/[._\-+0-9]+/).find(Boolean) ?? local;
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "";
}

/** Two-letter monogram for the avatar. */
export function initials(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  return (email ?? "?").slice(0, 2).toUpperCase();
}

/** Inline save state of the profile form (server action ⇄ useActionState). */
export type ProfileState = { status: "idle" | "ok" | "error"; at: number };

/** Only items bought without personalisation can be re-added to the cart as-is. */
export function isReorderable(item: { personalization?: unknown }): boolean {
  const p = item.personalization;
  return !p || (typeof p === "object" && Object.keys(p as object).length === 0);
}

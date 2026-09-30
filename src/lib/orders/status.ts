/**
 * Order status aggregation & retry policy (pure).
 */
import type { NormalizedOrderStatus } from "@/lib/fulfillment/types";

export type FulfillmentOrderStatus =
  | "PENDING"
  | "SUBMITTING"
  | "SENT_TO_PROVIDER"
  | "PROVIDER_ACCEPTED"
  | "IN_PRODUCTION"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "DELIVERED"
  | "FAILED"
  | "RETRY_SCHEDULED"
  | "REQUIRES_REVIEW"
  | "CANCELLED";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "SENT_TO_PROVIDER"
  | "PROVIDER_ACCEPTED"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "DELIVERED"
  | "FAILED"
  | "FULFILLMENT_FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "REQUIRES_REVIEW";

/** Provider normalized status → our fulfillment group status. */
export function fulfillmentStatusFromProvider(s: NormalizedOrderStatus): FulfillmentOrderStatus {
  switch (s) {
    case "DRAFT":
    case "PENDING":
      return "SENT_TO_PROVIDER";
    case "ACCEPTED":
      return "PROVIDER_ACCEPTED";
    case "IN_PRODUCTION":
      return "IN_PRODUCTION";
    case "ON_HOLD":
      return "REQUIRES_REVIEW";
    case "PARTIALLY_SHIPPED":
      return "PARTIALLY_SHIPPED";
    case "SHIPPED":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "FAILED":
    case "RETURNED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
  }
}

const RANK: Record<FulfillmentOrderStatus, number> = {
  PENDING: 1,
  SUBMITTING: 2,
  RETRY_SCHEDULED: 2,
  SENT_TO_PROVIDER: 3,
  PROVIDER_ACCEPTED: 4,
  IN_PRODUCTION: 5,
  PARTIALLY_SHIPPED: 6,
  SHIPPED: 7,
  DELIVERED: 8,
  FAILED: 0,
  REQUIRES_REVIEW: 0,
  CANCELLED: 0,
};

/** Never move a group backwards (webhooks can arrive out of order). */
export function isForwardTransition(from: FulfillmentOrderStatus, to: FulfillmentOrderStatus) {
  if (to === "FAILED" || to === "REQUIRES_REVIEW" || to === "CANCELLED") return from !== "DELIVERED";
  if (from === "FAILED" || from === "REQUIRES_REVIEW" || from === "RETRY_SCHEDULED") return true;
  return RANK[to] >= RANK[from];
}

export interface AggregateResult {
  status: OrderStatus;
  fulfillmentStatus:
    | "UNFULFILLED"
    | "WAITING"
    | "PROCESSING"
    | "SENT_TO_PROVIDER"
    | "PROVIDER_ACCEPTED"
    | "IN_PRODUCTION"
    | "PARTIALLY_SHIPPED"
    | "SHIPPED"
    | "DELIVERED"
    | "FAILED"
    | "CANCELLED"
    | "REQUIRES_REVIEW";
}

/** Order-level status from its fulfillment groups (supports multi-provider orders). */
export function aggregateOrderStatus(groups: FulfillmentOrderStatus[]): AggregateResult {
  if (groups.length === 0) return { status: "PAID", fulfillmentStatus: "UNFULFILLED" };
  const all = (s: FulfillmentOrderStatus[]) => groups.every((g) => s.includes(g));
  const any = (s: FulfillmentOrderStatus[]) => groups.some((g) => s.includes(g));

  if (all(["CANCELLED"])) return { status: "CANCELLED", fulfillmentStatus: "CANCELLED" };
  if (any(["REQUIRES_REVIEW"])) return { status: "REQUIRES_REVIEW", fulfillmentStatus: "REQUIRES_REVIEW" };
  if (any(["FAILED"])) return { status: "FULFILLMENT_FAILED", fulfillmentStatus: "FAILED" };
  if (all(["DELIVERED"])) return { status: "DELIVERED", fulfillmentStatus: "DELIVERED" };
  if (all(["SHIPPED", "DELIVERED"])) return { status: "SHIPPED", fulfillmentStatus: "SHIPPED" };
  if (any(["SHIPPED", "DELIVERED", "PARTIALLY_SHIPPED"])) return { status: "SHIPPED", fulfillmentStatus: "PARTIALLY_SHIPPED" };
  if (any(["IN_PRODUCTION"])) return { status: "IN_PRODUCTION", fulfillmentStatus: "IN_PRODUCTION" };
  if (all(["PROVIDER_ACCEPTED", "IN_PRODUCTION"])) return { status: "PROVIDER_ACCEPTED", fulfillmentStatus: "PROVIDER_ACCEPTED" };
  if (all(["SENT_TO_PROVIDER", "PROVIDER_ACCEPTED"])) return { status: "SENT_TO_PROVIDER", fulfillmentStatus: "SENT_TO_PROVIDER" };
  if (any(["RETRY_SCHEDULED", "SUBMITTING", "PENDING"])) return { status: "PROCESSING", fulfillmentStatus: "PROCESSING" };
  return { status: "PROCESSING", fulfillmentStatus: "PROCESSING" };
}

/** Exponential backoff: attempt 1 → 1 min, 2 → 5 min, 3 → 25 min. Max 3 automatic attempts. */
export const MAX_AUTO_ATTEMPTS = 3;
export function nextRetryDelayMs(attempt: number): number | null {
  if (attempt >= MAX_AUTO_ATTEMPTS) return null;
  return 60_000 * Math.pow(5, Math.max(0, attempt - 1));
}

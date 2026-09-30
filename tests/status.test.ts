import { describe, expect, it } from "vitest";
import { aggregateOrderStatus, fulfillmentStatusFromProvider, isForwardTransition, nextRetryDelayMs, MAX_AUTO_ATTEMPTS } from "@/lib/orders/status";
import { classifyError, ProviderError } from "@/lib/fulfillment/errors";

describe("order status aggregation", () => {
  it("single group lifecycle", () => {
    expect(aggregateOrderStatus(["SENT_TO_PROVIDER"]).status).toBe("SENT_TO_PROVIDER");
    expect(aggregateOrderStatus(["IN_PRODUCTION"]).status).toBe("IN_PRODUCTION");
    expect(aggregateOrderStatus(["SHIPPED"]).status).toBe("SHIPPED");
    expect(aggregateOrderStatus(["DELIVERED"]).status).toBe("DELIVERED");
  });
  it("multi-provider partial shipment", () => {
    expect(aggregateOrderStatus(["SHIPPED", "IN_PRODUCTION"])).toEqual({ status: "SHIPPED", fulfillmentStatus: "PARTIALLY_SHIPPED" });
  });
  it("any review or failure surfaces", () => {
    expect(aggregateOrderStatus(["SHIPPED", "REQUIRES_REVIEW"]).status).toBe("REQUIRES_REVIEW");
    expect(aggregateOrderStatus(["SHIPPED", "FAILED"]).status).toBe("FULFILLMENT_FAILED");
  });
  it("never moves backwards on out-of-order webhooks", () => {
    expect(isForwardTransition("SHIPPED", "IN_PRODUCTION")).toBe(false);
    expect(isForwardTransition("IN_PRODUCTION", "SHIPPED")).toBe(true);
    expect(isForwardTransition("DELIVERED", "FAILED")).toBe(false);
  });
  it("maps provider statuses", () => {
    expect(fulfillmentStatusFromProvider("ON_HOLD")).toBe("REQUIRES_REVIEW");
    expect(fulfillmentStatusFromProvider("ACCEPTED")).toBe("PROVIDER_ACCEPTED");
  });
});

describe("retry policy", () => {
  it("exponential backoff and bounded attempts", () => {
    expect(nextRetryDelayMs(1)).toBe(60_000);
    expect(nextRetryDelayMs(2)).toBe(300_000);
    expect(nextRetryDelayMs(MAX_AUTO_ATTEMPTS)).toBeNull();
  });
  it("classifies temporary vs permanent errors", () => {
    expect(classifyError(null, "Network error: ECONNRESET")).toBe("TRANSIENT");
    expect(classifyError(503, "Service Unavailable")).toBe("TRANSIENT");
    expect(classifyError(429, "Too many requests")).toBe("TRANSIENT");
    expect(classifyError(400, "Invalid address: zip")).toBe("PERMANENT");
    expect(classifyError(500, "Variant is discontinued")).toBe("PERMANENT");
    expect(classifyError(400, "Missing print file")).toBe("PERMANENT");
    expect(new ProviderError({ provider: "printful", endpoint: "POST /orders", status: 502, message: "Bad gateway" }).permanent).toBe(false);
  });
});

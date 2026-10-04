import { describe, expect, it } from "vitest";
import { canRequestReturn, greetingName, initials, isReorderable, orderStatusTone, orderStepDates, orderStepIndex } from "@/lib/account-panel";

describe("account panel helpers", () => {
  it("maps internal statuses onto the four customer steps", () => {
    expect(orderStepIndex("PAID")).toBe(0);
    expect(orderStepIndex("PROCESSING")).toBe(0);
    expect(orderStepIndex("PROVIDER_ACCEPTED")).toBe(1);
    expect(orderStepIndex("SHIPPED")).toBe(2);
    expect(orderStepIndex("DELIVERED")).toBe(3);
    expect(orderStepIndex("CANCELLED")).toBe(-1);
    expect(orderStepIndex("REQUIRES_REVIEW")).toBe(-1);
  });

  it("assigns badge tones", () => {
    expect(orderStatusTone("DELIVERED")).toBe("done");
    expect(orderStatusTone("IN_PRODUCTION")).toBe("progress");
    expect(orderStatusTone("REFUNDED")).toBe("closed");
    expect(orderStatusTone("FULFILLMENT_FAILED")).toBe("attention");
  });

  it("allows returns only once the order is with the provider", () => {
    expect(canRequestReturn("PAID")).toBe(false);
    expect(canRequestReturn("SHIPPED")).toBe(true);
    expect(canRequestReturn("CANCELLED")).toBe(false);
  });

  it("dates each step from the earliest matching event", () => {
    const d = orderStepDates(
      [
        { to_status: "SHIPPED", created_at: "2026-09-05T10:00:00Z" },
        { to_status: "SENT_TO_PROVIDER", created_at: "2026-09-02T10:00:00Z" },
        { to_status: "IN_PRODUCTION", created_at: "2026-09-03T10:00:00Z" },
        { to_status: null, created_at: "2026-09-01T10:00:00Z" },
      ],
      { created_at: "2026-09-01T09:00:00Z", paid_at: "2026-09-01T09:01:00Z" },
    );
    expect(d.PAID).toBe("2026-09-01T09:01:00Z");
    expect(d.IN_PRODUCTION).toBe("2026-09-02T10:00:00Z");
    expect(d.SHIPPED).toBe("2026-09-05T10:00:00Z");
    expect(d.DELIVERED).toBeUndefined();
  });

  it("builds greeting names and initials", () => {
    expect(greetingName("Ana García", "x@y.z")).toBe("Ana");
    expect(greetingName(null, "bekksell@gmail.com")).toBe("Bekksell");
    expect(greetingName("", "jose.luis99@mail.es")).toBe("Jose");
    expect(initials("Ana María García", null)).toBe("AG");
    expect(initials(null, "bekksell@gmail.com")).toBe("BE");
  });

  it("only re-orders non-personalised items", () => {
    expect(isReorderable({ personalization: {} })).toBe(true);
    expect(isReorderable({})).toBe(true);
    expect(isReorderable({ personalization: { name: "LUCÍA" } })).toBe(false);
  });
});

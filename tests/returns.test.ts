import { describe, expect, it } from "vitest";
import { eligibility, isPersonalized, REASONS } from "@/lib/returns/rules";

const now = new Date("2026-10-20T12:00:00Z");

describe("returns eligibility (TRLGDCU)", () => {
  it("withdrawal open within 14 days of delivery, closed after", () => {
    expect(eligibility({ personalized: false, shippedAt: "2026-10-01", deliveredAt: "2026-10-07T10:00:00Z", now }).withdrawal).toBe(true);
    const late = eligibility({ personalized: false, shippedAt: "2026-09-20", deliveredAt: "2026-10-05T10:00:00Z", now });
    expect(late.withdrawal).toBe(false);
    expect(late.withdrawalReason).toBe("EXPIRED");
    expect(late.issue).toBe(true); // 3-year guarantee still applies
  });
  it("personalised items never have withdrawal, but issues are allowed", () => {
    const e = eligibility({ personalized: true, shippedAt: "2026-10-10", deliveredAt: "2026-10-15", now });
    expect(e.withdrawal).toBe(false);
    expect(e.withdrawalReason).toBe("PERSONALIZED");
    expect(e.issue).toBe(true);
  });
  it("shipped but no delivery date yet → window still open", () => {
    expect(eligibility({ personalized: false, shippedAt: "2026-10-18", deliveredAt: null, now }).withdrawal).toBe(true);
  });
  it("not shipped → nothing to return (cancel instead)", () => {
    const e = eligibility({ personalized: false, shippedAt: null, deliveredAt: null, now });
    expect(e.withdrawal || e.issue).toBe(false);
  });
  it("provider claim deadline is 30 days after delivery", () => {
    expect(eligibility({ personalized: false, shippedAt: "2026-10-01", deliveredAt: "2026-10-05T00:00:00Z", now }).providerDeadline).toBe("2026-11-04T00:00:00.000Z");
  });
  it("personalization detection matches the cart rule", () => {
    expect(isPersonalized({})).toBe(false);
    expect(isPersonalized(null)).toBe(false);
    expect(isPersonalized({ mode: "fields", values: { name: "ANA" } })).toBe(true);
  });
  it("issue reasons require photos, withdrawal reasons don't", () => {
    for (const r of Object.values(REASONS)) expect(r.type === "ISSUE" ? r.photos.length > 0 : r.photos.length === 0).toBe(true);
  });
});

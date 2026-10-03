import { describe, expect, it } from "vitest";
import { REDEEM_POINTS, REDEEM_VALUE, lifetimePoints, memberPattern, redeemProgress, tierFor, tierProgress } from "@/lib/club";

describe("club tiers", () => {
  it("maps lifetime points to tiers", () => {
    expect(tierFor(0).id).toBe("SOCIO");
    expect(tierFor(299).id).toBe("SOCIO");
    expect(tierFor(300).id).toBe("ORO");
    expect(tierFor(5000).id).toBe("HONOR");
  });
  it("reports progress to the next tier", () => {
    const p = tierProgress(150);
    expect(p.next?.id).toBe("ORO");
    expect(p.toNext).toBe(150);
    expect(p.progress).toBeCloseTo(0.5);
    expect(tierProgress(1200)).toMatchObject({ next: null, toNext: 0, progress: 1 });
  });
});

describe("redeem progress", () => {
  it("counts points still needed", () => {
    expect(redeemProgress(50)).toMatchObject({ canRedeem: false, rewards: 0, toNext: REDEEM_POINTS - 50 });
  });
  it("counts available rewards and their value", () => {
    expect(redeemProgress(240)).toMatchObject({ canRedeem: true, rewards: 2, value: 2 * REDEEM_VALUE, progress: 1 });
  });
});

describe("lifetime points", () => {
  it("ignores redemptions so redeeming never lowers the tier", () => {
    const rows = [{ points: 50, reason: "SIGNUP" }, { points: 451, reason: "ORDER" }, { points: -100, reason: "REDEEM" }];
    expect(lifetimePoints(rows, 401)).toBe(501);
  });
  it("falls back to the balance without ledger rows", () => {
    expect(lifetimePoints([], 80)).toBe(80);
  });
});

describe("member pattern", () => {
  it("is deterministic and square", () => {
    const a = memberPattern("RYG-000001");
    expect(a).toEqual(memberPattern("RYG-000001"));
    expect(a).toHaveLength(13);
    expect(a[0][0]).toBe(true); // finder corner
  });
});

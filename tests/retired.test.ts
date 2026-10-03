import { describe, expect, it } from "vitest";
import { ACTIVE_DESIGNS, DESIGNS, designBySlug, designsFor } from "@/lib/catalog/designs";
import { auditDesign, isRetiredDesign, replacementFor, RETIRED_DESIGNS } from "@/lib/catalog/retired";
import { buildPlan, EXTRAS } from "@/lib/fulfillment/catalog-builder";
import { LEON_EXTRAS } from "@/lib/catalog/leon";
import { AUDIENCE_EXTRAS } from "@/lib/catalog/audience";
import { COLLECTION_THEMES, TOPIC_THEMES } from "@/lib/catalog/themes";
import { isLive } from "@/lib/products/queries";

describe("catalog curation (retired designs)", () => {
  it("the explicit list matches the audit rule", () => {
    const byRule = DESIGNS.filter((d) => auditDesign(d).verdict === "RETIRE").map((d) => d.slug).sort();
    expect([...RETIRED_DESIGNS].sort()).toEqual(byRule);
  });

  it("every retired slug is a real design, flagged, and kept in code for old orders", () => {
    for (const s of RETIRED_DESIGNS) {
      const d = designBySlug(s);
      expect(d, s).toBeTruthy();
      expect(d!.retired).toBe(true);
    }
    expect(ACTIVE_DESIGNS.some((d) => d.retired)).toBe(false);
    expect(ACTIVE_DESIGNS.length + RETIRED_DESIGNS.size).toBe(DESIGNS.length);
  });

  it("buildPlan creates no job for a retired design", () => {
    const plan = buildPlan().filter((p) => p.key.startsWith("p:"));
    expect(plan.length).toBeGreaterThan(500);
    for (const p of plan) expect(isRetiredDesign(p.key.split(":")[1]), p.key).toBe(false);
    // the new strong lines are planned
    expect(plan.some((p) => p.key === "p:ciudad-madrid-cartel:tee")).toBe(true);
    expect(plan.some((p) => p.key === "p:oficio-enfermeria-cartel:tee")).toBe(true);
    expect(plan.some((p) => p.key === "p:oficio-enfermeria-arte:tee")).toBe(true);
  });

  it("extra-product lists only name active designs", () => {
    for (const lists of [EXTRAS, LEON_EXTRAS, AUDIENCE_EXTRAS])
      for (const slugs of Object.values(lists))
        for (const s of slugs ?? []) {
          expect(designBySlug(s), s).toBeTruthy();
          expect(isRetiredDesign(s), s).toBe(false);
        }
  });

  it("replacements point at active designs", () => {
    for (const s of RETIRED_DESIGNS) {
      const r = replacementFor(s);
      if (!r) continue;
      expect(designBySlug(r), `${s} → ${r}`).toBeTruthy();
      expect(isRetiredDesign(r), `${s} → ${r}`).toBe(false);
    }
    expect(replacementFor("oficio-enfermeria-minimal")).toBe("oficio-enfermeria-arte");
    expect(replacementFor("ciudad-madrid")).toBe("ciudad-madrid-cartel");
    expect(replacementFor("futbol-sevilla-verde-bufanda")).toBe("fp-ciudad-sevilla-verdiblanco");
  });

  it("the listing filter hides products of retired designs", () => {
    expect(isLive({ design: "oficio-enfermeria" })).toBe(false);
    expect(isLive({ design: "ciudad-madrid" })).toBe(false);
    expect(isLive({ design: "oficio-enfermeria-arte" })).toBe(true);
    expect(isLive({ design: null })).toBe(true);
  });

  it("navigation only links collections that still have active designs", () => {
    for (const href of [...COLLECTION_THEMES.map((t) => t.href), ...TOPIC_THEMES.map((t) => t.href)]) {
      const m = href.match(/^\/collections\/([a-z-]+)$/);
      if (!m) continue;
      const n = m[1] === "leon" ? ACTIVE_DESIGNS.filter((d) => d.tags?.includes("leon")).length : designsFor(m[1]).length;
      expect(n, href).toBeGreaterThan(0);
    }
  });
});

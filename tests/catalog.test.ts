import { describe, expect, it } from "vitest";
import { DESIGNS, designBySlug } from "@/lib/catalog/designs";
import { BLUEPRINTS, normSize, retail } from "@/lib/catalog/blueprints";
import { validatePersonalization } from "@/lib/personalization/validate";
import manifest from "@/lib/catalog/art-manifest.json";

describe("design library", () => {
  it("has unique slugs, valid art and fitting layers", () => {
    const slugs = new Set<string>();
    for (const d of DESIGNS) {
      expect(slugs.has(d.slug)).toBe(false);
      slugs.add(d.slug);
      expect(d.layers.length).toBeGreaterThan(0);
      for (const l of d.layers) {
        expect(l.w).toBeLessThanOrEqual(0.96);
        if (l.type === "image") expect((manifest as Record<string, number>)[l.path.slice(4, -4)]).toBeTruthy();
      }
      for (const bp of d.products) expect(BLUEPRINTS[bp]).toBeTruthy();
    }
    expect(DESIGNS.filter((d) => d.collection === "ciudades").length).toBeGreaterThanOrEqual(30);
  });

  it("city coordinates never show 60 minutes", () => {
    for (const d of DESIGNS.filter((x) => x.collection === "ciudades")) {
      const coords = d.layers.filter((l) => l.type === "text").map((l) => (l as { text: string }).text).join(" ");
      expect(coords).not.toMatch(/°60′/);
    }
  });

  it("designer accepts house art layers without manual review", () => {
    const d = designBySlug("sol-de-espana")!;
    const r = validatePersonalization({ mode: "designer", placements: ["front"], extraPrice: 5 }, { mode: "designer", placement: "front", layers: d.layers }, { publicUrlFor: (p) => `https://x/${p}`, artBase: "https://shop.test" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.needsReview).toBe(false);
      const img = r.data.value.mode === "designer" ? r.data.value.layers.find((l) => l.type === "image") : null;
      expect(img && img.type === "image" ? img.url : "").toBe("https://shop.test/catalog/art/sun-gold.png");
    }
    const bad = validatePersonalization({ mode: "designer", placements: ["front"], extraPrice: 5 }, { mode: "designer", placement: "front", layers: [{ type: "image", path: "art/../../etc.png", aspect: 1 }] }, { publicUrlFor: (p) => p });
    expect(bad.ok).toBe(false);
    const nobg = validatePersonalization({ mode: "designer", placements: ["front"], extraPrice: 5 }, { mode: "designer", placement: "front", layers: [{ type: "image", path: "uploads/123e4567-e89b-12d3-a456-426614174000-nobg.png", aspect: 1 }] }, { publicUrlFor: (p) => p });
    expect(nobg.ok).toBe(true);
  });

  it("normalises sizes and retail prices", () => {
    expect(normSize("XXL")).toBe("2XL");
    expect(normSize("11oz")).toBe("11 oz");
    expect(normSize('4"x4"')).toBe("4″×4″");
    expect(retail(31.2)).toBe(31.95);
    expect(retail(30)).toBe(29.95);
  });
});

describe("printful required options", () => {
  it("fills stitch_color from the 400 message", async () => {
    const { fillMissingOption } = await import("@/lib/fulfillment/printful/orders");
    const body = { items: [{ options: undefined }] } as never as Parameters<typeof fillMissingOption>[0];
    expect(fillMissingOption(body, "Item 0: Item 'stitch_color' option missing or has an invalid value! Allowed values: white, black, clear")).toBe(true);
    expect(body.items[0].options).toEqual([{ id: "stitch_color", value: "black" }]);
    expect(fillMissingOption(body, "Item 0: Item 'stitch_color' option missing or has an invalid value! Allowed values: white, black, clear")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import manifest from "@/lib/catalog/art-manifest.json";
import { DESIGNS } from "@/lib/catalog/designs";
import { SAB_CATS, SAYINGS, sabiduriaDesigns } from "@/lib/catalog/sabiduria";

const sab = sabiduriaDesigns();

describe("Refranero y sabiduría series", () => {
  it("has ~60 sayings across every category", () => {
    expect(SAYINGS.length).toBeGreaterThanOrEqual(55);
    for (const c of SAB_CATS) expect(SAYINGS.some((s) => s.cat === c.key)).toBe(true);
    expect(new Set(SAYINGS.map((s) => s.key)).size).toBe(SAYINGS.length);
  });

  it("slugs are unique across the whole library", () => {
    const slugs = DESIGNS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const d of sab) expect(slugs).toContain(d.slug);
  });

  it("every design stays editable in the designer (≤ 8 layers, known art, sane geometry)", () => {
    for (const d of sab) {
      expect(d.layers.length, d.slug).toBeLessThanOrEqual(8);
      for (const l of d.layers) {
        if (l.type === "image") expect((manifest as Record<string, number>)[l.path.slice(4, -4)], `${d.slug} ${l.path}`).toBeGreaterThan(0);
        expect(l.x).toBeGreaterThanOrEqual(0);
        expect(l.x).toBeLessThanOrEqual(1);
        expect(l.y, `${d.slug} y`).toBeGreaterThan(0);
        expect(l.y, `${d.slug} y`).toBeLessThan(1);
        expect(l.w, `${d.slug} w`).toBeLessThanOrEqual(0.96);
      }
    }
  });

  it("main lines are set big (no tiny text)", () => {
    for (const d of sab) {
      // the composition spans most of the print width, and its main line is never a caption
      expect(Math.max(...d.layers.map((l) => l.w)), d.slug).toBeGreaterThan(0.6);
      expect(Math.max(...d.layers.filter((l) => l.type === "text").map((l) => l.w)), d.slug).toBeGreaterThan(0.3);
    }
  });

  it("maps to products and carries the builder tag", () => {
    for (const d of sab) {
      expect(d.products.length, d.slug).toBeGreaterThan(0);
      expect(d.tags).toContain("sabiduria");
      expect(d.collection).toBe("sabiduria");
      if (d.tone === "dark") for (const p of d.products) expect(["apron", "tote", "poster", "pillow", "framed"]).not.toContain(p);
    }
    const kids = sab.filter((d) => d.tags?.includes("sab-peques"));
    for (const d of kids) expect(d.products.every((p) => ["kids", "kidshoodie", "toddler", "baby"].includes(p))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { composePrintFiles, placementBoxes } from "@/lib/personalization/compose";
import { validatePersonalization, extraPriceFor } from "@/lib/personalization/validate";
import { KINDS, THREADS, EMB_FONTS, aspectOf, kindFromProduct } from "@/lib/personalization/kinds";
import { layoutText } from "@/lib/personalization/artwork";
import type { Layer, PersoConfig } from "@/lib/personalization/types";

const url = (p: string) => `https://example.supabase.co/storage/v1/object/public/print-files/${p}`;
const cfg = (kind: string, extra: Partial<Extract<PersoConfig, { mode: "designer" }>> = {}): PersoConfig => ({ mode: "designer", placements: KINDS[kind].placements, extraPrice: 5, maxLayers: 8, kind, aspect: KINDS[kind].aspect, ...extra });
const emb = (): PersoConfig => cfg("cap", { maxLayers: 2, embroidery: { threads: THREADS.map((t) => t.hex), maxColors: 3, fonts: EMB_FONTS } });

const pro: Layer[] = [
  { id: "a", type: "text", text: "FAMILIA GARCÍA", font: "varsity", color: "#c8102e", x: 0.5, y: 0.25, w: 0.86, rotation: 0, arc: 120, stroke: { color: "#ffffff", width: 0.06 } },
  { id: "b", type: "text", text: "desde\n1985", font: "elegant", color: "#e0b84a", x: 0.5, y: 0.6, w: 0.5, rotation: 0, lineHeight: 0.95, shadow: { color: "#000000", x: 0.04, y: 0.05, blur: 0.04 } },
  { id: "c", type: "text", text: "EST. ALICANTE", font: "mono", color: "#14213d", x: 0.5, y: 0.86, w: 0.6, rotation: 0, spacing: 0.2 },
];

describe("designer catalogue: print composition per kind", () => {
  it("every kind has a sane print area inside its silhouette", () => {
    for (const k of Object.values(KINDS)) {
      expect(k.zone.left + k.zone.width).toBeLessThanOrEqual(100);
      expect(k.zone.top + k.zone.width * k.aspect).toBeLessThanOrEqual(100);
      expect(k.placements[0]).toBe("front");
    }
  });

  it("maps products to kinds from catalog tags, falls back to product type", () => {
    expect(kindFromProduct({ tags: ["blank", "mug", "tu-diseno"], productType: "MUG" })).toBe("mug");
    expect(kindFromProduct({ tags: [], productType: "WOMENS_TSHIRT" })).toBe("womtee");
    expect(kindFromProduct({ tags: [], productType: "TSHIRT" })).toBe("tee");
    expect(aspectOf(null)).toBeCloseTo(4 / 3);
    expect(aspectOf({ kind: "flag" })).toBeCloseTo(0.6);
  });

  it("wrap layout repeats the face on both sides of a mug", () => {
    const boxes = placementBoxes("wrap", 0.8, { width: 2700, height: 1050 });
    expect(boxes).toHaveLength(2);
    expect(boxes[0].height / boxes[0].width).toBeCloseTo(0.8, 1);
    expect(boxes[1].left).toBeGreaterThan(1350);
  });

  it("renders pro text styles (arc, outline, shadow, lines, new fonts) and fills/pads to the provider canvas", async () => {
    const out = process.env.RENDER_OUT;
    const cases: [string, { width: number; height: number }, string | undefined][] = [
      ["tee", { width: 4500, height: 5100 }, undefined],
      ["mug", { width: 2700, height: 1050 }, "#f3ead7"],
      ["pillow", { width: 2400, height: 2400 }, "#14213d"],
      ["phonecase", { width: 900, height: 1850 }, "#0d0d0d"],
      ["poster", { width: 2400, height: 3200 }, "#f3ead7"],
    ];
    for (const [kind, canvas, bg] of cases) {
      const config = cfg(kind);
      const v = validatePersonalization(config, { mode: "designer", placement: "front", layers: pro, background: bg }, { publicUrlFor: url });
      expect(v.ok).toBe(true);
      if (!v.ok) continue;
      const files = await composePrintFiles(v.data.value, config, canvas);
      expect(files).toHaveLength(1);
      const meta = await sharp(files[0].png).metadata();
      expect([meta.width, meta.height]).toEqual([canvas.width, canvas.height]);
      if (out) writeFileSync(`${out}/compose-${kind}.png`, files[0].png);
    }
  }, 120_000);

  it("front + back in one design: two print files and the back surcharge", async () => {
    const config = cfg("tee", { backPrice: 7 });
    const v = validatePersonalization(config, { mode: "designer", placement: "front", layers: [pro[2]], back: [{ id: "n", type: "text", text: "GARCÍA", font: "sport", color: "#e0b84a", x: 0.5, y: 0.15, w: 0.7, rotation: 0 }] }, { publicUrlFor: url });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.data.summary).toContain("Frontal + espalda");
    const files = await composePrintFiles(v.data.value, config, { width: 1800, height: 2400 });
    expect(files.map((f) => f.placement)).toEqual(["front", "back"]);
    expect(extraPriceFor(config, true, v.data.value)).toBe(12);
    expect(extraPriceFor(config, true, { mode: "designer", layers: [] })).toBe(5);
  }, 60_000);

  it("embroidery: text only, thread colours, ≤ 3 colours, no outline", () => {
    const ok = validatePersonalization(emb(), { mode: "designer", placement: "front", layers: [{ id: "a", type: "text", text: "PEPE", font: "varsity", color: "#ffcc00", x: 0.5, y: 0.5, w: 0.7, rotation: 0 }] }, { publicUrlFor: url });
    expect(ok.ok).toBe(true);
    const badColour = validatePersonalization(emb(), { mode: "designer", placement: "front", layers: [{ id: "a", type: "text", text: "PEPE", font: "sport", color: "#123456", x: 0.5, y: 0.5, w: 0.7, rotation: 0 }] }, { publicUrlFor: url });
    expect(badColour).toEqual({ ok: false, error: "EMB_LIMITS" });
    const image = validatePersonalization(emb(), { mode: "designer", placement: "front", layers: [{ id: "i", type: "image", path: "art/lion-crowned.png", url: "x", aspect: 1, x: 0.5, y: 0.5, w: 0.5, rotation: 0 }] }, { publicUrlFor: url });
    expect(image).toEqual({ ok: false, error: "EMB_LIMITS" });
    const outline = validatePersonalization(emb(), { mode: "designer", placement: "front", layers: [{ id: "a", type: "text", text: "PEPE", font: "sport", color: "#ffcc00", x: 0.5, y: 0.5, w: 0.7, rotation: 0, stroke: { color: "#cc3333", width: 0.05 } }] }, { publicUrlFor: url });
    expect(outline).toEqual({ ok: false, error: "EMB_LIMITS" });
  });

  it("legacy straight text keeps its original box (no layout change for existing designs)", () => {
    const b = layoutText({ text: "Orgullo", font: "serif", w: 0.8 }, 2400);
    expect(b.size).toBeCloseTo((0.8 * 2400) / (7 * 0.78));
    expect(b.height).toBeCloseTo(b.size * 1.3);
    expect(b.glyphs).toBeUndefined();
  });
});

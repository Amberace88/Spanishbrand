/**
 * Print safety (lib/catalog/print-safety.ts): every library design must print clearly on every garment —
 * clear of side seams, collar, hood seam and kangaroo pocket, no text running into other elements, no
 * text or outlines too small to print. Regressions fail CI.
 * The slow pixel audit of the whole catalogue is tests/print-audit-render.test.tsx (manual, see docs/print-audit.md).
 */
import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { ACTIVE_DESIGNS, designBySlug, type BlueprintKey } from "@/lib/catalog/designs";
import { BLUEPRINTS } from "@/lib/catalog/blueprints";
import { auditDesign, designVersion, effectiveLayers, fitLayers, INK, inkBox, insideZone, margins, ZONE_FRONT, ZONE_HOOD_BACK, ZONE_HOOD_FRONT, zoneFor } from "@/lib/catalog/print-safety";
import { productsFor, REBUILD, rebuildCandidates } from "@/lib/fulfillment/catalog-builder";
import { signMockupArt } from "@/lib/catalog/mockup-art";
import type { Layer } from "@/lib/personalization/types";
import BASELINE from "@/lib/catalog/design-version-baseline.json";

const ART = path.join(process.cwd(), "public", "catalog", "art");

describe("art ink manifest", () => {
  it("matches the art files on disk (run node scripts/art-ink.mjs after any art script)", () => {
    const files = readdirSync(ART).filter((f) => f.endsWith(".png"));
    const stale: string[] = [];
    for (const f of files) {
      const name = f.replace(/\.png$/, "");
      const hash = createHash("sha256").update(readFileSync(path.join(ART, f))).digest("hex").slice(0, 12);
      if (INK[name]?.[4] !== hash) stale.push(name);
    }
    const orphans = Object.keys(INK).filter((n) => !files.includes(`${n}.png`));
    expect({ stale, orphans }).toEqual({ stale: [], orphans: [] });
  }, 60_000); // hashes every art PNG: slow when the whole suite runs in parallel
});

describe("every active design prints inside its safe zones", () => {
  it("has no audit flags on what is printed (edges, hood, pocket, overflow, thin text)", () => {
    const bad: string[] = [];
    for (const d of ACTIVE_DESIGNS) for (const f of auditDesign(d, productsFor(d), { effective: true })) bad.push(`${d.slug} ${f.side} ${f.bp}: ${f.code} ${f.detail}`);
    expect(bad).toEqual([]);
  });

  it("keeps the effective ink box of every print / all-over product inside the blueprint zone", () => {
    const bad: string[] = [];
    for (const d of ACTIVE_DESIGNS)
      for (const bp of productsFor(d)) {
        for (const side of ["front", "back"] as const) {
          const z = zoneFor(bp, side);
          if (!z || (side === "back" && !d.back?.length)) continue;
          const layers = effectiveLayers(d, bp, side);
          const b = inkBox(BLUEPRINTS[bp].renderMode === "cover" ? layers.slice(1) : layers);
          if (b && !insideZone(b, z)) bad.push(`${d.slug}:${bp}:${side} ${JSON.stringify(margins(b))}`);
        }
      }
    expect(bad).toEqual([]);
  });

  it("Fútbol PRO backs: numerals in one block, clear of the hood seam and side seams even before zones", () => {
    for (const slug of ["fp-ciudad-sevilla", "fp-ciudad-barcelona", "fp-ciudad-madrid-rojiblanco", "fp-ciudad-gijon", "fp-campeones-mundo-noche", "fp-campeones-espalda-dia"]) {
      const d = designBySlug(slug)!;
      const m = margins(inkBox(d.back!)!);
      expect(m.l, slug).toBeGreaterThanOrEqual(0.08 - 0.001);
      expect(m.r, slug).toBeGreaterThanOrEqual(0.08 - 0.001);
      expect(m.t, slug).toBeGreaterThanOrEqual(0.1 - 0.001);
      // upper-middle of the back, not a full-height print
      expect(1 - m.b, slug).toBeLessThan(0.86);
    }
  });
});

describe("fitLayers", () => {
  const txt = (x: number, y: number, w: number): Layer => ({ id: "t", type: "text", text: "HOLA", font: "sport", color: "#fff", x, y, w, rotation: 0 });
  const img = (x: number, y: number, w: number, aspect = 1): Layer => ({ id: "i", type: "image", path: "uploads/x.png", url: "/x.png", aspect, x, y, w, rotation: 0 });

  it("leaves compliant designs untouched (same array)", () => {
    const ls = [img(0.5, 0.3, 0.5)];
    expect(fitLayers(ls, ZONE_FRONT)).toBe(ls);
  });

  it("scales an edge-to-edge design into the zone, keeping the centre and the top", () => {
    const ls = [img(0.5, 0.5, 1, 4 / 3)]; // fills the whole canvas
    const out = fitLayers(ls, ZONE_FRONT);
    const m = margins(inkBox(out)!);
    expect(insideZone(inkBox(out)!, ZONE_FRONT)).toBe(true);
    expect(Math.abs(m.l - m.r)).toBeLessThan(0.002);
    expect(m.t).toBeCloseTo(ZONE_FRONT.t, 3);
  });

  it("moves hoodie fronts out of the pocket and hoodie backs under the hood seam", () => {
    const tall = [img(0.5, 0.5, 0.7, 1.6)];
    expect(1 - margins(inkBox(fitLayers(tall, ZONE_HOOD_FRONT))!).b).toBeLessThanOrEqual(1 - ZONE_HOOD_FRONT.b + 0.001);
    const high = [txt(0.5, 0.05, 0.6), img(0.5, 0.4, 0.6)];
    expect(margins(inkBox(fitLayers(high, ZONE_HOOD_BACK))!).t).toBeGreaterThanOrEqual(ZONE_HOOD_BACK.t - 0.001);
  });

  it("keeps the full-bleed pattern of all-over panels", () => {
    const ls = [img(0.5, 0.5, 1, 4 / 3), txt(0.5, 0.05, 0.98)];
    const out = fitLayers(ls, zoneFor("jersey"), 1);
    expect(out[0]).toBe(ls[0]);
    expect(out[1]).not.toEqual(ls[1]);
  });
});

describe("design versions and rebuilds", () => {
  const d = designBySlug("fp-ciudad-sevilla")!;

  it("ignores layer ids and changes with the layers", () => {
    const renamed = { ...d, layers: d.layers.map((l) => ({ ...l, id: "zz" })) };
    expect(designVersion(renamed, "tee")).toBe(designVersion(d, "tee"));
    const moved = { ...d, layers: d.layers.map((l) => ({ ...l, y: l.y + 0.01 })) };
    expect(designVersion(moved, "tee")).not.toBe(designVersion(d, "tee"));
  });

  it("re-queues the redrawn Fútbol PRO products and leaves untouched designs alone", () => {
    const B = BASELINE as Record<string, string>;
    const jobs = Object.keys(B).map((k) => ({ key: `p:${k}`, phase: "done", design_version: null, rebuild_tag: null }));
    const cands = rebuildCandidates(jobs);
    const keys = new Set(cands.map((c) => c.key));
    for (const k of ["p:fp-ciudad-sevilla:hoodie", "p:fp-ciudad-barcelona:tee", "p:fp-ciudad-madrid-rojiblanco:tee", "p:fp-ciudad-gijon:hoodie", "p:fp-camiseta-madrid:jersey"]) expect(keys.has(k), k).toBe(true);
    // forced (REBUILD list) first
    expect(cands[0].reason).toBe("forced");
    // a design whose print did not change on a garment that needs no fitting: not rebuilt
    const still = Object.keys(B).filter((k) => !keys.has(`p:${k}`));
    expect(still.length).toBeGreaterThan(100);
    for (const k of still.slice(0, 50)) {
      const [slug, bp] = k.split(":");
      expect(designVersion(designBySlug(slug)!, bp as BlueprintKey)).toBe(B[k]);
    }
  });

  it("stops once a product was rebuilt with the current version and tag", () => {
    const key = "p:fp-ciudad-sevilla:hoodie";
    expect(rebuildCandidates([{ key, phase: "done", design_version: designVersion(d, "hoodie"), rebuild_tag: REBUILD["fp-ciudad-sevilla"] }])).toEqual([]);
    expect(rebuildCandidates([{ key, phase: "done", design_version: "000000000000", rebuild_tag: REBUILD["fp-ciudad-sevilla"] }])).toEqual([{ key, reason: "changed" }]);
    expect(rebuildCandidates([{ key, phase: "test", design_version: null, rebuild_tag: null }])).toEqual([]);
  });

  it("keeps mockup-art URLs signed before the blueprint parameter valid", () => {
    const base = { d: "x", s: "front" as const, m: "print" as const, w: 10, h: 10, v: "abc" };
    expect(signMockupArt(base, "k")).toBe(createHmac("sha256", "k").update("x|front|print|10|10|abc").digest("hex").slice(0, 32));
    expect(signMockupArt({ ...base, b: "hoodie" }, "k")).not.toBe(signMockupArt(base, "k"));
  });
});

describe("pixel check with the real renderer (reported products)", () => {
  async function inkMargins(png: Buffer) {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return { l: x0 / info.width, t: y0 / info.height, r: 1 - (x1 + 1) / info.width, b: 1 - (y1 + 1) / info.height };
  }

  it("Sevilla hoodie, Barcelona tee, Madrid rojiblanco tee, Gijón hoodie: front and back inside the zones", { timeout: 120_000 }, async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 404 }));
    const { renderDesign } = await import("@/lib/catalog/render");
    const cases: [string, BlueprintKey][] = [["fp-ciudad-sevilla", "hoodie"], ["fp-ciudad-barcelona", "tee"], ["fp-ciudad-madrid-rojiblanco", "tee"], ["fp-ciudad-gijon", "hoodie"]];
    for (const [slug, bp] of cases) {
      const d = designBySlug(slug)!;
      for (const side of ["front", "back"] as const) {
        const png = await renderDesign({ ...d, layers: effectiveLayers(d, bp, side) }, { width: 300, height: 400, mode: "print" });
        const m = await inkMargins(png);
        const z = zoneFor(bp, side)!;
        for (const k of ["l", "t", "r", "b"] as const) expect(m[k], `${slug} ${bp} ${side} ${k}`).toBeGreaterThanOrEqual(z[k] - 0.01);
      }
    }
  });
});

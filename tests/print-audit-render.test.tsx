/**
 * Print audit with the real renderer (manual, slow). Skipped unless PRINT_AUDIT_OUT is set:
 *   PRINT_AUDIT_OUT=/tmp/print-audit PRINT_AUDIT_PHASE=before npx vitest run tests/print-audit-render.test.tsx
 *   PRINT_AUDIT_OUT=/tmp/print-audit PRINT_AUDIT_PHASE=after  npx vitest run tests/print-audit-render.test.tsx
 *
 * Renders every active design (front + back) in print mode exactly as the catalog builder does, for the raw
 * layers ("before": what was printed without safe zones) or the effective layers of every blueprint it is
 * built on ("after"), and measures on the pixels: ink box margins, ink in the hoodie pocket / hood zones,
 * and thin strokes (share of ink lost to a 1 mm morphological opening — distress and hairlines).
 * Writes <OUT>/<phase>/<slug>[-back].png tiles and <OUT>/<phase>.json. tests/print-audit.test.ts holds the
 * fast geometric checks that run in CI.
 * Storage-only illustrations (art-*, prof-*) are replaced by a solid placeholder of the same aspect.
 */
import { describe, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ACTIVE_DESIGNS, type BlueprintKey, type Design } from "@/lib/catalog/designs";
import { BLUEPRINTS } from "@/lib/catalog/blueprints";
import { productsFor } from "@/lib/fulfillment/catalog-builder";
import { effectiveLayers, HOODIES, zoneFor } from "@/lib/catalog/print-safety";
import manifest from "@/lib/catalog/art-manifest.json";

const OUT = process.env.PRINT_AUDIT_OUT;
const PHASE = process.env.PRINT_AUDIT_PHASE === "after" ? "after" : "before";
const ONLY = process.env.PRINT_AUDIT_ONLY ? new RegExp(process.env.PRINT_AUDIT_ONLY) : null;
const W = 600, H = 800; // 0.5 mm per px on a 12 in print area

async function placeholder(name: string) {
  const a = (manifest as Record<string, number>)[name] ?? 1;
  const w = 600, h = Math.round(w * a);
  return sharp({ create: { width: w, height: h, channels: 4, background: "#b58a3a" } }).png().toBuffer();
}

export interface PixelMetrics {
  margins: { l: number; t: number; r: number; b: number } | null;
  cover: number;
  /** share of ink below 72 % of the height (hoodie pocket) */
  pocket: number;
  /** share of ink lost to a 3 × 3 opening (features ≤ 1 mm) */
  thin: number;
  /** share of inked pixels that are only partly covered (screen-print wear knocking holes into the ink) */
  worn: number;
}

async function metrics(png: Buffer): Promise<PixelMetrics> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const ink = new Uint8Array(w * h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0, low = 0, part = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 24) {
        ink[y * w + x] = 1;
        n++;
        if (data[(y * w + x) * 4 + 3] < 200) part++;
        if (y > h * 0.72) low++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (!n) return { margins: null, cover: 0, pocket: 0, thin: 0, worn: 0 };
  // opening = erosion then dilation (3 × 3)
  const er = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      let all = 1;
      for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1; dx++) if (!ink[(y + dy) * w + x + dx]) { all = 0; break; }
      er[y * w + x] = all;
    }
  let kept = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      if (!ink[y * w + x]) continue;
      let any = 0;
      for (let dy = -1; dy <= 1 && !any; dy++) for (let dx = -1; dx <= 1; dx++) if (er[(y + dy) * w + x + dx]) { any = 1; break; }
      kept += any;
    }
  const r3 = (v: number) => +v.toFixed(3);
  return { margins: { l: r3(x0 / w), t: r3(y0 / h), r: r3(1 - (x1 + 1) / w), b: r3(1 - (y1 + 1) / h) }, cover: r3(n / (w * h)), pocket: r3(low / n), thin: r3(1 - kept / n), worn: r3(part / n) };
}

describe.skipIf(!OUT)("print audit (renders)", () => {
  it(`renders every active design (${PHASE})`, { timeout: 3_600_000 }, async () => {
    const dir = path.join(OUT!, PHASE);
    mkdirSync(dir, { recursive: true });
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (u: string | URL) => {
      const m = String(u).match(/\/([a-z0-9-]+)\.png/);
      if (m) return new Response(new Uint8Array(await placeholder(m[1])), { status: 200 });
      return realFetch(u);
    });
    const { renderDesign } = await import("@/lib/catalog/render");
    const rows: Record<string, unknown>[] = [];
    for (const d of ACTIVE_DESIGNS as Design[]) {
      if (ONLY && !ONLY.test(d.slug)) continue;
      const bps = productsFor(d).filter((bp) => ["print", "cover"].includes(BLUEPRINTS[bp].renderMode));
      if (!bps.length) continue;
      for (const side of ["front", "back"] as const) {
        if (side === "back" && !d.back?.length) continue;
        const cover = bps.every((bp) => BLUEPRINTS[bp].renderMode === "cover");
        // "after": the strictest zone the design prints in (hoodie when it is built on one)
        const bp: BlueprintKey = bps.find((b) => HOODIES.has(b)) ?? bps[0];
        const layers = PHASE === "after" ? effectiveLayers(d, bp, side) : side === "back" ? d.back! : d.layers;
        // measure without the full-bleed pattern of all-over panels
        const measured = cover ? layers.slice(1) : layers;
        let png: Buffer;
        try {
          png = await renderDesign({ ...d, layers: measured }, { width: W, height: H, mode: "print" });
        } catch (e) {
          console.warn(d.slug, String(e));
          continue;
        }
        const m = await metrics(png);
        const file = `${d.slug}${side === "back" ? "-back" : ""}.png`;
        const bg = d.tone === "dark" ? "#1a1a1a" : "#efe6d2";
        const z = zoneFor(bp, side);
        const guide = z
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${z.l * W}" y="${z.t * H}" width="${(1 - z.l - z.r) * W}" height="${(1 - z.t - z.b) * H}" fill="none" stroke="#2bd4ff" stroke-width="2" stroke-dasharray="10 8"/><rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="#888" stroke-width="2"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"/>`;
        const full = cover ? await renderDesign({ ...d, layers }, { width: W, height: H, mode: "print" }) : png;
        const tile = await sharp({ create: { width: W, height: H, channels: 4, background: bg } }).composite([{ input: full }, { input: Buffer.from(guide) }]).png().toBuffer();
        writeFileSync(path.join(dir, file), tile);
        rows.push({ slug: d.slug, side, bp, products: bps, file, ...m });
      }
    }
    writeFileSync(path.join(OUT!, `${PHASE}.json`), JSON.stringify(rows, null, 1));
  });
});

import { describe, expect, it } from "vitest";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DESIGNS } from "@/lib/catalog/designs";
import { BLUEPRINTS } from "@/lib/catalog/blueprints";
import { FUTBOL_AOP, FUTBOL_CITIES } from "@/lib/catalog/futbol-pro";
import { renderDesign } from "@/lib/catalog/render";

const FP = DESIGNS.filter((d) => d.tags?.includes("futbol-pro"));

describe("Fútbol PRO line", () => {
  it("has the full range, with art on disk and valid products", () => {
    expect(FP.length).toBeGreaterThanOrEqual(40);
    expect(FP.filter((d) => d.tags?.includes("serie-ciudad")).length).toBe(FUTBOL_CITIES.length);
    expect(FP.filter((d) => d.products.includes("jersey")).length).toBe(FUTBOL_AOP.length);
    for (const d of FP) {
      expect(d.collection).toBe("futbol");
      for (const l of [...d.layers, ...(d.back ?? [])]) {
        expect(l.type).toBe("image");
        if (l.type === "image") expect(existsSync(path.join(process.cwd(), "public/catalog", l.path))).toBe(true);
      }
      for (const bp of d.products) expect(BLUEPRINTS[bp]).toBeTruthy();
    }
  });

  it("stays clear of protected marks in names and copy", () => {
    const banned = /\b(FIFA|Mundial|Copa del Mundo|World Cup|La Roja|RFEF|Real Madrid|Atl[eé]tico|Bar[çc]a|Athletic|Betis|Osasuna|Celta|Sporting|Deportivo|Racing|Real Sociedad|Alav[eé]s|Hércules|Levante|LaLiga)\b/i;
    for (const d of FP) expect(`${d.name} ${d.line}`).not.toMatch(banned);
  });

  it("renders front, back and all-over panels at print size", async () => {
    const out = process.env.RENDER_OUT;
    const front = DESIGNS.find((d) => d.slug === "fp-campeones-mundo-noche")!;
    const png = await renderDesign(front, { width: 1800, height: 2400, mode: "print" });
    expect(png.readUInt32BE(16)).toBe(1800);
    if (out) writeFileSync(`${out}/fp-print.png`, png);
    const jersey = DESIGNS.find((d) => d.slug === "fp-camiseta-barcelona")!;
    const panel = await renderDesign(jersey, { width: 2000, height: 2400, mode: "cover" });
    expect(panel.readUInt32BE(20)).toBe(2400);
    if (out) writeFileSync(`${out}/fp-cover.png`, panel);
    const back = await renderDesign({ ...jersey, layers: jersey.back! }, { width: 2000, height: 2400, mode: "cover" });
    if (out) writeFileSync(`${out}/fp-cover-back.png`, back);
    const mug = await renderDesign(DESIGNS.find((d) => d.slug === "fp-ciudad-bilbao")!, { width: 2700, height: 1050, mode: "mug" });
    if (out) writeFileSync(`${out}/fp-mug.png`, mug);
    expect(mug.length).toBeGreaterThan(1000);
  }, 120_000);
});

import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { renderPrintFile } from "@/lib/personalization/render";

describe("print file render", () => {
  it("renders jersey and designer text designs to transparent PNG at print size", async () => {
    const png = await renderPrintFile({ mode: "fields", template: "jersey", values: { name: "GARCÍA", number: "10" } }, { ink: "#c8102e" });
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(2400);
    expect(png.readUInt32BE(20)).toBe(3200);
    if (process.env.RENDER_OUT) writeFileSync(`${process.env.RENDER_OUT}/jersey.png`, png);
    const d = await renderPrintFile({ mode: "designer", placement: "front", layers: [{ id: "a", type: "text", text: "Orgullo", font: "serif", color: "#c99a1e", x: 0.5, y: 0.3, w: 0.8, rotation: -6 }, { id: "b", type: "text", text: "Alicante", font: "script", color: "#c8102e", x: 0.5, y: 0.55, w: 0.6, rotation: 0 }] });
    if (process.env.RENDER_OUT) writeFileSync(`${process.env.RENDER_OUT}/designer.png`, d);
    const p = await renderPrintFile({ mode: "fields", template: "pueblo", values: { pueblo: "VILLAJOYOSA" } }, { ink: "#0d0d0d", font: "serif" });
    if (process.env.RENDER_OUT) writeFileSync(`${process.env.RENDER_OUT}/pueblo.png`, p);
    expect(d.length).toBeGreaterThan(1000);
  }, 60_000);
});

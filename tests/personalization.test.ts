import { describe, expect, it } from "vitest";
import { cleanText, extraPriceFor, validatePersonalization } from "@/lib/personalization/validate";
import { mergeFiles } from "@/lib/personalization/prepare";
import type { PersoConfig } from "@/lib/personalization/types";

const urlFor = (p: string) => `https://cdn.test/${p}`;
const jersey: PersoConfig = {
  mode: "fields",
  template: "jersey",
  placement: "back",
  extraPrice: 6,
  fields: [
    { key: "name", label: "Nombre", maxLength: 12, uppercase: true, required: true },
    { key: "number", label: "Dorsal", maxLength: 2, pattern: "^[0-9]{1,2}$" },
  ],
};
const designer: PersoConfig = { mode: "designer", placements: ["front", "back"], extraPrice: 8, maxLayers: 3 };

describe("personalization validation", () => {
  it("cleans, uppercases and limits jersey fields", () => {
    const r = validatePersonalization(jersey, { mode: "fields", values: { name: "  garcía\u0000 <b>", number: "10" } }, { publicUrlFor: urlFor });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.value).toEqual({ mode: "fields", template: "jersey", values: { name: "GARCÍA B", number: "10" } });
      expect(r.data.needsReview).toBe(false);
    }
  });
  it("rejects invalid dorsal and missing required name", () => {
    expect(validatePersonalization(jersey, { mode: "fields", values: { name: "ANA", number: "1A" } }, { publicUrlFor: urlFor })).toEqual({ ok: false, error: "FIELD_INVALID" });
    expect(validatePersonalization(jersey, { mode: "fields", values: { number: "7" } }, { publicUrlFor: urlFor })).toEqual({ ok: false, error: "FIELD_REQUIRED" });
  });
  it("flags offensive words or protected club names for review", () => {
    const r = validatePersonalization(jersey, { mode: "fields", values: { name: "Real Madrid" } }, { publicUrlFor: urlFor });
    expect(r.ok && r.data.needsReview).toBe(true);
  });
  it("designer: only own upload paths, uploads always reviewed, server-side URL", () => {
    const bad = validatePersonalization(designer, { mode: "designer", placement: "front", layers: [{ type: "image", path: "https://evil.example/x.png" }] }, { publicUrlFor: urlFor });
    expect(bad).toEqual({ ok: false, error: "BAD_LAYER" });
    const path = "uploads/123e4567-e89b-12d3-a456-426614174000.png";
    const ok = validatePersonalization(designer, { mode: "designer", placement: "front", layers: [{ type: "image", path, url: "https://evil.example", x: 9, y: -1, w: 0.4, aspect: 1 }] }, { publicUrlFor: urlFor });
    expect(ok.ok).toBe(true);
    if (ok.ok && ok.data.value.mode === "designer") {
      const l = ok.data.value.layers[0];
      expect(l.type === "image" && l.url).toBe(`https://cdn.test/${path}`);
      expect(l.x).toBe(1);
      expect(l.y).toBe(0);
      expect(ok.data.needsReview).toBe(true);
    }
  });
  it("designer: text-only designs are automatic; limits enforced", () => {
    const r = validatePersonalization(designer, { mode: "designer", placement: "back", layers: [{ type: "text", text: "Hola", font: "script", color: "#C8102E" }] }, { publicUrlFor: urlFor });
    expect(r.ok && !r.data.needsReview).toBe(true);
    const many = Array.from({ length: 4 }, () => ({ type: "text", text: "x" }));
    expect(validatePersonalization(designer, { mode: "designer", placement: "front", layers: many }, { publicUrlFor: urlFor })).toEqual({ ok: false, error: "TOO_MANY_LAYERS" });
    expect(validatePersonalization(designer, { mode: "designer", placement: "front", layers: [] }, { publicUrlFor: urlFor })).toEqual({ ok: false, error: "EMPTY_DESIGN" });
  });
  it("identical designs share a cart key; surcharge only when personalized", () => {
    const a = validatePersonalization(jersey, { mode: "fields", values: { name: "ana", number: "7" } }, { publicUrlFor: urlFor });
    const b = validatePersonalization(jersey, { mode: "fields", values: { number: "7", name: "ANA" } }, { publicUrlFor: urlFor });
    expect(a.ok && b.ok && a.data.key === b.data.key).toBe(true);
    expect(extraPriceFor(jersey, true)).toBe(6);
    expect(extraPriceFor(jersey, false)).toBe(0);
    expect(validatePersonalization(null, { mode: "fields" }, { publicUrlFor: urlFor })).toEqual({ ok: false, error: "NOT_PERSONALIZABLE" });
  });
  it("cleanText strips control/bidi chars and markup", () => {
    expect(cleanText("a‮b<script>")).toBe("abscript");
  });
  it("personalized print file replaces only the same placement", () => {
    const merged = mergeFiles([{ type: "front", url: "logo" }, { type: "back", url: "brand-back" }], [{ type: "back", url: "name" }]);
    expect(merged).toEqual([{ type: "front", url: "logo" }, { type: "back", url: "name" }]);
  });
});

import { describe, expect, it } from "vitest";
import { AUDIENCE_EXTRAS, AUDIENCE_GARMENTS, audiencesOf } from "@/lib/catalog/audience";
import { AUDIENCE_BLUEPRINTS, BLUEPRINTS } from "@/lib/catalog/blueprints";
import { DESIGNS, designBySlug } from "@/lib/catalog/designs";

const p = (productType: string, name: string, tags: string[] = [], categoryCode: string | null = "APPAREL") => ({ productType, name, tags, categoryCode });

describe("audience (Para quién)", () => {
  it("derives audiences from type, noun and design tags", () => {
    expect(audiencesOf(p("WOMENS_TSHIRT", "León Coronado — Camiseta de mujer"))).toEqual(["mujer"]);
    expect(audiencesOf(p("TSHIRT", "La Firma — Camiseta"))).toEqual(["mujer", "hombre"]);
    expect(audiencesOf(p("KIDS_TSHIRT", "Pequeño León — Camiseta infantil", [], "KIDS"))).toEqual(["ninos"]);
    expect(audiencesOf(p("TODDLER_TSHIRT", "Pequeño León — Camiseta de peque", [], "KIDS"))).toEqual(["ninos", "bebes"]);
    expect(audiencesOf(p("BABY_BODYSUIT", "Hecho en España · Bebé — Body de bebé", ["bebes"], "KIDS"))).toEqual(["bebes"]);
    expect(audiencesOf(p("TSHIRT", "El Mejor Abuelo de España — Camiseta", ["abuelos"]))).toEqual(["mujer", "hombre", "abuelos"]);
    expect(audiencesOf(p("MUG", "Abuela de Oro — Taza", ["abuelos"], "DRINKWARE"))).toEqual(["abuelos"]);
    expect(audiencesOf(p("POSTER", "Sol de España — Póster", [], "WALL_ART"))).toEqual([]);
    // a design name never decides the audience, only the product noun
    expect(audiencesOf(p("TSHIRT", "Mujer Bombera — Camiseta"))).toEqual(["mujer", "hombre"]);
  });

  it("audience garments and extras point at real blueprints and designs", () => {
    for (const k of AUDIENCE_BLUEPRINTS) expect(BLUEPRINTS[k]?.key).toBe(k);
    for (const keys of Object.values(AUDIENCE_GARMENTS)) for (const k of keys) expect(BLUEPRINTS[k]).toBeTruthy();
    for (const [k, slugs] of Object.entries(AUDIENCE_EXTRAS)) {
      expect(BLUEPRINTS[k as keyof typeof BLUEPRINTS]).toBeTruthy();
      for (const s of slugs ?? []) expect(designBySlug(s), s).toBeTruthy();
    }
    for (const s of ["mejor-abuelo", "abuela-de-oro", "pequeno-leon", "mi-primer-mundial", "hecho-en-espana-bebe"]) expect(DESIGNS.some((d) => d.slug === s)).toBe(true);
  });
});

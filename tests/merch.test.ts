import { describe, expect, it } from "vitest";
import type { PublicProduct } from "@/lib/products/queries";
import { colourOf, familyOf, heroOptions, kidsLead, merchandise, merchandiseDetailed, merchandiseUnique, qualityOf, seriesFor, withHero } from "@/lib/catalog/merch";

let seq = 0;
function prod(o: { design: string | null; tags: string[]; type?: string; colours?: string[]; collection?: string; images?: { url: string; color: string | null; kind?: string }[]; featured?: boolean }): PublicProduct {
  const id = `p${(seq++).toString().padStart(4, "0")}`;
  const colours = o.colours ?? ["Black"];
  const images = (o.images ?? [{ url: `/img/${id}-0.webp`, color: null }, { url: `/img/${id}-1.webp`, color: null }]).map((i) => ({ url: i.url, alt: null, color: i.color, kind: i.kind ?? "MOCKUP" }));
  return {
    id, name: `${o.design ?? "blank"} — ${o.type ?? "TSHIRT"}`, slug: `${o.design ?? "blank"}-${id}`, shortDescription: null, description: null, story: null,
    price: 29, compareAt: null, currency: "EUR", productType: o.type ?? "TSHIRT", categoryCode: "APPAREL", limited: false, limitedType: null, limitedUntil: null, limitedRemaining: null,
    images, variants: colours.map((c, i) => ({ id: `${id}-v${i}`, name: c, size: "M", color: c, colorHex: null, price: 29, compareAt: null, available: true, image: `/img/${id}-${c.replace(/\s/g, "")}.webp` })),
    design: o.design, sizeGuide: null, featured: o.featured ?? false, publishedAt: null, collection: o.collection ? { slug: o.collection, name: o.collection } : null, personalization: null, tags: o.tags,
    seoTitle: null, seoDescription: null, ogImage: null, updatedAt: "",
  };
}

/** A realistic catalogue slice: several series, families with variants (arte/frase/doble, día/noche), mixed colours. */
function catalogue(): PublicProduct[] {
  seq = 0;
  const out: PublicProduct[] = [];
  const colourSets = [["Black", "Navy"], ["White", "Light Blue"], ["Navy", "Red"], ["Sand", "White"], ["Black"], ["Light Pink", "White"], ["Maroon"], ["Forest Green", "Black"]];
  let k = 0;
  const add = (design: string, tags: string[], types: string[], collection: string) => {
    for (const type of types) out.push(prod({ design, tags, type, collection, colours: colourSets[k++ % colourSets.length] }));
  };
  for (const a of ["toro", "faro", "padel", "castellers", "moto", "vino", "feria", "barca"]) {
    add(`arte-${a}`, ["arte", "serie-arte", "light"], ["TSHIRT", "HOODIE", "MUG"], "heritage");
    add(`arte-${a}-frase`, ["arte", "frase", "serie-arte", "light"], ["TSHIRT", "SWEATSHIRT"], "heritage");
  }
  for (const l of ["leon-corazon", "leon-hispania", "leon-espalda", "leon-blason-noche", "leon-blason-dia"]) add(l, ["leon", "serie-leon", "lookbook", "dark"], ["TSHIRT", "HOODIE"], "leon");
  for (const f of ["fp-campeones-mundo-noche", "fp-campeones-mundo-dia", "fp-ciudad-madrid", "fp-ciudad-sevilla", "fp-dos-estrellas-noche"]) add(f, ["futbol", "futbol-pro", "dark"], ["TSHIRT", "HOODIE"], "futbol");
  for (const s of ["sab-ole", "sab-ole-noche", "sab-paciencia", "sab-abuela", "sab-siesta"]) add(s, ["sabiduria", "serie-sabiduria", "frase", "tipografia"], ["TSHIRT", "MUG"], "sabiduria");
  for (const c of ["madrid", "sevilla", "bilbao", "valencia"]) add(`ciudad-${c}-cartel`, ["ciudad", "cartel", "tipografia"], ["TSHIRT"], "ciudades");
  for (const b of ["leon-bordado", "leon-espana-bordado", "leon-minimal-bordado"]) add(b, ["bordado", "leon", "serie-leon"], ["CAP", "BEANIE"], "leon");
  for (const s of ["st-uno", "st-dos", "st-tres"]) add(s, ["statement", "dark"], ["TSHIRT", "HOODIE"], "espana");
  return out;
}

const WINDOW = 8;

function windows<T>(list: T[], n = WINDOW) {
  const out: T[][] = [];
  for (let i = 0; i + n <= list.length; i++) out.push(list.slice(i, i + n));
  return out;
}

describe("merch: colours", () => {
  it("classifies garment colour names, pastels before their base hue", () => {
    expect(colourOf("Black")).toBe("black");
    expect(colourOf("Black Heather")).toBe("black");
    expect(colourOf("French Navy")).toBe("navy");
    expect(colourOf("Light Blue")).toBe("pastel");
    expect(colourOf("Heather Prism Peach")).toBe("pastel");
    expect(colourOf("Soft Cream")).toBe("sand");
    expect(colourOf("Natural")).toBe("sand");
    expect(colourOf("White")).toBe("white");
    expect(colourOf("Maroon")).toBe("red");
    expect(colourOf("Dark Grey Heather")).toBe("charcoal");
    expect(colourOf("Sport Grey")).toBe("grey");
    expect(colourOf(null, "#0b0b0b")).toBe("black");
    expect(colourOf(null, "#a9cce3")).toBe("pastel");
    expect(colourOf(null, null)).toBeNull();
  });

  it("leads with the most striking colour photo, not the provider's first one", () => {
    const p = prod({ design: "arte-padel", tags: ["arte", "serie-arte"], colours: ["Light Blue", "Black"], images: [{ url: "/lb-front", color: "Light Blue" }, { url: "/lb-back", color: "Light Blue" }] });
    const [best] = heroOptions(p);
    expect(best.colour).toBe("black");
    expect(best.url).toContain("Black");
    // no black hover photo in the listing: the card shows no flip in another colour
    expect(withHero(p, best).images.map((i) => i.url)).toEqual([best.url]);
  });

  it("prefers white / sand for light-ink designs and flips to the same colour's second photo", () => {
    const p = prod({ design: "arte-toro", tags: ["arte", "serie-arte", "light"], colours: ["Light Blue", "White"], images: [{ url: "/lb", color: "Light Blue" }, { url: "/w-front", color: "White" }, { url: "/w-back", color: "White" }] });
    const hero = heroOptions(p)[0];
    expect(hero.colour).toBe("white");
    expect(withHero(p, hero).images.slice(0, 2).map((i) => i.url)).toEqual(["/w-front", "/w-back"]);
  });

  it("untagged listing photos inherit the first variant colour", () => {
    const p = prod({ design: "leon-espalda", tags: ["leon", "serie-leon"], colours: ["Navy"] });
    p.variants.forEach((v) => (v.image = null));
    expect(heroOptions(p)[0]).toMatchObject({ colour: "navy", url: p.images[0].url });
  });
});

describe("merch: quality", () => {
  it("ranks big art, León and Statement above «· Frase» variants and city posters", () => {
    const arte = prod({ design: "arte-faro", tags: ["arte", "serie-arte"], colours: ["White"] });
    const frase = prod({ design: "arte-faro-frase", tags: ["arte", "frase", "serie-arte"], colours: ["White"] });
    const cartel = prod({ design: "ciudad-madrid-cartel", tags: ["ciudad", "cartel"], colours: ["White"] });
    const leon = prod({ design: "leon-corazon", tags: ["leon", "serie-leon"], colours: ["White"] });
    const statement = prod({ design: "st-nuevo", tags: ["statement"], colours: ["White"] });
    expect(seriesFor(frase)).toBe("arte-frase");
    expect(seriesFor(statement)).toBe("statement");
    expect(qualityOf(arte)).toBeGreaterThan(qualityOf(frase) + 2);
    expect(qualityOf(leon)).toBeGreaterThan(qualityOf(cartel) + 3);
    expect(qualityOf(statement)).toBeGreaterThan(qualityOf(arte));
    // a dark mockup beats a pale one of the same design
    const pale = prod({ design: "arte-moto", tags: ["arte", "serie-arte"], colours: ["Light Blue"] });
    const dark = prod({ design: "arte-moto", tags: ["arte", "serie-arte"], colours: ["Black"] });
    expect(qualityOf(dark)).toBeGreaterThan(qualityOf(pale) + 2);
  });

  it("groups design variants into one family", () => {
    const f = (design: string) => familyOf({ design, slug: design, tags: [], productType: "TSHIRT" });
    expect(f("arte-toro-frase")).toBe("arte-toro");
    expect(f("arte-toro-doble")).toBe("arte-toro");
    expect(f("fp-campeones-mundo-noche")).toBe(f("fp-campeones-mundo-dia"));
    expect(f("ciudad-madrid-cartel-claro")).toBe("ciudad-madrid");
    expect(f("oficio-taxi-arte")).toBe(f("oficio-taxi-cartel"));
    expect(f("sab-ole-noche")).toBe("sab-ole");
  });

  it("drops retired designs", () => {
    const out = merchandise([prod({ design: "hecho-en-espana", tags: [] }), prod({ design: "arte-toro", tags: ["arte", "serie-arte"] })]);
    expect(out.map((p) => p.design)).toEqual(["arte-toro"]);
  });
});

describe("merch: interleave constraints", () => {
  const list = catalogue();
  const out = merchandiseDetailed(list);

  it("keeps every live product exactly once", () => {
    expect(out).toHaveLength(list.length);
    expect(new Set(out.map((m) => m.p.id)).size).toBe(list.length);
  });

  it("starts with the best piece", () => {
    const top = Math.max(...out.map((m) => m.score));
    expect(out[0].score).toBe(top);
  });

  // the pool has 46 families: the first pages must satisfy every rule; the tail (one series left) may relax
  const head = out.slice(0, 40);

  it("no two pieces of the same design family within any window of 8", () => {
    for (const w of windows(head)) expect(new Set(w.map((m) => m.family)).size).toBe(w.length);
  });

  it("at most 2 pieces of one series within any window of 8", () => {
    for (const w of windows(head)) {
      const counts = new Map<string, number>();
      for (const m of w) counts.set(m.series, (counts.get(m.series) ?? 0) + 1);
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    }
  });

  it("at most 2 pieces in the same garment colour within any window of 8", () => {
    for (const w of windows(head)) {
      const counts = new Map<string, number>();
      for (const m of w) if (m.colour) counts.set(m.colour, (counts.get(m.colour) ?? 0) + 1);
      expect(Math.max(0, ...counts.values())).toBeLessThanOrEqual(2);
    }
  });

  it("never leads with a pastel photo when the piece has a strong colour (the colour cap swaps only between strong colours)", () => {
    for (const m of out) {
      const best = heroOptions(m.p)[0];
      if (best.colour !== "pastel") expect(m.colour).not.toBe("pastel");
    }
  });

  it("never puts two pieces of one series side by side on the first pages", () => {
    for (let i = 1; i < head.length; i++) expect(head[i].series).not.toBe(head[i - 1].series);
  });

  it("keeps «· Frase» variants and city posters off the first row", () => {
    expect(out.slice(0, 8).some((m) => m.series === "arte-frase" || m.series === "ciudades-cartel")).toBe(false);
  });

  it("each card leads with its chosen hero photo", () => {
    const products = merchandise(list);
    const detailed = merchandiseDetailed(list);
    detailed.forEach((m, i) => expect(products[i].images[0].url).toBe(m.hero!.url));
  });

  it("is deterministic", () => {
    expect(merchandiseDetailed(list).map((m) => m.p.id)).toEqual(out.map((m) => m.p.id));
  });

  it("relaxes gracefully when the pool lacks variety", () => {
    seq = 0;
    const mono = Array.from({ length: 12 }, (_, i) => prod({ design: `sab-x${i % 3}`, tags: ["sabiduria"], colours: ["Black"] }));
    expect(merchandise(mono)).toHaveLength(12);
  });

  it("unique rails show one piece per family", () => {
    const rail = merchandiseUnique(list, 12);
    expect(rail).toHaveLength(12);
    expect(new Set(rail.map((p) => familyOf(p))).size).toBe(12);
  });
});

describe("kidsLead", () => {
  const kid = (models: (("girl" | "boy") | undefined)[]) => {
    const p = prod({ design: "leon", tags: [], images: models.map((_, i) => ({ url: `/k/${i}.webp`, color: null })) });
    return { ...p, categoryCode: "KIDS", images: p.images.map((im, i) => ({ ...im, ...(models[i] ? { model: models[i] } : {}) })) } as PublicProduct;
  };
  it("leads with the asked-for child and keeps the other child off the hover slot", () => {
    const p = kid(["girl", "girl", undefined, "boy"]);
    const b = kidsLead(p, "boy");
    expect(b.images[0].model).toBe("boy");
    expect(b.images[1].model).not.toBe("girl");
    const g = kidsLead(kid(["boy", "girl", "boy", undefined]), "girl");
    expect(g.images[0].model).toBe("girl");
    expect(g.images[1].model).toBeUndefined();
  });
  it("falls back to a neutral photo, never the other child", () => {
    const b = kidsLead(kid(["girl", undefined, "girl", undefined]), "boy");
    expect(b.images[0].model).toBeUndefined();
    expect(b.images.slice(0, 2).some((im) => im.model === "girl")).toBe(false);
  });
  it("leaves adult products alone", () => {
    const p = prod({ design: "x", tags: [] });
    expect(kidsLead(p, "boy")).toBe(p);
  });
});

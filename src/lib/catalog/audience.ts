/**
 * "Para quién" — audience segmentation (Mujer, Hombre, Niños, Bebés, Abuelos).
 * Pure and client-safe: derived from what every product already carries (product type, the
 * blueprint label in its name, tags copied from its design). No DB column, no migration.
 */
import type { BlueprintKey } from "./designs";

export const AUDIENCES = ["mujer", "hombre", "ninos", "bebes", "abuelos"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const isAudience = (s: unknown): s is Audience => typeof s === "string" && (AUDIENCES as readonly string[]).includes(s);

/** Fields of a PublicProduct the helper reads (kept structural so it stays client-safe). */
export interface AudienceInput {
  productType: string;
  name: string;
  tags: string[];
  categoryCode: string | null;
}

const KIDS_TYPES = new Set(["KIDS_TSHIRT", "KIDS_HOODIE", "TODDLER_TSHIRT"]);
const BABY_TYPES = new Set(["BABY_BODYSUIT"]);
/** Adult unisex garments and headwear: shown to both Mujer and Hombre. */
const UNISEX_TYPES = new Set(["TSHIRT", "HOODIE", "SWEATSHIRT", "CAP", "BEANIE"]);
const ADULT_CATEGORIES = new Set(["APPAREL", "HEADWEAR"]);

/** The product-noun part of a catalog name ("León Coronado — Camiseta de mujer" → "camiseta de mujer"). */
const nounOf = (name: string) => (name.split(" — ").pop() ?? name).toLowerCase();

/** Audiences a product belongs to, in display order. Accessories without an audience return []. */
export function audiencesOf(p: AudienceInput): Audience[] {
  const out = new Set<Audience>();
  const type = (p.productType ?? "").toUpperCase();
  const noun = nounOf(p.name ?? "");
  const tags = p.tags ?? [];
  if (/^WOMENS?_/.test(type) || /\b(mujer|women'?s?)\b/.test(noun)) out.add("mujer");
  else if (BABY_TYPES.has(type) || /\b(beb[eé]s?|baby)(?![a-z])/.test(noun)) out.add("bebes");
  else if (KIDS_TYPES.has(type) || p.categoryCode === "KIDS" || /infantil|\bpeque\b|youth|kids|toddler/.test(noun)) out.add("ninos");
  else if (UNISEX_TYPES.has(type) || (ADULT_CATEGORIES.has(p.categoryCode ?? "") && type !== "PATCH")) {
    out.add("hombre");
    out.add("mujer");
  }
  // gift designs carry their audience as a design tag (any product type: mugs, aprons…)
  if (tags.includes("abuelos")) out.add("abuelos");
  if (tags.includes("bebes") && out.size === 0) out.add("bebes");
  if (tags.includes("ninos") && out.size === 0) out.add("ninos");
  return AUDIENCES.filter((a) => out.has(a));
}

export const isFor = (p: AudienceInput, a: Audience) => audiencesOf(p).includes(a);

/** Blueprint keys made for one audience (used to find matching designs for a landing). */
export const AUDIENCE_GARMENTS: Record<Audience, BlueprintKey[]> = {
  mujer: ["womtee", "womcrop", "womsweat"],
  hombre: ["tee", "hoodie", "sweat"],
  ninos: ["kids", "kidshoodie", "toddler"],
  bebes: ["baby"],
  abuelos: [],
};

/**
 * Existing designs offered on the audience garments as well (catalog builder: designs × products).
 * The crowned lion leads every list.
 */
export const AUDIENCE_EXTRAS: Partial<Record<BlueprintKey, string[]>> = {
  womtee: ["leon-coronado", "leon-coronado-noche", "leon-real-claro", "leon-corazon", "leon-corazon-claro", "firma-leon", "espana-bandas"],
  womcrop: ["leon-coronado", "leon-coronado-noche", "leon-real-claro", "firma-leon"],
  womsweat: ["leon-coronado", "leon-real-claro", "leon-corazon-claro"],
  kidshoodie: ["leon-coronado-noche", "leon-real-claro"],
  toddler: ["leon-real-claro"],
  baby: ["leon-real-claro"],
};

/** Display order of product types inside an audience landing (sub-category chips). */
export const AUDIENCE_TYPE_ORDER = ["WOMENS_TSHIRT", "TSHIRT", "WOMENS_HOODIE", "HOODIE", "WOMENS_SWEATSHIRT", "SWEATSHIRT", "KIDS_TSHIRT", "TODDLER_TSHIRT", "KIDS_HOODIE", "BABY_BODYSUIT", "CAP", "BEANIE", "MUG", "TOTE", "APRON", "PILLOW", "POSTER"];

type L = { es: string; en: string; de: string };
const TYPE_LABELS: Record<string, L> = {
  WOMENS_TSHIRT: { es: "Camisetas de mujer", en: "Women's T-shirts", de: "Damen-T-Shirts" },
  WOMENS_HOODIE: { es: "Sudaderas cortas", en: "Crop hoodies", de: "Crop-Hoodies" },
  WOMENS_SWEATSHIRT: { es: "Sudaderas de mujer", en: "Women's sweatshirts", de: "Damen-Sweatshirts" },
  TSHIRT: { es: "Camisetas", en: "T-shirts", de: "T-Shirts" },
  HOODIE: { es: "Sudaderas con capucha", en: "Hoodies", de: "Hoodies" },
  SWEATSHIRT: { es: "Sudaderas", en: "Sweatshirts", de: "Sweatshirts" },
  KIDS_TSHIRT: { es: "Camisetas infantiles", en: "Kids' T-shirts", de: "Kinder-T-Shirts" },
  TODDLER_TSHIRT: { es: "De 2 a 5 años", en: "Toddler (2–5)", de: "Kleinkind (2–5)" },
  KIDS_HOODIE: { es: "Sudaderas infantiles", en: "Kids' hoodies", de: "Kinder-Hoodies" },
  BABY_BODYSUIT: { es: "Bodies", en: "Bodysuits", de: "Bodys" },
  CAP: { es: "Gorras", en: "Caps", de: "Caps" },
  BEANIE: { es: "Gorros", en: "Beanies", de: "Mützen" },
  MUG: { es: "Tazas", en: "Mugs", de: "Tassen" },
  TOTE: { es: "Bolsas", en: "Tote bags", de: "Taschen" },
  APRON: { es: "Delantales", en: "Aprons", de: "Schürzen" },
  PILLOW: { es: "Cojines", en: "Pillows", de: "Kissen" },
  POSTER: { es: "Pósters", en: "Posters", de: "Poster" },
};

export function audienceTypeLabel(code: string, locale: string): string {
  const l = TYPE_LABELS[code];
  if (!l) return code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, " ");
  return locale === "en" ? l.en : locale === "de" ? l.de : l.es;
}

/** Cover photo slots per audience: campaign photo, then an uploaded site photo, then a bundled lifestyle photo. */
export const AUDIENCE_COVER: Record<string, string> = { mujer: "look-leon-mujer", hombre: "look-toro-hombre", ninos: "look-barca-nino" };
export const AUDIENCE_LOCAL: Record<string, string> = { ninos: "/lifestyle/kids-1.webp", bebes: "/lifestyle/kids-2.webp", abuelos: "/lifestyle/kids-4.webp" };

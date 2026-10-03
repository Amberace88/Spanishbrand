/**
 * Designable product kinds ("Diseña tú mismo"): one entry per blueprint that has a personalised blank.
 * Shared by the storefront designer (silhouette, print-area rectangle, picker category), the catalog
 * builder (personalization config) and the order-time print composer (layout + ratio), so what the
 * customer designs on is exactly the area that gets printed.
 *
 * Geometry: `zone` is the printable rectangle inside the 400×400 silhouette drawing, in % of the box
 * (left/top/width); its height is width × aspect. `aspect` = print-area height / width.
 */
import type { AnyFontKey, Placement } from "./types";

export type DesignCategory = "ropa" | "mujer" | "ninos" | "hogar" | "accesorios" | "pared";

/**
 * garment → transparent print, top-aligned on the provider print area (chest)
 * fill    → full-bleed product (cushion, towel, poster, case…): the design area *is* the product face,
 *           with a background colour the customer chooses
 * wrap    → mugs / tumblers: one face designed, printed on both sides of the wrap
 * emb     → embroidery: text only in thread colours, centred
 * sticker → kiss-cut vinyl: transparent, the cut follows the design
 */
export type PrintLayout = "garment" | "fill" | "wrap" | "emb" | "sticker";

export type SilhouetteKey =
  | "tee" | "womtee" | "sweat" | "hoodie" | "crop" | "kids" | "baby" | "tote" | "apron" | "mug" | "tumbler"
  | "pillow" | "towel" | "blanket" | "poster" | "framed" | "canvas" | "phone" | "sticker" | "flag" | "cap" | "trucker" | "beanie";

export interface Zone {
  left: number;
  top: number;
  width: number;
}

export interface KindSpec {
  key: string;
  label: string; // Spanish product noun (picker card)
  short: string; // one-line picker description
  cat: DesignCategory;
  layout: PrintLayout;
  aspect: number;
  placements: Placement[];
  silhouette: SilhouetteKey;
  zone: Zone;
  backZone?: Zone;
  /** Physical print width in inches (resolution warnings for uploaded photos). */
  printWidthIn: number;
  /** Fill / wrap products: the customer picks the background colour of the print. */
  background?: boolean;
  /** Variant colour = product colour shown on the silhouette (garments, totes, caps). */
  coloured?: boolean;
  scale?: number; // drawing scale for small garments (kids, baby)
}

/** Embroidery: Printful thread colours the order pipeline sends (old gold, red, flag yellow, white, black). */
export const THREADS = [
  { hex: "#a67843", label: "Oro viejo" },
  { hex: "#cc3333", label: "Rojo" },
  { hex: "#ffcc00", label: "Amarillo" },
  { hex: "#ffffff", label: "Blanco" },
  { hex: "#000000", label: "Negro" },
] as const;
export const EMB_FONTS: AnyFontKey[] = ["sport", "serif", "varsity", "display", "script"];
export const EMB_MAX_COLORS = 3;
export const EMB_MAX_LAYERS = 2;
export const EMB_MAX_CHARS = 16;

const G = 4 / 3;

export const KINDS: Record<string, KindSpec> = {
  /* ───────── Ropa ───────── */
  tee: { key: "tee", label: "Camiseta", short: "Unisex de algodón · frontal y espalda", cat: "ropa", layout: "garment", aspect: G, placements: ["front", "back"], silhouette: "tee", zone: { left: 33, top: 26.5, width: 34 }, backZone: { left: 32, top: 21, width: 36 }, printWidthIn: 12, coloured: true },
  hoodie: { key: "hoodie", label: "Sudadera con capucha", short: "Felpa gruesa · frontal y espalda", cat: "ropa", layout: "garment", aspect: G, placements: ["front", "back"], silhouette: "hoodie", zone: { left: 36.5, top: 29.5, width: 27 }, backZone: { left: 33, top: 33, width: 34 }, printWidthIn: 12, coloured: true },
  sweat: { key: "sweat", label: "Sudadera", short: "Cuello redondo · frontal y espalda", cat: "ropa", layout: "garment", aspect: G, placements: ["front", "back"], silhouette: "sweat", zone: { left: 34, top: 26.5, width: 32 }, backZone: { left: 33, top: 21, width: 34 }, printWidthIn: 12, coloured: true },
  /* ───────── Mujer ───────── */
  womtee: { key: "womtee", label: "Camiseta de mujer", short: "Corte entallado", cat: "mujer", layout: "garment", aspect: G, placements: ["front", "back"], silhouette: "womtee", zone: { left: 35, top: 27.5, width: 30 }, backZone: { left: 34, top: 22, width: 32 }, printWidthIn: 11, coloured: true },
  womsweat: { key: "womsweat", label: "Sudadera de mujer", short: "Cuello redondo, corte femenino", cat: "mujer", layout: "garment", aspect: G, placements: ["front", "back"], silhouette: "sweat", zone: { left: 35, top: 27, width: 30 }, backZone: { left: 34, top: 21, width: 32 }, printWidthIn: 11, coloured: true, scale: 0.94 },
  womcrop: { key: "womcrop", label: "Sudadera corta", short: "Crop con capucha", cat: "mujer", layout: "garment", aspect: G, placements: ["front"], silhouette: "crop", zone: { left: 38, top: 33, width: 24 }, printWidthIn: 10, coloured: true },
  /* ───────── Niños y bebés ───────── */
  kids: { key: "kids", label: "Camiseta infantil", short: "Para 5–14 años", cat: "ninos", layout: "garment", aspect: G, placements: ["front", "back"], silhouette: "kids", zone: { left: 35.5, top: 31, width: 29 }, backZone: { left: 35, top: 28, width: 30 }, printWidthIn: 10, coloured: true, scale: 0.86 },
  kidshoodie: { key: "kidshoodie", label: "Sudadera infantil", short: "Con capucha, para peques", cat: "ninos", layout: "garment", aspect: G, placements: ["front"], silhouette: "hoodie", zone: { left: 38, top: 32, width: 24 }, printWidthIn: 9, coloured: true, scale: 0.86 },
  toddler: { key: "toddler", label: "Camiseta de peque", short: "De 2 a 5 años", cat: "ninos", layout: "garment", aspect: G, placements: ["front"], silhouette: "kids", zone: { left: 37, top: 34, width: 26 }, printWidthIn: 8, coloured: true, scale: 0.76 },
  baby: { key: "baby", label: "Body de bebé", short: "Manga corta, algodón suave", cat: "ninos", layout: "garment", aspect: G, placements: ["front"], silhouette: "baby", zone: { left: 38.5, top: 31, width: 23 }, printWidthIn: 6, coloured: true },
  /* ───────── Hogar ───────── */
  mug: { key: "mug", label: "Taza", short: "Cerámica 330 ml · se imprime a ambos lados", cat: "hogar", layout: "wrap", aspect: 0.8, placements: ["front"], silhouette: "mug", zone: { left: 30, top: 38, width: 37 }, printWidthIn: 3.6, background: true },
  pillow: { key: "pillow", label: "Cojín", short: "Estampado a todo color", cat: "hogar", layout: "fill", aspect: 1, placements: ["front"], silhouette: "pillow", zone: { left: 20, top: 20, width: 60 }, printWidthIn: 18, background: true },
  towel: { key: "towel", label: "Toalla de playa", short: "Grande, a todo color", cat: "hogar", layout: "fill", aspect: 2, placements: ["front"], silhouette: "towel", zone: { left: 33, top: 12, width: 34 }, printWidthIn: 30, background: true },
  blanket: { key: "blanket", label: "Manta", short: "Suave, para el sofá", cat: "hogar", layout: "fill", aspect: 0.8, placements: ["front"], silhouette: "blanket", zone: { left: 16, top: 22, width: 68 }, printWidthIn: 50, background: true },
  apron: { key: "apron", label: "Delantal", short: "Algodón orgánico", cat: "hogar", layout: "garment", aspect: 1, placements: ["front"], silhouette: "apron", zone: { left: 33, top: 40, width: 34 }, printWidthIn: 10, coloured: true },
  /* ───────── Accesorios ───────── */
  tote: { key: "tote", label: "Bolsa tote", short: "Algodón resistente", cat: "accesorios", layout: "garment", aspect: G, placements: ["front"], silhouette: "tote", zone: { left: 32, top: 41, width: 36 }, printWidthIn: 12, coloured: true },
  phonecase: { key: "phonecase", label: "Funda de móvil", short: "iPhone 14–17 · doble capa", cat: "accesorios", layout: "fill", aspect: 2.05, placements: ["front"], silhouette: "phone", zone: { left: 35, top: 17.5, width: 30 }, printWidthIn: 3, background: true },
  sticker: { key: "sticker", label: "Pegatina", short: "Troquelada a la forma de tu diseño", cat: "accesorios", layout: "sticker", aspect: 1, placements: ["front"], silhouette: "sticker", zone: { left: 22, top: 22, width: 56 }, printWidthIn: 4 },
  tumbler: { key: "tumbler", label: "Vaso térmico", short: "Acero inoxidable · ambos lados", cat: "accesorios", layout: "wrap", aspect: 1.25, placements: ["front"], silhouette: "tumbler", zone: { left: 38.5, top: 30, width: 23 }, printWidthIn: 3.2, background: true },
  flag: { key: "flag", label: "Bandera", short: "150 × 90 cm, para el balcón", cat: "accesorios", layout: "fill", aspect: 0.6, placements: ["front"], silhouette: "flag", zone: { left: 22, top: 22, width: 68 }, printWidthIn: 60, background: true },
  cap: { key: "cap", label: "Gorra bordada", short: "Texto bordado · hasta 3 hilos", cat: "accesorios", layout: "emb", aspect: 0.42, placements: ["front"], silhouette: "cap", zone: { left: 31, top: 39, width: 38 }, printWidthIn: 4, coloured: true },
  dadhat: { key: "dadhat", label: "Gorra clásica bordada", short: "Visera curva · texto bordado", cat: "accesorios", layout: "emb", aspect: 0.42, placements: ["front"], silhouette: "cap", zone: { left: 31, top: 39, width: 38 }, printWidthIn: 4, coloured: true },
  trucker: { key: "trucker", label: "Gorra trucker bordada", short: "Rejilla trasera · texto bordado", cat: "accesorios", layout: "emb", aspect: 0.42, placements: ["front"], silhouette: "trucker", zone: { left: 31, top: 39, width: 38 }, printWidthIn: 4, coloured: true },
  beanie: { key: "beanie", label: "Gorro bordado", short: "Punto canalé · texto bordado", cat: "accesorios", layout: "emb", aspect: 0.4, placements: ["front"], silhouette: "beanie", zone: { left: 32, top: 59, width: 36 }, printWidthIn: 4, coloured: true },
  /* ───────── Pared ───────── */
  poster: { key: "poster", label: "Póster", short: "Papel mate · 30×40 a 60×80 cm", cat: "pared", layout: "fill", aspect: G, placements: ["front"], silhouette: "poster", zone: { left: 27, top: 15, width: 46 }, printWidthIn: 12, background: true },
  framed: { key: "framed", label: "Lámina enmarcada", short: "Con paspartú, lista para colgar", cat: "pared", layout: "fill", aspect: G, placements: ["front"], silhouette: "framed", zone: { left: 31, top: 21, width: 38 }, printWidthIn: 12, background: true },
  canvas: { key: "canvas", label: "Lienzo", short: "Tensado sobre bastidor", cat: "pared", layout: "fill", aspect: G, placements: ["front"], silhouette: "canvas", zone: { left: 27, top: 15, width: 46 }, printWidthIn: 12, background: true },
};

export const CATEGORIES: { key: DesignCategory; label: string }[] = [
  { key: "ropa", label: "Ropa" },
  { key: "mujer", label: "Mujer" },
  { key: "ninos", label: "Niños y bebés" },
  { key: "hogar", label: "Hogar" },
  { key: "accesorios", label: "Accesorios" },
  { key: "pared", label: "Pared" },
];

export function kindSpec(key: string | null | undefined): KindSpec {
  return (key && KINDS[key]) || KINDS.tee;
}

/** Product → kind: catalog tags carry the blueprint key; the product type is the fallback. */
export function kindFromProduct(p: { tags?: string[]; productType?: string; kind?: string | null }): string | null {
  if (p.kind && KINDS[p.kind]) return p.kind;
  for (const t of p.tags ?? []) if (KINDS[t]) return t;
  const t = (p.productType ?? "").toUpperCase();
  if (/WOMENS_HOODIE|CROP/.test(t)) return "womcrop";
  if (/WOMENS_SWEAT/.test(t)) return "womsweat";
  if (/WOMENS_T/.test(t)) return "womtee";
  if (/KIDS_HOODIE/.test(t)) return "kidshoodie";
  if (/TODDLER/.test(t)) return "toddler";
  if (/BABY|BODYSUIT/.test(t)) return "baby";
  if (/KIDS/.test(t)) return "kids";
  if (/HOOD/.test(t)) return "hoodie";
  if (/SWEAT/.test(t)) return "sweat";
  if (/TOTE|BAG/.test(t)) return "tote";
  if (/FRAMED/.test(t)) return "framed";
  if (/CANVAS/.test(t)) return "canvas";
  if (/POSTER|PRINT/.test(t)) return "poster";
  if (/MUG/.test(t)) return "mug";
  if (/TUMBLER/.test(t)) return "tumbler";
  if (/PILLOW|CUSHION/.test(t)) return "pillow";
  if (/TOWEL/.test(t)) return "towel";
  if (/BLANKET/.test(t)) return "blanket";
  if (/APRON/.test(t)) return "apron";
  if (/PHONE/.test(t)) return "phonecase";
  if (/STICKER/.test(t)) return "sticker";
  if (/FLAG/.test(t)) return "flag";
  if (/BEANIE/.test(t)) return "beanie";
  if (/CAP/.test(t)) return "cap";
  if (/SHIRT|TEE/.test(t)) return "tee";
  return null;
}

/** Print-area ratio of a designer product (config wins; legacy products are 3:4 garments). */
export function aspectOf(config: { aspect?: number; kind?: string } | null | undefined): number {
  if (config?.aspect && config.aspect > 0.1 && config.aspect < 10) return config.aspect;
  if (config?.kind && KINDS[config.kind]) return KINDS[config.kind].aspect;
  return G;
}

/** Effective print resolution of an uploaded image at its current size (dots per inch). */
export function effectiveDpi(px: number | undefined, layerW: number, spec: KindSpec): number | null {
  if (!px || !(layerW > 0)) return null;
  return Math.round(px / (layerW * spec.printWidthIn));
}

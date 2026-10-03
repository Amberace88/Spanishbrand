/**
 * Personalization model shared by the storefront, cart, checkout and fulfillment.
 *
 * Two modes:
 *  - "fields":   a brand template (jersey name+number, Mi Pueblo, city, year…) filled with short text fields.
 *  - "designer": the customer composes their own print with text and uploaded images ("Diseña tú mismo").
 *
 * Layer coordinates are normalised to the print area: x/y = centre (0..1), w = width fraction (0..1),
 * rotation in degrees. Fonts and colours are restricted to safe enums.
 */

export const FONTS = ["display", "serif", "sans", "script", "sport"] as const;
export type FontKey = (typeof FONTS)[number];

/** Extra typefaces for the designer (customer text only; brand catalog designs keep the five above). */
export const EXTRA_FONTS = ["varsity", "mono", "elegant"] as const;
export const ALL_FONTS = [...FONTS, ...EXTRA_FONTS] as const;
export type AnyFontKey = (typeof ALL_FONTS)[number];

export const FONT_LABEL: Record<AnyFontKey, string> = {
  display: "Moderna",
  serif: "Romana",
  sans: "Limpia",
  script: "Manuscrita",
  sport: "Deportiva",
  varsity: "Universitaria",
  mono: "Máquina",
  elegant: "Elegante",
};

export const TEMPLATES = ["jersey", "pueblo", "text", "year"] as const;
export type TemplateKey = (typeof TEMPLATES)[number];

export type Placement = "front" | "back";

export interface PersoField {
  key: string;
  label: string;
  maxLength: number;
  pattern?: string; // e.g. "^[0-9]{1,2}$"
  uppercase?: boolean;
  required?: boolean;
  placeholder?: string;
}

export type PersoConfig =
  | { mode: "fields"; template: TemplateKey; placement: Placement; fields: PersoField[]; extraPrice: number; ink?: string; font?: FontKey }
  | {
      mode: "designer";
      placements: Placement[];
      extraPrice: number;
      maxLayers?: number;
      colors?: { name: string; hex: string; variantColor?: string }[];
      /** Product kind (blueprint key) → silhouette, print-area ratio and print layout (see kinds.ts). */
      kind?: string;
      /** Print-area ratio (height / width) the customer designs on; default 4:3 (garments). */
      aspect?: number;
      /** Extra price when the design is printed on the back as well (two placements). */
      backPrice?: number;
      /** Embroidery: text only, thread colours only, few colours. */
      embroidery?: { threads: string[]; maxColors: number; fonts: AnyFontKey[] };
    };

export interface TextLayer {
  id: string;
  type: "text";
  text: string; // may contain up to 3 lines ("\n")
  font: AnyFontKey;
  color: string; // #rrggbb
  x: number;
  y: number;
  w: number;
  rotation: number;
  /** Letter spacing in em (−0.05 … 0.5). */
  spacing?: number;
  /** Line height for multi-line text (0.8 … 1.6). */
  lineHeight?: number;
  align?: "left" | "center" | "right";
  /** Outline: colour + width as a fraction of the font size (0.02 … 0.12). */
  stroke?: { color: string; width: number };
  /** Drop shadow: colour + offset/blur as fractions of the font size. */
  shadow?: { color: string; x: number; y: number; blur: number };
  /** Curved text: total sweep in degrees (−300 … 300); > 0 arches up, < 0 smiles down. */
  arc?: number;
}

export interface ImageLayer {
  id: string;
  type: "image";
  path: string; // storage path "uploads/<uuid>.<ext>"
  url: string; // public URL (derived server-side, never trusted from the client)
  aspect: number; // height / width of the source image
  /** Source width in pixels (uploads) — used to warn about print resolution. */
  px?: number;
  x: number;
  y: number;
  w: number;
  rotation: number;
}

export type Layer = TextLayer | ImageLayer;

export type Personalization =
  | { mode: "fields"; template: TemplateKey; values: Record<string, string> }
  | { mode: "designer"; placement: Placement; layers: Layer[]; background?: string; back?: Layer[] };

export interface ValidatedPersonalization {
  value: Personalization;
  key: string; // stable hash: identical designs merge in the cart
  needsReview: boolean; // uploads / flagged words go to a human before production
  summary: string; // short human description for cart, emails, admin
}

/** Print canvas (px) per placement: 12" × 16" at 200 dpi. */
export const PRINT_CANVAS = { width: 2400, height: 3200 } as const;

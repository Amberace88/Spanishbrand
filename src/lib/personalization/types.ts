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

export const FONT_LABEL: Record<FontKey, string> = {
  display: "Moderna",
  serif: "Clásica",
  sans: "Limpia",
  script: "Manuscrita",
  sport: "Deportiva",
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
  | { mode: "designer"; placements: Placement[]; extraPrice: number; maxLayers?: number; colors?: { name: string; hex: string; variantColor?: string }[] };

export interface TextLayer {
  id: string;
  type: "text";
  text: string;
  font: FontKey;
  color: string; // #rrggbb
  x: number;
  y: number;
  w: number;
  rotation: number;
}

export interface ImageLayer {
  id: string;
  type: "image";
  path: string; // storage path "uploads/<uuid>.<ext>"
  url: string; // public URL (derived server-side, never trusted from the client)
  aspect: number; // height / width of the source image
  x: number;
  y: number;
  w: number;
  rotation: number;
}

export type Layer = TextLayer | ImageLayer;

export type Personalization =
  | { mode: "fields"; template: TemplateKey; values: Record<string, string> }
  | { mode: "designer"; placement: Placement; layers: Layer[] };

export interface ValidatedPersonalization {
  value: Personalization;
  key: string; // stable hash: identical designs merge in the cart
  needsReview: boolean; // uploads / flagged words go to a human before production
  summary: string; // short human description for cart, emails, admin
}

/** Print canvas (px) per placement: 12" × 16" at 200 dpi. */
export const PRINT_CANVAS = { width: 2400, height: 3200 } as const;

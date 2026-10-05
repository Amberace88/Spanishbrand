import type { BlueprintKey } from "@/lib/catalog/designs";

/**
 * Varied mockup photography for kids' garments.
 *
 * Every kids' tee used to lead with the same single boy-model photo, so the kids grid looked uniform.
 * For kids / toddler / baby products the builder now asks Printful for several mockup styles (flat lay,
 * ghost, folded, kids' models incl. girl models where the product offers them) and rotates which style
 * becomes the first image, deterministically by design + garment (e.g. "pequeno-leon:kids"), so the grid
 * alternates boys, girls and flat lays.
 *
 * Styles are classified ONLY from Printful's style labels by flat-vs-model, gender and age words — never
 * by a model's appearance or ethnicity.
 */

export const KIDS_BLUEPRINTS: BlueprintKey[] = ["kids", "kidshoodie", "toddler", "baby"];
export const isKidsBlueprint = (bp: string) => (KIDS_BLUEPRINTS as string[]).includes(bp);

export type MockupStyle = "girl" | "boy" | "model" | "flat" | "ghost" | "other";

/** Classify a Printful option group / option / title label. */
export function styleOf(label: string): MockupStyle {
  const t = label.toLowerCase();
  if (/\bgirl|\bdaughter|women|woman|female/.test(t)) return "girl";
  if (/\bboy|\bson\b|\bmen'?s?\b|\bman\b|\bmale\b/.test(t)) return "boy";
  if (/flat|folded|wrinkl|hanger|laid|lay\b|table|product/.test(t)) return "flat";
  if (/ghost|invisible|3\/4|mannequin/.test(t)) return "ghost";
  if (/kid|child|toddler|baby|infant|youth|model|lifestyle|person|people|couple|family/.test(t)) return "model";
  return "other";
}

const WANTED: MockupStyle[] = ["girl", "boy", "model", "flat", "ghost"];

/**
 * Pick the option groups to request from the product's available ones: at most two per style,
 * covering girl/boy/model/flat/ghost where offered (max 8 groups to keep the task fast).
 */
export function pickOptionGroups(available: string[] | undefined): string[] {
  const out: string[] = [];
  for (const style of WANTED) {
    const groups = (available ?? []).filter((g) => styleOf(g) === style && !out.includes(g));
    out.push(...groups.slice(0, style === "girl" || style === "boy" || style === "model" ? 2 : 1));
  }
  return out.slice(0, 8);
}

/** Small stable hash (FNV-1a) — same design ⇒ same rotation on every build. */
export function stableHash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Lead-style rotation across designs: girls, flat lays and ghost shots. Printful's youth "boy" photo is the
 * same single model on every garment, so it never leads (it stays in the gallery); a design without any of
 * these styles falls back to the default photo.
 */
const ROTATION: MockupStyle[] = ["girl", "flat", "girl", "ghost"];

export function leadOrder(designSlug: string): MockupStyle[] {
  const k = stableHash(designSlug) % ROTATION.length;
  return [...new Set([...ROTATION.slice(k), ...ROTATION.slice(0, k)]), "other", "model", "boy"];
}

export interface StyledImage {
  url: string;
  color: string;
  kind: "MOCKUP" | "LIFESTYLE";
  title: string;
  style?: MockupStyle;
}

/**
 * Order images so the first one is the design's lead style (first available in its rotation), followed by
 * one image of each other style (variety in the gallery), then the rest in their original order.
 * Only images of the lead colour (the first image's colour) compete for the first slot.
 */
export function orderKidsImages<T extends StyledImage>(images: T[], designSlug: string): T[] {
  if (images.length < 2) return images;
  const leadColor = images[0].color;
  const order = leadOrder(designSlug);
  const rest = [...images];
  const out: T[] = [];
  for (const style of order) {
    const i = rest.findIndex((im) => im.color === leadColor && (im.style ?? "other") === style);
    if (i >= 0) out.push(...rest.splice(i, 1));
  }
  return [...out, ...rest];
}

/** Readable model tag appended to a photo's alt text (" — niña" / " — niño"); listings read it back (styleFromAlt). */
export function altStyleTag(style: MockupStyle | undefined): string | null {
  return style === "girl" ? "niña" : style === "boy" ? "niño" : null;
}

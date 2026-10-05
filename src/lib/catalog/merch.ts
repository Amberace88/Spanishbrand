/**
 * Merchandising engine — the "curated featured" order of any product list.
 *
 * The catalogue is ~1500 products built from a few hundred designs × blueprints × colours, so a plain
 * score sort shows rows of the same idea (every «· Frase» variant, every light garment of one series).
 * This module gives every listing the order a visual merchandiser would choose:
 *
 *  1. QUALITY — a score per product from its design series (León, lookbook, Fútbol PRO, Statement and big
 *     author art first; big-type sayings next; «· Frase» small-text variants and city / trade posters
 *     lower), its product type and its best photo (dark / strong garment colours read better on a grid
 *     than pale ones). Retired designs are dropped.
 *  2. HERO COLOUR — for each card the most striking colour photo available (black, navy, red, sand,
 *     white before light blue and pastels), varied against its neighbours. The card shows that photo and,
 *     on hover, another photo of the same colour (the back print of two-sided pieces comes first).
 *  3. DIVERSITY — a greedy interleave: within any window of 8 consecutive cards there are no two pieces
 *     of the same design family, at most 2 of one series and at most 2 in the same garment colour, and the
 *     series take turns. Highest quality first; constraints relax only when the pool runs out of variety.
 *
 * Pure and client-safe (no server imports). Explicit sorts (price, newest) never go through here.
 */
import type { PublicProduct } from "@/lib/products/queries";
import { isRetiredDesign, seriesOf } from "./retired";

/* ───────────────────────── colours ───────────────────────── */

export type ColourKey = "black" | "navy" | "red" | "white" | "sand" | "charcoal" | "olive" | "grey" | "bright" | "pastel";

/** Order matters: the first pattern that matches wins ("Light Blue" is pastel before it is blue). */
const COLOUR_NAMES: [ColourKey, RegExp][] = [
  ["pastel", /light|pale|pastel|baby|sky|aqua|mint|lavender|lilac|pink|peach|coral|lemon|prism|orchid|seafoam|carolina|blush|butter|ice|powder|celadon|sage/i],
  ["black", /black|negro|jet|onyx/i],
  ["navy", /navy|midnight|indigo|oxford|marino|dark blue/i],
  ["charcoal", /charcoal|dark gr[ae]y|dark heather|asphalt|graphite|anthracite|carbon|smoke/i],
  ["red", /red|rojo|maroon|burgund|cardinal|cherry|wine|garnet|crimson|brick/i],
  ["olive", /olive|military|forest|army|bottle green|dark green|moss|pine/i],
  ["white", /white|blanc|snow/i],
  ["sand", /sand|natural|cream|ivory|bone|oat|beige|khaki|stone|tan\b|oyster|ecru|vanilla|camel|desert|heather dust/i],
  ["grey", /gr[ae]y|ash|heather|silver|athletic/i],
  ["bright", /yellow|orange|gold|kelly|green|royal|blue|purple|turquoise|teal|magenta|fuchsia/i],
];

function fromHex(hex: string): ColourKey | null {
  const m = hex.match(/#?([0-9a-f]{6})/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  if (l < 0.12) return "black";
  if (s < 0.12) return l > 0.9 ? "white" : l > 0.55 ? "grey" : "charcoal";
  if (l > 0.72) return r > b && g > b * 0.95 ? "sand" : "pastel";
  if (b > r && b >= g) return l < 0.35 ? "navy" : "bright";
  if (r > g * 1.4 && r > b * 1.4) return "red";
  if (g >= r && g > b) return l < 0.35 ? "olive" : "bright";
  return "bright";
}

/** Colour family of a garment / variant colour (name first, hex as fallback). */
export function colourOf(name?: string | null, hex?: string | null): ColourKey | null {
  if (name) for (const [k, re] of COLOUR_NAMES) if (re.test(name)) return k;
  return hex ? fromHex(hex) : null;
}

/** How striking a garment colour reads in a product grid (0–3). */
const COLOUR_SCORE: Record<ColourKey, number> = { black: 3, navy: 2.6, red: 2.5, white: 2.2, sand: 2.1, charcoal: 1.9, olive: 1.8, grey: 1.1, bright: 1, pastel: 0.2 };
const UNKNOWN_COLOUR = 1.4; // mugs, posters, accessories: neutral

/** Light-ink designs live on light garments: there white and sand are the strong choice. */
function colourScore(c: ColourKey | null, light: boolean) {
  if (!c) return UNKNOWN_COLOUR;
  if (light && (c === "white" || c === "sand")) return 2.8;
  return COLOUR_SCORE[c];
}

/* ───────────────────────── hero photo ───────────────────────── */

export interface HeroOption {
  url: string;
  colour: ColourKey | null;
  colourName: string | null;
  score: number;
}

type Img = PublicProduct["images"][number];

/**
 * Colour of each listing photo. The listing RPC may carry it per image (variant colour); older payloads
 * only carry the first images, which are all of the product's first colour (the catalog builder renders the
 * first colour with its extra angles first), so an untagged photo inherits the first variant's colour.
 */
function imageColour(p: PublicProduct, im: Img): string | null {
  return im.color ?? p.variants[0]?.color ?? null;
}

/** Every distinct colour photo the listing knows of, best first. */
export function heroOptions(p: PublicProduct): HeroOption[] {
  const light = p.tags.includes("light");
  const hexOf = (name: string | null) => p.variants.find((v) => v.color === name)?.colorHex ?? null;
  const seen = new Set<string>();
  const out: HeroOption[] = [];
  const add = (url: string | null | undefined, name: string | null) => {
    if (!url) return;
    const key = name ?? "_";
    if (seen.has(key)) return;
    seen.add(key);
    const colour = colourOf(name, hexOf(name));
    out.push({ url, colour, colourName: name, score: colourScore(colour, light) });
  };
  for (const im of p.images) if (im.kind !== "LIFESTYLE") add(im.url, imageColour(p, im));
  for (const v of p.variants) add(v.image, v.color);
  if (!out.length && p.images[0]) add(p.images[0].url, imageColour(p, p.images[0]));
  // stable: best colour first, then the builder's own order
  return out.map((o, i) => ({ o, i })).sort((a, b) => b.o.score - a.o.score || a.i - b.i).map((x) => x.o);
}

/** Photo shown on hover: another photo of the hero's colour (back print / second angle), else a lifestyle shot. */
export function hoverFor(p: PublicProduct, hero: HeroOption): Img | null {
  const same = p.images.filter((im) => im.url !== hero.url && (imageColour(p, im) ?? "_") === (hero.colourName ?? "_"));
  return same.find((im) => im.kind !== "LIFESTYLE") ?? same[0] ?? p.images.find((im) => im.url !== hero.url && im.kind === "LIFESTYLE") ?? null;
}

/** The product with its images reordered: [hero, hover, …rest] (ProductCard shows images[0] and images[1]). */
const isKids = (p: PublicProduct) => p.categoryCode === "KIDS" || /infantil|-peque\b|-de-peque|bebe|toddler/.test(p.slug);

/**
 * Kids' garments and sports jerseys: the catalog builder already chose which photo leads (girls, boys, flat lay
 * and ghost take turns per design, see fulfillment/mockup-styles.ts) and stored it first. The listing keeps that
 * order instead of jumping to the default model photo of the best colour, which was the same boy on every card.
 */
export const keepsBuiltOrder = (p: PublicProduct) => isKids(p) || p.tags.includes("jersey");

/**
 * Kids' garments: which model photo leads the card. "girl" / "boy" pick that model when the product has one;
 * without a choice girls and boys take turns across products (stable per product), so a kids grid shows both.
 */
export function kidsLead(p: PublicProduct, want?: "girl" | "boy"): PublicProduct {
  if (!isKids(p)) return p;
  const girl = p.images.find((im) => im.model === "girl");
  const boy = p.images.find((im) => im.model === "boy");
  const pick = want === "girl" ? girl : want === "boy" ? boy : stable(p.slug) % 2 ? (boy ?? girl) : (girl ?? boy);
  if (!pick || p.images[0]?.url === pick.url) return p;
  return { ...p, images: [pick, ...p.images.filter((im) => im.url !== pick.url)] };
}

/** FNV-1a: a stable per-product number. */
function stable(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function withHero(p: PublicProduct, hero: HeroOption | undefined = heroOptions(p)[0]): PublicProduct {
  if (!hero) return p;
  if (keepsBuiltOrder(p)) return kidsLead(p);
  const lead: Img = p.images.find((im) => im.url === hero.url) ?? { url: hero.url, alt: null, color: hero.colourName, kind: "MOCKUP" };
  const hover = hoverFor(p, hero);
  const rest = p.images.filter((im) => im.url !== lead.url && im.url !== hover?.url);
  // a hero without a matching hover photo shows no flip (a different colour on hover reads as a glitch);
  // hoverFor already falls back to any lifestyle shot, so nothing worth keeping is dropped here
  return { ...p, images: hover ? [lead, hover, ...rest] : [lead] };
}

/* ───────────────────────── quality ───────────────────────── */

/** Series weight (0–10). Unknown future series get DEFAULT_SERIES; the Statement line ranks with León. */
export const SERIES_WEIGHT: Record<string, number> = {
  statement: 10,
  leon: 10,
  lookbook: 10,
  "arte-doble": 9.5,
  "futbol-pro": 9,
  arte: 8.5,
  sabiduria: 7.5,
  bordados: 7,
  refranero: 6.5,
  familia: 6,
  "oficios-arte": 6,
  base: 5,
  "arte-frase": 3.5,
  "oficios-cartel": 3,
  "ciudades-cartel": 3,
  template: 3,
  calendarios: 2,
  blank: 1.5,
};
const DEFAULT_SERIES = 6;

/** Product-type weight (0–3): garments and caps sell the brand on a grid; stickers and postcards do not. */
const TYPE_WEIGHT: Record<string, number> = {
  TSHIRT: 3, HOODIE: 3, SWEATSHIRT: 2.6, WOMENS_TSHIRT: 2.6, WOMENS_HOODIE: 2.4, WOMENS_SWEATSHIRT: 2.4,
  CAP: 2.6, BEANIE: 2.2, BUCKET_HAT: 1.8, KIDS_TSHIRT: 2.2, KIDS_HOODIE: 2, TODDLER_TSHIRT: 1.8, BABY_BODYSUIT: 1.8,
  FRAMED_PRINT: 2.2, POSTER: 2, CANVAS: 2, MUG: 1.6, TOTE: 1.6, PILLOW: 1.4, GLASS: 1.2, TUMBLER: 1.2, WATER_BOTTLE: 1.2,
  APRON: 1.2, BLANKET: 1.2, BEACH_TOWEL: 1.2, CALENDAR: 1, PHONE_CASE: 1, FLAG: 1, SOCKS: 0.8, BANDANA: 0.8, PATCH: 0.8,
  COASTER: 0.6, STICKER: 0.4, POSTCARD: 0.4,
};
const HEADWEAR = new Set(["CAP", "BEANIE", "BUCKET_HAT"]);

/** Series of a listing product (design tags are copied onto products by the catalog builder). */
export function seriesFor(p: Pick<PublicProduct, "design" | "slug" | "tags" | "collection">): string {
  const t = p.tags;
  if (t.includes("statement")) return "statement";
  if (!p.design) return t.includes("template") ? "template" : t.includes("blank") ? "blank" : "base";
  const s = seriesOf({ slug: p.design, collection: p.collection?.slug ?? "", tags: t });
  if (s === "arte") return t.includes("doble-cara") ? "arte-doble" : t.includes("frase") ? "arte-frase" : "arte";
  return s;
}

const SUFFIX = /-(frase|doble|claro|oscuro|noche|dia|arte|cartel)$/;
/** Design family: the variants of one idea (arte-toro, arte-toro-frase, arte-toro-doble → arte-toro). */
export function familyOf(p: Pick<PublicProduct, "design" | "slug" | "tags" | "productType">): string {
  if (!p.design) return p.tags.includes("blank") ? `blank:${p.productType}` : `p:${p.slug}`;
  let f = p.design;
  while (SUFFIX.test(f)) f = f.replace(SUFFIX, "");
  return f;
}

/** Small stable tie-breaker (0–0.4) so equal scores do not always fall back to publication order. */
function jitter(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 2500;
}

/** Quality of a product without its hero colour (that part depends on the neighbours). */
function baseQuality(p: PublicProduct, series: string) {
  let s = (SERIES_WEIGHT[series] ?? DEFAULT_SERIES) + 0.8 * (TYPE_WEIGHT[p.productType] ?? 1);
  if (series === "bordados" && HEADWEAR.has(p.productType)) s += 2; // embroidered caps are the house's headwear
  if (p.featured) s += 1.2;
  if (p.tags.includes("bestseller")) s += 1.5;
  if (p.images.some((im) => im.kind === "LIFESTYLE")) s += 0.4;
  if (!p.images.length) s -= 20;
  return s + jitter(p.id);
}

const COLOUR_WEIGHT = 0.9;
/** Max colour-score drop accepted to respect the colour cap (black → navy / red yes, white → light blue no). */
const COLOUR_SWAP = 1;

/** Overall quality score (with its best hero colour). Exposed for tiles and tests. */
export function qualityOf(p: PublicProduct): number {
  const series = seriesFor(p);
  return baseQuality(p, series) + COLOUR_WEIGHT * (heroOptions(p)[0]?.score ?? UNKNOWN_COLOUR);
}

/* ───────────────────────── interleave ───────────────────────── */

export interface MerchOptions {
  /** Cards in the sliding window the constraints apply to. */
  window?: number;
  /** Max pieces of one series inside a window. */
  maxSeries?: number;
  /** Max pieces of one garment colour inside a window. */
  maxColour?: number;
  /** Page-specific quality bonus (e.g. women's cuts on /para/mujer), added to the base score. */
  boost?: (p: PublicProduct) => number;
}

export interface Merched {
  p: PublicProduct;
  score: number;
  series: string;
  family: string;
  hero: HeroOption | null;
  colour: ColourKey | null;
}

interface Cand {
  p: PublicProduct;
  base: number;
  best: number; // base + best colour
  series: string;
  family: string;
  options: HeroOption[];
}

/**
 * Curated order with diversity constraints. Deterministic for a given input.
 * Levels relax one rule at a time when the remaining pool cannot satisfy all of them:
 *   0 = family + series + colour, 1 = family + series, 2 = family, 3 = none (pure quality).
 */
export function merchandiseDetailed(list: PublicProduct[], opts: MerchOptions = {}): Merched[] {
  const W = opts.window ?? 8, MAX_S = opts.maxSeries ?? 2, MAX_C = opts.maxColour ?? 2;
  const pool: Cand[] = list
    .filter((p) => !isRetiredDesign(p.design))
    .map((p) => {
      const series = seriesFor(p);
      const base = baseQuality(p, series) + (opts.boost?.(p) ?? 0);
      const options = heroOptions(p);
      return { p, base, best: base + COLOUR_WEIGHT * (options[0]?.score ?? UNKNOWN_COLOUR), series, family: familyOf(p), options };
    })
    .sort((a, b) => b.best - a.best || a.p.id.localeCompare(b.p.id));

  const out: Merched[] = [];
  const recent = () => out.slice(Math.max(0, out.length - (W - 1)));

  while (pool.length) {
    const win = recent();
    const fam = new Set(win.map((m) => m.family));
    const sCount = new Map<string, number>();
    const cCount = new Map<string, number>();
    for (const m of win) {
      sCount.set(m.series, (sCount.get(m.series) ?? 0) + 1);
      if (m.colour) cCount.set(m.colour, (cCount.get(m.colour) ?? 0) + 1);
    }
    const prev = out[out.length - 1];
    const last3 = out.slice(-3).map((m) => m.series);

    let pick: { i: number; hero: HeroOption | null; adj: number } | null = null;
    for (let level = 0; level <= 3 && !pick; level++) {
      let bestAdj = -Infinity;
      for (let i = 0; i < pool.length; i++) {
        const c = pool[i];
        if (c.best <= bestAdj) break; // sorted by best and adj ≤ best: nothing further can win
        if (level <= 2 && fam.has(c.family)) continue;
        if (level <= 1 && (sCount.get(c.series) ?? 0) >= MAX_S) continue;
        // hero colour: the strongest option that respects the colour cap; vary against the previous card
        let hero: HeroOption | null = null;
        if (!c.options.length) hero = null;
        else {
          // the cap may swap black for navy, never a strong colour for a pale one: weaker options must stay
          // within COLOUR_SWAP of the best, otherwise another product takes the slot
          const top = c.options[0].score;
          const ok = c.options.filter((o) => level > 0 || !o.colour || ((cCount.get(o.colour) ?? 0) < MAX_C && top - o.score <= COLOUR_SWAP));
          if (!ok.length) continue;
          hero = ok[0];
          const alt = ok.find((o) => o.colour !== prev?.colour);
          if (prev?.colour && hero.colour === prev.colour && alt && hero.score - alt.score <= 0.8) hero = alt;
        }
        const adj = c.base + COLOUR_WEIGHT * (hero?.score ?? UNKNOWN_COLOUR) - 1.2 * (sCount.get(c.series) ?? 0) - (prev?.series === c.series ? 1.5 : 0) - 0.4 * last3.filter((s) => s === c.series).length;
        if (adj > bestAdj) {
          bestAdj = adj;
          pick = { i, hero, adj };
        }
      }
    }
    const c = pool.splice(pick!.i, 1)[0];
    out.push({ p: c.p, score: c.best, series: c.series, family: c.family, hero: pick!.hero, colour: pick!.hero?.colour ?? null });
  }
  return out;
}

/** Curated order of a product list, each product carrying its chosen hero photo first. */
export function merchandise(list: PublicProduct[], opts?: MerchOptions): PublicProduct[] {
  return merchandiseDetailed(list, opts).map((m) => (m.hero ? withHero(m.p, m.hero) : m.p));
}

/** One product per design family, curated order (rails, tiles, "favourites"). */
export function merchandiseUnique(list: PublicProduct[], limit: number, opts?: MerchOptions): PublicProduct[] {
  const seen = new Set<string>();
  const out: PublicProduct[] = [];
  for (const m of merchandiseDetailed(list, opts)) {
    if (seen.has(m.family)) continue;
    seen.add(m.family);
    out.push(m.hero ? withHero(m.p, m.hero) : m.p);
    if (out.length >= limit) break;
  }
  return out;
}

/** Best hero photo URL of a product (tiles and covers). */
export const heroUrl = (p: PublicProduct) => heroOptions(p)[0]?.url ?? p.images[0]?.url ?? null;

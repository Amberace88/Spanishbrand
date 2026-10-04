/**
 * Print safety: keeps every library design clearly visible on the garment.
 *
 * A print file is the provider's print area edge to edge, but the garment is not a flat sheet: side seams,
 * the collar, the hood seam on a hoodie back and the kangaroo pocket on a hoodie front all swallow ink that
 * runs to the edge of the print area. Each blueprint and side gets a SAFE ZONE (margins as fractions of the
 * print area); `fitLayers` scales and moves a design — only when its real ink box leaves the zone — so it
 * sits inside, keeping its proportions, its horizontal centre where possible and its top where possible.
 *
 * The real ink box uses font metrics for text (not the nominal layer width: long words overflow it) and
 * the measured ink box of static art (art-ink.json, scripts/art-ink.mjs), so transparent padding in an
 * illustration does not count as ink.
 *
 * `designVersion` hashes what a product actually prints (effective layers per blueprint + art content +
 * render revision). The catalog builder records it when it builds a product and re-queues published
 * products whose version changed (zero-downtime replacement, see catalog-builder.ts).
 */
import { createHash } from "node:crypto";
import type { AnyFontKey, Layer, TextLayer } from "@/lib/personalization/types";
import { advance, layoutText, linesOf } from "@/lib/personalization/artwork";
import metrics from "@/lib/personalization/font-metrics.json";
import INK_JSON from "./art-ink.json";
import { BLUEPRINTS } from "./blueprints";
import type { BlueprintKey, Design } from "./designs";

/** Reference canvas (12 × 16 in at 200 dpi): layer coordinates are fractions of it. */
export const CW = 2400;
export const CH = 3200;

/** Bump when the renderer's placement logic changes in a way that changes print files. */
export const RENDER_REV = 1;
/** Bump to rebuild every kids' product (kids safe zones + varied mockup photos: girls, boys, flat lays). */
export const KIDS_REV = 3;

export const INK = INK_JSON as unknown as Record<string, [number, number, number, number, string]>;

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface Zone {
  /** Minimum margins as fractions of the print area (left, top, right, bottom). */
  l: number;
  t: number;
  r: number;
  b: number;
  /** Why this zone exists (shown in the audit). */
  label: string;
}

/** Every garment: side seams and the collar curve. */
export const ZONE_FRONT: Zone = { l: 0.05, t: 0.04, r: 0.05, b: 0.04, label: "frontal" };
/** Hoodie front: the kangaroo pocket covers the bottom ≈ 30 % of the print area. */
export const ZONE_HOOD_FRONT: Zone = { l: 0.06, t: 0.04, r: 0.06, b: 0.28, label: "frontal sudadera (bolsillo)" };
/**
 * Garment back: the yoke seam and shoulder blades. Big back numbers at 8 % margins reached the side seams on
 * model photos (smaller sizes), so tees and sweatshirts keep 14 % each side (hoodies have their own zone).
 */
export const ZONE_BACK: Zone = { l: 0.14, t: 0.05, r: 0.14, b: 0.05, label: "espalda" };
/** Hoodie back: the hood falls over the top of the back print area. */
export const ZONE_HOOD_BACK: Zone = { l: 0.08, t: 0.1, r: 0.08, b: 0.05, label: "espalda sudadera (capucha)" };
/** All-over panels: the panel is cover-cropped to the provider's shape and sewn — keep marks well inside. */
export const ZONE_COVER: Zone = { l: 0.12, t: 0.12, r: 0.12, b: 0.1, label: "panel sublimado" };

/** Kids' garments: the print area is wide for a small body; big prints ran into the sleeves on child models. */
export const ZONE_KIDS_FRONT: Zone = { l: 0.12, t: 0.05, r: 0.12, b: 0.08, label: "frontal infantil" };
// kids' backs: Printful's youth back print area reaches almost to the side seams of a small tee, so names and
// numbers stay in the middle 56 % (they looked cut at the sides at 66 %)
export const ZONE_KIDS_BACK: Zone = { l: 0.22, t: 0.08, r: 0.22, b: 0.12, label: "espalda infantil" };
export const ZONE_KIDS_HOOD_FRONT: Zone = { l: 0.14, t: 0.05, r: 0.14, b: 0.3, label: "frontal sudadera infantil (bolsillo)" };
export const ZONE_KIDS_HOOD_BACK: Zone = { l: 0.17, t: 0.12, r: 0.17, b: 0.1, label: "espalda sudadera infantil (capucha)" };

/**
 * All-over sports jersey: the sublimated panel is much wider than the back you actually see (it wraps round the
 * sides and under the arms) and the collar eats its top, so names and numbers keep well inside the centre.
 */
export const ZONE_JERSEY_BACK: Zone = { l: 0.31, t: 0.24, r: 0.31, b: 0.16, label: "espalda camiseta deportiva (panel envolvente)" };
export const ZONE_JERSEY_FRONT: Zone = { l: 0.24, t: 0.18, r: 0.24, b: 0.14, label: "frontal camiseta deportiva (panel envolvente)" };

export const HOODIES = new Set<BlueprintKey>(["hoodie", "kidshoodie", "hoodieoversize"]);
export const KIDS = new Set<BlueprintKey>(["kids", "kidshoodie", "toddler", "baby"]);

/** Safe zone of a blueprint side, or null when the render mode crops to the content anyway (mugs, posters…). */
export function zoneFor(bp: BlueprintKey, side: "front" | "back" = "front"): Zone | null {
  const mode = BLUEPRINTS[bp]?.renderMode;
  if (mode === "cover") return bp === "jersey" ? (side === "back" ? ZONE_JERSEY_BACK : ZONE_JERSEY_FRONT) : ZONE_COVER;
  if (mode !== "print") return null;
  if (bp === "kidshoodie") return side === "back" ? ZONE_KIDS_HOOD_BACK : ZONE_KIDS_HOOD_FRONT;
  if (KIDS.has(bp)) return side === "back" ? ZONE_KIDS_BACK : ZONE_KIDS_FRONT;
  if (HOODIES.has(bp)) return side === "back" ? ZONE_HOOD_BACK : ZONE_HOOD_FRONT;
  return side === "back" ? ZONE_BACK : ZONE_FRONT;
}

const FM = (metrics as { fonts: Record<string, { asc: number; desc: number; cap: number }> }).fonts;

export function artName(l: Layer): string | null {
  return l.type === "image" && l.path.startsWith("art/") ? l.path.slice(4).replace(/\.png$/, "") : null;
}

/** Real width of one line of text in px (font advances + letter spacing). */
function lineWidth(line: string, font: AnyFontKey, size: number, spacing: number) {
  const chars = [...line];
  return chars.reduce((a, c) => a + advance(c, font) * size, 0) + Math.max(0, chars.length - 1) * spacing;
}

export interface LayerInk extends Box {
  /** Text only: real ink width / layer box width (> 1: the text spills out of its box). */
  overflow?: number;
  /** Text only: cap height in reference-canvas px. */
  cap?: number;
  /** Text only: outline width in reference-canvas px. */
  strokePx?: number;
}

/** Ink box of one layer, normalised to the canvas (x in widths, y in heights). */
export function layerInk(l: Layer): LayerInk {
  const cx = l.x * CW, cy = l.y * CH;
  let pts: [number, number][];
  let extra: Partial<LayerInk> = {};
  if (l.type === "image") {
    const w = l.w * CW, h = w * l.aspect;
    const name = artName(l);
    const ink = (name && INK[name]) || [0, 0, 1, 1];
    const L = cx - w / 2, T = cy - h / 2;
    pts = [
      [L + ink[0] * w, T + ink[1] * h],
      [L + ink[2] * w, T + ink[1] * h],
      [L + ink[2] * w, T + ink[3] * h],
      [L + ink[0] * w, T + ink[3] * h],
    ];
  } else {
    const box = layoutText(l, CW);
    const fm = FM[l.font] ?? { asc: 950, desc: -250, cap: 720 };
    const s = box.size;
    const lines = linesOf(l.text);
    const realW = Math.max(...lines.map((ln) => lineWidth(ln, l.font, s, box.spacing)));
    const grow = (l.stroke?.width ?? 0) * s;
    const sh = l.shadow ? { x: l.shadow.x * s, y: l.shadow.y * s, b: l.shadow.blur * s } : { x: 0, y: 0, b: 0 };
    let x0: number, x1: number, y0: number, y1: number;
    if (box.glyphs) {
      x0 = cx - box.width / 2;
      x1 = cx + box.width / 2;
      y0 = cy - box.height / 2;
      y1 = cy + box.height / 2;
    } else {
      const align = l.align ?? "center";
      const left = align === "left" ? cx - box.width / 2 : align === "right" ? cx + box.width / 2 - realW : cx - realW / 2;
      x0 = left;
      x1 = left + realW;
      const lineH = s * box.lineHeight;
      const top0 = cy - box.height / 2 + (box.height - lineH * lines.length) / 2;
      const content = ((fm.asc - fm.desc) / 1000) * s;
      const base0 = top0 + (lineH - content) / 2 + (fm.asc / 1000) * s; // baseline of the first line
      // accents on capitals (Ñ, Ó…) rise above the ascender line in condensed display faces
      const accented = /[ÁÉÍÓÚÑÜÀÈÌÒÙ]/.test(l.text);
      const tall = /[a-zà-ÿ0-9¡¿'"“”‘’]/.test(l.text);
      const deep = /[gjpqyJQ,;Ç]/.test(l.text);
      const pad = 0.06 * s; // antialiasing and rasteriser differences
      y0 = base0 - (accented ? fm.cap + 240 : tall ? Math.max(fm.cap, fm.asc * 0.82) : fm.cap) / 1000 * s - pad;
      y1 = base0 + (lines.length - 1) * lineH + (deep ? (-fm.desc / 1000) * s * 0.9 : 0.02 * s) + pad;
    }
    x0 -= grow + Math.max(0, -sh.x) + sh.b;
    x1 += grow + Math.max(0, sh.x) + sh.b;
    y0 -= grow + Math.max(0, -sh.y) + sh.b;
    y1 += grow + Math.max(0, sh.y) + sh.b;
    pts = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
    extra = { overflow: box.glyphs ? 1 : realW / Math.max(1, box.width), cap: (fm.cap / 1000) * s, strokePx: grow || undefined };
  }
  if (l.rotation) {
    const a = (l.rotation * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    pts = pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * sn, cy + (x - cx) * sn + (y - cy) * c]);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs) / CW, y0: Math.min(...ys) / CH, x1: Math.max(...xs) / CW, y1: Math.max(...ys) / CH, ...extra };
}

/** Union ink box of a set of layers (null when empty). */
export function inkBox(layers: Layer[]): Box | null {
  if (!layers.length) return null;
  const bs = layers.map(layerInk);
  return { x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)), x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)) };
}

/** Margins of a box inside the canvas (negative = beyond the edge). */
export function margins(b: Box) {
  return { l: b.x0, t: b.y0, r: 1 - b.x1, b: 1 - b.y1 };
}

const EPS = 0.0005;
export function insideZone(b: Box, z: Zone) {
  const m = margins(b);
  return m.l >= z.l - EPS && m.t >= z.t - EPS && m.r >= z.r - EPS && m.b >= z.b - EPS;
}

const r4 = (v: number) => Math.round(v * 10000) / 10000;

/**
 * Fit layers into a safe zone: unchanged when their ink already sits inside it; otherwise scaled down
 * uniformly (never up) and moved so the ink box is inside — horizontal centre and top kept where they fit.
 * `keep` leading layers are left alone (the full-bleed pattern of an all-over panel).
 */
export function fitLayers(layers: Layer[], zone: Zone | null, keep = 0): Layer[] {
  if (!zone) return layers;
  const fixed = layers.slice(0, keep), rest = layers.slice(keep);
  const b = inkBox(rest);
  if (!b || insideZone(b, zone)) return layers;
  const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  // uniform scale in px: x fractions (of CW) and y fractions (of CH) shrink by the same factor
  const s = Math.min(1, (1 - zone.l - zone.r) / bw, (1 - zone.t - zone.b) / bh);
  const nw = bw * s, nh = bh * s;
  const cx = Math.min(Math.max((b.x0 + b.x1) / 2, zone.l + nw / 2), 1 - zone.r - nw / 2);
  const nx0 = cx - nw / 2;
  const ny0 = Math.min(Math.max(b.y0, zone.t), 1 - zone.b - nh);
  const moved = rest.map((l) => ({ ...l, x: r4(nx0 + (l.x - b.x0) * s), y: r4(ny0 + (l.y - b.y0) * s), w: r4(l.w * s) }) as Layer);
  return [...fixed, ...moved];
}

/** The layers a product of blueprint `bp` actually prints on `side`. */
export function effectiveLayers(design: Pick<Design, "layers" | "back">, bp: BlueprintKey, side: "front" | "back" = "front"): Layer[] {
  const layers = side === "back" ? (design.back ?? []) : design.layers;
  const mode = BLUEPRINTS[bp]?.renderMode;
  return fitLayers(layers, zoneFor(bp, side), mode === "cover" ? 1 : 0);
}

function stripIds(layers: Layer[]) {
  return layers.map((l) => {
    const { id: _id, ...rest } = l as Layer & { id: string };
    void _id;
    return rest;
  });
}

/**
 * Version of what product `p:<design>:<bp>` prints: effective layers (front and back), poster background,
 * render mode, content hash of every static illustration it uses and the render revision.
 * `legacy` hashes the raw layers (the renderer before safe zones) — used only to compute the baseline.
 */
export function designVersion(design: Pick<Design, "layers" | "back" | "posterBg" | "tone">, bp: BlueprintKey, opts: { legacy?: boolean } = {}): string {
  const mode = BLUEPRINTS[bp]?.renderMode ?? "print";
  const twoSided = !!design.back?.length && (mode === "print" || mode === "cover");
  const front = opts.legacy ? design.layers : effectiveLayers(design, bp, "front");
  const back = twoSided ? (opts.legacy ? design.back! : effectiveLayers(design, bp, "back")) : null;
  const arts = [...new Set([...front, ...(back ?? [])].map(artName).filter((n): n is string => !!n))].sort().map((n) => `${n}:${INK[n]?.[4] ?? "remote"}`);
  const payload = JSON.stringify({ r: RENDER_REV, ...(KIDS.has(bp) && !opts.legacy ? { k: KIDS_REV } : {}), m: mode, f: stripIds(front), b: back && stripIds(back), bg: design.posterBg ?? null, t: design.tone, a: arts });
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

/* ───────────────────────── geometric audit ───────────────────────── */

/** Physical width (in) of each blueprint's print area — for minimum readable sizes. */
const PRINT_WIDTH_IN: Partial<Record<BlueprintKey, number>> = { kids: 10, kidshoodie: 9, toddler: 8, baby: 6, womtee: 11, womsweat: 11, womcrop: 10 };

export type FlagCode = "EDGE" | "HOOD" | "POCKET" | "TEXT_OVERFLOW" | "THIN_TEXT" | "THIN_STROKE";
export interface Flag {
  code: FlagCode;
  side: "front" | "back";
  bp: BlueprintKey;
  detail: string;
}

/** Minimum edge margin before a design counts as touching the print-area edge. */
export const EDGE_MIN = 0.04;
/** Smallest cap height (mm, as printed) that still reads cleanly in DTG. */
export const MIN_CAP_MM = 2.5;
/** Thinnest text outline (mm, as printed) that prints as a solid line. */
export const MIN_STROKE_MM = 0.35;

const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const meet = (a: Box, b: Box): Box => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });

/**
 * Audit of what each print / all-over product of a design prints, per side:
 *  EDGE          ink closer than 4 % to the print-area edge (seams)
 *  HOOD / POCKET a hoodie back starting under the hood seam (top 10 %) / big art running into the pocket
 *  TEXT_OVERFLOW text wider than its box that runs into another element (the box alone would not)
 *  THIN_TEXT     text under 2.5 mm cap height as printed on that garment
 *  THIN_STROKE   a text outline under 0.35 mm as printed
 * `effective: false` audits the raw layers (the renderer before safe zones); `true` audits the layers
 * after `effectiveLayers` — what is printed today. One flag per code / side / zone kind.
 */
export function auditDesign(design: Pick<Design, "slug" | "layers" | "back">, products: BlueprintKey[], opts: { effective?: boolean } = {}): Flag[] {
  const flags: Flag[] = [];
  const seen = new Set<string>();
  const push = (f: Flag, kind: string) => {
    const k = `${f.code}|${f.side}|${kind}`;
    if (seen.has(k)) return;
    seen.add(k);
    flags.push(f);
  };
  const printBps = products.filter((bp) => BLUEPRINTS[bp]?.renderMode === "print" || BLUEPRINTS[bp]?.renderMode === "cover");
  for (const side of ["front", "back"] as const) {
    if (side === "back" && !design.back?.length) continue;
    for (const bp of printBps) {
      const cover = BLUEPRINTS[bp].renderMode === "cover";
      const hoodie = HOODIES.has(bp);
      const kind = cover ? "cover" : hoodie ? "hoodie" : "garment";
      const all = opts.effective ? effectiveLayers(design, bp, side) : side === "back" ? design.back! : design.layers;
      const layers = cover ? all.slice(1) : all;
      const b = inkBox(layers);
      if (!b) continue;
      const m = margins(b);
      const min = cover ? ZONE_COVER : { l: EDGE_MIN, t: EDGE_MIN, r: EDGE_MIN, b: EDGE_MIN };
      const tight = (["l", "t", "r", "b"] as const).filter((k) => m[k] < min[k] - EPS).map((k) => `${k}=${(m[k] * 100).toFixed(1)}%`);
      if (tight.length) push({ code: "EDGE", side, bp, detail: `margen < ${cover ? "zona del panel" : `${EDGE_MIN * 100}%`}: ${tight.join(" ")}` }, kind);
      if (hoodie && side === "back" && m.t < ZONE_HOOD_BACK.t - EPS) push({ code: "HOOD", side, bp, detail: `arranca al ${(m.t * 100).toFixed(1)}% (capucha: < ${ZONE_HOOD_BACK.t * 100}%)` }, kind);
      if (hoodie && side === "front" && 1 - m.b > 1 - ZONE_HOOD_FRONT.b + EPS && b.y1 - b.y0 > 0.3)
        push({ code: "POCKET", side, bp, detail: `llega al ${((1 - m.b) * 100).toFixed(0)}% del alto (bolsillo desde el ${(100 - ZONE_HOOD_FRONT.b * 100).toFixed(0)}%)` }, kind);
      const inks = layers.map(layerInk);
      const mmPerPx = ((PRINT_WIDTH_IN[bp] ?? 12) * 25.4) / CW;
      layers.forEach((l, i) => {
        if (l.type !== "text") return;
        const ink = inks[i];
        const label = `«${l.text.replace(/\n/g, " ")}»`;
        if ((ink.overflow ?? 1) > 1.04) {
          // nominal box: the same ink, as wide as the layer box
          const cx = (ink.x0 + ink.x1) / 2, half = (ink.x1 - ink.x0) / 2 / (ink.overflow ?? 1);
          const nominal: Box = { ...ink, x0: cx - half, x1: cx + half };
          const hit = inks.some((o, j) => j !== i && area(meet(ink, o)) > area(meet(nominal, o)) + 0.002 * area(ink));
          if (hit) push({ code: "TEXT_OVERFLOW", side, bp, detail: `${label} ocupa ${Math.round((ink.overflow ?? 1) * 100)}% de su caja y pisa otro elemento` }, kind);
        }
        const capMm = (ink.cap ?? 0) * mmPerPx;
        if (capMm < MIN_CAP_MM) push({ code: "THIN_TEXT", side, bp, detail: `${label} mide ${capMm.toFixed(1)} mm de alto en ${bp}` }, `${kind}:${bp}`);
        if (ink.strokePx && ink.strokePx * mmPerPx < MIN_STROKE_MM) push({ code: "THIN_STROKE", side, bp, detail: `contorno de ${label}: ${(ink.strokePx * mmPerPx).toFixed(2)} mm en ${bp}` }, `${kind}:${bp}`);
      });
    }
  }
  return flags;
}

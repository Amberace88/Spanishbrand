/**
 * Ready-made designer templates. Each template is a vertical stack of text items laid out for the
 * current print-area ratio (tall towel, square cushion, wide cap…) with the same text metrics the
 * renderer uses, so they never overlap and always fit the printable area.
 */
import { layoutText } from "@/lib/personalization/artwork";
import type { AnyFontKey, Layer, TextLayer } from "@/lib/personalization/types";

export type TplColor = "ink" | "accent" | "soft";
export interface TplItem {
  text: string;
  font: AnyFontKey;
  w: number;
  color: TplColor;
  spacing?: number;
  arc?: number;
  lineHeight?: number;
  outline?: boolean;
  shadow?: boolean;
}
export interface Template {
  key: string;
  label: string;
  desc: string;
  /** What the customer's own text replaces (shown as the input label). */
  field: string;
  sample: string;
  /** Prefer the back of a garment (football name + number). */
  back?: boolean;
  /** Stack anchored to the top of the area (chest / shoulders) instead of centred. */
  top?: boolean;
  build: (name: string) => TplItem[];
}

const up = (s: string) => s.toLocaleUpperCase("es-ES");

export const TEMPLATES: Template[] = [
  {
    key: "dorsal",
    label: "Nombre + número",
    desc: "Estilo camiseta de fútbol, a la espalda",
    field: "Nombre",
    sample: "GARCÍA",
    back: true,
    top: true,
    build: (name) => [
      { text: up(name).slice(0, 14), font: "sport", w: Math.min(0.72, 0.1 * Math.max(4, name.length)), color: "ink", spacing: 0.06 },
      { text: "10", font: "sport", w: 0.44, color: "ink", outline: true },
    ],
  },
  {
    key: "familia",
    label: "Familia García desde 1985",
    desc: "Escudo familiar con año",
    field: "Apellido",
    sample: "García",
    build: (name) => [
      { text: "FAMILIA", font: "sans", w: 0.34, color: "soft", spacing: 0.35 },
      { text: name.slice(0, 16), font: "elegant", w: Math.min(0.86, 0.13 * Math.max(4, name.length)), color: "ink", shadow: true },
      { text: "DESDE 1985", font: "serif", w: 0.46, color: "accent", spacing: 0.18 },
    ],
  },
  {
    key: "pena",
    label: "Peña / grupo",
    desc: "Para la peña, el equipo o la cuadrilla",
    field: "Nombre de la peña",
    sample: "Los del Barrio",
    build: (name) => [
      { text: "PEÑA", font: "varsity", w: 0.5, color: "accent", arc: 70 },
      { text: up(name).slice(0, 18), font: "varsity", w: Math.min(0.92, 0.075 * Math.max(6, name.length)), color: "ink", outline: true },
      { text: "· EST. 2026 ·", font: "mono", w: 0.46, color: "soft", spacing: 0.08 },
    ],
  },
  {
    key: "despedida",
    label: "Despedida de soltero/a",
    desc: "Team novia / team novio",
    field: "Nombre",
    sample: "Laura",
    build: (name) => [
      { text: "DESPEDIDA", font: "sport", w: 0.8, color: "ink", spacing: 0.04 },
      { text: `de ${name.slice(0, 14)}`, font: "script", w: Math.min(0.78, 0.09 * Math.max(5, name.length + 3)), color: "accent" },
      { text: "TEAM NOVIA · 2026", font: "mono", w: 0.56, color: "soft", spacing: 0.1 },
    ],
  },
  {
    key: "abuelo",
    label: "Abuelo / abuela",
    desc: "El mejor regalo para los abuelos",
    field: "Abuelo o abuela",
    sample: "Abuela",
    build: (name) => [
      { text: "LA MEJOR", font: "sans", w: 0.42, color: "soft", spacing: 0.3 },
      { text: name.slice(0, 14), font: "script", w: Math.min(0.84, 0.13 * Math.max(4, name.length)), color: "accent" },
      { text: "DEL MUNDO", font: "sans", w: 0.46, color: "soft", spacing: 0.3 },
    ],
  },
  {
    key: "fecha",
    label: "Fecha especial",
    desc: "Boda, nacimiento, aniversario…",
    field: "Nombres",
    sample: "Laura & Pablo",
    build: (name) => [
      { text: up(name).slice(0, 20), font: "serif", w: Math.min(0.82, 0.055 * Math.max(8, name.length)), color: "ink", spacing: 0.12 },
      { text: "Nuestro día", font: "elegant", w: 0.56, color: "accent" },
      { text: "12 · 10 · 2026", font: "mono", w: 0.52, color: "soft", spacing: 0.06 },
    ],
  },
  {
    key: "pueblo",
    label: "Orgullo de mi pueblo",
    desc: "Tu pueblo o tu ciudad",
    field: "Pueblo o ciudad",
    sample: "Villajoyosa",
    build: (name) => [
      { text: "ORGULLO DE", font: "sans", w: 0.42, color: "soft", spacing: 0.28 },
      { text: up(name).slice(0, 16), font: "serif", w: Math.min(0.9, 0.085 * Math.max(5, name.length)), color: "ink" },
      { text: "DE TODA LA VIDA", font: "sans", w: 0.5, color: "accent", spacing: 0.2 },
    ],
  },
];

export interface Palette {
  ink: string;
  accent: string;
  soft: string;
  contrast: string;
}

/** Ink set that reads on the product (dark garment → cream/gold, light → black/red). */
export function paletteFor(dark: boolean): Palette {
  return dark ? { ink: "#f3ead7", accent: "#e0b84a", soft: "#d8cdb8", contrast: "#a3162b" } : { ink: "#141414", accent: "#a3162b", soft: "#4a4238", contrast: "#e0b84a" };
}

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Move a design from one print-area ratio to another (tee → mug, poster → cap…): the content keeps its
 * proportions and is scaled down only if it no longer fits, centred where it was.
 */
export function refit(layers: Layer[], from: number, to: number): Layer[] {
  if (!layers.length || Math.abs(from - to) < 0.01) return layers;
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (const l of layers) {
    const h = l.type === "image" ? l.w * l.aspect : layoutText(l, 1000).height / 1000;
    const cy = l.y * from;
    y0 = Math.min(y0, cy - h / 2);
    y1 = Math.max(y1, cy + h / 2);
    x0 = Math.min(x0, l.x - l.w / 2);
    x1 = Math.max(x1, l.x + l.w / 2);
  }
  const bh = y1 - y0, bw = x1 - x0;
  const s = Math.min(1, (to * 0.9) / bh, 0.96 / bw);
  const cyFrom = (y0 + y1) / 2;
  const cyTo = Math.min(Math.max(cyFrom, (bh * s) / 2 + to * 0.05), to - (bh * s) / 2 - to * 0.05);
  return layers.map((l) => ({ ...l, w: +(l.w * s).toFixed(4), x: +(0.5 + (l.x - 0.5) * s).toFixed(4), y: +((cyTo + (l.y * from - cyFrom) * s) / to).toFixed(4) }));
}

/** Lay out a vertical stack of text items for a print area of ratio `aspect` (h/w). */
export function stackLayers(items: TplItem[], aspect: number, pal: Palette, opts: { top?: boolean; maxW?: number } = {}): Layer[] {
  const gap = 0.035;
  const maxW = opts.maxW ?? 1;
  let ws = items.map((it) => Math.min(it.w, maxW));
  const heightOf = (it: TplItem, w: number) => layoutText({ text: it.text, font: it.font, w, spacing: it.spacing, lineHeight: it.lineHeight, arc: it.arc }, 1000).height / 1000;
  let hs = items.map((it, i) => heightOf(it, ws[i]));
  let total = hs.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  const avail = aspect * 0.86;
  if (total > avail) {
    const s = avail / total;
    ws = ws.map((w) => w * s);
    hs = items.map((it, i) => heightOf(it, ws[i]));
    total = hs.reduce((a, b) => a + b, 0) + gap * s * (items.length - 1);
  }
  const g = total < avail ? gap : gap * (avail / total);
  let y = opts.top ? Math.min(aspect * 0.08, (aspect - total) / 2) : (aspect - total) / 2;
  return items.map((it, i) => {
    const cy = y + hs[i] / 2;
    y += hs[i] + g;
    const color = pal[it.color];
    const l: TextLayer = { id: uid(), type: "text", text: it.text, font: it.font, color, x: 0.5, y: +(cy / aspect).toFixed(4), w: +ws[i].toFixed(4), rotation: 0 };
    if (it.spacing) l.spacing = it.spacing;
    if (it.arc) l.arc = it.arc;
    if (it.lineHeight) l.lineHeight = it.lineHeight;
    if (it.outline) l.stroke = { color: pal.contrast, width: 0.05 };
    if (it.shadow) l.shadow = { color: pal.contrast, x: 0.035, y: 0.045, blur: 0 };
    return l;
  });
}

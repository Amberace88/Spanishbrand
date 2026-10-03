/**
 * Pure validation + normalisation of customer personalization (no I/O; unit-tested).
 * The server never trusts client data: text is cleaned and length-limited, fonts/colours are
 * enum/regex checked, image layers must point at our own upload area, and coordinates are clamped.
 */
import { createHash } from "node:crypto";
import { assetBase } from "@/lib/catalog/assets";
import artManifest from "@/lib/catalog/art-manifest.json";
import { ALL_FONTS, type AnyFontKey, type Layer, type PersoConfig, type Personalization, type Placement, type TextLayer, type ValidatedPersonalization } from "./types";
import { EMB_MAX_CHARS, KINDS } from "./kinds";

const MAX_LINES = 3;

export type PersoError = "NOT_PERSONALIZABLE" | "MODE_MISMATCH" | "FIELD_REQUIRED" | "FIELD_INVALID" | "TOO_MANY_LAYERS" | "EMPTY_DESIGN" | "BAD_LAYER" | "BAD_PLACEMENT" | "EMB_LIMITS";

const HEX = /^#[0-9a-fA-F]{6}$/;
const UPLOAD_PATH = /^uploads\/[0-9a-f-]{36}(-nobg)?\.(png|jpg|jpeg|webp)$/;
/** Brand-owned motifs from the design library ("Diseña en este estilo"). */
const ART_PATH = /^art\/([a-z0-9-]+)\.png$/;
const MAX_TEXT = 40;

/** Words that send a design to manual review (not an automatic rejection). */
const REVIEW_WORDS = ["puta", "puto", "mierda", "cabron", "cabrón", "joder", "coño", "maricon", "maricón", "nazi", "fuck", "shit", "bitch", "hitler", "real madrid", "barça", "barca", "fc barcelona", "atletico", "atlético", "laliga", "la liga", "rfef", "uefa", "fifa", "nike", "adidas", "puma"];

const clamp = (n: unknown, lo: number, hi: number, d: number) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : d;
  return Math.min(hi, Math.max(lo, v));
};

export function cleanText(s: unknown, max = MAX_TEXT): string {
  if (typeof s !== "string") return "";
  return s
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function flagged(text: string): boolean {
  const t = text.toLowerCase();
  return REVIEW_WORDS.some((w) => t.includes(w));
}

function stableKey(v: unknown): string {
  const json = JSON.stringify(v, (_k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val));
  return createHash("sha256").update(json).digest("hex").slice(0, 32);
}

export function validatePersonalization(
  config: PersoConfig | null | undefined,
  input: unknown,
  opts: { publicUrlFor: (path: string) => string; artBase?: string },
): { ok: true; data: ValidatedPersonalization } | { ok: false; error: PersoError } {
  if (!config) return { ok: false, error: "NOT_PERSONALIZABLE" };
  const raw = (input ?? {}) as Record<string, unknown>;
  if (raw.mode !== config.mode) return { ok: false, error: "MODE_MISMATCH" };

  if (config.mode === "fields") {
    const valuesIn = (raw.values ?? {}) as Record<string, unknown>;
    const values: Record<string, string> = {};
    let review = false;
    for (const f of config.fields) {
      let v = cleanText(valuesIn[f.key], Math.min(f.maxLength, MAX_TEXT));
      if (f.uppercase) v = v.toLocaleUpperCase("es-ES");
      if (!v) {
        if (f.required) return { ok: false, error: "FIELD_REQUIRED" };
        continue;
      }
      if (f.pattern && !new RegExp(f.pattern).test(v)) return { ok: false, error: "FIELD_INVALID" };
      if (flagged(v)) review = true;
      values[f.key] = v;
    }
    if (Object.keys(values).length === 0) return { ok: false, error: "EMPTY_DESIGN" };
    const value: Personalization = { mode: "fields", template: config.template, values };
    return { ok: true, data: { value, key: stableKey(value), needsReview: review, summary: config.fields.filter((f) => values[f.key]).map((f) => `${f.label}: ${values[f.key]}`).join(" · ") } };
  }

  // designer
  let placement: Placement = raw.placement === "back" ? "back" : "front";
  const max = config.maxLayers ?? 8;
  const emb = config.embroidery ?? null;
  const spec = config.kind ? KINDS[config.kind] : undefined;
  const state = { review: false, images: 0 };
  const front = parseLayers(raw.layers, max, emb, opts, state);
  if (!Array.isArray(front)) return { ok: false, error: front.error };
  // optional second side (front + back in one design)
  let back: Layer[] = [];
  if (Array.isArray(raw.back) && raw.back.length > 0 && placement === "front") {
    if (!config.placements.includes("back")) return { ok: false, error: "BAD_PLACEMENT" };
    const b = parseLayers(raw.back, max, emb, opts, state);
    if (!Array.isArray(b)) return { ok: false, error: b.error };
    back = b;
  }
  let layers = front;
  if (layers.length === 0 && back.length > 0) {
    layers = back;
    back = [];
    placement = "back";
  }
  if (!config.placements.includes(placement)) return { ok: false, error: "BAD_PLACEMENT" };
  if (layers.length === 0) return { ok: false, error: "EMPTY_DESIGN" };
  if (emb) {
    const colours = new Set<string>();
    for (const l of [...layers, ...back]) if (l.type === "text") colours.add(l.color);
    if (colours.size > emb.maxColors) return { ok: false, error: "EMB_LIMITS" };
  }
  if (state.images > 0) state.review = true; // uploaded artwork is always checked by a human before printing
  const value: Personalization = { mode: "designer", placement, layers };
  const bg = typeof raw.background === "string" && HEX.test(raw.background) && (spec?.background ?? false) ? raw.background.toLowerCase() : null;
  if (bg) value.background = bg;
  if (back.length) value.back = back;
  const all = [...layers, ...back];
  const texts = all.filter((l): l is TextLayer => l.type === "text").map((l) => `“${l.text.replace(/\n/g, " / ")}”`);
  const images = state.images;
  const side = back.length ? "Frontal + espalda" : placement === "back" ? "Espalda" : "Frontal";
  const summary = [emb ? `Bordado · ${side}` : side, ...texts, images ? `${images} imagen${images > 1 ? "es" : ""}` : "", all.some((l) => l.type === "image" && l.path.startsWith("art/")) ? "arte de la casa" : "", bg ? `fondo ${bg}` : ""].filter(Boolean).join(" · ");
  return { ok: true, data: { value, key: stableKey(value), needsReview: state.review, summary } };
}

const num = (n: unknown) => typeof n === "number" && Number.isFinite(n);

/** Optional text styling (outline, shadow, spacing, curve…): clamped, colours regex-checked. */
function textStyle(o: Record<string, unknown>, emb: EmbroideryRules | null): Partial<TextLayer> | null {
  const out: Partial<TextLayer> = {};
  if (num(o.spacing) && o.spacing !== 0) out.spacing = +clamp(o.spacing, -0.05, 0.5, 0).toFixed(3);
  if (num(o.lineHeight) && o.lineHeight !== 1) out.lineHeight = +clamp(o.lineHeight, 0.8, 1.6, 1).toFixed(2);
  if (o.align === "left" || o.align === "right") out.align = o.align;
  if (num(o.arc) && Math.abs(o.arc as number) >= 4) out.arc = Math.round(clamp(o.arc, -300, 300, 0));
  const st = o.stroke as Record<string, unknown> | undefined;
  if (st && typeof st.color === "string" && HEX.test(st.color) && num(st.width) && (st.width as number) > 0) {
    if (emb) return null; // thin outlines do not stitch
    out.stroke = { color: st.color.toLowerCase(), width: +clamp(st.width, 0.01, 0.15, 0.05).toFixed(3) };
  }
  const sh = o.shadow as Record<string, unknown> | undefined;
  if (sh && typeof sh.color === "string" && HEX.test(sh.color)) {
    if (emb) return null;
    out.shadow = { color: sh.color.toLowerCase(), x: +clamp(sh.x, -0.3, 0.3, 0.05).toFixed(3), y: +clamp(sh.y, -0.3, 0.3, 0.05).toFixed(3), blur: +clamp(sh.blur, 0, 0.5, 0).toFixed(3) };
  }
  return out;
}

type EmbroideryRules = NonNullable<Extract<PersoConfig, { mode: "designer" }>["embroidery"]>;

function parseLayers(input: unknown, max: number, emb: EmbroideryRules | null, opts: { publicUrlFor: (path: string) => string; artBase?: string }, state: { review: boolean; images: number }): Layer[] | { error: PersoError } {
  const layersIn = Array.isArray(input) ? input : [];
  if (layersIn.length > max) return { error: "TOO_MANY_LAYERS" };
  const layers: Layer[] = [];
  for (const [i, l] of layersIn.entries()) {
    const o = (l ?? {}) as Record<string, unknown>;
    const base = { id: cleanText(o.id, 24) || `l${i}`, x: clamp(o.x, 0, 1, 0.5), y: clamp(o.y, 0, 1, 0.5), w: clamp(o.w, 0.05, 1, 0.5), rotation: clamp(o.rotation, -180, 180, 0) };
    if (o.type === "text") {
      // up to 3 lines, each cleaned and limited
      const lines = (typeof o.text === "string" ? o.text : "").split(/\r?\n/).slice(0, MAX_LINES).map((x) => cleanText(x, emb ? EMB_MAX_CHARS : MAX_TEXT));
      while (lines.length && !lines[lines.length - 1]) lines.pop();
      const text = lines.join("\n");
      if (!text.trim()) continue;
      const font = (ALL_FONTS as readonly string[]).includes(o.font as string) ? (o.font as AnyFontKey) : "display";
      const color = typeof o.color === "string" && HEX.test(o.color) ? o.color.toLowerCase() : "#0d0d0d";
      const style = textStyle(o, emb);
      if (emb && (!style || !emb.fonts.includes(font) || !emb.threads.includes(color) || lines.length > 2)) return { error: "EMB_LIMITS" };
      if (flagged(text)) state.review = true;
      layers.push({ ...base, type: "text", text, font, color, ...(style ?? {}) });
    } else if (o.type === "image") {
      if (emb) return { error: "EMB_LIMITS" }; // embroidery: text only
      const path = typeof o.path === "string" ? o.path : "";
      const art = path.match(ART_PATH);
      if (art) {
        const aspect = (artManifest as Record<string, number>)[art[1]];
        if (!aspect) return { error: "BAD_LAYER" };
        layers.push({ ...base, type: "image", path, url: `${opts.artBase ?? assetBase()}/catalog/art/${art[1]}.png`, aspect });
        continue;
      }
      if (!UPLOAD_PATH.test(path)) return { error: "BAD_LAYER" };
      state.images++;
      const px = num(o.px) ? Math.round(clamp(o.px, 1, 20000, 0)) : 0;
      layers.push({ ...base, type: "image", path, url: opts.publicUrlFor(path), aspect: clamp(o.aspect, 0.1, 10, 1), ...(px ? { px } : {}) });
    } else {
      return { error: "BAD_LAYER" };
    }
  }
  return layers;
}

/** Personalisation surcharge; a second printed side adds the product's back price. */
export function extraPriceFor(config: PersoConfig | null | undefined, personalized: boolean, value?: unknown): number {
  if (!config || !personalized) return 0;
  let extra = Number(config.extraPrice || 0);
  if (config.mode === "designer" && config.backPrice && value && typeof value === "object") {
    const back = (value as { back?: unknown }).back;
    if (Array.isArray(back) && back.length > 0) extra += Number(config.backPrice);
  }
  return Math.max(0, Math.round(extra * 100) / 100);
}

/**
 * Pure validation + normalisation of customer personalization (no I/O; unit-tested).
 * The server never trusts client data: text is cleaned and length-limited, fonts/colours are
 * enum/regex checked, image layers must point at our own upload area, and coordinates are clamped.
 */
import { createHash } from "node:crypto";
import { assetBase } from "@/lib/catalog/assets";
import artManifest from "@/lib/catalog/art-manifest.json";
import { FONTS, type FontKey, type Layer, type PersoConfig, type Personalization, type ValidatedPersonalization } from "./types";

export type PersoError = "NOT_PERSONALIZABLE" | "MODE_MISMATCH" | "FIELD_REQUIRED" | "FIELD_INVALID" | "TOO_MANY_LAYERS" | "EMPTY_DESIGN" | "BAD_LAYER" | "BAD_PLACEMENT";

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
  const placement = raw.placement === "back" ? "back" : "front";
  if (!config.placements.includes(placement)) return { ok: false, error: "BAD_PLACEMENT" };
  const layersIn = Array.isArray(raw.layers) ? raw.layers : [];
  const max = config.maxLayers ?? 8;
  if (layersIn.length > max) return { ok: false, error: "TOO_MANY_LAYERS" };
  const layers: Layer[] = [];
  let review = false;
  let images = 0;
  for (const [i, l] of layersIn.entries()) {
    const o = (l ?? {}) as Record<string, unknown>;
    const base = { id: cleanText(o.id, 24) || `l${i}`, x: clamp(o.x, 0, 1, 0.5), y: clamp(o.y, 0, 1, 0.5), w: clamp(o.w, 0.05, 1, 0.5), rotation: clamp(o.rotation, -180, 180, 0) };
    if (o.type === "text") {
      const text = cleanText(o.text);
      if (!text) continue;
      const font = (FONTS as readonly string[]).includes(o.font as string) ? (o.font as FontKey) : "display";
      const color = typeof o.color === "string" && HEX.test(o.color) ? o.color.toLowerCase() : "#0d0d0d";
      if (flagged(text)) review = true;
      layers.push({ ...base, type: "text", text, font, color });
    } else if (o.type === "image") {
      const path = typeof o.path === "string" ? o.path : "";
      const art = path.match(ART_PATH);
      if (art) {
        const aspect = (artManifest as Record<string, number>)[art[1]];
        if (!aspect) return { ok: false, error: "BAD_LAYER" };
        layers.push({ ...base, type: "image", path, url: `${opts.artBase ?? assetBase()}/catalog/art/${art[1]}.png`, aspect });
        continue;
      }
      if (!UPLOAD_PATH.test(path)) return { ok: false, error: "BAD_LAYER" };
      images++;
      layers.push({ ...base, type: "image", path, url: opts.publicUrlFor(path), aspect: clamp(o.aspect, 0.1, 10, 1) });
    } else {
      return { ok: false, error: "BAD_LAYER" };
    }
  }
  if (layers.length === 0) return { ok: false, error: "EMPTY_DESIGN" };
  if (images > 0) review = true; // uploaded artwork is always checked by a human before printing
  const value: Personalization = { mode: "designer", placement, layers };
  const texts = layers.filter((l): l is Extract<Layer, { type: "text" }> => l.type === "text").map((l) => `“${l.text}”`);
  const summary = [placement === "back" ? "Espalda" : "Frontal", ...texts, images ? `${images} imagen${images > 1 ? "es" : ""}` : "", layers.some((l) => l.type === "image" && l.path.startsWith("art/")) ? "arte de la casa" : ""].filter(Boolean).join(" · ");
  return { ok: true, data: { value, key: stableKey(value), needsReview: review, summary } };
}

export function extraPriceFor(config: PersoConfig | null | undefined, personalized: boolean): number {
  if (!config || !personalized) return 0;
  return Math.max(0, Math.round(Number(config.extraPrice || 0) * 100) / 100);
}

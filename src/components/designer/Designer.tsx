"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Artwork, BROWSER_FONTS, FONT_WEIGHT, layoutText } from "@/lib/personalization/artwork";
import { ALL_FONTS, FONT_LABEL, type AnyFontKey, type Layer, type Placement, type TextLayer } from "@/lib/personalization/types";
import { EMB_FONTS, EMB_MAX_CHARS, EMB_MAX_COLORS, KINDS, THREADS, effectiveDpi, kindSpec, type KindSpec } from "@/lib/personalization/kinds";
import { addToCartAction } from "@/app/actions/cart";
import { formatMoney } from "@/lib/format";
import { useT } from "@/components/providers/I18nProvider";
import { Silhouette } from "./Silhouette";
import { ProductPicker, type PickerProduct } from "./ProductPicker";
import { TEMPLATES, paletteFor, refit, stackLayers, type Template } from "./templates";

/** @deprecated kept for older imports — designer kinds now live in kinds.ts */
export type DesignKind = string;

export interface DesignerProduct {
  id: string;
  slug: string;
  name: string;
  kind: string;
  price: number;
  extra: number;
  backPrice: number;
  currency: string;
  placements: Placement[];
  image: string | null;
  embroidery: boolean;
  variants: { id: string; name: string; size: string | null; color: string | null; colorHex: string | null; price: number; available: boolean }[];
}

/** Author illustrations customers can place on any product. */
export interface DesignerArt {
  name: string; // site-art / catalog art name
  label: string;
  aspect: number;
  src: string;
}

export interface DesignerStyle {
  slug: string;
  name: string;
  collection: string;
  tone: "dark" | "light";
  layers: Layer[];
}

export interface DesignerInitial {
  product?: string | null;
  style?: string | null;
  art?: string | null;
  text?: string | null;
  ink?: string | null;
  font?: string | null;
  tpl?: string | null;
}

interface DesignState {
  front: Layer[];
  back: Layer[];
  background: string | null;
}

const PRESET_COLORS = ["#111111", "#ffffff", "#f1e7d3", "#c8102e", "#14213d", "#0f7a3d"];
const INK = ["#e0b84a", "#c99a1e", "#f3ead7", "#ffffff", "#0d0d0d", "#c8102e", "#a3162b", "#ffc400", "#14213d", "#1d3f7a", "#0f7a3d", "#e8a0b4"];
const BACKGROUNDS = ["#fffcf7", "#f3ead7", "#0d0d0d", "#a3162b", "#14213d", "#c99a1e", "#0f7a3d", "#7fb2d9"];
const STORAGE_KEY = "ryg-design-v2";
const MAX_LAYERS = 8;
const RADIUS: Partial<Record<string, number>> = { phone: 0.175, pillow: 0.042, towel: 0.03, blanket: 0.015 };

const uid = () => Math.random().toString(36).slice(2, 10);
const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function isDark(hex: string | null | undefined) {
  if (!hex || !HEX.test(hex)) return false;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

/** Embroidery: thread colours, stitchable fonts, no outline/shadow, ≤ 2 lines. */
function embSafe(layers: Layer[]): Layer[] {
  const thread = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    let best: string = THREADS[0].hex, d0 = Infinity;
    for (const t of THREADS) {
      const m = parseInt(t.hex.slice(1), 16);
      const d = Math.hypot(rgb[0] - ((m >> 16) & 255), rgb[1] - ((m >> 8) & 255), rgb[2] - (m & 255));
      if (d < d0) [best, d0] = [t.hex, d];
    }
    return best;
  };
  const map: Partial<Record<AnyFontKey, AnyFontKey>> = { mono: "varsity", elegant: "serif", sans: "display" };
  return layers
    .filter((l): l is TextLayer => l.type === "text")
    .slice(0, 2)
    .map((l) => {
      const { stroke: _s, shadow: _h, ...rest } = l;
      void _s;
      void _h;
      return { ...rest, font: EMB_FONTS.includes(l.font) ? l.font : (map[l.font] ?? "sport"), color: thread(l.color), text: l.text.split("\n").slice(0, 2).map((x) => x.slice(0, EMB_MAX_CHARS)).join("\n") };
    });
}

export function Designer({ products, styles = [], arts = [], initial = {} }: { products: DesignerProduct[]; styles?: DesignerStyle[]; arts?: DesignerArt[]; initial?: DesignerInitial }) {
  const t = useT();
  const [slug, setSlug] = useState<string | null>(() => (initial.product && products.some((p) => p.slug === initial.product) ? initial.product : (products[0]?.slug ?? null)));
  const product = products.find((p) => p.slug === slug) ?? null;
  const spec: KindSpec = kindSpec(product?.kind ?? "tee");
  const emb = Boolean(product?.embroidery) || spec.layout === "emb";
  const canBack = (product?.placements ?? spec.placements).includes("back");

  const colors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of product?.variants ?? []) if (v.colorHex && HEX.test(v.colorHex) && !seen.has(v.colorHex)) seen.set(v.colorHex, v.color ?? v.colorHex);
    if (seen.size) return [...seen.entries()].map(([hex, name]) => ({ hex, name }));
    return spec.coloured ? PRESET_COLORS.map((hex) => ({ hex, name: hex })) : [];
  }, [product, spec.coloured]);
  const [color, setColor] = useState<string>(colors[0]?.hex ?? "#ffffff");
  const [side, setSide] = useState<Placement>("front");
  const [design, setDesign] = useState<DesignState>({ front: [], back: [], background: null });
  const designRef = useRef(design);
  designRef.current = design;
  const [hist, setHist] = useState<{ past: DesignState[]; future: DesignState[] }>({ past: [], future: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"text" | "templates" | "art" | "image" | "layers">("text");
  const [draft, setDraft] = useState("");
  const [tplName, setTplName] = useState("");
  const [lastFont, setLastFont] = useState<AnyFontKey>("serif");
  const [rights, setRights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [alts, setAlts] = useState<Record<string, { original: { path: string; url: string }; nobg: { path: string; url: string } }>>({});
  const [pending, start] = useTransition();
  const zoneRef = useRef<HTMLDivElement>(null);
  const [zoneW, setZoneW] = useState(200);
  const aspectRef = useRef(spec.aspect);

  const layers = design[side];
  const sel = layers.find((l) => l.id === selected) ?? null;
  const zone = side === "back" && spec.backZone ? spec.backZone : spec.zone;
  const zoneH = zoneW * spec.aspect;
  const dark = spec.background ? isDark(design.background ?? "#fffcf7") : isDark(color);
  const pal = paletteFor(dark);

  /* ───────── history ───────── */
  const histRef = useRef(hist);
  histRef.current = hist;
  const snapshot = useCallback(() => {
    const h = histRef.current;
    if (h.past[h.past.length - 1] === designRef.current) return;
    const next = { past: [...h.past.slice(-60), designRef.current], future: [] };
    histRef.current = next;
    setHist(next);
  }, []);
  const undo = useCallback(() => {
    const h = histRef.current;
    if (!h.past.length) return;
    const prev = h.past[h.past.length - 1];
    const next = { past: h.past.slice(0, -1), future: [designRef.current, ...h.future].slice(0, 60) };
    histRef.current = next;
    setHist(next);
    setDesign(prev);
    setSelected(null);
  }, []);
  const redo = useCallback(() => {
    const h = histRef.current;
    if (!h.future.length) return;
    const nextDesign = h.future[0];
    const next = { past: [...h.past, designRef.current], future: h.future.slice(1) };
    histRef.current = next;
    setHist(next);
    setDesign(nextDesign);
    setSelected(null);
  }, []);
  const setLayers = useCallback((fn: (ls: Layer[]) => Layer[], which?: Placement) => setDesign((d) => ({ ...d, [which ?? side]: fn(d[which ?? side]) })), [side]);
  const update = useCallback((id: string, patch: Partial<Layer>) => setLayers((ls) => ls.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l))), [setLayers]);
  const updateText = (id: string, patch: Partial<TextLayer>) => update(id, patch as Partial<Layer>);

  /* ───────── initial state: URL params → saved draft ───────── */
  useEffect(() => {
    const aspect = spec.aspect;
    const p0 = paletteFor(isDark(colors[0]?.hex ?? "#ffffff"));
    const tpl = initial.tpl ? TEMPLATES.find((x) => x.key === initial.tpl) : null;
    const ink = initial.ink && HEX.test(initial.ink) ? initial.ink.toLowerCase() : null;
    const font = initial.font && (ALL_FONTS as readonly string[]).includes(initial.font) ? (initial.font as AnyFontKey) : null;
    let done = false;
    if (tpl) {
      applyTemplate(tpl, initial.text?.trim() || tpl.sample, { ink, font, silent: true });
      done = true;
    } else if (initial.style) {
      const st = styles.find((x) => x.slug === initial.style);
      if (st) {
        applyStyle(st);
        done = true;
      }
    } else if (initial.art) {
      const a = arts.find((x) => x.name === initial.art);
      if (a) {
        addArt(a, true);
        done = true;
      }
    }
    if (!done && initial.text) {
      const text = initial.text.slice(0, 40);
      const f = font ?? "serif";
      const l: TextLayer = { id: uid(), type: "text", text, font: f, color: ink ?? p0.accent, x: 0.5, y: spec.layout === "garment" ? 0.3 : 0.5, w: 0.72, rotation: 0 };
      setDesign({ front: emb ? embSafe([l]) : [l], back: [], background: null });
      setSelected(l.id);
      setLastFont(f);
      done = true;
    }
    if (!done) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (Array.isArray(d.front)) {
            const from = typeof d.aspect === "number" ? d.aspect : aspect;
            setDesign({ front: refit(d.front, from, aspect), back: Array.isArray(d.back) && canBack ? refit(d.back, from, aspect) : [], background: typeof d.background === "string" ? d.background : null });
          }
          if (!initial.product && d.slug && products.some((p) => p.slug === d.slug)) setSlug(d.slug);
        }
      } catch {}
    }
    // clean one-off params (text, ink…) from the URL, keep the product
    if (initial.text || initial.tpl || initial.ink || initial.font) {
      try {
        const u = new URL(window.location.href);
        ["texto", "tinta", "font", "tpl"].forEach((k) => u.searchParams.delete(k));
        window.history.replaceState(null, "", u.pathname + (u.search || ""));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...design, slug, aspect: spec.aspect }));
    } catch {}
  }, [design, slug, spec.aspect]);

  // product switch: keep the design, refit it to the new print-area ratio, respect embroidery limits
  useEffect(() => {
    const from = aspectRef.current;
    aspectRef.current = spec.aspect;
    setDesign((d) => {
      let front = refit(d.front, from, spec.aspect);
      let back = canBack ? refit(d.back, from, spec.aspect) : [];
      if (emb) {
        front = embSafe(front);
        back = [];
      }
      return { front, back, background: spec.background ? d.background : null };
    });
    if (!canBack) setSide("front");
    if (emb && (tab === "art" || tab === "image")) setTab("text");
    setSize(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!colors.some((c) => c.hex === color)) setColor(colors[0]?.hex ?? "#ffffff");
  }, [colors, color]);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setZoneW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [slug, side]);

  const selectProduct = (s: string) => {
    setSlug(s);
    setSelected(null);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("p", s);
      window.history.replaceState(null, "", `${u.pathname}?${u.searchParams.toString()}`);
    } catch {}
  };

  /* ───────── actions ───────── */
  function applyTemplate(tpl: Template, name: string, opts: { ink?: string | null; font?: AnyFontKey | null; silent?: boolean } = {}) {
    snapshot();
    const toBack = Boolean(tpl.back && canBack);
    const p = paletteFor(spec.background ? isDark(designRef.current.background ?? "#fffcf7") : isDark(color));
    if (opts.ink) p.ink = opts.ink;
    let ls = stackLayers(tpl.build(name), spec.aspect, p, { top: spec.layout === "garment" });
    if (opts.font) ls = ls.map((l, i) => (i === (tpl.key === "dorsal" ? 0 : 1) && l.type === "text" ? { ...l, font: opts.font! } : l));
    if (emb) ls = embSafe(ls);
    setDesign((d) => ({ ...d, [toBack ? "back" : "front"]: ls }));
    setSide(toBack ? "back" : "front");
    setSelected(ls[0]?.id ?? null);
    if (!opts.silent) setNotice(t("designer.tplLoaded", { name: tpl.label }));
  }

  function applyStyle(st: DesignerStyle) {
    snapshot();
    let ls = refit(st.layers.map((l) => ({ ...l, id: uid() })), 4 / 3, spec.aspect);
    if (emb) ls = embSafe(ls);
    setDesign((d) => ({ ...d, front: ls }));
    setSelected(null);
    setSide("front");
    if (spec.coloured) {
      const want = st.tone === "dark" ? ["#111111", "#0c0c0c", "#000000", "#14213d"] : ["#ffffff", "#f1e7d3", "#fafafa"];
      const hit = colors.find((c) => want.includes(c.hex.toLowerCase())) ?? (st.tone === "dark" ? colors.find((c) => isDark(c.hex)) : colors.find((c) => !isDark(c.hex)));
      if (hit) setColor(hit.hex);
    } else if (spec.background) {
      setDesign((d) => ({ ...d, background: st.tone === "dark" ? "#0d0d0d" : "#f3ead7" }));
    }
    setNotice(t("designer.styleLoaded", { name: st.name }));
  }

  // place an author illustration big in the print area (drawn for light grounds)
  function addArt(a: DesignerArt, replace = false) {
    if (emb) return;
    snapshot();
    const w = +Math.min(0.9, (spec.aspect * 0.72) / a.aspect).toFixed(3);
    const l: Layer = { id: uid(), type: "image", path: `art/${a.name}.png`, url: a.src, aspect: a.aspect, x: 0.5, y: spec.layout === "garment" ? Math.min(0.45, 0.5) : 0.5, w, rotation: 0 };
    setLayers((ls) => (replace ? [l] : [...ls, l].slice(0, MAX_LAYERS)));
    setSelected(l.id);
    if (spec.coloured && isDark(color)) {
      const light = colors.find((c) => ["#ffffff", "#fafafa", "#f1e7d3"].includes(c.hex.toLowerCase())) ?? colors.find((c) => !isDark(c.hex));
      if (light) setColor(light.hex);
    }
    setNotice(t("designer.artAdded", { name: a.label }));
  }

  const maxLayers = emb ? 2 : MAX_LAYERS;
  const addText = (text0?: string, font0?: AnyFontKey) => {
    const text = (text0 ?? draft).trim().slice(0, emb ? EMB_MAX_CHARS : 40);
    if (!text) return;
    if (layers.length >= maxLayers) return setNotice(t("designer.maxLayers", { n: maxLayers }));
    snapshot();
    const font = font0 ?? (emb && !EMB_FONTS.includes(lastFont) ? "sport" : lastFont);
    const ink = emb ? (dark ? "#ffcc00" : "#000000") : pal.accent;
    const y = layers.length ? clamp(Math.max(...layers.map((l) => l.y)) + 0.16, 0.15, 0.85) : spec.layout === "garment" ? 0.3 : 0.5;
    const l: TextLayer = { id: uid(), type: "text", text, font, color: ink, x: 0.5, y, w: Math.min(0.8, 0.1 * Math.max(4, text.length)), rotation: 0 };
    setLayers((ls) => [...ls, l]);
    setSelected(l.id);
    setDraft("");
    setTab("text");
  };

  const remove = (id: string) => {
    snapshot();
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setSelected(null);
  };
  const duplicate = (id: string) => {
    const l = layers.find((x) => x.id === id);
    if (!l || layers.length >= maxLayers) return;
    snapshot();
    const c = { ...l, id: uid(), x: clamp(l.x + 0.04, 0, 1), y: clamp(l.y + 0.04, 0, 1) };
    setLayers((ls) => [...ls, c]);
    setSelected(c.id);
  };
  const move = (id: string, dir: -1 | 1) => {
    snapshot();
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const c = [...ls];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  };

  const upload = async (file: File) => {
    if (!rights) return setNotice(t("designer.rightsFirst"));
    if (layers.length >= maxLayers) return setNotice(t("designer.maxLayers", { n: maxLayers }));
    setUploading(true);
    setNotice(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("rights", "yes");
    const res = await fetch("/api/designer/upload", { method: "POST", body: fd }).catch(() => null);
    setUploading(false);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) return setNotice(t(`designer.err.${body.error ?? "BAD_IMAGE"}` as never) || t("common.error"));
    snapshot();
    const nobg = body.nobg as { path: string; url: string } | null;
    const w = +Math.min(0.7, (spec.aspect * 0.7) / body.aspect).toFixed(3);
    const l: Layer = { id: uid(), type: "image", path: nobg ? nobg.path : body.path, url: nobg ? nobg.url : body.url, aspect: body.aspect, px: body.width, x: 0.5, y: spec.layout === "garment" ? 0.42 : 0.5, w, rotation: 0 };
    if (nobg) setAlts((a) => ({ ...a, [l.id]: { original: { path: body.path, url: body.url }, nobg: { path: nobg.path, url: nobg.url } } }));
    setLayers((ls) => [...ls, l].slice(0, MAX_LAYERS));
    setSelected(l.id);
    setNotice(nobg ? t("designer.bgRemoved") : null);
  };

  /* ───────── pointer: move / scale / rotate with centre snapping ───────── */
  const drag = useRef<{ id: string; mode: "move" | "scale" | "rotate"; sx: number; sy: number; l: Layer; cx: number; cy: number } | null>(null);
  const onDown = (e: React.PointerEvent, l: Layer, mode: "move" | "scale" | "rotate") => {
    e.stopPropagation();
    const z = zoneRef.current!.getBoundingClientRect();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelected(l.id);
    snapshot();
    drag.current = { id: l.id, mode, sx: e.clientX, sy: e.clientY, l, cx: z.left + l.x * z.width, cy: z.top + l.y * z.height };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const z = zoneRef.current!.getBoundingClientRect();
    if (d.mode === "move") {
      let x = clamp(d.l.x + (e.clientX - d.sx) / z.width, 0, 1);
      let y = clamp(d.l.y + (e.clientY - d.sy) / z.height, 0, 1);
      const sv = Math.abs(x - 0.5) < 8 / z.width, sh = Math.abs(y - 0.5) < 8 / z.height;
      if (sv) x = 0.5;
      if (sh) y = 0.5;
      setGuides({ v: sv, h: sh });
      update(d.id, { x, y });
    } else if (d.mode === "scale") {
      const d0 = Math.hypot(d.sx - d.cx, d.sy - d.cy) || 1;
      const d1 = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
      update(d.id, { w: clamp(d.l.w * (d1 / d0), 0.06, 1) });
    } else {
      let a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI + 90;
      a = ((a + 540) % 360) - 180;
      for (const s of [-180, -90, 0, 90, 180]) if (Math.abs(a - s) < 4) a = s;
      update(d.id, { rotation: Math.round(a) });
    }
  };
  const onUp = () => {
    drag.current = null;
    setGuides({ v: false, h: false });
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return e.shiftKey ? redo() : undo();
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        return redo();
      }
      if (!sel) return;
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        return duplicate(sel.id);
      }
      const step = e.shiftKey ? 0.05 : 0.01;
      if (e.key === "Delete" || e.key === "Backspace") remove(sel.id);
      if (e.key === "ArrowLeft") update(sel.id, { x: clamp(sel.x - step, 0, 1) });
      if (e.key === "ArrowRight") update(sel.id, { x: clamp(sel.x + step, 0, 1) });
      if (e.key === "ArrowUp") update(sel.id, { y: clamp(sel.y - step, 0, 1) });
      if (e.key === "ArrowDown") update(sel.id, { y: clamp(sel.y + step, 0, 1) });
      if (e.key.startsWith("Arrow")) e.preventDefault();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, update, undo, redo]);

  /* ───────── price / cart ───────── */
  const twoSided = design.front.length > 0 && design.back.length > 0;
  const variantsForColor = (product?.variants ?? []).filter((v) => !spec.coloured || !v.colorHex || v.colorHex === color);
  // garments: size (colour is picked on the canvas); other products: every option (size, frame, model…)
  const labelOf = (v: { size: string | null; color: string | null; name: string }) => (spec.coloured ? (v.size ?? v.name) : [v.size, v.color].filter(Boolean).join(" · ") || v.name);
  useEffect(() => {
    const avail = variantsForColor.filter((v) => v.available);
    if (avail.length === 1) setSize(labelOf(avail[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, color]);
  const variant = variantsForColor.find((v) => labelOf(v) === size) ?? null;
  const basePrice = variant?.price ?? Math.min(...(variantsForColor.length ? variantsForColor.map((v) => v.price) : [product?.price ?? 0]));
  const extra = (product?.extra ?? 0) + (twoSided ? (product?.backPrice ?? 0) : 0);
  const price = basePrice + extra;
  const allLayers = [...design.front, ...design.back];
  const hasUploads = allLayers.some((l) => l.type === "image" && !l.path.startsWith("art/"));
  const threadCount = emb ? new Set(allLayers.filter((l): l is TextLayer => l.type === "text").map((l) => l.color)).size : 0;
  const embOver = emb && threadCount > EMB_MAX_COLORS;

  const addToCart = () => {
    if (!product || !variant || !allLayers.length || embOver) return;
    start(async () => {
      const payload = {
        mode: "designer" as const,
        placement: design.front.length ? ("front" as const) : ("back" as const),
        layers: design.front.length ? design.front : design.back,
        ...(design.front.length && design.back.length ? { back: design.back } : {}),
        ...(spec.background && design.background ? { background: design.background } : {}),
      };
      const res = await addToCartAction(variant.id, 1, payload);
      setNotice(res.ok ? t("designer.added") : t("common.error"));
    });
  };

  const pickerProducts: PickerProduct[] = useMemo(
    () =>
      products.map((p) => ({
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        from: Math.min(...(p.variants.length ? p.variants.map((v) => v.price) : [p.price])) + p.extra,
        currency: p.currency,
        image: p.image,
        twoSided: p.placements.includes("back"),
        embroidery: p.embroidery || KINDS[p.kind]?.layout === "emb",
      })),
    [products],
  );

  const inks = emb ? THREADS.map((x) => x.hex as string) : INK;
  const fonts: AnyFontKey[] = emb ? EMB_FONTS : [...ALL_FONTS];
  const tabs = (emb ? ["text", "templates", "layers"] : ["text", "templates", "art", "image", "layers"]) as (typeof tab)[];
  const radius = (RADIUS[spec.silhouette] ?? 0) * zoneW;
  const faceBg = spec.background ? (design.background ?? "#fffcf7") : "transparent";
  const showsBack = canBack;

  return (
    <div className="space-y-6">
      {products.length > 0 && <ProductPicker products={pickerProducts} selected={slug} onSelect={selectProduct} />}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        {/* ───────── Canvas ───────── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-[2rem] bg-surface-2 p-3 sm:p-6" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerDown={() => setSelected(null)}>
            <div className="azulejo-line pointer-events-none absolute inset-0 opacity-25" aria-hidden />
            {/* toolbar */}
            <div className="relative z-10 flex items-center justify-between gap-2" onPointerDown={(e) => e.stopPropagation()}>
              <div className="flex gap-1">
                <ToolBtn label={t("designer.undo")} disabled={!hist.past.length} onClick={undo}>
                  <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />
                </ToolBtn>
                <ToolBtn label={t("designer.redo")} disabled={!hist.future.length} onClick={redo}>
                  <path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />
                </ToolBtn>
              </div>
              {showsBack && (
                <div className="flex rounded-full border border-line bg-bg/70 p-1 backdrop-blur">
                  {(["front", "back"] as Placement[]).map((p) => (
                    <button key={p} onClick={() => (setSide(p), setSelected(null))} className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${side === p ? "bg-fg text-bg" : "text-fg/70 hover:text-fg"}`}>
                      {p === "front" ? t("designer.front") : t("designer.back")}
                      {design[p].length > 0 && <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${side === p ? "bg-gold" : "bg-accent"}`} />}
                    </button>
                  ))}
                </div>
              )}
              <span className="hidden rounded-full bg-bg/70 px-3 py-1.5 text-[11px] font-semibold text-muted backdrop-blur sm:inline">{t(`designer.layout.${spec.layout}` as never)}</span>
            </div>

            <div className="relative mx-auto mt-2 aspect-square w-full max-w-[600px] touch-none select-none">
              <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.22)]">
                <Silhouette spec={spec} color={color} back={side === "back"} />
              </svg>
              {/* print: clipped exactly like the print file */}
              <div ref={zoneRef} className="pointer-events-none absolute overflow-hidden" style={{ left: `${zone.left}%`, top: `${zone.top}%`, width: `${zone.width}%`, aspectRatio: `1 / ${spec.aspect}`, background: faceBg, borderRadius: radius }}>
                <Artwork value={{ mode: "designer", placement: side, layers }} width={zoneW} height={zoneH} fonts={BROWSER_FONTS} />
              </div>
              <svg viewBox="0 0 400 400" className="pointer-events-none absolute inset-0 h-full w-full">
                <Silhouette spec={spec} color={color} back={side === "back"} layer="overlay" />
              </svg>
              {/* interaction layer: boxes, handles, guides (not clipped) */}
              <div className={`absolute transition-[outline-color] ${spec.layout === "fill" ? "" : "outline-dashed outline-1"} ${selected ? "outline-accent/70" : dark ? "outline-white/35" : "outline-black/25"}`} style={{ left: `${zone.left}%`, top: `${zone.top}%`, width: `${zone.width}%`, aspectRatio: `1 / ${spec.aspect}`, borderRadius: radius }}>
                {guides.v && <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent" />}
                {guides.h && <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-accent" />}
                {layers.length === 0 && (
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setTab("templates")} className={`absolute inset-0 grid place-items-center text-center text-[11px] font-semibold uppercase tracking-wider sm:text-xs ${dark ? "text-white/55" : "text-black/40"}`}>
                    <span>
                      {t("designer.emptyZone")}
                      <span className="mt-1 block text-[10px] normal-case tracking-normal opacity-80">{t("designer.areaHint")}</span>
                    </span>
                  </button>
                )}
                {layers.map((l) => {
                  const w = l.w * zoneW;
                  const h = l.type === "image" ? w * l.aspect : layoutText(l, zoneW).height;
                  const isSel = l.id === selected;
                  return (
                    <div key={l.id} onPointerDown={(e) => onDown(e, l, "move")} className={`absolute cursor-move ${isSel ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-fg/40"}`} style={{ left: l.x * zoneW - w / 2, top: l.y * zoneH - h / 2, width: w, height: h, transform: `rotate(${l.rotation}deg)` }}>
                      {isSel && (
                        <>
                          <span onPointerDown={(e) => onDown(e, l, "scale")} className="absolute -bottom-3 -right-3 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-accent bg-white shadow sm:h-5 sm:w-5" />
                          <span onPointerDown={(e) => onDown(e, l, "rotate")} className="absolute -top-9 left-1/2 h-6 w-6 -translate-x-1/2 cursor-grab rounded-full border-2 border-accent bg-white shadow sm:h-5 sm:w-5" />
                          <span className="pointer-events-none absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-accent" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* product colour / background */}
            <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
              {spec.background ? (
                <>
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("designer.background")}</span>
                  {BACKGROUNDS.map((c) => (
                    <button key={c} onClick={() => (snapshot(), setDesign((d) => ({ ...d, background: c })))} aria-label={c} className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${(design.background ?? "#fffcf7") === c ? "border-accent ring-2 ring-accent/30" : "border-line"}`} style={{ background: c }} />
                  ))}
                  <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 border-line" title={t("designer.custom")} style={{ background: "conic-gradient(#c8102e, #ffc400, #0f7a3d, #1d3f7a, #c8102e)" }}>
                    <input type="color" value={design.background ?? "#fffcf7"} onPointerDown={snapshot} onChange={(e) => setDesign((d) => ({ ...d, background: e.target.value }))} className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                </>
              ) : colors.length > 0 ? (
                <>
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("designer.color")}</span>
                  {colors.slice(0, 14).map((c) => (
                    <button key={c.hex} onClick={() => setColor(c.hex)} aria-label={c.name} title={c.name} className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c.hex ? "border-accent ring-2 ring-accent/30" : "border-line"}`} style={{ background: c.hex }} />
                  ))}
                </>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">{t("designer.hint2")}</p>
        </div>

        {/* ───────── Panel ───────── */}
        <div className="min-w-0 space-y-5">
          <AnimatePresence initial={false}>
            {sel && (
              <motion.section key="inspector" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="kicker text-muted">{sel.type === "text" ? t("designer.editText") : t("designer.editImage")}</p>
                  <div className="flex gap-1">
                    <IconBtn label={t("designer.centerH")} onClick={() => (snapshot(), update(sel.id, { x: 0.5 }))}>
                      <path d="M12 3v18M7 8h10v8H7z" />
                    </IconBtn>
                    <IconBtn label={t("designer.centerV")} onClick={() => (snapshot(), update(sel.id, { y: 0.5 }))}>
                      <path d="M3 12h18M8 7h8v10H8z" />
                    </IconBtn>
                    <IconBtn label={t("designer.duplicate")} onClick={() => duplicate(sel.id)}>
                      <path d="M8 8h12v12H8zM4 16V4h12" />
                    </IconBtn>
                    <IconBtn label={t("designer.delete")} onClick={() => remove(sel.id)} danger>
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                    </IconBtn>
                  </div>
                </div>
                {sel.type === "text" ? (
                  <TextInspector l={sel} emb={emb} fonts={fonts} inks={inks} onSnap={snapshot} onChange={(p) => updateText(sel.id, p)} onFont={setLastFont} t={t} />
                ) : (
                  <div className="mt-3 space-y-3">
                    <Slider label={t("designer.size")} min={0.06} max={1} step={0.005} value={sel.w} onSnap={snapshot} onChange={(v) => update(sel.id, { w: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                    <Slider label={t("designer.rotation")} min={-180} max={180} step={1} value={sel.rotation} onSnap={snapshot} onChange={(v) => update(sel.id, { rotation: v })} fmt={(v) => `${v}°`} />
                    {!sel.path.startsWith("art/") && <DpiBadge dpi={effectiveDpi(sel.px, sel.w, spec)} t={t} />}
                    {alts[sel.id] && (
                      <div className="grid grid-cols-2 gap-2">
                        {(["nobg", "original"] as const).map((k) => {
                          const src = alts[sel.id][k];
                          const active = sel.path === src.path;
                          return (
                            <button key={k} onClick={() => (snapshot(), update(sel.id, { path: src.path, url: src.url }))} className={`flex items-center gap-3 rounded-xl border p-2 text-left text-[13px] transition-colors ${active ? "border-fg bg-surface-2 font-semibold" : "border-line hover:border-fg/40"}`}>
                              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg" style={{ background: "repeating-conic-gradient(#d9d4c8 0% 25%, #fff 0% 50%) 0 0 / 12px 12px" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src.url} alt="" className="h-full w-full object-contain" />
                              </span>
                              {k === "nobg" ? t("designer.bgRemove") : t("designer.bgKeep")}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          <section className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
            <div role="tablist" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
              {tabs.map((k) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${tab === k ? "bg-fg text-bg" : "text-fg/70 hover:bg-surface-2 hover:text-fg"}`}>
                  {t(`designer.tab.${k}` as never)}
                  {k === "layers" && layers.length > 0 && <span className="ml-1 opacity-60">{layers.length}</span>}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === "text" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input value={draft} maxLength={emb ? EMB_MAX_CHARS : 40} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addText()} placeholder={t("designer.textPh")} className="field flex-1" />
                    <button onClick={() => addText()} className="btn btn-ink shrink-0">
                      {t("designer.add")}
                    </button>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("designer.quick")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={() => applyTemplate(TEMPLATES[0], tplName.trim() || TEMPLATES[0].sample)} className="rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold hover:border-fg">
                        ⚽ {t("designer.preset.jersey")}
                      </button>
                      {fonts.slice(0, 6).map((f) => (
                        <button key={f} onClick={() => (setLastFont(f), addText(draft.trim() || t("designer.sampleText"), f))} className="rounded-full border border-line px-3 py-1.5 text-[13px] hover:border-fg" style={{ fontFamily: BROWSER_FONTS[f], fontWeight: FONT_WEIGHT[f] }}>
                          {FONT_LABEL[f]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {emb && (
                    <div className="rounded-2xl bg-surface-2 p-3 text-[12px] leading-relaxed text-muted">
                      <b className="text-fg">{t("designer.emb.title")}</b> {t("designer.emb.body", { n: EMB_MAX_COLORS })}
                      <span className={`mt-1 block font-semibold ${embOver ? "text-accent" : "text-fg"}`}>{t("designer.emb.count", { n: threadCount, max: EMB_MAX_COLORS })}</span>
                    </div>
                  )}
                </div>
              )}

              {tab === "templates" && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted" htmlFor="tpl-name">
                      {t("designer.tplName")}
                    </label>
                    <input id="tpl-name" value={tplName} maxLength={20} onChange={(e) => setTplName(e.target.value)} placeholder={t("designer.tplNamePh")} className="field mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {TEMPLATES.map((tp) => (
                      <TemplateCard key={tp.key} tpl={tp} name={tplName.trim() || tp.sample} aspect={spec.aspect} dark={dark} bg={spec.background ? (design.background ?? "#fffcf7") : color} emb={emb} onPick={() => applyTemplate(tp, tplName.trim() || tp.sample)} />
                    ))}
                  </div>
                  {styles.length > 0 && !emb && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("designer.styles")}</p>
                      <p className="mt-1 text-xs text-muted">{t("designer.stylesSub")}</p>
                      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                        {styles.map((st) => (
                          <button key={st.slug} onClick={() => applyStyle(st)} className="group w-24 shrink-0 text-left">
                            <span className="relative block aspect-[3/4] overflow-hidden rounded-xl border border-line transition-colors group-hover:border-fg" style={{ background: st.tone === "dark" ? "#141414" : "#f4f1ea" }}>
                              <span className="absolute inset-[8%] flex">
                                <StyleThumb layers={st.layers} />
                              </span>
                            </span>
                            <span className="mt-1 block truncate text-[11px] font-semibold">{st.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "art" && (
                <div>
                  <p className="text-xs text-muted">{t("designer.artsSub")}</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {arts.map((a) => (
                      <button key={a.name} onClick={() => addArt(a)} title={a.label} className="group text-left">
                        <span className="relative block aspect-square overflow-hidden rounded-xl border border-line bg-[#f3ead7] transition-colors group-hover:border-fg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <Image src={a.src} alt={a.label} fill sizes="96px" className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-110" />
                        </span>
                        <span className="mt-1 block truncate text-[10px] font-semibold">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === "image" && (
                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-muted">
                    <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
                    <span>{t("designer.rights")}</span>
                  </label>
                  <label className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-semibold transition-colors ${rights ? "border-fg/30 hover:border-accent hover:text-accent" : "border-line text-muted"}`}>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                    {uploading ? t("designer.uploading") : t("designer.upload")}
                  </label>
                  <p className="mt-2 text-xs text-muted">{t("designer.uploadNote2", { dpi: 150 })}</p>
                </div>
              )}

              {tab === "layers" && (
                <div>
                  {layers.length === 0 ? (
                    <p className="text-sm text-muted">{t("designer.noLayers")}</p>
                  ) : (
                    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                      {[...layers].reverse().map((l, ri) => {
                        const i = layers.length - 1 - ri;
                        const dpi = l.type === "image" && !l.path.startsWith("art/") ? effectiveDpi(l.px, l.w, spec) : null;
                        return (
                          <li key={l.id} className={`flex items-center gap-2 px-3 py-2 text-sm ${l.id === selected ? "bg-surface-2" : ""}`}>
                            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-bg text-[13px]">
                              {l.type === "text" ? (
                                <span style={{ fontFamily: BROWSER_FONTS[l.font], fontWeight: FONT_WEIGHT[l.font], color: l.color }}>Aa</span>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={l.url} alt="" className="h-full w-full object-contain" />
                              )}
                            </span>
                            <button onClick={() => setSelected(l.id)} className="min-w-0 flex-1 truncate text-left">
                              {l.type === "text" ? `“${l.text.replace(/\n/g, " / ")}”` : l.path.startsWith("art/") ? t("designer.artLayer") : t("designer.imageLayer")}
                              {dpi != null && dpi < 150 && <span className="ml-2 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">{dpi} dpi</span>}
                            </button>
                            <button onClick={() => move(l.id, 1)} disabled={i === layers.length - 1} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30" aria-label={t("designer.up")}>
                              ↑
                            </button>
                            <button onClick={() => move(l.id, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30" aria-label={t("designer.down")}>
                              ↓
                            </button>
                            <button onClick={() => remove(l.id)} className="grid h-8 w-8 place-items-center rounded-lg text-accent hover:bg-accent/10" aria-label={t("designer.delete")}>
                              ✕
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-muted">{t("designer.layersNote", { n: maxLayers })}</p>
                </div>
              )}
            </div>
          </section>

          {/* ───────── Checkout ───────── */}
          <section className="rounded-3xl bg-fg p-5 text-bg sm:p-6">
            {product ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="kicker text-bg/60">{spec.label}</p>
                  <p className="truncate text-xs text-bg/60">{product.name}</p>
                </div>
                {variantsForColor.length > 1 && (
                  <>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-bg/60">{spec.coloured ? t("product.size") : t("designer.option")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {variantsForColor.map((v) => {
                        const label = labelOf(v);
                        return (
                          <button key={v.id} disabled={!v.available} onClick={() => setSize(label)} className={`min-w-12 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-30 ${size === label ? "border-bg bg-bg text-fg" : "border-bg/25 hover:border-bg"}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-bg/60">{t("designer.total")}</p>
                    <motion.p key={price} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="headline text-3xl">
                      {formatMoney(price, product.currency)}
                    </motion.p>
                    <p className="text-xs text-bg/60">
                      {t("designer.includes", { n: formatMoney(product.extra, product.currency) })}
                      {twoSided && product.backPrice > 0 && ` · ${t("designer.backIncl", { n: formatMoney(product.backPrice, product.currency) })}`}
                    </p>
                  </div>
                  <button onClick={addToCart} disabled={!variant || !allLayers.length || pending || embOver} className="btn btn-primary px-6 py-4">
                    {pending ? t("product.adding") : !variant && variantsForColor.length > 1 ? t("designer.chooseSize") : t("product.addToCart")}
                  </button>
                </div>
                {canBack && !twoSided && product.backPrice > 0 && <p className="mt-3 text-xs text-bg/60">{t("designer.backUpsell", { n: formatMoney(product.backPrice, product.currency) })}</p>}
                {hasUploads && <p className="mt-3 text-xs text-bg/60">{t("designer.reviewNote")}</p>}
                <Link href="/returns" className="mt-2 block text-xs text-bg/60 underline-offset-2 hover:underline">
                  ✦ {t("product.returns.perso")}
                </Link>
              </>
            ) : (
              <>
                <p className="headline text-2xl">{t("designer.soonTitle")}</p>
                <p className="mt-2 text-sm text-bg/70">{t("designer.soonBody")}</p>
                <Link href="/#newsletter" className="btn btn-primary mt-5">
                  {t("soon.notify")}
                </Link>
              </>
            )}
            {notice && <p className="mt-3 text-sm font-semibold text-gold">{notice}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ───────── pieces ───────── */

function ToolBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-bg/70 text-fg backdrop-blur transition hover:border-fg disabled:opacity-30">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${danger ? "text-accent hover:bg-accent/10" : "text-fg/70 hover:bg-surface-2 hover:text-fg"}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function Slider({ label, min, max, step, value, onChange, onSnap, fmt }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; onSnap: () => void; fmt: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-fg/80">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onPointerDown={onSnap} onKeyDown={onSnap} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5 w-full accent-[var(--accent)]" />
    </label>
  );
}

function Swatches({ colors, value, onPick, size = "h-7 w-7" }: { colors: string[]; value: string | undefined; onPick: (c: string) => void; size?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button key={c} onClick={() => onPick(c)} aria-label={c} className={`${size} rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-accent ring-2 ring-accent/30" : "border-line"}`} style={{ background: c }} />
      ))}
    </div>
  );
}

type TFn = ReturnType<typeof useT>;

function TextInspector({ l, emb, fonts, inks, onChange, onSnap, onFont, t }: { l: TextLayer; emb: boolean; fonts: AnyFontKey[]; inks: string[]; onChange: (p: Partial<TextLayer>) => void; onSnap: () => void; onFont: (f: AnyFontKey) => void; t: TFn }) {
  const lines = l.text.split("\n").length;
  const curved = Math.abs(l.arc ?? 0) >= 4;
  return (
    <div className="mt-3 space-y-4">
      <textarea
        value={l.text}
        rows={Math.min(3, lines)}
        onFocus={onSnap}
        onChange={(e) => {
          const v = e.target.value.split("\n").slice(0, emb ? 2 : 3).map((x) => x.slice(0, emb ? EMB_MAX_CHARS : 40)).join("\n");
          onChange({ text: v });
        }}
        className="field resize-none leading-snug"
        aria-label={t("designer.text")}
      />
      <p className="-mt-2 text-[11px] text-muted">{t("designer.linesHint", { n: emb ? 2 : 3 })}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {fonts.map((f) => (
          <button key={f} onClick={() => (onSnap(), onChange({ font: f }), onFont(f))} className={`rounded-xl border px-1 py-2 text-center transition-colors ${l.font === f ? "border-fg bg-surface-2" : "border-line hover:border-fg/40"}`}>
            <span className="block text-lg leading-none" style={{ fontFamily: BROWSER_FONTS[f], fontWeight: FONT_WEIGHT[f] }}>
              Aa
            </span>
            <span className="mt-1 block truncate text-[10px] text-muted">{FONT_LABEL[f]}</span>
          </button>
        ))}
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{emb ? t("designer.thread") : t("designer.ink")}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Swatches colors={inks} value={l.color} onPick={(c) => (onSnap(), onChange({ color: c }))} />
          {!emb && (
            <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 border-line" title={t("designer.custom")} style={{ background: "conic-gradient(#c8102e, #ffc400, #0f7a3d, #1d3f7a, #c8102e)" }}>
              <input type="color" value={l.color} onPointerDown={onSnap} onChange={(e) => onChange({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label={t("designer.size")} min={0.08} max={1} step={0.005} value={l.w} onSnap={onSnap} onChange={(v) => onChange({ w: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
        <Slider label={t("designer.rotation")} min={-180} max={180} step={1} value={l.rotation} onSnap={onSnap} onChange={(v) => onChange({ rotation: v })} fmt={(v) => `${v}°`} />
        <Slider label={t("designer.spacing")} min={-0.05} max={0.5} step={0.01} value={l.spacing ?? 0} onSnap={onSnap} onChange={(v) => onChange({ spacing: Math.abs(v) < 0.005 ? undefined : v })} fmt={(v) => v.toFixed(2)} />
        {lines === 1 ? (
          <Slider label={t("designer.curve")} min={-240} max={240} step={2} value={l.arc ?? 0} onSnap={onSnap} onChange={(v) => onChange({ arc: Math.abs(v) < 4 ? undefined : v })} fmt={(v) => (Math.abs(v) < 4 ? t("designer.straight") : `${v > 0 ? "∩" : "∪"} ${Math.abs(v)}°`)} />
        ) : (
          <Slider label={t("designer.lineHeight")} min={0.8} max={1.6} step={0.02} value={l.lineHeight ?? 1} onSnap={onSnap} onChange={(v) => onChange({ lineHeight: Math.abs(v - 1) < 0.01 ? undefined : v })} fmt={(v) => v.toFixed(2)} />
        )}
      </div>
      {lines > 1 && (
        <div className="flex gap-1.5">
          {(["left", "center", "right"] as const).map((a) => (
            <button key={a} onClick={() => (onSnap(), onChange({ align: a === "center" ? undefined : a }))} className={`flex-1 rounded-xl border py-2 text-[12px] font-semibold ${(l.align ?? "center") === a ? "border-fg bg-surface-2" : "border-line hover:border-fg/40"}`}>
              {t(`designer.align.${a}` as never)}
            </button>
          ))}
        </div>
      )}
      {curved && <p className="-mt-2 text-[11px] text-muted">{t("designer.curveHint")}</p>}
      {!emb && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line p-3">
            <label className="flex items-center justify-between text-[12px] font-semibold">
              {t("designer.outline")}
              <input type="checkbox" checked={!!l.stroke} onChange={(e) => (onSnap(), onChange({ stroke: e.target.checked ? { color: isDark(l.color) ? "#f3ead7" : "#0d0d0d", width: 0.05 } : undefined }))} className="accent-[var(--accent)]" />
            </label>
            {l.stroke && (
              <div className="mt-2 space-y-2">
                <Swatches colors={["#0d0d0d", "#ffffff", "#f3ead7", "#e0b84a", "#c8102e", "#14213d"]} value={l.stroke.color} size="h-6 w-6" onPick={(c) => (onSnap(), onChange({ stroke: { ...l.stroke!, color: c } }))} />
                <Slider label={t("designer.thickness")} min={0.02} max={0.12} step={0.005} value={l.stroke.width} onSnap={onSnap} onChange={(v) => onChange({ stroke: { ...l.stroke!, width: v } })} fmt={(v) => `${Math.round(v * 100)}`} />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-line p-3">
            <label className="flex items-center justify-between text-[12px] font-semibold">
              {t("designer.shadow")}
              <input type="checkbox" checked={!!l.shadow} onChange={(e) => (onSnap(), onChange({ shadow: e.target.checked ? { color: isDark(l.color) ? "#000000" : "#a3162b", x: 0.04, y: 0.05, blur: 0 } : undefined }))} className="accent-[var(--accent)]" />
            </label>
            {l.shadow && (
              <div className="mt-2 space-y-2">
                <Swatches colors={["#000000", "#a3162b", "#e0b84a", "#14213d", "#ffffff"]} value={l.shadow.color} size="h-6 w-6" onPick={(c) => (onSnap(), onChange({ shadow: { ...l.shadow!, color: c } }))} />
                <div className="flex gap-1.5">
                  {[
                    { k: "hard", v: { x: 0.04, y: 0.05, blur: 0 } },
                    { k: "soft", v: { x: 0.02, y: 0.06, blur: 0.12 } },
                    { k: "long", v: { x: 0.08, y: 0.1, blur: 0 } },
                  ].map((p) => (
                    <button key={p.k} onClick={() => (onSnap(), onChange({ shadow: { ...l.shadow!, ...p.v } }))} className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold ${l.shadow!.blur === p.v.blur && l.shadow!.x === p.v.x ? "border-fg bg-surface-2" : "border-line"}`}>
                      {t(`designer.shadow.${p.k}` as never)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DpiBadge({ dpi, t }: { dpi: number | null; t: TFn }) {
  if (dpi == null) return null;
  const level = dpi >= 200 ? "great" : dpi >= 150 ? "good" : dpi >= 100 ? "low" : "bad";
  const cls = level === "great" || level === "good" ? "bg-[#0f7a3d]/15 text-[#3fae6a]" : level === "low" ? "bg-gold/15 text-gold" : "bg-accent/15 text-accent";
  return (
    <div className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${cls}`}>
      {t(`designer.dpi.${level}` as never, { dpi })}
    </div>
  );
}

function TemplateCard({ tpl, name, aspect, dark, bg, emb, onPick }: { tpl: Template; name: string; aspect: number; dark: boolean; bg: string; emb: boolean; onPick: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const a = Math.min(Math.max(aspect, 0.5), 1.5);
  const layers = useMemo(() => {
    let ls = stackLayers(tpl.build(name), a, paletteFor(dark), { top: tpl.top });
    if (emb) ls = embSafe(ls);
    return ls;
  }, [tpl, name, a, dark, emb]);
  return (
    <button onClick={onPick} className="group text-left">
      <span className="relative block overflow-hidden rounded-xl border border-line p-[8%] transition-colors group-hover:border-fg" style={{ background: bg }}>
        <span ref={ref} className="relative block w-full" style={{ aspectRatio: `1 / ${a}` }}>
          {w > 0 && <Artwork value={{ mode: "designer", placement: "front", layers }} width={w} height={w * a} fonts={BROWSER_FONTS} />}
        </span>
      </span>
      <span className="mt-1.5 block text-[12px] font-semibold leading-tight">{tpl.label}</span>
      <span className="block text-[10px] text-muted">{tpl.desc}</span>
    </button>
  );
}

/** Small live preview of a house style (same renderer as the print file). */
function StyleThumb({ layers }: { layers: Layer[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState(80);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <span ref={ref} className="block h-full w-full">
      <Artwork value={{ mode: "designer", placement: "front", layers }} width={w} height={(w * 4) / 3} fonts={BROWSER_FONTS} />
    </span>
  );
}



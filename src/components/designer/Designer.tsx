"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Shape } from "@/components/art/Mockup";
import { Artwork, BROWSER_FONTS, fitFontSize } from "@/lib/personalization/artwork";
import { FONTS, FONT_LABEL, type FontKey, type Layer, type Placement } from "@/lib/personalization/types";
import { addToCartAction } from "@/app/actions/cart";
import { formatMoney } from "@/lib/format";
import { useT } from "@/components/providers/I18nProvider";

export type DesignKind = "tee" | "hoodie" | "tote" | "poster";

export interface DesignerProduct {
  id: string;
  slug: string;
  name: string;
  kind: DesignKind;
  price: number;
  extra: number;
  currency: string;
  placements: Placement[];
  variants: { id: string; name: string; size: string | null; color: string | null; colorHex: string | null; price: number; available: boolean }[];
}

/** Printable zone inside the 400×400 garment drawing (aspect 3:4 = print canvas 2400×3200). */
const ZONE: Record<DesignKind, { left: number; top: number; width: number }> = {
  tee: { left: 30, top: 23, width: 40 },
  hoodie: { left: 33, top: 31, width: 34 },
  tote: { left: 30, top: 40, width: 40 },
  poster: { left: 28, top: 15.5, width: 46 },
};
const KIND_LABEL: Record<DesignKind, string> = { tee: "Camiseta", hoodie: "Sudadera", tote: "Bolsa tote", poster: "Póster" };
const PRESET_COLORS = ["#111111", "#ffffff", "#f1e7d3", "#c8102e", "#14213d", "#0f7a3d"];
const INK = ["#c99a1e", "#e0b84a", "#c8102e", "#ffc400", "#0d0d0d", "#ffffff", "#14213d", "#0f7a3d"];
const STORAGE_KEY = "ryg-design-v1";

const uid = () => Math.random().toString(36).slice(2, 10);

/** Author illustrations customers can place on any garment. */
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

export function Designer({ products, styles = [], arts = [], initialStyle = null, initialArt = null, initialText = null, initialColor = null }: { products: DesignerProduct[]; styles?: DesignerStyle[]; arts?: DesignerArt[]; initialStyle?: string | null; initialArt?: string | null; initialText?: string | null; initialColor?: string | null }) {
  const t = useT();
  const available = useMemo(() => new Set(products.map((p) => p.kind)), [products]);
  const [kind, setKind] = useState<DesignKind>(products[0]?.kind ?? "tee");
  const product = products.find((p) => p.kind === kind) ?? null;
  const colors = useMemo(() => {
    const fromVariants = [...new Set((product?.variants ?? []).map((v) => v.colorHex).filter(Boolean))] as string[];
    return fromVariants.length ? fromVariants : PRESET_COLORS;
  }, [product]);
  const [color, setColor] = useState<string>(colors[0]);
  const [placement, setPlacement] = useState<Placement>("front");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [rights, setRights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  // uploaded images with an automatic transparent version: layer id → both sources
  const [alts, setAlts] = useState<Record<string, { original: { path: string; url: string }; nobg: { path: string; url: string } }>>({});
  const [pending, start] = useTransition();
  const zoneRef = useRef<HTMLDivElement>(null);
  const [zoneW, setZoneW] = useState(200);

  // restore / persist the draft design (per browser convenience only)
  useEffect(() => {
    const preset = initialStyle ? styles.find((x) => x.slug === initialStyle) : null;
    if (preset) {
      applyStyle(preset);
      return;
    }
    const art0 = initialArt ? arts.find((a) => a.name === initialArt) : null;
    if (art0) {
      addArt(art0, true);
      return;
    }
    // coming from the homepage mini-designer: start with the customer's text on the chest
    if (initialText) {
      const ink = initialColor && /^#[0-9a-f]{6}$/i.test(initialColor) ? initialColor : "#c8102e";
      const l: Layer = { id: uid(), type: "text", text: initialText.slice(0, 40), font: "serif", color: ink, x: 0.5, y: 0.32, w: 0.7, rotation: 0 };
      setLayers([l]);
      setSelected(l.id);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.layers)) setLayers(d.layers);
        if (d.kind) setKind(d.kind);
        if (d.placement) setPlacement(d.placement);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ layers, kind, placement }));
    } catch {}
  }, [layers, kind, placement]);
  useEffect(() => {
    if (!colors.includes(color)) setColor(colors[0]);
  }, [colors, color]);
  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setZoneW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [kind]);

  const sel = layers.find((l) => l.id === selected) ?? null;
  const update = useCallback((id: string, patch: Partial<Layer>) => setLayers((ls) => ls.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l))), []);
  const remove = (id: string) => {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setSelected(null);
  };
  const move = (id: string, dir: -1 | 1) =>
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const c = [...ls];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  function applyStyle(st: DesignerStyle) {
    setLayers(st.layers.map((l) => ({ ...l, id: uid() })));
    setSelected(null);
    setPlacement("front");
    const want = st.tone === "dark" ? ["#111111", "#0c0c0c", "#000000", "#14213d"] : ["#ffffff", "#f1e7d3", "#fafafa"];
    const hit = colors.find((c) => want.includes(c.toLowerCase())) ?? (st.tone === "dark" ? colors.find((c) => isDark(c)) : colors.find((c) => !isDark(c)));
    if (hit) setColor(hit);
    setNotice(t("designer.styleLoaded", { name: st.name }));
  }

  // place an author illustration big on the garment (it is drawn for light fabrics)
  function addArt(a: DesignerArt, replace = false) {
    const w = +Math.min(0.9, 0.62 / (a.aspect * 0.75)).toFixed(3);
    const l: Layer = { id: uid(), type: "image", path: `art/${a.name}.png`, url: a.src, aspect: a.aspect, x: 0.5, y: 0.4, w, rotation: 0 };
    setLayers((ls) => (replace ? [l] : [...ls, l].slice(0, 8)));
    setSelected(l.id);
    if (isDark(color)) {
      const light = colors.find((c) => ["#ffffff", "#fafafa", "#f1e7d3"].includes(c.toLowerCase())) ?? colors.find((c) => !isDark(c));
      if (light) setColor(light);
    }
    setNotice(t("designer.artAdded", { name: a.label }));
  }

  const addText = () => {
    const text = draft.trim().slice(0, 40);
    if (!text) return;
    const l: Layer = { id: uid(), type: "text", text, font: "serif", color: color === "#111111" || color === "#14213d" ? "#e0b84a" : "#c8102e", x: 0.5, y: 0.3 + 0.12 * (layers.length % 4), w: 0.7, rotation: 0 };
    setLayers((ls) => [...ls, l].slice(0, 8));
    setSelected(l.id);
    setDraft("");
  };

  const upload = async (file: File) => {
    if (!rights) {
      setNotice(t("designer.rightsFirst"));
      return;
    }
    setUploading(true);
    setNotice(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("rights", "yes");
    const res = await fetch("/api/designer/upload", { method: "POST", body: fd }).catch(() => null);
    setUploading(false);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setNotice(t(`designer.err.${body.error ?? "BAD_IMAGE"}` as never) || t("common.error"));
      return;
    }
    const nobg = body.nobg as { path: string; url: string } | null;
    const l: Layer = { id: uid(), type: "image", path: nobg ? nobg.path : body.path, url: nobg ? nobg.url : body.url, aspect: body.aspect, x: 0.5, y: 0.45, w: 0.6, rotation: 0 };
    if (nobg) setAlts((a) => ({ ...a, [l.id]: { original: { path: body.path, url: body.url }, nobg: { path: nobg.path, url: nobg.url } } }));
    setLayers((ls) => [...ls, l].slice(0, 8));
    setSelected(l.id);
    setNotice(body.lowRes ? t("designer.lowRes") : nobg ? t("designer.bgRemoved") : null);
  };

  // pointer interactions
  const drag = useRef<{ id: string; mode: "move" | "scale" | "rotate"; sx: number; sy: number; l: Layer; cx: number; cy: number } | null>(null);
  const onDown = (e: React.PointerEvent, l: Layer, mode: "move" | "scale" | "rotate") => {
    e.stopPropagation();
    const zone = zoneRef.current!.getBoundingClientRect();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelected(l.id);
    drag.current = { id: l.id, mode, sx: e.clientX, sy: e.clientY, l, cx: zone.left + l.x * zone.width, cy: zone.top + l.y * zone.height };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const zone = zoneRef.current!.getBoundingClientRect();
    if (d.mode === "move") {
      update(d.id, { x: Math.min(1, Math.max(0, d.l.x + (e.clientX - d.sx) / zone.width)), y: Math.min(1, Math.max(0, d.l.y + (e.clientY - d.sy) / zone.height)) });
    } else if (d.mode === "scale") {
      const d0 = Math.hypot(d.sx - d.cx, d.sy - d.cy) || 1;
      const d1 = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
      update(d.id, { w: Math.min(1, Math.max(0.08, d.l.w * (d1 / d0))) });
    } else {
      const a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI + 90;
      update(d.id, { rotation: Math.round(((a + 540) % 360) - 180) });
    }
  };
  const onUp = () => (drag.current = null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!sel || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const step = e.shiftKey ? 0.05 : 0.01;
      if (e.key === "Delete" || e.key === "Backspace") remove(sel.id);
      if (e.key === "ArrowLeft") update(sel.id, { x: Math.max(0, sel.x - step) });
      if (e.key === "ArrowRight") update(sel.id, { x: Math.min(1, sel.x + step) });
      if (e.key === "ArrowUp") update(sel.id, { y: Math.max(0, sel.y - step) });
      if (e.key === "ArrowDown") update(sel.id, { y: Math.min(1, sel.y + step) });
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [sel, update]);

  const zone = ZONE[kind];
  const zoneH = (zoneW * 4) / 3;
  const variantsForColor = (product?.variants ?? []).filter((v) => !v.colorHex || v.colorHex === color);
  const variant = variantsForColor.find((v) => (v.size ?? v.name) === size) ?? null;
  const price = (variant?.price ?? product?.price ?? 0) + (product?.extra ?? 0);
  const hasImages = layers.some((l) => l.type === "image" && !l.path.startsWith("art/"));

  const addToCart = () => {
    if (!product || !variant || !layers.length) return;
    start(async () => {
      const res = await addToCartAction(variant.id, 1, { mode: "designer", placement, layers });
      setNotice(res.ok ? t("designer.added") : t("common.error"));
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
      {/* Canvas */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="relative overflow-hidden rounded-[2rem] bg-surface-2 p-4 sm:p-8" onPointerMove={onMove} onPointerUp={onUp} onPointerDown={() => setSelected(null)}>
          <div className="azulejo-line pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div className="relative mx-auto aspect-square w-full max-w-[600px] touch-none select-none">
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.18)]">
              <Shape kind={kind} color={color} logo />
            </svg>
            <div ref={zoneRef} className={`absolute outline-dashed outline-1 outline-offset-0 transition-[outline-color] ${selected ? "outline-accent/60" : "outline-fg/15"}`} style={{ left: `${zone.left}%`, top: `${zone.top}%`, width: `${zone.width}%`, aspectRatio: "3 / 4" }}>
              {layers.map((l) => {
                const w = l.w * zoneW;
                const h = l.type === "image" ? w * l.aspect : fitFontSize(l.text, l.font, w) * 1.3;
                const isSel = l.id === selected;
                return (
                  <div
                    key={l.id}
                    onPointerDown={(e) => onDown(e, l, "move")}
                    className={`absolute flex cursor-move items-center justify-center ${isSel ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-fg/30"}`}
                    style={{ left: l.x * zoneW - w / 2, top: l.y * zoneH - h / 2, width: w, height: h, transform: `rotate(${l.rotation}deg)` }}
                  >
                    {l.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.url} alt="" draggable={false} className="h-full w-full object-contain" />
                    ) : (
                      <span style={{ fontFamily: BROWSER_FONTS[l.font], fontSize: fitFontSize(l.text, l.font, w), color: l.color, lineHeight: 1, whiteSpace: "nowrap" }}>{l.text}</span>
                    )}
                    {isSel && (
                      <>
                        <span onPointerDown={(e) => onDown(e, l, "scale")} className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-accent bg-white" />
                        <span onPointerDown={(e) => onDown(e, l, "rotate")} className="absolute -top-7 left-1/2 h-5 w-5 -translate-x-1/2 cursor-grab rounded-full border-2 border-accent bg-white" />
                        <span className="pointer-events-none absolute -top-2 left-1/2 h-5 w-px -translate-x-1/2 -translate-y-full bg-accent" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
            {(["front", "back"] as Placement[]).map((p) => (
              <button key={p} onClick={() => setPlacement(p)} className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${placement === p ? "bg-fg text-bg" : "border border-line hover:border-fg"}`}>
                {p === "front" ? t("designer.front") : t("designer.back")}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted">{t("designer.hint")}</p>
      </div>

      {/* Panel */}
      <div className="min-w-0 space-y-7">
        <section>
          <p className="kicker text-muted">1 · {t("designer.product")}</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(Object.keys(ZONE) as DesignKind[]).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={`group rounded-2xl border p-2 text-center transition-colors ${kind === k ? "border-fg bg-surface-2" : "border-line hover:border-fg/40"}`}>
                <svg viewBox="0 0 400 400" className="mx-auto h-14 w-14">
                  <Shape kind={k} color={kind === k ? color : "#d9d4c8"} logo />
                </svg>
                <span className="mt-1 block text-[12px] font-semibold">{KIND_LABEL[k]}</span>
                {!available.has(k) && <span className="block text-[10px] text-muted">{t("soon.badge")}</span>}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="kicker text-muted">2 · {t("designer.color")}</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={c} className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-accent ring-2 ring-accent/30" : "border-line"}`} style={{ background: c }} />
            ))}
          </div>
        </section>

        {styles.length > 0 && (
          <section>
            <p className="kicker text-muted">{t("designer.styles")}</p>
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
          </section>
        )}

        {arts.length > 0 && (
          <section>
            <p className="kicker text-muted">{t("designer.arts")}</p>
            <p className="mt-1 text-xs text-muted">{t("designer.artsSub")}</p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {arts.map((a) => (
                <button key={a.name} onClick={() => addArt(a)} title={a.label} className="group text-left">
                  <span className="relative block aspect-square overflow-hidden rounded-xl border border-line bg-[#f3ead7] transition-colors group-hover:border-fg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.src} alt={a.label} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110" />
                  </span>
                  <span className="mt-1 block truncate text-[10px] font-semibold">{a.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="kicker text-muted">3 · {t("designer.text")}</p>
          <div className="mt-3 flex gap-2">
            <input value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addText()} placeholder={t("designer.textPh")} className="field flex-1" />
            <button onClick={addText} className="btn btn-ink shrink-0">
              {t("designer.add")}
            </button>
          </div>
          <AnimatePresence>
            {sel?.type === "text" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 space-y-4 rounded-2xl border border-line p-4">
                  <input value={sel.text} maxLength={40} onChange={(e) => update(sel.id, { text: e.target.value })} className="field" />
                  <div className="flex flex-wrap gap-2">
                    {FONTS.map((f: FontKey) => (
                      <button key={f} onClick={() => update(sel.id, { font: f })} className={`rounded-xl border px-3 py-2 text-left transition-colors ${sel.font === f ? "border-fg bg-surface-2" : "border-line hover:border-fg/40"}`}>
                        <span className="block text-lg leading-none" style={{ fontFamily: BROWSER_FONTS[f] }}>
                          Aa
                        </span>
                        <span className="text-[10px] text-muted">{FONT_LABEL[f]}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {INK.map((c) => (
                      <button key={c} onClick={() => update(sel.id, { color: c })} aria-label={c} className={`h-8 w-8 rounded-full border-2 ${sel.color === c ? "border-accent" : "border-line"}`} style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section>
          <p className="kicker text-muted">4 · {t("designer.image")}</p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-muted">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
            <span>{t("designer.rights")}</span>
          </label>
          <label className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-semibold transition-colors ${rights ? "border-fg/30 hover:border-accent hover:text-accent" : "border-line text-muted"}`}>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {uploading ? t("designer.uploading") : t("designer.upload")}
          </label>
          <p className="mt-2 text-xs text-muted">{t("designer.uploadNote")}</p>
          {sel?.type === "image" && alts[sel.id] && (
            <div className="mt-4 rounded-2xl border border-line p-4">
              <p className="text-sm font-semibold">{t("designer.bgTitle")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["nobg", "original"] as const).map((k) => {
                  const src = alts[sel.id][k];
                  const active = sel.path === src.path;
                  return (
                    <button key={k} onClick={() => update(sel.id, { path: src.path, url: src.url })} className={`flex items-center gap-3 rounded-xl border p-2 text-left text-[13px] transition-colors ${active ? "border-fg bg-surface-2 font-semibold" : "border-line hover:border-fg/40"}`}>
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg" style={{ background: "repeating-conic-gradient(#d9d4c8 0% 25%, #fff 0% 50%) 0 0 / 12px 12px" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src.url} alt="" className="h-full w-full object-contain" />
                      </span>
                      {k === "nobg" ? t("designer.bgRemove") : t("designer.bgKeep")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {layers.length > 0 && (
          <section>
            <p className="kicker text-muted">{t("designer.layers")}</p>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {[...layers].reverse().map((l) => (
                <li key={l.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${l.id === selected ? "bg-surface-2" : ""}`}>
                  <button onClick={() => setSelected(l.id)} className="min-w-0 flex-1 truncate text-left">
                    {l.type === "text" ? `“${l.text}”` : t("designer.imageLayer")}
                  </button>
                  <button onClick={() => move(l.id, 1)} className="text-muted hover:text-fg" aria-label="Subir">
                    ↑
                  </button>
                  <button onClick={() => move(l.id, -1)} className="text-muted hover:text-fg" aria-label="Bajar">
                    ↓
                  </button>
                  <button onClick={() => remove(l.id)} className="text-accent" aria-label="Eliminar">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-3xl bg-fg p-5 text-bg sm:p-6">
          {product ? (
            <>
              <p className="kicker text-bg/60">5 · {t("product.size")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {variantsForColor.map((v) => {
                  const label = v.size ?? v.name;
                  return (
                    <button key={v.id} disabled={!v.available} onClick={() => setSize(label)} className={`min-w-12 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-30 ${size === label ? "border-bg bg-bg text-fg" : "border-bg/25 hover:border-bg"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-bg/60">{t("designer.total")}</p>
                  <p className="headline text-3xl">{formatMoney(price, product.currency)}</p>
                  {product.extra > 0 && <p className="text-xs text-bg/60">{t("designer.includes", { n: formatMoney(product.extra, product.currency) })}</p>}
                </div>
                <button onClick={addToCart} disabled={!variant || !layers.length || pending} className="btn btn-primary px-6 py-4">
                  {pending ? t("product.adding") : t("product.addToCart")}
                </button>
              </div>
              {hasImages && <p className="mt-3 text-xs text-bg/60">{t("designer.reviewNote")}</p>}
              <Link href="/returns" className="mt-2 block text-xs text-bg/60 underline-offset-2 hover:underline">✦ {t("product.returns.perso")}</Link>
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
  );
}

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
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

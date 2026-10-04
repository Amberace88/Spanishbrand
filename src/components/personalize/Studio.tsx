"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Shape } from "@/components/art/Mockup";
import { Artwork, BROWSER_FONTS } from "@/lib/personalization/artwork";
import { PRESETS, TEMPLATE_INFO } from "@/lib/personalization/presets";
import { TEMPLATES, type PersoConfig, type TemplateKey } from "@/lib/personalization/types";
import { addToCartAction } from "@/app/actions/cart";
import { formatMoney } from "@/lib/format";
import { useT } from "@/components/providers/I18nProvider";
import { IconCheck, IconReturn } from "@/components/ui/Icons";

export interface TemplateProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  config: Extract<PersoConfig, { mode: "fields" }>;
  variants: { id: string; name: string; size: string | null; colorHex: string | null; price: number; available: boolean }[];
}

const GARMENTS = ["#111111", "#ffffff", "#c8102e", "#14213d"];
const SWATCHES_SHOWN = 12;

/** Relative luminance (0 = black, 1 = white) of a #rrggbb colour. */
function lum(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** "Black / M" → "Black" (the variant name without its size). */
function colorName(name: string, size: string | null) {
  const base = size ? name.replace(size, "") : name;
  return base.replace(/[\s/·,-]+$/g, "").replace(/^[\s/·,-]+/g, "").trim();
}

function Step({ n, label, aside, children, dark = false }: { n: number; label: string; aside?: React.ReactNode; children: React.ReactNode; dark?: boolean }) {
  return (
    <fieldset className="min-w-0">
      <legend className="flex w-full items-center gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold tabular-nums ${dark ? "bg-bg/10 text-bg" : "bg-surface-2 text-fg ring-1 ring-line"}`}>{n}</span>
        <span className="text-[15px] font-semibold">{label}</span>
        {aside && <span className={`ml-auto truncate text-[13px] ${dark ? "text-bg/60" : "text-muted"}`}>{aside}</span>}
      </legend>
      <div className="mt-3.5">{children}</div>
    </fieldset>
  );
}

export function Studio({ products, initial = "jersey", initialValues }: { products: TemplateProduct[]; initial?: TemplateKey; initialValues?: Record<string, string> }) {
  const t = useT();
  const [template, setTemplate] = useState<TemplateKey>(initial);
  const product = products.find((p) => p.config.template === template) ?? null;
  const config = product?.config ?? PRESETS[template];
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [picked, setPicked] = useState<string | null>(null);
  const [allColors, setAllColors] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // garment colours: the product's real variant colours (one entry per hex, with its name), darkest first
  const colors = useMemo(() => {
    if (!product) return GARMENTS.map((hex) => ({ hex, name: "" }));
    const seen = new Map<string, string>();
    for (const v of product.variants) if (v.colorHex && !seen.has(v.colorHex.toLowerCase())) seen.set(v.colorHex.toLowerCase(), colorName(v.name, v.size));
    return [...seen].map(([hex, name]) => ({ hex, name })).sort((a, b) => lum(a.hex) - lum(b.hex));
  }, [product]);
  const garment = picked && colors.some((c) => c.hex === picked) ? picked : colors[0]?.hex ?? "#111111";
  const garmentName = colors.find((c) => c.hex === garment)?.name ?? "";
  const visibleColors = allColors ? colors : colors.slice(0, SWATCHES_SHOWN);
  // keep the selected swatch visible when the list is collapsed
  if (!allColors && !visibleColors.some((c) => c.hex === garment)) visibleColors[visibleColors.length - 1] = colors.find((c) => c.hex === garment)!;

  const shown = useMemo(() => {
    const v: Record<string, string> = {};
    for (const f of config.fields) {
      const raw = (values[f.key] ?? "").slice(0, f.maxLength);
      v[f.key] = (f.uppercase ? raw.toLocaleUpperCase("es-ES") : raw) || f.placeholder || "";
    }
    return v;
  }, [values, config]);
  const light = lum(garment) > 0.45;
  const ink = light ? (config.ink === "#e0b84a" || !config.ink ? "#c8102e" : config.ink) : config.ink ?? "#e0b84a";
  const complete = config.fields.every((f) => !f.required || (values[f.key] ?? "").trim()) && config.fields.every((f) => !f.pattern || !values[f.key] || new RegExp(f.pattern).test(values[f.key]));
  const sizes = product ? product.variants.filter((v) => !v.colorHex || v.colorHex.toLowerCase() === garment) : [];
  const variant = sizes.find((v) => (v.size ?? v.name) === size) ?? null;

  const add = () => {
    if (!product || !variant) return;
    start(async () => {
      const res = await addToCartAction(variant.id, 1, { mode: "fields", values });
      setMsg(res.ok ? t("designer.added") : t("common.error"));
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
      <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        <div className="relative overflow-hidden rounded-[2rem] bg-surface-2 p-6 ring-1 ring-line sm:p-10">
          <div className="azulejo-line pointer-events-none absolute inset-0 opacity-25" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" aria-hidden />
          <div className="relative mx-auto aspect-square w-full max-w-[560px]">
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.28)]">
              <Shape kind="tee" color={garment} logo />
            </svg>
            <div className="absolute flex" style={{ left: "30%", top: "23%", width: "40%", aspectRatio: "3 / 4" }}>
              <PreviewArt template={template} values={shown} ink={ink} font={config.font ?? "display"} />
            </div>
          </div>
          <div className="relative mt-4 flex items-center justify-between gap-3 text-[12px]">
            <span className="rounded-full bg-bg/80 px-3 py-1 font-semibold uppercase tracking-wider backdrop-blur">{config.placement === "back" ? t("designer.back") : t("designer.front")}</span>
            {garmentName && <span className="truncate text-muted">{garmentName}</span>}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-8">
        <Step n={1} label={t("perso.choose")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={template === k}
                onClick={() => (setTemplate(k), setValues({}), setSize(null), setMsg(null))}
                className={`press relative rounded-2xl border p-4 text-left transition-[border-color,background-color] duration-150 ${template === k ? "border-gold bg-surface-2" : "border-line hover:border-fg/40"}`}
              >
                {template === k && <IconCheck className="absolute right-3.5 top-3.5 h-4 w-4 text-gold" />}
                <span className="headline block pr-6 text-lg">{TEMPLATE_INFO[k].title}</span>
                <span className="mt-1 block text-[13px] leading-snug text-muted">{TEMPLATE_INFO[k].desc}</span>
              </button>
            ))}
          </div>
        </Step>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={template} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
            <Step n={2} label={t("perso.write")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {config.fields.map((f) => (
                  <label key={f.key} className={`min-w-0 ${config.fields.length === 1 ? "sm:col-span-2" : ""}`}>
                    <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-semibold">
                      <span>
                        {f.label} {f.required && <span className="text-accent">*</span>}
                      </span>
                      <span className="text-[11px] font-normal tabular-nums text-muted">
                        {(values[f.key] ?? "").length}/{f.maxLength}
                      </span>
                    </span>
                    <input value={values[f.key] ?? ""} maxLength={f.maxLength} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="field w-full" inputMode={f.pattern?.includes("0-9") ? "numeric" : undefined} />
                  </label>
                ))}
              </div>
            </Step>
          </motion.div>
        </AnimatePresence>

        <Step n={3} label={t("designer.color")} aside={garmentName}>
          <div className="flex flex-wrap gap-2.5">
            {visibleColors.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => (setPicked(c.hex), setSize(null))}
                aria-label={c.name || c.hex}
                aria-pressed={garment === c.hex}
                title={c.name || undefined}
                className={`press h-9 w-9 rounded-full border transition-shadow ${garment === c.hex ? "border-transparent ring-2 ring-gold ring-offset-2 ring-offset-bg" : "border-line hover:ring-1 hover:ring-fg/40 hover:ring-offset-2 hover:ring-offset-bg"}`}
                style={{ background: c.hex }}
              />
            ))}
            {colors.length > SWATCHES_SHOWN && (
              <button type="button" onClick={() => setAllColors((v) => !v)} className="press h-9 rounded-full border border-line px-3.5 text-[13px] font-semibold tabular-nums hover:border-fg/40">
                {allColors ? "−" : `+${colors.length - SWATCHES_SHOWN}`}
              </button>
            )}
          </div>
        </Step>

        <section className="rounded-3xl bg-fg p-5 text-bg sm:p-7">
          {product ? (
            <>
              <Step n={4} label={t("product.size")} dark>
                {sizes.length ? (
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((v) => {
                      const label = v.size ?? v.name;
                      return (
                        <button key={v.id} type="button" disabled={!v.available} aria-pressed={size === label} onClick={() => setSize(label)} className={`press min-w-12 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-30 ${size === label ? "border-bg bg-bg text-fg" : "border-bg/25 hover:border-bg"}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-bg/60">{t("common.error")}</p>
                )}
              </Step>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-bg/15 pt-5">
                <div className="min-w-0">
                  <p className="truncate text-xs text-bg/60">{product.name}</p>
                  <p className="headline text-3xl tabular-nums">{formatMoney((variant?.price ?? product.price) + config.extraPrice, product.currency)}</p>
                </div>
                <button type="button" onClick={add} disabled={!complete || !variant || pending} className="btn btn-primary press px-6 py-4">
                  <span className="label-swap" key={pending ? "a" : "b"}>{pending ? t("product.adding") : t("product.addToCart")}</span>
                </button>
              </div>
              <Link href="/returns" className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-bg/60 underline-offset-2 hover:underline">
                <IconReturn className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{t("product.returns.perso")}</span>
              </Link>
            </>
          ) : (
            <>
              <p className="headline text-2xl">{t("designer.soonTitle")}</p>
              <p className="mt-2 text-sm text-bg/70">{t("perso.soonBody")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/#newsletter" className="btn btn-primary">
                  {t("soon.notify")}
                </Link>
                <Link href="/disena" className="btn border border-bg/30 text-bg hover:border-bg">
                  {t("hero3.design")}
                </Link>
              </div>
            </>
          )}
          {msg && <p className="mt-3 text-sm font-semibold text-gold" role="status">{msg}</p>}
        </section>
      </div>
    </div>
  );
}

function PreviewArt({ template, values, ink, font }: { template: TemplateKey; values: Record<string, string>; ink: string; font: "display" | "serif" | "sans" | "script" | "sport" }) {
  // Same renderer as the print file, sized to the measured print zone.
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      {w > 0 && <Artwork value={{ mode: "fields", template, values }} width={w} height={(w * 4) / 3} fonts={BROWSER_FONTS} ink={ink} font={font} />}
    </div>
  );
}

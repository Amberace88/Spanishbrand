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

export function Studio({ products, initial = "jersey", initialValues }: { products: TemplateProduct[]; initial?: TemplateKey; initialValues?: Record<string, string> }) {
  const t = useT();
  const [template, setTemplate] = useState<TemplateKey>(initial);
  const product = products.find((p) => p.config.template === template) ?? null;
  const config = product?.config ?? PRESETS[template];
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [garment, setGarment] = useState("#111111");
  const [size, setSize] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const shown = useMemo(() => {
    const v: Record<string, string> = {};
    for (const f of config.fields) {
      const raw = (values[f.key] ?? "").slice(0, f.maxLength);
      v[f.key] = (f.uppercase ? raw.toLocaleUpperCase("es-ES") : raw) || f.placeholder || "";
    }
    return v;
  }, [values, config]);
  const ink = garment === "#ffffff" ? (config.ink === "#e0b84a" ? "#c8102e" : config.ink ?? "#0d0d0d") : config.ink ?? "#e0b84a";
  const complete = config.fields.every((f) => !f.required || (values[f.key] ?? "").trim()) && config.fields.every((f) => !f.pattern || !values[f.key] || new RegExp(f.pattern).test(values[f.key]));
  const variant = product?.variants.find((v) => (v.size ?? v.name) === size) ?? null;

  const add = () => {
    if (!product || !variant) return;
    start(async () => {
      const res = await addToCartAction(variant.id, 1, { mode: "fields", values });
      setMsg(res.ok ? t("designer.added") : t("common.error"));
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="relative overflow-hidden rounded-[2rem] bg-surface-2 p-6 sm:p-10">
          <div className="azulejo-line pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div className="relative mx-auto aspect-square w-full max-w-[560px]">
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.18)]">
              <Shape kind="tee" color={garment} logo />
            </svg>
            <div className="absolute flex" style={{ left: "30%", top: "23%", width: "40%", aspectRatio: "3 / 4" }}>
              <PreviewArt template={template} values={shown} ink={ink} font={config.font ?? "display"} />
            </div>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-bg/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">{config.placement === "back" ? t("designer.back") : t("designer.front")}</span>
          </div>
        </div>
      </div>

      <div className="space-y-7">
        <section>
          <p className="kicker text-muted">1 · {t("perso.choose")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TEMPLATES.map((k) => (
              <button key={k} onClick={() => (setTemplate(k), setValues({}), setMsg(null))} className={`rounded-2xl border p-4 text-left transition-all ${template === k ? "border-fg bg-surface-2" : "border-line hover:border-fg/40"}`}>
                <span className="headline block text-lg">{TEMPLATE_INFO[k].title}</span>
                <span className="mt-1 block text-[13px] leading-snug text-muted">{TEMPLATE_INFO[k].desc}</span>
              </button>
            ))}
          </div>
        </section>

        <AnimatePresence mode="wait">
          <motion.section key={template} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <p className="kicker text-muted">2 · {t("perso.write")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {config.fields.map((f) => (
                <label key={f.key} className={config.fields.length === 1 ? "sm:col-span-2" : ""}>
                  <span className="mb-1.5 block text-[13px] font-semibold">
                    {f.label} {f.required && <span className="text-accent">*</span>}
                  </span>
                  <input value={values[f.key] ?? ""} maxLength={f.maxLength} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="field" inputMode={f.pattern?.includes("0-9") ? "numeric" : undefined} />
                  <span className="mt-1 block text-right text-[11px] text-muted">
                    {(values[f.key] ?? "").length}/{f.maxLength}
                  </span>
                </label>
              ))}
            </div>
          </motion.section>
        </AnimatePresence>

        <section>
          <p className="kicker text-muted">3 · {t("designer.color")}</p>
          <div className="mt-3 flex gap-2.5">
            {(product ? [...new Set(product.variants.map((v) => v.colorHex).filter(Boolean))] as string[] : GARMENTS).map((c) => (
              <button key={c} onClick={() => setGarment(c)} aria-label={c} className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${garment === c ? "border-accent ring-2 ring-accent/30" : "border-line"}`} style={{ background: c }} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-fg p-5 text-bg sm:p-6">
          {product ? (
            <>
              <p className="kicker text-bg/60">4 · {t("product.size")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.filter((v) => !v.colorHex || v.colorHex === garment).map((v) => {
                  const label = v.size ?? v.name;
                  return (
                    <button key={v.id} disabled={!v.available} onClick={() => setSize(label)} className={`min-w-12 rounded-full border px-3.5 py-2 text-sm font-semibold disabled:opacity-30 ${size === label ? "border-bg bg-bg text-fg" : "border-bg/25 hover:border-bg"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-bg/60">{product.name}</p>
                  <p className="headline text-3xl">{formatMoney((variant?.price ?? product.price) + config.extraPrice, product.currency)}</p>
                </div>
                <button onClick={add} disabled={!complete || !variant || pending} className="btn btn-primary px-6 py-4">
                  {pending ? t("product.adding") : t("product.addToCart")}
                </button>
              </div>
              <Link href="/returns" className="mt-3 block text-xs text-bg/60 underline-offset-2 hover:underline">✦ {t("product.returns.perso")}</Link>
            </>
          ) : (
            <>
              <p className="headline text-2xl">{t("designer.soonTitle")}</p>
              <p className="mt-2 text-sm text-bg/70">{t("perso.soonBody")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/#newsletter" className="btn btn-primary">
                  {t("soon.notify")}
                </Link>
                <Link href="/disena" className="btn btn-ghost-light">
                  {t("hero3.design")}
                </Link>
              </div>
            </>
          )}
          {msg && <p className="mt-3 text-sm font-semibold text-gold">{msg}</p>}
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

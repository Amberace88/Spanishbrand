"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicVariant, SizeGuide } from "@/lib/products/queries";
import { addToCartAction } from "@/app/actions/cart";
import { useT } from "@/components/providers/I18nProvider";
import { formatMoney } from "@/lib/format";
import { IconCheck } from "@/components/ui/Icons";
import { SizeGuideDialog } from "./SizeGuideDialog";

/**
 * Mobile-first variant selection: works for products with size+color, size only, or a single variant.
 * Below lg a compact bar keeps the price and the add-to-cart action in reach once the main button scrolls away.
 */
export function ProductBuyBox({
  variants,
  currency,
  onColorChange,
  twoSided = false,
  name,
  sizeGuide = null,
}: {
  variants: PublicVariant[];
  currency: string;
  onColorChange?: (color: string | null) => void;
  twoSided?: boolean;
  /** Product name, shown in the mobile sticky bar. */
  name?: string;
  sizeGuide?: SizeGuide | null;
}) {
  const t = useT();
  const router = useRouter();
  const colors = useMemo(() => [...new Map(variants.filter((v) => v.color).map((v) => [v.color!, v.colorHex])).entries()], [variants]);
  const [color, setColor] = useState<string | null>(colors[0]?.[0] ?? null);
  const inColor = variants.filter((v) => !color || v.color === color);
  const sizes = [...new Set(inColor.map((v) => v.size).filter(Boolean))] as string[];
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [state, setState] = useState<"idle" | "added" | "error">("idle");
  const [nudge, setNudge] = useState(false);
  const [pending, start] = useTransition();
  const ctaRef = useRef<HTMLButtonElement>(null);
  const pickRef = useRef<HTMLDivElement>(null);
  const [barOn, setBarOn] = useState(false);

  const selected =
    variants.length === 1
      ? variants[0]
      : !sizes.length && !colors.length
        ? variants.find((v) => (v.size ?? v.name) === size) ?? null
        : inColor.find((v) => (sizes.length ? v.size === size : true) && (colors.length ? v.color === color : true)) ?? null;

  // sticky bar: only once the main button has scrolled above the viewport
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBarOn(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function add() {
    if (!selected) {
      // nothing chosen yet: take the shopper to the choice instead of a dead button
      setNudge(true);
      pickRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      pickRef.current?.querySelector<HTMLElement>("button:not(:disabled), select")?.focus({ preventScroll: true });
      return;
    }
    start(async () => {
      const res = await addToCartAction(selected.id, 1);
      setState(res.ok ? "added" : "error");
      if (res.ok) {
        router.refresh();
        setTimeout(() => setState("idle"), 2200);
      }
    });
  }

  const price = selected?.price ?? Math.min(...variants.map((v) => v.price));
  const compareAt = selected?.compareAt && selected.compareAt > selected.price ? selected.compareAt : null;
  const unavailable = selected ? !selected.available : false;
  const label = pending ? t("product.adding") : state === "added" ? t("product.added") : !selected ? t("product.selectVariant") : unavailable ? t("product.unavailable") : t("product.addToCart");
  const choice = [color, selected?.size ?? size].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <p className="font-[family-name:var(--font-display)] text-[2rem] font-bold leading-none tabular-nums tracking-tight">{formatMoney(price, currency)}</p>
        {compareAt && <p className="text-lg text-muted line-through tabular-nums">{formatMoney(compareAt, currency)}</p>}
        <span className="text-xs text-muted">{t("product.vatIncluded")}</span>
      </div>

      <div ref={pickRef} className="space-y-6">
        {colors.length > 0 && (
          <div>
            <p className="mb-3 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{t("product.color")}</span>
              <span className="text-muted">
                {color}
                {colors.length > 6 && <span className="ml-1.5 tabular-nums">({colors.length})</span>}
              </span>
            </p>
            <div className={`flex flex-wrap ${colors.length > 12 ? "gap-1.5" : "gap-2.5"}`}>
              {colors.map(([c, hex]) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setSize(null);
                    onColorChange?.(c);
                  }}
                  aria-label={c}
                  title={c}
                  aria-pressed={color === c}
                  className={`${colors.length > 12 ? "h-8 w-8" : "h-10 w-10"} rounded-full border-2 p-0.5 transition ${color === c ? "border-fg" : "border-transparent hover:border-ink/30"}`}
                >
                  <span className="block h-full w-full rounded-full border border-line" style={{ background: hex ?? "#ccc" }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{colors.length || sizes.length > 1 ? t("product.size") : t("product.option")}</span>
              {sizeGuide && <SizeGuideDialog guide={sizeGuide} label={t("product.sizeGuide")} note={t("product.sizeNote")} />}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("product.size")}>
              {sizes.map((s) => {
                const v = inColor.find((x) => x.size === s);
                const avail = v?.available ?? false;
                return (
                  <button
                    key={s}
                    disabled={!avail}
                    onClick={() => (setSize(s), setNudge(false))}
                    aria-pressed={size === s}
                    className={`h-12 min-w-14 rounded-xl border px-4 text-sm font-semibold tabular-nums transition-colors ${size === s ? "border-fg bg-fg text-bg" : nudge ? "border-accent/60 hover:border-fg" : "border-line hover:border-fg"} ${!avail ? "cursor-not-allowed line-through opacity-35" : ""}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizes.length === 0 && colors.length === 0 && variants.length > 1 && (
          <select className="field" onChange={(e) => (setSize(e.target.value), setNudge(false))} defaultValue="" aria-label={t("product.selectVariant")}>
            <option value="" disabled>
              {t("product.selectVariant")}
            </option>
            {variants.map((v) => (
              <option key={v.id} value={v.size ?? v.name} disabled={!v.available}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        {nudge && !selected && (
          <p className="text-sm font-semibold text-accent" role="status">
            {t("product.selectVariant")}
          </p>
        )}
      </div>

      <div>
        <button ref={ctaRef} onClick={add} disabled={unavailable || pending} className="btn btn-primary w-full justify-between px-6 py-5 text-[0.8rem]">
          <span key={label} className="label-swap inline-flex items-center gap-2">{state === "added" && <IconCheck className="h-4 w-4" />}{label}</span>
          {!unavailable && <span className="tabular-nums opacity-90">{formatMoney(price, currency)}</span>}
        </button>
        {state === "error" && <p className="mt-2 text-sm text-accent">{t("common.error")}</p>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {t("product.madeToOrder")}
          </span>
          {twoSided && (
            <span className="flex items-center gap-2 font-semibold text-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {t("product.twoSided")}
            </span>
          )}
        </div>
      </div>

      {/* phones / tablets: price + action stay in reach above the tab bar */}
      <div
        className={`fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 px-4 py-3 shadow-[0_-12px_30px_-18px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(.16,1,.3,1)] lg:hidden ${barOn ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
        aria-hidden={!barOn}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {name && <p className="truncate text-[13px] font-semibold">{name}</p>}
            <p className="truncate text-xs text-muted">
              <span className="font-semibold text-fg tabular-nums">{formatMoney(price, currency)}</span>
              {choice && <span> · {choice}</span>}
            </p>
          </div>
          <button onClick={add} disabled={unavailable || pending} tabIndex={barOn ? 0 : -1} className="btn btn-primary shrink-0 px-5 py-3.5 text-[0.75rem]">
            <span key={label} className="label-swap inline-flex items-center gap-1.5">{state === "added" && <IconCheck className="h-3.5 w-3.5" />}{label}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

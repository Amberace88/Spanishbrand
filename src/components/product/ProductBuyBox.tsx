"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicVariant } from "@/lib/products/queries";
import { addToCartAction } from "@/app/actions/cart";
import { useT } from "@/components/providers/I18nProvider";
import { formatMoney } from "@/lib/format";

/**
 * Mobile-first variant selection: works for products with size+color, size only, or a single variant.
 */
export function ProductBuyBox({ variants, currency }: { variants: PublicVariant[]; currency: string }) {
  const t = useT();
  const router = useRouter();
  const colors = useMemo(() => [...new Map(variants.filter((v) => v.color).map((v) => [v.color!, v.colorHex])).entries()], [variants]);
  const [color, setColor] = useState<string | null>(colors[0]?.[0] ?? null);
  const inColor = variants.filter((v) => !color || v.color === color);
  const sizes = [...new Set(inColor.map((v) => v.size).filter(Boolean))] as string[];
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [state, setState] = useState<"idle" | "added" | "error">("idle");
  const [pending, start] = useTransition();

  const selected =
    variants.length === 1
      ? variants[0]
      : !sizes.length && !colors.length
        ? variants.find((v) => (v.size ?? v.name) === size) ?? null
        : inColor.find((v) => (sizes.length ? v.size === size : true) && (colors.length ? v.color === color : true)) ?? null;

  function add() {
    if (!selected) return;
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

  return (
    <div className="space-y-7">
      <p className="text-2xl tabular-nums">
        {formatMoney(price, currency)} <span className="ml-2 text-xs text-stone">{t("product.vatIncluded")}</span>
      </p>

      {colors.length > 0 && (
        <div>
          <p className="eyebrow mb-3 text-stone-2">
            {t("product.color")} — <span className="text-ink">{color}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {colors.map(([c, hex]) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setSize(null);
                }}
                aria-label={c}
                aria-pressed={color === c}
                className={`h-10 w-10 rounded-full border-2 p-0.5 transition ${color === c ? "border-ink" : "border-transparent hover:border-ink/30"}`}
              >
                <span className="block h-full w-full rounded-full border border-ink/10" style={{ background: hex ?? "#ccc" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="eyebrow mb-3 text-stone-2">{colors.length || sizes.length > 1 ? t("product.size") : t("product.option")}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const v = inColor.find((x) => x.size === s);
              const avail = v?.available ?? false;
              return (
                <button
                  key={s}
                  disabled={!avail}
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  className={`min-w-14 border px-4 py-3 text-sm transition ${size === s ? "border-ink bg-ink text-white" : "border-ink/20 hover:border-ink"} ${!avail ? "cursor-not-allowed line-through opacity-35" : ""}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length === 0 && colors.length === 0 && variants.length > 1 && (
        <select className="field" onChange={(e) => setSize(e.target.value)} defaultValue="">
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

      <div className="sticky bottom-3 z-20 sm:static">
        <button onClick={add} disabled={!selected || !selected.available || pending} className="btn btn-primary w-full py-5 text-[0.78rem] shadow-xl sm:shadow-none">
          {pending ? t("product.adding") : state === "added" ? `✓ ${t("product.added")}` : !selected ? t("product.selectVariant") : !selected.available ? t("product.unavailable") : `${t("product.addToCart")} — ${formatMoney(price, currency)}`}
        </button>
        {state === "error" && <p className="mt-2 text-sm text-rojo">{t("common.error")}</p>}
      </div>
      <p className="flex items-center gap-2 text-xs text-stone-2">
        <span className="h-1.5 w-1.5 rounded-full bg-rojo" /> {t("product.madeToOrder")}
      </p>
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import { CATEGORIES, KINDS, type DesignCategory } from "@/lib/personalization/kinds";
import { formatMoney } from "@/lib/format";
import { useT } from "@/components/providers/I18nProvider";
import { SilhouetteThumb } from "./Silhouette";

export interface PickerProduct {
  slug: string;
  name: string;
  kind: string;
  from: number;
  currency: string;
  image: string | null;
  twoSided: boolean;
  embroidery: boolean;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Categorised product picker for the designer: tabs, search and product cards (real photo or silhouette). */
export function ProductPicker({ products, selected, onSelect }: { products: PickerProduct[]; selected: string | null; onSelect: (slug: string) => void }) {
  const t = useT();
  const current = products.find((p) => p.slug === selected);
  const cats = useMemo(() => CATEGORIES.filter((c) => products.some((p) => KINDS[p.kind]?.cat === c.key)), [products]);
  const [tab, setTab] = useState<DesignCategory>((current && KINDS[current.kind]?.cat) || cats[0]?.key || "ropa");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const query = norm(q.trim());
    if (query) return products.filter((p) => norm(`${p.name} ${KINDS[p.kind]?.label ?? ""} ${KINDS[p.kind]?.short ?? ""}`).includes(query));
    return products.filter((p) => KINDS[p.kind]?.cat === tab);
  }, [products, tab, q]);

  return (
    <div className="rounded-[1.75rem] border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="kicker text-muted">1 · {t("designer.pick.title")}</p>
          <p className="mt-1 text-sm text-muted">{t("designer.pick.sub", { n: products.length })}</p>
        </div>
        <label className="relative block w-full lg:w-72">
          <span className="sr-only">{t("designer.pick.search")}</span>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("designer.pick.search")} className="field !rounded-full !pl-10" />
        </label>
      </div>
      {!q && (
        <div role="tablist" className="no-scrollbar -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1">
          {cats.map((c) => {
            const n = products.filter((p) => KINDS[p.kind]?.cat === c.key).length;
            return (
              <button key={c.key} role="tab" aria-selected={tab === c.key} onClick={() => setTab(c.key)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${tab === c.key ? "bg-fg text-bg" : "border border-line text-fg/80 hover:border-fg/50"}`}>
                {t(`designer.cat.${c.key}` as never) || c.label} <span className={tab === c.key ? "text-bg/60" : "text-muted"}>{n}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="no-scrollbar -mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible">
        {list.map((p) => {
          const spec = KINDS[p.kind];
          const on = p.slug === selected;
          return (
            <button key={p.slug} onClick={() => onSelect(p.slug)} aria-pressed={on} className={`group relative w-36 shrink-0 snap-start overflow-hidden rounded-2xl border text-left transition-all lg:w-auto ${on ? "border-accent ring-2 ring-accent/40" : "border-line hover:-translate-y-0.5 hover:border-fg/40"}`}>
              <span className="relative block aspect-square bg-surface-2">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="absolute inset-[10%] block">{spec && <SilhouetteThumb spec={spec} />}</span>
                )}
                {(p.twoSided || p.embroidery) && (
                  <span className="absolute left-2 top-2 rounded-full bg-bg/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fg backdrop-blur">{p.embroidery ? t("designer.pick.emb") : t("designer.pick.both")}</span>
                )}
                {on && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-[12px] font-bold text-white">✓</span>}
              </span>
              <span className="block p-2.5">
                <span className="block truncate text-[13px] font-semibold">{spec?.label ?? p.name}</span>
                <span className="block text-[11px] text-muted">
                  {t("designer.pick.from")} <b className="font-semibold text-fg">{formatMoney(p.from, p.currency)}</b>
                </span>
              </span>
            </button>
          );
        })}
        {list.length === 0 && <p className="py-6 text-sm text-muted">{t("designer.pick.none")}</p>}
      </div>
    </div>
  );
}

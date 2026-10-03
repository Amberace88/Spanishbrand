"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { PublicProduct } from "@/lib/products/queries";
import { useT } from "@/components/providers/I18nProvider";
import { Gallery } from "./Gallery";
import { ProductBuyBox } from "./ProductBuyBox";

/**
 * Gallery + buy box sharing the selected colour, so photos follow the chosen garment colour.
 * Images are tagged by colour through their variant (see queries.ts); untagged ones are shared by every colour.
 * The viewed position (front, back, detail…) is kept when the colour changes.
 */
export function ProductView({ p, fallback, header, footer }: { p: PublicProduct; fallback: ReactNode; header: ReactNode; footer: ReactNode }) {
  const t = useT();
  const firstColor = p.variants.find((v) => v.color)?.color ?? null;
  const [color, setColor] = useState<string | null>(firstColor);
  const [view, setView] = useState(0);
  const twoSided = p.tags.includes("doble-cara");
  const images = useMemo(() => {
    if (!color) return p.images;
    const own = p.images.filter((i) => i.color === color);
    if (!own.length) return p.images;
    const shared = p.images.filter((i) => !i.color);
    return [...own, ...shared];
  }, [p.images, color]);

  const badges = twoSided ? (
    <span className="flex items-center gap-2 rounded-full border border-line bg-bg/85 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-fg shadow-sm backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {t("product.twoSided")}
    </span>
  ) : null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
      <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        {images.length ? <Gallery key={color ?? "all"} images={images} name={p.name} overlay={badges} initialIndex={view} onIndexChange={setView} /> : fallback}
      </div>
      <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        {header}
        <div className="mt-8">
          <ProductBuyBox variants={p.variants} currency={p.currency} onColorChange={setColor} twoSided={twoSided} />
        </div>
        {footer}
      </div>
    </div>
  );
}

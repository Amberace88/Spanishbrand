"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { PublicProduct } from "@/lib/products/queries";
import { Gallery } from "./Gallery";
import { ProductBuyBox } from "./ProductBuyBox";

/** Gallery + buy box sharing the selected colour, so photos follow the chosen garment colour. */
export function ProductView({ p, fallback, header, footer }: { p: PublicProduct; fallback: ReactNode; header: ReactNode; footer: ReactNode }) {
  const firstColor = p.variants.find((v) => v.color)?.color ?? null;
  const [color, setColor] = useState<string | null>(firstColor);
  const images = useMemo(() => {
    if (!color) return p.images;
    const own = p.images.filter((i) => i.color === color);
    if (!own.length) return p.images;
    const shared = p.images.filter((i) => !i.color);
    return [...own, ...shared];
  }, [p.images, color]);
  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
      <div>{images.length ? <Gallery key={color ?? "all"} images={images} name={p.name} /> : fallback}</div>
      <div className="lg:sticky lg:top-28 lg:self-start">
        {header}
        <div className="mt-8">
          <ProductBuyBox variants={p.variants} currency={p.currency} onColorChange={setColor} />
        </div>
        {footer}
      </div>
    </div>
  );
}

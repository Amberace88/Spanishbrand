import Link from "next/link";
import Image from "next/image";
import type { PublicProduct } from "@/lib/products/queries";
import { formatMoney } from "@/lib/format";
import { CollectionArt } from "@/components/art/CollectionArt";

const SIZES = "(min-width:1440px) 340px, (min-width:1024px) 24vw, 48vw";

/**
 * Listing card. Shows images[0] and, on hover, images[1] — listings pass products through the
 * merchandising engine (lib/catalog/merch.ts), which puts the chosen hero colour first and a second photo
 * of the same colour (back print / angle) next.
 */
export function ProductCard({ p, labels, priority = false }: { p: PublicProduct; labels: { madeToOrder: string; from: string; limited: string }; priority?: boolean }) {
  const [a, b] = p.images;
  const prices = p.variants.map((v) => v.price);
  const min = prices.length ? Math.min(...prices) : p.price;
  const varies = prices.length > 1 && Math.max(...prices) !== min;
  const allColors = [...new Set(p.variants.map((v) => v.colorHex).filter(Boolean))] as string[];
  const colors = allColors.slice(0, 6);
  const onSale = p.compareAt != null && p.compareAt > min;
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2">
        {a ? (
          <>
            <Image src={a.url} alt={a.alt ?? p.name} fill sizes={SIZES} loading={priority ? "eager" : undefined} className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]" />
            {b && <Image src={b.url} alt="" fill sizes={SIZES} className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
          </>
        ) : (
          <CollectionArt slug={p.collection?.slug ?? "default"} className="absolute inset-0" />
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {onSale && <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white">−{Math.round((1 - min / p.compareAt!) * 100)}%</span>}
          {p.limited && <span className="rounded-full bg-fg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-bg">{labels.limited}</span>}
        </div>
        <span className="absolute inset-x-2.5 bottom-2.5 translate-y-3 rounded-full bg-fg py-2.5 text-center text-[12px] font-semibold uppercase tracking-wider text-bg opacity-0 transition-[transform,opacity] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          {labels.madeToOrder}
        </span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          {p.collection && <p className="kicker text-[10px] text-muted">{p.collection.name}</p>}
          <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug">{p.name}</h3>
          {colors.length > 1 && (
            <div className="mt-2 flex items-center gap-1.5">
              {colors.map((c) => (
                <span key={c} className="h-3 w-3 rounded-full border border-line" style={{ background: c }} />
              ))}
              {allColors.length > colors.length && <span className="text-[11px] font-semibold text-muted">+{allColors.length - colors.length}</span>}
            </div>
          )}
        </div>
        <p className="shrink-0 text-right text-[15px] tabular-nums">
          {varies && <span className="block text-[11px] text-muted">{labels.from}</span>}
          <span className={`font-bold ${onSale ? "text-accent" : ""}`}>{formatMoney(min, p.currency)}</span>
          {onSale && <span className="block text-xs text-muted line-through">{formatMoney(p.compareAt!, p.currency)}</span>}
        </p>
      </div>
    </Link>
  );
}

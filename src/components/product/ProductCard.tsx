import Link from "next/link";
import Image from "next/image";
import type { PublicProduct } from "@/lib/products/queries";
import { formatMoney } from "@/lib/format";
import { CollectionArt } from "@/components/art/CollectionArt";

export function ProductCard({ p, labels }: { p: PublicProduct; labels: { madeToOrder: string; from: string; limited: string } }) {
  const [a, b] = p.images;
  const prices = p.variants.map((v) => v.price);
  const min = prices.length ? Math.min(...prices) : p.price;
  const varies = prices.length > 1 && Math.max(...prices) !== min;
  const colors = [...new Set(p.variants.map((v) => v.colorHex).filter(Boolean))].slice(0, 5) as string[];
  const onSale = p.compareAt != null && p.compareAt > min;
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream">
        {a ? (
          <>
            <Image src={a.url} alt={a.alt ?? p.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />
            {b && <Image src={b.url} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
          </>
        ) : (
          <CollectionArt slug={p.collection?.slug ?? "default"} className="absolute inset-0" />
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {onSale && <span className="rounded-full bg-rojo px-2.5 py-1 text-[11px] font-bold text-white">−{Math.round((1 - min / p.compareAt!) * 100)}%</span>}
          {p.limited && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white">{labels.limited}</span>}
        </div>
        <span className="absolute inset-x-2.5 bottom-2.5 translate-y-2 rounded-full bg-white/95 py-2 text-center text-[12px] font-semibold text-ink opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {labels.madeToOrder}
        </span>
      </div>
      <div className="mt-3 px-0.5">
        {p.collection && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">{p.collection.name}</p>}
        <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug group-hover:text-rojo">{p.name}</h3>
        <p className="mt-1.5 text-[15px] tabular-nums">
          {varies && <span className="text-stone-2">{labels.from} </span>}
          <span className={`font-bold ${onSale ? "text-rojo" : ""}`}>{formatMoney(min, p.currency)}</span>
          {onSale && <span className="ml-2 text-sm text-stone line-through">{formatMoney(p.compareAt!, p.currency)}</span>}
        </p>
        {colors.length > 1 && (
          <div className="mt-2 flex gap-1.5">
            {colors.map((c) => (
              <span key={c} className="h-3.5 w-3.5 rounded-full border border-ink/15" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

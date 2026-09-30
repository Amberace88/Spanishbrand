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
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-bone">
        {a ? (
          <>
            <Image src={a.url} alt={a.alt ?? p.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />
            {b && <Image src={b.url} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
          </>
        ) : (
          <CollectionArt slug={p.collection?.slug ?? "default"} className="absolute inset-0" />
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {p.limited && <span className="eyebrow bg-rojo px-2 py-1 text-[0.58rem] text-white">{labels.limited}</span>}
        </div>
        <span className="eyebrow absolute bottom-3 left-3 bg-warm/90 px-2 py-1 text-[0.58rem] text-ink opacity-0 backdrop-blur transition-opacity duration-500 group-hover:opacity-100">
          {labels.madeToOrder}
        </span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          {p.collection && <p className="eyebrow text-[0.6rem] text-stone">{p.collection.name}</p>}
          <h3 className="mt-1 text-sm font-medium leading-snug">{p.name}</h3>
        </div>
        <p className="shrink-0 text-sm tabular-nums">
          {varies && <span className="text-stone">{labels.from} </span>}
          {formatMoney(min, p.currency)}
          {p.compareAt && p.compareAt > min && <span className="ml-2 text-stone line-through">{formatMoney(p.compareAt, p.currency)}</span>}
        </p>
      </div>
    </Link>
  );
}

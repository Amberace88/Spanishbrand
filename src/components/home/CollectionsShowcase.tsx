import Link from "next/link";
import Image from "next/image";
import type { PublicCollection } from "@/lib/products/queries";
import { CollectionArt } from "@/components/art/CollectionArt";
import { Reveal } from "@/components/ui/Reveal";

export function CollectionsShowcase({
  collections,
  counts,
  labels,
}: {
  collections: PublicCollection[];
  counts: Record<string, number>;
  labels: { explore: string; pieces: (n: number) => string; soon: string };
}) {
  const list = collections.slice(0, 4);
  const spans = ["lg:col-span-7 lg:row-span-2", "lg:col-span-5", "lg:col-span-5", "lg:col-span-12 lg:aspect-[21/8]"];
  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
      {list.map((c, i) => (
        <Reveal key={c.slug} delay={i * 0.08} className={`${spans[i] ?? "lg:col-span-6"}`}>
          <Link href={`/collections/${c.slug}`} className="group relative block h-full min-h-[440px] overflow-hidden bg-ink text-bone sm:min-h-[520px] lg:min-h-0">
            <div className={`relative h-full w-full ${i === 0 ? "lg:min-h-[900px]" : i === 3 ? "lg:min-h-[460px]" : "lg:min-h-[442px]"}`}>
              {c.heroImage ? (
                <Image src={c.heroImage} alt={c.name} fill sizes="(min-width:1024px) 60vw, 100vw" className="object-cover transition-transform duration-[1.6s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
              ) : (
                <CollectionArt slug={c.slug} animated={i === 0} className="absolute inset-0 transition-transform duration-[1.6s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent opacity-90" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-6 sm:p-8">
                <div>
                  <p className="eyebrow text-bone/60">
                    {String(i + 1).padStart(2, "0")} — {counts[c.slug] ? labels.pieces(counts[c.slug]) : labels.soon}
                  </p>
                  <h3 className={`display mt-3 ${i === 0 || i === 3 ? "text-7xl sm:text-8xl lg:text-9xl" : "text-6xl sm:text-7xl"}`}>{c.name}</h3>
                  {c.tagline && <p className="serif mt-3 max-w-md text-xl italic text-bone/85 sm:text-2xl">{c.tagline}</p>}
                </div>
                <span className="eyebrow hidden shrink-0 items-center gap-2 border border-bone/30 px-4 py-3 transition-colors duration-500 group-hover:border-bone group-hover:bg-bone group-hover:text-ink sm:flex">
                  {labels.explore} <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

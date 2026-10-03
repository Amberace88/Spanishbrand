import Link from "next/link";
import Image from "next/image";
import type { PublicProduct } from "@/lib/products/queries";
import { ProductCard } from "@/components/product/ProductCard";
import { Container } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

/** "Arte de autor" — the illustration series as two drifting rows of art, with the latest pieces below. */
export function ArteBand({ arts, looks = [], products, en, labels }: { arts: { key: string; name: string; src: string }[]; looks?: { src: string; alt: string; href: string }[]; products: PublicProduct[]; en: boolean; labels: { madeToOrder: string; from: string; limited: string } }) {
  const half = Math.ceil(arts.length / 2);
  const rows = [arts.slice(0, half), arts.slice(half)];
  const picks = products.slice(0, 4);
  return (
    <section className="bg-bg pb-16 sm:pb-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#f3ead7] text-[#1c1a17]">
            <div className="relative grid gap-6 p-7 sm:p-12 lg:grid-cols-12 lg:items-end lg:p-16">
              <div className="lg:col-span-7">
                <div className="flex items-center gap-3">
                  <span className="flag-stripe h-3.5 w-5 rounded-[3px]" aria-hidden />
                  <p className="kicker text-[#a3162b]">{en ? `Author illustration · ${arts.length} pieces` : `Ilustración de autor · ${arts.length} obras`}</p>
                </div>
                <h2 className="mt-5 font-[family-name:var(--font-logo)] text-[11vw] font-bold leading-[0.95] sm:text-6xl lg:text-[4vw] 2xl:text-7xl">
                  {en ? "WEARABLE" : "ARTE QUE"}
                  <span className="block text-[#a3162b]">{en ? "ART" : "SE LLEVA"}</span>
                </h2>
              </div>
              <div className="lg:col-span-5">
                <p className="max-w-md text-[17px] leading-relaxed text-[#1c1a17]/75">
                  {en
                    ? "Engraved, painterly scenes of Spain printed as large as the garment allows — or placed by you, on any piece, in our designer."
                    : "Escenas de España grabadas y pintadas, impresas tan grandes como permite la prenda, o colocadas por ti en cualquier pieza con nuestro diseñador."}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/arte" className="btn bg-[#a3162b] px-7 py-4 text-[15px] text-white hover:-translate-y-px">
                    {en ? "See the series" : "Ver las series"} <IconArrow className="h-4 w-4" />
                  </Link>
                  <Link href="/disena?arte=art-toro" className="btn border border-[#1c1a17]/25 px-7 py-4 text-[15px] text-[#1c1a17] hover:bg-[#1c1a17] hover:text-[#f3ead7]">
                    {en ? "Put it on your garment" : "Ponlo en tu prenda"}
                  </Link>
                </div>
              </div>
            </div>
            {looks.length > 0 && (
              // on the street: people in Spain wearing the series
              <div className="no-scrollbar -mt-2 flex snap-x gap-3 overflow-x-auto px-7 pb-6 sm:px-12 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-16 lg:pb-10">
                {looks.map((l) => (
                  <Link key={l.src} href={l.href} className="group relative block aspect-[4/5] w-[62vw] shrink-0 snap-start overflow-hidden rounded-2xl sm:w-[38vw] lg:w-auto">
                    <Image src={l.src} alt={l.alt} fill sizes="(min-width:1024px) 18vw, 60vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-[12px] font-semibold text-white">{l.alt}</span>
                  </Link>
                ))}
              </div>
            )}
            <div className="space-y-3 pb-8 sm:pb-12 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
              {rows.map((row, r) => (
                <div key={r} className="overflow-hidden">
                  <div className={`${r ? "marquee-track-rev" : "marquee-track"} flex w-max gap-3 hover:[animation-play-state:paused]`} style={{ animationDuration: `${60 + r * 12}s` }}>
                    {[...row, ...row].map((a, i) => (
                      <Link key={`${a.key}-${i}`} href={`/disena?arte=${a.key}`} aria-hidden={i >= row.length} tabIndex={i >= row.length ? -1 : 0} className="group relative block h-40 w-40 shrink-0 overflow-hidden rounded-2xl bg-[#ebe0c8] sm:h-52 sm:w-52">
                        {/* through the image CDN: the source illustrations are 1600 px PNGs in storage, shown at ≤ 208 px */}
                        <Image src={a.src} alt={a.name} fill sizes="(min-width:640px) 208px, 160px" className="object-contain p-3 transition-transform duration-500 group-hover:scale-110" />
                        <span className="absolute inset-x-2 bottom-2 translate-y-2 rounded-full bg-[#1c1a17]/85 px-3 py-1 text-center text-[11px] font-semibold text-[#f3ead7] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">{a.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        {picks.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4">
            {picks.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.05}>
                <ProductCard p={p} labels={labels} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

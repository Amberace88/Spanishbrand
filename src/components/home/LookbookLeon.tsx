import Link from "next/link";
import Image from "next/image";
import type { PublicProduct } from "@/lib/products/queries";
import { ProductCard } from "@/components/product/ProductCard";
import { Container } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

/** The lookbook line — the crowned lion of the homepage film, as a feature band with its products. */
export function LookbookLeon({ products, en, labels }: { products: PublicProduct[]; en: boolean; labels: { madeToOrder: string; from: string; limited: string } }) {
  const picks = products.slice(0, 4);
  return (
    <section className="bg-bg pb-16 sm:pb-24">
      <Container>
        <Reveal>
          <div className="grain-soft relative grid overflow-hidden rounded-[2rem] bg-[#0b0b0b] text-[#f5f1e8] lg:grid-cols-12">
            <div className="pointer-events-none absolute -left-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#c8102e]/25 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-[#e0b84a]/20 blur-3xl" aria-hidden />
            <div className="relative order-2 flex flex-col justify-center p-7 sm:p-12 lg:order-1 lg:col-span-6 lg:p-16">
              <div className="flex items-center gap-3">
                <span className="flag-stripe h-3.5 w-5 rounded-[3px]" aria-hidden />
                <p className="kicker text-[#e0b84a]">{en ? "Lookbook · new" : "Lookbook · novedad"}</p>
              </div>
              <h2 className="mt-5 font-[family-name:var(--font-logo)] text-[10.5vw] font-bold leading-[0.95] sm:text-6xl lg:text-[4vw] 2xl:text-7xl">
                <span className="text-red-metal block">{en ? "THE" : "EL"}</span>
                <span className="text-gold-metal block">{en ? "CROWNED LION" : "LEÓN CORONADO"}</span>
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[#f5f1e8]/75">
                {en
                  ? "The lion of the house under its royal crown, over the brushstrokes of the flag. The pieces from our film — tees, hoodies, sweatshirts, art prints and more, in every colour we can make."
                  : "El león de la casa bajo su corona real, sobre los trazos de la bandera. Las piezas de nuestra película: camisetas, sudaderas, láminas y más, en todos los colores que podemos fabricar."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/lookbook" className="btn bg-[#c8102e] px-7 py-4 text-[15px] text-white hover:-translate-y-px hover:shadow-[0_12px_30px_-10px_#c8102e]">
                  {en ? "See the collection" : "Ver la colección"} <IconArrow className="h-4 w-4" />
                </Link>
                <Link href="/disena?style=leon-real" className="btn btn-ghost-light px-7 py-4 text-[15px]">
                  {en ? "Make it yours" : "Hazla tuya"}
                </Link>
              </div>
            </div>
            <div className="relative order-1 min-h-[360px] lg:order-2 lg:col-span-6 lg:min-h-[560px]">
              <Image src="/catalog/art/lion-crowned.png" alt={en ? "Crowned lion — ROJO Y GUALDA" : "León coronado — ROJO Y GUALDA"} fill sizes="(min-width:1024px) 45vw, 100vw" className="lion-float object-contain p-8 drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)] sm:p-12" />
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

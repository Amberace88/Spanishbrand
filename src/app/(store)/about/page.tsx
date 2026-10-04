import type { Metadata } from "next";
import Link from "next/link";
import { getBrand } from "@/lib/brand";
import Image from "next/image";
import { Container, PageHero } from "@/components/ui/Section";
import { MaskLines, Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";
import { campaignPhoto } from "@/lib/campaign";

export const metadata: Metadata = { title: "La marca", alternates: { canonical: "/about" } };

const VALUES: [string, string, string][] = [
  ["Identidad, no souvenir", "Diseñamos piezas que se llevan a diario: sin clichés, sin exceso de banderas, con respeto por la historia y la cultura.", "statement"],
  ["Colecciones con historia", "Cada colección nace de una idea, una ciudad, una carretera, un mar, un oficio, y se expresa en ropa, hogar, arte y accesorios.", "heritage"],
  ["Bajo pedido, sin stock", "Cada artículo se produce cuando lo pides, a través de socios de producción conectados. Sin almacenes llenos ni excedentes.", "bordados"],
  ["Comunidad", "Votas diseños y colecciones. Los resultados deciden qué producimos después.", "fiestas"],
];

export default async function AboutPage() {
  const brand = await getBrand();
  return (
    <>
      <PageHero dark eyebrow={`Est. ${brand.foundedYear ?? ""}`} title={brand.name} sub={brand.description} />
      <section className="bg-bg py-16 sm:py-24">
        <Container>
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#0b0b0b]">
              <Image src="/brand/lookbook-trio.webp" alt={brand.name} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </Reveal>
            <div>
              <h2 className="headline text-4xl sm:text-5xl">
                <MaskLines lines={["Contar España", "con diseño contemporáneo."]} />
              </h2>
              <Reveal delay={0.1}>
                <p className="mt-8 text-lg leading-relaxed text-muted">
                  {brand.name} es una marca española de identidad y estilo de vida. No somos una tienda de merchandising: somos un estudio de colecciones que traduce ciudades, paisajes, cultura del motor y herencia en objetos cotidianos. La fecha de fundación de la marca es {brand.foundedYear ?? "—"}; las referencias históricas que aparecen en nuestras colecciones son solo eso, referencias.
                </p>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>
      <section className="bg-surface-2 py-20">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {VALUES.map(([title, body, photo], i) => {
              const src = campaignPhoto(photo);
              return (
                <Reveal key={title} delay={i * 0.06} className="flex items-stretch gap-5 overflow-hidden rounded-[1.75rem] bg-surface p-3 ring-1 ring-line sm:p-4">
                  <div className="relative w-28 shrink-0 overflow-hidden rounded-[1.25rem] bg-surface-2 sm:w-36">
                    {src && <Image src={src} alt="" fill sizes="144px" className="object-cover" />}
                  </div>
                  <div className="py-3 pr-3 sm:py-5">
                    <h3 className="headline text-xl sm:text-2xl">{title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <div className="mt-16 text-center">
            <Link href="/collections" className="btn btn-ink">
              Ver colecciones <IconArrow className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

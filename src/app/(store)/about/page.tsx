import type { Metadata } from "next";
import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { CollectionArt } from "@/components/art/CollectionArt";
import { Container, PageHero } from "@/components/ui/Section";
import { MaskLines, Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "La marca", alternates: { canonical: "/about" } };

const VALUES = [
  ["Identidad, no souvenir", "Diseñamos piezas que se llevan a diario: sin clichés, sin exceso de banderas, con respeto por la historia y la cultura."],
  ["Colecciones con historia", "Cada colección nace de una idea — una ciudad, una carretera, un mar, un oficio — y se expresa en ropa, hogar, arte y accesorios."],
  ["Bajo pedido, sin stock", "Cada artículo se produce cuando lo pides, a través de socios de producción conectados. Sin almacenes llenos ni excedentes."],
  ["Comunidad", "Votas diseños y colecciones. Los resultados deciden qué producimos después."],
];

export default async function AboutPage() {
  const brand = await getBrand();
  return (
    <>
      <PageHero dark eyebrow={`Est. ${brand.foundedYear ?? ""}`} title={brand.name} sub={brand.description} />
      <section className="bg-bg py-16 sm:py-24">
        <Container>
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
              <CollectionArt slug="heritage" className="absolute inset-0" />
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
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.06} className="rounded-3xl bg-surface p-8 sm:p-10">
                <p className="headline text-5xl text-accent">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-6 text-2xl font-semibold">{title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{body}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 text-center">
            <Link href="/collections" className="btn btn-ink">
              Ver colecciones →
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

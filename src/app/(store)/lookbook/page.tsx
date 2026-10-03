import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { getPublishedProducts } from "@/lib/products/queries";
import { ProductCard } from "@/components/product/ProductCard";
import { Container, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Lookbook León Coronado — camisetas, sudaderas y láminas",
  description: "El león coronado de ROJO Y GUALDA: camisetas, sudaderas, láminas, tazas y más con la corona real y los trazos de la bandera. Fabricado bajo pedido en Europa, en todos los colores.",
  alternates: { canonical: "/lookbook" },
  openGraph: { images: ["/catalog/art/lion-crowned.png"] },
};

const GROUPS: { design: string; es: string; en: string; sub: [string, string] }[] = [
  { design: "leon-coronado", es: "León Coronado", en: "Crowned Lion", sub: ["Para prendas claras: el león, el nombre en rojo y oro viejo.", "For light garments: the lion, the name in red and old gold."] },
  { design: "leon-coronado-noche", es: "León Coronado · Noche", en: "Crowned Lion · Night", sub: ["Para prendas oscuras: letras en blanco y oro.", "For dark garments: white and gold lettering."] },
  { design: "rojo-y-gualda-real", es: "Rojo y Gualda · Real", en: "Rojo y Gualda · Royal", sub: ["La corona real sobre el nombre de la casa.", "The royal crown over the name of the house."] },
  { design: "corona-bordada", es: "Corona Bordada", en: "Embroidered Crown", sub: ["Bordada en hilo: gorras, gorros, parches y prendas.", "Embroidered in thread: caps, beanies, patches and garments."] },
  { design: "leon-real", es: "León Real · sin texto", en: "Royal Lion · no text", sub: ["Solo el arte, a gran tamaño: prendas, láminas, lienzos, fundas y casa.", "Just the art, large: garments, prints, canvases, cases and home."] },
  { design: "leon-real-claro", es: "León Real · claro", en: "Royal Lion · light", sub: ["El león grande, sin texto, para prendas claras.", "The big lion, no text, for light garments."] },
  // Serie León
  { design: "leon-bordado", es: "León Bordado", en: "Embroidered Lion", sub: ["El león en hilo amarillo y rojo: gorras, gorros, parches y prendas.", "The lion in yellow and red thread: caps, beanies, patches and garments."] },
  { design: "leon-espana-bordado", es: "León · España", en: "Lion · España", sub: ["El león y ESPAÑA bordados en horizontal, hechos para la gorra.", "The lion and ESPAÑA embroidered side by side, made for the cap."] },
  { design: "leon-rojigualda-bordado", es: "León Rojigualda", en: "Red-and-gold Lion", sub: ["El león en oro viejo entre dos franjas de la bandera.", "The lion in old gold between two flag stripes."] },
  { design: "leon-minimal-bordado", es: "León Minimal", en: "Minimal Lion", sub: ["Un solo hilo de oro viejo.", "A single old-gold thread."] },
  { design: "leon-escudo-bordado", es: "Escudo del León", en: "Lion Crest", sub: ["Corona, escudo y LEÓN DE ESPAÑA, bordados para el pecho y en parche.", "Crown, shield and LEÓN DE ESPAÑA, embroidered for the chest and as a patch."] },
  { design: "leon-corazon", es: "Corazón de León", en: "Lionheart", sub: ["El león coronado con «corazón de león» en letra dorada.", "The crowned lion with “corazón de león” in gold script."] },
  { design: "leon-hispania", es: "Hispania", en: "Hispania", sub: ["La insignia de época con el león de la casa.", "The vintage badge with the house lion."] },
  { design: "leon-blason-noche", es: "Blasón del León", en: "Lion Blazon", sub: ["El león coronado dentro de un escudo de oro.", "The crowned lion inside a gold shield."] },
  { design: "leon-espalda", es: "León a la Espalda", en: "Lion on the Back", sub: ["Pequeño al pecho, enorme en la espalda.", "Small on the chest, big on the back."] },
];

export default async function LookbookPage() {
  const [locale, t, all] = await Promise.all([getLocale(), getT(), getPublishedProducts({ limit: 1000 })]);
  const en = locale === "en";
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const groups = GROUPS.map((g) => ({ ...g, items: all.filter((p) => p.design === g.design) })).filter((g) => g.items.length);

  return (
    <>
      <section className="bg-bg px-3 pt-3 sm:px-5">
        <div className="grain-soft relative mx-auto grid max-w-[1600px] overflow-hidden rounded-[28px] bg-[#0b0b0b] text-[#f5f1e8] lg:grid-cols-2">
          <div className="pointer-events-none absolute -left-24 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[#c8102e]/25 blur-3xl" aria-hidden />
          <div className="relative flex flex-col justify-center p-7 sm:p-12 lg:p-20">
            <div className="flex items-center gap-3">
              <span className="flag-stripe h-3.5 w-5 rounded-[3px]" aria-hidden />
              <p className="kicker text-[#e0b84a]">Lookbook 2026</p>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-logo)] text-[11vw] font-bold leading-[0.95] sm:text-6xl lg:text-[4.2vw] 2xl:text-7xl">
              <span className="text-red-metal block">{en ? "THE" : "EL"}</span>
              <span className="text-gold-metal block">{en ? "CROWNED LION" : "LEÓN CORONADO"}</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[#f5f1e8]/75">
              {en
                ? "Courage, nobility and the colours of the flag. The line from our film, made to order in Europe in every colour the workshop can produce — and editable in our designer."
                : "Valor, nobleza y los colores de la bandera. La línea de nuestra película, fabricada bajo pedido en Europa en todos los colores que el taller puede producir, y editable en nuestro diseñador."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#coleccion" className="btn bg-[#c8102e] px-7 py-4 text-[15px] text-white">
                {en ? "Shop the line" : "Comprar la línea"} <IconArrow className="h-4 w-4" />
              </a>
              <Link href="/disena?style=leon-real" className="btn btn-ghost-light px-7 py-4 text-[15px]">
                {en ? "Compose your own lion" : "Compón tu propio león"}
              </Link>
            </div>
          </div>
          <div className="relative min-h-[420px] lg:min-h-[640px]">
            <Image src="/brand/lookbook-trio.webp" alt="" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/40 to-transparent lg:bg-gradient-to-r" />
            <Image src="/catalog/art/lion-crowned.png" alt={en ? "Crowned lion" : "León coronado"} fill sizes="(min-width:1024px) 45vw, 100vw" className="lion-float object-contain p-10 drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)] sm:p-16" />
          </div>
        </div>
      </section>

      <div id="coleccion" className="scroll-mt-28">
        {groups.length === 0 ? (
          <Container>
            <p className="py-24 text-center text-muted">{en ? "The line is being produced — back in a few minutes." : "La línea se está fabricando: vuelve en unos minutos."}</p>
          </Container>
        ) : (
          groups.map((g) => (
            <section key={g.design} className="bg-bg py-12 sm:py-16">
              <Container>
                <SectionHead eyebrow={`${g.items.length} ${en ? "items" : "piezas"}`} title={en ? g.en : g.es} sub={en ? g.sub[1] : g.sub[0]} />
                <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4">
                  {g.items.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 4) * 0.05}>
                      <ProductCard p={p} labels={labels} />
                    </Reveal>
                  ))}
                </div>
              </Container>
            </section>
          ))
        )}
      </div>
    </>
  );
}

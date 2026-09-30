import { CollectionArt } from "@/components/art/CollectionArt";
import { Reveal } from "@/components/ui/Reveal";

const PILLARS = [
  { slug: "madrid", k: "Ciudades", title: "Barrios, plazas y códigos postales", body: "Madrid, Valencia, Alicante y las que vendrán: mapas y símbolos urbanos reinterpretados." },
  { slug: "mediterraneo", k: "Mar", title: "El Mediterráneo como forma de vivir", body: "Cal blanca, azul profundo y tardes largas. Textiles, hogar y viaje." },
  { slug: "motor", k: "Motor", title: "Carreteras nacionales y circuitos", body: "Un homenaje a la cultura del motor: curvas, gasolina y garajes con historia." },
  { slug: "heritage", k: "Oficio", title: "Azulejo, tipografía y artesanía", body: "Patrones y oficios tradicionales llevados a un lenguaje gráfico contemporáneo." },
  { slug: "1492", k: "Historia", title: "Fechas como referencias", body: "Momentos históricos usados como inspiración gráfica, siempre con contexto." },
  { slug: "espana", k: "Luz", title: "El sol como identidad", body: "Rojo, oro y un sol que no necesita bandera para reconocerse." },
];

export function HeritageRail() {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
      {PILLARS.map((p, i) => (
        <Reveal key={p.k} delay={i * 0.06} className="w-[78vw] shrink-0 snap-start sm:w-[42vw] lg:w-[30vw]">
          <article className="group">
            <div className="relative aspect-[4/5] overflow-hidden">
              <CollectionArt slug={p.slug} className="absolute inset-0 transition-transform duration-[1.6s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
              <span className="display absolute left-4 top-3 text-7xl text-bone mix-blend-difference">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <p className="eyebrow mt-5 text-rojo">{p.k}</p>
            <h3 className="mt-2 text-xl font-semibold leading-tight">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-2">{p.body}</p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

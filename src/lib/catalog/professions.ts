/**
 * "Profesiones" line — pride-of-trade designs. Each profession comes in two looks:
 *  - "sello": with the house seal (ring + lion + ROJO Y GUALDA signature),
 *  - "minimal": clean, no brand marks.
 * Both open in the designer ("Diseña en este estilo") so customers can add their name or change the text.
 *
 * Legal guard-rails: generic illustrations only. No official crests, badges, ranks or uniform
 * replicas (LO 4/2015 art. 37.7), no Red Cross / Red Crescent emblem (Geneva Conventions, Ley 2/2006),
 * no pharmacy green cross, no Star of Life, no institution names (Policía Nacional, Guardia Civil, SAMUR…).
 * Police wording is framed as pride ("ORGULLO POLICIAL"), never as an identifier.
 */
import type { BlueprintKey, Design } from "./designs";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";
import type { FontKey, ImageLayer, TextLayer } from "@/lib/personalization/types";

const WF: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };
const RATIO = 3200 / 2400;
let n = 0;
const id = () => `p${(n++).toString(36)}`;
const txt = (text: string, font: FontKey, color: string, y: number, cap: number): TextLayer => ({ id: id(), type: "text", text, font, color, x: 0.5, y, w: +Math.min(0.9, cap * RATIO * [...text].length * WF[font]).toFixed(4), rotation: 0 });
function art(name: ArtName, y: number, maxW: number, maxH: number): ImageLayer {
  const a = artAspect(name);
  const w = +Math.min(maxW, maxH / (a * 0.75)).toFixed(4);
  return { id: id(), type: "image", path: artPath(name), url: artUrl(name), aspect: a, x: 0.5, y, w, rotation: 0 };
}
const G = "#d4a62a", CR = "#f3ead7";

type Icon = "stethoscope" | "heartecg" | "cap" | "firehelmet" | "taxi" | "truck" | "book" | "chef" | "wrench" | "tractor" | "scissors" | "paw" | "bolt" | "hardhat" | "coffee" | "scales" | "mortar" | "code";

interface Profession {
  key: string;
  label: string; // product name (Spanish)
  title: string; // printed
  motto: string; // printed
  icon: Icon;
  line: string; // product story line
  extra?: BlueprintKey[];
}

export const PROFESSIONS: Profession[] = [
  { key: "medicina", label: "Medicina", title: "MEDICINA", motto: "DE GUARDIA POR TI", icon: "stethoscope", line: "Para quien hace guardias de 24 horas y aún sonríe al pasar visita." },
  { key: "enfermeria", label: "Enfermería", title: "ENFERMERÍA", motto: "EL CORAZÓN DEL HOSPITAL", icon: "heartecg", line: "Turnos, manos que cuidan y un corazón que no para." },
  { key: "policia", label: "Orgullo Policial", title: "ORGULLO POLICIAL", motto: "VOCACIÓN DE SERVICIO", icon: "cap", line: "Un homenaje a la vocación de servicio. Diseño de orgullo, no de uniforme." },
  { key: "bomberos", label: "Bomberos", title: "BOMBEROS", motto: "VALOR · ENTREGA · SERVICIO", icon: "firehelmet", line: "Para quienes entran cuando todos salen." },
  { key: "taxi", label: "Taxista", title: "TAXISTA", motto: "CONOZCO CADA CALLE", icon: "taxi", line: "Miles de kilómetros de ciudad y todas las historias del asiento de atrás." },
  { key: "camion", label: "Camionero", title: "CAMIONERO", motto: "KILÓMETROS DE ORGULLO", icon: "truck", line: "La carretera es su oficina. Sin ellos no llega nada a ningún sitio." },
  { key: "docente", label: "Docente", title: "DOCENTE", motto: "ENSEÑAR ES SEMBRAR", icon: "book", line: "Para quien enseña con paciencia y deja huella para siempre.", extra: ["tote"] },
  { key: "cocina", label: "Cocina", title: "COCINA", motto: "FUEGO, SAL Y CARIÑO", icon: "chef", line: "Fogones, servicio a tope y el plato que sale perfecto.", extra: ["apron"] },
  { key: "mecanica", label: "Mecánica", title: "MECÁNICO", motto: "SI TIENE MOTOR, TIENE ARREGLO", icon: "wrench", line: "Manos de grasa y oído fino para cada ruido del motor." },
  { key: "campo", label: "Gente de Campo", title: "GENTE DE CAMPO", motto: "LA TIERRA NOS DA DE COMER", icon: "tractor", line: "Madrugones, cosecha y el orgullo de la tierra." },
  { key: "peluqueria", label: "Peluquería", title: "PELUQUERÍA", motto: "ARTE EN CADA CORTE", icon: "scissors", line: "Tijera, peine y la conversación de siempre.", extra: ["apron"] },
  { key: "veterinaria", label: "Veterinaria", title: "VETERINARIA", motto: "SU SALUD, MI VOCACIÓN", icon: "paw", line: "Para quien cuida de quienes no pueden decir dónde les duele." },
  { key: "electricidad", label: "Electricista", title: "ELECTRICISTA", motto: "TRABAJO CON ENERGÍA", icon: "bolt", line: "Cables, cuadros y la luz que vuelve cuando llegas tú." },
  { key: "construccion", label: "Construcción", title: "CONSTRUCCIÓN", motto: "LEVANTAMOS EL PAÍS", icon: "hardhat", line: "Ladrillo a ladrillo, las casas, puentes y calles que usamos todos." },
  { key: "hosteleria", label: "Hostelería", title: "HOSTELERÍA", motto: "DETRÁS DE LA BARRA, SIEMPRE", icon: "coffee", line: "El primer café de la mañana y la última caña de la noche.", extra: ["apron"] },
  { key: "abogacia", label: "Abogacía", title: "ABOGACÍA", motto: "LA LEY DE MI LADO", icon: "scales", line: "Códigos, plazos y la defensa de cada caso." },
  { key: "farmacia", label: "Farmacia", title: "FARMACIA", motto: "TU SALUD, NUESTRO OFICIO", icon: "mortar", line: "Consejo de confianza al otro lado del mostrador." },
  { key: "informatica", label: "Informática", title: "INFORMÁTICA", motto: "SI FUNCIONA, NO LO TOQUES", icon: "code", line: "Para quien arregla el wifi de toda la familia." },
];

export function professionDesigns(): Design[] {
  return PROFESSIONS.flatMap((p): Design[] => {
    const seal: Design = {
      slug: `oficio-${p.key}`,
      collection: "profesiones",
      name: p.label,
      line: `${p.line} Con el sello de la casa.`,
      tone: "dark",
      layers: [
        art("ring-gold", 0.2, 0.34, 0.255),
        art(`${p.icon}-gold` as ArtName, 0.2, 0.19, 0.14),
        txt(p.title, "sport", CR, 0.405, 0.075),
        txt(p.motto, "sans", G, 0.465, 0.019),
        art("stripes-rg", 0.5, 0.2, 0.025),
        art("logo-lion", 0.565, 0.075, 0.06),
        txt("ROJO Y GUALDA", "sans", CR, 0.615, 0.012),
      ],
      products: ["tee", "hoodie", "mug", ...(p.extra ?? [])],
      posterBg: "#0d0d0d",
      tags: ["profesion", p.key, "personalizable", "sello"],
    };
    const minimal: Design = {
      slug: `oficio-${p.key}-minimal`,
      collection: "profesiones",
      name: `${p.label} Minimal`,
      line: `${p.line} Versión limpia, sin marca.`,
      tone: "dark",
      layers: [art(`${p.icon}-cream` as ArtName, 0.2, 0.3, 0.22), txt(p.title, "sport", CR, 0.41, 0.085), txt(p.motto, "sans", G, 0.48, 0.02)],
      products: ["tee", "mug", ...(p.extra?.includes("apron") ? (["apron"] as BlueprintKey[]) : [])],
      posterBg: "#0d0d0d",
      tags: ["profesion", p.key, "personalizable", "minimal"],
    };
    return [seal, minimal];
  });
}

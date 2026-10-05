/**
 * FAMILIA — gift designs for grandparents, kids and babies ("Para quién").
 * Same layer helpers as the base library (3:4 print canvas, x/y = centre, w = width fraction);
 * the crowned lion of the house leads every piece. Audience tags ("abuelos", "ninos", "bebes")
 * travel to the product tags, which is how lib/catalog/audience.ts places them.
 */
import type { Design } from "./designs";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";
import type { FontKey, ImageLayer, TextLayer } from "@/lib/personalization/types";

const WF: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };
const RATIO = 3200 / 2400;
let n = 0;
const id = () => `f${(n++).toString(36)}`;

function txt(text: string, font: FontKey, color: string, y: number, cap: number): TextLayer {
  return { id: id(), type: "text", text, font, color, x: 0.5, y, w: +Math.min(0.96, cap * RATIO * [...text].length * WF[font]).toFixed(4), rotation: 0 };
}
function img(name: ArtName, y: number, w: number, x = 0.5): ImageLayer {
  return { id: id(), type: "image", path: artPath(name), url: artUrl(name), aspect: artAspect(name), x, y, w, rotation: 0 };
}

const G = "#d4a62a", G2 = "#f0c75a", R = "#b3122a", CR = "#f3ead7", INK = "#111111", NAVY = "#14213d";

export function familyDesigns(): Design[] {
  return [
    // ───────── ABUELOS ─────────
    {
      slug: "mejor-abuelo",
      collection: "familia",
      name: "El Mejor Abuelo de España",
      line: "El león coronado para el que nos enseñó a querer esta tierra. Regalo de nietos, con orgullo.",
      tone: "dark",
      layers: [img("lion-crowned", 0.25, 0.44), txt("EL MEJOR", "sans", CR, 0.5, 0.03), txt("ABUELO", "sport", G2, 0.6, 0.12), txt("DE ESPAÑA", "serif", CR, 0.71, 0.045), img("stripes-rg", 0.785, 0.36)],
      products: ["tee", "sweat", "hoodie", "mug"],
      posterBg: "#0d0d0d",
      tags: ["abuelos", "regalo", "leon", "familia"],
    },
    {
      slug: "abuela-de-oro",
      collection: "familia",
      name: "Abuela de Oro",
      line: "Laurel, corona y oro viejo para la reina de la casa.",
      tone: "light",
      layers: [img("laurel-gold", 0.3, 0.62), img("lion-crowned", 0.3, 0.26), txt("ABUELA", "serif", INK, 0.6, 0.07), txt("de oro", "script", G, 0.69, 0.06), txt("LA REINA DE LA CASA", "sans", R, 0.765, 0.018)],
      products: ["womtee", "womsweat", "mug", "tote", "apron"],
      posterBg: CR,
      tags: ["abuelos", "regalo", "leon", "familia"],
    },

    // ───────── NIÑOS ─────────
    {
      slug: "pequeno-leon",
      collection: "familia",
      name: "Pequeño León",
      line: "El león coronado de la casa en tamaño peque: valiente, noble y un poco travieso.",
      tone: "light",
      layers: [img("lion-crowned", 0.34, 0.66), txt("PEQUEÑO", "sans", R, 0.662, 0.03), txt("LEÓN", "sport", INK, 0.774, 0.12)],
      products: ["kids", "toddler", "baby", "kidshoodie", "blanket"],
      tags: ["ninos", "bebes", "leon", "familia"],
    },
    {
      slug: "pequeno-leon-noche",
      collection: "familia",
      name: "Pequeño León · Noche",
      line: "El pequeño león en blanco y oro, para prendas oscuras que aguantan el parque y el cole.",
      tone: "dark",
      layers: [img("lion-crowned", 0.34, 0.66), txt("PEQUEÑO", "sans", CR, 0.662, 0.03), txt("LEÓN", "sport", G2, 0.774, 0.12)],
      products: ["kids", "kidshoodie", "toddler"],
      tags: ["ninos", "leon", "familia"],
    },
    {
      slug: "mi-primer-mundial",
      collection: "familia",
      name: "Mi Primer Mundial",
      line: "Para el aficionado más pequeño de la casa: su primer Mundial con la Selección en el corazón.",
      tone: "light",
      layers: [img("football", 0.24, 0.34), txt("MI PRIMER", "sans", INK, 0.45, 0.03), txt("MUNDIAL", "sport", R, 0.54, 0.12), img("flagband", 0.66, 0.56), txt("AFICIONADO DESDE LA CUNA", "sans", NAVY, 0.76, 0.018)],
      products: ["baby", "toddler", "kids"],
      tags: ["ninos", "bebes", "futbol", "familia"],
    },

    // ───────── BEBÉS ─────────
    {
      slug: "hecho-en-espana-bebe",
      collection: "familia",
      name: "Hecho en España · Bebé",
      line: "El sello de origen más bonito: hecho en España, con mucho amor.",
      tone: "light",
      layers: [img("spain-red", 0.28, 0.6), txt("HECHO EN ESPAÑA", "serif", INK, 0.54, 0.045), txt("con mucho amor", "script", R, 0.62, 0.05), img("lion-crowned", 0.76, 0.16)],
      products: ["baby", "toddler", "blanket"],
      tags: ["bebes", "regalo", "leon", "familia"],
    },
  ];
}

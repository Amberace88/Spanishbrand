/**
 * Serie LEÓN — the house lion on every kind of product.
 *  - Bordados: embroidery-safe lions posterised from the brand mark (scripts/lion-art.mjs), flat Printful
 *    thread colours only (#A67843 old gold, #CC3333 red, #FFCC00 flag yellow, #FFFFFF white), laid out
 *    wide and low so they read on a cap front (≈ 10 × 4.5 cm) — crests with small text only go on chest/patch.
 *  - Impresos: the crowned lion (lion-crowned) and the lion mark in full colour — crest, vintage badge,
 *    "Corazón de león", and two-sided pieces (small lion on the chest, big lion on the back).
 * Printed trucker fronts and bottles are white/steel: only light-ink (tone "light") or text-free designs go there.
 * All tagged "leon" (the builder prioritises them and the /collections/leon page gathers them).
 */
import type { FontKey, ImageLayer, TextLayer } from "@/lib/personalization/types";
import type { BlueprintKey, Design } from "./designs";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";

const WF: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };
const RATIO = 3200 / 2400;
let n = 0;
const id = () => `l${(n++).toString(36)}`;
const txt = (text: string, font: FontKey, color: string, y: number, cap: number, x = 0.5): TextLayer => ({ id: id(), type: "text", text, font, color, x, y, w: +Math.min(0.96, cap * RATIO * [...text].length * WF[font]).toFixed(4), rotation: 0 });
const img = (name: string, y: number, w: number, x = 0.5): ImageLayer => ({ id: id(), type: "image", path: artPath(name as ArtName), url: artUrl(name), aspect: artAspect(name), x, y, w, rotation: 0 });

// thread colours (embroidery) and print inks
const OG = "#A67843", TR = "#CC3333", TY = "#FFCC00", TW = "#FFFFFF";
const CR = "#f5f1e8", G = "#d4a62a", G2 = "#f0c75a", INK = "#1c1a17", RED = "#a3162b";

const CAPS_DARK: BlueprintKey[] = ["cap", "dadhat", "trucker", "beanie"];
const CAPS_LIGHT: BlueprintKey[] = ["cap", "dadhat", "bucket"];
const PRINT_DARK: BlueprintKey[] = ["tee", "hoodie", "sweat", "tote", "mug", "poster", "framed", "pillow", "phonecase", "sticker"];
const PRINT_LIGHT: BlueprintKey[] = ["tee", "sweat", "hoodie", "tote", "mug", "apron", "poster", "framed"];

export function leonDesigns(): Design[] {
  const D = (d: Omit<Design, "collection">): Design => ({ collection: "leon", ...d, tags: ["leon", "serie-leon", ...(d.tags ?? [])] });
  return [
    /* ───────── bordados (headwear first) ───────── */
    D({
      slug: "leon-bordado",
      name: "León Bordado",
      line: "El león de la casa bordado en amarillo y rojo: la melena con los colores de la bandera, en gorra, gorro y pecho.",
      tone: "dark",
      layers: [img("lion-emb", 0.3, 0.5)],
      products: [...CAPS_DARK, "bucket", "embtee", "embhoodie", "patch"],
      tags: ["bordado", "bestseller"],
    }),
    D({
      slug: "leon-bordado-claro",
      name: "León Bordado · Claro",
      line: "El león bordado en oro viejo y rojo para gorras y prendas claras.",
      tone: "light",
      layers: [img("lion-emb-claro", 0.3, 0.5)],
      products: [...CAPS_LIGHT, "trucker", "embtee", "embhoodie"],
      tags: ["bordado"],
    }),
    D({
      slug: "leon-espana-bordado",
      name: "León · España",
      line: "El león y ESPAÑA en letra de club, bordados en horizontal con la rojigualda debajo: hecho para la gorra.",
      tone: "dark",
      layers: [img("lion-emb", 0.3, 0.34, 0.27), txt("ESPAÑA", "sport", TY, 0.29, 0.1, 0.66), img("band-emb", 0.375, 0.376, 0.66)],
      products: [...CAPS_DARK, "embtee"],
      tags: ["bordado"],
    }),
    D({
      slug: "leon-espana-bordado-claro",
      name: "León · España (claro)",
      line: "El león en oro viejo y ESPAÑA en rojo, bordados para gorras blancas y caqui.",
      tone: "light",
      layers: [img("lion-emb-claro", 0.3, 0.34, 0.27), txt("ESPAÑA", "sport", TR, 0.29, 0.1, 0.66), img("band-emb", 0.375, 0.376, 0.66)],
      products: [...CAPS_LIGHT, "trucker"],
      tags: ["bordado"],
    }),
    D({
      slug: "leon-rojigualda-bordado",
      name: "León Rojigualda",
      line: "El león en oro viejo entre dos franjas rojigualdas: limpio, horizontal y bordado.",
      tone: "dark",
      layers: [img("band-emb", 0.3, 0.26, 0.19), img("lion-emb-oro", 0.3, 0.3), img("band-emb", 0.3, 0.26, 0.81)],
      products: [...CAPS_DARK, "bucket"],
      tags: ["bordado", "bandera"],
    }),
    D({
      slug: "leon-minimal-bordado",
      name: "León Minimal",
      line: "La cabeza del león en un solo hilo de oro viejo. Discreto, elegante y para todos los días.",
      tone: "dark",
      layers: [img("lion-emb-oro", 0.3, 0.46)],
      products: ["cap", "dadhat", "beanie", "bucket", "embtee", "embhoodie"],
      tags: ["bordado", "minimal"],
    }),
    D({
      slug: "leon-blanco-bordado",
      name: "León Blanco",
      line: "El león bordado en hilo blanco sobre negro y marino: minimalismo con carácter.",
      tone: "dark",
      layers: [img("lion-emb-blanco", 0.3, 0.46)],
      products: ["cap", "dadhat", "beanie", "embtee"],
      tags: ["bordado", "minimal"],
    }),
    D({
      slug: "leon-monograma-bordado",
      name: "León de España · Monograma",
      line: "El león con LEÓN DE ESPAÑA al lado, bordado en oro y blanco.",
      tone: "dark",
      layers: [img("lion-emb-oro", 0.3, 0.26, 0.26), txt("LEÓN", "serif", TY, 0.27, 0.1, 0.64), txt("DE ESPAÑA", "sans", TW, 0.36, 0.04, 0.64)],
      products: [...CAPS_DARK, "embtee", "embhoodie"],
      tags: ["bordado"],
    }),
    D({
      slug: "leon-escudo-bordado",
      name: "Escudo del León",
      line: "Corona real, escudo rojo con el león en amarillo y LEÓN DE ESPAÑA debajo: un blasón bordado para el pecho y en parche.",
      tone: "dark",
      layers: [img("crown-emb", 0.13, 0.22), img("shield-emb", 0.38, 0.4), img("lion-emb-amarillo", 0.37, 0.27), txt("LEÓN DE ESPAÑA", "serif", TW, 0.63, 0.05)],
      products: ["patch", "embtee", "embhoodie"],
      tags: ["bordado"],
    }),

    /* ───────── impresos ───────── */
    D({
      slug: "leon-corazon",
      name: "Corazón de León",
      line: "El león coronado sobre los trazos de la bandera y «corazón de león» en letra de firma dorada.",
      tone: "dark",
      layers: [img("lion-crowned", 0.32, 0.62), txt("corazón de león", "script", G2, 0.665, 0.07), txt("ROJO Y GUALDA · ESPAÑA", "sans", CR, 0.735, 0.018)],
      products: [...PRINT_DARK, "tumbler", "socks", "apron"],
      posterBg: "#0d0d0d",
      tags: ["lookbook", "bestseller"],
    }),
    D({
      slug: "leon-corazon-claro",
      name: "Corazón de León · Claro",
      line: "El león coronado y «corazón de león» en rojo, para prendas claras.",
      tone: "light",
      layers: [img("lion-crowned", 0.32, 0.62), txt("corazón de león", "script", RED, 0.665, 0.07), txt("ROJO Y GUALDA · ESPAÑA", "sans", INK, 0.735, 0.018)],
      products: [...PRINT_LIGHT, "kids", "bottle", "truckerprint"],
      posterBg: "#f3ead7",
      tags: ["lookbook"],
    }),
    D({
      slug: "leon-hispania",
      name: "Hispania",
      line: "Insignia de época: el león de la casa dentro de un sello dorado con cinta y la palabra HISPANIA.",
      tone: "dark",
      layers: [img("badge-gold", 0.36, 0.8), img("logo-lion", 0.278, 0.31), txt("HISPANIA", "serif", G2, 0.478, 0.06), txt("TIERRA DE LEONES", "sans", CR, 0.567, 0.018)],
      products: [...PRINT_DARK, "coaster", "bucketprint"],
      posterBg: "#111111",
      tags: ["vintage"],
    }),
    D({
      slug: "leon-hispania-claro",
      name: "Hispania · Claro",
      line: "La insignia HISPANIA en tinta y rojo sobre prendas claras: estilo de taller antiguo.",
      tone: "light",
      layers: [img("badge-ink", 0.36, 0.8), img("logo-lion", 0.278, 0.31), txt("HISPANIA", "serif", INK, 0.478, 0.06), txt("TIERRA DE LEONES", "sans", RED, 0.567, 0.018)],
      products: [...PRINT_LIGHT, "truckerprint", "bucketprint"],
      posterBg: "#f3ead7",
      tags: ["vintage"],
    }),
    D({
      slug: "leon-blason-noche",
      name: "Blasón del León · Noche",
      line: "El león coronado dentro de un escudo de oro, con ESPAÑA debajo. El blasón de la casa para prendas oscuras.",
      tone: "dark",
      layers: [img("shieldline-gold", 0.36, 0.62), img("lion-crowned", 0.32, 0.46), txt("ESPAÑA", "serif", G2, 0.7, 0.06), txt("ROJO Y GUALDA", "sans", CR, 0.755, 0.02)],
      products: [...PRINT_DARK, "canvas", "socks", "bucketprint"],
      posterBg: "#0d0d0d",
      tags: ["lookbook"],
    }),
    D({
      slug: "leon-blason-dia",
      name: "Blasón del León · Día",
      line: "El blasón del león en tinta y rojo para prendas claras.",
      tone: "light",
      layers: [img("shieldline-ink", 0.36, 0.62), img("lion-crowned", 0.32, 0.46), txt("ESPAÑA", "serif", RED, 0.7, 0.06), txt("ROJO Y GUALDA", "sans", INK, 0.755, 0.02)],
      products: [...PRINT_LIGHT, "bottle", "truckerprint"],
      posterBg: "#f3ead7",
      tags: ["lookbook"],
    }),
    D({
      slug: "leon-espalda",
      name: "León a la Espalda",
      line: "El león coronado pequeño al pecho y a gran tamaño en la espalda, con el nombre de la casa. Doble cara.",
      tone: "dark",
      layers: [img("lion-crowned", 0.15, 0.24, 0.7)],
      back: [img("lion-crowned", 0.34, 0.78), txt("ROJO Y GUALDA", "serif", CR, 0.73, 0.06), txt("CORAZÓN DE LEÓN", "sans", G, 0.79, 0.022)],
      products: ["tee", "hoodie", "sweat"],
      tags: ["lookbook", "doble-cara"],
    }),
    D({
      slug: "leon-espalda-claro",
      name: "León a la Espalda · Claro",
      line: "El león al pecho y en grande a la espalda, con letras en rojo y tinta para prendas claras. Doble cara.",
      tone: "light",
      layers: [img("lion-crowned", 0.15, 0.24, 0.7)],
      back: [img("lion-crowned", 0.34, 0.78), txt("ROJO Y GUALDA", "serif", RED, 0.73, 0.06), txt("CORAZÓN DE LEÓN", "sans", INK, 0.79, 0.022)],
      products: ["tee", "hoodie", "sweat"],
      tags: ["lookbook", "doble-cara"],
    }),
  ];
}

/**
 * Extra products for existing designs: the lion and the author art on more accessories and headwear
 * (embroidery only for flat thread-colour designs; complex art goes on printed items).
 */
export const LEON_EXTRAS: Partial<Record<BlueprintKey, string[]>> = {
  dadhat: ["corona-bordada", "monograma-ryg", "bandera-bordada"],
  trucker: ["corona-bordada", "monograma-ryg", "espana-bordada"],
  bucket: ["monograma-ryg", "bandera-bordada"],
  truckerprint: ["leon-real", "arte-toro", "arte-galeon", "arte-faro"],
  bucketprint: ["leon-real", "arte-chiringuito", "arte-barca", "arte-faro", "arte-olivo"],
  bottle: ["leon-real", "leon-coronado", "arte-faro", "arte-galeon"],
  socks: ["leon-real"],
  sticker: ["leon-coronado-noche"],
  apron: ["leon-real", "arte-paella", "arte-jamon", "arte-vino"],
  phonecase: ["arte-toro", "arte-flamenca", "arte-alhambra", "arte-galeon", "arte-faro"],
};

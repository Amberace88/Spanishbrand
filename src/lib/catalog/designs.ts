/**
 * ROJO Y GUALDA design library — original brand designs, one source of truth for:
 *  - print files (rendered server-side with the same Artwork renderer the designer uses),
 *  - storefront previews,
 *  - "Diseña en este estilo" (the designer loads these layers so customers can edit them).
 *
 * Layers use the designer's normalised 3:4 print canvas (x/y = centre, w = width fraction).
 * Art layers point at brand-owned motifs in /public/catalog/art (see scripts/catalog-art.mjs).
 */
import type { FontKey, ImageLayer, Layer, TextLayer } from "@/lib/personalization/types";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";
import { cityDesigns } from "./cities";

export { ART_NAMES, artAspect, artPath, artUrl, type ArtName } from "./designs-art";

export type Tone = "dark" | "light";
export type BlueprintKey = "tee" | "hoodie" | "sweat" | "mug" | "tote" | "poster" | "sticker" | "kids" | "framed" | "canvas" | "towel" | "apron" | "pillow" | "bandana" | "phonecase" | "puzzle" | "doormat";

export interface Design {
  slug: string;
  collection: string;
  name: string;
  line: string;
  tone: Tone; // dark = made for black/navy garments, light = for white/cream
  layers: Layer[];
  products: BlueprintKey[];
  posterBg?: string;
  tags?: string[];
  /** Fill-in template customers can use with this look (Personaliza). */
  template?: "pueblo" | "jersey" | "year" | "text";
}


// Same width factors as the renderer (artwork.tsx) so text sizes are predictable.
const WF: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };
const RATIO = 3200 / 2400;

let n = 0;
const id = () => `d${(n++).toString(36)}`;

/** Text whose glyph height is ≈ `cap` × canvas height (clamped to the canvas width). */
function txt(text: string, font: FontKey, color: string, y: number, cap: number, x = 0.5, rotation = 0): TextLayer {
  const w = Math.min(0.96, (cap * RATIO * [...text].length * WF[font]) / 1);
  return { id: id(), type: "text", text, font, color, x, y, w: +w.toFixed(4), rotation };
}

function img(name: ArtName, y: number, w: number, x = 0.5, rotation = 0): ImageLayer {
  return { id: id(), type: "image", path: artPath(name), url: artUrl(name), aspect: artAspect(name), x, y, w, rotation };
}

const G = "#d4a62a", G2 = "#f0c75a", R = "#c8102e", CR = "#f3ead7", INK = "#111111", NAVY = "#14213d", SEA = "#1f5f8b", Y = "#ffc400";

const TEE_DARK: BlueprintKey[] = ["tee", "hoodie"];

const BASE_DESIGNS: Design[] = [
  // ───────── ESENCIALES (official logo) ─────────
  {
    slug: "firma-leon",
    collection: "esenciales",
    name: "La Firma",
    line: "El león y el nombre: la firma completa de la casa.",
    tone: "dark",
    layers: [img("logo-full", 0.36, 0.9), txt("ORGULLO ESPAÑOL", "sans", CR, 0.6, 0.022)],
    products: ["tee", "hoodie", "sweat", "mug", "tote", "sticker", "poster"],
    posterBg: "#0d0d0d",
    tags: ["logo", "bestseller"],
  },
  {
    slug: "leon-pecho",
    collection: "esenciales",
    name: "León al pecho",
    line: "Discreto y reconocible: el león bordado en tu día a día.",
    tone: "dark",
    layers: [img("logo-lion", 0.13, 0.2, 0.26)],
    products: ["tee", "hoodie", "sweat"],
    tags: ["logo", "minimal"],
  },
  {
    slug: "firma-texto",
    collection: "esenciales",
    name: "Rojo y Gualda",
    line: "Las letras de la marca en rojo y oro.",
    tone: "light",
    layers: [img("logo-text", 0.25, 0.8), img("stripes-rg", 0.47, 0.5)],
    products: ["tee", "tote", "mug", "kids"],
    tags: ["logo"],
  },

  // ───────── ESPAÑA ─────────
  {
    slug: "espana-bandas",
    collection: "espana",
    name: "España Bandas",
    line: "Tipografía XL y las bandas rojo y gualda.",
    tone: "dark",
    layers: [txt("ESPAÑA", "sport", G2, 0.24, 0.2), img("flagband", 0.45, 0.82), txt("UN PAÍS · MIL FORMAS DE LLEVARLO", "sans", CR, 0.56, 0.022)],
    products: ["tee", "hoodie", "mug", "sticker", "poster"],
    posterBg: "#0d0d0d",
    tags: ["patria"],
  },
  {
    slug: "hecho-en-espana",
    collection: "espana",
    name: "Hecho en España",
    line: "El mapa de casa con sello de origen.",
    tone: "light",
    layers: [img("spain-red", 0.3, 0.74), txt("HECHO EN ESPAÑA", "serif", INK, 0.6, 0.045), txt("CON ORGULLO · DESDE SIEMPRE", "sans", R, 0.67, 0.02)],
    products: ["tee", "tote", "mug", "poster", "kids"],
    posterBg: CR,
  },
  {
    slug: "sol-de-espana",
    collection: "espana",
    name: "Sol de España",
    line: "Un sol de veinticuatro rayos en rojo y oro.",
    tone: "dark",
    layers: [img("sun-gold", 0.29, 0.56), txt("SOL DE ESPAÑA", "serif", G2, 0.6, 0.05), txt("LUZ · CALOR · CARÁCTER", "sans", CR, 0.67, 0.02)],
    products: ["tee", "hoodie", "poster", "mug"],
    posterBg: "#0d0d0d",
  },

  // ───────── HERITAGE ─────────
  {
    slug: "tierra-de-castillos",
    collection: "heritage",
    name: "Tierra de Castillos",
    line: "Murallas, torres y siglos de historia en oro viejo.",
    tone: "dark",
    layers: [img("ring-gold", 0.32, 0.66), img("castle-gold", 0.32, 0.36), txt("TIERRA DE CASTILLOS", "serif", G2, 0.65, 0.04), txt("HERENCIA · HISTORIA · ORGULLO", "sans", CR, 0.71, 0.019)],
    products: ["tee", "hoodie", "poster", "mug"],
    posterBg: "#0d0d0d",
  },
  {
    slug: "rosa-de-los-vientos",
    collection: "heritage",
    name: "Rosa de los Vientos",
    line: "Para los que llevan el mar y el rumbo en la sangre.",
    tone: "light",
    layers: [img("compass-navy", 0.3, 0.58), txt("RUTA DE LOS NAVEGANTES", "serif", NAVY, 0.62, 0.036), txt("MAR · PUERTO · DESTINO", "sans", R, 0.68, 0.02)],
    products: ["tee", "tote", "poster", "mug"],
    posterBg: CR,
  },
  {
    slug: "laurel-orgullo",
    collection: "heritage",
    name: "Laurel",
    line: "Corona de laurel: honor, constancia y orgullo.",
    tone: "dark",
    layers: [img("laurel-gold", 0.34, 0.74), txt("ORGULLO", "serif", G2, 0.33, 0.05), txt("ESPAÑOL", "sans", CR, 0.39, 0.022)],
    products: ["tee", "hoodie", "sweat", "mug"],
  },

  // ───────── MEDITERRÁNEO ─────────
  {
    slug: "atardecer-mediterraneo",
    collection: "mediterraneo",
    name: "Atardecer",
    line: "Sol retro sobre las olas: el verano de siempre.",
    tone: "light",
    layers: [img("sunset-warm", 0.3, 0.7), txt("MEDITERRÁNEO", "serif", NAVY, 0.58, 0.05), txt("SAL · LUZ · TIEMPO LENTO", "sans", SEA, 0.65, 0.02)],
    products: ["tee", "tote", "poster", "mug"],
    posterBg: CR,
  },
  {
    slug: "casa-azulejo",
    collection: "mediterraneo",
    name: "Azulejo",
    line: "El azulejo de la casa de la abuela, en azul cobalto.",
    tone: "light",
    layers: [img("azulejo-blue", 0.3, 0.54), txt("CASA MEDITERRÁNEA", "serif", SEA, 0.6, 0.04), txt("HECHO CON CALMA", "sans", NAVY, 0.66, 0.02)],
    products: ["tote", "mug", "poster", "tee"],
    posterBg: "#ffffff",
  },
  {
    slug: "vivir-cerca-del-mar",
    collection: "mediterraneo",
    name: "Cerca del Mar",
    line: "Olas en crema sobre negro, limpio y moderno.",
    tone: "dark",
    layers: [img("waves-cream", 0.27, 0.62), txt("VIVIR CERCA DEL MAR", "display", CR, 0.5, 0.05), txt("MEDITERRÁNEO", "sans", G, 0.57, 0.02)],
    products: TEE_DARK,
  },

  // ───────── MOTOR ─────────
  {
    slug: "cuentarrevoluciones",
    collection: "motor",
    name: "Cuentarrevoluciones",
    line: "La aguja en rojo y la carretera por delante.",
    tone: "dark",
    layers: [img("gauge-gold", 0.27, 0.62), txt("MOTOR", "sport", G2, 0.55, 0.12), txt("CARRETERA NACIONAL", "sans", CR, 0.66, 0.022)],
    products: ["tee", "hoodie", "mug", "poster"],
    posterBg: "#0d0d0d",
  },
  {
    slug: "gasolina-y-curvas",
    collection: "motor",
    name: "Gasolina y Curvas",
    line: "Bandera a cuadros para domingos de circuito.",
    tone: "dark",
    layers: [img("checkered", 0.26, 0.48), txt("GASOLINA Y CURVAS", "sport", "#ffffff", 0.55, 0.075), txt("CLUB DEL MOTOR · ESPAÑA", "sans", G, 0.63, 0.02)],
    products: ["tee", "hoodie", "sticker"],
  },

  // ───────── AFICIÓN (fútbol) ─────────
  {
    slug: "aficion-balon",
    collection: "futbol",
    name: "Afición",
    line: "El balón en rojo y oro. El fútbol se vive en la grada.",
    tone: "dark",
    layers: [img("football-gold", 0.27, 0.46), txt("AFICIÓN", "sport", G2, 0.55, 0.12), txt("EL FÚTBOL SE VIVE EN LA GRADA", "sans", CR, 0.66, 0.02)],
    products: ["tee", "hoodie", "mug", "sticker", "kids"],
    template: "jersey",
  },
  {
    slug: "domingo-de-futbol",
    collection: "futbol",
    name: "Domingo de Fútbol",
    line: "Líneas del campo y el plan de cada domingo.",
    tone: "light",
    layers: [img("pitch-ink", 0.28, 0.42), txt("DOMINGO DE FÚTBOL", "sport", INK, 0.6, 0.075), txt("BAR · GRADA · CALLE", "sans", R, 0.68, 0.022)],
    products: ["tee", "tote", "poster"],
    posterBg: CR,
    template: "jersey",
  },

  // ───────── PÁDEL ─────────
  {
    slug: "padel-club",
    collection: "padel",
    name: "Pádel Club",
    line: "Pala, bola y la pista del barrio.",
    tone: "light",
    layers: [img("padel-red", 0.27, 0.5), txt("PÁDEL CLUB", "sport", INK, 0.57, 0.11), txt("DESDE LA PISTA DEL BARRIO", "sans", R, 0.67, 0.02)],
    products: ["tee", "tote", "mug", "sticker"],
  },
  {
    slug: "vamos-a-la-pista",
    collection: "padel",
    name: "Vamos a la Pista",
    line: "Para el cuarto de pádel de los jueves.",
    tone: "dark",
    layers: [img("padel-red", 0.26, 0.44), txt("VAMOS A LA PISTA", "display", CR, 0.53, 0.055), txt("PÁDEL · ESPAÑA", "sans", G, 0.6, 0.02)],
    products: TEE_DARK,
  },

  // ───────── CICLISMO ─────────
  {
    slug: "puerto-de-montana",
    collection: "ciclismo",
    name: "Puerto de Montaña",
    line: "Rampas, cunetas pintadas y la cima en oro.",
    tone: "dark",
    layers: [img("mountain-gold", 0.27, 0.66), txt("PUERTO DE MONTAÑA", "sport", G2, 0.57, 0.075), txt("SALIDA DE DOMINGO", "sans", CR, 0.65, 0.022)],
    products: ["tee", "hoodie", "mug", "poster"],
    posterBg: "#0d0d0d",
  },
  {
    slug: "a-rueda",
    collection: "ciclismo",
    name: "A Rueda",
    line: "La bici clásica y la grupeta de siempre.",
    tone: "light",
    layers: [img("bike-ink", 0.27, 0.68), txt("A RUEDA", "display", INK, 0.55, 0.09), txt("CICLISMO · ESPAÑA", "sans", R, 0.64, 0.022)],
    products: ["tee", "tote", "sticker"],
  },

  // ───────── MI PUEBLO ─────────
  {
    slug: "mi-pueblo-mapa",
    collection: "mi-pueblo",
    name: "Mi Pueblo",
    line: "El mapa, el pin y tu pueblo de toda la vida.",
    tone: "light",
    layers: [img("spain-ink", 0.28, 0.72), img("pin-red", 0.22, 0.11, 0.42), txt("MI PUEBLO", "serif", INK, 0.56, 0.06), txt("DE TODA LA VIDA", "sans", R, 0.63, 0.022)],
    products: ["tee", "tote", "mug"],
    template: "pueblo",
  },
  {
    slug: "orgullo-de-pueblo",
    collection: "mi-pueblo",
    name: "Orgullo de Pueblo",
    line: "Rojo, oro y la plaza del pueblo en verano.",
    tone: "dark",
    layers: [txt("ORGULLO", "serif", G2, 0.22, 0.075), txt("DE PUEBLO", "serif", G2, 0.31, 0.075), img("stripes-rg", 0.41, 0.56), txt("FIESTAS · PEÑAS · VERANO", "sans", CR, 0.48, 0.02)],
    products: TEE_DARK,
    template: "pueblo",
  },

  // ───────── FIESTAS ─────────
  {
    slug: "de-feria",
    collection: "fiestas",
    name: "De Feria",
    line: "Abanico, farolillos y noche larga.",
    tone: "dark",
    layers: [img("fan-red", 0.27, 0.6), txt("de Feria", "script", G2, 0.55, 0.075), txt("FIESTAS DE ESPAÑA", "sans", CR, 0.64, 0.022)],
    products: ["tee", "tote", "poster"],
    posterBg: "#0d0d0d",
  },
  {
    slug: "verbena",
    collection: "fiestas",
    name: "Verbena",
    line: "Fuegos, orquesta y hasta que salga el sol.",
    tone: "dark",
    layers: [img("burst", 0.25, 0.46), txt("VERBENA", "sport", Y, 0.53, 0.12), txt("HASTA QUE SALGA EL SOL", "sans", CR, 0.64, 0.022)],
    products: ["tee", "hoodie", "sticker"],
  },

  // ───────── PLAYA ─────────
  {
    slug: "chiringuito-club",
    collection: "playa",
    name: "Chiringuito Club",
    line: "Palmera, sombra y caña fría.",
    tone: "light",
    layers: [img("palm-sea", 0.25, 0.3), txt("CHIRINGUITO CLUB", "sport", R, 0.55, 0.08), txt("VERANO · SAL · SIESTA", "sans", SEA, 0.63, 0.022)],
    products: ["tee", "tote", "mug"],
  },
  {
    slug: "costa",
    collection: "playa",
    name: "Costa",
    line: "Atardecer de verano en crema y oro.",
    tone: "dark",
    layers: [img("sunset-cream", 0.27, 0.66), txt("COSTA", "serif", CR, 0.55, 0.08), txt("VERANO ETERNO", "sans", G, 0.63, 0.022)],
    products: ["tee", "hoodie", "poster"],
    posterBg: "#0d0d0d",
  },

  // ───────── TAPAS & VERMUT ─────────
  {
    slug: "hora-del-vermut",
    collection: "tapas",
    name: "La Hora del Vermut",
    line: "Copa, aceituna y la hora más sagrada del domingo.",
    tone: "light",
    layers: [img("vermut", 0.26, 0.38), txt("LA HORA DEL VERMUT", "serif", INK, 0.57, 0.04), txt("es sagrada", "script", R, 0.65, 0.04)],
    products: ["tee", "tote", "mug", "poster"],
    posterBg: CR,
  },
  {
    slug: "tapeo",
    collection: "tapas",
    name: "Tapeo",
    line: "Una caña, unas olivas y la barra de siempre.",
    tone: "dark",
    layers: [img("olive-cream", 0.24, 0.28), txt("TAPEO", "sport", CR, 0.53, 0.13), txt("y una cañita", "script", G2, 0.64, 0.04)],
    products: ["tee", "mug", "sticker"],
  },

  // ───────── CAMINO ─────────
  {
    slug: "buen-camino",
    collection: "camino",
    name: "Buen Camino",
    line: "La concha, la flecha amarilla y Santiago al final.",
    tone: "light",
    layers: [img("shell-yellow", 0.25, 0.56), txt("BUEN CAMINO", "serif", NAVY, 0.52, 0.055), img("arrow-yellow", 0.62, 0.22)],
    products: ["tee", "tote", "sticker", "mug"],
  },
  {
    slug: "sigue-la-flecha",
    collection: "camino",
    name: "Sigue la Flecha",
    line: "Para peregrinos de verdad.",
    tone: "dark",
    layers: [img("arrow-yellow", 0.24, 0.5), txt("SIGUE LA FLECHA", "sport", Y, 0.47, 0.08), txt("HASTA SANTIAGO", "sans", CR, 0.55, 0.022)],
    products: TEE_DARK,
  },
];

export const DESIGNS: Design[] = [...BASE_DESIGNS, ...cityDesigns()];

export const designBySlug = (slug: string) => DESIGNS.find((d) => d.slug === slug) ?? null;
export const designsFor = (collection: string) => DESIGNS.filter((d) => d.collection === collection);

/** Layers with absolute art URLs (server rendering / external consumers). */
export function absoluteLayers(layers: Layer[], base: string): Layer[] {
  return layers.map((l) => (l.type === "image" && l.path.startsWith("art/") ? { ...l, url: artUrl(l.path.slice(4, -4), base) } : l));
}

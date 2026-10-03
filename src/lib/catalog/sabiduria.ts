/**
 * REFRANERO Y SABIDURÍA — a clothing series of sayings: classic refranes, warm pride lines, grandma's
 * phrases, light Spanish humour, calm, love and kids. Every saying is a traditional public-domain
 * refrán / expression or an original line written for ROJO Y GUALDA (no quotes from copyrighted works
 * or living authors).
 *
 * Nine typographic looks, all set BIG (the main lines span ~80–86 % of the print width):
 *  bloque      stacked condensed type (Anton), every line fitted to the same width
 *  clasico     elegant serif (Cinzel) split by a fleuron, small tracked label on top
 *  manuscrito  hand script (Pacifico) with a brush swash underneath
 *  sello       vintage circular badge (lettered ring) with the saying in the centre
 *  azulejo     the saying inside a painted azulejo tile (blue or Talavera blue-ochre)
 *  bicolor     split two-colour: modern grotesque on top, the punchline on a colour bar
 *  ilustracion an author illustration (ART_SERIES) with the saying under it
 *  leon        the crowned lion inside the house seal, saying underneath
 *  pop         playful multi-colour type with sparkles (kids)
 * Ornaments are brand PNGs (scripts/sabiduria-art.mjs → public/catalog/art/sab-*.png, in the manifest),
 * so every design uses the plain text/image layers and stays within the designer's 8 layers.
 * Tagged "sabiduria" (builder priority 0) and gathered on /sabiduria.
 */
import type { FontKey, ImageLayer, Layer, TextLayer } from "@/lib/personalization/types";
import type { BlueprintKey, Design, Tone } from "./designs";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";
import glyphWidths from "./glyph-widths.json";

const WF: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };
const RATIO = 3200 / 2400;
let n = 0;
const id = () => `s${(n++).toString(36)}`;

/** The renderer's own width model (artwork.tsx fitFontSize): layer width per unit of font size. */
const span = (t: string, font: FontKey) => RATIO * [...t].length * WF[font];
/** Real advance widths (em) of the print fonts, measured once in the Satori print renderer (trimmed ink width of "H"+c+"H" minus "HH" at 200 px). */
const GW = glyphWidths as Record<FontKey, Record<string, number>>;
const real = (t: string, font: FontKey) => RATIO * [...t].reduce((s, c) => s + (GW[font]?.[c] ?? WF[font]), 0);
/** Font size (fraction of canvas height) so `t` really spans `width` (fraction of canvas width), capped at `max`. */
const fit = (t: string, font: FontKey, width: number, max: number) => Math.min(max, width / real(t, font));
/** Letter-spaced caps for small labels (non-breaking spaces survive whitespace collapsing). */
const track = (t: string) => [...t.toUpperCase()].map((c) => (c === " " ? "  " : c)).join(" ");

/**
 * Text layer at font size `size`. The renderer sizes text from the box width with its average-width
 * model; when a font is really wider than that model (Anton, Bricolage caps) the text would overflow
 * its box, and Satori lets an overflowing line run off to the right instead of staying centred. Pad
 * with non-breaking spaces until the box is at least as wide as the real line, so print = preview.
 */
function T(text: string, font: FontKey, color: string, y: number, size: number, x = 0.5): TextLayer {
  let t = text;
  for (let i = 0; i < 12 && real(t, font) > span(t, font) * 0.98; i++) t = ` ${t} `;
  return { id: id(), type: "text", text: t, font, color, x, y: +y.toFixed(4), w: +Math.min(0.96, size * span(t, font)).toFixed(4), rotation: 0 };
}
const I = (name: string, y: number, w: number, x = 0.5): ImageLayer => ({ id: id(), type: "image", path: artPath(name as ArtName), url: artUrl(name), aspect: artAspect(name), x, y: +y.toFixed(4), w: +w.toFixed(4), rotation: 0 });

/* ───────── vertical stacking ───────── */
/** Visual line height per unit of font size, and the centre correction (glyphs sit off the box centre). */
const VH: Record<FontKey, number> = { sport: 0.9, serif: 0.74, display: 0.8, sans: 0.74, script: 1.1 };
const VOFF: Record<FontKey, number> = { sport: 0, serif: 0, display: 0, sans: 0, script: -0.06 };

type Item = { kind: "t"; text: string; font: FontKey; color: string; size: number; gap?: number; fixed?: boolean } | { kind: "i"; name: string; w: number; gap?: number; x?: number };
const hOf = (it: Item) => (it.kind === "t" ? it.size * VH[it.font] : it.w * artAspect(it.name) * 0.75);

/** Extra clearance between two lines: accents over capitals, descenders (Q, commas, script loops). */
function clearance(a: Item, b: Item | undefined) {
  let c = 0;
  if (a.kind === "t") c += a.font === "script" ? (/[gjpqyf]/.test(a.text) ? 0.2 * a.size : 0) : /[Q,;]/.test(a.text) ? 0.06 * a.size : 0;
  if (b?.kind === "t") c += b.font === "script" ? (/[A-ZÁÉÍÓÚÑbdfhklt¡¿]/.test(b.text) ? 0.08 * b.size : 0) : /[ÁÉÍÓÚÑÜ¡]/.test(b.text) ? 0.13 * b.size : 0;
  return c;
}
const gapsOf = (items: Item[]) => items.slice(0, -1).reduce((s, it, i) => s + (it.gap ?? 0.03) + clearance(it, items[i + 1]), 0);

/** Lays the items out top→bottom centred on `cy`; if taller than `maxH`, text shrinks to fit. */
function stack(items: Item[], cy: number, maxH = 0.74): Layer[] {
  const total = items.reduce((s, it) => s + hOf(it), 0) + gapsOf(items);
  if (total > maxH) {
    const textH = items.filter((i) => i.kind === "t" && !i.fixed).reduce((s, it) => s + hOf(it), 0);
    const k = Math.max(0.5, (maxH - (total - textH)) / textH);
    items = items.map((it) => (it.kind === "t" && !it.fixed ? { ...it, size: it.size * k } : it));
  }
  const tot = items.reduce((s, it) => s + hOf(it), 0) + gapsOf(items);
  let y = cy - tot / 2;
  const out: Layer[] = [];
  items.forEach((it, i) => {
    const h = hOf(it);
    out.push(it.kind === "t" ? T(it.text, it.font, it.color, y + h / 2 + VOFF[it.font] * it.size, it.size) : I(it.name, y + h / 2, it.w, it.x));
    y += h + (it.gap ?? 0.03) + clearance(it, items[i + 1]);
  });
  return out;
}

/* ───────── palette ───────── */
const INK = "#1c1a17", RED = "#a3162b", GOLD = "#b8892a", BLUE = "#1d4e89", OCHRE = "#c9861c", NAVY = "#14213d";
const CREAM = "#f3ead7", GOLD2 = "#e0b44a", RED2 = "#d23a3a", YELLOW = "#ffc400";
const pal = (tone: Tone) => (tone === "light" ? { ink: INK, acc: RED, alt: GOLD, orn: "red", gold: "gold" } : { ink: CREAM, acc: GOLD2, alt: RED2, orn: "gold2", gold: "gold2" });

/* ───────── data ───────── */
export type SabCat = "clasicos" | "patria" | "abuela" | "humor" | "calma" | "amor" | "peques";
export type SabStyle = "bloque" | "clasico" | "manuscrito" | "sello" | "azulejo" | "bicolor" | "ilustracion" | "leon" | "pop";

export interface Saying {
  key: string;
  cat: SabCat;
  /** The saying as written (shown in names and copy). */
  text: string;
  /** Typeset lines (the look decides the fonts). bicolor: last line goes on the bar. clasico: lines after `split` take the accent. */
  lines: string[];
  style: SabStyle;
  /** Tones produced; default by category. */
  tones?: Tone[];
  /** bloque / sello / pop: indexes of lines set in the accent colour (default: last). */
  accent?: number[];
  /** clasico: first accent line (default: half). */
  split?: number;
  /** ilustracion: ART_SERIES site-art name. */
  art?: string;
  /** azulejo: tile colourway. */
  tile?: "blue" | "talavera";
  /** One-sentence copy for the product page. */
  line: string;
  products?: BlueprintKey[];
}

export const SAB_CATS: { key: SabCat; es: string; en: string; sub: [string, string]; label: string }[] = [
  { key: "clasicos", es: "Refranes de siempre", en: "Classic proverbs", sub: ["Lo que decían nuestros abuelos, compuesto a lo grande.", "What our grandparents used to say, set big and bold."], label: "Refranero español" },
  { key: "patria", es: "Orgullo de aquí", en: "Pride of home", sub: ["Frases nuestras, cálidas y para todas las tierras de España.", "Our own lines, warm and for every corner of Spain."], label: "Hecho en España" },
  { key: "abuela", es: "Frases de abuela", en: "Grandma says", sub: ["Come, abrígate y llama a tu madre: el cariño de casa.", "Eat up, wrap up and call your mother: love from home."], label: "Como dice la abuela" },
  { key: "humor", es: "Humor español", en: "Spanish humour", sub: ["Siesta, fiesta y filosofía de bar. Ligero y sin malos rollos.", "Siesta, fiesta and bar-stool philosophy. Light and good-natured."], label: "Filosofía española" },
  { key: "calma", es: "Vida y calma", en: "Slow living", sub: ["Sin prisa, pero sin pausa: frases para vivir despacio.", "Unhurried but unceasing: lines for slow living."], label: "Sabiduría de siempre" },
  { key: "amor", es: "Amor", en: "Love", sub: ["Contigo, pan y cebolla: para regalar a quien quieres.", "Bread and onions with you: gifts for the one you love."], label: "Con todo el cariño" },
  { key: "peques", es: "Para peques", en: "For little ones", sub: ["Pequeños pero matones: frases tiernas para niños y bebés.", "Small but mighty: sweet lines for kids and babies."], label: "Hecho con amor" },
];

export const SAYINGS: Saying[] = [
  /* ───────── Refranes clásicos ───────── */
  { key: "al-mal-tiempo", cat: "clasicos", text: "Al mal tiempo, buena cara", lines: ["AL MAL", "TIEMPO,", "BUENA", "CARA"], accent: [2, 3], style: "bloque", tones: ["light", "dark"], line: "El refrán más español de todos, en tipografía condensada que llena la prenda." },
  { key: "poco-a-poco", cat: "clasicos", text: "Poco a poco se va lejos", lines: ["POCO A POCO", "SE VA", "LEJOS"], split: 1, style: "clasico", tones: ["light", "dark"], line: "Paciencia y constancia, en letra clásica con filete de imprenta." },
  { key: "quien-madruga", cat: "clasicos", text: "A quien madruga, Dios le ayuda", lines: ["A QUIEN", "MADRUGA,", "DIOS LE", "AYUDA"], accent: [2, 3], style: "sello", line: "Para los de despertador temprano: el refrán en un sello vintage de refranero." },
  { key: "herrero", cat: "clasicos", text: "En casa del herrero, cuchillo de palo", lines: ["EN CASA", "DEL HERRERO,", "CUCHILLO", "DE PALO"], split: 2, style: "clasico", line: "La ironía de toda la vida, compuesta como en una imprenta antigua." },
  { key: "buen-arbol", cat: "clasicos", text: "Quien a buen árbol se arrima, buena sombra le cobija", lines: ["QUIEN A BUEN ÁRBOL", "SE ARRIMA,", "BUENA SOMBRA", "LE COBIJA"], art: "art-olivo", style: "ilustracion", line: "El olivo centenario de autor con uno de los refranes más bonitos del castellano." },
  { key: "perro-ladrador", cat: "clasicos", text: "Perro ladrador, poco mordedor", lines: ["PERRO", "LADRADOR,", "POCO MORDEDOR"], style: "bicolor", tones: ["light", "dark"], line: "Mucho ruido y pocas nueces: grotesca moderna y remate en barra roja." },
  { key: "camaron", cat: "clasicos", text: "Camarón que se duerme, se lo lleva la corriente", lines: ["CAMARÓN", "QUE SE DUERME,", "SE LO LLEVA", "LA CORRIENTE"], accent: [2, 3], style: "bloque", line: "Para los que no se duermen en los laureles, en bloque tipográfico XL." },
  { key: "dime-con-quien", cat: "clasicos", text: "Dime con quién andas y te diré quién eres", lines: ["DIME CON", "QUIÉN ANDAS", "Y TE DIRÉ", "QUIÉN ERES"], split: 2, style: "clasico", line: "Un clásico para regalar a la cuadrilla de siempre." },
  { key: "ojos-que-no-ven", cat: "clasicos", text: "Ojos que no ven, corazón que no siente", lines: ["OJOS QUE", "NO VEN,", "CORAZÓN QUE NO SIENTE"], style: "bicolor", line: "El refrán de los despistes perdonados, en dos colores." },
  { key: "caballo-regalado", cat: "clasicos", text: "A caballo regalado, no le mires el diente", lines: ["A CABALLO", "REGALADO,", "NO LE MIRES", "EL DIENTE"], accent: [2, 3], style: "sello", tones: ["light", "dark"], line: "El regalo perfecto con el refrán perfecto, en sello de refranero." },
  { key: "diablo-viejo", cat: "clasicos", text: "Más sabe el diablo por viejo que por diablo", lines: ["MÁS SABE", "EL DIABLO", "POR VIEJO", "QUE POR DIABLO"], accent: [2, 3], style: "bloque", tones: ["light", "dark"], line: "Para los que tienen tablas: la experiencia, en tipografía grande." },
  { key: "mas-vale-tarde", cat: "clasicos", text: "Más vale tarde que nunca", lines: ["MÁS VALE", "TARDE", "QUE NUNCA"], accent: [1], style: "sello", line: "Para los impuntuales con encanto, en sello vintage." },
  { key: "boca-cerrada", cat: "clasicos", text: "En boca cerrada no entran moscas", lines: ["EN BOCA", "CERRADA", "NO ENTRAN MOSCAS"], style: "bicolor", line: "Discreción ante todo: el consejo de siempre en dos colores." },
  { key: "buen-entendedor", cat: "clasicos", text: "A buen entendedor, pocas palabras bastan", lines: ["A BUEN", "ENTENDEDOR,", "POCAS PALABRAS", "BASTAN"], split: 2, style: "clasico", tones: ["light", "dark"], line: "Pocas palabras, letra grande: el refrán en serifa clásica." },
  { key: "barriga-llena", cat: "clasicos", text: "Barriga llena, corazón contento", lines: ["BARRIGA", "LLENA,", "corazón", "CONTENTO"], style: "azulejo", tile: "talavera", line: "Para la cocina y la sobremesa: el refrán dentro de un azulejo de Talavera.", products: ["apron", "mug", "tote", "tee", "pillow", "poster"] },

  /* ───────── Orgullo / patria (originales) ───────── */
  { key: "hecho-con-alma", cat: "patria", text: "Hecho en España, con alma", lines: ["HECHO EN ESPAÑA,", "CON ALMA"], style: "leon", tones: ["light", "dark"], line: "El león coronado de la casa dentro del sello, y una frase que lo dice todo." },
  { key: "de-toda-la-vida", cat: "patria", text: "De aquí, de toda la vida", lines: ["DE AQUÍ,", "DE TODA", "LA VIDA"], accent: [1, 2], style: "bloque", tones: ["light", "dark"], line: "Para los de aquí de siempre, sea cual sea tu tierra." },
  { key: "mi-tierra-mi-gente", cat: "patria", text: "Mi tierra, mi gente", lines: ["MI TIERRA,", "MI GENTE"], split: 1, style: "clasico", tones: ["light", "dark"], line: "Dos palabras que pesan: la tierra y la gente, en letra clásica." },
  { key: "mil-acentos", cat: "patria", text: "Mil acentos, un mismo corazón", lines: ["MIL ACENTOS,", "UN MISMO", "CORAZÓN"], accent: [1, 2], style: "bloque", tones: ["light", "dark"], line: "Del gallego al andaluz, del catalán al canario: España suena de mil maneras." },
  { key: "se-lleva-dentro", cat: "patria", text: "España se lleva dentro", lines: ["ESPAÑA", "se lleva dentro"], style: "manuscrito", tones: ["light", "dark"], line: "Orgullo tranquilo, en letra manuscrita con trazo de pincel." },
  { key: "norte-a-sur", cat: "patria", text: "De norte a sur, de mar a sierra", lines: ["DE NORTE", "A SUR,", "DE MAR", "A SIERRA"], accent: [2, 3], style: "sello", tones: ["light", "dark"], line: "Toda España en un sello: costa, montaña, norte y sur." },
  { key: "raices-y-alas", cat: "patria", text: "Con raíces y con alas", lines: ["Con raíces", "y con alas"], style: "manuscrito", line: "Para los que se fueron y para los que se quedaron: raíces en casa, alas para volar." },
  { key: "corazon-rojigualdo", cat: "patria", text: "Corazón rojo y gualda", lines: ["CORAZÓN", "ROJO Y GUALDA"], style: "leon", line: "El león coronado en su sello y el corazón con los colores de casa." },
  { key: "sol-familia-sobremesa", cat: "patria", text: "Sol, familia y sobremesa", lines: ["SOL,", "FAMILIA", "Y SOBREMESA"], accent: [2], style: "bloque", tones: ["light", "dark"], line: "Los tres pilares de la vida en España, en bloque tipográfico." },
  { key: "tierra-buena-gente", cat: "patria", text: "Tierra de sol y de buena gente", lines: ["TIERRA", "DE SOL", "y de", "BUENA GENTE"], style: "azulejo", tile: "blue", line: "Un azulejo azul con lo mejor de casa: el sol y la gente.", products: ["tee", "tote", "mug", "pillow", "poster", "womtee"] },

  /* ───────── Frases de abuela / familia ───────── */
  { key: "come-delgado", cat: "abuela", text: "Come, que estás muy delgado", lines: ["¡COME,", "que estás", "MUY", "DELGADO!"], style: "azulejo", tile: "talavera", line: "La frase de todas las abuelas de España, en azulejo de cocina.", products: ["apron", "mug", "tote", "tee", "pillow", "poster"] },
  { key: "abrigate", cat: "abuela", text: "Abrígate, que refresca", lines: ["Abrígate,", "que refresca"], style: "manuscrito", tones: ["light", "dark"], line: "El consejo que nunca falla, en la sudadera que lo cumple.", products: ["sweat", "hoodie", "womsweat", "womcrop", "kidshoodie", "mug"] },
  { key: "familia-primero", cat: "abuela", text: "Lo primero es la familia", lines: ["LO PRIMERO", "es la", "FAMILIA"], style: "azulejo", tile: "blue", line: "Un azulejo para el salón, la cocina o la camiseta: la familia, siempre primero.", products: ["pillow", "poster", "mug", "tote", "tee", "womtee"] },
  { key: "chaqueta-por-si-acaso", cat: "abuela", text: "Llévate una chaqueta, por si acaso", lines: ["LLÉVATE", "UNA CHAQUETA,", "POR SI", "ACASO"], accent: [2, 3], style: "bloque", line: "Lo dice tu madre, lo decía tu abuela y lo dirás tú." },
  { key: "donde-comen-dos", cat: "abuela", text: "Donde comen dos, comen tres", lines: ["DONDE", "COMEN DOS,", "comen", "TRES"], style: "azulejo", tile: "talavera", line: "La hospitalidad española en un azulejo para la cocina.", products: ["apron", "mug", "pillow", "poster", "tote"] },
  { key: "has-comido", cat: "abuela", text: "¿Has comido?", lines: ["¿HAS", "COMIDO?"], accent: [1], style: "bloque", tones: ["light", "dark"], line: "Dos palabras que significan «te quiero» en cualquier casa española." },
  { key: "padre-huevos", cat: "abuela", text: "Cuando seas padre, comerás huevos", lines: ["CUANDO", "SEAS PADRE,", "COMERÁS HUEVOS"], style: "bicolor", line: "La respuesta de todos los padres de España, ahora en tu camiseta." },
  { key: "casa-abuela", cat: "abuela", text: "Casa de abuela, siempre abierta", lines: ["Casa de abuela,", "siempre abierta"], style: "manuscrito", line: "Para la abuela que siempre tiene la puerta abierta y la cazuela al fuego.", products: ["mug", "pillow", "apron", "tote", "womsweat", "poster"] },
  { key: "croquetas", cat: "abuela", text: "En casa de la abuela siempre hay croquetas", lines: ["EN CASA", "DE LA ABUELA", "SIEMPRE HAY", "CROQUETAS"], accent: [3], style: "bloque", line: "Una verdad universal, en tipografía XL.", products: ["tee", "apron", "mug", "tote", "womtee"] },

  /* ───────── Humor español ───────── */
  { key: "para-manana", cat: "humor", text: "Lo dejo para mañana… que es fiesta", lines: ["LO DEJO", "PARA MAÑANA…", "QUE ES FIESTA"], style: "bicolor", tones: ["light", "dark"], line: "Planificación a la española: lo importante, después del puente." },
  { key: "siesta-sagrada", cat: "humor", text: "Siesta, sagrada", lines: ["SIESTA,", "SAGRADA"], split: 1, style: "clasico", tones: ["light", "dark"], line: "Un patrimonio nacional tratado con la solemnidad que merece." },
  { key: "venir-llorado", cat: "humor", text: "Aquí se viene llorado de casa", lines: ["AQUÍ SE VIENE", "LLORADO", "DE CASA"], accent: [1], style: "bloque", tones: ["light", "dark"], line: "La frase de la abuela para no quejarse, convertida en lema." },
  { key: "que-no-decaiga", cat: "humor", text: "Que no decaiga", lines: ["Que no", "decaiga"], style: "manuscrito", tones: ["light", "dark"], line: "Para la verbena, la boda y la cena de empresa: la fiesta sigue." },
  { key: "menos-lobos", cat: "humor", text: "Menos lobos, Caperucita", lines: ["MENOS", "LOBOS,", "CAPERUCITA"], style: "bicolor", line: "La expresión de toda la vida para los que exageran un poquito." },
  { key: "dieta-lunes", cat: "humor", text: "El lunes empiezo la dieta", lines: ["EL LUNES", "empiezo la", "DIETA"], style: "azulejo", tile: "blue", line: "Una promesa que todos hemos hecho, en azulejo para la taza del desayuno.", products: ["mug", "apron", "tee", "tote"] },
  { key: "siesta-domingo", cat: "humor", text: "Hoy no madrugo, que es domingo", lines: ["HOY NO", "MADRUGO,", "QUE ES", "DOMINGO"], accent: [2, 3], style: "sello", line: "El sello oficial del domingo: sin despertador y con vermut." },
  { key: "vamos-a-lo-que-vamos", cat: "humor", text: "Vamos a lo que vamos", lines: ["VAMOS", "A LO QUE", "VAMOS"], accent: [2], style: "bloque", line: "Directo al grano, como se dice en cualquier barra de bar." },

  /* ───────── Vida y calma ───────── */
  { key: "sin-prisa", cat: "calma", text: "Sin prisa, pero sin pausa", lines: ["SIN PRISA,", "PERO", "SIN PAUSA"], accent: [2], style: "bloque", tones: ["light", "dark"], line: "El ritmo perfecto de la vida, en bloque tipográfico." },
  { key: "lo-que-es-para-ti", cat: "calma", text: "Lo que es para ti, ni aunque te quites", lines: ["LO QUE ES", "PARA TI,", "NI AUNQUE", "TE QUITES"], split: 2, style: "clasico", tones: ["light", "dark"], line: "La frase que tranquiliza a toda España, en letra clásica." },
  { key: "vive-despacio", cat: "calma", text: "Vive despacio", lines: ["Vive", "despacio"], style: "manuscrito", tones: ["light", "dark"], line: "Dos palabras en letra manuscrita grande, con trazo de pincel." },
  { key: "todo-pasa", cat: "calma", text: "Respira, que todo pasa", lines: ["RESPIRA,", "QUE TODO PASA"], art: "art-faro", style: "ilustracion", line: "El faro frente al mar bravo y un recordatorio sereno." },
  { key: "manana-otro-dia", cat: "calma", text: "Mañana será otro día", lines: ["MAÑANA", "SERÁ", "OTRO DÍA"], split: 2, style: "clasico", line: "El consuelo de siempre, en serifa elegante." },
  { key: "un-poquito-mejor", cat: "calma", text: "Cada día, un poquito mejor", lines: ["CADA", "DÍA,", "UN POQUITO MEJOR"], style: "bicolor", tones: ["light", "dark"], line: "Sin prisas y sin rendirse: un lema para el día a día." },
  { key: "mas-sol-menos-prisa", cat: "calma", text: "Más sol, menos prisa", lines: ["MÁS SOL,", "MENOS PRISA"], art: "art-chiringuito", style: "ilustracion", line: "El chiringuito de autor con la filosofía del verano mediterráneo." },
  { key: "todo-llega", cat: "calma", text: "Todo llega", lines: ["TODO", "LLEGA"], accent: [1], style: "bloque", tones: ["light", "dark"], line: "Paciencia en dos palabras, a tamaño cartel." },
  { key: "paso-a-paso", cat: "calma", text: "Paso a paso", lines: ["PASO", "A", "PASO"], accent: [1], style: "sello", tones: ["light", "dark"], line: "Para el Camino, la montaña o la vida: un sello para ir paso a paso." },

  /* ───────── Amor ───────── */
  { key: "pan-y-cebolla", cat: "amor", text: "Contigo, pan y cebolla", lines: ["Contigo,", "pan y cebolla"], style: "manuscrito", tones: ["light", "dark"], line: "El amor sin lujos que dura toda la vida, en letra manuscrita." },
  { key: "media-naranja", cat: "amor", text: "Mi media naranja", lines: ["MI MEDIA", "NARANJA"], split: 1, style: "clasico", line: "Para regalar a tu otra mitad (y pedir la otra para ti)." },
  { key: "mas-que-la-siesta", cat: "amor", text: "Te quiero más que a la siesta", lines: ["TE QUIERO", "MÁS QUE", "A LA SIESTA"], accent: [2], style: "bloque", tones: ["light", "dark"], line: "La declaración de amor más española posible." },
  { key: "tu-yo-vermut", cat: "amor", text: "Tú, yo y un vermut", lines: ["TÚ, YO", "Y UN VERMUT"], art: "art-vermut", style: "ilustracion", line: "La hora del vermut de autor para los planes de dos." },
  { key: "querer-es-poder", cat: "amor", text: "Querer es poder", lines: ["QUERER", "ES", "PODER"], accent: [1], style: "sello", line: "El refrán más optimista, en sello vintage." },
  { key: "sal-de-mi-vida", cat: "amor", text: "Eres la sal de mi vida", lines: ["Eres la sal", "de mi vida"], style: "manuscrito", line: "Mediterráneo y cariño en una sola frase." },

  /* ───────── Peques ───────── */
  { key: "pequeno-maton", cat: "peques", text: "Pequeño pero matón", lines: ["PEQUEÑO", "PERO", "MATÓN"], style: "pop", tones: ["light", "dark"], line: "Para los peques con más carácter de la casa." },
  { key: "pequena-matona", cat: "peques", text: "Pequeña pero matona", lines: ["PEQUEÑA", "PERO", "MATONA"], style: "pop", tones: ["light", "dark"], line: "Para las peques con más carácter de la casa." },
  { key: "dientes-mentira", cat: "peques", text: "Hoy no me lavo los dientes… mentira", lines: ["HOY NO ME", "LAVO LOS", "DIENTES…", "¡MENTIRA!"], style: "pop", line: "Una travesura con final feliz (y dientes limpios)." },
  { key: "hecho-con-amor", cat: "peques", text: "Hecho con amor en España", lines: ["HECHO CON AMOR", "EN ESPAÑA"], style: "leon", line: "El primer sello de la casa para el miembro más nuevo de la familia.", products: ["baby", "toddler", "kids", "kidshoodie"] },
  { key: "alegria-de-la-casa", cat: "peques", text: "La alegría de la casa", lines: ["La alegría", "de la casa"], style: "manuscrito", line: "Para bebés y peques que llenan la casa de risas.", products: ["baby", "toddler", "kids", "kidshoodie"] },
  { key: "campeon-siesta", cat: "peques", text: "Campeón de siesta", lines: ["CAMPEÓN", "DE", "SIESTA"], style: "pop", line: "El título que todo bebé se gana desde el primer día.", products: ["baby", "toddler", "kids"] },
  { key: "bueno-como-el-pan", cat: "peques", text: "Más bueno que el pan", lines: ["MÁS BUENO", "QUE EL PAN"], style: "sello", line: "El piropo de las abuelas para los peques más buenos.", products: ["baby", "toddler", "kids", "kidshoodie"] },
];

/* ───────── products per category and tone ───────── */
const LIGHT_PRODUCTS: Record<SabCat, BlueprintKey[]> = {
  clasicos: ["tee", "sweat", "hoodie", "womtee", "tote", "mug", "poster"],
  patria: ["tee", "hoodie", "sweat", "womtee", "tote", "mug", "poster"],
  abuela: ["tee", "womsweat", "mug", "apron", "tote", "pillow"],
  humor: ["tee", "sweat", "womtee", "mug", "tote"],
  calma: ["tee", "womtee", "womcrop", "sweat", "tote", "mug", "poster"],
  amor: ["womtee", "tee", "mug", "tote", "pillow", "poster"],
  peques: ["kids", "kidshoodie", "toddler", "baby"],
};
const DARK_APPAREL: BlueprintKey[] = ["tee", "hoodie", "sweat", "womtee", "womsweat", "womcrop", "kids", "kidshoodie", "toddler", "baby", "mug"];
const DARK_DEFAULT: Record<SabCat, BlueprintKey[]> = {
  clasicos: ["tee", "hoodie", "sweat", "womtee"],
  patria: ["tee", "hoodie", "sweat", "womtee"],
  abuela: ["tee", "hoodie", "womsweat"],
  humor: ["tee", "hoodie", "sweat", "womtee"],
  calma: ["tee", "hoodie", "womtee", "womcrop"],
  amor: ["tee", "womtee", "womcrop"],
  peques: ["kids", "kidshoodie", "toddler", "baby"],
};
/** Square/landscape pieces whose content is cropped: a tile or badge reads well there, tall stacks less so. */
const productsOf = (s: Saying, tone: Tone): BlueprintKey[] => {
  if (tone === "dark") return (s.products ?? DARK_DEFAULT[s.cat]).filter((p) => DARK_APPAREL.includes(p));
  return s.products ?? LIGHT_PRODUCTS[s.cat];
};

/* ───────── the looks ───────── */
const W = 0.86; // target width of the main lines

function bloque(s: Saying, tone: Tone): Layer[] {
  const p = pal(tone);
  const acc = s.accent ?? [s.lines.length - 1];
  const label = SAB_CATS.find((c) => c.key === s.cat)!.label;
  const lines = s.lines.map((l, i): Item => ({ kind: "t", text: l, font: "sport", color: acc.includes(i) ? p.acc : p.ink, size: fit(l, "sport", W, s.lines.length <= 2 ? 0.3 : s.lines.length === 3 ? 0.24 : 0.22), gap: i === s.lines.length - 1 ? 0.04 : 0.02 }));
  // four big lines already fill the canvas height: the label only joins shorter stacks
  const head: Item[] = s.lines.length < 4 ? [{ kind: "t", fixed: true, text: track(label), font: "sans", color: p.acc, size: 0.03, gap: 0.035 }] : [];
  return stack([...head, ...lines, { kind: "i", name: "stripes-rg", w: 0.24, gap: 0 }], 0.44, 0.84);
}

function clasico(s: Saying, tone: Tone): Layer[] {
  const p = pal(tone);
  const split = s.split ?? Math.ceil(s.lines.length / 2);
  const label = SAB_CATS.find((c) => c.key === s.cat)!.label;
  const sizes = s.lines.map((l) => fit(l, "serif", W, 0.15));
  const items: Item[] = [{ kind: "t", fixed: true, text: track(label), font: "sans", color: p.acc, size: 0.028, gap: 0.045 }];
  s.lines.forEach((l, i) => {
    if (i === split) items.push({ kind: "i", name: `sab-fleuron-${p.orn}`, w: 0.5, gap: 0.04 });
    items.push({ kind: "t", text: l, font: "serif", color: i >= split ? p.acc : p.ink, size: sizes[i], gap: i === split - 1 ? 0.04 : 0.028 });
  });
  return stack(items, 0.4, 0.72);
}

function manuscrito(s: Saying, tone: Tone): Layer[] {
  const p = pal(tone);
  const label = SAB_CATS.find((c) => c.key === s.cat)!.label;
  const items: Item[] = [{ kind: "t", fixed: true, text: track(label), font: "sans", color: p.ink, size: 0.028, gap: 0.05 }];
  s.lines.forEach((l, i) => {
    const caps = l === l.toUpperCase();
    items.push(caps ? { kind: "t", text: l, font: "sport", color: p.ink, size: fit(l, "sport", W, 0.2), gap: 0.03 } : { kind: "t", text: l, font: "script", color: i === s.lines.length - 1 ? p.acc : p.ink, size: fit(l, "script", W, 0.17), gap: 0.012 });
  });
  items.push({ kind: "i", name: `sab-swash-${tone === "light" ? "red" : "gold2"}`, w: 0.72, gap: 0 });
  if (s.cat === "amor") items.unshift({ kind: "i", name: `sab-heart-${tone === "light" ? "red" : "red2"}`, w: 0.1, gap: 0.04 });
  return stack(items, 0.4, 0.74);
}

function sello(s: Saying, tone: Tone): Layer[] {
  const p = pal(tone);
  const acc = s.accent ?? [s.lines.length - 1];
  const ring = I(tone === "light" ? "sab-badge-ink" : "sab-badge-cream", 0.38, 0.9);
  // inner field: diameter ≈ 0.6 × ring width
  const inner = 0.9 * 0.56;
  let lines = s.lines.map((l, i): Item => ({ kind: "t", text: l, font: "sport", color: acc.includes(i) ? p.acc : p.ink, size: fit(l, "sport", inner * (l.length <= 2 ? 0.3 : s.lines.length > 3 ? 0.8 : 0.9), 0.13), gap: 0.012 }));
  // keep every line inside the circle: a line's width is limited by the chord at its farthest edge
  const R = inner / 2;
  let out = stack(lines, 0.38, inner * 0.75 * (s.lines.length > 3 ? 0.7 : 0.8));
  for (let pass = 0; pass < 4; pass++) {
    lines = lines.map((it, k) => {
      if (it.kind !== "t") return it;
      const l = out[k];
      const h = it.size * VH.sport;
      const dy = (Math.abs(l.y - 0.38) + h / 2) * RATIO;
      const chord = 2 * Math.sqrt(Math.max(0, R * R - dy * dy)) * 0.86;
      const w = it.size * real(it.text, "sport");
      return w > chord ? { ...it, size: (it.size * chord) / w } : it;
    });
    out = stack(lines, 0.38, inner * 0.75 * (s.lines.length > 3 ? 0.7 : 0.8));
  }
  return [ring, ...out];
}

function azulejo(s: Saying): Layer[] {
  const tile = s.tile ?? "blue";
  const blue = BLUE, acc = tile === "talavera" ? OCHRE : RED;
  const field = 0.88 * 0.56; // open centre of the tile (width units)
  const items: Item[] = s.lines.map((l): Item => (l === l.toUpperCase() ? { kind: "t", text: l, font: "serif", color: blue, size: fit(l, "serif", field, 0.105), gap: 0.02 } : { kind: "t", text: l, font: "script", color: acc, size: fit(l, "script", field * 0.8, 0.1), gap: 0.016 }));
  return [I(`sab-tile-${tile}`, 0.39, 0.88), ...stack(items, 0.39, field * 0.75 * 0.88)];
}

function bicolor(s: Saying, tone: Tone): Layer[] {
  const p = pal(tone);
  const top = s.lines.slice(0, -1), last = s.lines[s.lines.length - 1];
  const barName = tone === "light" ? "sab-bar-red" : "sab-bar-red2";
  const barW = 0.9, barH = barW * artAspect(barName) * 0.75;
  const items: Item[] = top.map((l): Item => ({ kind: "t", text: l, font: "display", color: p.ink, size: fit(l, "display", W, 0.15), gap: 0.03 }));
  items.push({ kind: "i", name: barName, w: barW, gap: 0.035 });
  items.push({ kind: "t", fixed: true, text: track(SAB_CATS.find((c) => c.key === s.cat)!.label), font: "sans", color: p.ink, size: 0.028, gap: 0 });
  const layers = stack(items, 0.38, 0.7);
  const bar = layers.find((l) => l.type === "image")!;
  const size = Math.min(fit(last, "sport", barW * 0.86, 0.2), barH * 0.78);
  return [...layers, T(last, "sport", "#f8f3e8", bar.y + 0.002, size)];
}

function ilustracion(s: Saying): Layer[] {
  const a = artAspect(s.art!);
  const w = Math.min(0.84, 0.44 / (a * 0.75));
  const items: Item[] = [{ kind: "i", name: s.art!, w, gap: 0.045 }];
  s.lines.forEach((l, i) => items.push({ kind: "t", text: l, font: "serif", color: i === s.lines.length - 1 ? RED : INK, size: fit(l, "serif", 0.88, 0.1), gap: 0.022 }));
  return stack(items, 0.42, 0.8);
}

function leon(s: Saying, tone: Tone): Layer[] {
  const p = pal(tone);
  const items: Item[] = [{ kind: "i", name: tone === "light" ? "sab-seal-ink" : "sab-seal-gold", w: 0.64, gap: 0.05 }];
  s.lines.forEach((l, i) => items.push({ kind: "t", text: l, font: "serif", color: i === s.lines.length - 1 ? p.acc : p.ink, size: fit(l, "serif", W, 0.1), gap: 0.026 }));
  const layers = stack(items, 0.42, 0.8);
  const ring = layers[0];
  return [ring, I("lion-crowned", ring.y + 0.004, 0.3), ...layers.slice(1)];
}

function pop(s: Saying, tone: Tone): Layer[] {
  const cols = tone === "light" ? [NAVY, RED, "#e09a00"] : [CREAM, YELLOW, RED2];
  const lines = stack(
    s.lines.map((l, i): Item => ({ kind: "t", text: l, font: "display", color: cols[i % cols.length], size: fit(l, "display", 0.82, l.length <= 4 ? 0.1 : 0.17), gap: 0.035 })),
    0.4,
    0.62,
  );
  // ornaments sit just outside the type block: sparkles over the first line's corners, a star under the last
  const first = lines[0] as TextLayer, last = lines[lines.length - 1] as TextLayer;
  const sizeOf = (l: TextLayer) => l.w / span(l.text, l.font as "display");
  const half = (l: TextLayer) => (sizeOf(l) * real(l.text, l.font as "display")) / 2;
  const fx0 = Math.max(0.07, 0.5 - half(first) - 0.02), fx1 = Math.min(0.93, 0.5 + half(first) + 0.02), lx1 = Math.min(0.92, 0.5 + half(last) + 0.03);
  const fTop = first.y - (sizeOf(first) * VH.display) / 2, lBot = last.y + (sizeOf(last) * VH.display) / 2;
  return [
    I(tone === "light" ? "sab-sparkle-red" : "sab-sparkle-gold2", fTop - 0.045, 0.09, fx0),
    I(tone === "light" ? "sab-sparkle-blue" : "sab-sparkle-gold2", fTop - 0.03, 0.055, fx1),
    I(tone === "light" ? "sab-star-red" : "sab-star-yellow", lBot + 0.04, 0.065, lx1),
    ...lines,
  ];
}

function layersFor(s: Saying, tone: Tone): Layer[] {
  switch (s.style) {
    case "bloque": return bloque(s, tone);
    case "clasico": return clasico(s, tone);
    case "manuscrito": return manuscrito(s, tone);
    case "sello": return sello(s, tone);
    case "azulejo": return azulejo(s);
    case "bicolor": return bicolor(s, tone);
    case "ilustracion": return ilustracion(s);
    case "leon": return leon(s, tone);
    case "pop": return pop(s, tone);
  }
}

const STYLE_COPY: Record<SabStyle, string> = {
  bloque: "Tipografía condensada a gran tamaño que llena la prenda.",
  clasico: "Serifa clásica con filete de imprenta.",
  manuscrito: "Letra manuscrita grande con trazo de pincel.",
  sello: "Sello vintage de refranero con la frase en el centro.",
  azulejo: "Dentro de un azulejo pintado a mano, en azul cobalto.",
  bicolor: "Grotesca moderna y remate en barra de color.",
  ilustracion: "Ilustración de autor impresa a gran tamaño.",
  leon: "El león coronado de la casa dentro de su sello.",
  pop: "Letras alegres en colores vivos, con estrellas.",
};

export const sabSlug = (s: Saying, tone: Tone) => `sab-${s.key}${tone === "dark" ? "-noche" : ""}`;
export const tonesOf = (s: Saying): Tone[] => s.tones ?? ["light"];

export function sabiduriaDesigns(): Design[] {
  return SAYINGS.flatMap((s) =>
    tonesOf(s).map((tone): Design => ({
      slug: sabSlug(s, tone),
      collection: "sabiduria",
      name: `«${s.text}»${tone === "dark" ? " · Noche" : ""}`,
      line: `${s.line} ${STYLE_COPY[s.style]}`,
      tone,
      layers: layersFor(s, tone),
      products: productsOf(s, tone),
      posterBg: tone === "light" ? (s.style === "azulejo" ? "#eef2f7" : "#f3ead7") : "#0d0d0d",
      tags: ["sabiduria", "serie-sabiduria", `sab-${s.cat}`, "frase", "tipografia", ...(s.cat === "peques" ? ["ninos"] : []), ...(s.cat === "abuela" ? ["familia", "abuelos"] : []), ...(s.cat === "amor" ? ["regalo"] : [])],
    })),
  );
}

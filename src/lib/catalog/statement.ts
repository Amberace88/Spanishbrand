/**
 * STATEMENT — the big-print streetwear line (owner feedback: category pages felt monotonous —
 * one centred illustration with a small serif, mostly on light-blue tees).
 *
 * Every piece is drawn in code (scripts/statement-art.mjs → public/catalog/art/st-*.png, placement
 * in statement-art.json): full-area brush strokes and splatter, spray lettering with drips, giant
 * back prints with a small chest mark, small luxury chest marks (and embroidered versions), 70s
 * tourism-poster postcards and torn-paper collages over our author illustrations.
 *
 * Series (tag `serie-*`, all tagged `statement`; collection `statement`):
 *  - brocha   — Brocha y bandera
 *  - spray    — Spray / Grafiti
 *  - espalda  — Gigante a la espalda (front chest mark + `back` print; two-sided Printful apparel)
 *  - minimo   — Mínimo de lujo (chest marks; embroidered ones use ≤ 4 Printful thread colours)
 *  - postal   — Retro postal / vintage fade
 *  - collage  — Collage (author art-* composed between a torn-paper backing and a type layer at print time)
 *
 * Garment colours: each design names the colours it was drawn for (`colors`, Printful colour names,
 * first available wins) so the shop shows black, white, sand, navy, olive, red and forest — not a
 * sea of one colour. Unavailable names are skipped by the catalog builder.
 *
 * Original artwork only: no real graffiti tags, no club/federation marks, the bull is a frontal head
 * (not a roadside silhouette), no official coats of arms.
 */
import type { ImageLayer } from "@/lib/personalization/types";
import type { BlueprintKey, Design, Tone } from "./designs";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";
import PLACEMENT from "./statement-art.json";

export const STATEMENT_SERIES = [
  { tag: "serie-brocha", key: "brocha", name: "Brocha y bandera" },
  { tag: "serie-spray", key: "spray", name: "Spray / Grafiti" },
  { tag: "serie-espalda", key: "espalda", name: "Gigante a la espalda" },
  { tag: "serie-minimo", key: "minimo", name: "Mínimo de lujo" },
  { tag: "serie-postal", key: "postal", name: "Retro postal" },
  { tag: "serie-collage", key: "collage", name: "Collage" },
] as const;

/* ───────── garment colours (Printful names; synonyms across tee / hoodie / oversized blanks) ───────── */
const BLACK = ["Black", "Vintage Black", "Faded Black", "Black Heather"];
const NAVY = ["Navy", "French Navy", "Heather Navy", "Faded Navy"];
const OLIVE = ["Olive", "Military Green", "Army", "Heather Olive", "Faded Olive", "Khaki Green"];
const FOREST = ["Forest", "Forest Green", "Heather Forest", "Glazed Green"];
const RED = ["Red", "Canvas Red", "Cardinal Red", "Faded Red", "Red Earth"];
const WINE = ["Maroon", "Burgundy", "Heather Maroon"];
const WHITE = ["White", "Vintage White", "Off White"];
const SAND = ["Natural", "Sand", "Soft Cream", "Ivory", "Bone", "Faded Bone", "Heather Dust", "Desert Dust", "Tan", "Khaki"];
const ASH = ["Ash", "Athletic Heather", "Heather Grey", "Sport Grey", "Faded Grey", "Grey"];
const cols = (...g: string[][]) => [...new Set(g.flat())];

/** Swatch colours for previews (scripts/statement-preview.mjs) and editorial use. */
export const GARMENT_HEX: Record<string, string> = {
  Black: "#161616", Navy: "#1b2238", Olive: "#55593a", Forest: "#243b2c", Red: "#b5121b", Maroon: "#5a1a22",
  White: "#f7f7f5", Natural: "#efe6d2", Sand: "#dccdab", Ash: "#d9d9d6", Khaki: "#b9ab86",
  "Vintage Black": "#262524", "French Navy": "#1f2a44", "Military Green": "#4b5235", "Canvas Red": "#a9232b", "Vintage White": "#efece4",
  "Heather Forest": "#3a4a3e", "Soft Cream": "#efe3c8", "Athletic Heather": "#c9c9c7", "Burgundy": "#5e1b26",
};

/* ───────── products ───────── */
const FULL: BlueprintKey[] = ["tee", "teeoversize", "hoodie", "hoodieoversize", "sweat", "womtee", "womcrop", "tote"];
const FULL_KIDS: BlueprintKey[] = [...FULL, "kids"];
const BACK: BlueprintKey[] = ["tee", "teeoversize", "hoodie", "hoodieoversize", "sweat", "womtee"];
const MIN: BlueprintKey[] = ["tee", "teeoversize", "hoodie", "hoodieoversize", "sweat", "womtee", "womcrop"];
const EMB: BlueprintKey[] = ["embtee", "embhoodie", "cap", "dadhat"];
const POSTAL: BlueprintKey[] = ["tee", "teeoversize", "sweat", "womtee", "womcrop", "kids", "tote", "poster"];
const COLLAGE: BlueprintKey[] = ["tee", "teeoversize", "hoodie", "hoodieoversize", "sweat", "tote", "poster"];

let n = 0;
const P = PLACEMENT as Record<string, { aspect: number; x: number; y: number; w: number }>;
/** One drawn piece, placed exactly where it was composed on the 3:4 canvas. */
function st(name: string): ImageLayer {
  const file = `st-${name}`;
  const p = P[file] ?? { aspect: 4 / 3, x: 0.5, y: 0.45, w: 0.9 };
  return { id: `st${(n++).toString(36)}`, type: "image", path: `art/${file}.png`, url: `/catalog/art/${file}.png`, aspect: p.aspect, x: p.x, y: p.y, w: +Math.min(0.96, p.w).toFixed(4), rotation: 0 };
}
/** A left-chest mark scaled to a real chest-print width (≈ `w` × 12 in), kept inside the print area. */
function mark(name: string, wide = 0.27): ImageLayer {
  const l = st(name);
  const w = l.aspect > 1 ? +(wide * 0.78).toFixed(4) : wide; // tall marks a little narrower
  const h = w * l.aspect * 0.75; // fraction of canvas height
  const x = Math.min(0.96 - w / 2, Math.max(0.5, l.x));
  const y = Math.max(0.05 + h / 2, Math.min(l.y, 0.2));
  return { ...l, w, x: +x.toFixed(4), y: +y.toFixed(4) };
}
/** An existing illustration (author art in storage, or the crowned lion) fitted into a box. */
function piece(name: string, y: number, maxW: number, maxH: number, x = 0.5): ImageLayer {
  const a = artAspect(name);
  const w = +Math.min(maxW, maxH / (a * 0.75)).toFixed(4);
  return { id: `st${(n++).toString(36)}`, type: "image", path: artPath(name as ArtName), url: artUrl(name), aspect: a, x, y, w, rotation: 0 };
}

const bgOf = (tone: Tone) => (tone === "dark" ? "#0d0d0d" : "#f3ead7");

export function statementDesigns(): Design[] {
  n = 0;
  const out: Design[] = [];
  const D = (series: string, d: Omit<Design, "collection" | "posterBg"> & { posterBg?: string }) =>
    out.push({ collection: "statement", posterBg: bgOf(d.tone), ...d, tags: ["statement", `serie-${series}`, ...(d.tags ?? [])] });

  /* ───── Brocha y bandera ───── */
  D("brocha", { slug: "st-brocha-espana-noche", name: "España a Brocha · Noche", line: "Tres brochazos rojo y gualda de lado a lado, salpicaduras y ESPAÑA en grande, pintada encima. Estampado completo.", tone: "dark", layers: [st("brocha-espana-noche")], products: FULL, colors: cols(BLACK, NAVY), tags: ["espana", "bestseller"] });
  D("brocha", { slug: "st-brocha-espana-dia", name: "España a Brocha · Día", line: "Los brochazos de la bandera cruzando todo el pecho y ESPAÑA en tinta negra. Para blanco, arena y gris.", tone: "light", layers: [st("brocha-espana-dia")], products: FULL, colors: cols(WHITE, SAND, ASH), tags: ["espana"] });
  D("brocha", { slug: "st-brocha-leon-noche", name: "León a Brocha · Noche", line: "El león de la casa en plantilla crema sobre dos brochazos enormes rojo y gualda, con ROJO Y GUALDA debajo.", tone: "dark", layers: [st("brocha-leon-noche")], products: FULL, colors: cols(BLACK, OLIVE, NAVY), tags: ["leon"] });
  D("brocha", { slug: "st-brocha-leon-dia", name: "León a Brocha · Día", line: "El león en tinta sobre brochazos rojo y gualda, para prendas claras.", tone: "light", layers: [st("brocha-leon-dia")], products: FULL, colors: cols(SAND, WHITE), tags: ["leon"] });
  D("brocha", { slug: "st-brocha-toro-noche", name: "Toro a Brocha · Noche", line: "La cabeza del toro bravo en crema sobre una gran pincelada roja con salpicaduras de oro.", tone: "dark", layers: [st("brocha-toro-noche")], products: FULL, colors: cols(BLACK, OLIVE), tags: ["toro"] });
  D("brocha", { slug: "st-brocha-toro-dia", name: "Toro a Brocha · Día", line: "El toro bravo en negro sobre la pincelada roja: casta, nobleza y bravura.", tone: "light", layers: [st("brocha-toro-dia")], products: FULL_KIDS, colors: cols(SAND, WHITE, ASH), tags: ["toro"] });
  D("brocha", { slug: "st-hecho-en-espana", name: "Hecho en España · Rotulado", line: "HECHO EN ESPAÑA rotulado a mano en rojo y negro, brochazo dorado y sello de origen.", tone: "light", layers: [st("brocha-hecho")], products: FULL_KIDS, colors: cols(WHITE, SAND, ASH), tags: ["espana"] });
  D("brocha", { slug: "st-rojo-y-gualda-pintado", name: "Rojo y Gualda · Pintado", line: "ROJO y GUALDA en serif de cartel sobre dos brochazos de la bandera. Los colores de casa, sin más.", tone: "dark", layers: [st("brocha-rojo-gualda")], products: FULL, colors: cols(NAVY, BLACK), tags: ["logo"] });
  D("brocha", { slug: "st-abanico-de-feria", name: "Abanico de Feria", line: "Un abanico rojo abierto de par en par con varillas de oro y «de Feria» en letra de firma.", tone: "dark", layers: [st("brocha-abanico")], products: FULL, colors: cols(BLACK, FOREST), tags: ["feria", "flamenco"] });
  D("brocha", { slug: "st-sol-a-brocha", name: "Sol a Brocha", line: "Un sol de veinticuatro pinceladas doradas alrededor de un corazón rojo. SOL DE ESPAÑA.", tone: "dark", layers: [st("brocha-sol")], products: FULL, colors: cols(NAVY, BLACK), tags: ["sol"] });
  D("brocha", { slug: "st-sangre-roja", name: "Sangre Roja", line: "Hecha para la camiseta roja: brochazos de oro y negro, el león en crema y ESPAÑA en grande.", tone: "dark", layers: [st("brocha-roja")], products: FULL, colors: cols(RED, WINE), tags: ["leon", "espana"] });
  D("brocha", { slug: "st-salpicado", name: "Salpicado", line: "Una explosión de pintura roja y dorada por todo el delantero y el monograma RyG en el centro.", tone: "dark", layers: [st("salpicado")], products: FULL, colors: cols(BLACK, NAVY), tags: ["logo"] });

  /* ───── Spray / Grafiti ───── */
  D("spray", { slug: "st-spray-espana", name: "España en Spray", line: "ESPAÑA en letra de grafiti dorada con contorno rojo pulverizado, goterones y estrellas. Arte de calle original.", tone: "dark", layers: [st("spray-espana")], products: FULL, colors: cols(BLACK, OLIVE), tags: ["espana", "grafiti"] });
  D("spray", { slug: "st-spray-muro", name: "Muro", line: "La corona pulverizada en rojo, ESPAÑA en spray negro que gotea y «de España para el mundo».", tone: "light", layers: [st("spray-muro")], products: FULL, colors: cols(WHITE, ASH, SAND), tags: ["espana", "grafiti"] });
  D("spray", { slug: "st-stencil-leon-noche", name: "León Plantilla · Noche", line: "El león de la casa en plantilla dorada con niebla de spray y LEÓN DE ESPAÑA en letra de estarcido.", tone: "dark", layers: [st("stencil-leon-noche")], products: FULL, colors: cols(OLIVE, BLACK), tags: ["leon", "grafiti"] });
  D("spray", { slug: "st-stencil-leon-dia", name: "León Plantilla · Día", line: "El león en plantilla negra con mechones rojos y letras de estarcido, para prendas claras.", tone: "light", layers: [st("stencil-leon-dia")], products: FULL, colors: cols(SAND, WHITE), tags: ["leon", "grafiti"] });
  D("spray", { slug: "st-grafiti-rojo-y-gualda", name: "Rojo y Gualda · Grafiti", line: "El nombre de la casa en grafiti dorado con contorno rojo, brillos, goterones y una corona pulverizada.", tone: "dark", layers: [st("grafiti-ryg")], products: FULL, colors: cols(BLACK, NAVY), tags: ["logo", "grafiti"] });
  D("spray", { slug: "st-reyes-del-barrio", name: "Reyes del Barrio", line: "Una corona real enorme en spray rojo que gotea y REYES DEL BARRIO rotulado debajo.", tone: "light", layers: [st("spray-corona")], products: FULL, colors: cols(WHITE, ASH), tags: ["corona", "grafiti"] });
  D("spray", { slug: "st-spray-26", name: "26 en Spray", line: "Un 26 gigante dorado con contorno rojo, dos estrellas y «Campeones» a mano: para celebrar 2010 y 2026.", tone: "dark", layers: [st("spray-26")], products: FULL, colors: cols(BLACK, NAVY), tags: ["futbol", "campeones"] });
  D("spray", { slug: "st-spray-toro", name: "Toro en Spray", line: "La cabeza del toro pulverizada en rojo y TORO en plantilla negra con goterones.", tone: "light", layers: [st("spray-toro")], products: FULL_KIDS, colors: cols(WHITE, SAND, ASH), tags: ["toro", "grafiti"] });
  D("spray", { slug: "st-muro-de-tags", name: "Muro de Firmas", line: "RyG en spray dorado al pecho y, a la espalda, un muro entero de firmas: ESPAÑA, OLÉ, +34, VAMOS, sol, fiesta. Doble cara.", tone: "dark", layers: [mark("tags-pecho")], back: [st("tags-espalda")], products: BACK, colors: cols(BLACK, OLIVE), tags: ["grafiti", "doble-cara"] });

  /* ───── Gigante a la espalda ───── */
  D("espalda", { slug: "st-espalda-toro", name: "Toro a la Espalda", line: "Un toro pequeño al pecho y, a la espalda, la cabeza del toro bravo sobre un sol rojo de trama. Doble cara.", tone: "light", layers: [mark("espalda-toro-pecho")], back: [st("espalda-toro")], products: BACK, colors: cols(SAND, WHITE), tags: ["toro", "doble-cara"] });
  D("espalda", { slug: "st-espalda-leon", name: "León a la Espalda · Rayos", line: "El león rojo y oro al pecho y, a la espalda, el león gigante dentro de un sol de rayos con ROJO Y GUALDA en arco. Doble cara.", tone: "dark", layers: [mark("espalda-leon-pecho")], back: [st("espalda-leon")], products: BACK, colors: cols(BLACK, NAVY), tags: ["leon", "doble-cara"] });
  D("espalda", { slug: "st-espalda-sol", name: "Sol a la Espalda", line: "Un sol pequeño al pecho y un sol de treinta y dos rayos a toda la espalda. Luz, calor y carácter. Doble cara.", tone: "dark", layers: [mark("espalda-sol-pecho")], back: [st("espalda-sol")], products: BACK, colors: cols(NAVY, BLACK), tags: ["sol", "doble-cara"] });
  D("espalda", { slug: "st-espalda-galeon", name: "Galeón a la Espalda", line: "Un galeón pequeño al pecho y, a la espalda, el galeón a toda vela con velas rojas sobre el mar. Doble cara.", tone: "light", layers: [mark("espalda-galeon-pecho")], back: [st("espalda-galeon")], products: BACK, colors: cols(WHITE, SAND), tags: ["mar", "doble-cara"] });
  D("espalda", { slug: "st-espalda-alhambra", name: "Arcos de la Alhambra", line: "Un arco nazarí al pecho y tres arcos de herradura con celosía a la espalda: ALHAMBRA · GRANADA. Doble cara.", tone: "light", layers: [mark("espalda-alhambra-pecho")], back: [st("espalda-alhambra")], products: BACK, colors: cols(SAND, WHITE), tags: ["granada", "andalucia", "doble-cara"] });
  D("espalda", { slug: "st-espalda-abanico", name: "Abanico a la Espalda", line: "Un abanico pequeño al pecho y uno enorme a la espalda, con «de Feria» en letra de firma. Doble cara.", tone: "dark", layers: [mark("espalda-abanico-pecho")], back: [st("espalda-abanico")], products: BACK, colors: cols(BLACK, WINE), tags: ["feria", "flamenco", "doble-cara"] });
  D("espalda", { slug: "st-espalda-corona", name: "Corona a la Espalda", line: "Corona y RyG al pecho; la corona real en oro a toda la espalda con ROJO Y GUALDA debajo. Doble cara.", tone: "dark", layers: [mark("espalda-corona-pecho")], back: [st("espalda-corona")], products: BACK, colors: cols(OLIVE, BLACK, FOREST), tags: ["corona", "doble-cara"] });
  D("espalda", { slug: "st-espalda-34", name: "+34", line: "+34 pequeño al pecho y, a la espalda, el prefijo de casa gigante sobre un brochazo rojo. Doble cara.", tone: "dark", layers: [mark("espalda-34-pecho")], back: [st("espalda-34")], products: BACK, colors: cols(BLACK, NAVY, OLIVE), tags: ["espana", "doble-cara"] });
  D("espalda", { slug: "st-espalda-varsity", name: "España Varsity", line: "RyG universitario al pecho y, a la espalda, ESPAÑA en arco con un 34 gigante en rojo y oro. Doble cara.", tone: "dark", layers: [mark("espalda-varsity-pecho")], back: [st("espalda-varsity")], products: BACK, colors: cols(NAVY, BLACK, FOREST), tags: ["varsity", "doble-cara"] });
  D("espalda", { slug: "st-espalda-mediterraneo", name: "Mediterráneo a la Espalda", line: "Un sol sobre las olas al pecho; a la espalda, el atardecer setentero en bandas sobre el mar. Doble cara.", tone: "light", layers: [mark("espalda-mediterraneo-pecho")], back: [st("espalda-mediterraneo")], products: BACK, colors: cols(WHITE, SAND), tags: ["mediterraneo", "doble-cara"] });

  /* ───── Mínimo de lujo ───── */
  D("minimo", { slug: "st-min-monograma-noche", name: "Monograma RyG · Noche", line: "Corona, RyG y ESPAÑA en pequeño, a la altura del corazón: oro y crema.", tone: "dark", layers: [mark("min-monograma-noche")], products: MIN, colors: cols(BLACK, NAVY, OLIVE, FOREST, WINE), tags: ["minimal", "logo"] });
  D("minimo", { slug: "st-min-monograma-dia", name: "Monograma RyG · Día", line: "El monograma de la casa en rojo y tinta, discreto, para prendas claras.", tone: "light", layers: [mark("min-monograma-dia")], products: MIN, colors: cols(WHITE, SAND, ASH), tags: ["minimal", "logo"] });
  D("minimo", { slug: "st-min-coordenadas-noche", name: "Coordenadas · Noche", line: "ESPAÑA, la rojigualda en tres franjas y las coordenadas del kilómetro cero, en pequeño al pecho.", tone: "dark", layers: [mark("min-coordenadas-noche")], products: MIN, colors: cols(OLIVE, BLACK, NAVY), tags: ["minimal"] });
  D("minimo", { slug: "st-min-coordenadas-dia", name: "Coordenadas · Día", line: "ESPAÑA y las coordenadas del kilómetro cero en tinta, con la rojigualda en pequeño.", tone: "light", layers: [mark("min-coordenadas-dia")], products: MIN, colors: cols(SAND, WHITE, ASH), tags: ["minimal"] });
  D("minimo", { slug: "st-min-desde-siempre", name: "Desde Siempre", line: "«Desde siempre» en letra de firma roja con una rojigualda diminuta debajo.", tone: "light", layers: [mark("min-desde-siempre")], products: MIN, colors: cols(WHITE, SAND), tags: ["minimal"] });
  D("minimo", { slug: "st-min-leon-sello", name: "Sello del León", line: "El león dentro de un sello redondo con ROJO Y GUALDA · ESPAÑA, en oro y crema al pecho.", tone: "dark", layers: [mark("min-leon-sello")], products: MIN, colors: cols(BLACK, RED, OLIVE), tags: ["minimal", "leon"] });
  D("minimo", { slug: "st-emb-monograma", name: "Monograma Bordado", line: "Corona en hilo de oro viejo y RyG en blanco: bordado limpio para pecho y gorra.", tone: "dark", layers: [st("emb-ryg")], products: EMB, colors: cols(BLACK, NAVY, OLIVE), tags: ["bordado", "minimal", "logo"] });
  D("minimo", { slug: "st-emb-espana", name: "España Bordada · Serif", line: "ESPAÑA en serif clásica blanca y la rojigualda bordada debajo.", tone: "dark", layers: [st("emb-espana")], products: EMB, colors: cols(BLACK, NAVY), tags: ["bordado", "minimal"] });
  D("minimo", { slug: "st-emb-desde-siempre", name: "Desde Siempre · Bordado", line: "«Desde siempre» bordado en amarillo con un trazo rojo debajo.", tone: "dark", layers: [st("emb-desde-siempre")], products: EMB, colors: cols(BLACK, NAVY), tags: ["bordado", "minimal"] });
  D("minimo", { slug: "st-emb-sol", name: "Sol Bordado", line: "Un sol de dieciséis rayos en amarillo con el corazón rojo, bordado.", tone: "dark", layers: [st("emb-sol")], products: EMB, colors: cols(BLACK, NAVY, OLIVE), tags: ["bordado", "minimal", "sol"] });
  D("minimo", { slug: "st-emb-coordenadas", name: "40°N · 3°O Bordado", line: "Un sol pequeño y las coordenadas de España, bordados en amarillo y blanco.", tone: "dark", layers: [st("emb-coordenadas")], products: EMB, colors: cols(BLACK, NAVY, OLIVE), tags: ["bordado", "minimal"] });

  /* ───── Retro postal ───── */
  const postal = (key: string, name: string, line: string, colors: string[], tags: string[]) =>
    D("postal", { slug: `st-postal-${key}`, name, line, tone: "light", layers: [st(`postal-${key}`)], products: POSTAL, colors, tags: ["vintage", ...tags] });
  postal("costa-blanca", "Costa Blanca · Postal", "Cartel turístico de los setenta: sol en bandas, mar y palmeras, COSTA BLANCA en letra redonda. Impresión gastada.", cols(WHITE, SAND), ["playa", "alicante"]);
  postal("ibiza", "Ibiza · Postal", "Rayos de sol, atardecer en cuatro bandas y IBIZA en letra setentera roja.", cols(WHITE, SAND), ["playa", "baleares"]);
  postal("sevilla", "Sevilla · Postal", "Un campanario andaluz sobre el sol de los setenta: SEVILLA · SOL · AZAHAR · ARTE.", cols(SAND, WHITE), ["andalucia"]);
  postal("galicia", "Galicia · Postal", "El faro rojo y azul con su haz de luz, el mar y GALICIA: rías, faros y mar.", cols(WHITE, ASH), ["mar", "galicia"]);
  postal("espana", "España · Postal", "ESPAÑA en letra redonda sobre un sol de rayos y bandas: tierra de sol, verano eterno.", cols(SAND, WHITE), ["espana"]);
  postal("canarias", "Canarias · Postal", "El volcán, el sol y el Atlántico: CANARIAS, islas afortunadas.", cols(SAND, WHITE), ["canarias", "playa"]);
  postal("madrid", "Madrid · Postal", "Rayos rojos, sol en bandas y MADRID: kilómetro cero, de todas partes.", cols(SAND, WHITE), ["madrid", "ciudad"]);
  postal("costa-del-sol", "Costa del Sol · Postal", "La palmera, el sol en bandas y el mar turquesa: COSTA DEL SOL, Málaga.", cols(WHITE, SAND), ["playa", "malaga"]);

  /* ───── Collage (author art composed between paper and type at print time) ───── */
  const collage = (key: string, art: string, paper: 1 | 2, name: string, line: string, tags: string[]) =>
    D("collage", { slug: `st-collage-${key}`, name, line, tone: "dark", layers: [st(`collage-papel-${paper}`), piece(art, 0.378, 0.64, 0.5), st(`collage-${key}`)], products: COLLAGE, colors: cols(BLACK, OLIVE, NAVY), tags: ["arte", ...tags] });
  collage("toro", "art-toro", 1, "Collage · Toro", "El toro bravo de autor sobre papel rasgado, cinta, un brochazo rojo y TORO en grande.", ["toro"]);
  collage("flamenca", "art-flamenca", 2, "Collage · Duende", "La bailaora en pleno giro pegada sobre papel rasgado, con «Duende» en serif cursiva.", ["flamenco"]);
  collage("galeon", "art-galeon", 1, "Collage · Mar", "El galeón a toda vela en papel rasgado, cinta y un brochazo azul marino: MAR.", ["mar"]);
  collage("alhambra", "art-alhambra", 2, "Collage · Granada", "El Patio de los Leones sobre papel rasgado con GRANADA en capitales romanas.", ["granada"]);
  collage("quijote", "art-quijote", 1, "Collage · La Mancha", "Quijote y Sancho recortados sobre papel, brochazo ocre y LA MANCHA.", ["quijote"]);
  collage("leon", "lion-crowned", 2, "Collage · León", "El león coronado de la casa sobre papel rasgado, cinta y LEÓN en grande.", ["leon"]);

  return out;
}

/**
 * Fútbol PRO — the big-print football line (art drawn in code by scripts/futbol-art.mjs).
 * Terrace / streetwear look: oversized condensed type, varsity numerals, halftone, screen-print wear,
 * scarf bands, stars. Every piece fills the print area and reads from across the street.
 *
 * Series (tag `serie-*`, all tagged `futbol-pro` so the builder makes them early):
 *  - Campeones   — Spain, world champions: "CAMPEONES", two stars, "2010 · 2026" (front + back prints).
 *  - Colores de mi ciudad — a shirt in each football city's traditional colours with the province code
 *                  as number; city name on the back. Colours and city names only: never a club.
 *  - Grada       — terrace culture: scarf bands and original Spanish phrases.
 *  - Retro 90    — geometric 90s shirt graphics.
 *  - Peques      — kids, toddlers and babies.
 *  - Camiseta de juego — all-over sublimated shirts in city colours (blueprint "jersey").
 *
 * Legal guard-rails: no club names, crests, mascots, sponsors, competition or federation marks,
 * no player names; years appear as plain facts.
 */
import type { ImageLayer } from "@/lib/personalization/types";
import type { BlueprintKey, Design, Tone } from "./designs";
import PLACEMENT from "./futbol-pro-art.json";
import CITY_DATA from "./futbol-cities.json";

export interface FutbolCity {
  key: string;
  name: string;
  cp: string;
  pat: { type: string; a: string; b?: string; c?: string; n?: number };
  trim: string;
  name2: string;
  num: [string, string, string];
  accent: string;
}
export const FUTBOL_CITIES = CITY_DATA as FutbolCity[];
/** Cities that also get an all-over sublimated shirt. */
export const FUTBOL_AOP = ["madrid", "madrid-rojiblanco", "barcelona", "sevilla", "sevilla-verdiblanco", "bilbao", "valencia", "donostia", "coruna", "cadiz"];

/** The series shown on /futbol, in order. */
export const FUTBOL_SERIES = [
  { tag: "serie-campeones", key: "campeones" },
  { tag: "serie-ciudad", key: "ciudad" },
  { tag: "serie-camiseta", key: "camiseta" },
  { tag: "serie-grada", key: "grada" },
  { tag: "serie-retro", key: "retro" },
  { tag: "serie-peques", key: "peques" },
] as const;

let n = 0;
const P = PLACEMENT as Record<string, { aspect: number; x: number; y: number; w: number }>;
/** One drawn piece, placed exactly where it was composed on the 3:4 canvas. */
function art(name: string): ImageLayer {
  const file = `fp-${name}`;
  const p = P[file] ?? { aspect: 4 / 3, x: 0.5, y: 0.5, w: 0.9 };
  const w = Math.min(0.96, p.w);
  return { id: `fp${(n++).toString(36)}`, type: "image", path: `art/${file}.png`, url: `/catalog/art/${file}.png`, aspect: p.aspect, x: p.x, y: p.y, w: +w.toFixed(4), rotation: 0 };
}

const FRONT: BlueprintKey[] = ["tee", "hoodie", "sweat", "womtee", "womsweat", "mug", "poster"];
const DOUBLE: BlueprintKey[] = ["tee", "hoodie", "sweat", "womtee"];
const GRADA: BlueprintKey[] = ["tee", "hoodie", "sweat", "womtee", "womcrop", "mug", "poster"];
const KIDS: BlueprintKey[] = ["kids", "kidshoodie", "toddler", "baby"];
const CITY: BlueprintKey[] = ["tee", "hoodie", "womtee", "kids", "mug", "poster"];

const bg = (tone: Tone) => (tone === "dark" ? "#0d0d0d" : "#f3ead7");
const suffix = (tone: Tone) => (tone === "dark" ? "noche" : "dia");
const label = (tone: Tone) => (tone === "dark" ? "Noche" : "Día");
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function futbolProDesigns(): Design[] {
  const D = (series: string, d: Omit<Design, "collection">): Design => ({ collection: "futbol", posterBg: bg(d.tone), ...d, tags: ["futbol", "futbol-pro", `serie-${series}`, ...(d.tags ?? [])] });
  const out: Design[] = [];

  /* ───── Campeones ───── */
  for (const tone of ["dark", "light"] as Tone[]) {
    const s = suffix(tone);
    out.push(
      D("campeones", {
        slug: `fp-campeones-mundo-${s}`,
        name: `Campeones del Mundo · ${label(tone)}`,
        line: "CAMPEONES a lo grande, dos estrellas y 2010 · 2026 delante; ESPAÑA y un 26 gigante a la espalda. Para celebrar que somos los vigentes campeones del mundo.",
        tone,
        layers: [art(`campeones-mundo-${s}`)],
        back: [art(`campeones-mundo-${s}-espalda`)],
        products: [...DOUBLE, "mug", "poster"],
        tags: ["campeones", "doble-cara", "bestseller"],
      }),
      D("campeones", {
        slug: `fp-campeones-script-${s}`,
        name: `Campeones · Letra de camiseta · ${label(tone)}`,
        line: "«Campeones» en letra de camiseta de los 80 con su firma subrayada, dos estrellas y 2026 en grande.",
        tone,
        layers: [art(`campeones-script-${s}`)],
        products: [...FRONT, "womcrop"],
        tags: ["campeones", "retro"],
      }),
      D("campeones", {
        slug: `fp-dos-estrellas-${s}`,
        name: `Dos Estrellas · ${label(tone)}`,
        line: "Una insignia redonda que ocupa todo el pecho: CAMPEONES DEL MUNDO en el anillo, dos estrellas y los años 2010 y 2026.",
        tone,
        layers: [art(`dos-estrellas-${s}`)],
        products: [...FRONT, "kids"],
        tags: ["campeones", "insignia"],
      }),
      D("campeones", {
        slug: `fp-dos-fechas-${s}`,
        name: `2010 · 2026 · ${label(tone)}`,
        line: "Dos fechas, dos estrellas: los años en numeración universitaria gigante y una bufanda de grada debajo.",
        tone,
        layers: [art(`dos-fechas-${s}`)],
        products: FRONT,
        tags: ["campeones", "numeros"],
      }),
      D("campeones", {
        slug: `fp-campeones-espalda-${s}`,
        name: `Campeones a la Espalda · ${label(tone)}`,
        line: "Discreta delante —dos estrellas y ESPAÑA al pecho— y a lo grande detrás: CAMPEONES DEL MUNDO sobre trama de semitono.",
        tone,
        layers: [art(`campeones-pecho-${s}`)],
        back: [art(`campeones-espalda-${s}`)],
        products: DOUBLE,
        tags: ["campeones", "doble-cara"],
      }),
    );
  }
  out.push(
    D("campeones", {
      slug: "fp-campeones-bandas",
      name: "Campeones · Bandas",
      line: "Las bandas roja y gualda a todo lo ancho con CAMPEONES calado: el color de la prenda asoma por las letras.",
      tone: "dark",
      layers: [art("campeones-bandas")],
      products: [...FRONT, "flag"],
      tags: ["campeones", "bandera"],
    }),
    D("campeones", {
      slug: "fp-bufanda-espana",
      name: "Bufanda de Campeones",
      line: "Una bufanda de grada cruzando el pecho, VAMOS en grande y dos estrellas con 2010 · 2026.",
      tone: "dark",
      layers: [art("bufanda-espana")],
      products: GRADA,
      tags: ["campeones", "bufanda"],
    }),
  );

  /* ───── Colores de mi ciudad ───── */
  for (const c of FUTBOL_CITIES) {
    const city = cap(c.name).replace(/ (\p{L})/gu, (_, l: string) => ` ${l.toUpperCase()}`);
    const variant = c.key === "madrid-rojiblanco" || c.key === "sevilla-verdiblanco" ? (c.key.endsWith("rojiblanco") ? " rojiblanco" : " verdiblanco") : "";
    out.push(
      D("ciudad", {
        slug: `fp-ciudad-${c.key}`,
        name: `Colores de ${city}${variant}`,
        line: `${city} en sus colores de siempre: la camiseta dibujada en grande con el ${c.cp} de la provincia como dorsal, y ${c.name} con el número gigante a la espalda.`,
        tone: "dark",
        layers: [art(`ciudad-${c.key}`)],
        back: [art(`ciudad-${c.key}-espalda`)],
        products: CITY,
        tags: ["colores-de-mi-ciudad", `color-${c.key}`, "doble-cara"],
      }),
    );
  }
  for (const key of FUTBOL_AOP) {
    const c = FUTBOL_CITIES.find((x) => x.key === key)!;
    const city = cap(c.name);
    out.push(
      D("camiseta", {
        slug: `fp-camiseta-${c.key}`,
        name: `Camiseta de juego ${city}${key.endsWith("rojiblanco") ? " rojiblanca" : key.endsWith("verdiblanco") ? " verdiblanca" : ""}`,
        line: `Camiseta deportiva estampada entera en los colores de ${city}, con las rayas que se disuelven en semitono hacia el bajo, ${c.name} al pecho y el ${c.cp} a la espalda.`,
        tone: "dark",
        posterBg: c.pat.a,
        layers: [art(`camiseta-${c.key}-patron`), art(`camiseta-${c.key}-frente`)],
        back: [art(`camiseta-${c.key}-patron`), art(`camiseta-${c.key}-dorsal`)],
        products: ["jersey"],
        tags: ["colores-de-mi-ciudad", `color-${c.key}`, "camiseta-de-juego"],
      }),
    );
  }

  /* ───── Grada ───── */
  out.push(
    D("grada", { slug: "fp-hasta-el-final", name: "Hasta el Final", line: "Tres bufandas de grada, una palabra en cada una: HASTA · EL · FINAL.", tone: "dark", layers: [art("hasta-el-final")], products: [...GRADA, "flag"], tags: ["bufanda"] }),
    D("grada", { slug: "fp-aficion-estadio", name: "Afición · Estadio", line: "AFICIÓN en letra gigante sobre el estadio dibujado a línea: grada, focos y campo.", tone: "dark", layers: [art("aficion-estadio")], products: [...GRADA, "flag"], tags: ["estadio"] }),
    ...(["dark", "light"] as Tone[]).map((tone) =>
      D("grada", { slug: `fp-mi-equipo-${suffix(tone)}`, name: `Mi Equipo, Mi Ciudad · ${label(tone)}`, line: "MI EQUIPO · MI CIUDAD · MI GENTE, en tres líneas que ocupan toda la prenda.", tone, layers: [art(`mi-equipo-${suffix(tone)}`)], products: GRADA, tags: ["tipografia"] }),
    ),
    D("grada", { slug: "fp-noventa-minutos", name: "90 Minutos", line: "Un 90' gigante en numeración universitaria con trama de semitono, y la bufanda: «y lo que haga falta».", tone: "dark", layers: [art("noventa-minutos")], products: GRADA, tags: ["numeros"] }),
    D("grada", { slug: "fp-siempre-contigo", name: "Siempre Contigo", line: "SIEMPRE, una bufanda cruzada con CONTIGO y la promesa de la grada: en las buenas y en las malas.", tone: "dark", layers: [art("siempre-contigo")], products: GRADA, tags: ["bufanda"] }),
    D("grada", { slug: "fp-domingo-de-partido", name: "Domingo de Partido", line: "La entrada de grada a tamaño gigante, con su matriz troquelada: válida para toda la vida.", tone: "dark", layers: [art("domingo-de-partido")], products: GRADA, tags: ["entrada"] }),
  );

  /* ───── Retro 90 ───── */
  out.push(
    D("retro", { slug: "fp-retro-90-espana", name: "Retro 90 · España", line: "Esquirlas geométricas de camiseta noventera en rojo, oro y marino, con ESPAÑA en letra de bloque.", tone: "dark", layers: [art("retro-90-espana")], products: FRONT, tags: ["retro"] }),
    D("retro", { slug: "fp-retro-portero", name: "Retro Portero", line: "El zigzag imposible de las camisetas de portero de los 90 y un 1 enorme: el último en rendirse.", tone: "dark", layers: [art("retro-portero")], products: FRONT, tags: ["retro", "portero"] }),
    D("retro", { slug: "fp-retro-club-de-barrio", name: "Club de Barrio", line: "Raya diplomática crema y marino con «Fútbol» en letra de camiseta antigua: club de barrio desde siempre.", tone: "dark", layers: [art("retro-club-de-barrio")], products: FRONT, tags: ["retro"] }),
    D("retro", { slug: "fp-retro-balon", name: "Balón de Cuero", line: "El balón clásico de gajos dibujado en grande sobre trama de semitono dorada.", tone: "dark", layers: [art("retro-balon")], products: [...FRONT, "kids"], tags: ["retro", "balon"] }),
  );

  /* ───── Peques ───── */
  for (const tone of ["dark", "light"] as Tone[])
    out.push(D("peques", { slug: `fp-pequeno-campeon-${suffix(tone)}`, name: `Pequeño Campeón · ${label(tone)}`, line: "Una estrella gigante con PEQUEÑO CAMPEÓN en letra redondita: para los más pequeños de la casa campeona.", tone, layers: [art(`pequeno-campeon-${suffix(tone)}`)], products: KIDS, tags: ["ninos"] }));
  out.push(
    D("peques", { slug: "fp-mi-primer-partido", name: "Mi Primer Partido", line: "El balón en grande y MI PRIMER PARTIDO: para estrenar grada.", tone: "light", layers: [art("mi-primer-partido")], products: KIDS, tags: ["ninos", "bebe"] }),
    D("peques", { slug: "fp-futuro-diez", name: "Futuro 10", line: "Un 10 universitario enorme: crack en prácticas.", tone: "dark", layers: [art("futuro-diez")], products: ["kids", "kidshoodie", "toddler"], tags: ["ninos"] }),
  );
  return out;
}

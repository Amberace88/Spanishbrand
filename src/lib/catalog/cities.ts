/**
 * "Ciudades" series — one design per city, generated from a shared layout so the whole series
 * looks coherent. Names, coordinates and generic motifs only (no municipal coats of arms or club marks).
 */
import type { BlueprintKey, Design } from "./designs";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";
import type { FontKey, ImageLayer, TextLayer } from "@/lib/personalization/types";

type Motif = "waves" | "mountain" | "castle" | "sun" | "star" | "palm" | "shell" | "compass" | "fan" | "sunset" | "burst" | "vermut" | "laurel";
const MOTIF: Record<Motif, { dark: ArtName; light: ArtName }> = {
  waves: { dark: "waves-cream", light: "waves-navy" },
  mountain: { dark: "mountain-gold", light: "mountain-ink" },
  castle: { dark: "castle-gold", light: "castle-red" },
  sun: { dark: "sun-gold", light: "sun-red" },
  star: { dark: "star8-gold", light: "star8-navy" },
  palm: { dark: "palm-cream", light: "palm-sea" },
  shell: { dark: "shell-gold", light: "shell-yellow" },
  compass: { dark: "compass-gold", light: "compass-navy" },
  fan: { dark: "fan-red", light: "fan-red" },
  sunset: { dark: "sunset-cream", light: "sunset-warm" },
  burst: { dark: "burst", light: "burst" },
  vermut: { dark: "vermut-cream", light: "vermut" },
  laurel: { dark: "laurel-gold", light: "laurel-ink" },
};

interface City {
  slug: string;
  name: string; // as printed
  label: string; // product name
  sub: string; // province / region line
  lat: number;
  lon: number;
  motif: Motif;
  line: string;
  region: string; // slug in regions.ts
  top?: boolean; // gets the full product range
}

export const CITIES: City[] = [
  { slug: "madrid", name: "MADRID", label: "Madrid", sub: "DE MADRID AL CIELO", lat: 40.4168, lon: -3.7038, motif: "sun", line: "Kilómetro cero, terrazas y cielo de Madrid.", region: "madrid", top: true },
  { slug: "barcelona", name: "BARCELONA", label: "Barcelona", sub: "CATALUNYA · MEDITERRÀNIA", lat: 41.3874, lon: 2.1686, motif: "waves", line: "Mar, modernismo y barrio.", region: "cataluna", top: true },
  { slug: "valencia", name: "VALÈNCIA", label: "València", sub: "TERRA DE LLUM", lat: 39.4699, lon: -0.3763, motif: "sun", line: "Luz, huerta y Mediterráneo.", region: "comunitat-valenciana", top: true },
  { slug: "sevilla", name: "SEVILLA", label: "Sevilla", sub: "ANDALUCÍA · GUADALQUIVIR", lat: 37.3891, lon: -5.9845, motif: "fan", line: "Azahar, río y tardes de feria.", region: "andalucia", top: true },
  { slug: "zaragoza", name: "ZARAGOZA", label: "Zaragoza", sub: "ARAGÓN · EBRO", lat: 41.6488, lon: -0.8891, motif: "castle", line: "Cierzo, Ebro y orgullo maño.", region: "aragon" },
  { slug: "malaga", name: "MÁLAGA", label: "Málaga", sub: "COSTA DEL SOL", lat: 36.7213, lon: -4.4214, motif: "sunset", line: "Biznaga, playa y sol todo el año.", region: "andalucia", top: true },
  { slug: "murcia", name: "MURCIA", label: "Murcia", sub: "REGIÓN DE MURCIA · HUERTA", lat: 37.9922, lon: -1.1307, motif: "sun", line: "Huerta, sol y buena mesa.", region: "murcia" },
  { slug: "palma", name: "PALMA", label: "Palma", sub: "MALLORCA · ILLES BALEARS", lat: 39.5696, lon: 2.6502, motif: "waves", line: "Isla, calas y luz de Mallorca.", region: "baleares" },
  { slug: "las-palmas", name: "LAS PALMAS", label: "Las Palmas de Gran Canaria", sub: "GRAN CANARIA · CANARIAS", lat: 28.1235, lon: -15.4363, motif: "palm", line: "Eterna primavera atlántica.", region: "canarias" },
  { slug: "bilbao", name: "BILBAO", label: "Bilbao", sub: "BIZKAIA · EUSKADI", lat: 43.263, lon: -2.935, motif: "mountain", line: "Ría, montes y carácter del norte.", region: "pais-vasco", top: true },
  { slug: "alicante", name: "ALICANTE", label: "Alicante", sub: "ALACANT · COSTA BLANCA", lat: 38.3452, lon: -0.481, motif: "palm", line: "Palmeras, castillo y Costa Blanca.", region: "comunitat-valenciana", top: true },
  { slug: "cordoba", name: "CÓRDOBA", label: "Córdoba", sub: "ANDALUCÍA · PATIOS", lat: 37.8882, lon: -4.7794, motif: "star", line: "Patios, flores y mil años de historia.", region: "andalucia" },
  { slug: "valladolid", name: "VALLADOLID", label: "Valladolid", sub: "CASTILLA Y LEÓN · PISUERGA", lat: 41.6523, lon: -4.7245, motif: "castle", line: "Castilla, vino y tradición.", region: "castilla-y-leon" },
  { slug: "vigo", name: "VIGO", label: "Vigo", sub: "PONTEVEDRA · RÍAS BAIXAS", lat: 42.2406, lon: -8.7207, motif: "waves", line: "Rías, mar y Atlántico.", region: "galicia" },
  { slug: "gijon", name: "GIJÓN", label: "Gijón", sub: "XIXÓN · ASTURIAS", lat: 43.5322, lon: -5.6611, motif: "waves", line: "Cantábrico, sidra y paseo marítimo.", region: "asturias" },
  { slug: "a-coruna", name: "A CORUÑA", label: "A Coruña", sub: "GALICIA · ATLÁNTICO", lat: 43.3623, lon: -8.4115, motif: "compass", line: "Faro, viento y Atlántico.", region: "galicia" },
  { slug: "granada", name: "GRANADA", label: "Granada", sub: "ANDALUCÍA · SIERRA NEVADA", lat: 37.1773, lon: -3.5986, motif: "mountain", line: "Sierra, tapas y atardeceres eternos.", region: "andalucia", top: true },
  { slug: "santiago", name: "SANTIAGO", label: "Santiago de Compostela", sub: "COMPOSTELA · GALICIA", lat: 42.8782, lon: -8.5448, motif: "shell", line: "Meta del Camino, piedra y lluvia.", region: "galicia", top: true },
  { slug: "san-sebastian", name: "DONOSTIA", label: "Donostia / San Sebastián", sub: "SAN SEBASTIÁN · GIPUZKOA", lat: 43.3183, lon: -1.9812, motif: "waves", line: "La Concha, pintxos y surf.", region: "pais-vasco" },
  { slug: "tenerife", name: "TENERIFE", label: "Tenerife", sub: "SANTA CRUZ · CANARIAS", lat: 28.4636, lon: -16.2518, motif: "mountain", line: "Volcán, mar y carnaval.", region: "canarias" },
  { slug: "cadiz", name: "CÁDIZ", label: "Cádiz", sub: "LA TACITA DE PLATA", lat: 36.5271, lon: -6.2886, motif: "sunset", line: "Atardeceres, carnaval y salitre.", region: "andalucia", top: true },
  { slug: "toledo", name: "TOLEDO", label: "Toledo", sub: "CIUDAD DE LAS TRES CULTURAS", lat: 39.8628, lon: -4.0273, motif: "castle", line: "Murallas, espadas y siglos de historia.", region: "castilla-la-mancha" },
  { slug: "salamanca", name: "SALAMANCA", label: "Salamanca", sub: "CASTILLA Y LEÓN · PIEDRA DORADA", lat: 40.9701, lon: -5.6635, motif: "laurel", line: "Piedra dorada y vida universitaria.", region: "castilla-y-leon" },
  { slug: "pamplona", name: "PAMPLONA", label: "Pamplona", sub: "IRUÑA · NAVARRA", lat: 42.8125, lon: -1.6458, motif: "burst", line: "Fiesta, pañuelo rojo y montaña.", region: "navarra" },
  { slug: "oviedo", name: "OVIEDO", label: "Oviedo", sub: "UVIÉU · ASTURIAS", lat: 43.3614, lon: -5.8593, motif: "mountain", line: "Verde, montaña y sidra.", region: "asturias" },
  { slug: "santander", name: "SANTANDER", label: "Santander", sub: "CANTABRIA · BAHÍA", lat: 43.4623, lon: -3.8099, motif: "waves", line: "Bahía, playas y brisa del norte.", region: "cantabria" },
  { slug: "ibiza", name: "IBIZA", label: "Ibiza", sub: "EIVISSA · ILLES BALEARS", lat: 38.9067, lon: 1.4206, motif: "sunset", line: "Puestas de sol y calas blancas.", region: "baleares" },
  { slug: "benidorm", name: "BENIDORM", label: "Benidorm", sub: "COSTA BLANCA", lat: 38.5411, lon: -0.1225, motif: "sunset", line: "Sol, playa y verano sin fin.", region: "comunitat-valenciana" },
  { slug: "marbella", name: "MARBELLA", label: "Marbella", sub: "COSTA DEL SOL", lat: 36.5101, lon: -4.8825, motif: "palm", line: "Palmeras, mar y buena vida.", region: "andalucia" },
  { slug: "logrono", name: "LOGROÑO", label: "Logroño", sub: "LA RIOJA · TIERRA DE VINO", lat: 42.4627, lon: -2.4449, motif: "vermut", line: "Calle Laurel, vino y buena compañía.", region: "la-rioja" },
];

const WF: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };
const RATIO = 3200 / 2400;
let n = 0;
const id = () => `c${(n++).toString(36)}`;
const txt = (text: string, font: FontKey, color: string, y: number, cap: number): TextLayer => ({ id: id(), type: "text", text, font, color, x: 0.5, y, w: +Math.min(0.9, cap * RATIO * [...text].length * WF[font]).toFixed(4), rotation: 0 });
function art(name: ArtName, y: number, maxW: number, maxH: number): ImageLayer {
  const a = artAspect(name);
  const w = +Math.min(maxW, maxH / (a * 0.75)).toFixed(4);
  return { id: id(), type: "image", path: artPath(name), url: artUrl(name), aspect: a, x: 0.5, y, w, rotation: 0 };
}
export const dms = (v: number, pos: string, neg: string) => {
  const total = Math.round(Math.abs(v) * 60);
  const d = Math.floor(total / 60);
  const m = total % 60;
  return `${d}°${String(m).padStart(2, "0")}′${v >= 0 ? pos : neg}`;
};

const G2 = "#f0c75a", G = "#d4a62a", CR = "#f3ead7", INK = "#111111", R = "#c8102e", NAVY = "#14213d";

export function cityDesigns(): Design[] {
  return CITIES.map((c, i) => {
    const tone = i % 2 === 0 ? "dark" : "light";
    const coords = `${dms(c.lat, "N", "S")} · ${dms(c.lon, "E", "O")}`;
    const layers =
      tone === "dark"
        ? [art(MOTIF[c.motif].dark, 0.15, 0.36, 0.2), txt(c.name, "sport", G2, 0.36, 0.11), art("stripes-rg", 0.455, 0.46, 0.05), txt(coords, "sans", CR, 0.5, 0.02), txt(c.sub, "sans", G, 0.545, 0.017)]
        : [art(MOTIF[c.motif].light, 0.2, 0.46, 0.26), txt(c.name, "serif", INK, 0.45, 0.065), txt(c.sub, "sans", R, 0.52, 0.02), txt(coords, "sans", NAVY, 0.565, 0.018)];
    const products: BlueprintKey[] = c.top ? ["tee", "hoodie", "mug", "tote", "poster"] : ["tee", "mug", "tote"];
    return {
      slug: `ciudad-${c.slug}`,
      collection: "ciudades",
      name: c.label,
      line: c.line,
      tone,
      layers,
      products,
      posterBg: tone === "dark" ? "#0d0d0d" : "#f3ead7",
      tags: ["ciudad", c.slug, c.region],
    } satisfies Design;
  });
}

export const cityByRegion = (region: string) => CITIES.filter((c) => c.region === region);

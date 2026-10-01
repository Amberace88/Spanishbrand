/**
 * Fútbol — city colourways. Three original looks per city and colourway:
 *  - "bufanda": a terrace scarf with the city name woven in the centre panel,
 *  - "abstracto": the colours shattered into shards with the city name,
 *  - "estadio": the stadium from above as topographic rings.
 * Plus a few general football designs (tiki-taka, the coach's board, the 12th player).
 *
 * Legal guard-rails: colour combinations and city names only. No club names, crests, mascots,
 * founding years, sponsor marks or kit replicas — fans recognise the colours, nobody's trademark is used.
 */
import type { BlueprintKey, Design } from "./designs";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";
import type { FontKey, ImageLayer, TextLayer } from "@/lib/personalization/types";
import TEAMS from "./football-teams.json";

export interface FootballTeam {
  key: string;
  city: string;
  label: string;
  colors: string;
  a: string;
  b: string;
  c: string;
  line: string;
}
export const FOOTBALL_TEAMS = TEAMS as FootballTeam[];

const WF: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };
const RATIO = 3200 / 2400;
let n = 0;
const id = () => `f${(n++).toString(36)}`;
/** Text with glyph height `cap` (canvas-height fraction), shrunk to fit `maxW` (canvas-width fraction). */
function txt(text: string, font: FontKey, color: string, y: number, cap: number, maxW = 0.9): TextLayer {
  const per = RATIO * [...text].length * WF[font];
  const c = Math.min(cap, maxW / per);
  return { id: id(), type: "text", text, font, color, x: 0.5, y, w: +(c * per).toFixed(4), rotation: 0 };
}
function art(name: string, y: number, w: number): ImageLayer {
  const a = artAspect(name);
  return { id: id(), type: "image", path: artPath(name as ArtName), url: artUrl(name), aspect: a, x: 0.5, y, w, rotation: 0 };
}
const lum = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
};
/** The team colour that reads best on a dark garment. */
const bright = (t: FootballTeam) => [t.a, t.b, t.c].sort((x, y) => lum(y) - lum(x))[0];
const accent = (t: FootballTeam) => [t.a, t.b, t.c].filter((x) => lum(x) > 0.25 && lum(x) < 0.97)[0] ?? "#d4a62a";
const CR = "#f3ead7";

const BUFANDA: BlueprintKey[] = ["tee", "hoodie", "mug", "flag", "sticker"];
const ABSTRACTO: BlueprintKey[] = ["tee", "hoodie", "poster", "phonecase"];
const ESTADIO: BlueprintKey[] = ["tee", "poster", "mug", "tote"];

export function footballDesigns(): Design[] {
  const out: Design[] = [];
  for (const t of FOOTBALL_TEAMS) {
    const tags = ["futbol", `ciudad-${t.city}`, t.city];
    const scarfA = artAspect(`scarf-${t.key}`);
    const scarfW = 0.94, scarfY = 0.3;
    // centre panel of the scarf: 340/860 of its width
    const panelW = (scarfW * 340) / 860 - 0.08;
    const ink = lum(t.c) > 0.6 ? "#111111" : "#ffffff";
    out.push({
      slug: `futbol-${t.key}-bufanda`,
      collection: "futbol",
      name: `Bufanda ${t.label.charAt(0)}${t.label.slice(1).toLowerCase()} · ${t.colors.toLowerCase()}`,
      line: `${t.line} La bufanda de la grada, convertida en prenda.`,
      tone: "dark",
      layers: [art(`scarf-${t.key}`, scarfY, scarfW), txt(t.label, "sport", ink, scarfY, scarfA * 0.75 * scarfW * 0.36, panelW), txt(t.colors, "sport", bright(t), 0.56, 0.06), txt("DESDE LA GRADA", "sans", CR, 0.63, 0.022)],
      products: BUFANDA,
      posterBg: "#0d0d0d",
      tags: [...tags, "bufanda"],
    });
    out.push({
      slug: `futbol-${t.key}-abstracto`,
      collection: "futbol",
      name: `${t.label.charAt(0)}${t.label.slice(1).toLowerCase()} Abstracto · ${t.colors.toLowerCase()}`,
      line: `${t.line} Sus colores, hechos añicos y vueltos a montar.`,
      tone: "dark",
      layers: [art(`shards-${t.key}`, 0.32, 0.86), txt(t.label, "sport", bright(t), 0.72, 0.12), txt(t.colors, "sans", accent(t), 0.81, 0.024)],
      products: ABSTRACTO,
      posterBg: "#0d0d0d",
      tags: [...tags, "abstracto"],
    });
    out.push({
      slug: `futbol-${t.key}-estadio`,
      collection: "futbol",
      name: `${t.label.charAt(0)}${t.label.slice(1).toLowerCase()} Estadio · ${t.colors.toLowerCase()}`,
      line: `${t.line} El estadio visto desde el cielo, anillo a anillo.`,
      tone: "dark",
      layers: [art(`stadium-${t.key}`, 0.3, 0.84), txt(t.label, "sport", bright(t), 0.6, 0.09), txt("NUESTRA CIUDAD · NUESTRO ESTADIO", "sans", accent(t), 0.675, 0.02)],
      products: ESTADIO,
      posterBg: "#0d0d0d",
      tags: [...tags, "estadio"],
    });
  }
  out.push(
    {
      slug: "futbol-tiki-taka",
      collection: "futbol",
      name: "Tiki-Taka",
      line: "Tocar, tocar y tocar: el fútbol de toque dibujado como una red de pases.",
      tone: "dark",
      layers: [art("tikitaka-red", 0.3, 0.62), txt("TIKI-TAKA", "sport", CR, 0.63, 0.1), txt("TOCAR · TOCAR · TOCAR", "sans", "#c8102e", 0.72, 0.022)],
      products: ["tee", "hoodie", "mug", "poster", "tote"],
      posterBg: "#0d0d0d",
      tags: ["futbol", "abstracto"],
    },
    {
      slug: "futbol-pizarra",
      collection: "futbol",
      name: "La Pizarra",
      line: "Para el que lo ve todo desde el banquillo del bar: la pizarra táctica.",
      tone: "dark",
      layers: [art("tactics-gold", 0.3, 0.6), txt("LA PIZARRA", "sport", CR, 0.63, 0.09), txt("4-3-3 · PRESIÓN ALTA", "sans", "#d4a62a", 0.715, 0.022)],
      products: ["tee", "hoodie", "mug", "poster"],
      posterBg: "#0d0d0d",
      tags: ["futbol", "abstracto"],
    },
    {
      slug: "futbol-jugador-12",
      collection: "futbol",
      name: "El Jugador Número 12",
      line: "La afición también juega. El estadio entero, con el número doce en el centro.",
      tone: "dark",
      layers: [art("stadium-gold", 0.3, 0.86), txt("12", "sport", CR, 0.3, 0.14), txt("EL JUGADOR NÚMERO DOCE", "sport", "#d4a62a", 0.6, 0.06), txt("LA AFICIÓN TAMBIÉN JUEGA", "sans", CR, 0.67, 0.02)],
      products: ["tee", "hoodie", "mug", "poster", "flag"],
      posterBg: "#0d0d0d",
      tags: ["futbol", "abstracto"],
    },
  );
  return out;
}

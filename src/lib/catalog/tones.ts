/**
 * Editorial tile palette — every tone is derived from the brand (rojo y gualda, sea navy, olive,
 * terracotta, ink and bone), never a random saturated colour. Client-safe.
 */
export type ToneKey = "rojo" | "azafran" | "mar" | "oliva" | "terracota" | "tinta" | "hueso" | "arena";
export type TextureKey = "pitch" | "papel" | "waves" | "azulejo" | "hatch" | "rays" | "grid" | "stripes" | "dots" | "tiles";

export interface Tone {
  bg: string;
  /** Deeper shade for gradients and the photo scrim. */
  deep: string;
  fg: string;
  accent: string;
  /** Text on the accent (CTA pill). */
  onAccent: string;
  dark: boolean;
}

export const TONES: Record<ToneKey, Tone> = {
  rojo: { bg: "#8e1023", deep: "#5e0916", fg: "#fbf3e4", accent: "#f2b632", onAccent: "#1c1712", dark: true },
  azafran: { bg: "#e0a526", deep: "#b97f0e", fg: "#1c1712", accent: "#8e1023", onAccent: "#fbf3e4", dark: false },
  mar: { bg: "#15305c", deep: "#0b1c3a", fg: "#f6efe3", accent: "#f2b632", onAccent: "#1c1712", dark: true },
  oliva: { bg: "#4b5726", deep: "#2f3816", fg: "#f3ead7", accent: "#e8c45a", onAccent: "#1c1712", dark: true },
  terracota: { bg: "#a4472b", deep: "#73301b", fg: "#fbf1e6", accent: "#ffd58a", onAccent: "#1c1712", dark: true },
  tinta: { bg: "#17130f", deep: "#0a0806", fg: "#f3ead7", accent: "#d4a62a", onAccent: "#17130f", dark: true },
  hueso: { bg: "#efe5d2", deep: "#ddcfb4", fg: "#1c1712", accent: "#a3162b", onAccent: "#fbf3e4", dark: false },
  arena: { bg: "#d9c6a0", deep: "#c2ab7e", fg: "#1c1712", accent: "#15305c", onAccent: "#f6efe3", dark: false },
};

export interface ThemeLook {
  tone: ToneKey;
  texture: TextureKey;
  /** Giant background word of the tile. */
  word: string;
  /** Campaign photo slot (public/campaign/<key>.webp) and the uploaded site photo used until it exists. */
  campaign?: string;
  site?: string;
}

/** Look of each collection / theme (by collection slug or theme key). */
export const THEME_LOOKS: Record<string, ThemeLook> = {
  futbol: { tone: "oliva", texture: "pitch", word: "GRADA", campaign: "futbol" },
  fiestas: { tone: "rojo", texture: "papel", word: "FIESTA", campaign: "fiestas", site: "look-flamenca-mujer" },
  playa: { tone: "azafran", texture: "rays", word: "VERANO", campaign: "playa", site: "look-faro-pareja" },
  tapas: { tone: "terracota", texture: "tiles", word: "TAPEO", campaign: "tapas" },
  sabiduria: { tone: "hueso", texture: "azulejo", word: "REFRÁN", campaign: "sabiduria" },
  heritage: { tone: "tinta", texture: "hatch", word: "LEGADO", campaign: "heritage", site: "look-quijote-hombre" },
  mediterraneo: { tone: "mar", texture: "waves", word: "MAR", campaign: "mediterraneo", site: "look-barca-nino" },
  profesiones: { tone: "arena", texture: "grid", word: "OFICIO", campaign: "profesiones" },
  espana: { tone: "rojo", texture: "stripes", word: "ESPAÑA", campaign: "camisetas" },
  esenciales: { tone: "tinta", texture: "hatch", word: "FIRMA", campaign: "bordados" },
  leon: { tone: "tinta", texture: "hatch", word: "LEÓN", campaign: "leon", site: "look-leon-mujer" },
  statement: { tone: "rojo", texture: "stripes", word: "STATEMENT", campaign: "statement" },
  arte: { tone: "hueso", texture: "hatch", word: "ARTE", campaign: "arte", site: "look-toro-hombre" },
  refranero: { tone: "hueso", texture: "azulejo", word: "REFRÁN", campaign: "sabiduria" },
  bordados: { tone: "tinta", texture: "dots", word: "HILO", campaign: "bordados" },
  oficios: { tone: "arena", texture: "grid", word: "OFICIO", campaign: "profesiones" },
  familia: { tone: "terracota", texture: "dots", word: "FAMILIA", campaign: "familia", site: "look-barca-nino" },
  ciudades: { tone: "mar", texture: "grid", word: "CIUDAD", campaign: "ciudades" },
  motor: { tone: "tinta", texture: "stripes", word: "MOTOR" },
  padel: { tone: "oliva", texture: "grid", word: "PÁDEL" },
  ciclismo: { tone: "terracota", texture: "stripes", word: "PUERTO" },
  "mi-pueblo": { tone: "arena", texture: "tiles", word: "PUEBLO" },
  camino: { tone: "azafran", texture: "dots", word: "CAMINO" },
  militar: { tone: "oliva", texture: "hatch", word: "SERVICIO" },
};

export const lookFor = (key: string): ThemeLook => THEME_LOOKS[key] ?? { tone: "hueso", texture: "dots", word: key.toUpperCase() };

/** Category tiles: alternate the house tones so a row never repeats a colour. */
export const CATEGORY_LOOKS: Record<string, ThemeLook> = {
  TSHIRT: { tone: "rojo", texture: "stripes", word: "CAMISETA", campaign: "camisetas", site: "look-toro-hombre" },
  HOODIE: { tone: "mar", texture: "waves", word: "SUDADERA", campaign: "sudaderas", site: "look-quijote-hombre" },
  APPAREL: { tone: "rojo", texture: "stripes", word: "ROPA", campaign: "camisetas", site: "look-toro-hombre" },
  HEADWEAR: { tone: "tinta", texture: "dots", word: "GORRA", campaign: "gorras", site: "cat-gorras" },
  KIDS: { tone: "azafran", texture: "dots", word: "PEQUES", campaign: "ninos" },
  DRINKWARE: { tone: "terracota", texture: "tiles", word: "TAZA", campaign: "tazas", site: "cat-tazas" },
  BAGS: { tone: "oliva", texture: "grid", word: "BOLSA", campaign: "bolsas", site: "cat-bolsas" },
  WALL_ART: { tone: "hueso", texture: "hatch", word: "LÁMINA", campaign: "laminas" },
  HOME_LIVING: { tone: "arena", texture: "tiles", word: "HOGAR", campaign: "hogar" },
  EMB: { tone: "tinta", texture: "dots", word: "BORDADO", campaign: "bordados" },
  TECH_ACCESSORIES: { tone: "mar", texture: "grid", word: "FUNDA" },
  STATIONERY: { tone: "hueso", texture: "grid", word: "PAPEL" },
  PETS: { tone: "terracota", texture: "dots", word: "MASCOTA" },
};

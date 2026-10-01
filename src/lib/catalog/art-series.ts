/**
 * "Arte" series — author illustrations (engraved / painterly, cream–gold–charcoal with the flag
 * brushstroke) printed big: the artwork covers most of the print area, no small texts.
 * Every illustration comes in two looks:
 *  - "arte":  the artwork alone, as large as the print area allows,
 *  - "frase": the artwork with a short Spanish saying set in an elegant serif underneath.
 *
 * Illustrations are imported into storage (site-art/<name>.png); the renderer reads the true
 * aspect from the file, so a placeholder aspect in the manifest never distorts the print.
 * Sayings are traditional refranes or public-domain quotes (Cervantes 1615, Icaza †1925, Machado †1939).
 */
import type { BlueprintKey, Design } from "./designs";
import { artAspect, artPath, artUrl, type ArtName } from "./designs-art";
import type { FontKey, ImageLayer, TextLayer } from "@/lib/personalization/types";

const WF: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };
const RATIO = 3200 / 2400;
let n = 0;
const id = () => `a${(n++).toString(36)}`;
const txt = (text: string, font: FontKey, color: string, y: number, cap: number): TextLayer => ({ id: id(), type: "text", text, font, color, x: 0.5, y, w: +Math.min(0.9, cap * RATIO * [...text].length * WF[font]).toFixed(4), rotation: 0 });
function art(name: string, y: number, maxW: number, maxH: number, x = 0.5): ImageLayer {
  const a = artAspect(name);
  const w = +Math.min(maxW, maxH / (a * 0.75)).toFixed(4);
  return { id: id(), type: "image", path: artPath(name as ArtName), url: artUrl(name), aspect: a, x, y, w, rotation: 0 };
}

/** Direct CDN URL of an imported illustration (faster than the /catalog/art rewrite). */
export const siteArtSrc = (name: string) => `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/print-files/site-art/${name}.png`;

const INK = "#1c1a17";
const RED = "#a3162b";

interface Piece {
  key: string; // slug part
  art: string; // site-art name
  collection: string;
  name: string;
  line: string;
  saying: [string, string]; // two lines, printed in the "frase" look
  tags: string[];
}

export const ART_SERIES: Piece[] = [
  { key: "toro", art: "art-toro", collection: "espana", name: "Toro Bravo", line: "El toro de lidia en grabado de autor, con el trazo rojo y gualda detrás.", saying: ["COGER EL TORO", "POR LOS CUERNOS"], tags: ["toro", "espana"] },
  { key: "flamenca", art: "art-flamenca", collection: "heritage", name: "La Flamenca", line: "Una bailaora en pleno giro: volantes, duende y oro viejo.", saying: ["A MAL TIEMPO,", "BUENA CARA"], tags: ["flamenco", "andalucia"] },
  { key: "quijote", art: "art-quijote", collection: "heritage", name: "Quijote y Sancho", line: "El caballero y su escudero frente al molino. Literatura que se lleva puesta.", saying: ["EL QUE LEE MUCHO Y ANDA MUCHO,", "VE MUCHO Y SABE MUCHO"], tags: ["quijote", "cervantes", "la-mancha"] },
  { key: "estadio", art: "art-estadio", collection: "futbol", name: "Noche de Estadio", line: "El balón de cuero en el centro del campo, focos y grada rugiendo.", saying: ["EL FÚTBOL SE JUEGA", "CON EL CORAZÓN"], tags: ["futbol", "estadio"] },
  { key: "faro", art: "art-faro", collection: "playa", name: "El Faro", line: "Un faro frente al mar bravo, grabado a gran tamaño.", saying: ["DESPUÉS DE LA TEMPESTAD", "VIENE LA CALMA"], tags: ["faro", "mar", "costa"] },
  { key: "chiringuito", art: "art-chiringuito", collection: "playa", name: "Chiringuito", line: "Sombrilla de paja, dos hamacas y el Mediterráneo: el verano entero en una ilustración.", saying: ["SIN PRISA,", "PERO SIN PAUSA"], tags: ["playa", "verano", "mediterraneo"] },
  { key: "guitarra", art: "art-guitarra", collection: "heritage", name: "Guitarra Flamenca", line: "Guitarra, clavel y abanico: el alma del tablao en una sola pieza.", saying: ["QUIEN CANTA,", "SU MAL ESPANTA"], tags: ["flamenco", "musica"] },
  { key: "alhambra", art: "art-alhambra", collection: "heritage", name: "Patio de los Leones", line: "La Alhambra en grabado fino: arcos, columnas y cipreses.", saying: ["NO HAY EN LA VIDA NADA COMO LA PENA", "DE SER CIEGO EN GRANADA"], tags: ["granada", "andalucia"] },
  { key: "galeon", art: "art-galeon", collection: "heritage", name: "El Galeón", line: "Un galeón a toda vela sobre el mar, con el trazo rojo y gualda detrás.", saying: ["MAR EN CALMA NO HACE", "BUEN MARINERO"], tags: ["mar", "historia"] },
  { key: "pueblo-blanco", art: "art-pueblo-blanco", collection: "mediterraneo", name: "Pueblo Blanco", line: "Cal, campanario y macetas azules: el pueblo andaluz de siempre.", saying: ["PUEBLO CHICO,", "CORAZÓN GRANDE"], tags: ["pueblo", "andalucia"] },
  { key: "barca", art: "art-barca", collection: "mediterraneo", name: "La Barca", line: "La barca de pesca varada en la arena, con redes y remos.", saying: ["POCO A POCO", "SE VA LEJOS"], tags: ["mar", "pesca"] },
  { key: "olivo", art: "art-olivo", collection: "mediterraneo", name: "El Olivo", line: "Un olivo centenario sobre los campos de olivar.", saying: ["AGUA, SOL Y PACIENCIA", "HACEN EL ACEITE"], tags: ["olivo", "campo", "aceite"] },
  { key: "vino", art: "art-vino", collection: "tapas", name: "Barrica y Viña", line: "Barrica de roble, copa de tinto y racimo: la viña al atardecer.", saying: ["AL PAN, PAN,", "Y AL VINO, VINO"], tags: ["vino", "rioja"] },
  { key: "jamon", art: "art-jamon", collection: "tapas", name: "El Jamón", line: "Jamonero, cuchillo y loncha fina, con queso, aceitunas y pan.", saying: ["LAS PENAS CON PAN", "SON MENOS"], tags: ["jamon", "tapas"] },
  { key: "paella", art: "art-paella", collection: "tapas", name: "Paella de Domingo", line: "La paellera humeante con gambas, mejillones, limón y jarra de sangría.", saying: ["SOBREMESA LARGA,", "VIDA LARGA"], tags: ["paella", "valencia"] },
  { key: "churros", art: "art-churros", collection: "tapas", name: "Chocolate con Churros", line: "Taza de chocolate espeso y churros recién hechos sobre mármol de café antiguo.", saying: ["A FALTA DE PAN,", "BUENAS SON TORTAS"], tags: ["churros", "desayuno"] },
  { key: "vermut", art: "art-vermut", collection: "tapas", name: "La Hora del Vermut", line: "Sifón, vermut rojo con naranja, aceitunas y anchoas: el domingo antes de comer.", saying: ["SIN PRISA,", "QUE ES DOMINGO"], tags: ["vermut", "tapas", "aperitivo"] },
  { key: "feria", art: "art-feria", collection: "fiestas", name: "Real de la Feria", line: "Farolillos, caseta y a caballo con traje de flamenca: la feria de abril.", saying: ["QUIEN NO HA VISTO SEVILLA", "NO HA VISTO MARAVILLA"], tags: ["feria", "sevilla", "andalucia"] },
  { key: "sanfermin", art: "art-sanfermin", collection: "fiestas", name: "El Encierro", line: "Pañuelo rojo, calle empedrada y la carrera delante de los toros.", saying: ["UNO DE ENERO, DOS DE FEBRERO…", "¡SAN FERMÍN!"], tags: ["san-fermin", "pamplona"] },
  { key: "peregrino", art: "art-peregrino", collection: "camino", name: "El Peregrino", line: "Bastón, concha y sombrero: el Camino hacia la catedral al amanecer.", saying: ["CAMINANTE, NO HAY CAMINO,", "SE HACE CAMINO AL ANDAR"], tags: ["camino", "santiago"] },
  { key: "rally", art: "art-rally", collection: "motor", name: "Rally Clásico", line: "Un coche de rally de los 70 derrapando en tierra, polvo y piedras.", saying: ["EL QUE NO ARRIESGA,", "NO GANA"], tags: ["motor", "rally"] },
  { key: "moto", art: "art-moto", collection: "motor", name: "Café Racer", line: "Una moto clásica en la carretera de la costa al atardecer.", saying: ["QUIEN TIENE CARRETERA,", "TIENE LIBERTAD"], tags: ["motor", "moto"] },
  { key: "fallas", art: "art-fallas", collection: "fiestas", name: "Nit de Foc", line: "Una falla gigante entre llamas y fuegos artificiales.", saying: ["DE LAS CENIZAS", "NACE LA FIESTA"], tags: ["fallas", "valencia"] },
  { key: "castellers", art: "art-castellers", collection: "fiestas", name: "Castellers", line: "La torre humana con el enxaneta en lo más alto.", saying: ["FORÇA, EQUILIBRI,", "VALOR I SENY"], tags: ["castellers", "cataluna"] },
  { key: "padel", art: "art-padel", collection: "padel", name: "Remate de Pádel", line: "El remate en la red, pala arriba, entre paredes de cristal.", saying: ["LA PARED", "TAMBIÉN JUEGA"], tags: ["padel", "deporte"] },
  { key: "ciclista", art: "art-ciclista", collection: "ciclismo", name: "El Puerto", line: "El ciclista de pie sobre los pedales subiendo el puerto de montaña.", saying: ["SUBIR, SUFRIR", "Y SEGUIR"], tags: ["ciclismo", "deporte"] },
  { key: "portero", art: "art-portero", collection: "futbol", name: "La Parada", line: "El portero volando a la escuadra con la punta de los guantes.", saying: ["EL QUE PARA,", "TAMBIÉN GANA"], tags: ["futbol", "portero"] },
];

const ARTE_PRODUCTS: BlueprintKey[] = ["tee", "hoodie", "sweat", "tote", "mug", "poster", "framed", "canvas", "pillow"];
const FRASE_PRODUCTS: BlueprintKey[] = ["tee", "sweat", "tote", "mug", "poster", "framed"];

/** Two-sided premium: the crowned lion small on the chest, the illustration big on the back. */
const DOBLE = ["toro", "flamenca", "quijote", "alhambra", "galeon", "faro", "fallas", "estadio"];

export function artSeriesDesigns(): Design[] {
  return ART_SERIES.flatMap((p) => {
    const arte: Design = {
      slug: `arte-${p.key}`,
      collection: p.collection,
      name: `${p.name} · Arte`,
      line: `${p.line} Ilustración de autor impresa a gran tamaño.`,
      tone: "light",
      layers: [art(p.art, 0.4, 0.94, 0.72)],
      products: ARTE_PRODUCTS,
      posterBg: "#f3ead7",
      tags: ["arte", "serie-arte", ...p.tags],
    };
    const long = Math.max(p.saying[0].length, p.saying[1].length);
    const cap = long > 22 ? 0.036 : 0.048;
    const frase: Design = {
      slug: `arte-${p.key}-frase`,
      collection: p.collection,
      name: `${p.name} · Frase`,
      line: `${p.line} Con el refrán «${p.saying.join(" ").replace(/\s+/g, " ").toLowerCase()}».`,
      tone: "light",
      layers: [art(p.art, 0.33, 0.84, 0.56), txt(p.saying[0], "serif", INK, 0.69, cap), txt(p.saying[1], "serif", RED, 0.69 + cap * 1.55, cap)],
      products: FRASE_PRODUCTS,
      posterBg: "#f3ead7",
      tags: ["arte", "frase", "serie-arte", ...p.tags],
    };
    if (!DOBLE.includes(p.key)) return [arte, frase];
    const doble: Design = {
      slug: `arte-${p.key}-doble`,
      collection: p.collection,
      name: `${p.name} · Doble cara`,
      line: `${p.line} León coronado al pecho y la ilustración a gran tamaño en la espalda.`,
      tone: "light",
      layers: [art("lion-crowned", 0.15, 0.24, 0.3, 0.7)],
      back: [art(p.art, 0.42, 0.94, 0.76)],
      products: ["tee", "hoodie", "sweat"],
      posterBg: "#f3ead7",
      tags: ["arte", "serie-arte", "doble-cara", ...p.tags],
    };
    return [arte, frase, doble];
  });
}

/* ───────────── Refranero: typography-only pieces, a saying set big and elegant ───────────── */

const REFRANES: { key: string; lines: [string, string, string]; name: string }[] = [
  { key: "no-hay-mal", name: "No hay mal que por bien no venga", lines: ["NO HAY MAL", "que por bien", "NO VENGA"] },
  { key: "amigo-tesoro", name: "Quien tiene un amigo tiene un tesoro", lines: ["QUIEN TIENE UN AMIGO", "tiene", "UN TESORO"] },
  { key: "hoy-por-ti", name: "Hoy por ti, mañana por mí", lines: ["HOY POR TI,", "mañana", "POR MÍ"] },
  { key: "agua-correr", name: "Agua que no has de beber, déjala correr", lines: ["AGUA QUE NO HAS DE BEBER,", "déjala", "CORRER"] },
  { key: "vida-sueno", name: "La vida es sueño", lines: ["LA VIDA", "es", "SUEÑO"] },
  { key: "visteme-despacio", name: "Vísteme despacio, que tengo prisa", lines: ["VÍSTEME DESPACIO,", "que tengo", "PRISA"] },
  { key: "cria-fama", name: "Cría fama y échate a dormir", lines: ["CRÍA FAMA", "y échate", "A DORMIR"] },
  { key: "mas-vale-tarde", name: "Más vale tarde que nunca", lines: ["MÁS VALE TARDE", "que", "NUNCA"] },
];

export function refraneroDesigns(): Design[] {
  return REFRANES.flatMap((r) => {
    const look = (tone: "light" | "dark"): Design => {
      const ink = tone === "light" ? INK : "#f3ead7";
      const accent = tone === "light" ? RED : "#d4a62a";
      // big type: each line as large as the width allows, stacked by its real height
      const capS = (t: string) => Math.min(0.12, 0.84 / (RATIO * [...t].length * WF.serif));
      const capC = (t: string) => Math.min(0.16, 0.72 / (RATIO * [...t].length * WF.script));
      const [a, b, c] = [capS(r.lines[0]), capC(r.lines[1]), capS(r.lines[2])];
      const gap = 0.028, hb = b * 1.45;
      const total = a + gap + hb + gap + c;
      const top = 0.4 - total / 2;
      const ya = top + a / 2, yb = top + a + gap + hb / 2 - b * 0.14, yc = top + a + gap + hb + gap + c / 2;
      return {
        slug: `refran-${r.key}${tone === "dark" ? "-noche" : ""}`,
        collection: "espana",
        name: `«${r.name}»${tone === "dark" ? " · Noche" : ""}`,
        line: `El refranero español, compuesto a gran tamaño: «${r.name}». Sabiduría de siempre para llevar puesta.`,
        tone,
        layers: [txt(r.lines[0], "serif", ink, +ya.toFixed(4), a), txt(r.lines[1], "script", accent, +yb.toFixed(4), b), txt(r.lines[2], "serif", ink, +yc.toFixed(4), c)],
        products: ["tee", "sweat", "hoodie", "tote", "mug", "poster"],
        posterBg: tone === "light" ? "#f3ead7" : "#0d0d0d",
        tags: ["refranero", "frase", "tipografia"],
      };
    };
    return [look("light"), look("dark")];
  });
}

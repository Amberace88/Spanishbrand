/**
 * Catalog curation — which library designs the shop still sells.
 *
 * The shop carries only full, original designs: big author illustrations, big-type sayings and posters,
 * the León series, Fútbol PRO, embroidery (small by nature) and the family line. The early "flat icon +
 * title + tiny tagline" pieces (most BASE designs, the coordinate city badges, the profession seals and
 * minimals, the old scarf / kit-bar / stadium football looks) are retired.
 *
 * A retired design:
 *  - gets no new catalog jobs (buildPlan skips it),
 *  - is not offered in the designer ("Estilos de la casa"), lookbook, landings or alternative rows,
 *  - is filtered out of every listing at once (before its products are archived in the DB),
 *  - keeps its definition in code, so old orders and print files still render,
 *  - its product pages redirect (308/301) to the replacement below, or to its collection.
 *
 * The list is explicit (reviewable, no silent auto-retirement of future designs). `auditDesign` is the
 * objective rule it was derived from (docs/catalog-audit.md); a test checks that both still agree.
 * This file must stay client-safe (no server imports): the designer and header use it.
 */
import type { Design } from "./designs";
import { CITIES } from "./cities";
import { PROFESSIONS } from "./professions";
import TEAMS from "./football-teams.json";

/* ───────── objective rule ───────── */

const WF: Record<string, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47, varsity: 0.67, mono: 0.62, elegant: 0.62 };

export type Verdict = "KEEP" | "RETIRE";
export interface Audit {
  series: string;
  verdict: Verdict;
  reason: string;
  /** main art layer: width / height as fractions of the print canvas */
  artW: number;
  artH: number;
  /** main art is an illustration or brand mark (not one of the flat house icons) */
  artRich: boolean;
  /** largest text layer: width fraction and font size (fraction of canvas height) */
  textW: number;
  textH: number;
}

/**
 * Thresholds: the main element must fill the print area —
 *  big art   = an illustration / brand mark ≥ 55 % of the width and ≥ 28 % of the height,
 *  big type  = a text line ≥ 60 % of the width at display size (≥ 11 % of the canvas height).
 * The flat house icons (sun, waves, castle, wine glass… scripts/catalog-art.mjs) never count as big art:
 * those layouts are the generic "icon + title + tagline" badge the shop is moving away from.
 */
export const AUDIT_RULE = { artW: 0.55, artH: 0.28, textW: 0.6, textH: 0.11 } as const;
const RICH_ART = /^art\/(art-|prof-|fp-|lion-|logo-|crown-|sab-badge|sab-seal|sab-tile|badge-|shield)/;

export function seriesOf(d: Pick<Design, "slug" | "collection" | "tags">): string {
  const t = d.tags ?? [];
  if (t.includes("bordado")) return "bordados";
  if (t.includes("serie-leon")) return "leon";
  if (t.includes("lookbook")) return "lookbook";
  if (t.includes("futbol-pro")) return "futbol-pro";
  if (t.includes("statement")) return "statement";
  if (t.includes("sabiduria")) return "sabiduria";
  if (t.includes("refranero")) return "refranero";
  if (t.includes("serie-arte")) return "arte";
  if (t.includes("calendario")) return "calendarios";
  if (d.collection === "familia") return "familia";
  if (d.slug.startsWith("oficio-")) return d.slug.endsWith("-arte") ? "oficios-arte" : t.includes("cartel") ? "oficios-cartel" : "oficios";
  if (d.slug.startsWith("ciudad-")) return t.includes("cartel") ? "ciudades-cartel" : "ciudades";
  if (d.slug.startsWith("futbol-")) return "futbol-ciudades";
  return "base";
}

/** Curated series kept whole (owner's choice): their pieces are big by construction. */
// statement: full-area prints by construction; its "Mínimo de lujo" chest marks are small on purpose (owner brief)
const CURATED = new Set(["statement", "leon", "lookbook", "futbol-pro", "sabiduria", "refranero", "arte", "oficios-arte", "familia"]);

export function auditDesign(d: Pick<Design, "slug" | "collection" | "tags" | "layers">): Audit {
  const series = seriesOf(d);
  let artW = 0, artH = 0, artA = 0, artRich = false, textW = 0, textH = 0;
  for (const l of d.layers) {
    if (l.type === "image") {
      const h = l.w * l.aspect * 0.75; // canvas is 3:4 → height fraction
      if (l.w * h > artA) [artA, artW, artH, artRich] = [l.w * h, l.w, h, RICH_ART.test(l.path)];
    } else if (l.type === "text") {
      const n = Math.max(1, [...l.text.trim()].length);
      const h = (l.w * 2400) / (n * (WF[l.font] ?? 0.62)) / 3200; // renderer font size / canvas height
      if (l.w * h > textW * textH) [textW, textH] = [l.w, h];
    }
  }
  const r = (v: number) => +v.toFixed(3);
  const out = (verdict: Verdict, reason: string): Audit => ({ series, verdict, reason, artW: r(artW), artH: r(artH), artRich, textW: r(textW), textH: r(textH) });
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  if (RETIRE_OVERRIDES[d.slug]) return out("RETIRE", RETIRE_OVERRIDES[d.slug]);
  if (series === "bordados") return out("KEEP", "Bordado: pequeño por naturaleza (gorra / pecho / parche)");
  if (series === "calendarios") return out("KEEP", "Calendario: 12 láminas completas (PDF); la portada no es el producto");
  if (series === "oficios") return out("RETIRE", "Icono pequeño + texto pequeño; lo sustituyen «· Arte» (ilustración) y «· Cartel» (tipografía grande)");
  if (series === "futbol-ciudades") return out("RETIRE", "Línea de fútbol antigua (bufanda / barras / estadio); la sustituye Fútbol PRO «Colores de mi ciudad»");
  if (series === "ciudades") return out("RETIRE", "Insignia de ciudad (icono plano + nombre + coordenadas diminutas); la sustituye «· Cartel»");
  if (CURATED.has(series)) return out("KEEP", `Serie curada (${series})`);
  const bigArt = artRich && artW >= AUDIT_RULE.artW && artH >= AUDIT_RULE.artH;
  const bigType = textW >= AUDIT_RULE.textW && textH >= AUDIT_RULE.textH;
  if (bigArt) return out("KEEP", `Arte grande (${pct(artW)} × ${pct(artH)})`);
  if (bigType) return out("KEEP", `Tipografía grande (${pct(textW)} de ancho, cuerpo ${pct(textH)})`);
  const what = artW > 0 ? `${artRich ? "arte" : "icono plano"} ${pct(artW)} × ${pct(artH)}` : "sin arte";
  return out("RETIRE", `Icono + titular + subtítulo pequeño (${what}; texto ${pct(textW)} × ${pct(textH)})`);
}

/* ───────── visual-check overrides (the rule passes, the preview says otherwise) ───────── */

/** Retired although the size rule passes: superseded by a stronger piece of the same idea. */
export const RETIRE_OVERRIDES: Record<string, string> = {
  "firma-texto": "Logotipo fino sobre franjas: duplica «La Firma» (león + nombre), que se mantiene",
  "leon-escudo": "León pequeño impreso al pecho: lo sustituyen «León · Espalda» (doble cara) y el León Bordado",
  "leon-escudo-claro": "León pequeño impreso al pecho: lo sustituyen «León · Espalda» (doble cara) y el León Bordado",
  "corona-real-pecho": "Corona y texto diminutos impresos al pecho: los sustituye «Corona Bordada»",
  "corona-real-pecho-claro": "Corona y texto diminutos impresos al pecho: los sustituye «Corona Bordada»",
};

/* ───────── the explicit list (regenerate from the audit: docs/catalog-audit.md) ───────── */

export const RETIRED_LIST: readonly string[] = [
  // base
  "leon-pecho", "firma-texto", "hecho-en-espana", "sol-de-espana", "tierra-de-castillos", "rosa-de-los-vientos", "laurel-orgullo",
  "atardecer-mediterraneo", "casa-azulejo", "vivir-cerca-del-mar", "cuentarrevoluciones", "gasolina-y-curvas", "aficion-balon",
  "domingo-de-futbol", "padel-club", "vamos-a-la-pista", "puerto-de-montana", "a-rueda", "mi-pueblo-mapa", "orgullo-de-pueblo",
  "de-feria", "verbena", "chiringuito-club", "costa", "camo-espana", "veterano", "parche-espana", "operacion-siesta",
  "disciplina-honor", "sin-novedad", "un-vino", "al-porron", "tierra-de-vinos", "vino-y-tapas", "hora-del-vermut", "tapeo",
  "buen-camino", "sigue-la-flecha",
  // lookbook (small printed chest pieces)
  "leon-escudo", "leon-escudo-claro", "corona-real-pecho", "corona-real-pecho-claro",
  // generated lines, retired whole: coordinate city badges, profession seal + minimal, old football looks
  ...CITIES.map((c) => `ciudad-${c.slug}`),
  ...PROFESSIONS.flatMap((p) => [`oficio-${p.key}`, `oficio-${p.key}-minimal`]),
  ...(TEAMS as { key: string }[]).flatMap((t) => [`futbol-${t.key}-bufanda`, `futbol-${t.key}-moderno`, `futbol-${t.key}-estadio`]),
  "futbol-pizarra", "futbol-jugador-12",
];

export const RETIRED_DESIGNS: ReadonlySet<string> = new Set(RETIRED_LIST);
export const isRetiredDesign = (slug: string | null | undefined) => !!slug && RETIRED_DESIGNS.has(slug);

/**
 * Best replacement for a retired design (product pages redirect to the same product type of it).
 * Professions → their «· Arte» illustration; cities → the «· Cartel» poster; old football → the
 * Fútbol PRO shirt of the same city; the rest → the closest kept piece (or null → its collection).
 */
export function replacementFor(slug: string): string | null {
  const m = slug.match(/^oficio-(.+?)(-minimal)?$/);
  if (m && !slug.endsWith("-arte") && !slug.endsWith("-cartel")) return `oficio-${m[1]}-arte`;
  const c = slug.match(/^ciudad-(.+)$/);
  if (c && !slug.includes("-cartel") && !slug.startsWith("ciudad-calendario")) return `ciudad-${c[1]}-cartel`;
  const f = slug.match(/^futbol-(.+)-(bufanda|moderno|estadio)$/);
  if (f) return `fp-ciudad-${({ "madrid-blanco": "madrid", "sevilla-rojo": "sevilla", "sevilla-verde": "sevilla-verdiblanco" } as Record<string, string>)[f[1]] ?? f[1]}`;
  return REPLACEMENTS[slug] ?? null;
}
const REPLACEMENTS: Record<string, string> = {
  "leon-pecho": "leon-espalda",
  "leon-escudo": "leon-espalda",
  "leon-escudo-claro": "leon-espalda-claro",
  "corona-real-pecho": "rojo-y-gualda-real",
  "corona-real-pecho-claro": "leon-coronado",
  "firma-texto": "firma-leon",
  "hecho-en-espana": "arte-toro",
  "sol-de-espana": "arte-toro",
  "tierra-de-castillos": "arte-quijote",
  "rosa-de-los-vientos": "arte-galeon",
  "laurel-orgullo": "leon-coronado-noche",
  "atardecer-mediterraneo": "arte-chiringuito",
  "casa-azulejo": "sab-tierra-buena-gente",
  "vivir-cerca-del-mar": "arte-faro",
  "costa": "arte-faro",
  "chiringuito-club": "arte-chiringuito",
  "cuentarrevoluciones": "arte-rally",
  "gasolina-y-curvas": "arte-rally",
  "aficion-balon": "fp-aficion-estadio",
  "domingo-de-futbol": "fp-domingo-de-partido",
  "futbol-pizarra": "fp-aficion-estadio",
  "futbol-jugador-12": "fp-aficion-estadio",
  "padel-club": "arte-padel",
  "vamos-a-la-pista": "arte-padel",
  "puerto-de-montana": "arte-ciclista",
  "a-rueda": "arte-ciclista",
  "mi-pueblo-mapa": "arte-pueblo-blanco",
  "orgullo-de-pueblo": "arte-pueblo-blanco",
  "de-feria": "arte-feria",
  "verbena": "arte-fallas",
  "un-vino": "arte-vino",
  "al-porron": "arte-vino",
  "tierra-de-vinos": "arte-vino",
  "vino-y-tapas": "arte-jamon",
  "hora-del-vermut": "arte-vermut",
  "tapeo": "arte-jamon",
  "buen-camino": "arte-peregrino",
  "sigue-la-flecha": "arte-peregrino",
};

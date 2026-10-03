import type { Design } from "./designs";
import { CITIES, dms } from "./cities";
import { fit, stack, track, type Item } from "./sabiduria";

const G2 = "#f0c75a", CR = "#f3ead7", INK = "#111111", R = "#c8102e";

/**
 * "Ciudad · Cartel" — the city line that replaces the small coordinate badges above (retired): a
 * typographic poster that fills the print area. Coordinates tracked on top, the city name in condensed
 * type across ~86 % of the width (long two-word names stacked), the rojigualda band full width and the
 * city's motto in serif underneath. Every city gets the night look; the top cities also a light one.
 */
export function cityPosterDesigns(): Design[] {
  const out: Design[] = [];
  const W = 0.86;
  for (const c of CITIES) {
    const coords = `${dms(c.lat, "N", "S")} · ${dms(c.lon, "E", "O")}`;
    const words = c.name.split(" ");
    const lines = words.length > 1 && c.name.length > 9 ? words : [c.name];
    for (const tone of (c.top ? ["dark", "light"] : ["dark"]) as ("dark" | "light")[]) {
      const ink = tone === "dark" ? CR : INK, acc = tone === "dark" ? G2 : R, nameC = tone === "dark" ? G2 : INK;
      // the coordinates are the second display element: latitude and longitude as two big condensed lines
      const [lat, lon] = coords.split(" · ");
      const nameMax = lines.length > 1 ? 0.22 : 0.26;
      const cs = Math.min(fit(lat, "sport", W * 0.62, 0.15), fit(lon, "sport", W * 0.62, 0.15));
      const items: Item[] = [
        { kind: "t", fixed: true, text: track(c.sub), font: "sans", color: acc, size: 0.024, gap: 0.04 },
        ...lines.map((l, i): Item => ({ kind: "t", text: l, font: "sport", color: i === lines.length - 1 ? nameC : ink, size: fit(l, "sport", W, nameMax), gap: i === lines.length - 1 ? 0.04 : 0.02 })),
        { kind: "i", name: "stripes-rg", w: W, gap: 0.045 },
        { kind: "t", text: lat, font: "sport", color: ink, size: cs, gap: 0.02 },
        { kind: "t", text: lon, font: "sport", color: tone === "dark" ? CR : R, size: cs, gap: 0.04 },
        { kind: "t", fixed: true, text: track("España"), font: "sans", color: ink, size: 0.022, gap: 0 },
      ];
      out.push({
        slug: `ciudad-${c.slug}-cartel${tone === "light" ? "-claro" : ""}`,
        collection: "ciudades",
        name: `${c.label} · Cartel${tone === "light" ? " (claro)" : ""}`,
        line: `${c.line} El nombre de la ciudad a tamaño cartel, con la rojigualda y su lema.`,
        tone,
        layers: stack(items, 0.45, 0.86),
        products: c.top ? ["tee", "hoodie", "sweat", "womtee", "mug", "poster", "tote"] : ["tee", "sweat", "mug", "poster"],
        posterBg: tone === "dark" ? "#0d0d0d" : "#f3ead7",
        tags: ["ciudad", "cartel", "tipografia", c.slug, c.region],
      });
    }
  }
  return out;
}


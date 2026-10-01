/**
 * Storefront theme catalogue: what matters in Spain, mapped to collections (by slug).
 * Content (name, tagline, status) lives in the DB `collections` table; this file only
 * holds presentation (mockup, colours, grouping). No official club/league marks are used.
 */
import type { MockupKind } from "@/components/art/Mockup";

export type ThemeGroup = "core" | "sport" | "life";

export interface ThemeStyle {
  slug: string;
  group: ThemeGroup;
  kind: MockupKind;
  garment: string;
  art: string; // CollectionArt slug used as the print
  tile: string; // tailwind classes for the tile background/text
}

export const THEMES: ThemeStyle[] = [
  { slug: "esenciales", group: "core", kind: "hoodie", garment: "#111111", art: "espana", tile: "bg-[#0b0b0b] text-[#f5f1e8]" },
  { slug: "espana", group: "core", kind: "tee", garment: "#ffffff", art: "espana", tile: "bg-accent text-white" },
  { slug: "heritage", group: "core", kind: "hoodie", garment: "#f1e7d3", art: "heritage", tile: "bg-[#14213d] text-white" },
  { slug: "mediterraneo", group: "core", kind: "tote", garment: "#ffffff", art: "mediterraneo", tile: "bg-[#1f4fd1] text-white" },
  { slug: "motor", group: "sport", kind: "tee", garment: "#ffffff", art: "motor", tile: "bg-fg text-bg" },
  { slug: "futbol", group: "sport", kind: "tee", garment: "#ffffff", art: "futbol", tile: "bg-[#0f7a3d] text-white" },
  { slug: "padel", group: "sport", kind: "cap", garment: "#ffffff", art: "padel", tile: "bg-[#c6f432] text-black" },
  { slug: "ciclismo", group: "sport", kind: "tee", garment: "#ffc400", art: "ciclismo", tile: "bg-[#ff5a1f] text-white" },
  { slug: "mi-pueblo", group: "life", kind: "tee", garment: "#ffffff", art: "mi-pueblo", tile: "bg-gold text-black" },
  { slug: "fiestas", group: "life", kind: "tee", garment: "#ffffff", art: "fiestas", tile: "bg-[#ff3d8b] text-white" },
  { slug: "playa", group: "life", kind: "tote", garment: "#ffffff", art: "mediterraneo", tile: "bg-[#2ec4d6] text-black" },
  { slug: "tapas", group: "life", kind: "mug", garment: "#ffffff", art: "tapas", tile: "bg-[#7a1f2b] text-white" },
  { slug: "camino", group: "life", kind: "tote", garment: "#efe4cf", art: "camino", tile: "bg-[#f2d16b] text-black" },
];

export const themeFor = (slug: string): ThemeStyle =>
  THEMES.find((t) => t.slug === slug) ?? { slug, group: "core", kind: "tee", garment: "#ffffff", art: slug, tile: "bg-surface-2 text-fg" };

export const SPORT_SLUGS = THEMES.filter((t) => t.group === "sport").map((t) => t.slug);
export const LIFE_SLUGS = THEMES.filter((t) => t.group === "life").map((t) => t.slug);

/** Fixed-date Spanish celebrations (movable feasts are announced as drops instead). */
export const FIESTAS: { key: string; name: string; month: number; day: number; place: string; theme: string }[] = [
  { key: "reyes", name: "Reyes Magos", month: 1, day: 6, place: "Toda España", theme: "fiestas" },
  { key: "fallas", name: "Fallas", month: 3, day: 15, place: "València", theme: "fiestas" },
  { key: "hogueras", name: "Hogueras de San Juan", month: 6, day: 20, place: "Alicante", theme: "fiestas" },
  { key: "sanfermin", name: "San Fermín", month: 7, day: 6, place: "Pamplona", theme: "fiestas" },
  { key: "hispanidad", name: "Fiesta Nacional · Hispanidad", month: 10, day: 12, place: "Toda España", theme: "espana" },
  { key: "constitucion", name: "Día de la Constitución", month: 12, day: 6, place: "Toda España", theme: "espana" },
  { key: "navidad", name: "Navidad", month: 12, day: 24, place: "Toda España", theme: "fiestas" },
];

export function upcomingFiestas(now = new Date(), count = 4) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return FIESTAS.map((f) => {
    let y = now.getUTCFullYear();
    let d = Date.UTC(y, f.month - 1, f.day);
    if (d < today) d = Date.UTC(++y, f.month - 1, f.day);
    return { ...f, date: new Date(d), days: Math.round((d - today) / 86_400_000) };
  })
    .sort((a, b) => a.days - b.days)
    .slice(0, count);
}

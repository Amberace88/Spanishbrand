/**
 * Shop navigation themes — one definition for the header mega menu, the mobile drawer and the /shop
 * landing tiles. Client-safe. Every theme only lists curated, active lines (lib/catalog/retired.ts);
 * pages hide a theme with no products (`themeMatch` counts them).
 */
export type L3 = { es: string; en: string; de: string };

export interface Theme {
  key: string;
  href: string;
  label: L3;
  sub: L3;
  /** Matches a listing product (tags / collection) for counts and cover photos. */
  match: (p: { tags: string[]; collection: { slug: string } | null }) => boolean;
  /** Fallback cover when there is no product photo yet (house art). */
  art: string;
}

const has = (t: string) => (p: { tags: string[] }) => p.tags.includes(t);

/** "Colecciones": the curated lines of the house. */
export const COLLECTION_THEMES: Theme[] = [
  { key: "leon", href: "/collections/leon", label: { es: "León", en: "Lion", de: "Löwe" }, sub: { es: "El león coronado de la casa", en: "The house's crowned lion", de: "Der gekrönte Löwe des Hauses" }, match: has("leon"), art: "/catalog/art/lion-crowned.png" },
  { key: "arte", href: "/arte", label: { es: "Arte de autor", en: "Author art", de: "Autorenkunst" }, sub: { es: "Ilustraciones de España a gran tamaño", en: "Big illustrations of Spain", de: "Große Illustrationen Spaniens" }, match: (p) => p.tags.includes("serie-arte"), art: "site-art:art-toro" },
  { key: "refranero", href: "/sabiduria", label: { es: "Refranero", en: "Spanish sayings", de: "Sprichwörter" }, sub: { es: "Refranes y frases, en letra grande", en: "Sayings set big and bold", de: "Sprichwörter in großer Schrift" }, match: (p) => p.tags.includes("sabiduria") || p.tags.includes("refranero"), art: "/catalog/art/sab-tile-talavera.png" },
  { key: "futbol", href: "/futbol", label: { es: "Fútbol PRO", en: "Football PRO", de: "Fußball PRO" }, sub: { es: "Campeones y colores de mi ciudad", en: "Champions and city colours", de: "Weltmeister und Stadtfarben" }, match: has("futbol-pro"), art: "/catalog/art/fp-campeones-mundo-noche.png" },
  { key: "bordados", href: "/shop?tema=bordados", label: { es: "Bordados", en: "Embroidery", de: "Stickerei" }, sub: { es: "Gorras y prendas bordadas en hilo de oro", en: "Caps and garments embroidered in gold", de: "Bestickte Caps und Kleidung" }, match: has("bordado"), art: "/catalog/art/lion-emb.png" },
  { key: "oficios", href: "/collections/profesiones", label: { es: "Oficios", en: "Trades", de: "Berufe" }, sub: { es: "Orgullo de oficio, ilustrado y en cartel", en: "Pride of trade, illustrated", de: "Berufsstolz, illustriert" }, match: has("profesion"), art: "site-art:prof-enfermeria" },
  { key: "familia", href: "/collections/familia", label: { es: "Familia", en: "Family", de: "Familie" }, sub: { es: "Abuelos, peques y bebés", en: "Grandparents, kids and babies", de: "Großeltern, Kinder und Babys" }, match: (p) => p.collection?.slug === "familia" || p.tags.includes("familia"), art: "/catalog/art/lion-crowned.png" },
  { key: "ciudades", href: "/ciudades", label: { es: "Ciudades", en: "Cities", de: "Städte" }, sub: { es: "Tu ciudad a tamaño cartel", en: "Your city, poster-size", de: "Deine Stadt im Plakatformat" }, match: (p) => p.tags.includes("ciudad") && p.tags.includes("cartel"), art: "" },
];

/** "Temas": themed collections (illustrations and sayings of each world) and the hubs. */
export const TOPIC_THEMES: { href: string; label: L3 }[] = [
  { href: "/collections/espana", label: { es: "España", en: "Spain", de: "Spanien" } },
  { href: "/collections/heritage", label: { es: "Heritage", en: "Heritage", de: "Heritage" } },
  { href: "/collections/mediterraneo", label: { es: "Mediterráneo", en: "Mediterranean", de: "Mittelmeer" } },
  { href: "/collections/fiestas", label: { es: "Fiestas", en: "Fiestas", de: "Fiestas" } },
  { href: "/collections/tapas", label: { es: "Tapas y vino", en: "Tapas & wine", de: "Tapas & Wein" } },
  { href: "/collections/playa", label: { es: "Playa", en: "Beach", de: "Strand" } },
  { href: "/deportes", label: { es: "Deportes", en: "Sports", de: "Sport" } },
  { href: "/regiones", label: { es: "Regiones", en: "Regions", de: "Regionen" } },
  { href: "/regalos", label: { es: "Regalos", en: "Gifts", de: "Geschenke" } },
];

/** "Categorías": what kind of product (shop filters). */
export const CATEGORY_LINKS: { href: string; label: L3 }[] = [
  { href: "/shop?c=APPAREL&t=TSHIRT", label: { es: "Camisetas", en: "T-shirts", de: "T-Shirts" } },
  { href: "/shop?c=APPAREL&t=HOODIE", label: { es: "Sudaderas", en: "Hoodies & sweatshirts", de: "Hoodies & Sweatshirts" } },
  { href: "/shop?c=KIDS", label: { es: "Infantil", en: "Kids", de: "Kinder" } },
  { href: "/shop?c=HEADWEAR", label: { es: "Gorras", en: "Caps & hats", de: "Caps & Mützen" } },
  { href: "/shop?c=DRINKWARE", label: { es: "Tazas y vasos", en: "Mugs & glasses", de: "Tassen & Gläser" } },
  { href: "/shop?c=BAGS", label: { es: "Bolsas", en: "Bags", de: "Taschen" } },
  { href: "/shop?c=WALL_ART", label: { es: "Pared", en: "Wall art", de: "Wandkunst" } },
  { href: "/shop?c=HOME_LIVING", label: { es: "Hogar", en: "Home", de: "Zuhause" } },
];

export const themeByKey = (key: string | undefined) => COLLECTION_THEMES.find((t) => t.key === key) ?? null;

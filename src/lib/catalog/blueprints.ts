/**
 * Product blueprints for the catalog builder: which provider product to use, which colours and
 * sizes to offer, retail prices and the product copy. Provider IDs are resolved (and verified)
 * against the live provider catalogs at build time — the hints below are only starting points.
 */
import type { BlueprintKey, Tone } from "./designs";
import type { RenderMode } from "./render";

export interface Blueprint {
  key: BlueprintKey;
  provider: "printful" | "gelato" | "printify" | "prodigi";
  productType: string;
  category: string;
  label: string; // Spanish product noun used in names
  /** Printful: catalog product IDs to try first; title must match `match`. */
  preferredIds?: string[];
  match: RegExp;
  exclude?: RegExp;
  /** A different provider product for one tone (e.g. black mug for dark designs). */
  alt?: Partial<Record<Tone, { preferredIds?: string[]; match: RegExp; exclude?: RegExp; label?: string }>>;
  placement: string; // provider file type / mockup placement
  renderMode: RenderMode;
  technique: string;
  colors?: Record<Tone, string[]>; // preferred colour names, first available wins (max 3)
  maxColors?: number;
  sizes?: string[]; // allowed sizes, in display order
  price: number; // base retail price (EUR, VAT incl.)
  sizePremium?: Record<string, number>;
  /** Prodigi: SKUs to try (first existing ones win) and attribute preferences per tone. */
  skus?: { sku: string; label: string }[];
  attrPrefs?: Record<string, Partial<Record<Tone, string[]>> & { any?: string[] }>;
  /** Printify: keep only variants whose option text matches (e.g. recent phone models). */
  variantFilter?: RegExp;
  maxVariants?: number;
  details: string;
  care: string;
}

export const BLUEPRINTS: Record<BlueprintKey, Blueprint> = {
  tee: {
    key: "tee",
    provider: "printful",
    productType: "TSHIRT",
    category: "APPAREL",
    label: "Camiseta",
    preferredIds: ["71"],
    match: /3001|Unisex Staple T-Shirt/i,
    exclude: /Youth|Toddler|Baby|Kids|All-Over/i,
    placement: "front",
    renderMode: "print",
    technique: "DTG",
    colors: { dark: ["Black", "Navy", "Black Heather"], light: ["White", "Natural", "Soft Cream", "Heather Dust"] },
    maxColors: 2,
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    price: 29.95,
    sizePremium: { "2XL": 2, "3XL": 4 },
    details:
      "Camiseta unisex de algodón peinado ring-spun 100 % (los colores jaspeados llevan mezcla con poliéster). Tejido ligero y suave, corte regular, costuras laterales y cuello reforzado. Impresión directa sobre la prenda (DTG) con tintas al agua.",
    care: "Lavar del revés en frío. No usar lejía. Secar al aire o en secadora a baja temperatura. Planchar del revés, sin tocar la impresión.",
  },
  kids: {
    key: "kids",
    provider: "printful",
    productType: "KIDS_TSHIRT",
    category: "KIDS",
    label: "Camiseta infantil",
    match: /Youth.*(Staple )?T-?Shirt|Youth Short Sleeve T-?Shirt/i,
    exclude: /All-Over|Long Sleeve|Tank/i,
    placement: "front",
    renderMode: "print",
    technique: "DTG",
    colors: { dark: ["Black", "Navy"], light: ["White", "Natural", "Soft Cream"] },
    maxColors: 2,
    sizes: ["XS", "S", "M", "L", "XL"],
    price: 22.95,
    details: "Camiseta infantil de algodón suave, corte cómodo y cuello reforzado. Impresión directa (DTG) con tintas al agua, aptas para la piel de los peques.",
    care: "Lavar del revés en frío. No usar lejía. Secar a baja temperatura.",
  },
  hoodie: {
    key: "hoodie",
    provider: "printful",
    productType: "HOODIE",
    category: "APPAREL",
    label: "Sudadera con capucha",
    preferredIds: ["146"],
    match: /18500|Unisex Heavy Blend Hoodie/i,
    exclude: /Youth|Zip/i,
    placement: "front",
    renderMode: "print",
    technique: "DTG",
    colors: { dark: ["Black", "Navy", "Dark Heather"], light: ["White", "Sport Grey", "Sand"] },
    maxColors: 2,
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    price: 54.95,
    sizePremium: { "2XL": 3, "3XL": 5 },
    details: "Sudadera unisex de felpa gruesa (50 % algodón, 50 % poliéster), capucha forrada con cordón, bolsillo canguro y puños elásticos. Cálida, resistente y con caída cómoda. Impresión directa (DTG).",
    care: "Lavar del revés en frío con colores similares. No usar lejía. Secar a baja temperatura. No planchar sobre la impresión.",
  },
  sweat: {
    key: "sweat",
    provider: "printful",
    productType: "SWEATSHIRT",
    category: "APPAREL",
    label: "Sudadera",
    preferredIds: ["145"],
    match: /18000|Unisex Crew Neck Sweatshirt|Heavy Blend Crewneck/i,
    exclude: /Youth/i,
    placement: "front",
    renderMode: "print",
    technique: "DTG",
    colors: { dark: ["Black", "Navy"], light: ["White", "Sport Grey", "Sand"] },
    maxColors: 2,
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    price: 46.95,
    sizePremium: { "2XL": 3, "3XL": 5 },
    details: "Sudadera de cuello redondo unisex en felpa (50 % algodón, 50 % poliéster), puños y bajo acanalados, interior cepillado. Un básico de entretiempo. Impresión directa (DTG).",
    care: "Lavar del revés en frío. No usar lejía. Secar a baja temperatura. No planchar sobre la impresión.",
  },
  mug: {
    key: "mug",
    provider: "printful",
    productType: "MUG",
    category: "DRINKWARE",
    label: "Taza",
    preferredIds: ["19"],
    match: /White Glossy Mug/i,
    exclude: /Enamel|Travel|Color Inside|Two-Tone/i,
    alt: { dark: { preferredIds: ["300"], match: /Black Glossy Mug/i, exclude: /Enamel|Travel/i } },
    placement: "default",
    renderMode: "mug",
    technique: "SUBLIMATION",
    sizes: ["11 oz", "15 oz"],
    price: 17.95,
    sizePremium: { "15 oz": 3 },
    details: "Taza de cerámica con acabado brillante. El diseño va impreso por ambos lados para que se vea tanto si eres diestro como zurdo. Apta para lavavajillas y microondas.",
    care: "Apta para lavavajillas y microondas.",
  },
  tote: {
    key: "tote",
    provider: "printful",
    productType: "TOTE",
    category: "BAGS",
    label: "Bolsa tote",
    preferredIds: ["84"],
    match: /Eco Tote Bag|Organic Tote|Tote Bag/i,
    exclude: /All-Over|Large|Beach|Zip/i,
    placement: "front",
    renderMode: "print",
    technique: "DTG",
    colors: { dark: ["Black"], light: ["Natural", "Oyster", "White"] },
    maxColors: 2,
    price: 22.95,
    details: "Bolsa tote de algodón resistente con asas largas para llevar al hombro. Perfecta para la compra, la playa o el día a día. Impresión directa (DTG).",
    care: "Lavar a mano o en frío. No usar lejía. Secar al aire.",
  },
  sticker: {
    key: "sticker",
    provider: "printful",
    productType: "STICKER",
    category: "STATIONERY",
    label: "Pegatina",
    preferredIds: ["358"],
    match: /Kiss-Cut Stickers/i,
    exclude: /Sheet|Holographic/i,
    placement: "default",
    renderMode: "sticker",
    technique: "DIGITAL",
    sizes: ["3″×3″", "4″×4″", "5.5″×5.5″"],
    price: 4.95,
    sizePremium: { "4″×4″": 1, "5.5″×5.5″": 2 },
    details: "Pegatina de vinilo resistente con corte a la forma del diseño (kiss-cut) y borde blanco. Para el portátil, la botella, la nevera o la moto.",
    care: "Aplicar sobre superficies limpias y secas. Resistente al agua y a los arañazos del día a día.",
  },
  poster: {
    key: "poster",
    provider: "gelato",
    productType: "POSTER",
    category: "WALL_ART",
    label: "Póster",
    match: /^flat_(300x400|450x600|600x800)-mm/i,
    placement: "default",
    renderMode: "poster",
    technique: "DIGITAL",
    sizes: ["30×40 cm", "45×60 cm", "60×80 cm"],
    price: 24.95,
    sizePremium: { "45×60 cm": 10, "60×80 cm": 20 },
    details: "Póster impreso en papel mate de alta calidad con tintas de larga duración. Colores intensos y negros profundos. Se envía sin marco, enrollado y protegido.",
    care: "Evitar la luz solar directa y la humedad para conservar los colores.",
  },
  framed: {
    key: "framed",
    provider: "prodigi",
    productType: "FRAMED_PRINT",
    category: "WALL_ART",
    label: "Lámina enmarcada",
    match: /.*/,
    skus: [
      { sku: "GLOBAL-CFPM-12X16", label: "30×40 cm" },
      { sku: "GLOBAL-CFPM-18X24", label: "45×60 cm" },
    ],
    attrPrefs: { color: { dark: ["black", "Black"], light: ["white", "White", "natural", "Natural"], any: ["black", "white", "natural"] } },
    placement: "default",
    renderMode: "poster",
    technique: "GICLEE",
    price: 59.95,
    sizePremium: { "45×60 cm": 30 },
    details: "Lámina impresa en papel de calidad museo con tintas pigmentadas, enmarcada a mano con paspartú y protección acrílica. Lista para colgar.",
    care: "Limpiar el marco con un paño seco. Evitar la luz solar directa y la humedad.",
  },
  canvas: {
    key: "canvas",
    provider: "prodigi",
    productType: "CANVAS",
    category: "WALL_ART",
    label: "Lienzo",
    match: /.*/,
    skus: [
      { sku: "GLOBAL-CAN-12X16", label: "30×40 cm" },
      { sku: "GLOBAL-CAN-18X24", label: "45×60 cm" },
    ],
    attrPrefs: { wrap: { dark: ["Black"], light: ["White"], any: ["MirrorWrap", "ImageWrap", "Black", "White"] } },
    maxColors: 1,
    placement: "default",
    renderMode: "fill",
    technique: "GICLEE",
    price: 64.95,
    sizePremium: { "45×60 cm": 30 },
    details: "Lienzo de algodón con acabado mate, tensado sobre bastidor de madera. Colores intensos y duraderos, listo para colgar.",
    care: "Quitar el polvo con un paño suave y seco. Evitar la humedad y el sol directo.",
  },
  towel: {
    key: "towel",
    provider: "printify",
    productType: "BEACH_TOWEL",
    category: "HOME_LIVING",
    label: "Toalla de playa",
    match: /Beach Towel|Towel/i,
    exclude: /Kids|Round|Hooded|Hand|Tea|Kitchen|Golf|Sport|Face|Bath Mat/i,
    placement: "front",
    renderMode: "fill",
    technique: "SUBLIMATION",
    price: 34.95,
    details: "Toalla de playa con cara de microfibra suave y estampado por sublimación, y reverso de algodón absorbente. Para la playa, la piscina o el chiringuito.",
    care: "Lavar en frío con colores similares. No usar lejía. Secar a baja temperatura.",
  },
  apron: {
    key: "apron",
    provider: "printify",
    productType: "APRON",
    category: "HOME_LIVING",
    label: "Delantal",
    match: /Apron/i,
    exclude: /Kids|Child/i,
    placement: "front",
    renderMode: "fill",
    technique: "SUBLIMATION",
    price: 29.95,
    details: "Delantal de cocina con tiras ajustables y estampado a todo color. Para la paella del domingo, la barbacoa o la barra del bar.",
    care: "Lavar en frío. No usar lejía. Secar al aire.",
  },
  pillow: {
    key: "pillow",
    provider: "printify",
    productType: "PILLOW",
    category: "HOME_LIVING",
    label: "Cojín",
    match: /Square Pillow|Pillow|Cushion/i,
    exclude: /Case|Cover|Outdoor|Lumbar|Pet|Floor|Body/i,
    placement: "front",
    renderMode: "fill",
    technique: "SUBLIMATION",
    maxVariants: 3,
    price: 32.95,
    details: "Cojín cuadrado de poliéster suave con relleno incluido y cremallera oculta. Estampado por ambas caras.",
    care: "Funda lavable en frío. Relleno: limpiar en seco.",
  },
  bandana: {
    key: "bandana",
    provider: "printify",
    productType: "PET_BANDANA",
    category: "PETS",
    label: "Bandana para mascota",
    match: /Bandana/i,
    exclude: /Collar/i,
    placement: "front",
    renderMode: "fill",
    technique: "SUBLIMATION",
    price: 19.95,
    details: "Bandana ligera para perros y gatos, con cierre ajustable. Para que tu mascota también vaya con los colores de casa.",
    care: "Lavar a mano en frío. Secar al aire.",
  },
  phonecase: {
    key: "phonecase",
    provider: "printify",
    productType: "PHONE_CASE",
    category: "TECH_ACCESSORIES",
    label: "Funda de móvil",
    match: /Tough (Phone )?Cases?|Phone Case|Snap Case|Slim Case/i,
    exclude: /Magnetic|Wallet|Clear|Flip|Airpods|Watch/i,
    variantFilter: /iPhone 1[5-7]|Galaxy S2[4-6]/i,
    maxVariants: 16,
    placement: "front",
    renderMode: "fill",
    technique: "DIGITAL",
    price: 24.95,
    details: "Funda resistente de doble capa (policarbonato + TPU) con acabado brillante. Protege de golpes y caídas, con acceso a botones y carga inalámbrica compatible.",
    care: "Limpiar con un paño húmedo.",
  },
  puzzle: {
    key: "puzzle",
    provider: "printify",
    productType: "PUZZLE",
    category: "HOME_LIVING",
    label: "Puzle",
    match: /Puzzle/i,
    exclude: /Kids|Tin|Magnetic|Wooden/i,
    placement: "front",
    renderMode: "poster",
    technique: "DIGITAL",
    maxVariants: 3,
    price: 34.95,
    details: "Puzle de cartón rígido con acabado brillante, presentado en caja. Un plan para la sobremesa o un regalo con mucho de casa.",
    care: "Guardar en lugar seco.",
  },
  doormat: {
    key: "doormat",
    provider: "printify",
    productType: "DOORMAT",
    category: "HOME_LIVING",
    label: "Felpudo",
    match: /Doormat|Door Mat/i,
    exclude: /Outdoor Rug/i,
    placement: "front",
    renderMode: "fill",
    technique: "SUBLIMATION",
    maxVariants: 2,
    price: 34.95,
    details: "Felpudo de interior con base antideslizante y superficie estampada a todo color. Bienvenida con estilo.",
    care: "Sacudir o aspirar. Limpiar manchas con agua fría.",
  },
};

/** Map a Gelato poster productUid to a display size. */
export function posterSize(uid: string) {
  if (uid.includes("300x400")) return "30×40 cm";
  if (uid.includes("450x600")) return "45×60 cm";
  if (uid.includes("600x800")) return "60×80 cm";
  return null;
}

/** Normalise Printful size names to our display list ("XXL" → "2XL", 11oz → "11 oz"). */
export function normSize(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  if (/^XXL$/i.test(t)) return "2XL";
  if (/^XXXL$/i.test(t)) return "3XL";
  const oz = t.match(/^(\d+)\s*oz$/i);
  if (oz) return `${oz[1]} oz`;
  const inch = t.replace(/["”]/g, "″").replace(/\s*[x×]\s*/i, "×");
  if (/^\d+(\.\d+)?″×\d+(\.\d+)?″$/.test(inch)) return inch;
  return t;
}

/** Round to a .95 retail price. */
export const retail = (n: number) => Math.max(0.95, Math.ceil(n) - 0.05);

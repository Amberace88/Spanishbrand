/**
 * Campaign photo slots for the editorial theme and category tiles.
 *
 * Drop a photo into /public/campaign/<key>.webp and rebuild: next.config.ts lists the files present at
 * build time (CAMPAIGN_PHOTOS), so a missing photo never costs a 404 and tiles fall back to the best
 * product imagery. Recommended: 1600×2000 (4:5) or 2000×2000, subject centred-left (the type sits
 * bottom-left, product cards fan on the right), ≤ 350 KB WebP.
 *
 * Theme keys: fiestas, playa, tapas, heritage, futbol, leon, sabiduria, mediterraneo, profesiones, arte
 * Audience keys: mujer, hombre, ninos
 * Category keys: camisetas, sudaderas, gorras, tazas, bolsas, laminas, hogar
 * (add new keys to CAMPAIGN_KEYS in next.config.ts).
 */
const PRESENT = new Set((process.env.CAMPAIGN_PHOTOS ?? "").split(",").filter(Boolean));

/** URL of the campaign photo for a slot, or null when no file was shipped with this build. */
export function campaignPhoto(key: string): string | null {
  return PRESENT.has(key) ? `/campaign/${key}.webp` : null;
}

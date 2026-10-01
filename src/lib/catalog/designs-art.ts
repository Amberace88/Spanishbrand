import manifest from "./art-manifest.json";

export type ArtName = keyof typeof manifest;
export const ART_NAMES = Object.keys(manifest) as ArtName[];
export const artAspect = (name: string) => (manifest as Record<string, number>)[name] ?? 1;
export const artPath = (name: ArtName) => `art/${name}.png`;
export const artUrl = (name: string, base = "") => `${base}/catalog/art/${name}.png`;

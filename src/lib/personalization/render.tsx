import "server-only";
import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { Artwork, PRINT_FONTS } from "./artwork";
import { PRINT_CANVAS, type FontKey, type Personalization } from "./types";

let fontsCache: { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }[] | null = null;

async function loadFonts() {
  if (fontsCache) return fontsCache;
  const load = async (file: string) => {
    const buf = await readFile(new URL(`./fonts/${file}`, import.meta.url));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  };
  const [cinzel, brico, inter, pacifico, anton] = await Promise.all([
    load("Cinzel_700Bold.ttf"),
    load("BricolageGrotesque_800ExtraBold.ttf"),
    load("Inter_800ExtraBold.ttf"),
    load("Pacifico_400Regular.ttf"),
    load("Anton_400Regular.ttf"),
  ]);
  fontsCache = [
    { name: PRINT_FONTS.serif, data: cinzel, weight: 700, style: "normal" },
    { name: PRINT_FONTS.display, data: brico, weight: 800, style: "normal" },
    { name: PRINT_FONTS.sans, data: inter, weight: 800, style: "normal" },
    { name: PRINT_FONTS.script, data: pacifico, weight: 400, style: "normal" },
    { name: PRINT_FONTS.sport, data: anton, weight: 400, style: "normal" },
  ];
  return fontsCache;
}

/** Fetch uploaded artwork and inline it (Satori needs embedded or reachable images). */
async function inlineImages(value: Personalization): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (value.mode !== "designer") return map;
  for (const l of value.layers) {
    if (l.type !== "image" || map.has(l.path)) continue;
    const res = await fetch(l.url);
    if (!res.ok) throw new Error(`PERSONALIZATION_ASSET_MISSING: ${l.path}`);
    const type = res.headers.get("content-type") ?? "image/png";
    if (!/^image\/(png|jpeg|webp)$/.test(type)) throw new Error(`PERSONALIZATION_ASSET_TYPE: ${type}`);
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    map.set(l.path, `data:${type};base64,${b64}`);
  }
  return map;
}

/** Render a transparent PNG print file for one placement. */
export async function renderPrintFile(value: Personalization, opts: { ink?: string; font?: FontKey } = {}): Promise<Buffer> {
  const [fonts, images] = await Promise.all([loadFonts(), inlineImages(value)]);
  const { width, height } = PRINT_CANVAS;
  const res = new ImageResponse(<Artwork value={value} width={width} height={height} fonts={PRINT_FONTS} ink={opts.ink} font={opts.font} imageSrc={(path, url) => images.get(path) ?? url} />, {
    width,
    height,
    fonts,
  });
  return Buffer.from(await res.arrayBuffer());
}

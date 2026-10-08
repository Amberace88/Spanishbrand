import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assetBase } from "@/lib/catalog/assets";
import { ImageResponse } from "next/og";
import { assertFitsRuntime } from "@/lib/image/limits";
import { Artwork, PRINT_FONTS } from "./artwork";
import { PRINT_CANVAS, type FontKey, type Personalization } from "./types";

let fontsCache: { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }[] | null = null;

export async function loadFonts() {
  if (fontsCache) return fontsCache;
  // Serverless bundles do not always ship emitted assets: try the traced source folder, the
  // public copy on disk, then fetch the public copy from the site itself.
  const load = async (file: string) => {
    const candidates = [path.join(process.cwd(), "src/lib/personalization/fonts", file), path.join(process.cwd(), "public/fonts/print", file)];
    for (const c of candidates) {
      try {
        const buf = await readFile(c);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      } catch {
        /* next */
      }
    }
    const res = await fetch(`${assetBase()}/fonts/print/${file}`, { cache: "force-cache" });
    if (!res.ok) throw new Error(`FONT_MISSING: ${file} (${res.status})`);
    return await res.arrayBuffer();
  };
  const [cinzel, brico, inter, pacifico, anton, graduate, spaceMono, playfair] = await Promise.all([
    load("Cinzel_700Bold.ttf"),
    load("BricolageGrotesque_800ExtraBold.ttf"),
    load("Inter_800ExtraBold.ttf"),
    load("Pacifico_400Regular.ttf"),
    load("Anton_400Regular.ttf"),
    load("Graduate_400Regular.ttf"),
    load("SpaceMono_700Bold.ttf"),
    load("PlayfairDisplay_700Bold_Italic.ttf"),
  ]);
  fontsCache = [
    { name: PRINT_FONTS.serif, data: cinzel, weight: 700, style: "normal" },
    { name: PRINT_FONTS.display, data: brico, weight: 800, style: "normal" },
    { name: PRINT_FONTS.sans, data: inter, weight: 800, style: "normal" },
    { name: PRINT_FONTS.script, data: pacifico, weight: 400, style: "normal" },
    { name: PRINT_FONTS.sport, data: anton, weight: 400, style: "normal" },
    // designer-only faces (customer text)
    { name: PRINT_FONTS.varsity, data: graduate, weight: 400, style: "normal" },
    { name: PRINT_FONTS.mono, data: spaceMono, weight: 700, style: "normal" },
    { name: PRINT_FONTS.elegant, data: playfair, weight: 700, style: "normal" },
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
export async function renderPrintFile(value: Personalization, opts: { ink?: string; font?: FontKey; width?: number; height?: number } = {}): Promise<Buffer> {
  assertFitsRuntime(opts.width ?? PRINT_CANVAS.width, opts.height ?? PRINT_CANVAS.height, "print render"); // Workers memory; no-op on Node
  const [fonts, images] = await Promise.all([loadFonts(), inlineImages(value)]);
  // Provider print-file size when known (same 3:4 layout, exact pixels), else the default canvas.
  const width = opts.width ?? PRINT_CANVAS.width;
  const height = opts.height ?? PRINT_CANVAS.height;
  const res = new ImageResponse(<Artwork value={value} width={width} height={height} fonts={PRINT_FONTS} ink={opts.ink} font={opts.font} imageSrc={(path, url) => images.get(path) ?? url} />, {
    width,
    height,
    fonts,
  });
  return Buffer.from(await res.arrayBuffer());
}

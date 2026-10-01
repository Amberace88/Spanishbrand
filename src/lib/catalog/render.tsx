import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { Artwork, PRINT_FONTS, fitFontSize } from "@/lib/personalization/artwork";
import { loadFonts } from "@/lib/personalization/render";
import type { Layer } from "@/lib/personalization/types";
import type { Design } from "./designs";

import { assetBase } from "./assets";
export { assetBase };

const artCache = new Map<string, string>();
async function artDataUri(file: string): Promise<string> {
  const hit = artCache.get(file);
  if (hit) return hit;
  let buf: Buffer | null = null;
  try {
    buf = await readFile(path.join(process.cwd(), "public", "catalog", "art", file));
  } catch {
    // imported illustrations live in storage; static ones fall back to the deploy's public files
    const supa = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    const urls = [supa && `${supa}/storage/v1/object/public/print-files/site-art/${file}`, `${assetBase()}/catalog/art/${file}`].filter(Boolean) as string[];
    for (const u of urls) {
      const res = await fetch(u, { cache: "force-cache" }).catch(() => null);
      if (res?.ok) {
        buf = Buffer.from(await res.arrayBuffer());
        break;
      }
    }
    if (!buf) throw new Error(`ART_MISSING: ${file}`);
  }
  const uri = `data:image/png;base64,${buf.toString("base64")}`;
  artCache.set(file, uri);
  return uri;
}

async function inlineArt(layers: Layer[]) {
  const map = new Map<string, string>();
  for (const l of layers) if (l.type === "image" && l.path.startsWith("art/") && !map.has(l.path)) map.set(l.path, await artDataUri(l.path.slice(4)));
  return map;
}

/** Normalised bounding box of a design's content (0..1 of the 3:4 canvas). */
export function contentBox(layers: Layer[], pad = 0.03) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const l of layers) {
    const hw = l.w / 2;
    const hh = l.type === "image" ? (l.w * l.aspect * 0.75) / 2 : ((fitFontSize(l.text, l.font, l.w * 2400) * 1.15) / 3200) / 2;
    x0 = Math.min(x0, l.x - hw);
    x1 = Math.max(x1, l.x + hw);
    y0 = Math.min(y0, l.y - hh);
    y1 = Math.max(y1, l.y + hh);
  }
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(1, x1 + pad);
  y1 = Math.min(1, y1 + pad);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

export type RenderMode = "print" | "mug" | "poster" | "sticker" | "fill" | "emb";

/**
 * Render a library design to PNG at an exact provider print-file size.
 *  print   → the full 3:4 layout, top-aligned (garments, totes)
 *  mug     → content cropped, repeated on both sides of the wrap
 *  poster  → full-bleed background, content centred, small brand footer
 *  sticker → content cropped and centred on transparent
 */
export async function renderDesign(design: Pick<Design, "layers" | "posterBg" | "tone">, opts: { width: number; height: number; mode: RenderMode }) {
  const { width: W, height: H, mode } = opts;
  const [fonts, art] = await Promise.all([loadFonts(), inlineArt(design.layers)]);
  const src = (p: string, url: string) => art.get(p) ?? url;
  const cb = contentBox(design.layers);

  // Place the (cropped) design into a target rectangle, preserving aspect.
  const placed = (box: { left: number; top: number; width: number; height: number }, crop: boolean, key: string) => {
    const cw = crop ? cb.w : 1;
    const ch = crop ? cb.h * (4 / 3) : 4 / 3; // in canvas-width units
    const scale = Math.min(box.width / cw, box.height / ch); // px per canvas-width unit
    const dw = scale, dh = scale * (4 / 3); // full design canvas size in px
    const vw = cw * scale, vh = ch * scale; // visible window
    const left = box.left + (box.width - vw) / 2;
    const top = crop ? box.top + (box.height - vh) / 2 : box.top;
    return (
      <div key={key} style={{ position: "absolute", left, top, width: vw, height: vh, display: "flex", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: crop ? -cb.x0 * dw : 0, top: crop ? -cb.y0 * dh : 0, display: "flex" }}>
          <Artwork value={{ mode: "designer", placement: "front", layers: design.layers }} width={dw} height={dh} fonts={PRINT_FONTS} imageSrc={src} />
        </div>
      </div>
    );
  };

  let body: React.ReactNode;
  if (mode === "print") {
    body = placed({ left: 0, top: 0, width: W, height: H }, false, "p");
  } else if (mode === "mug") {
    const side = { width: W * 0.42, height: H * 0.86 };
    body = (
      <>
        {placed({ left: W * 0.25 - side.width / 2, top: (H - side.height) / 2, ...side }, true, "a")}
        {placed({ left: W * 0.75 - side.width / 2, top: (H - side.height) / 2, ...side }, true, "b")}
      </>
    );
  } else if (mode === "emb") {
    // embroidery / clear products: content only, cropped and centred on transparent (thread colours come from the layers)
    body = placed({ left: W * 0.02, top: H * 0.02, width: W * 0.96, height: H * 0.96 }, true, "e");
  } else if (mode === "sticker") {
    // Light-ink designs get a dark rounded backdrop so they read on white vinyl.
    body =
      design.tone === "dark" ? (
        <>
          <div style={{ position: "absolute", left: W * 0.03, top: H * 0.03, width: W * 0.94, height: H * 0.94, background: "#111111", borderRadius: Math.min(W, H) * 0.12, display: "flex" }} />
          {placed({ left: W * 0.1, top: H * 0.1, width: W * 0.8, height: H * 0.8 }, true, "s")}
        </>
      ) : (
        placed({ left: W * 0.04, top: H * 0.04, width: W * 0.92, height: H * 0.92 }, true, "s")
      );
  } else if (mode === "fill") {
    // full-bleed background, content centred (towels, pillows, cases, canvas…) — no footer
    const bg = design.posterBg ?? (design.tone === "dark" ? "#0d0d0d" : "#f3ead7");
    const portrait = H >= W;
    const square = Math.abs(W / H - 1) < 0.12; // pillows, bandanas: the design can use most of the face
    body = (
      <>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, background: bg, display: "flex" }} />
        {placed(square ? { left: W * 0.1, top: H * 0.1, width: W * 0.8, height: H * 0.8 } : portrait ? { left: W * 0.12, top: H * 0.16, width: W * 0.76, height: H * 0.62 } : { left: W * 0.2, top: H * 0.12, width: W * 0.6, height: H * 0.76 }, true, "f")}
      </>
    );
  } else {
    const bg = design.posterBg ?? (design.tone === "dark" ? "#0d0d0d" : "#f3ead7");
    const footer = design.tone === "dark" ? "rgba(243,234,215,0.55)" : "rgba(17,17,17,0.55)";
    const fs = Math.round(Math.min(W, H) * 0.018);
    body = (
      <>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, background: bg, display: "flex" }} />
        {placed({ left: W * 0.1, top: H * 0.1, width: W * 0.8, height: H * 0.72 }, true, "c")}
        <div style={{ position: "absolute", left: 0, bottom: H * 0.05, width: W, display: "flex", justifyContent: "center" }}>
          <span style={{ fontFamily: PRINT_FONTS.sans, fontSize: fs, letterSpacing: fs * 0.35, color: footer }}>ROJO Y GUALDA · ESPAÑA</span>
        </div>
      </>
    );
  }

  const res = new ImageResponse(<div style={{ position: "relative", display: "flex", width: W, height: H }}>{body}</div>, { width: W, height: H, fonts });
  return Buffer.from(await res.arrayBuffer());
}

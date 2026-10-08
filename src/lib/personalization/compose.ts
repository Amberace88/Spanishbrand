import "server-only";
import { assertFitsRuntime, imageOps } from "@/lib/image";
import { renderPrintFile } from "./render";
import { KINDS, aspectOf, type PrintLayout } from "./kinds";
import type { Layer, PersoConfig, Personalization, Placement } from "./types";

export interface PrintCanvas {
  width: number;
  height: number;
}
export interface ComposedFile {
  placement: Placement;
  png: Buffer;
}

const rgba = (hex: string | null | undefined) => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return { r: 0, g: 0, b: 0, alpha: 0 };
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
};

/** Largest box of ratio `aspect` (h/w) that fits in `w` × `h`. */
export function containBox(aspect: number, w: number, h: number) {
  return h / w >= aspect ? { width: Math.round(w), height: Math.round(w * aspect) } : { width: Math.round(h / aspect), height: Math.round(h) };
}

/**
 * Where the customer's design area lands on the provider print file, per layout. Pure (unit-tested):
 * the same rectangles the storefront silhouettes show.
 */
export function placementBoxes(layout: PrintLayout, aspect: number, canvas: PrintCanvas): { left: number; top: number; width: number; height: number }[] {
  const { width: W, height: H } = canvas;
  if (layout === "wrap") {
    // mugs / tumblers: the face the customer designed, on both sides of the handle
    const side = containBox(aspect, W * 0.42, H * 0.86);
    return [0.25, 0.75].map((cx) => ({ ...side, left: Math.round(W * cx - side.width / 2), top: Math.round((H - side.height) / 2) }));
  }
  if (layout === "sticker") {
    const b = containBox(aspect, W * 0.92, H * 0.92);
    return [{ ...b, left: Math.round((W - b.width) / 2), top: Math.round((H - b.height) / 2) }];
  }
  const b = containBox(aspect, W, H);
  // garments print from the top of the area (chest, under the collar); everything else is centred
  return [{ ...b, left: Math.round((W - b.width) / 2), top: layout === "garment" ? 0 : Math.round((H - b.height) / 2) }];
}

/**
 * Turn a validated personalization into the provider print files (one per printed side), at the exact
 * provider print-file size when known. Fill / wrap products extend the customer's background colour to
 * the whole print area so no white edges appear when the provider's ratio differs slightly.
 */
export async function composePrintFiles(value: Personalization, config: PersoConfig | null, canvas?: PrintCanvas | null): Promise<ComposedFile[]> {
  if (value.mode === "fields") {
    // brand templates: 3:4 layout, as large as fits the print area, top-aligned
    const fields = config && config.mode === "fields" ? config : null;
    const placement: Placement = fields?.placement ?? "front";
    const fit = canvas && canvas.width > 0 && canvas.height > 0 ? containBox(4 / 3, canvas.width, canvas.height) : undefined;
    let png = await renderPrintFile(value, { ...(fields ? { ink: fields.ink, font: fields.font } : {}), ...(fit ?? {}) });
    if (canvas && fit && (fit.width !== canvas.width || fit.height !== canvas.height)) {
      const left = Math.floor((canvas.width - fit.width) / 2);
      png = await (await imageOps()).extendPng(png, { top: 0, bottom: canvas.height - fit.height, left, right: canvas.width - fit.width - left });
    }
    return [{ placement, png }];
  }

  const designer = config && config.mode === "designer" ? config : null;
  const spec = designer?.kind ? KINDS[designer.kind] : undefined;
  const layout: PrintLayout = spec?.layout ?? "garment";
  const aspect = aspectOf(designer);
  const C: PrintCanvas = canvas && canvas.width > 0 && canvas.height > 0 ? canvas : { width: 2400, height: Math.round(2400 * aspect) };
  const sides: { placement: Placement; layers: Layer[] }[] = [{ placement: value.placement, layers: value.layers }];
  if (value.back?.length) sides.push({ placement: "back", layers: value.back });
  const background = layout === "fill" || layout === "wrap" ? (value.background ?? null) : null;

  // Cloudflare Workers (128 MB isolate): refuse print files too large to hold in memory before rendering them,
  // so the order is held for review (PERSONALIZATION_FAILED) instead of the isolate crashing. No-op on Node.
  assertFitsRuntime(C.width, C.height, "print file");
  const ops = await imageOps();
  const out: ComposedFile[] = [];
  for (const side of sides) {
    const boxes = placementBoxes(layout, aspect, C);
    const art = await renderPrintFile({ mode: "designer", placement: side.placement, layers: side.layers, ...(background ? { background } : {}) }, { width: boxes[0].width, height: boxes[0].height });
    const png =
      boxes.length === 1 && boxes[0].width === C.width && boxes[0].height === C.height
        ? art
        : await ops.canvasPng({ width: C.width, height: C.height, background: rgba(background) }, boxes.map((b) => ({ input: art, left: b.left, top: b.top })));
    out.push({ placement: side.placement, png });
  }
  return out;
}

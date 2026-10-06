import "server-only";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import type { ImageOps, OutputFormat, RawRGBA, WasmImageCodecs } from "./types";
import { ImageTooLargeError, WORKERS_MAX_PIXELS } from "./limits";
import { compositeOver, containPlan, coverPlan, crop, extend, fitInsideSize, headerSize, isSvg, jpegOrientation, orientationOps, solid, trimBox, withJpegOrientation1, type Px } from "./pixels";

/**
 * Cloudflare Workers implementation of ImageOps: WASM codecs (installed by cloudflare/image-codecs.ts) plus the
 * plain-JS pixel operations in ./pixels. Output matches the sharp pipelines in dimensions and pixels to within
 * codec rounding (tests/image-ops.test.ts compares both); encoded bytes differ (different encoder builds).
 *
 * Memory: a Worker isolate has 128 MB in total, and every decoded surface exists twice for a moment (WASM heap
 * + JS copy). Surfaces above WORKERS_MAX_PIXELS are therefore handed to the Cloudflare Images binding when the
 * whole operation maps onto it (resize + re-encode), and otherwise refused with ImageTooLargeError — a normal,
 * catchable error — instead of letting the isolate run out of memory (which would also kill every other
 * request on it).
 */

export { ImageTooLargeError, WORKERS_MAX_PIXELS };

const buf = (u: Uint8Array | Uint8ClampedArray) => Buffer.from(u.buffer, u.byteOffset, u.byteLength);
const tooBig = (w: number, h: number) => w * h > WORKERS_MAX_PIXELS;
const mime = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" } as const;

export function createWasmOps(codecs: WasmImageCodecs): ImageOps {
  function info(input: Uint8Array, what: string) {
    const h = headerSize(input);
    if (!h || !h.width || !h.height) throw new Error(`UNSUPPORTED_IMAGE: ${what}`);
    return h;
  }

  async function decode(input: Uint8Array, what: string, applyOrientation = false): Promise<Px> {
    const h = info(input, what);
    if (tooBig(h.width, h.height)) throw new ImageTooLargeError(what, h.width, h.height);
    const px = await codecs.decode(input, h.format, { applyOrientation });
    return { data: px.data, width: px.width, height: px.height };
  }

  async function resized(px: Px, width: number, height: number): Promise<Px> {
    if (px.width === width && px.height === height) return px;
    if (tooBig(width, height)) throw new ImageTooLargeError("resize", width, height);
    return codecs.resize(px, width, height);
  }

  async function encode(px: Px, out: OutputFormat): Promise<Uint8Array> {
    if (out.format === "webp") return codecs.encodeWebp(px, { quality: out.quality, ...(out.effort != null ? { method: Math.min(6, out.effort) } : {}) });
    if (out.format === "jpeg") return codecs.encodeJpeg(px, { quality: out.quality });
    return codecs.encodePng(px);
  }

  /** Off-isolate fallback for a whole resize + encode (Cloudflare Images). */
  async function viaImages(input: Uint8Array, width: number, height: number, fit: "scale-down" | "contain" | "cover" | "pad", out: OutputFormat, what: string, rotate = false) {
    if (!codecs.transform) throw new ImageTooLargeError(`${what} (no IMAGES binding)`, width, height);
    const format = mime[out.format];
    // Deterministic orientation: neutralise the EXIF tag and apply sharp's rotate() explicitly when asked for.
    const orient = rotate ? orientationOps(jpegOrientation(input)) : {};
    const data = await codecs.transform(withJpegOrientation1(input), { width, height, fit, format, ...orient, ...(out.format !== "png" ? { quality: out.quality } : {}), ...(fit === "pad" ? { background: "transparent" } : {}) });
    const h = headerSize(data);
    return { data: buf(data), width: h?.width ?? width, height: h?.height ?? height };
  }

  return {
    runtime: "wasm",
    maxPixels: WORKERS_MAX_PIXELS,

    async metadata(input) {
      const h = headerSize(input);
      if (!h) throw new Error("UNSUPPORTED_IMAGE");
      return { width: h.width, height: h.height };
    },

    async fitInside(input, opts, out) {
      const h = info(input, "fitInside");
      if (opts.limitInputPixels && h.width * h.height > opts.limitInputPixels) throw new Error("Input image exceeds pixel limit");
      // EXIF rotation swaps the axes; fit-inside a square box gives the same size either way
      const t = fitInsideSize(h.width, h.height, opts.maxSide, opts.maxSide, opts.withoutEnlargement);
      if (tooBig(h.width, h.height) || tooBig(t.width, t.height)) return viaImages(input, opts.maxSide, opts.maxSide, opts.withoutEnlargement ? "scale-down" : "contain", out, "fitInside", opts.rotate);
      const src = await decode(input, "fitInside", Boolean(opts.rotate && h.format === "jpeg"));
      const s = fitInsideSize(src.width, src.height, opts.maxSide, opts.maxSide, opts.withoutEnlargement);
      const px = await resized(src, s.width, s.height);
      return { data: buf(await encode(px, out)), width: px.width, height: px.height };
    },

    async toRawRGBA(input, opts = {}) {
      const h = info(input, "toRawRGBA");
      let source: Uint8Array = input;
      let max = opts.maxSide;
      if (tooBig(h.width, h.height)) {
        // decode a downscaled copy made off-isolate; keep the target inside the memory budget
        const cap = Math.floor(Math.sqrt(WORKERS_MAX_PIXELS));
        max = Math.min(max ?? cap, cap);
        source = (await viaImages(input, max, max, "scale-down", { format: "png" }, "toRawRGBA", opts.rotate)).data;
      }
      const src = await decode(source, "toRawRGBA", Boolean(opts.rotate && source === input && h.format === "jpeg"));
      const s = max ? fitInsideSize(src.width, src.height, max, max, true) : src;
      const px = await resized(src, s.width, s.height);
      return { data: buf(px.data), width: px.width, height: px.height };
    },

    async rawToPng(raw: RawRGBA) {
      if (tooBig(raw.width, raw.height)) throw new ImageTooLargeError("rawToPng", raw.width, raw.height);
      return buf(await codecs.encodePng(raw));
    },

    async trimFitPng(raw, maxSide) {
      const box = trimBox(raw, 1);
      const trimmed = box && (box.width !== raw.width || box.height !== raw.height) ? crop(raw, box.left, box.top, box.width, box.height) : raw;
      const s = fitInsideSize(trimmed.width, trimmed.height, maxSide, maxSide, false);
      const px = await resized(trimmed, s.width, s.height);
      return { data: buf(await codecs.encodePng(px)), width: px.width, height: px.height };
    },

    async resizePng(input, width, height, fit = "cover") {
      const h = info(input, "resizePng");
      if (tooBig(h.width, h.height) || tooBig(width, height)) return (await viaImages(input, width, height, fit === "contain" ? "pad" : "cover", { format: "png" }, "resizePng")).data;
      const src = await decode(input, "resizePng");
      if (fit === "contain") {
        const c = containPlan(src.width, src.height, width, height);
        return buf(await codecs.encodePng(extend(await resized(src, c.width, c.height), c.pad)));
      }
      const c = coverPlan(src.width, src.height, width, height);
      const big = await resized(src, c.rw, c.rh);
      return buf(await codecs.encodePng(c.left || c.top || c.rw !== width || c.rh !== height ? crop(big, c.left, c.top, width, height) : big));
    },

    async extendPng(input, pad) {
      const h = info(input, "extendPng");
      const W = h.width + pad.left + pad.right, H = h.height + pad.top + pad.bottom;
      if (tooBig(W, H)) throw new ImageTooLargeError("extendPng", W, H);
      return buf(await codecs.encodePng(extend(await decode(input, "extendPng"), pad)));
    },

    async canvasPng(canvas, layers) {
      if (tooBig(canvas.width, canvas.height)) throw new ImageTooLargeError("canvasPng", canvas.width, canvas.height);
      const bg = canvas.background;
      const out = solid(canvas.width, canvas.height, [bg.r, bg.g, bg.b, Math.round(bg.alpha * 255)]);
      for (const l of layers) compositeOver(out, await decode(l.input, "canvasPng layer"), l.left, l.top);
      return buf(await codecs.encodePng(out));
    },

    async svgCompositeWebp(svg, layers, quality) {
      if (!isSvg(svg)) throw new Error("svgCompositeWebp: not an SVG document");
      const head = new TextDecoder().decode(svg.subarray(0, 400));
      const W = Number(/<svg[^>]*\swidth="(\d+)"/.exec(head)?.[1]);
      const H = Number(/<svg[^>]*\sheight="(\d+)"/.exec(head)?.[1]);
      if (!W || !H) throw new Error("svgCompositeWebp: the SVG needs numeric width/height");
      if (tooBig(W, H)) throw new ImageTooLargeError("svgCompositeWebp", W, H);
      // resvg (bundled with next/og) rasterizes the SVG; Satori passes it through as an embedded image.
      const src = `data:image/svg+xml;base64,${svg.toString("base64")}`;
      const res = new ImageResponse(createElement("div", { style: { display: "flex", width: W, height: H } }, createElement("img", { src, width: W, height: H })), { width: W, height: H });
      const out = await decode(new Uint8Array(await res.arrayBuffer()), "svg raster");
      for (const l of layers) compositeOver(out, await decode(l.input, "svgComposite layer"), l.left, l.top);
      return buf(await codecs.encodeWebp(out, { quality }));
    },
  };
}

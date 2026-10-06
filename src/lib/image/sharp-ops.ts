import "server-only";
import sharp, { type Sharp } from "sharp";
import type { ImageOps, OutputFormat } from "./types";

/**
 * Node / Netlify implementation: exactly the sharp call chains the routes and libraries used before the
 * Cloudflare port (only moved here). Loaded lazily so the Workers bundle never executes sharp.
 */

function encode(img: Sharp, out: OutputFormat) {
  if (out.format === "webp") return img.webp({ quality: out.quality, ...(out.effort != null ? { effort: out.effort } : {}) });
  if (out.format === "jpeg") return img.jpeg({ quality: out.quality, ...(out.mozjpeg ? { mozjpeg: true } : {}) });
  return img.png(out.compressionLevel != null ? { compressionLevel: out.compressionLevel } : undefined);
}

export const sharpOps: ImageOps = {
  runtime: "sharp",
  maxPixels: Number.POSITIVE_INFINITY,

  async metadata(input) {
    const m = await sharp(input).metadata();
    return { width: m.width, height: m.height };
  },

  async fitInside(input, opts, out) {
    let img = sharp(input, opts.limitInputPixels ? { limitInputPixels: opts.limitInputPixels } : undefined);
    if (opts.rotate) img = img.rotate();
    img = img.resize({ width: opts.maxSide, height: opts.maxSide, fit: "inside", ...(opts.withoutEnlargement ? { withoutEnlargement: true } : {}) });
    const { data, info } = await encode(img, out).toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  },

  async toRawRGBA(input, opts = {}) {
    let img = sharp(input);
    if (opts.rotate) img = img.rotate();
    if (opts.maxSide) img = img.resize({ width: opts.maxSide, height: opts.maxSide, fit: "inside", withoutEnlargement: true });
    const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  },

  async rawToPng(raw, opts = {}) {
    return sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } })
      .png(opts.compressionLevel != null ? { compressionLevel: opts.compressionLevel } : undefined)
      .toBuffer();
  },

  async trimFitPng(raw, maxSide) {
    const png = await sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } })
      .trim({ threshold: 1 })
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: false, kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toBuffer({ resolveWithObject: true });
    return { data: png.data, width: png.info.width, height: png.info.height };
  },

  async resizePng(input, width, height, fit) {
    if (fit === "contain") return sharp(input).resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return sharp(input).resize(width, height).png().toBuffer();
  },

  async extendPng(input, pad) {
    return sharp(input).extend({ ...pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  },

  async canvasPng(canvas, layers) {
    return sharp({ create: { width: canvas.width, height: canvas.height, channels: 4, background: canvas.background } })
      .composite(layers)
      .png()
      .toBuffer();
  },

  async svgCompositeWebp(svg, layers, quality) {
    return sharp(svg).composite(layers).webp({ quality }).toBuffer();
  },
};

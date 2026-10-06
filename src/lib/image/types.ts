/**
 * Runtime-neutral image operations used by the server (uploads, catalog builder, print files).
 *
 * Two implementations:
 * - `sharp-ops.ts` (Node / Netlify): the original sharp pipelines, byte-for-byte unchanged.
 * - `wasm-ops.ts` (Cloudflare Workers): WASM codecs (jSquash: mozjpeg, libwebp, png, lanczos3 resize)
 *   installed by the custom worker entry (cloudflare/image-codecs.ts) + plain-JS pixel operations.
 *
 * Each method is one pipeline the app actually uses, named after what it does, so the Node path keeps the exact
 * sharp call chain it always had.
 */

export type Bytes = Buffer;

/** Straight (non-premultiplied) 8-bit RGBA pixels, row-major. */
export interface RawRGBA {
  data: Buffer;
  width: number;
  height: number;
}

export type OutputFormat =
  | { format: "webp"; quality: number; effort?: number }
  | { format: "jpeg"; quality: number; mozjpeg?: boolean }
  | { format: "png"; compressionLevel?: number };

export interface FitInsideOptions {
  /** Longest side (both width and height are capped at this). */
  maxSide: number;
  /** Apply EXIF orientation first (sharp `.rotate()`). */
  rotate?: boolean;
  /** Never upscale (sharp `withoutEnlargement`). */
  withoutEnlargement?: boolean;
  /** Reject inputs above this many pixels (sharp `limitInputPixels`). */
  limitInputPixels?: number;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export interface ImageOps {
  readonly runtime: "sharp" | "wasm";
  /**
   * Largest surface (width × height) this runtime can safely hold in memory for one operation. Infinity on Node;
   * on Workers (128 MB per isolate) it is bounded, and callers that would allocate more (print files) check it
   * first so they fail with a catchable error instead of the isolate being killed.
   */
  readonly maxPixels: number;
  /** Header dimensions (before EXIF rotation, like sharp's metadata()). Throws on undecodable input. */
  metadata(input: Bytes): Promise<{ width?: number; height?: number }>;
  /** [rotate] → resize fit:inside → encode. */
  fitInside(input: Bytes, opts: FitInsideOptions, out: OutputFormat): Promise<{ data: Bytes; width: number; height: number }>;
  /** [rotate] → [resize fit:inside, no enlargement] → raw RGBA (alpha added when missing). */
  toRawRGBA(input: Bytes, opts?: { rotate?: boolean; maxSide?: number }): Promise<RawRGBA>;
  /** Raw RGBA → PNG. */
  rawToPng(raw: RawRGBA, opts?: { compressionLevel?: number }): Promise<Bytes>;
  /** Raw RGBA → trim transparent/background border (threshold 1) → resize fit:inside maxSide (may enlarge, lanczos3) → PNG. */
  trimFitPng(raw: RawRGBA, maxSide: number): Promise<{ data: Bytes; width: number; height: number }>;
  /** Resize to exactly width × height (sharp default fit "cover", or "contain" on a transparent background) → PNG. */
  resizePng(input: Bytes, width: number, height: number, fit?: "cover" | "contain"): Promise<Bytes>;
  /** Pad with transparent pixels → PNG. */
  extendPng(input: Bytes, pad: { top: number; bottom: number; left: number; right: number }): Promise<Bytes>;
  /** New canvas (solid or transparent) with images composited over it → PNG. */
  canvasPng(canvas: { width: number; height: number; background: Rgba }, layers: { input: Bytes; left: number; top: number }[]): Promise<Bytes>;
  /** Rasterize an SVG document, composite images over it → WebP. */
  svgCompositeWebp(svg: Bytes, layers: { input: Bytes; left: number; top: number }[], quality: number): Promise<Bytes>;
}

/**
 * Codec primitives the Workers entry installs on globalThis (cloudflare/image-codecs.ts). Pixel buffers are
 * straight RGBA.
 */
export interface WasmImageCodecs {
  decode(bytes: Uint8Array, format: "png" | "jpeg" | "webp", opts?: { applyOrientation?: boolean }): Promise<{ data: Uint8Array | Uint8ClampedArray; width: number; height: number }>;
  encodePng(px: { data: Uint8Array | Uint8ClampedArray; width: number; height: number }): Promise<Uint8Array>;
  encodeJpeg(px: { data: Uint8Array | Uint8ClampedArray; width: number; height: number }, opts: { quality: number }): Promise<Uint8Array>;
  encodeWebp(px: { data: Uint8Array | Uint8ClampedArray; width: number; height: number }, opts: { quality: number; method?: number }): Promise<Uint8Array>;
  /**
   * Optional: Cloudflare Images binding (env.IMAGES), used only for inputs/outputs too large to hold in isolate
   * memory. Runs outside the isolate. Callers reset the JPEG EXIF orientation tag and pass explicit rotate/flip,
   * so the result does not depend on whether the service auto-orients.
   */
  transform?(bytes: Uint8Array, opts: { width: number; height: number; fit: "scale-down" | "contain" | "cover" | "pad"; format: "image/png" | "image/jpeg" | "image/webp"; quality?: number; background?: string; rotate?: 90 | 180 | 270; flip?: "h" | "v" }): Promise<Uint8Array>;
  /** Lanczos3, premultiplied alpha, sRGB (as sharp). */
  resize(px: { data: Uint8Array | Uint8ClampedArray; width: number; height: number }, width: number, height: number): Promise<{ data: Uint8Array | Uint8ClampedArray; width: number; height: number }>;
}

export const WASM_CODECS_KEY = "__RYG_IMAGE_CODECS__";

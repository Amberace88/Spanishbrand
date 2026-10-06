/**
 * WASM image codecs for Cloudflare Workers (sharp is a native addon and cannot run there).
 * jSquash builds of mozjpeg, libwebp, the Rust png crate and the squoosh lanczos3 resizer. Wrangler compiles the
 * imported .wasm files to WebAssembly.Module at deploy time (no runtime compilation, which Workers forbid).
 * Each codec is instantiated lazily on first use, so requests that never touch images pay nothing.
 *
 * The app reads these from globalThis (src/lib/image/index.ts) — see WasmImageCodecs in src/lib/image/types.ts.
 */
import decodeJpeg, { init as initJpegDec } from "@jsquash/jpeg/decode.js";
import encodeJpeg, { init as initJpegEnc } from "@jsquash/jpeg/encode.js";
import decodeWebp, { init as initWebpDec } from "@jsquash/webp/decode.js";
import encodeWebp, { init as initWebpEnc } from "@jsquash/webp/encode.js";
import { decode as decodePng, init as initPngDec } from "@jsquash/png/decode.js";
import encodePng, { init as initPngEnc } from "@jsquash/png/encode.js";
import resize, { initResize } from "@jsquash/resize";
// .wasm imports become precompiled WebAssembly.Module objects (wrangler CompiledWasm rule). The webp encoder is the
// SIMD build, which is what @jsquash/webp's init() selects on workerd (WASM SIMD is supported).
import JPEG_DEC_WASM from "../node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm";
import JPEG_ENC_WASM from "../node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm";
import WEBP_DEC_WASM from "../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm";
import WEBP_ENC_WASM from "../node_modules/@jsquash/webp/codec/enc/webp_enc_simd.wasm";
// @ts-ignore wasm-bindgen ships a .wasm.d.ts describing the instance exports, not the module default export
import PNG_WASM from "../node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm";
// @ts-ignore same as above
import RESIZE_WASM from "../node_modules/@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm";
import { WASM_CODECS_KEY, type WasmImageCodecs } from "../src/lib/image/types";

type Px = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };

const once = <T>(f: () => Promise<T>) => {
  let p: Promise<T> | null = null;
  return () => (p ??= f().catch((e) => ((p = null), Promise.reject(e))));
};

const ready = {
  jpegDec: once(async () => void (await initJpegDec(JPEG_DEC_WASM))),
  jpegEnc: once(async () => void (await initJpegEnc(JPEG_ENC_WASM))),
  webpDec: once(async () => void (await initWebpDec(WEBP_DEC_WASM))),
  webpEnc: once(async () => void (await initWebpEnc(WEBP_ENC_WASM))),
  png: once(async () => {
    // the png codec is one wasm-bindgen module shared by decode and encode
    await initPngDec(PNG_WASM);
    await initPngEnc(PNG_WASM);
  }),
  resize: once(async () => void (await initResize(RESIZE_WASM))),
};

// jSquash returns ImageData; workerd has no ImageData global.
function ensureImageData() {
  const g = globalThis as { ImageData?: unknown };
  if (!g.ImageData) {
    g.ImageData = class ImageData {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    };
  }
}

// jSquash's png encoder and resizer read `data.buffer` whole (ignoring byteOffset), so hand them an exact buffer:
// small Buffers are views into Node's shared pool.
const exact = (d: Uint8Array | Uint8ClampedArray) => (d.byteOffset === 0 && d.byteLength === d.buffer.byteLength ? new Uint8ClampedArray(d.buffer) : new Uint8ClampedArray(d));
const asImageData = (px: Px) => ({ data: exact(px.data), width: px.width, height: px.height, colorSpace: "srgb" }) as unknown as ImageData;
// exact bytes as an ArrayBuffer (a Buffer may be a view into a larger pooled ArrayBuffer; Buffer#slice is a view too)
const toArrayBuffer = (u: Uint8Array) => (u.byteOffset === 0 && u.byteLength === u.buffer.byteLength ? u.buffer : new Uint8Array(u).buffer) as ArrayBuffer;

export const codecs: WasmImageCodecs = {
  async decode(bytes, format, opts = {}) {
    ensureImageData();
    if (format === "jpeg") {
      await ready.jpegDec();
      // jSquash naming: preserveOrientation=true applies the EXIF orientation (verified against sharp.rotate()).
      return decodeJpeg(toArrayBuffer(bytes), { preserveOrientation: Boolean(opts.applyOrientation) });
    }
    if (format === "webp") {
      await ready.webpDec();
      return decodeWebp(toArrayBuffer(bytes));
    }
    await ready.png();
    return decodePng(toArrayBuffer(bytes));
  },
  async encodePng(px) {
    ensureImageData();
    await ready.png();
    return new Uint8Array(await encodePng(asImageData(px)));
  },
  async encodeJpeg(px, { quality }) {
    ensureImageData();
    await ready.jpegEnc();
    // mozjpeg defaults (progressive, optimised Huffman, trellis) ≈ sharp's jpeg({ mozjpeg: true })
    return new Uint8Array(await encodeJpeg(asImageData(px), { quality }));
  },
  async encodeWebp(px, { quality, method }) {
    ensureImageData();
    await ready.webpEnc();
    return new Uint8Array(await encodeWebp(asImageData(px), { quality, ...(method != null ? { method } : {}) }));
  },
  async resize(px, width, height) {
    ensureImageData();
    await ready.resize();
    // sharp resizes in sRGB with premultiplied alpha using lanczos3
    const out = await resize(asImageData(px), { width, height, method: "lanczos3", fitMethod: "stretch", premultiply: true, linearRGB: false });
    return { data: out.data, width: out.width, height: out.height };
  },
};

export function installImageCodecs() {
  (globalThis as Record<string, unknown>)[WASM_CODECS_KEY] = codecs;
}

/** Minimal shape of the Cloudflare Images binding (wrangler.jsonc "images"). */
interface ImagesBinding {
  input(stream: ReadableStream<Uint8Array>): {
    transform(t: Record<string, unknown>): { output(o: { format: string; quality?: number }): Promise<{ response(): Response }> };
  };
}

/**
 * Off-isolate fallback for images too large to decode inside the 128 MB isolate (phone photos, print-size PNGs):
 * the Images binding resizes + re-encodes outside the Worker. Billed as Cloudflare Images transformations
 * (5,000 unique / month free). Without the binding, those inputs are refused with ImageTooLargeError.
 */
export function bindImagesBinding(images: unknown) {
  if (!images || codecs.transform) return;
  const binding = images as ImagesBinding;
  codecs.transform = async (bytes, o) => {
    const stream = new Response(bytes as unknown as BodyInit).body as ReadableStream<Uint8Array>;
    const result = await binding
      .input(stream)
      .transform({ width: o.width, height: o.height, fit: o.fit, ...(o.background ? { background: o.background } : {}), ...(o.rotate ? { rotate: o.rotate } : {}), ...(o.flip ? { flip: o.flip } : {}) })
      .output({ format: o.format, ...(o.quality ? { quality: o.quality } : {}) });
    const res = result.response();
    if (!res.ok) throw new Error(`IMAGES_TRANSFORM_FAILED: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  };
}

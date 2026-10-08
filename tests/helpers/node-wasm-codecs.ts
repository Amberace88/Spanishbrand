/**
 * The same jSquash WASM codecs cloudflare/image-codecs.ts installs on Workers, loaded from disk so the Workers
 * image path (src/lib/image/wasm-ops.ts) can be exercised and compared against sharp under Node/vitest.
 * Options mirror cloudflare/image-codecs.ts exactly.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import decodeJpeg, { init as initJpegDec } from "@jsquash/jpeg/decode.js";
import encodeJpeg, { init as initJpegEnc } from "@jsquash/jpeg/encode.js";
import decodeWebp, { init as initWebpDec } from "@jsquash/webp/decode.js";
import encodeWebp, { init as initWebpEnc } from "@jsquash/webp/encode.js";
import { decode as decodePng, init as initPngDec } from "@jsquash/png/decode.js";
import encodePng, { init as initPngEnc } from "@jsquash/png/encode.js";
import resize, { initResize } from "@jsquash/resize";
import type { WasmImageCodecs } from "@/lib/image/types";

const root = path.resolve(__dirname, "../../node_modules/@jsquash");
const mod = (p: string) => new WebAssembly.Module(readFileSync(path.join(root, p)));

let ready: Promise<void> | null = null;
function init() {
  return (ready ??= (async () => {
    await initJpegDec(mod("jpeg/codec/dec/mozjpeg_dec.wasm"));
    await initJpegEnc(mod("jpeg/codec/enc/mozjpeg_enc.wasm"));
    await initWebpDec(mod("webp/codec/dec/webp_dec.wasm"));
    await initWebpEnc(mod("webp/codec/enc/webp_enc_simd.wasm"));
    await initPngDec(mod("png/codec/pkg/squoosh_png_bg.wasm"));
    await initPngEnc(mod("png/codec/pkg/squoosh_png_bg.wasm"));
    await initResize(mod("resize/lib/resize/pkg/squoosh_resize_bg.wasm"));
  })());
}

type Px = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };
const exact = (d: Uint8Array | Uint8ClampedArray) => (d.byteOffset === 0 && d.byteLength === d.buffer.byteLength ? new Uint8ClampedArray(d.buffer) : new Uint8ClampedArray(d));
const asImageData = (px: Px) => ({ data: exact(px.data), width: px.width, height: px.height }) as unknown as ImageData;
const ab = (u: Uint8Array) => new Uint8Array(u).buffer as ArrayBuffer; // copy (Buffer#slice is a view)

export const nodeWasmCodecs: WasmImageCodecs = {
  async decode(bytes, format, opts = {}) {
    await init();
    if (format === "jpeg") return decodeJpeg(ab(bytes), { preserveOrientation: Boolean(opts.applyOrientation) });
    if (format === "webp") return decodeWebp(ab(bytes));
    return decodePng(ab(bytes));
  },
  async encodePng(px) {
    await init();
    return new Uint8Array(await encodePng(asImageData(px)));
  },
  async encodeJpeg(px, { quality }) {
    await init();
    return new Uint8Array(await encodeJpeg(asImageData(px), { quality }));
  },
  async encodeWebp(px, { quality, method }) {
    await init();
    return new Uint8Array(await encodeWebp(asImageData(px), { quality, ...(method != null ? { method } : {}) }));
  },
  async resize(px, width, height) {
    await init();
    const out = await resize(asImageData(px), { width, height, method: "lanczos3", fitMethod: "stretch", premultiply: true, linearRGB: false });
    return { data: out.data, width: out.width, height: out.height };
  },
};

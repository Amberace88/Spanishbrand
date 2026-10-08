/**
 * The Cloudflare Workers image path (WASM codecs + plain JS, src/lib/image/wasm-ops.ts) against the original
 * sharp pipelines (src/lib/image/sharp-ops.ts, what Netlify runs). Encoded bytes differ between encoders, so
 * the outputs are compared on what matters: format, dimensions and decoded pixels (mean absolute difference).
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sharpOps } from "@/lib/image/sharp-ops";
import { createWasmOps, ImageTooLargeError, WORKERS_MAX_PIXELS } from "@/lib/image/wasm-ops";
import { headerSize, jpegOrientation, orientationOps, sniffFormat, trimBox, withJpegOrientation1 } from "@/lib/image/pixels";
import { nodeWasmCodecs } from "./helpers/node-wasm-codecs";

const wasm = createWasmOps(nodeWasmCodecs);

/** A busy test picture: gradients, hard edges, a translucent disc. */
async function picture(w: number, h: number, alpha = false) {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8102e"/><stop offset="1" stop-color="#f1bf00"/></linearGradient></defs>
    ${alpha ? "" : `<rect width="${w}" height="${h}" fill="url(#g)"/>`}
    <rect x="${w * 0.1}" y="${h * 0.15}" width="${w * 0.35}" height="${h * 0.3}" fill="#111"/>
    <circle cx="${w * 0.65}" cy="${h * 0.6}" r="${Math.min(w, h) * 0.25}" fill="#1b4" fill-opacity="0.6"/>
    <text x="${w * 0.08}" y="${h * 0.9}" font-size="${h * 0.12}" fill="#fff">RyG</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function rgba(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Mean absolute difference per channel (0–255) of two equally sized images. */
async function meanDiff(a: Buffer, b: Buffer) {
  const [x, y] = await Promise.all([rgba(a), rgba(b)]);
  expect([y.width, y.height]).toEqual([x.width, x.height]);
  let s = 0;
  for (let i = 0; i < x.data.length; i++) s += Math.abs(x.data[i] - y.data[i]);
  return s / x.data.length;
}

describe("pixels helpers", { timeout: 60_000 }, () => {
  it("reads header sizes like sharp.metadata()", async () => {
    const png = await picture(321, 123);
    for (const buf of [png, await sharp(png).jpeg().toBuffer(), await sharp(png).webp().toBuffer(), await sharp(png).webp({ lossless: true }).toBuffer(), await sharp(png).ensureAlpha().webp({ quality: 70 }).toBuffer()]) {
      const m = await sharp(buf).metadata();
      expect(headerSize(buf)).toMatchObject({ width: m.width, height: m.height, format: m.format === "jpeg" ? "jpeg" : m.format });
    }
    expect(sniffFormat(Buffer.from("hello world!"))).toBeNull();
  });

  it("reads the JPEG EXIF orientation", async () => {
    const jpg = await sharp(await picture(200, 100)).jpeg().toBuffer();
    expect(jpegOrientation(jpg)).toBe(1);
    for (const o of [3, 6, 8]) expect(jpegOrientation(await sharp(jpg).withMetadata({ orientation: o }).jpeg().toBuffer())).toBe(o);
  });

  it("neutralises the EXIF orientation for the Images binding and maps it to flip + rotate", async () => {
    const jpg = await sharp(await sharp(await picture(200, 100)).jpeg().toBuffer()).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const reset = withJpegOrientation1(jpg);
    expect(jpegOrientation(reset)).toBe(1);
    expect(reset.length).toBe(jpg.length);
    expect((await sharp(Buffer.from(reset)).metadata()).orientation ?? 1).toBe(1);
    expect(jpegOrientation(jpg)).toBe(6); // input untouched
    expect(orientationOps(1)).toEqual({});
    expect(orientationOps(6)).toEqual({ rotate: 90 });
    expect(orientationOps(8)).toEqual({ rotate: 270 });
    expect(orientationOps(5)).toEqual({ flip: "h", rotate: 270 });
  });

  it("finds the trim box of a transparent border", () => {
    const W = 20, H = 10;
    const data = new Uint8Array(W * H * 4);
    for (let y = 3; y < 7; y++) for (let x = 5; x < 15; x++) data.set([200, 10, 10, 255], (y * W + x) * 4);
    expect(trimBox({ data, width: W, height: H })).toEqual({ left: 5, top: 3, width: 10, height: 4 });
  });
});

describe("Workers image ops match sharp", { timeout: 60_000 }, () => {
  it("metadata", async () => {
    const png = await picture(640, 360);
    expect(await wasm.metadata(png)).toEqual(await sharpOps.metadata(png));
  });

  it("fitInside → webp q80 (catalog photos)", async () => {
    const src = await sharp(await picture(1800, 1200)).jpeg({ quality: 92 }).toBuffer();
    const opts = { maxSide: 1400, withoutEnlargement: true };
    const out = { format: "webp" as const, quality: 80, effort: 5 };
    const [a, b] = await Promise.all([sharpOps.fitInside(src, opts, out), wasm.fitInside(src, opts, out)]);
    expect(sniffFormat(b.data)).toBe("webp");
    expect([b.width, b.height]).toEqual([a.width, a.height]);
    expect(await meanDiff(a.data, b.data)).toBeLessThan(3);
  });

  it("fitInside → jpeg with EXIF rotation (returns photos)", async () => {
    const src = await sharp(await sharp(await picture(1600, 900)).jpeg().toBuffer()).withMetadata({ orientation: 6 }).jpeg({ quality: 95 }).toBuffer();
    const opts = { maxSide: 1000, rotate: true, withoutEnlargement: true, limitInputPixels: 60_000_000 };
    const out = { format: "jpeg" as const, quality: 82, mozjpeg: true };
    const [a, b] = await Promise.all([sharpOps.fitInside(src, opts, out), wasm.fitInside(src, opts, out)]);
    expect([a.width, a.height]).toEqual([563, 1000]);
    expect([b.width, b.height]).toEqual([a.width, a.height]);
    expect(await meanDiff(a.data, b.data)).toBeLessThan(4);
  });

  it("fitInside → png without enlargement (designer upload)", async () => {
    const src = await picture(800, 600, true);
    const opts = { maxSide: 4000, rotate: true, withoutEnlargement: true };
    const [a, b] = await Promise.all([sharpOps.fitInside(src, opts, { format: "png", compressionLevel: 9 }), wasm.fitInside(src, opts, { format: "png", compressionLevel: 9 })]);
    expect([b.width, b.height]).toEqual([800, 600]);
    expect(await meanDiff(a.data, b.data)).toBe(0);
  });

  it("toRawRGBA + rawToPng (background removal)", async () => {
    const src = await picture(1200, 900);
    const [a, b] = await Promise.all([sharpOps.toRawRGBA(src, { rotate: true, maxSide: 600 }), wasm.toRawRGBA(src, { rotate: true, maxSide: 600 })]);
    expect([b.width, b.height]).toEqual([a.width, a.height]);
    let s = 0;
    for (let i = 0; i < a.data.length; i++) s += Math.abs(a.data[i] - b.data[i]);
    expect(s / a.data.length).toBeLessThan(2);
    const png = await wasm.rawToPng(b, { compressionLevel: 9 });
    expect(await meanDiff(await sharpOps.rawToPng(b, { compressionLevel: 9 }), png)).toBe(0);
  });

  it("trimFitPng (site art)", async () => {
    const raw = await sharpOps.toRawRGBA(await picture(900, 700, true), { rotate: true });
    const [a, b] = await Promise.all([sharpOps.trimFitPng(raw, 1600), wasm.trimFitPng(raw, 1600)]);
    expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(4);
    expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(4);
  });

  it("resizePng cover and contain", async () => {
    const src = await picture(700, 500, true);
    for (const fit of ["cover", "contain"] as const) {
      const [a, b] = await Promise.all([sharpOps.resizePng(src, 400, 400, fit), wasm.resizePng(src, 400, 400, fit)]);
      expect(await meanDiff(a, b)).toBeLessThan(3);
    }
  });

  it("extendPng and canvasPng (print files)", async () => {
    const art = await picture(300, 400, true);
    const pad = { top: 0, bottom: 50, left: 30, right: 20 };
    expect(await meanDiff(await sharpOps.extendPng(art, pad), await wasm.extendPng(art, pad))).toBe(0);
    const layers = [{ input: art, left: 10, top: 20 }, { input: art, left: 330, top: 20 }];
    for (const background of [{ r: 0, g: 0, b: 0, alpha: 0 }, { r: 200, g: 16, b: 46, alpha: 1 }]) {
      const c = { width: 700, height: 450, background };
      expect(await meanDiff(await sharpOps.canvasPng(c, layers), await wasm.canvasPng(c, layers))).toBeLessThan(1);
    }
  });

  it("svgCompositeWebp (poster scenes)", async () => {
    const W = 800, H = 1000;
    const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe9df"/><stop offset="1" stop-color="#e2d9cb"/></linearGradient><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter></defs><rect width="${W}" height="${H}" fill="url(#w)"/><rect x="118" y="134" width="500" height="600" fill="#000" opacity="0.32" filter="url(#s)"/></svg>`);
    const art = await sharpOps.resizePng(await picture(600, 800), 410, 540);
    const layers = [{ input: art, left: 100, top: 100 }];
    const [a, b] = await Promise.all([sharpOps.svgCompositeWebp(svg, layers, 84), wasm.svgCompositeWebp(svg, layers, 84)]);
    expect(sniffFormat(b)).toBe("webp");
    expect(await meanDiff(a, b)).toBeLessThan(4);
  });

  it("encodes small pooled Buffer views correctly", async () => {
    // Buffer.from(<1 KB>) lives at an offset inside Node's shared pool; the codecs must not read the whole pool
    const W = 12, H = 10;
    const data = Buffer.from(Array.from({ length: W * H * 4 }, (_, i) => (i % 4 === 3 ? 255 : (i * 7) % 256)));
    expect(data.byteOffset > 0 || data.buffer.byteLength !== data.byteLength).toBe(true);
    const png = await wasm.rawToPng({ data, width: W, height: H });
    const back = await sharpOps.toRawRGBA(png);
    expect(Buffer.compare(back.data, data)).toBe(0);
    const small = await wasm.resizePng(png, 6, 5);
    expect(await wasm.metadata(small)).toEqual({ width: 6, height: 5 });
  });

  it("refuses surfaces that would not fit in Worker memory (without an IMAGES binding)", async () => {
    const side = Math.ceil(Math.sqrt(WORKERS_MAX_PIXELS)) + 10;
    await expect(wasm.canvasPng({ width: side, height: side, background: { r: 0, g: 0, b: 0, alpha: 0 } }, [])).rejects.toBeInstanceOf(ImageTooLargeError);
    expect(sharpOps.maxPixels).toBe(Number.POSITIVE_INFINITY);
  });
});

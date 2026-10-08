/**
 * Plain-JS image helpers for the Workers image path (no native code, no WASM). Pure and unit-tested
 * (tests/image-pixels.test.ts). Pixel buffers are straight (non-premultiplied) RGBA, row-major.
 */

export type Px = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };
export type Format = "png" | "jpeg" | "webp";

export function sniffFormat(b: Uint8Array): Format | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}

const isSvg = (b: Uint8Array) => /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(new TextDecoder().decode(b.subarray(0, 512)));

/** Width/height from the file header (stored orientation, as sharp's metadata()). null if unknown. */
export function headerSize(b: Uint8Array): { width: number; height: number; format: Format } | null {
  const f = sniffFormat(b);
  if (f === "png") {
    if (b.length < 24) return null;
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { width: v.getUint32(16), height: v.getUint32(20), format: f };
  }
  if (f === "jpeg") {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const m = b[i + 1];
      if (m === 0xff) {
        i++;
        continue;
      }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = (b[i + 2] << 8) | b[i + 3];
      // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC)
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8], format: f };
      }
      i += 2 + len;
    }
    return null;
  }
  if (f === "webp") {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8 " && b.length >= 30) return { width: ((b[27] << 8) | b[26]) & 0x3fff, height: ((b[29] << 8) | b[28]) & 0x3fff, format: f };
    if (chunk === "VP8L" && b.length >= 25) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, format: f };
    }
    if (chunk === "VP8X" && b.length >= 30) return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), format: f };
    return null;
  }
  return null;
}

/** EXIF orientation (1–8) of a JPEG; 1 when absent. */
export function jpegOrientation(b: Uint8Array): number {
  return exifOrientationAt(b)?.value ?? 1;
}

/** Copy of a JPEG with its EXIF orientation tag reset to 1 (pixels untouched). */
export function withJpegOrientation1(b: Uint8Array): Uint8Array {
  const at = exifOrientationAt(b);
  if (!at || at.value === 1) return b;
  const out = new Uint8Array(b); // a copy (Buffer#slice would be a view)
  out[at.offset] = at.le ? 1 : 0;
  out[at.offset + 1] = at.le ? 0 : 1;
  return out;
}

/**
 * The flip + rotation (flip first, then clockwise rotation, as Cloudflare Images applies them) that displays a
 * JPEG with this EXIF orientation upright — what sharp's rotate() does.
 */
export function orientationOps(o: number): { flip?: "h" | "v"; rotate?: 90 | 180 | 270 } {
  switch (o) {
    case 2: return { flip: "h" };
    case 3: return { rotate: 180 };
    case 4: return { flip: "v" };
    case 5: return { flip: "h", rotate: 270 };
    case 6: return { rotate: 90 };
    case 7: return { flip: "h", rotate: 90 };
    case 8: return { rotate: 270 };
    default: return {};
  }
}

function exifOrientationAt(b: Uint8Array): { value: number; offset: number; le: boolean } | null {
  if (sniffFormat(b) !== "jpeg") return null;
  let i = 2;
  while (i + 4 < b.length && b[i] === 0xff) {
    const m = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (m === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const t = i + 10; // TIFF header
      const le = b[t] === 0x49;
      const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
      const u32 = (o: number) => (le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0);
      const ifd = t + u32(t + 4);
      const n = u16(ifd);
      for (let k = 0; k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 10 > b.length) break;
        if (u16(e) === 0x0112) {
          const o = u16(e + 8);
          return { value: o >= 1 && o <= 8 ? o : 1, offset: e + 8, le };
        }
      }
      return null;
    }
    if (m === 0xda) break;
    i += 2 + len;
  }
  return null;
}

export { isSvg };

/** sharp resize fit "inside" target size (std::round), optionally without enlargement. */
export function fitInsideSize(w: number, h: number, maxW: number, maxH: number, withoutEnlargement = false) {
  const xf = w / maxW;
  const yf = h / maxH;
  let tw: number, th: number;
  if (xf > yf) {
    tw = maxW;
    th = Math.max(1, Math.round(h / xf));
  } else {
    th = maxH;
    tw = Math.max(1, Math.round(w / yf));
  }
  if (withoutEnlargement && (tw > w || th > h)) return { width: w, height: h };
  return { width: tw, height: th };
}

/** Copy of a rectangle (must lie inside the image). */
export function crop(px: Px, left: number, top: number, width: number, height: number): Px {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const s = ((top + y) * px.width + left) * 4;
    out.set(px.data.subarray(s, s + width * 4), y * width * 4);
  }
  return { data: out, width, height };
}

/** New canvas filled with one straight-RGBA colour. */
export function solid(width: number, height: number, rgba: [number, number, number, number]): Px {
  const data = new Uint8Array(width * height * 4);
  if (rgba[0] || rgba[1] || rgba[2] || rgba[3]) {
    const v = new Uint32Array(data.buffer);
    v.fill(new Uint32Array(new Uint8Array(rgba).buffer)[0]);
  }
  return { data, width, height };
}

/** Pad with a colour (sharp extend). */
export function extend(px: Px, pad: { top: number; bottom: number; left: number; right: number }, rgba: [number, number, number, number] = [0, 0, 0, 0]): Px {
  const W = px.width + pad.left + pad.right;
  const H = px.height + pad.top + pad.bottom;
  const out = solid(W, H, rgba);
  for (let y = 0; y < px.height; y++) {
    const s = y * px.width * 4;
    out.data.set(px.data.subarray(s, s + px.width * 4), ((y + pad.top) * W + pad.left) * 4);
  }
  return out;
}

/** Porter-Duff "over" (sharp composite default blend) of `src` onto `dst` at (left, top), in place. Clipped. */
export function compositeOver(dst: Px, src: Px, left: number, top: number): void {
  left = Math.round(left);
  top = Math.round(top);
  const x0 = Math.max(0, left), y0 = Math.max(0, top);
  const x1 = Math.min(dst.width, left + src.width), y1 = Math.min(dst.height, top + src.height);
  const d = dst.data, s = src.data;
  for (let y = y0; y < y1; y++) {
    let di = (y * dst.width + x0) * 4;
    let si = ((y - top) * src.width + (x0 - left)) * 4;
    for (let x = x0; x < x1; x++, di += 4, si += 4) {
      const sa = s[si + 3];
      if (sa === 0) continue;
      if (sa === 255) {
        d[di] = s[si];
        d[di + 1] = s[si + 1];
        d[di + 2] = s[si + 2];
        d[di + 3] = 255;
        continue;
      }
      const as = sa / 255, ad = d[di + 3] / 255;
      const ao = as + ad * (1 - as);
      for (let c = 0; c < 3; c++) d[di + c] = Math.round((s[si + c] * as + d[di + c] * ad * (1 - as)) / ao);
      d[di + 3] = Math.round(ao * 255);
    }
  }
}

/**
 * Bounding box sharp's trim({ threshold }) keeps, with the top-left pixel as background: colour differences
 * are measured on the image flattened over that colour, alpha differences on the alpha channel, and the two
 * boxes are united (as sharp does for images with alpha). libvips' 3×3 median pre-filter is approximated by
 * ignoring isolated foreground pixels. Returns null when nothing would remain.
 */
export function trimBox(px: Px, threshold = 1): { left: number; top: number; width: number; height: number } | null {
  const { data: d, width: W, height: H } = px;
  const br = d[0], bg = d[1], bb = d[2], ba = d[3];
  const fg = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const a = d[p + 3] / 255;
    const r = d[p] * a + br * (1 - a), g = d[p + 1] * a + bg * (1 - a), b = d[p + 2] * a + bb * (1 - a);
    if (Math.abs(d[p + 3] - ba) > threshold || Math.abs(r - br) > threshold || Math.abs(g - bg) > threshold || Math.abs(b - bb) > threshold) fg[i] = 1;
  }
  let left = W, top = H, right = -1, bottom = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!fg[i]) continue;
      // majority of the 3×3 neighbourhood (≈ median filter on a binary mask)
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < W && fg[yy * W + xx]) n++;
        }
      }
      if (n < 5) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** sharp "cover": scale to cover, centre crop. Returns the intermediate size and crop offset. */
export function coverPlan(w: number, h: number, W: number, H: number) {
  const k = Math.max(W / w, H / h);
  const rw = Math.max(W, Math.round(w * k)), rh = Math.max(H, Math.round(h * k));
  return { rw, rh, left: Math.floor((rw - W) / 2), top: Math.floor((rh - H) / 2) };
}

/** sharp "contain" (centre): resized size inside W×H and the padding around it. */
export function containPlan(w: number, h: number, W: number, H: number) {
  const s = fitInsideSize(w, h, W, H);
  const left = Math.floor((W - s.width) / 2), top = Math.floor((H - s.height) / 2);
  return { ...s, pad: { left, top, right: W - s.width - left, bottom: H - s.height - top } };
}

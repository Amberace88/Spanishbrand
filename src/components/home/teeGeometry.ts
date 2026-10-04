"use client";
import { useEffect, useState } from "react";

/** Print box on a garment photo, in % of the square the photo is shown in (object-cover). */
export interface PrintBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Locate the chest print area on a photo of a light garment (folded white tee on a darker ground):
 * segment the garment (bright, low-saturation pixels → largest connected blob), measure the body width
 * on the torso rows, find where the neckline/collar ends in the centre band (opening, rib or shadow =
 * pixels outside the blob or clearly darker than the fabric), then place a 3:4 box centred on the body,
 * just under the collar. Pure — operates on RGBA pixels of an N×N square (the photo cover-cropped).
 */
export function detectPrintBox(data: Uint8ClampedArray, N: number): PrintBox | null {
  const P = N * N;
  const lum = new Float32Array(P);
  const hist = new Uint32Array(256);
  for (let i = 0; i < P; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = l;
    hist[Math.min(255, l | 0)]++;
  }
  // brightness threshold: the garment is the bright cluster (≥ 150, near the 85th percentile)
  let acc = 0, p85 = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= P * 0.85) {
      p85 = v;
      break;
    }
  }
  const T = Math.max(150, Math.min(205, p85 - 32));
  const white = new Uint8Array(P);
  for (let i = 0; i < P; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    white[i] = lum[i] >= T && Math.max(r, g, b) - Math.min(r, g, b) < 46 ? 1 : 0;
  }
  // largest connected component (4-neighbour flood fill)
  const comp = new Int32Array(P).fill(-1);
  const queue = new Int32Array(P);
  let best = -1, bestArea = 0;
  for (let s = 0, id = 0; s < P; s++) {
    if (!white[s] || comp[s] !== -1) continue;
    let head = 0, tail = 0;
    queue[tail++] = s;
    comp[s] = id;
    while (head < tail) {
      const i = queue[head++];
      const x = i % N, y = (i / N) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1];
      for (const j of nb) if (j >= 0 && white[j] && comp[j] === -1) (comp[j] = id), (queue[tail++] = j);
    }
    if (tail > bestArea) [best, bestArea] = [id, tail];
    id++;
  }
  if (best < 0 || bestArea < P * 0.06 || bestArea > P * 0.8) return null;
  let x0 = N, x1 = 0, y0 = N, y1 = 0;
  for (let i = 0; i < P; i++) {
    if (comp[i] !== best) continue;
    const x = i % N, y = (i / N) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const h = y1 - y0 + 1;
  if (h < N * 0.2 || (x0 === 0 && x1 === N - 1 && y0 === 0 && y1 === N - 1)) return null;
  // torso: width and centre on the middle rows, fabric brightness
  const widths: number[] = [], centres: number[] = [], fabric: number[] = [];
  for (let y = Math.round(y0 + h * 0.4); y <= Math.round(y0 + h * 0.75); y++) {
    let l = -1, r = -1;
    for (let x = x0; x <= x1; x++) {
      if (comp[y * N + x] === best) {
        if (l < 0) l = x;
        r = x;
        fabric.push(lum[y * N + x]);
      }
    }
    if (l >= 0) widths.push(r - l + 1), centres.push((l + r) / 2);
  }
  if (!widths.length) return null;
  const med = (a: number[]) => [...a].sort((p, q) => p - q)[a.length >> 1];
  const bodyW = med(widths), cx = med(centres), bodyL = med(fabric);
  // collar: last row of the top half whose centre band is mostly opening / rib / shadow
  const band = Math.max(3, Math.round(bodyW * 0.12));
  let collar = -1, gap = 0;
  for (let y = y0; y < y0 + h * 0.5; y++) {
    let n = 0, off = 0;
    for (let x = Math.round(cx - band); x <= Math.round(cx + band); x++) {
      if (x < 0 || x >= N) continue;
      const i = y * N + x;
      n++;
      if (comp[i] !== best || lum[i] < bodyL - 26) off++;
    }
    if (n && off / n > 0.22) {
      collar = y;
      gap = 0;
    } else if (collar >= 0 && ++gap > Math.max(3, h * 0.04)) break;
  }
  const collarBottom = collar >= 0 ? Math.min(collar, y0 + h * 0.42) : y0 + h * 0.16;
  const top = collarBottom + Math.max(3, h * 0.045);
  let w = bodyW * 0.5;
  let bh = (w * 4) / 3;
  const room = (y1 - top) * 0.88;
  if (bh > room) (bh = room), (w = (bh * 3) / 4);
  const pct = (v: number) => +((v / N) * 100).toFixed(2);
  return { left: pct(cx - w / 2), top: pct(top), width: pct(w), height: pct(bh) };
}

/** Dashed frame drawn outside the print area (-inset-[3%] of the box). */
const FRAME = 0.03;

/**
 * Fits the chest print box above the tile's controls, on any tile ratio:
 * 1. raise the photo (within the cover crop) so the box ends above the controls,
 * 2. if the band is still too short, shrink the box around the chest centre, top kept just under the collar.
 * Pure: tile size and controls block height (from its top to the tile bottom), in px.
 * Returns the photo's vertical shift from the centred crop (px) and the box scale (0–1).
 */
export function fitPrintBox(W: number, H: number, controls: number, box: PrintBox) {
  const S = Math.max(W, H);
  const gap = Math.max(10, H * 0.03);
  const frame = (box.height / 100) * S * FRAME;
  const top = (box.top / 100) * S - frame;
  const fullH = (box.height / 100) * S + 2 * frame;
  const floor = H - controls - gap; // the dashed frame must end above this line
  const centre = (H - S) / 2;
  // raise the photo just enough (never past the crop), never lower it below the centred crop
  const dy = Math.max(H - S, Math.min(centre, floor - top - fullH));
  const scale = Math.max(0, Math.min(1, (floor - (dy + top)) / fullH));
  return { dy: dy - centre, scale };
}

const cache = new Map<string, PrintBox | null>();

/** Detect the print box of a garment photo once (same-origin optimised copy → readable canvas). */
export function usePrintBox(photo: string | null): PrintBox | null | undefined {
  const [box, setBox] = useState<PrintBox | null | undefined>(() => (photo && cache.has(photo) ? cache.get(photo) : undefined));
  useEffect(() => {
    if (!photo) return;
    if (cache.has(photo)) return setBox(cache.get(photo));
    let off = false;
    const N = 256;
    const img = new window.Image();
    img.decoding = "async";
    img.src = `/_next/image?url=${encodeURIComponent(photo)}&w=${N}&q=75`;
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = N;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no 2d");
        // same crop as object-cover in a square
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, N, N);
        const r = detectPrintBox(ctx.getImageData(0, 0, N, N).data, N);
        cache.set(photo, r);
        if (!off) setBox(r);
      } catch {
        cache.set(photo, null);
        if (!off) setBox(null);
      }
    };
    img.onerror = () => {
      cache.set(photo, null);
      if (!off) setBox(null);
    };
    return () => {
      off = true;
    };
  }, [photo]);
  return box;
}

/**
 * Drawing engine for the STATEMENT line (scripts/statement-art.mjs).
 *
 * A piece is a stack of single-colour "ops". Each op is SVG (shapes in the 2400 × 3200 print-canvas
 * coordinates = 12 × 16 in at 200 units/in) rasterised to a mask at print resolution, optionally
 * treated, then laid down as one flat ink:
 *   rough  — blur + noisy threshold: organic, dry-brush edges
 *   spray  — clustered-dot dither of a soft halo around a hard core: spray-can overspray
 *   erase  — knocks ink out of everything below (stencil bridges, worn letters)
 * After all ops, a screen-print wear pass knocks out ink, the alpha is made binary (DTG: no
 * semi-transparent haze anywhere), the result is trimmed and written as a palette PNG.
 *
 * Print-safety rules baked in: masks are thresholded (hard edges), fades are dithered dots
 * (≥ ~0.4 mm), strokes/drops are drawn ≥ 10 canvas units (≈ 1.3 mm).
 */
import { fileURLToPath } from "node:url";

process.env.FONTCONFIG_FILE = fileURLToPath(new URL("./fonts/fonts.conf", import.meta.url));
const { default: sharp } = await import("sharp");
sharp.concurrency(4);
export { sharp };

export const W = 2400, H = 3200;
export const f1 = (n) => +(+n).toFixed(1);
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ───────────────────────── random ───────────────────────── */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
/** Smooth 1-D value noise in [-1, 1]. */
export function noise1(seed) {
  const r = rng(seed);
  const v = Array.from({ length: 512 }, () => r() * 2 - 1);
  return (t) => {
    const i = Math.floor(t), f = t - i, a = v[((i % 512) + 512) % 512], b = v[(((i + 1) % 512) + 512) % 512];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

/* ───────────────────────── fonts & text ───────────────────────── */
export const FONTS = {
  anton: ["Anton", 400],
  shoulders: ["Big Shoulders Display Thin Black", 900],
  varsity: ["Graduate", 400],
  bungee: ["Bungee", 400],
  script: ["Yellowtail", 400],
  inter: ["Inter", 800],
  marker: ["Permanent Marker", 400],
  graffiti: ["Sedgwick Ave Display", 400],
  serif: ["DM Serif Display", 400],
  serifi: ["DM Serif Display", 400, "italic"],
  abril: ["Abril Fatface", 400],
  retro: ["Shrikhand", 400],
  bebas: ["Bebas Neue", 400],
  brush: ["Caveat Brush", 400],
  cinzel: ["Cinzel", 700],
  spray: ["Rubik Spray Paint", 400],
};
const fontAttr = (font) => `font-family="${FONTS[font][0]}" font-weight="${FONTS[font][1]}"${FONTS[font][2] ? ` font-style="${FONTS[font][2]}"` : ""}`;

const mcache = new Map();
/** Ink box of `text` per 1 px of font size, relative to the start-anchored origin and baseline. */
export async function measure(font, text, ls = 0) {
  const key = `${font}|${text}|${ls}`;
  if (mcache.has(key)) return mcache.get(key);
  const S = 400, X = 400, Y = 800;
  const width = Math.ceil(X * 2 + [...text].length * S * (1.4 + ls));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="1400"><text x="${X}" y="${Y}" ${fontAttr(font)} font-size="${S}" letter-spacing="${ls * S}" fill="#000">${esc(text)}</text></svg>`;
  const { info } = await sharp(Buffer.from(svg)).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const m = { left: (-info.trimOffsetLeft - X) / S, top: (-info.trimOffsetTop - Y) / S, w: info.width / S, h: info.height / S };
  mcache.set(key, m);
  return m;
}

/**
 * Text placed by its ink box: size = `size`, or the largest that fits `w` × `h`.
 * Position: `x` (ink left) or `cx`; `top`, `cy` or `bottom`. Options: ls, sy (vertical stretch), rot, skew,
 * stroke/sw (outline, drawn under the fill), shadow [dx, dy, colour, steps], fill ("none" for outline only).
 * Returns { svg, box }.
 */
export async function T(text, o = {}) {
  const { font = "anton", fill = "#000", ls = 0, sy = 1, stroke, sw = 0, rot = 0, skew = 0, extra = "", shadow } = o;
  const m = await measure(font, text, ls);
  let size = o.size ?? Math.min(o.w ? o.w / m.w : Infinity, o.h ? o.h / (m.h * sy) : Infinity);
  if (o.max) size = Math.min(size, o.max);
  const iw = m.w * size, ih = m.h * size * sy;
  const L = o.x ?? (o.cx ?? W / 2) - iw / 2;
  const Tp = o.top ?? (o.cy != null ? o.cy - ih / 2 : o.bottom != null ? o.bottom - ih : 0);
  const x = L - m.left * size;
  const yb = Tp - m.top * size * sy;
  const base = `${fontAttr(font)} font-size="${f1(size)}" letter-spacing="${f1(ls * size)}"`;
  const yy = sy === 1 ? yb : (yb - Tp) / sy + Tp;
  const one = (dx, dy, attrs) => `<text x="${f1(x + dx)}" y="${f1(yy + dy / sy)}" ${base} ${attrs}>${esc(text)}</text>`;
  let body = "";
  if (shadow) {
    const [dx, dy, col, steps = 10] = shadow;
    for (let i = steps; i >= 1; i--) body += one((dx * i) / steps, (dy * i) / steps, `fill="${col}"${stroke ? ` stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"` : ""}`);
  }
  if (stroke && sw) body += one(0, 0, `fill="${stroke}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`);
  body += one(0, 0, `fill="${fill}" ${extra}`);
  let g = sy === 1 ? body : `<g transform="translate(0 ${f1(Tp)}) scale(1 ${sy}) translate(0 ${f1(-Tp)})">${body}</g>`;
  if (skew) g = `<g transform="translate(${f1(L + iw / 2)} ${f1(Tp + ih)}) skewX(${skew}) translate(${f1(-(L + iw / 2))} ${f1(-(Tp + ih))})">${g}</g>`;
  if (rot) g = `<g transform="rotate(${rot} ${f1(L + iw / 2)} ${f1(Tp + ih / 2)})">${g}</g>`;
  return { svg: g, box: { x: L, y: Tp, w: iw, h: ih, cx: L + iw / 2, cy: Tp + ih / 2 }, size };
}

/** Letters on a circle (librsvg has no textPath). Top arc reads clockwise; bottom arc left → right. */
export async function arcText(text, { font = "anton", cx, cy, r, size, fill = "#000", ls = 0.06, bottom = false }) {
  const chars = [...text];
  const hh = await measure(font, "HH");
  const advs = [];
  for (const ch of chars) {
    const mm = await measure(font, `H${ch}H`);
    advs.push((mm.w - hh.w) * size + ls * size);
  }
  const total = advs.reduce((a, b) => a + b, 0);
  const cap = (await measure(font, "H")).h * size;
  const span = total / r;
  let out = "", acc = 0;
  chars.forEach((ch, i) => {
    const mid = acc + advs[i] / 2;
    acc += advs[i];
    if (ch === " ") return;
    if (!bottom) {
      const a = -Math.PI / 2 - span / 2 + mid / r;
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      out += `<text x="${f1(px)}" y="${f1(py)}" ${fontAttr(font)} font-size="${f1(size)}" fill="${fill}" text-anchor="middle" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${f1(px)} ${f1(py)})">${esc(ch)}</text>`;
    } else {
      const rb = r + cap;
      const a = Math.PI / 2 + span / 2 - mid / r;
      const px = cx + rb * Math.cos(a), py = cy + rb * Math.sin(a);
      out += `<text x="${f1(px)}" y="${f1(py)}" ${fontAttr(font)} font-size="${f1(size)}" fill="${fill}" text-anchor="middle" transform="rotate(${f1((a * 180) / Math.PI - 90)} ${f1(px)} ${f1(py)})">${esc(ch)}</text>`;
    }
  });
  return out;
}

/* ───────────────────────── basic shapes ───────────────────────── */
export const rect = (x, y, w, h, extra = "") => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" ${extra}/>`;
export const circle = (cx, cy, r, extra = "") => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" ${extra}/>`;
export const poly = (pts, extra = "") => `<path d="M${pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(" L")} Z" ${extra}/>`;
export function starPath(cx, cy, R, rot = -90, inner = 0.42, n = 5) {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? R * inner : R;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    d += `${i ? "L" : "M"}${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
  }
  return d + "Z";
}
export const star = (cx, cy, R, extra = "") => `<path d="${starPath(cx, cy, R)}" ${extra}/>`;

/** Point and tangent on a cubic Bézier. */
function bez(p, t) {
  const u = 1 - t;
  const x = u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0];
  const y = u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1];
  const dx = 3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]);
  const dy = 3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]);
  const l = Math.hypot(dx, dy) || 1;
  return { x, y, tx: dx / l, ty: dy / l, nx: -dy / l, ny: dx / l };
}

let uid = 0;
export const nid = (p = "i") => `${p}${uid++}`;

/**
 * A loaded paint brush stroke along a cubic Bézier `pts` ([[x,y]×4]) with width `w`:
 * blunt pressed start, wavy loaded body, ragged edges, dry-brush streaks opening toward the end and a
 * fringe of bristle trails. Returns SVG (black) — combine with `rough` for organic edges.
 */
export function brush(pts, w, o = {}) {
  const { seed = 1, dry = 0.55, streaks = 9, fringe = 14, start = 0.06, wave = 0.07, endTaper = 0.18 } = o;
  const r = rng(seed), nz = noise1(seed + 3), nz2 = noise1(seed + 9);
  const N = 220;
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = bez(pts, t);
    let k = 1;
    if (t < start) k = 0.55 + 0.45 * Math.sin(((t / start) * Math.PI) / 2);
    if (t > 1 - endTaper) k *= 0.5 + 0.5 * Math.cos((((t - (1 - endTaper)) / endTaper) * Math.PI) / 2) ** 0.6;
    const hw = (w / 2) * k * (1 + wave * nz(t * 7));
    const eL = hw * (1 + 0.05 * nz2(t * 40) + 0.025 * nz(t * 90 + 50));
    const eR = hw * (1 + 0.05 * nz2(t * 40 + 100) + 0.025 * nz(t * 90 + 150));
    L.push([p.x + p.nx * eL, p.y + p.ny * eL]);
    R.push([p.x - p.nx * eR, p.y - p.ny * eR]);
  }
  const body = `M${L.map((q) => `${f1(q[0])} ${f1(q[1])}`).join(" L")} L${R.reverse().map((q) => `${f1(q[0])} ${f1(q[1])}`).join(" L")} Z`;
  // dry-brush streaks: thin knock-outs along the direction, starting part-way and running to the end
  const id = nid("br");
  let gaps = "";
  for (let i = 0; i < streaks; i++) {
    const off = (r() - 0.5) * 0.86;
    const t0 = 1 - dry * (0.25 + r() * 0.75);
    const sw = Math.max(10, w * (0.012 + r() * 0.03));
    let d = "";
    for (let j = 0; j <= 30; j++) {
      const t = t0 + ((1.02 - t0) * j) / 30;
      const p = bez(pts, Math.min(1, t));
      d += `${j ? "L" : "M"}${f1(p.x + p.nx * off * w)} ${f1(p.y + p.ny * off * w)}`;
    }
    gaps += `<path d="${d}" fill="none" stroke="#000" stroke-width="${f1(sw)}" stroke-linecap="round"/>`;
  }
  // bristle fringe past the end of the stroke
  let tails = "";
  const pe = bez(pts, 1);
  for (let i = 0; i < fringe; i++) {
    const off = (r() - 0.5) * 0.7;
    const len = w * (0.15 + r() * 0.9);
    const sw = Math.max(10, w * (0.015 + r() * 0.035));
    const sx = pe.x + pe.nx * off * w * 0.9 - pe.tx * w * 0.25, sy = pe.y + pe.ny * off * w * 0.9 - pe.ty * w * 0.25;
    const ex = sx + pe.tx * len + pe.nx * (r() - 0.5) * w * 0.12, ey = sy + pe.ty * len + pe.ny * (r() - 0.5) * w * 0.12;
    tails += `<path d="M${f1(sx)} ${f1(sy)} L${f1(ex)} ${f1(ey)}" fill="none" stroke="#000" stroke-width="${f1(sw)}" stroke-linecap="round"/>`;
  }
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="8000" height="8000"><rect x="-2000" y="-2000" width="8000" height="8000" fill="#fff"/><g>${gaps.replace(/#000/g, "#000")}</g></mask><path d="${body}" fill="#000" mask="url(#${id})"/>${tails}`;
}

/** Straight brush stroke from (x1,y1) to (x2,y2) with a gentle bow. */
export function brushLine(x1, y1, x2, y2, w, o = {}) {
  const bow = o.bow ?? 0.04;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L;
  const b = L * bow;
  return brush([[x1, y1], [x1 + dx / 3 + nx * b, y1 + dy / 3 + ny * b], [x1 + (2 * dx) / 3 + nx * b * 0.6, y1 + (2 * dy) / 3 + ny * b * 0.6], [x2, y2]], w, o);
}

/** Paint splatter: a blob with spikes and satellite drops. Size R = blob radius. */
export function splatter(cx, cy, R, o = {}) {
  const { seed = 1, drops = 26, spread = 3.2, blob = true, dir = null } = o;
  const r = rng(seed);
  let s = "";
  if (blob) {
    const n = 46;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      let rr = R * (0.78 + r() * 0.3);
      if (r() < 0.16) rr *= 1.25 + r() * 0.5; // spikes
      d += `${i ? "L" : "M"}${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`;
    }
    s += `<path d="${d}Z" fill="#000" stroke="#000" stroke-width="${f1(R * 0.12)}" stroke-linejoin="round"/>`;
  }
  for (let i = 0; i < drops; i++) {
    const a = dir != null ? dir + (r() - 0.5) * 1.3 : r() * Math.PI * 2;
    const dist = R * (1.1 + Math.pow(r(), 1.6) * spread);
    const rad = Math.max(7, R * (0.28 - 0.06 * (dist / R)) * (0.4 + r() * 0.8));
    const x = cx + dist * Math.cos(a), y = cy + dist * Math.sin(a);
    const el = 1 + r() * 1.8;
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rad * el)}" ry="${f1(rad)}" transform="rotate(${f1((a * 180) / Math.PI)} ${f1(x)} ${f1(y)})" fill="#000"/>`;
    if (r() < 0.35) {
      const t2 = rad * (2 + r() * 2.5);
      s += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x - Math.cos(a) * t2)}" y2="${f1(y - Math.sin(a) * t2)}" stroke="#000" stroke-width="${f1(Math.max(10, rad * 0.55))}" stroke-linecap="round"/>`;
    }
  }
  return s;
}

/** A field of scattered droplets over a box (fine spatter). */
export function spatter(x, y, w, h, n, o = {}) {
  const { seed = 1, min = 7, max = 26 } = o;
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) {
    const rad = min + Math.pow(r(), 2.4) * (max - min);
    s += circle(x + r() * w, y + r() * h, rad, `fill="#000"`);
  }
  return s;
}

/** Paint drips hanging from y0 across [x0, x1]. */
export function drips(x0, x1, y0, o = {}) {
  const { seed = 1, n = 9, len = [120, 520], wid = [16, 38] } = o;
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const w = wid[0] + r() * (wid[1] - wid[0]);
    const l = len[0] + Math.pow(r(), 1.5) * (len[1] - len[0]);
    s += `<path d="M${f1(x - w * 0.9)} ${f1(y0 - 20)} Q${f1(x - w * 0.5)} ${f1(y0 + w)} ${f1(x - w / 2)} ${f1(y0 + w * 2)} L${f1(x - w / 2)} ${f1(y0 + l)} A${f1(w / 2)} ${f1(w / 2)} 0 0 0 ${f1(x + w / 2)} ${f1(y0 + l)} L${f1(x + w / 2)} ${f1(y0 + w * 2)} Q${f1(x + w * 0.5)} ${f1(y0 + w)} ${f1(x + w * 0.9)} ${f1(y0 - 20)} Z" fill="#000"/>`;
    s += circle(x, y0 + l + w * 0.1, w * 0.68, `fill="#000"`);
  }
  return s;
}

/** Halftone dots on a rotated grid inside a clip. f(u, v) → 0..1 dot size, u/v across the box. */
export function halftone({ x, y, w, h, cell = 46, f, angle = 45, clip, min = 0.14 }) {
  const id = nid("ht");
  const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2 + cell;
  const ca = Math.cos((angle * Math.PI) / 180), sa = Math.sin((angle * Math.PI) / 180);
  let dots = "";
  for (let gy = -R; gy <= R; gy += cell)
    for (let gx = -R; gx <= R; gx += cell) {
      const px = cx + gx * ca - gy * sa, py = cy + gx * sa + gy * ca;
      if (px < x - cell || px > x + w + cell || py < y - cell || py > y + h + cell) continue;
      const v = Math.max(0, Math.min(1, f((px - x) / w, (py - y) / h)));
      const rr = v * cell * 0.7;
      if (v > min) dots += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(rr)}"/>`;
    }
  const clipDef = clip ?? rect(x, y, w, h);
  return `<clipPath id="${id}">${clipDef}</clipPath><g clip-path="url(#${id})" fill="#000">${dots}</g>`;
}

/** Sun-ray burst (wedges) around cx, cy from r0 to r1. */
export function rays(cx, cy, r0, r1, n, o = {}) {
  const { width = 0.5, rot = 0 } = o;
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180, da = ((360 / n) * width * Math.PI) / 360;
    s += poly([[cx + r0 * Math.cos(a - da * 0.4), cy + r0 * Math.sin(a - da * 0.4)], [cx + r1 * Math.cos(a - da), cy + r1 * Math.sin(a - da)], [cx + r1 * Math.cos(a + da), cy + r1 * Math.sin(a + da)], [cx + r0 * Math.cos(a + da * 0.4), cy + r0 * Math.sin(a + da * 0.4)]], `fill="#000"`);
  }
  return s;
}

/** Torn-paper polygon around a rectangle (jagged, fibrous edge). */
export function torn(x, y, w, h, o = {}) {
  const { seed = 1, amp = 22, step = 14, rot = 0 } = o;
  const r = rng(seed), nz = noise1(seed + 5);
  const pts = [];
  const side = (ax, ay, bx, by, k) => {
    const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(L / step));
    const nx = -(by - ay) / L, ny = (bx - ax) / L;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const o2 = amp * (0.6 * nz(k * 37 + t * L * 0.02) + 0.4 * (r() - 0.5) * 2);
      pts.push([ax + (bx - ax) * t + nx * o2, ay + (by - ay) * t + ny * o2]);
    }
  };
  side(x, y, x + w, y, 1);
  side(x + w, y, x + w, y + h, 2);
  side(x + w, y + h, x, y + h, 3);
  side(x, y + h, x, y, 4);
  const p = poly(pts, `fill="#000"`);
  return rot ? `<g transform="rotate(${rot} ${f1(x + w / 2)} ${f1(y + h / 2)})">${p}</g>` : p;
}

/** Embed a PNG buffer as an <image> (used as a mask source: only its alpha matters). */
export const image = (dataUri, x, y, w, h, extra = "") => `<image href="${dataUri}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" preserveAspectRatio="none" ${extra}/>`;

/* ───────────────────────── raster pipeline ───────────────────────── */
async function noiseField(w, h, seed, cellPx, kernel = "cubic") {
  const lw = Math.max(2, Math.round(w / cellPx)), lh = Math.max(2, Math.round(h / cellPx));
  const r = rng(seed);
  const buf = Buffer.alloc(lw * lh);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(r() * 256);
  return sharp(buf, { raw: { width: lw, height: lh, channels: 1 } }).resize(w, h, { kernel, fit: "fill" }).extractChannel(0).raw().toBuffer();
}
/** Equalise a field to a uniform 0..255 distribution (so dither densities are honest). */
function equalise(f) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < f.length; i++) hist[f[i]]++;
  const lut = new Uint8Array(256);
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    lut[v] = Math.min(255, Math.floor((acc / f.length) * 256));
  }
  for (let i = 0; i < f.length; i++) f[i] = lut[f[i]];
  return f;
}
async function blur(mask, w, h, sigma) {
  if (sigma < 0.4) return mask;
  return sharp(mask, { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
}

/**
 * Render a piece. ops: [{ svg, color, rough?, spray?, erase? }], coordinates in canvas units.
 * region: [x, y, w, h] of the canvas to render; px: output long side.
 * Returns { data (RGBA), w, h, s } before trimming.
 */
export async function renderOps(ops, { region = [0, 0, W, H], px = 4800, seed = 1 } = {}) {
  const [rx, ry, rw, rh] = region;
  const s = px / Math.max(rw, rh);
  const ow = Math.round(rw * s), oh = Math.round(rh * s);
  const out = Buffer.alloc(ow * oh * 4);
  let k = 0;
  for (const op of ops) {
    k++;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${ow}" height="${oh}" viewBox="${rx} ${ry} ${rw} ${rh}">${op.svg}</svg>`;
    let m = await sharp(Buffer.from(svg), { limitInputPixels: false, unlimited: true }).ensureAlpha().extractChannel(3).raw().toBuffer();
    if (op.rough) {
      const { sigma = 3, amp = 0.55, grain = 6 } = typeof op.rough === "object" ? op.rough : { sigma: op.rough };
      const b = await blur(m, ow, oh, sigma * s);
      const [n1, n2] = await Promise.all([noiseField(ow, oh, seed * 31 + k, grain * s), noiseField(ow, oh, seed * 31 + k + 500, grain * s * 6)]);
      const res = Buffer.alloc(ow * oh);
      for (let i = 0; i < res.length; i++) {
        const nn = n1[i] * 0.6 + n2[i] * 0.4 - 128;
        res[i] = b[i] > 128 + nn * amp ? 255 : 0;
      }
      m = res;
    }
    if (op.spray) {
      const { sigma = 18, density = 0.9, dot = 2.2, core = true } = typeof op.spray === "object" ? op.spray : { sigma: op.spray };
      const b = await blur(m, ow, oh, sigma * s);
      const d = equalise(await noiseField(ow, oh, seed * 17 + k, Math.max(2, dot * s)));
      const res = Buffer.alloc(ow * oh);
      for (let i = 0; i < res.length; i++) {
        const v = (b[i] / 255) * density * 1.25;
        res[i] = (core && m[i] > 127) || v * 255 > d[i] ? 255 : 0;
      }
      m = res;
    }
    if (op.erase) {
      for (let p = 0, i = 3; p < m.length; p++, i += 4) if (m[p] > 127) out[i] = 0;
      continue;
    }
    const c = op.color.replace("#", "");
    const R = parseInt(c.slice(0, 2), 16), G = parseInt(c.slice(2, 4), 16), B = parseInt(c.slice(4, 6), 16);
    for (let p = 0, i = 0; p < m.length; p++, i += 4) {
      if (m[p] > 127) {
        out[i] = R;
        out[i + 1] = G;
        out[i + 2] = B;
        out[i + 3] = 255;
      }
    }
  }
  return { data: out, w: ow, h: oh, s, region };
}

/** Screen-print wear: worn patches (coarse × fine noise) plus specks knock ink out. amount 0..1. */
export async function wear(data, w, h, s, seed, amount) {
  if (amount <= 0) return data;
  const [coarse, mid, fine] = await Promise.all([noiseField(w, h, seed, 60 * s), noiseField(w, h, seed + 7, 12 * s), noiseField(w, h, seed + 13, 2.6 * s)]);
  const r = rng(seed + 99);
  const t1 = 200 - amount * 60, t2 = 205 - amount * 70;
  for (let i = 0, p = 0; p < coarse.length; p++, i += 4) {
    if (!data[i + 3]) continue;
    const worn = coarse[p] * 0.55 + mid[p] * 0.45;
    if ((worn > t1 && fine[p] > t2) || (worn > t1 - 18 && fine[p] > t2 + 28) || r() < amount * 0.004) data[i + 3] = 0;
  }
  return data;
}

/**
 * Fútbol PRO — big terrace / streetwear print art for ROJO Y GUALDA, drawn in code.
 *
 *   node scripts/futbol-art.mjs            # everything
 *   node scripts/futbol-art.mjs campeones  # only art whose name contains "campeones"
 *
 * Every piece is composed on the full 12 × 16 in print canvas (2400 × 3200 px = 200 dpi) as SVG,
 * rasterised with sharp/librsvg, given a screen-print wear texture, trimmed and written as a
 * palette PNG to public/catalog/art/fp-*.png. Placement on the canvas (centre + width, so a print
 * keeps the composition it was drawn with) goes to src/lib/catalog/futbol-pro-art.json; aspects
 * are merged into art-manifest.json (other entries kept).
 *
 * Typefaces (SIL OFL, scripts/fonts): Anton, Big Shoulders Display Black, Graduate, Bungee,
 * Yellowtail, Inter — loaded through a local fontconfig so the output never depends on the machine.
 *
 * Legal guard-rails: no club names, crests, badges, mascots, sponsors, competition wordmarks or
 * player names. City names, colours, stripe patterns, generic phrases, plain years and stars only.
 */
import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";

process.env.FONTCONFIG_FILE = fileURLToPath(new URL("./fonts/fonts.conf", import.meta.url));
const { default: sharp } = await import("sharp");
sharp.concurrency(4);

const OUT = new URL("../public/catalog/art/", import.meta.url);
const MANIFEST = new URL("../src/lib/catalog/art-manifest.json", import.meta.url);
const PLACEMENT = new URL("../src/lib/catalog/futbol-pro-art.json", import.meta.url);
const W = 2400, H = 3200;
const ONLY = process.argv[2] ?? "";

/* ───────────────────────── palette ───────────────────────── */
const C = {
  red: "#c8102e", red2: "#e0242f", gold: "#f1bf00", gold2: "#ffd23f", oldgold: "#d4a62a",
  cream: "#f3ead7", white: "#ffffff", ink: "#111111", navy: "#14213d", sky: "#8ac3ee",
};

/* ───────────────────────── fonts & measuring ───────────────────────── */
const FONTS = {
  anton: ["Anton", 400],
  shoulders: ["Big Shoulders Display", 900],
  varsity: ["Graduate", 400],
  bungee: ["Bungee", 400],
  script: ["Yellowtail", 400],
  inter: ["Inter", 800],
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fontAttr = (font) => `font-family="${FONTS[font][0]}" font-weight="${FONTS[font][1]}"`;
const f1 = (n) => +n.toFixed(1);

const mcache = new Map();
/** Ink box of `text` per 1 px of font size: left/top relative to the (start-anchored) origin and baseline. */
async function measure(font, text, ls = 0) {
  const key = `${font}|${text}|${ls}`;
  if (mcache.has(key)) return mcache.get(key);
  const S = 400, X = 300, Y = 700;
  const width = Math.ceil(X * 2 + [...text].length * S * (1.3 + ls));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="1200"><text x="${X}" y="${Y}" ${fontAttr(font)} font-size="${S}" letter-spacing="${ls * S}" fill="#000">${esc(text)}</text></svg>`;
  const { info } = await sharp(Buffer.from(svg)).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const m = { left: (-info.trimOffsetLeft - X) / S, top: (-info.trimOffsetTop - Y) / S, w: info.width / S, h: info.height / S };
  mcache.set(key, m);
  return m;
}

/**
 * Text placed by its ink box. Size = `size`, or the largest that fits `w` × `h` (after `sy` stretch).
 * Position: `x` (ink left) or `cx`; `top`, `cy` or `bottom`. Returns { svg, box, size }.
 * Extras: stroke/sw (outline behind the fill), shadow [dx, dy, colour, steps] (block extrusion), sy (vertical stretch), rot.
 */
async function T(text, o = {}) {
  const { font = "anton", fill = C.white, ls = 0, sy = 1, stroke, sw = 0, shadow, rot = 0, extra = "" } = o;
  const m = await measure(font, text, ls);
  const pad = sw + (shadow ? Math.max(Math.abs(shadow[0]), Math.abs(shadow[1])) : 0);
  let size = o.size ?? Math.min(o.w ? (o.w - pad) / m.w : Infinity, o.h ? (o.h - pad) / (m.h * sy) : Infinity);
  if (o.max) size = Math.min(size, o.max);
  const iw = m.w * size, ih = m.h * size * sy;
  const L = o.x ?? (o.cx ?? W / 2) - iw / 2;
  const Tp = o.top ?? (o.cy != null ? o.cy - ih / 2 : o.bottom != null ? o.bottom - ih : 0);
  const x = L - m.left * size;
  const y = Tp - m.top * size * sy; // baseline (after stretch about the ink top)
  const base = `${fontAttr(font)} font-size="${f1(size)}" letter-spacing="${f1(ls * size)}"`;
  const one = (dx, dy, attrs) => `<text x="${f1(x + dx)}" y="${f1(sy === 1 ? y + dy : (y - Tp) / sy + Tp + dy / sy)}" ${base} ${attrs}>${esc(text)}</text>`;
  let body = "";
  if (shadow) {
    const [dx, dy, col, steps = 12] = shadow;
    for (let i = steps; i >= 1; i--) body += one((dx * i) / steps, (dy * i) / steps, `fill="${col}"${stroke ? ` stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"` : ""}`);
  }
  if (stroke && sw) body += one(0, 0, `fill="${stroke}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`);
  body += one(0, 0, `fill="${fill}" ${extra}`);
  let g = sy === 1 ? body : `<g transform="translate(0 ${f1(Tp)}) scale(1 ${sy}) translate(0 ${f1(-Tp)})">${body}</g>`;
  if (rot) g = `<g transform="rotate(${rot} ${f1(L + iw / 2)} ${f1(Tp + ih / 2)})">${g}</g>`;
  return { svg: g, box: { x: L, y: Tp, w: iw, h: ih }, size, raw: { x, y, base, Tp, sy } };
}

/** Text as a clip path (for stripe-filled letters). Same placement rules as T. */
async function clipText(id, text, o) {
  const t = await T(text, o);
  const { x, y, base, Tp, sy } = t.raw;
  const tx = `<text x="${f1(x)}" y="${f1(sy === 1 ? y : (y - Tp) / sy + Tp)}" ${base}>${esc(text)}</text>`;
  const inner = sy === 1 ? tx : `<g transform="translate(0 ${f1(Tp)}) scale(1 ${sy}) translate(0 ${f1(-Tp)})">${tx}</g>`;
  return { def: `<clipPath id="${id}">${inner}</clipPath>`, box: t.box, size: t.size };
}

/** Letters set on a circle (librsvg has no textPath): top arc reads clockwise, bottom arc reads left→right. */
async function arcText(text, { font = "anton", cx, cy, r, size, fill, ls = 0.06, bottom = false }) {
  const chars = [...text];
  const hh = await measure(font, "HH");
  const advs = [];
  for (const ch of chars) {
    const mm = await measure(font, `H${ch === " " ? " " : ch}H`);
    advs.push((mm.w - hh.w) * size + ls * size);
  }
  const total = advs.reduce((a, b) => a + b, 0);
  const cap = (await measure(font, "H")).h * size;
  const span = total / r; // radians
  let out = "";
  let acc = 0;
  chars.forEach((ch, i) => {
    const mid = acc + advs[i] / 2;
    acc += advs[i];
    if (ch === " ") return;
    if (!bottom) {
      const a = -Math.PI / 2 - span / 2 + mid / r;
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      out += `<text x="${f1(px)}" y="${f1(py)}" ${fontAttr(font)} font-size="${f1(size)}" fill="${fill}" text-anchor="middle" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${f1(px)} ${f1(py)})">${esc(ch)}</text>`;
    } else {
      const rb = r + cap; // baseline below the inner radius: glyph tops face the centre
      const a = Math.PI / 2 + span / 2 - mid / r;
      const px = cx + rb * Math.cos(a), py = cy + rb * Math.sin(a);
      out += `<text x="${f1(px)}" y="${f1(py)}" ${fontAttr(font)} font-size="${f1(size)}" fill="${fill}" text-anchor="middle" transform="rotate(${f1((a * 180) / Math.PI - 90)} ${f1(px)} ${f1(py)})">${esc(ch)}</text>`;
    }
  });
  return out;
}

/* ───────────────────────── shapes ───────────────────────── */
let uid = 0;
const nid = (p) => `${p}${uid++}`;
function starPath(cx, cy, R, rot = -90, inner = 0.4) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * inner : R;
    const a = ((rot + i * 36) * Math.PI) / 180;
    d += `${i ? "L" : "M"}${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
  }
  return d + "Z";
}
const star = (cx, cy, R, fill, extra = "") => `<path d="${starPath(cx, cy, R)}" fill="${fill}" ${extra}/>`;
const rect = (x, y, w, h, fill, extra = "") => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, col, sw, extra = "") => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="${sw}" ${extra.includes("stroke-linecap") ? "" : 'stroke-linecap="round"'} ${extra}/>`;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Halftone dots on a rotated grid inside a clip rect. f(u, v) → 0..1 dot size (u, v ∈ 0..1 across the rect). */
function halftone({ x, y, w, h, cell = 46, f, fill, angle = 45, clip, clipId }) {
  const id = clipId ?? nid("ht");
  const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2 + cell;
  const ca = Math.cos((angle * Math.PI) / 180), sa = Math.sin((angle * Math.PI) / 180);
  let dots = "";
  for (let gy = -R; gy <= R; gy += cell)
    for (let gx = -R; gx <= R; gx += cell) {
      const px = cx + gx * ca - gy * sa, py = cy + gx * sa + gy * ca;
      if (px < x - cell || px > x + w + cell || py < y - cell || py > y + h + cell) continue;
      const v = f((px - x) / w, (py - y) / h);
      const r = Math.max(0, Math.min(1, v)) * cell * 0.62;
      if (r > cell * 0.07) dots += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(r)}"/>`;
    }
  const clipDef = clip ?? `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/>`;
  return `${clipId ? "" : `<clipPath id="${id}">${clipDef}</clipPath>`}<g clip-path="url(#${id})" fill="${fill}">${dots}</g>`;
}

/** Stripe / hoop / band fills for a box (city colours). */
function patternFill(p, x, y, w, h) {
  const { type, a, b, n = 7, c } = p;
  let s = rect(x, y, w, h, a);
  if (type === "stripes") {
    const sw = w / (n * 2 - 1);
    for (let i = 1; i < n * 2 - 1; i += 2) s += rect(x + i * sw, y, sw, h, b);
  } else if (type === "hoops") {
    const sh = h / (n * 2 - 1);
    for (let i = 1; i < n * 2 - 1; i += 2) s += rect(x, y + i * sh, w, sh, b);
  } else if (type === "band") {
    s += rect(x, y + h * 0.3, w, h * 0.17, b);
    if (c) s += rect(x, y + h * 0.3 - h * 0.02, w, h * 0.012, c) + rect(x, y + h * 0.47 + h * 0.008, w, h * 0.012, c);
  } else if (type === "sash") {
    s += `<path d="M${f1(x - w * 0.1)} ${f1(y + h * 0.12)} L${f1(x + w * 0.22)} ${f1(y - h * 0.05)} L${f1(x + w * 1.1)} ${f1(y + h * 0.82)} L${f1(x + w * 0.78)} ${f1(y + h * 1.0)} Z" fill="${b}"/>`;
  } else if (type === "halves") {
    s += rect(x + w / 2, y, w / 2, h, b);
  } else if (type === "pinstripe") {
    const gap = w / (n + 1);
    for (let i = 1; i <= n; i++) s += rect(x + i * gap - 7, y, 14, h, b);
  }
  return s;
}

/** Classic football: centre pentagon, five outer patches (clipped by the rim) and the seams that close the hexagons. */
function ball(cx, cy, R, { fill = C.cream, patch = C.ink, line: lc = C.ink, sw = 18, rot = 0 } = {}) {
  const id = nid("ball");
  const rad = (d) => ((d + rot) * Math.PI) / 180;
  const at = (r, ang, ox = cx, oy = cy) => [ox + r * Math.cos(rad(ang)), oy + r * Math.sin(rad(ang))];
  const pentPts = (ox, oy, r, a0) => [0, 1, 2, 3, 4].map((i) => at(r, a0 + i * 72, ox, oy));
  const path = (pts) => `M${pts.map((p) => p.map(f1).join(" ")).join(" L")} Z`;
  const a = R * 0.27;
  let g = `<path d="${path(pentPts(cx, cy, a, -90))}" fill="${patch}"/>`;
  // outer patches sit at the end of the seam leaving each centre vertex, a vertex pointing inwards;
  // hexagons between them close with an edge joining neighbouring patches
  const outer = [];
  for (let k = 0; k < 5; k++) {
    const th = -90 + 72 * k;
    const [ox, oy] = at(R * 0.8, th);
    const pts = pentPts(ox, oy, a, th + 180);
    outer.push(pts);
    g += `<path d="${path(pts)}" fill="${patch}"/>`;
    const [vx, vy] = at(a, th);
    g += line(vx, vy, pts[0][0], pts[0][1], lc, sw);
    for (const j of [2, 3]) {
      const [px, py] = pts[j];
      const ang = Math.atan2(py - oy, px - ox);
      g += line(px, py, px + R * 0.5 * Math.cos(ang), py + R * 0.5 * Math.sin(ang), lc, sw);
    }
  }
  for (let k = 0; k < 5; k++) {
    const A = outer[k], B = outer[(k + 1) % 5];
    // the closest pair of side vertices of two neighbouring patches
    let best = null;
    for (const p of [A[1], A[4]]) for (const q of [B[1], B[4]]) if (!best || Math.hypot(p[0] - q[0], p[1] - q[1]) < best[2]) best = [p, q, Math.hypot(p[0] - q[0], p[1] - q[1])];
    g += line(best[0][0], best[0][1], best[1][0], best[1][1], lc, sw);
  }
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}"/><g clip-path="url(#${id})">${g}</g><circle cx="${cx}" cy="${cy}" r="${R - sw * 0.7}" fill="none" stroke="${lc}" stroke-width="${sw * 1.4}"/>`;
}

/** Terrace scarf band: knit ribs, edge stripes and fringe at both ends. */
async function scarf({ x, y, w, h, base, stripe, rib, text, textFill, font = "anton", fringe = true, ls = 0.04, textW = 0.84 }) {
  let s = "";
  if (fringe) {
    const fl = h * 0.32, n = Math.round(h / 34);
    for (const side of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const yy = y + (h / n) * (i + 0.5);
        const x0 = side < 0 ? x : x + w;
        s += line(x0, yy, x0 + side * fl, yy, i % 2 ? stripe : base, h / n * 0.62, `stroke-linecap="butt"`);
      }
    }
  }
  s += rect(x, y, w, h, base);
  if (rib) for (let xx = x + 22; xx < x + w; xx += 44) s += rect(xx, y, 7, h, rib);
  const e = h * 0.07;
  s += rect(x, y + e, w, e * 0.7, stripe) + rect(x, y + h - e * 1.7, w, e * 0.7, stripe);
  if (text) s += (await T(text, { font, fill: textFill, w: w * textW, h: h * 0.56, cy: y + h / 2, cx: x + w / 2, ls })).svg;
  return s;
}

/** Football shirt silhouette path (short sleeves, V-neck) inside box x, y, w, h. */
function shirtPath(x, y, w, h) {
  const P = (u, v) => `${f1(x + u * w)} ${f1(y + v * h)}`;
  return `M${P(0.36, 0)} L${P(0.18, 0.05)} L${P(0, 0.27)} L${P(0.13, 0.38)} L${P(0.22, 0.29)} L${P(0.22, 1)} L${P(0.78, 1)} L${P(0.78, 0.29)} L${P(0.87, 0.38)} L${P(1, 0.27)} L${P(0.82, 0.05)} L${P(0.64, 0)} Q${P(0.5, 0.17)} ${P(0.36, 0)} Z`;
}
function shirtNeck(x, y, w, h, col, sw) {
  const P = (u, v) => `${f1(x + u * w)} ${f1(y + v * h)}`;
  return `<path d="M${P(0.36, 0)} Q${P(0.5, 0.17)} ${P(0.64, 0)}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`;
}
function shirtCuffs(x, y, w, h, col, sw) {
  const P = (u, v) => [x + u * w, y + v * h];
  const [a1, b1] = P(0, 0.27), [a2, b2] = P(0.13, 0.38), [c1, d1] = P(1, 0.27), [c2, d2] = P(0.87, 0.38);
  const k = 0.12; // cuff band a bit inside the sleeve end
  const lerp = (p, q, t) => p + (q - p) * t;
  const [i1, j1] = P(0.18, 0.05), [i2, j2] = P(0.22, 0.29), [m1, n1] = P(0.82, 0.05), [m2, n2] = P(0.78, 0.29);
  return line(lerp(a1, i1, k), lerp(b1, j1, k), lerp(a2, i2, k), lerp(b2, j2, k), col, sw, `stroke-linecap="butt"`) + line(lerp(c1, m1, k), lerp(d1, n1, k), lerp(c2, m2, k), lerp(d2, n2, k), col, sw, `stroke-linecap="butt"`);
}

/** Line-art stadium seen from the stands: bowl rows, roof truss, floodlights, crowd dots, pitch in perspective. */
function stadium(x, y, w, h, { ink = C.cream, accent = C.red, sw = 16 } = {}) {
  const cx = x + w / 2;
  let s = "";
  const P = (u, v) => [x + u * w, y + v * h];
  // pitch trapezoid
  const [p1x, p1y] = P(0.2, 0.58), [p2x] = P(0.8, 0.58), [p3x, p3y] = P(1.0, 1.0), [p4x] = P(0.0, 1.0);
  s += `<path d="M${f1(p1x)} ${f1(p1y)} L${f1(p2x)} ${f1(p1y)} L${f1(p3x)} ${f1(p3y)} L${f1(p4x)} ${f1(p3y)} Z" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const midY = p1y + (p3y - p1y) * 0.45;
  const halfAt = (yy) => (p2x - p1x) / 2 + ((p3x - p4x - (p2x - p1x)) / 2) * ((yy - p1y) / (p3y - p1y));
  s += line(cx - halfAt(midY), midY, cx + halfAt(midY), midY, ink, sw);
  s += `<ellipse cx="${f1(cx)}" cy="${f1(midY)}" rx="${f1(w * 0.13)}" ry="${f1(h * 0.05)}" fill="none" stroke="${ink}" stroke-width="${sw}"/>`;
  s += `<circle cx="${f1(cx)}" cy="${f1(midY)}" r="${sw}" fill="${ink}"/>`;
  // boxes (far and near)
  const box = (yy, depth, wf) => {
    const hw = halfAt(yy) * wf;
    const y2 = yy + depth;
    const hw2 = halfAt(y2) * wf;
    return `<path d="M${f1(cx - hw)} ${f1(yy)} L${f1(cx - hw2)} ${f1(y2)} L${f1(cx + hw2)} ${f1(y2)} L${f1(cx + hw)} ${f1(yy)}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  };
  s += box(p1y, h * 0.045, 0.42);
  const nearTop = p3y - h * 0.09;
  s += `<path d="M${f1(cx - halfAt(nearTop) * 0.46)} ${f1(p3y)} L${f1(cx - halfAt(nearTop) * 0.42)} ${f1(nearTop)} L${f1(cx + halfAt(nearTop) * 0.42)} ${f1(nearTop)} L${f1(cx + halfAt(nearTop) * 0.46)} ${f1(p3y)}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  // stands: rows of arcs behind the pitch
  for (let i = 0; i < 6; i++) {
    const yy = p1y - h * 0.035 - i * h * 0.055;
    const spread = 0.24 + i * 0.05;
    const [lx] = P(0.5 - spread - 0.06, 0), [rx] = P(0.5 + spread + 0.06, 0);
    s += `<path d="M${f1(lx - w * 0.1)} ${f1(yy + h * 0.1)} Q${f1(cx)} ${f1(yy - h * 0.06)} ${f1(rx + w * 0.1)} ${f1(yy + h * 0.1)}" fill="none" stroke="${i % 3 === 2 ? accent : ink}" stroke-width="${sw * (i % 3 === 2 ? 1.2 : 0.8)}"/>`;
  }
  // crowd: halftone band in the stands
  s += halftone({ x: x + w * 0.04, y: y + h * 0.12, w: w * 0.92, h: h * 0.36, cell: 34, angle: 0, fill: ink, f: (u, v) => 0.25 + 0.5 * Math.abs(Math.sin(u * 37 + v * 11)) * (1 - Math.abs(u - 0.5)) });
  // roof truss
  const ry = y + h * 0.08;
  s += `<path d="M${f1(x - w * 0.04)} ${f1(ry + h * 0.1)} Q${f1(cx)} ${f1(ry - h * 0.08)} ${f1(x + w * 1.04)} ${f1(ry + h * 0.1)}" fill="none" stroke="${ink}" stroke-width="${sw * 1.4}"/>`;
  // floodlights
  for (const u of [0.04, 0.96]) {
    const [tx, ty] = P(u, -0.02);
    s += line(tx, ty + h * 0.09, tx, y + h * 0.56, ink, sw * 1.1);
    s += rect(tx - w * 0.055, ty - h * 0.02, w * 0.11, h * 0.1, "none", `stroke="${ink}" stroke-width="${sw}"`);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) s += `<circle cx="${f1(tx - w * 0.038 + c * w * 0.025)}" cy="${f1(ty + h * 0.0 + r * h * 0.028)}" r="${f1(w * 0.008)}" fill="${accent}"/>`;
  }
  return s;
}

/* ───────────────────────── wear texture ───────────────────────── */
async function noise(w, h, seed, W2 = W, H2 = H) {
  w = Math.round(w);
  h = Math.round(h);
  const r = rng(seed);
  const buf = Buffer.alloc(w * h);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(r() * 256);
  return sharp(buf, { raw: { width: w, height: h, channels: 1 } }).resize(W2, H2, { kernel: "cubic" }).raw().toBuffer();
}
/** Screen-print wear: worn patches (coarse × fine noise) plus loose specks knock ink out. amount 0..1. */
async function wear(data, seed, amount) {
  if (amount <= 0) return data;
  const [coarse, mid, fine] = await Promise.all([noise(W / 60, H / 60, seed), noise(W / 12, H / 12, seed + 7), noise(W / 2.5, H / 2.5, seed + 13)]);
  const r = rng(seed + 99);
  const t1 = 200 - amount * 60, t2 = 205 - amount * 70;
  for (let i = 0, p = 0; p < coarse.length; p++, i += 4) {
    if (!data[i + 3]) continue;
    const worn = coarse[p] * 0.55 + mid[p] * 0.45;
    let k = 1;
    if (worn > t1 && fine[p] > t2) k = 0;
    else if (worn > t1 - 18 && fine[p] > t2 + 28) k = 0;
    else if (r() < amount * 0.006) k = 0;
    if (!k) data[i + 3] = 0;
  }
  return data;
}

/* ───────────────────────── output ───────────────────────── */
/**
 * Safe area of the 3:4 canvas every piece must sit inside (print audit 2026-10-04): side seams eat the
 * outer 8 %, the hood seam the top 10 % of a hoodie back. Fronts keep 6 % at the top (collar curve).
 * A piece drawn beyond it is scaled into it when placed (the PNG keeps its full resolution) and logged,
 * so a new piece can never again print into a seam. The renderer adds the garment zones on top
 * (lib/catalog/print-safety.ts: hoodie pocket, all-over panel crop).
 */
const SAFE_FRONT = { l: 0.08, t: 0.06, r: 0.08, b: 0.05 };
const SAFE_BACK = { l: 0.08, t: 0.1, r: 0.08, b: 0.06 };
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
/** A colour that reads on a black garment: very dark inks (outlines, shadows) are swapped for `alt`. */
const onDark = (hex, alt) => (lum(hex) < 0.045 ? alt : hex);
const placement = {};
const manifestAdds = {};
const SHOTS = [];
/** Rasterise a full-canvas SVG body, wear it, trim, save. `cover` keeps the full canvas (all-over patterns). */
async function out(name, body, { wear: amount0 = 0.45, seed = 1, cover = false, bg } = {}) {
  const amount = Math.min(amount0, 0.3); // print audit: heavier wear ate thin strokes on the garment
  if (ONLY && !name.includes(ONLY)) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg ? rect(0, 0, W, H, bg) : ""}${body}</svg>`;
  const { data, info } = await sharp(Buffer.from(svg), { limitInputPixels: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  await wear(data, seed, amount);
  let img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  let x0 = 0, y0 = 0, w = W, h = H;
  if (!cover) {
    const t = await img.png().toBuffer().then((b) => sharp(b).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true }));
    x0 = -t.info.trimOffsetLeft;
    y0 = -t.info.trimOffsetTop;
    w = t.info.width;
    h = t.info.height;
    img = sharp(t.data);
  }
  const png = await img.png({ palette: true, colours: 48, dither: 0, compressionLevel: 9, effort: 8 }).toBuffer();
  const file = `fp-${name}`;
  await writeFile(new URL(`${file}.png`, OUT), png);
  const aspect = +(h / w).toFixed(4);
  manifestAdds[file] = aspect;
  // layer geometry on the 3:4 canvas: centre + width fraction (the renderer's ImageLayer contract)
  let px = (x0 + w / 2) / W, py = (y0 + h / 2) / H, pw = w / W;
  if (!cover) {
    const z = /espalda|dorsal/.test(name) ? SAFE_BACK : SAFE_FRONT;
    const bw = w / W, bh = h / H;
    const k = Math.min(1, (1 - z.l - z.r) / bw, (1 - z.t - z.b) / bh);
    const bx0 = x0 / W, by0 = y0 / H;
    if (k < 1 || bx0 < z.l - 1e-4 || by0 < z.t - 1e-4 || bx0 + bw > 1 - z.r + 1e-4 || by0 + bh > 1 - z.b + 1e-4) {
      const nw = bw * k, nh = bh * k;
      const cx = Math.min(Math.max(bx0 + bw / 2, z.l + nw / 2), 1 - z.r - nw / 2);
      const ny0 = Math.min(Math.max(by0, z.t), 1 - z.b - nh);
      console.warn(`  safe area: ${file} scaled x${k.toFixed(3)} (was ${(bx0 * 100).toFixed(1)}-${((bx0 + bw) * 100).toFixed(1)}% x ${(by0 * 100).toFixed(1)}-${((by0 + bh) * 100).toFixed(1)}%)`);
      px = cx;
      py = ny0 + nh / 2;
      pw = nw;
    }
  }
  placement[file] = { aspect, x: +px.toFixed(4), y: +py.toFixed(4), w: +pw.toFixed(4) };
  SHOTS.push(`${file}.png ${(png.length / 1024).toFixed(0)} KB`);
}

/* ═════════════════════════ CAMPEONES (Spain, world champions 2010 · 2026) ═════════════════════════ */

const TONES = {
  dark: { main: C.white, alt: C.gold, hot: C.red, line: C.cream, shadow: C.red, deep: "#7a0a1c" },
  light: { main: C.ink, alt: C.red, hot: C.red, line: C.ink, shadow: C.gold, deep: "#7a0a1c" },
};

async function campeonesMundo(tone) {
  const t = TONES[tone];
  let s = "";
  // two stars between rules
  const sy = 300;
  s += star(W / 2 - 190, sy, 150, t.alt) + star(W / 2 + 190, sy, 150, t.alt);
  s += rect(120, sy - 9, 700, 18, t.line) + rect(W - 820, sy - 9, 700, 18, t.line);
  const big = await T("CAMPEONES", { font: "anton", fill: t.main, w: 2260, sy: 2.3, top: 520, shadow: tone === "dark" ? [0, 34, t.hot, 10] : [0, 34, t.alt, 10] });
  s += big.svg;
  const yb = big.box.y + big.box.h + 90;
  s += (await T("DEL MUNDO", { font: "anton", fill: "none", w: 1900, top: yb, ls: 0.12, extra: `stroke="${t.main}" stroke-width="24"` })).svg;
  const dm = await measure("anton", "DEL MUNDO", 0.12);
  const yh = yb + (1900 / dm.w) * dm.h + 130;
  const yrs = await T("2010 · 2026", { font: "varsity", fill: t.alt, w: 2100, top: yh });
  s += yrs.svg;
  s += await scarf({ x: 240, y: yrs.box.y + yrs.box.h + 150, w: W - 480, h: 300, base: C.red, stripe: C.gold, rib: "#a50d26", text: "ESPAÑA", textFill: C.gold, fringe: true, ls: 0.3, textW: 0.5 });
  await out(`campeones-mundo-${tone === "dark" ? "noche" : "dia"}`, s, { seed: 11, wear: 0.42 });

  // back: one block in the upper-middle of the back — ESPAÑA, two stars, the 26, CAMPEONES DEL MUNDO.
  // Numeral ~28 % smaller than the first edition, clear of the hood seam (top ≥ 10 %) and side seams
  // (≥ 8 %), light wear so the strokes print solid.
  let b = "";
  const es = await T("ESPAÑA", { font: "shoulders", fill: t.main, w: 1500, top: 360, ls: 0.06 });
  b += es.svg;
  const sy2 = es.box.y + es.box.h + 150;
  b += star(W / 2 - 150, sy2, 100, t.alt) + star(W / 2 + 150, sy2, 100, t.alt);
  const n26 = await T("26", { font: "varsity", fill: t.alt, h: 1190, w: 1700, top: sy2 + 170, stroke: t.hot, sw: 34, shadow: [26, 26, tone === "dark" ? t.deep : C.ink, 10] });
  b += n26.svg;
  b += (await T("CAMPEONES DEL MUNDO", { font: "anton", fill: t.main, w: 1700, top: n26.box.y + n26.box.h + 130, ls: 0.05 })).svg;
  await out(`campeones-mundo-${tone === "dark" ? "noche" : "dia"}-espalda`, b, { seed: 12, wear: 0.1 });
}

async function campeonesScript(tone) {
  const t = TONES[tone];
  let s = "";
  s += (await T("ESPAÑA", { font: "varsity", fill: t.main, w: 1400, top: 160, ls: 0.12 })).svg;
  const sc = await T("Campeones", { font: "script", fill: tone === "dark" ? C.white : C.red, w: 2300, sy: 1.3, cy: 1150, rot: -9, stroke: tone === "dark" ? C.red : C.ink, sw: 34, shadow: [0, 46, tone === "dark" ? C.gold : C.gold, 12] });
  s += sc.svg;
  // swoosh tail under the script
  s += `<path d="M 330 1560 C 900 1430, 1600 1360, 2180 1180 C 1700 1450, 1000 1560, 520 1640 Z" fill="${tone === "dark" ? C.gold : C.red}" transform="translate(0 130) rotate(-2 1200 1450)"/>`;
  const yr = await T("2026", { font: "bungee", fill: t.main, w: 1700, top: 2080, shadow: [22, 22, t.hot, 10] });
  s += yr.svg;
  s += star(yr.box.x - 200, yr.box.y + yr.box.h / 2, 130, t.alt) + star(yr.box.x + yr.box.w + 220, yr.box.y + yr.box.h / 2, 130, t.alt);
  s += (await T("CAMPEONES DEL MUNDO · 2010 · 2026", { font: "inter", fill: t.alt === C.gold ? C.cream : C.ink, w: 1900, top: yr.box.y + yr.box.h + 140, ls: 0.08 })).svg;
  await out(`campeones-script-${tone === "dark" ? "noche" : "dia"}`, s, { seed: 21, wear: 0.38 });
}

async function badgeDosEstrellas(tone) {
  const t = TONES[tone];
  const cx = W / 2, cy = 1300, R = 1120;
  let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${tone === "dark" ? C.red : C.red}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R - 40}" fill="none" stroke="${C.gold}" stroke-width="22"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.66}" fill="${tone === "dark" ? C.ink : C.cream}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.66}" fill="none" stroke="${C.gold}" stroke-width="22"/>`;
  s += await arcText("CAMPEONES DEL MUNDO", { font: "anton", cx, cy, r: R * 0.74, size: 200, fill: C.white, ls: 0.07 });
  s += await arcText("ESPAÑA", { font: "anton", cx, cy, r: R * 0.71, size: 200, fill: C.gold, ls: 0.2, bottom: true });
  s += star(cx - R * 0.86, cy + 60, 70, C.gold) + star(cx + R * 0.86, cy + 60, 70, C.gold);
  // centre: halftone glow, two stars, the years
  s += halftone({ x: cx - R * 0.66, y: cy - R * 0.66, w: R * 1.32, h: R * 1.32, cell: 40, angle: 30, fill: tone === "dark" ? "#3a0610" : "#f0c9a0", clip: `<circle cx="${cx}" cy="${cy}" r="${R * 0.64}"/>`, f: (u, v) => 1 - Math.hypot(u - 0.5, v - 0.5) * 1.9 });
  s += star(cx - 250, cy - 170, 230, C.gold) + star(cx + 250, cy - 170, 230, C.gold);
  s += (await T("2010", { font: "varsity", fill: tone === "dark" ? C.white : C.ink, w: 440, cx: cx - 300, top: cy + 120 })).svg;
  s += (await T("2026", { font: "varsity", fill: tone === "dark" ? C.white : C.ink, w: 440, cx: cx + 300, top: cy + 120 })).svg;
  s += (await T("DOS ESTRELLAS", { font: "anton", fill: t.main, w: 1900, top: cy + R + 150, ls: 0.1 })).svg;
  await out(`dos-estrellas-${tone === "dark" ? "noche" : "dia"}`, s, { seed: 31, wear: 0.35 });
}

async function dosFechas(tone) {
  const t = TONES[tone];
  let s = "";
  const a = await T("2010", { font: "varsity", fill: "none", w: 1750, sy: 1.45, x: 140, top: 160, extra: `stroke="${t.main}" stroke-width="26" stroke-linejoin="round"` });
  s += a.svg + star(2080, a.box.y + a.box.h / 2, 150, t.alt);
  const b = await T("2026", { font: "varsity", fill: t.alt, w: 1750, sy: 1.45, x: 140, top: a.box.y + a.box.h + 130, stroke: tone === "dark" ? C.red : C.ink, sw: 30, shadow: [26, 26, tone === "dark" ? C.red : C.ink, 10] });
  s += b.svg + star(2080, b.box.y + b.box.h / 2, 150, t.alt);
  const y3 = b.box.y + b.box.h + 170;
  s += await scarf({ x: 220, y: y3, w: W - 440, h: 430, base: C.red, stripe: C.gold, rib: "#a50d26", text: "CAMPEONES DEL MUNDO", textFill: C.white, fringe: true });
  await out(`dos-fechas-${tone === "dark" ? "noche" : "dia"}`, s, { seed: 41, wear: 0.4 });
}

async function campeonesBandas() {
  let s = "";
  const x = 130, y = 640, w = W - 260, h = 1500;
  const id = nid("ko");
  const word = await T("CAMPEONES", { font: "anton", w: w - 160, cy: y + h / 2, sy: 1.25 });
  const { x: tx, y: ty, base, Tp, sy } = word.raw;
  const txt = `<text x="${f1(tx)}" y="${f1((ty - Tp) / sy + Tp)}" ${base} fill="black">CAMPEONES</text>`;
  s += `<mask id="${id}"><rect x="0" y="0" width="${W}" height="${H}" fill="white"/><g transform="translate(0 ${f1(Tp)}) scale(1 ${sy}) translate(0 ${f1(-Tp)})">${txt}</g></mask>`;
  s += `<g mask="url(#${id})">${rect(x, y, w, h * 0.25, C.red)}${rect(x, y + h * 0.25, w, h * 0.5, C.gold)}${rect(x, y + h * 0.75, w, h * 0.25, C.red)}</g>`;
  for (let i = -2; i <= 2; i++) s += star(W / 2 + i * 330, 380, i === 0 ? 190 : 120, i % 2 ? C.cream : C.gold);
  s += (await T("ESPAÑA · 2026", { font: "shoulders", fill: C.white, w: 1900, top: y + h + 150, ls: 0.08 })).svg;
  await out("campeones-bandas", s, { seed: 51, wear: 0.38 });
}

async function campeonesEspalda(tone) {
  const t = TONES[tone];
  // front: chest mark, compact but bold (two stars over ESPAÑA)
  let f = "";
  f += star(1660, 300, 95, t.alt) + star(1900, 300, 95, t.alt);
  f += (await T("ESPAÑA", { font: "anton", fill: t.main, w: 640, cx: 1780, top: 440, ls: 0.04 })).svg;
  f += rect(1460, 700, 640, 26, t.hot);
  await out(`campeones-pecho-${tone === "dark" ? "noche" : "dia"}`, f, { seed: 61, wear: 0.25 });
  // back: the whole statement
  // back: the statement as one block in the upper-middle, inside the seams (sides ≥ 8 %, top ≥ 10 %)
  let b = "";
  b += halftone({ x: 260, y: 360, w: W - 520, h: 2200, cell: 48, angle: 45, fill: tone === "dark" ? "#5c0b17" : "#f2d27a", f: (u, v) => 1.0 - Math.hypot(u - 0.5, (v - 0.45) * 0.85) * 2.2 });
  for (let i = 0; i < 2; i++) b += star(W / 2 + (i ? 200 : -200), 520, 150, t.alt);
  const l1 = await T("CAMPEONES", { font: "anton", fill: t.main, w: 1860, sy: 1.5, top: 780, shadow: [0, 24, t.hot, 10] });
  b += l1.svg;
  const l2 = await T("DEL MUNDO", { font: "anton", fill: t.alt, w: 1860, sy: 1.5, top: l1.box.y + l1.box.h + 80, shadow: [0, 24, tone === "dark" ? t.deep : C.ink, 10] });
  b += l2.svg;
  b += (await T("2010 · 2026", { font: "varsity", fill: t.main, w: 1400, top: l2.box.y + l2.box.h + 130 })).svg;
  await out(`campeones-espalda-${tone === "dark" ? "noche" : "dia"}`, b, { seed: 62, wear: 0.16 });
}

async function bufandaEspana() {
  let s = "";
  // a scarf crossing the chest diagonally
  // the scarf ends (with its fringe) inside the print area: nothing runs into the side seams
  const band = await scarf({ x: 360, y: 1180, w: W - 720, h: 500, base: C.red, stripe: C.gold, rib: "#a50d26", text: "ESPAÑA · CAMPEONES", textFill: C.gold, fringe: true, textW: 0.84 });
  s += `<g transform="rotate(-12 ${W / 2} 1430)">${band}</g>`;
  s += (await T("VAMOS", { font: "shoulders", fill: C.white, w: 1500, top: 150, ls: 0.06 })).svg;
  s += star(W / 2 - 200, 2300, 140, C.gold) + star(W / 2 + 200, 2300, 140, C.gold);
  s += (await T("2010 · 2026", { font: "varsity", fill: C.white, w: 1700, top: 2560 })).svg;
  await out("bufanda-espana", s, { seed: 71, wear: 0.4 });
}

/* ═════════════════════════ GRADA / AFICIÓN ═════════════════════════ */

async function hastaElFinal() {
  let s = "";
  const rows = [
    ["HASTA", C.red, C.gold, "#a50d26", C.white],
    ["EL", C.cream, C.red, "#e4d8bf", C.ink],
    ["FINAL", C.gold, C.red, "#d9a800", C.ink],
  ];
  let y = 200;
  for (const [word, base, stripe, rib, ink] of rows) {
    s += await scarf({ x: 300, y, w: W - 600, h: 760, base, stripe, rib, text: word, textFill: ink, font: "anton", textW: word === "EL" ? 0.3 : 0.8, ls: 0.06 });
    y += 900;
  }
  await out("hasta-el-final", s, { seed: 81, wear: 0.4 });
}

async function aficionEstadio() {
  let s = "";
  s += (await T("AFICIÓN", { font: "anton", fill: C.white, w: 2250, sy: 1.3, top: 120, shadow: [0, 28, C.red, 10] })).svg;
  s += stadium(340, 1640, W - 680, 1200, { ink: C.cream, accent: C.gold, sw: 18 });
  s += (await T("EL FÚTBOL SE VIVE EN LA GRADA", { font: "inter", fill: C.gold, w: 2000, top: 3010, ls: 0.06 })).svg;
  await out("aficion-estadio", s, { seed: 91, wear: 0.35 });
}

async function miEquipo(tone) {
  const t = TONES[tone];
  let s = "";
  const a = await T("MI EQUIPO", { font: "anton", fill: t.main, w: 2240, sy: 1.3, top: 150 });
  s += a.svg;
  const b = await T("MI CIUDAD", { font: "anton", fill: "none", w: 2240, sy: 1.3, top: a.box.y + a.box.h + 110, extra: `stroke="${t.main}" stroke-width="18" stroke-linejoin="round"` });
  s += b.svg;
  const c = await T("MI GENTE", { font: "anton", fill: t.hot, w: 2240, sy: 1.3, top: b.box.y + b.box.h + 110 });
  s += c.svg;
  const yb = c.box.y + c.box.h + 130;
  for (let i = 0; i < 9; i++) s += rect(80 + i * 250, yb, 150, 120, i % 2 ? t.alt : t.hot);
  s += (await T("NUNCA SOLOS · SIEMPRE JUNTOS", { font: "inter", fill: t.main, w: 2100, top: yb + 240, ls: 0.06 })).svg;
  await out(`mi-equipo-${tone === "dark" ? "noche" : "dia"}`, s, { seed: 101, wear: 0.38 });
}

async function noventaMinutos() {
  let s = "";
  const n = await T("90'", { font: "varsity", fill: C.gold, w: 2250, h: 1700, top: 140, stroke: C.red, sw: 44, shadow: [40, 40, "#7a0a1c", 14] });
  s += n.svg;
  // halftone fade over the numeral (screen-print look)
  const id = nid("n90");
  const { x, y, base, Tp, sy } = n.raw;
  s += `<clipPath id="${id}"><text x="${f1(x)}" y="${f1(y)}" ${base}>90'</text></clipPath>`;
  s += halftone({ x: n.box.x, y: n.box.y, w: n.box.w, h: n.box.h, cell: 44, fill: C.red, f: (u, v) => (v - 0.35) * 1.6, clipId: id });
  void Tp; void sy;
  s += await scarf({ x: 160, y: n.box.y + n.box.h + 190, w: W - 320, h: 330, base: C.cream, stripe: C.red, rib: "#e4d8bf", text: "Y LO QUE HAGA FALTA", textFill: C.ink, fringe: true });
  await out("noventa-minutos", s, { seed: 111, wear: 0.4 });
}

async function siempreContigo() {
  let s = "";
  s += (await T("SIEMPRE", { font: "shoulders", fill: C.white, w: 2200, top: 150, ls: 0.04 })).svg;
  const band = await scarf({ x: 340, y: 0, w: W - 680, h: 580, base: C.gold, stripe: C.red, rib: "#d9a800", text: "CONTIGO", textFill: C.red, fringe: true, textW: 0.62, ls: 0.12 });
  s += `<g transform="translate(0 1060) rotate(-7 ${W / 2} 290)">${band}</g>`;
  s += (await T("EN LAS BUENAS", { font: "anton", fill: C.cream, w: 1800, top: 2050, ls: 0.06 })).svg;
  s += (await T("Y EN LAS MALAS", { font: "anton", fill: C.red, w: 1800, top: 2420, ls: 0.06 })).svg;
  await out("siempre-contigo", s, { seed: 121, wear: 0.4 });
}

async function domingoPartido() {
  let s = "";
  // big match ticket with a perforated stub
  const x = 140, y = 260, w = W - 280, h = 2500, stubH = 640;
  const notch = 70;
  s += `<path d="M${x} ${y} H${x + w} V${y + h - stubH - notch} A${notch} ${notch} 0 0 0 ${x + w} ${y + h - stubH + notch} V${y + h} H${x} V${y + h - stubH + notch} A${notch} ${notch} 0 0 0 ${x} ${y + h - stubH - notch} Z" fill="${C.cream}"/>`;
  for (let xx = x + notch + 40; xx < x + w - notch - 30; xx += 70) s += `<circle cx="${xx}" cy="${y + h - stubH}" r="14" fill="${C.ink}"/>`;
  s += rect(x + 70, y + 70, w - 140, 150, C.red);
  s += (await T("ENTRADA · GRADA DE ANIMACIÓN", { font: "inter", fill: C.cream, w: w - 300, cy: y + 145, ls: 0.06 })).svg;
  const d1 = await T("DOMINGO", { font: "anton", fill: C.ink, w: w - 220, sy: 1.0, top: y + 330 });
  s += d1.svg;
  const d2 = await T("DE PARTIDO", { font: "anton", fill: C.red, w: w - 220, sy: 1.0, top: d1.box.y + d1.box.h + 70 });
  s += d2.svg;
  s += ball(x + 330, y + h - stubH - 290, 190, { fill: C.cream, patch: C.ink, line: C.ink, sw: 14 });
  s += (await T("PUERTA 12 · FILA 7", { font: "shoulders", fill: C.ink, w: 1300, x: x + 620, cy: y + h - stubH - 290 })).svg;
  s += (await T("ADMIT ONE".replace("ADMIT ONE", "VÁLIDA PARA TODA LA VIDA"), { font: "inter", fill: C.ink, w: w - 300, cy: y + h - stubH / 2, ls: 0.05 })).svg;
  await out("domingo-de-partido", s, { seed: 131, wear: 0.35 });
}

/* ═════════════════════════ RETRO 90 ═════════════════════════ */

async function retroPanel(name, { colors, title, sub, font = "bungee", num, seed, kind }) {
  let s = "";
  const x = 160, y = 260, w = W - 320, h = 2000;
  const id = nid("rp");
  s += `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="40"/></clipPath>`;
  let g = rect(x, y, w, h, colors[0]);
  const r = rng(seed);
  if (kind === "shards") {
    for (let i = 0; i < 26; i++) {
      const cx = x + r() * w, cy = y + r() * h, s1 = 200 + r() * 520, a = r() * Math.PI * 2;
      const pts = [0, 1, 2].map((k) => [cx + s1 * Math.cos(a + k * 2.1 + r() * 0.5), cy + s1 * 0.6 * Math.sin(a + k * 2.1 + r() * 0.5)]);
      g += `<path d="M${pts.map((p) => p.map(f1).join(" ")).join(" L")} Z" fill="${colors[1 + (i % (colors.length - 1))]}"/>`;
    }
  } else if (kind === "zigzag") {
    for (let row = 0; row < 12; row++) {
      const yy = y + row * (h / 11) - 40;
      let d = `M${x - 100} ${yy}`;
      for (let k = 0; k <= 16; k++) d += ` L${f1(x - 100 + k * 170)} ${f1(yy + (k % 2 ? 120 : -20))}`;
      g += `<path d="${d}" fill="none" stroke="${colors[1 + (row % (colors.length - 1))]}" stroke-width="${row % 3 ? 46 : 90}" stroke-linejoin="miter"/>`;
    }
  } else if (kind === "pinstripe") {
    g += patternFill({ type: "pinstripe", a: colors[0], b: colors[1], n: 13 }, x, y, w, h);
  }
  s += `<g clip-path="url(#${id})">${g}</g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="40" fill="none" stroke="${C.cream}" stroke-width="26"/>`;
  if (num) s += (await T(num, { font: "varsity", fill: C.white, h: 1100, cy: y + h * 0.56, stroke: C.ink, sw: 40, shadow: [30, 30, C.ink, 10] })).svg;
  s += (await T(title, { font, fill: kind === "pinstripe" ? C.red : C.white, w: w - 120, cy: num ? y + 230 : y + h / 2, stroke: C.ink, sw: kind === "pinstripe" ? 0 : 40, shadow: kind === "pinstripe" ? [0, 28, C.navy, 8] : [26, 26, C.ink, 8], rot: kind === "pinstripe" ? -8 : 0 })).svg;
  s += (await T(sub, { font: "shoulders", fill: C.cream, w: 2000, top: y + h + 140, ls: 0.1 })).svg;
  await out(name, s, { seed, wear: 0.45 });
}

async function retroBalon() {
  let s = "";
  s += halftone({ x: 120, y: 120, w: W - 240, h: 2300, cell: 54, angle: 15, fill: C.oldgold, f: (u, v) => 1 - Math.hypot(u - 0.5, v - 0.5) * 2 });
  s += ball(W / 2, 1270, 900, { fill: C.cream, patch: C.red, line: C.ink, sw: 30, rot: 8 });
  s += (await T("BALÓN DE CUERO", { font: "anton", fill: C.white, w: 2200, top: 2350, sy: 1.1, shadow: [0, 26, C.red, 8] })).svg;
  s += (await T("FÚTBOL DE LOS DE ANTES", { font: "inter", fill: C.oldgold, w: 1700, top: 2960, ls: 0.06 })).svg;
  await out("retro-balon", s, { seed: 141, wear: 0.45 });
}

/* ═════════════════════════ KIDS ═════════════════════════ */

async function pequenoCampeon(tone) {
  const dark = tone === "dark";
  let s = "";
  s += star(W / 2, 1150, 1080, C.gold, `stroke="${dark ? C.white : C.ink}" stroke-width="34" stroke-linejoin="round"`);
  s += (await T("PEQUEÑO", { font: "bungee", fill: C.white, w: 1500, cy: 1040, stroke: C.red, sw: 44 })).svg;
  s += (await T("CAMPEÓN", { font: "bungee", fill: C.red, w: 2100, top: 2150, stroke: dark ? C.white : C.ink, sw: 36, shadow: [0, 30, dark ? C.white : C.ink, 8] })).svg;
  s += star(W / 2 - 220, 2780, 100, dark ? C.white : C.red) + star(W / 2 + 220, 2780, 100, dark ? C.white : C.red);
  await out(`pequeno-campeon-${dark ? "noche" : "dia"}`, s, { seed: 151, wear: 0.15 });
}

async function primerPartido() {
  let s = "";
  s += ball(W / 2, 900, 720, { fill: C.white, patch: C.red, line: C.ink, sw: 30 });
  s += (await T("MI PRIMER", { font: "bungee", fill: C.ink, w: 2000, top: 1800 })).svg;
  s += (await T("PARTIDO", { font: "bungee", fill: C.red, w: 2200, top: 2200, shadow: [0, 26, C.gold, 8] })).svg;
  s += (await T("GRADA · BUFANDA · GOL", { font: "inter", fill: C.ink, w: 1700, top: 2720, ls: 0.06 })).svg;
  await out("mi-primer-partido", s, { seed: 161, wear: 0.12 });
}

async function futuroDiez() {
  let s = "";
  s += (await T("FUTURO", { font: "shoulders", fill: C.white, w: 1700, top: 150, ls: 0.1 })).svg;
  s += (await T("10", { font: "varsity", fill: C.gold, h: 1700, top: 650, stroke: C.red, sw: 44, shadow: [36, 36, "#7a0a1c", 12] })).svg;
  s += (await T("CRACK EN PRÁCTICAS", { font: "anton", fill: C.white, w: 2000, top: 2560, ls: 0.06 })).svg;
  await out("futuro-diez", s, { seed: 171, wear: 0.25 });
}

/* ═════════════════════════ COLORES DE MI CIUDAD ═════════════════════════ */
// cp: province code of the city (plain fact, printed as the shirt number). No club names anywhere.
// pat: shirt pattern; trim: collar/cuffs; name: lettering colour on black; num: [fill, outline, shadow].
const CITIES = JSON.parse(await readFile(new URL("../src/lib/catalog/futbol-cities.json", import.meta.url), "utf8"));

async function cityFront(c, i) {
  let s = "";
  // city name across the top
  const nm = await T(c.name, { font: "anton", fill: c.name2, w: 1960, h: 560, sy: 1.25, top: 200 });
  s += nm.svg;
  // the shirt (outline included) keeps clear of the side seams
  const sx = 290, sy = nm.box.y + nm.box.h + 100, sw = W - 580, sh = 1760;
  const id = nid("sh");
  s += `<clipPath id="${id}"><path d="${shirtPath(sx, sy, sw, sh)}"/></clipPath>`;
  s += `<path d="${shirtPath(sx, sy, sw, sh)}" fill="none" stroke="${C.cream}" stroke-width="56" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${id})">${patternFill(c.pat, sx, sy, sw, sh)}</g>`;
  s += shirtNeck(sx, sy, sw, sh, c.trim, 70) + shirtCuffs(sx, sy, sw, sh, c.trim, 60);
  const [nf, no, ns] = c.num;
  s += (await T(c.cp, { font: "varsity", fill: nf, h: 820, w: sw * 0.5, cy: sy + sh * 0.62, stroke: no, sw: 34, shadow: [24, 24, ns, 10] })).svg;
  // scarf band under the shirt
  s += await scarf({ x: 420, y: sy + sh + 100, w: W - 840, h: 260, base: c.trim, stripe: c.accent === c.trim ? C.white : c.accent, rib: null, text: "COLORES DE MI CIUDAD", textFill: c.trim === "#ffffff" || c.trim === "#ffe14d" ? C.ink : c.accent === c.trim ? C.white : c.accent, fringe: true, textW: 0.86, ls: 0.05 });
  await out(`ciudad-${c.key}`, s, { seed: 200 + i, wear: 0.18 });
}

/**
 * Back: city name and number as ONE block in the upper-middle of the back (print audit 2026-10-04).
 * The first edition ran a 1900 px numeral edge to edge with heavy wear: on hoodies the hood and the side
 * seams hid parts of it and the texture ate the strokes. Now: numeral 1370 px (−28 %), width ≤ 75 % of the
 * print area, block from 11 % down (clear of the hood seam), light wear, outlines that read on black.
 */
async function cityBack(c, i) {
  let s = "";
  const nm = await T(c.name, { font: "shoulders", fill: c.name2, w: 1640, h: 400, top: 350, ls: 0.06 });
  s += nm.svg;
  const [nf, no, ns] = c.num;
  // on black the number reads in the city's lightest colour with the strong colour as outline
  const fill = nf === "#111111" || nf === "#14213d" || nf === "#1c2c5b" ? no : nf;
  let stroke = fill === no ? (nf === "#111111" ? c.accent : nf) : no;
  if (stroke === fill) stroke = C.cream;
  stroke = onDark(stroke, c.name2 === fill ? C.cream : c.name2);
  const num = await T(c.cp, { font: "varsity", fill, h: 1370, w: 1800, top: nm.box.y + nm.box.h + 130, stroke, sw: 34, shadow: [24, 24, onDark(ns, "#2a2a2a"), 10] });
  s += num.svg;
  s += rect(W / 2 - 520, num.box.y + num.box.h + 120, 1040, 26, c.accent === "#ffffff" ? (c.pat.a === "#ffffff" ? c.trim : c.pat.a) : c.accent);
  await out(`ciudad-${c.key}-espalda`, s, { seed: 300 + i, wear: 0.1 });
}

/* ═════════════════════════ ALL-OVER JERSEYS (sublimation) ═════════════════════════ */
// Full-bleed city patterns that dissolve into halftone towards the hem — a modern take, never a kit replica.
const AOP = ["madrid", "madrid-rojiblanco", "barcelona", "sevilla", "sevilla-verdiblanco", "bilbao", "valencia", "donostia", "coruna", "cadiz"];

async function aopPattern(c, i) {
  const p = c.pat.type === "solid" ? { type: "pinstripe", a: c.pat.a, b: c.trim, n: 9 } : c.pat;
  let s = patternFill(p, 0, 0, W, H);
  // dissolve: dots of the base colour eat the pattern towards the hem
  s += halftone({ x: 0, y: H * 0.55, w: W, h: H * 0.45, cell: 60, angle: 45, fill: c.pat.type === "solid" ? c.pat.a : c.trim, f: (u, v) => v * 1.25 - 0.1 });
  s += rect(0, H * 0.985, W, H * 0.015, c.trim);
  await out(`camiseta-${c.key}-patron`, s, { cover: true, wear: 0, seed: 400 + i });
}
async function aopFront(c, i) {
  let s = "";
  const ink = c.pat.a === "#ffffff" || c.pat.a === "#ffd400" || c.pat.a === "#ffe14d" ? c.trim : C.white;
  s += (await T(c.name, { font: "anton", fill: ink, w: 1500, h: 380, cy: 1150, stroke: ink === C.white ? c.trim : C.white, sw: 26, ls: 0.04 })).svg;
  s += (await T(c.cp, { font: "varsity", fill: ink, h: 280, cx: 1640, top: 460, stroke: ink === C.white ? c.trim : C.white, sw: 18 })).svg;
  await out(`camiseta-${c.key}-frente`, s, { wear: 0, seed: 500 + i });
}
async function aopBack(c, i) {
  let s = "";
  const ink = c.pat.a === "#ffffff" || c.pat.a === "#ffd400" || c.pat.a === "#ffe14d" ? c.trim : C.white;
  // name + number as one block, ~28 % smaller numeral, well inside the panel (it is cover-cropped and sewn)
  const nm = await T(c.name, { font: "shoulders", fill: ink, w: 1440, h: 340, top: 480, ls: 0.06, stroke: ink === C.white ? c.trim : C.white, sw: 22 });
  s += nm.svg;
  s += (await T(c.cp, { font: "varsity", fill: ink, h: 980, w: 1500, top: nm.box.y + nm.box.h + 120, stroke: ink === C.white ? c.trim : C.white, sw: 34 })).svg;
  await out(`camiseta-${c.key}-dorsal`, s, { wear: 0, seed: 600 + i });
}

/* ═════════════════════════ run ═════════════════════════ */
await mkdir(OUT, { recursive: true });
const t0 = Date.now();
for (const tone of ["dark", "light"]) {
  await campeonesMundo(tone);
  await campeonesScript(tone);
  await badgeDosEstrellas(tone);
  await dosFechas(tone);
  await campeonesEspalda(tone);
  await miEquipo(tone);
  await pequenoCampeon(tone);
}
await campeonesBandas();
await bufandaEspana();
await hastaElFinal();
await aficionEstadio();
await noventaMinutos();
await siempreContigo();
await domingoPartido();
await retroPanel("retro-90-espana", { colors: [C.red, C.gold, C.navy, "#ffffff", "#7a0a1c"], title: "ESPAÑA", sub: "EDICIÓN RETRO · AÑOS 90", seed: 181, kind: "shards" });
await retroPanel("retro-portero", { colors: ["#1b1464", "#00a99d", "#ffd400", "#ff2e88", "#7cdc3c"], title: "PORTERO", num: "1", sub: "EL ÚLTIMO EN RENDIRSE", seed: 191, kind: "zigzag" });
await retroPanel("retro-club-de-barrio", { colors: [C.cream, C.navy], title: "Fútbol", font: "script", sub: "CLUB DE BARRIO · DESDE SIEMPRE", seed: 195, kind: "pinstripe" });
await retroBalon();
await primerPartido();
await futuroDiez();
for (const [i, c] of CITIES.entries()) {
  await cityFront(c, i);
  await cityBack(c, i);
}
for (const [i, key] of AOP.entries()) {
  const c = CITIES.find((x) => x.key === key);
  await aopPattern(c, i);
  await aopFront(c, i);
  await aopBack(c, i);
}

// merge (never drop other agents' / scripts' entries)
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
Object.assign(manifest, manifestAdds);
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
let prev = {};
try {
  prev = JSON.parse(await readFile(PLACEMENT, "utf8"));
} catch {}
await writeFile(PLACEMENT, JSON.stringify({ ...prev, ...placement }, null, 1) + "\n");
console.log(SHOTS.join("\n"));
console.log(`${SHOTS.length} files · ${((Date.now() - t0) / 1000).toFixed(0)} s`);

/**
 * Ornaments for the "Refranero y sabiduría" series (src/lib/catalog/sabiduria.ts): transparent,
 * trimmed PNGs in public/catalog/art (sab-*.png). Original vector artwork drawn for ROJO Y GUALDA.
 * The badge / seal rings carry their curved lettering baked in (Cinzel from the print fonts), so the
 * designs keep every editable text as a plain straight layer and stay within the designer's 8 layers.
 * Aspects are MERGED into src/lib/catalog/art-manifest.json (other scripts' entries are kept).
 *
 *   FONTCONFIG_FILE=<conf pointing at src/lib/personalization/fonts> node scripts/sabiduria-art.mjs
 * (the fontconfig file is only needed for the lettered rings; the script writes one to /tmp if unset)
 */
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";

const OUT = new URL("../public/catalog/art/", import.meta.url);
const MANIFEST = new URL("../src/lib/catalog/art-manifest.json", import.meta.url);
const FONTS = fileURLToPath(new URL("../src/lib/personalization/fonts/", import.meta.url));
const SIZE = 1800;

const C = {
  ink: "#1c1a17",
  red: "#a3162b",
  red2: "#d23a3a",
  gold: "#b8892a",
  gold2: "#e0b44a",
  cream: "#f3ead7",
  blue: "#1d4e89",
  blue2: "#2f6db3",
  ochre: "#d89a2b",
  tile: "#fbf8f1",
  yellow: "#ffc400",
  navy: "#14213d",
};

const rad = (d) => (d * Math.PI) / 180;
const f = (n) => n.toFixed(1);

/* ───────── glyph advances (measured once with the real print font) ───────── */
const advCache = new Map();
async function advance(ch, family, file) {
  const k = `${family}:${ch}`;
  if (advCache.has(k)) return advCache.get(k);
  let w = 30; // space
  if (ch.trim()) {
    const img = await sharp({ text: { text: ch.replace("&", "&amp;").replace("<", "&lt;"), font: `${family} 200`, fontfile: path.join(FONTS, file), dpi: 72, rgba: true } }).png().toBuffer({ resolveWithObject: true });
    w = (img.info.width / 200) * 100;
  }
  advCache.set(k, w);
  return w;
}

/**
 * Lettering along a circle arc (each glyph rotated tangentially). `top` text reads clockwise over
 * the top; bottom text reads left→right along the bottom with glyph tops towards the centre.
 */
async function arcText(text, { r, size, color, top = true, track = 0.18, family = "Cinzel", file = "Cinzel_700Bold.ttf", weight = 700 }) {
  const chars = [...text];
  const adv = [];
  for (const ch of chars) adv.push(((await advance(ch, family, file)) / 100) * size + track * size);
  const total = adv.reduce((a, b) => a + b, 0) - track * size;
  const span = (total / r) * (180 / Math.PI); // degrees
  let out = "";
  let a = top ? -90 - span / 2 : 90 + span / 2;
  for (let i = 0; i < chars.length; i++) {
    const half = ((adv[i] - track * size) / 2 / r) * (180 / Math.PI);
    const mid = top ? a + half : a - half;
    const x = 500 + r * Math.cos(rad(mid)), y = 500 + r * Math.sin(rad(mid));
    const rot = top ? mid + 90 : mid - 90;
    if (chars[i].trim()) out += `<text x="${f(x)}" y="${f(y)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" text-anchor="middle" dominant-baseline="central" font-family="${family}" font-weight="${weight}" font-size="${size}" fill="${color}">${chars[i]}</text>`;
    const step = (adv[i] / r) * (180 / Math.PI);
    a = top ? a + step : a - step;
  }
  return out;
}

const star = (cx, cy, r, color, rot = -90) => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r;
    const ang = rad(rot + i * 36);
    d += `${i ? "L" : "M"}${f(cx + rr * Math.cos(ang))} ${f(cy + rr * Math.sin(ang))} `;
  }
  return `<path d="${d}Z" fill="${color}"/>`;
};
const sparkle = (cx, cy, r, color) => `<path d="M${cx} ${cy - r} C ${cx + r * 0.12} ${cy - r * 0.12}, ${cx + r * 0.12} ${cy - r * 0.12}, ${cx + r} ${cy} C ${cx + r * 0.12} ${cy + r * 0.12}, ${cx + r * 0.12} ${cy + r * 0.12}, ${cx} ${cy + r} C ${cx - r * 0.12} ${cy + r * 0.12}, ${cx - r * 0.12} ${cy + r * 0.12}, ${cx - r} ${cy} C ${cx - r * 0.12} ${cy - r * 0.12}, ${cx - r * 0.12} ${cy - r * 0.12}, ${cx} ${cy - r} Z" fill="${color}"/>`;
const heart = (cx, cy, s, color) => `<path d="M${cx} ${cy + s * 0.9} C ${cx - s * 1.5} ${cy - s * 0.1}, ${cx - s * 0.9} ${cy - s * 1.25}, ${cx} ${cy - s * 0.45} C ${cx + s * 0.9} ${cy - s * 1.25}, ${cx + s * 1.5} ${cy - s * 0.1}, ${cx} ${cy + s * 0.9} Z" fill="${color}"/>`;

/* ───────── motifs (viewBox 0 0 1000 1000 unless noted) ───────── */

/** Divider: two tapered rules, a centre lozenge and two pearls. */
const fleuron = ({ a, b = a }) =>
  `<path d="M60 500 L405 492 L405 508 Z" fill="${a}"/><path d="M940 500 L595 492 L595 508 Z" fill="${a}"/>
   <path d="M500 448 L548 500 L500 552 L452 500 Z" fill="${b}"/><path d="M500 474 L524 500 L500 526 L476 500 Z" fill="${a === b ? "none" : a}"/>
   <circle cx="428" cy="500" r="13" fill="${a}"/><circle cx="572" cy="500" r="13" fill="${a}"/>`;

/** Calligraphic swash underline: a tapered brush stroke with an upturned tail. */
const swash = ({ a }) =>
  `<path d="M60 572 C 240 534, 500 506, 740 498 C 830 495, 895 478, 945 420 C 935 498, 872 540, 770 548 C 540 560, 300 566, 60 572 Z" fill="${a}"/>
   <circle cx="62" cy="571" r="7" fill="${a}"/>`;

/** Rounded label bar for the split two-colour look. */
const bar = ({ a }) => `<rect x="0" y="390" width="1000" height="220" rx="26" fill="${a}"/>`;

/** Vintage badge ring with baked lettering (top + bottom), stars at the sides. */
const ring = async ({ a, b, top, bottom }) => {
  let s = `<circle cx="500" cy="500" r="470" fill="none" stroke="${a}" stroke-width="22"/><circle cx="500" cy="500" r="436" fill="none" stroke="${a}" stroke-width="6"/>
    <circle cx="500" cy="500" r="318" fill="none" stroke="${a}" stroke-width="6"/><circle cx="500" cy="500" r="300" fill="none" stroke="${a}" stroke-width="14"/>`;
  s += await arcText(top, { r: 377, size: 66, color: a, top: true });
  s += await arcText(bottom, { r: 377, size: 66, color: a, top: false });
  s += star(500 - 377, 500, 26, b) + star(500 + 377, 500, 26, b);
  // pearl ring
  for (let i = 0; i < 72; i++) {
    const ang = rad(i * 5);
    s += `<circle cx="${f(500 + 453 * Math.cos(ang))}" cy="${f(500 + 453 * Math.sin(ang))}" r="4.5" fill="${a}"/>`;
  }
  return s;
};

/** Azulejo frame: glazed square tile, patterned border band, corner rosettes, open centre field. */
const tile = ({ a, b, c }) => {
  const band = 120;
  let s = `<rect x="10" y="10" width="980" height="980" rx="22" fill="${c}"/><rect x="10" y="10" width="980" height="980" rx="22" fill="none" stroke="${a}" stroke-width="10"/>
    <rect x="40" y="40" width="920" height="920" rx="8" fill="none" stroke="${a}" stroke-width="18"/>
    <rect x="${40 + band}" y="${40 + band}" width="${920 - 2 * band}" height="${920 - 2 * band}" fill="none" stroke="${a}" stroke-width="10"/>
    <rect x="${40 + band + 22}" y="${40 + band + 22}" width="${920 - 2 * band - 44}" height="${920 - 2 * band - 44}" fill="none" stroke="${b}" stroke-width="5"/>`;
  // border chain: lozenges + dots along the band centre line
  const mid = 40 + band / 2;
  const chain = (x, y, rot) => `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x} ${y - 30} L${x + 22} ${y} L${x} ${y + 30} L${x - 22} ${y} Z" fill="${a}"/><circle cx="${x}" cy="${y}" r="8" fill="${b}"/></g>`;
  for (let i = 0; i < 9; i++) {
    const t = 200 + i * 75;
    s += chain(t, mid, 90) + chain(t, 1000 - mid, 90) + chain(mid, t, 0) + chain(1000 - mid, t, 0);
    if (i < 8) {
      const u = t + 37.5;
      s += `<circle cx="${u}" cy="${mid}" r="6" fill="${a}"/><circle cx="${u}" cy="${1000 - mid}" r="6" fill="${a}"/><circle cx="${mid}" cy="${u}" r="6" fill="${a}"/><circle cx="${1000 - mid}" cy="${u}" r="6" fill="${a}"/>`;
    }
  }
  // corner rosettes (in the band corners) — four petals + centre
  const ros = (x, y, r) => {
    let p = "";
    for (let k = 0; k < 8; k++) p += `<ellipse cx="${x}" cy="${y - r * 0.55}" rx="${r * 0.2}" ry="${r * 0.45}" fill="${k % 2 ? b : a}" transform="rotate(${k * 45} ${x} ${y})"/>`;
    return p + `<circle cx="${x}" cy="${y}" r="${r * 0.22}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * 0.12}" fill="${a}"/>`;
  };
  for (const [x, y] of [[mid, mid], [1000 - mid, mid], [mid, 1000 - mid], [1000 - mid, 1000 - mid]]) s += ros(x, y, 56);
  // inner corner flourishes (quarter fans inside the field)
  const fi = 40 + band + 22, fo = 1000 - fi;
  const fan = (x, y, sx, sy) => `<path d="M${x} ${y} l ${sx * 70} 0 a ${70} ${70} 0 0 ${sx * sy > 0 ? 1 : 0} ${-sx * 70} ${sy * 70} Z" fill="${a}"/><path d="M${x} ${y} l ${sx * 40} 0 a 40 40 0 0 ${sx * sy > 0 ? 1 : 0} ${-sx * 40} ${sy * 40} Z" fill="${b}"/>`;
  s += fan(fi, fi, 1, 1) + fan(fo, fi, -1, 1) + fan(fi, fo, 1, -1) + fan(fo, fo, -1, -1);
  return s;
};

const ART = [
  ...["ink", "red", "gold", "cream", "gold2", "blue"].map((k) => [`sab-fleuron-${k}`, fleuron, { a: C[k] }, "0 380 1000 240"]),
  ...["red", "gold", "gold2", "ink", "cream", "blue"].map((k) => [`sab-swash-${k}`, swash, { a: C[k] }, "0 380 1000 260"]),
  ...["red", "red2", "ink", "gold2", "blue", "navy"].map((k) => [`sab-bar-${k}`, bar, { a: C[k] }, "0 380 1000 240"]),
  ["sab-badge-ink", ring, { a: C.ink, b: C.red, top: "REFRANERO ESPAÑOL", bottom: "SABIDURÍA DE SIEMPRE" }],
  ["sab-badge-cream", ring, { a: C.cream, b: C.gold2, top: "REFRANERO ESPAÑOL", bottom: "SABIDURÍA DE SIEMPRE" }],
  ["sab-seal-ink", ring, { a: C.ink, b: C.red, top: "ROJO Y GUALDA", bottom: "HECHO EN ESPAÑA" }],
  ["sab-seal-gold", ring, { a: C.gold2, b: C.red2, top: "ROJO Y GUALDA", bottom: "HECHO EN ESPAÑA" }],
  ["sab-tile-blue", tile, { a: C.blue, b: C.blue2, c: C.tile }],
  ["sab-tile-talavera", tile, { a: C.blue, b: C.ochre, c: C.tile }],
  ...["red", "gold2", "yellow", "cream"].map((k) => [`sab-star-${k}`, ({ a }) => star(500, 500, 400, a), { a: C[k] }]),
  ...["red", "gold2", "blue"].map((k) => [`sab-sparkle-${k}`, ({ a }) => sparkle(500, 500, 420, a), { a: C[k] }]),
  ...["red", "red2"].map((k) => [`sab-heart-${k}`, ({ a }) => heart(500, 520, 300, a), { a: C[k] }]),
];

if (!process.env.FONTCONFIG_FILE) {
  const conf = path.join(os.tmpdir(), "sab-fonts.conf");
  await writeFile(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${FONTS}</dir><cachedir>${path.join(os.tmpdir(), "sab-fc-cache")}</cachedir></fontconfig>`);
  console.warn(`FONTCONFIG_FILE not set — re-run with FONTCONFIG_FILE=${conf} so the ring lettering uses Cinzel`);
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
for (const [name, motif, colors, vb = "0 0 1000 1000"] of ART) {
  const [, , vw, vh] = vb.split(" ").map(Number);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${Math.round((SIZE * vh) / vw)}" viewBox="${vb}">${await motif(colors)}</svg>`;
  const png = await sharp(Buffer.from(svg)).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  await writeFile(new URL(`${name}.png`, OUT), png.data);
  manifest[name] = +(png.info.height / png.info.width).toFixed(4);
  console.log(name, manifest[name]);
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

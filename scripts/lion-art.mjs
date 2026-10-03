/**
 * León series art: embroidery-safe lions derived from the brand's lion mark (public/brand/logo-lion.png)
 * plus the flat badge / shield / band shapes the León designs are built with. Writes transparent PNGs to
 * public/catalog/art and merges their aspects into src/lib/catalog/art-manifest.json (keeps every other entry).
 *
 * Embroidery files follow the Corona Bordada rules: flat shapes, hard edges, Printful thread colours only
 * (#A67843 old gold, #CC3333 red, #FFCC00 flag yellow, #FFFFFF white), no gradients, no hairlines.
 *
 *   node scripts/lion-art.mjs        (also run at the end of scripts/catalog-art.mjs)
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../public/catalog/art/", import.meta.url);
const MANIFEST = new URL("../src/lib/catalog/art-manifest.json", import.meta.url);
const SIZE = 1800;

const T = { oldGold: "#A67843", red: "#CC3333", yellow: "#FFCC00", white: "#FFFFFF" };
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/* ───────────── embroidery lions: posterise the brand mark into 1–2 flat thread colours ───────────── */

// label map from the official lion mark: 0 transparent, 1 gold (mane/face), 2 red (flag strands)
async function lionLabels(width = 1500) {
  const src = new URL("../public/brand/logo-lion.png", import.meta.url).pathname;
  const { data, info } = await sharp(src).ensureAlpha().resize({ width, kernel: "lanczos3" }).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  let lab = new Uint8Array(W * H);
  for (let i = 0, p = 0; p < W * H; i += 4, p++) {
    const r = data[i], g = data[i + 1], a = data[i + 3];
    lab[p] = a < 140 ? 0 : r > 120 && g < r * 0.42 ? 2 : 1;
  }
  // majority filter (radius 3): removes slivers and single-pixel noise the digitiser can't stitch
  const R = 3;
  for (let pass = 0; pass < 2; pass++) {
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = [0, 0, 0];
        for (let dy = -R; dy <= R; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) { c[0] += 2 * R + 1; continue; }
          for (let dx = -R; dx <= R; dx++) {
            const xx = x + dx;
            c[xx < 0 || xx >= W ? 0 : lab[yy * W + xx]]++;
          }
        }
        out[y * W + x] = c[0] >= c[1] && c[0] >= c[2] ? 0 : c[1] >= c[2] ? 1 : 2;
      }
    }
    lab = out;
  }
  return { lab, W, H };
}

async function writeLabels(name, { lab, W, H }, colors) {
  const buf = Buffer.alloc(W * H * 4);
  const rgb = colors.map((c) => (c ? hex(c) : null));
  for (let p = 0; p < W * H; p++) {
    const c = rgb[lab[p]];
    if (!c) continue;
    buf[p * 4] = c[0];
    buf[p * 4 + 1] = c[1];
    buf[p * 4 + 2] = c[2];
    buf[p * 4 + 3] = 255;
  }
  const out = await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  await writeFile(new URL(`${name}.png`, OUT), out.data);
  return +(out.info.height / out.info.width).toFixed(4);
}

/* ───────────── flat shapes (viewBox 0 0 1000 1000) ───────────── */

const SHIELD = "M200 150 H800 V470 C800 690 660 810 500 880 C340 810 200 690 200 470 Z";
const M = {
  // heraldic shield: thick border, flat field (embroidery: two thread colours)
  shield: ({ a, b }) => `<path d="${SHIELD}" fill="${a}"/><path d="M244 194 H756 V470 C756 660 636 768 500 832 C364 768 244 660 244 470 Z" fill="${b}"/>`,
  // shield outline only (printed crest: the lion art sits inside)
  shieldline: ({ a }) => `<path d="${SHIELD}" fill="none" stroke="${a}" stroke-width="26" stroke-linejoin="round"/><path d="M236 186 H764 V470 C764 672 640 780 500 846 C360 780 236 672 236 470 Z" fill="none" stroke="${a}" stroke-width="8" stroke-linejoin="round"/>`,
  // rojigualda band: red / yellow / red, rounded ends (1:2:1 like the flag)
  band: ({ a, b }) => `<rect x="40" y="440" width="920" height="120" rx="20" fill="${a}"/><rect x="40" y="470" width="920" height="60" fill="${b}"/>`,
  // vintage round badge: heavy outer ring, beaded inner ring, ribbon across the lower third, two stars
  badge: ({ a, b, c }) => {
    const beads = Array.from({ length: 56 }, (_, i) => {
      const t = (i / 56) * Math.PI * 2;
      return `<circle cx="${(500 + 372 * Math.cos(t)).toFixed(1)}" cy="${(500 + 372 * Math.sin(t)).toFixed(1)}" r="7" fill="${a}"/>`;
    }).join("");
    const star = (cx, cy, r) => {
      const pts = Array.from({ length: 10 }, (_, i) => { const t = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; return `${(cx + rr * Math.cos(t)).toFixed(1)},${(cy + rr * Math.sin(t)).toFixed(1)}`; }).join(" ");
      return `<polygon points="${pts}" fill="${a}"/>`;
    };
    return `<circle cx="500" cy="500" r="440" fill="none" stroke="${a}" stroke-width="34"/><circle cx="500" cy="500" r="404" fill="none" stroke="${a}" stroke-width="8"/>${beads}
      <path d="M60 640 L140 600 L140 760 L60 720 L100 680 Z" fill="${c}"/><path d="M940 640 L860 600 L860 760 L940 720 L900 680 Z" fill="${c}"/>
      <path d="M120 590 H880 V770 H120 Z" fill="${b}"/><path d="M120 590 H880 V770 H120 Z" fill="none" stroke="${a}" stroke-width="12"/>
      <path d="M140 612 H860 M140 748 H860" stroke="${a}" stroke-width="5"/>${star(214, 270, 30)}${star(786, 270, 30)}`;
  },
};

const SHAPES = [
  ["shield-emb", "shield", { a: T.oldGold, b: T.red }],
  ["shieldline-gold", "shieldline", { a: "#d4a62a" }],
  ["shieldline-ink", "shieldline", { a: "#1c1a17" }],
  ["band-emb", "band", { a: T.red, b: T.yellow }],
  ["badge-gold", "badge", { a: "#d4a62a", b: "#111111", c: "#c8102e" }],
  ["badge-ink", "badge", { a: "#1c1a17", b: "#f3ead7", c: "#a3162b" }],
];

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
for (const [name, motif, colors] of SHAPES) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1000 1000">${M[motif](colors)}</svg>`;
  const png = await sharp(Buffer.from(svg)).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  await writeFile(new URL(`${name}.png`, OUT), png.data);
  manifest[name] = +(png.info.height / png.info.width).toFixed(4);
}

const labels = await lionLabels();
const LIONS = [
  ["lion-emb", [null, T.yellow, T.red]], // dark garments: flag yellow mane, red strands
  ["lion-emb-claro", [null, T.oldGold, T.red]], // light garments: old gold + red
  ["lion-emb-oro", [null, T.oldGold, T.oldGold]], // one thread: old gold (minimal)
  ["lion-emb-blanco", [null, T.white, T.white]], // one thread: white (minimal, navy/black)
  ["lion-emb-amarillo", [null, T.yellow, T.yellow]], // one thread: flag yellow (on the red shield)
];
for (const [name, colors] of LIONS) manifest[name] = await writeLabels(name, labels, colors);

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log("lion art:", [...SHAPES.map((s) => s[0]), ...LIONS.map((l) => l[0])].join(", "));

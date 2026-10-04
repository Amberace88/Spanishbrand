/**
 * Garment previews for the STATEMENT line: every design's layers composed on a tee / hoodie /
 * cap silhouette in its garment colours, front and back side by side, as a contact sheet.
 *
 *   node scripts/statement-preview.mjs <out.png> [filter]
 *
 * Reads the designs from src/lib/catalog/statement.ts (through jiti) and the art from
 * public/catalog/art. Imported author illustrations (art-*) live in storage, not in the repo:
 * they are drawn as a hatched placeholder of the right size.
 */
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

process.env.FONTCONFIG_FILE = fileURLToPath(new URL("./fonts/fonts.conf", import.meta.url));
const { default: sharp } = await import("sharp");

const ROOT = new URL("../", import.meta.url);
const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { statementDesigns, GARMENT_HEX } = await jiti.import("../src/lib/catalog/statement.ts");

const outFile = process.argv[2] ?? "contact.png";
const filter = process.argv[3] ?? "";
const designs = statementDesigns().filter((d) => !filter || d.slug.includes(filter) || (d.tags ?? []).includes(filter));

const TW = 520, TH = 600; // one garment view
/** Boxy tee silhouette with sleeves; print area = 12 × 16 in on a ~21 in wide body. */
function teeSvg(color, back = false) {
  const dark = lum(color) < 0.35;
  const sh = dark ? "#ffffff" : "#000000";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">
  <path d="M150 40 L60 80 L10 200 L80 230 L110 170 L110 585 L410 585 L410 170 L440 230 L510 200 L460 80 L370 40 ${back ? "Q260 62 150 40" : "Q260 110 150 40"} Z" fill="${color}" stroke="${dark ? "#00000055" : "#00000022"}" stroke-width="2"/>
  <path d="M150 40 ${back ? "Q260 62 370 40" : "Q260 110 370 40"}" fill="none" stroke="${sh}" stroke-opacity="0.12" stroke-width="10"/>
  <path d="M110 170 L110 585" stroke="${sh}" stroke-opacity="0.05" stroke-width="18"/>
</svg>`;
}
function capSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}"><path d="M70 380 Q80 150 260 140 Q440 150 450 380 Z" fill="${color}" stroke="#00000033" stroke-width="2"/><path d="M40 380 Q260 330 480 380 Q480 440 260 430 Q40 440 40 380 Z" fill="${color}" stroke="#00000044" stroke-width="2"/></svg>`;
}
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const l = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * l((n >> 16) & 255) + 0.7152 * l((n >> 8) & 255) + 0.0722 * l(n & 255);
}

const artCache = new Map();
async function art(path) {
  if (artCache.has(path)) return artCache.get(path);
  let buf = null;
  try {
    buf = await readFile(new URL(`public/catalog/${path}`, ROOT));
  } catch {
    buf = null;
  }
  artCache.set(path, buf);
  return buf;
}

/** Compose layers into a print-area box (left, top, width) — 3:4 canvas. */
async function layersInto(layers, box) {
  const comps = [];
  for (const l of layers) {
    if (l.type !== "image") continue;
    const w = Math.max(2, Math.round(l.w * box.w));
    const h = Math.max(2, Math.round(w * l.aspect));
    const left = Math.round(box.x + l.x * box.w - w / 2), top = Math.round(box.y + l.y * box.w * (4 / 3) - h / 2);
    const buf = await art(l.path);
    const input = buf
      ? await sharp(buf).resize(w, h, { fit: "fill" }).png().toBuffer()
      : await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><pattern id="p" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#9a8a6a"/></pattern></defs><rect width="${w}" height="${h}" fill="#c9b892"/><rect width="${w}" height="${h}" fill="url(#p)"/><text x="${w / 2}" y="${h / 2}" font-family="Inter" font-size="${Math.max(10, w / 12)}" text-anchor="middle" fill="#3a2f1c">${l.path.replace("art/", "")}</text></svg>`)).png().toBuffer();
    comps.push({ input, left, top });
  }
  return comps;
}

async function view(d, color, back) {
  const isCap = d.products.some((p) => ["cap", "dadhat"].includes(p)) && !d.products.includes("tee") && !d.products.includes("embtee");
  if (isCap) {
    const bg = await sharp(Buffer.from(capSvg(color))).png().toBuffer();
    const comps = await layersInto(d.layers, { x: 175, y: 170, w: 170 });
    return sharp(bg).composite(comps.filter((c) => c.left >= 0 && c.top >= 0)).png().toBuffer();
  }
  const bg = await sharp(Buffer.from(teeSvg(color, back))).png().toBuffer();
  const box = { x: 260 - 165, y: back ? 95 : 118, w: 330 };
  const comps = (await layersInto(back ? d.back ?? [] : d.layers, box)).map((c) => ({ ...c, left: Math.max(-4000, c.left), top: Math.max(-4000, c.top) }));
  // clip to the image
  const safe = [];
  for (const c of comps) {
    const m = await sharp(c.input).metadata();
    const x0 = Math.max(0, -c.left), y0 = Math.max(0, -c.top);
    const w = Math.min(m.width - x0, TW - Math.max(0, c.left)), h = Math.min(m.height - y0, TH - Math.max(0, c.top));
    if (w <= 0 || h <= 0) continue;
    safe.push({ input: await sharp(c.input).extract({ left: x0, top: y0, width: w, height: h }).png().toBuffer(), left: Math.max(0, c.left), top: Math.max(0, c.top) });
  }
  return sharp(bg).composite(safe).png().toBuffer();
}

const tiles = [];
for (const d of designs) {
  const cols = (d.colors ?? []).slice(0, 2);
  const hexes = cols.map((c) => GARMENT_HEX[c] ?? "#888888");
  if (!hexes.length) hexes.push(d.tone === "dark" ? "#151515" : "#f4f1ea");
  const views = [await view(d, hexes[0], false)];
  if (d.back) views.push(await view(d, hexes[0], true));
  else if (hexes[1]) views.push(await view(d, hexes[1], false));
  const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW * 2}" height="44"><rect width="100%" height="100%" fill="#ffffff"/><text x="10" y="30" font-family="Inter" font-size="22" fill="#111">${d.slug} · ${cols.join(" / ")}</text></svg>`;
  const tile = await sharp({ create: { width: TW * 2, height: TH + 44, channels: 3, background: "#d9d6cf" } })
    .composite([{ input: await sharp(Buffer.from(label)).png().toBuffer(), left: 0, top: 0 }, ...views.map((v, i) => ({ input: v, left: i * TW, top: 44 }))])
    .png()
    .toBuffer();
  tiles.push(tile);
}
const cols = Math.min(4, tiles.length), rows = Math.ceil(tiles.length / cols);
const tw = TW * 2, th = TH + 44, gap = 12;
await sharp({ create: { width: cols * (tw + gap) + gap, height: rows * (th + gap) + gap, channels: 3, background: "#ffffff" } })
  .composite(tiles.map((t, i) => ({ input: t, left: gap + (i % cols) * (tw + gap), top: gap + Math.floor(i / cols) * (th + gap) })))
  .png()
  .toFile(outFile);
console.log(`${designs.length} designs → ${outFile}`);

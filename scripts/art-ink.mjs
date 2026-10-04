/**
 * Ink manifest of the static print art (public/catalog/art/*.png) → src/lib/catalog/art-ink.json
 *
 *   node scripts/art-ink.mjs
 *
 * For every PNG: the ink bounding box (alpha > 24) as fractions of the image [x0, y0, x1, y1] and a short
 * content hash. Used by lib/catalog/print-safety.ts for
 *  - exact content boxes (art with transparent padding is not treated as ink up to its edges), and
 *  - design versions (a regenerated illustration changes the version of every product that prints it,
 *    so the catalog builder can rebuild already-published products — see catalog-builder.ts).
 *
 * Run it after any art script (futbol-art, statement-art, sabiduria-art, lion-art, catalog-art).
 * tests/print-audit.test.ts fails when the manifest does not match the files on disk.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

const DIR = new URL("../public/catalog/art/", import.meta.url);
const OUT = new URL("../src/lib/catalog/art-ink.json", import.meta.url);

export const artHash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 12);

const files = (await readdir(DIR)).filter((f) => f.endsWith(".png")).sort();
let prev = {};
try {
  prev = JSON.parse(await readFile(OUT, "utf8"));
} catch {}
const out = {};
let changed = 0;
for (const f of files) {
  const buf = await readFile(new URL(f, DIR));
  const hash = artHash(buf);
  const name = f.replace(/\.png$/, "");
  if (prev[name]?.[4] === hash) {
    out[name] = prev[name];
    continue;
  }
  changed++;
  // analyse at ≤ 800 px (exact enough for margins: 1 px = 0.125 % of the image)
  const { data, info } = await sharp(buf).ensureAlpha().resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const box = x1 < 0 ? [0, 0, 1, 1] : [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h].map((v) => +v.toFixed(4));
  out[name] = [...box, hash];
}
await writeFile(OUT, JSON.stringify(out).replace(/\],"/g, '],\n"') + "\n");
console.log(`${files.length} art files · ${changed} (re)measured`);

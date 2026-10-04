/**
 * STATEMENT kit: output, palette and motifs shared by the pieces (scripts/statement-pieces.mjs).
 * Entry point: scripts/statement-art.mjs.
 *
 * STATEMENT — the full-print streetwear line of ROJO Y GUALDA, drawn in code.
 *
 *   node scripts/statement-art.mjs           # everything
 *   node scripts/statement-art.mjs brocha    # only pieces whose name contains "brocha"
 *
 * Series: Brocha y bandera · Spray / Grafiti · Gigante a la espalda · Mínimo de lujo (+ bordados) ·
 * Retro postal · Collage. Engine and print-safety rules: scripts/statement-lib.mjs.
 *
 * Output: public/catalog/art/st-*.png (transparent, binary alpha, palette PNG, ≥ 3000 px long side),
 * placement on the 3:4 print canvas → src/lib/catalog/statement-art.json, aspects merged into
 * art-manifest.json (other entries kept). Designs: src/lib/catalog/statement.ts.
 *
 * Typefaces (SIL OFL / Apache 2.0, scripts/fonts): Anton, Big Shoulders, Graduate, Bungee, Yellowtail,
 * Inter, Permanent Marker, Sedgwick Ave Display, DM Serif Display, Abril Fatface, Shrikhand, Bebas Neue,
 * Caveat Brush, Cinzel, Rubik Spray Paint. Every tag, wordmark and motif is original — no real graffiti
 * tags, no trademarks (the bull is a frontal head, not a roadside silhouette), no official emblems.
 */
import { readFile, writeFile } from "node:fs/promises";
import * as L from "./statement-lib.mjs";

const { sharp, W, H, T, rect, circle, poly, star, brush, brushLine, splatter, spatter, drips, halftone, rays, torn, image, arcText, renderOps, wear, rng, f1, nid } = L;

const OUT = new URL("../public/catalog/art/", import.meta.url);
const MANIFEST = new URL("../src/lib/catalog/art-manifest.json", import.meta.url);
const PLACEMENT = new URL("../src/lib/catalog/statement-art.json", import.meta.url);
const ONLY = process.argv[2] ?? "";

/* ───────────────────────── palette (inks) ───────────────────────── */
export const C = {
  red: "#c8102e", red2: "#d7262f", wine: "#8e1f30", gold: "#f1bf00", gold2: "#ffcf3a", ochre: "#d4a62a", oldgold: "#b8862b",
  cream: "#f3ead7", bone: "#e9dcc0", white: "#ffffff", ink: "#141414", navy: "#14213d", sea: "#1f5f8b", sky: "#7fb8d8",
  terra: "#c4552d", orange: "#e8742a", olive: "#5b6b3a", sand: "#e3cfa4", teal: "#1d7f7a",
};
// Printful embroidery thread colours (flat, ≤ 4 per design)
export const TH = { gold: "#A67843", red: "#CC3333", yellow: "#FFCC00", white: "#FFFFFF", navy: "#1C2340", black: "#000000" };

/* ───────────────────────── output ───────────────────────── */
const placement = {};
const manifestAdds = {};
const LOG = [];
/**
 * Render ops → wear → binary alpha → trim → palette PNG at public/catalog/art/st-<name>.png.
 * region: canvas part to draw (default whole canvas), px: output long side of that region.
 */
async function out(name, ops, { wear: amount = 0.3, seed = 1, region, px, colours = 48 } = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const reg = region ?? [0, 0, W, H];
  let longPx = px ?? (Math.max(reg[2], reg[3]) >= 2000 ? 4800 : 3000);
  let r, t;
  // print files ≥ 3000 px on the long side: small marks are re-rendered at a higher scale until they are
  for (let pass = 0; pass < 3; pass++) {
    r = await renderOps(ops, { region: reg, px: longPx, seed });
    await wear(r.data, r.w, r.h, r.s, seed + 5, amount);
    for (let i = 3; i < r.data.length; i += 4) r.data[i] = r.data[i] > 127 ? 255 : 0;
    const raw = sharp(r.data, { raw: { width: r.w, height: r.h, channels: 4 } });
    t = await raw.png().toBuffer().then((b) => sharp(b).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true }));
    const long = Math.max(t.info.width, t.info.height);
    if (long >= 3000) break;
    longPx = Math.ceil((longPx * 3060) / long);
  }
  const x0 = -(t.info.trimOffsetLeft ?? 0), y0 = -(t.info.trimOffsetTop ?? 0), tw = t.info.width, th = t.info.height;
  const png = await sharp(t.data).png({ palette: true, colours, dither: 0, compressionLevel: 9, effort: 8 }).toBuffer();
  const file = `st-${name}`;
  await writeFile(new URL(`${file}.png`, OUT), png);
  const aspect = +(th / tw).toFixed(4);
  manifestAdds[file] = aspect;
  // centre + width on the 3:4 canvas (the renderer's ImageLayer contract)
  const cx = reg[0] + (x0 + tw / 2) / r.s, cy = reg[1] + (y0 + th / 2) / r.s;
  placement[file] = { aspect, x: +(cx / W).toFixed(4), y: +(cy / H).toFixed(4), w: +(tw / r.s / W).toFixed(4) };
  LOG.push(`${file}.png ${tw}×${th} ${(png.length / 1024).toFixed(0)} KB`);
}
const op = (svg, color, fx = {}) => ({ svg, color, ...fx });
const er = (svg, fx = {}) => ({ svg, erase: true, ...fx });
const ROUGH = { sigma: 2.4, amp: 0.6, grain: 5 };
const ROUGH_HEAVY = { sigma: 4, amp: 0.85, grain: 7 };

/* ───────────────────────── motifs ───────────────────────── */
const lion = {}; // data URIs of the brand lion: full silhouette, gold strands, red strands
async function loadLion() {
  const src = new URL("../public/brand/logo-lion.png", import.meta.url).pathname;
  const { data, info } = await sharp(src).ensureAlpha().resize({ width: 1600, kernel: "lanczos3" }).raw().toBuffer({ resolveWithObject: true });
  const mk = (pick) => {
    const b = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < b.length; i += 4) if (pick(data[i], data[i + 1], data[i + 2], data[i + 3])) b[i + 3] = 255;
    return sharp(b, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer().then((p) => `data:image/png;base64,${p.toString("base64")}`);
  };
  lion.aspect = info.height / info.width;
  lion.all = await mk((r, g, b, a) => a > 140);
  lion.red = await mk((r, g, b, a) => a > 140 && r > 120 && g < r * 0.42);
  lion.gold = await mk((r, g, b, a) => a > 140 && !(r > 120 && g < r * 0.42));
}
/** Brand lion (facing right) as mask: part = all | gold | red. */
const lionImg = (cx, cy, w, part = "all", flip = false) => {
  const h = w * lion.aspect;
  const im = image(lion[part], cx - w / 2, cy - h / 2, w, h);
  return flip ? `<g transform="translate(${f1(cx * 2)} 0) scale(-1 1)">${im}</g>` : im;
};

/** Frontal bull head (toro bravo) in a 1000 box scaled to width w at (cx, cy = box centre). Eyes/nostrils cut. */
function bull(cx, cy, w, { cut = true } = {}) {
  const k = w / 1000;
  const P = (x, y) => `${f1(cx + (x - 500) * k)} ${f1(cy + (y - 500) * k)}`;
  const horn = (s) => {
    const X = (x) => (s < 0 ? x : 1000 - x);
    return `M${P(X(395), 330)} C${P(X(300), 318)} ${P(X(150), 270)} ${P(X(95), 105)} C${P(X(85), 72)} ${P(X(70), 40)} ${P(X(52), 22)} C${P(X(108), 40)} ${P(X(150), 95)} ${P(X(178), 150)} C${P(X(228), 240)} ${P(X(320), 262)} ${P(X(410), 268)} Z`;
  };
  const ear = (s) => {
    const X = (x) => (s < 0 ? x : 1000 - x);
    return `M${P(X(352), 372)} C${P(X(280), 345)} ${P(X(205), 360)} ${P(X(160), 405)} C${P(X(215), 445)} ${P(X(300), 452)} ${P(X(362), 432)} Z`;
  };
  const head = `M${P(360, 285)} C${P(425, 245)} ${P(575, 245)} ${P(640, 285)} C${P(692, 322)} ${P(690, 410)} ${P(672, 480)} C${P(655, 560)} ${P(626, 628)} ${P(616, 696)} C${P(610, 752)} ${P(646, 792)} ${P(646, 846)} C${P(646, 924)} ${P(578, 952)} ${P(500, 952)} C${P(422, 952)} ${P(354, 924)} ${P(354, 846)} C${P(354, 792)} ${P(390, 752)} ${P(384, 696)} C${P(374, 628)} ${P(345, 560)} ${P(328, 480)} C${P(310, 410)} ${P(308, 322)} ${P(360, 285)} Z`;
  // forelock tuft between the horns
  const tuft = `M${P(430, 270)} C${P(450, 222)} ${P(478, 238)} ${P(486, 205)} C${P(500, 232)} ${P(520, 214)} ${P(530, 196)} C${P(540, 236)} ${P(566, 228)} ${P(574, 262)} Z`;
  let s = `<path d="${horn(-1)} ${horn(1)} ${ear(-1)} ${ear(1)} ${head} ${tuft}" fill="#000"/>`;
  if (cut) {
    const eye = (s2) => {
      const X = (x) => (s2 < 0 ? x : 1000 - x);
      return `M${P(X(382), 470)} C${P(X(402), 446)} ${P(X(440), 440)} ${P(X(462), 462)} C${P(X(442), 488)} ${P(X(406), 492)} ${P(X(382), 470)} Z`;
    };
    const nos = (s2) => {
      const X = (x) => (s2 < 0 ? x : 1000 - x);
      return `M${P(X(418), 862)} C${P(X(420), 830)} ${P(X(458), 824)} ${P(X(468), 852)} C${P(X(474), 884)} ${P(X(430), 898)} ${P(X(418), 862)} Z`;
    };
    const blaze = `M${P(500, 330)} L${P(520, 420)} L${P(510, 640)} L${P(500, 700)} L${P(490, 640)} L${P(480, 420)} Z`;
    s += `<path d="${eye(-1)} ${eye(1)} ${nos(-1)} ${nos(1)} ${blaze}" fill="#000" class="cut"/>`;
  }
  return s;
}
/** Bull as one op (head) plus one erase op (features), ready for the stack. */
const bullOps = (cx, cy, w, color, fx = {}) => {
  const s = bull(cx, cy, w);
  const [solid, cut] = s.split(`<path d="`).slice(1).map((p) => `<path d="${p}`);
  return [op(solid, color, fx), er(cut)];
};

/** Heraldic open crown in a 1000 × 760 box, width w, centre (cx, cy). */
function crown(cx, cy, w) {
  const k = w / 1000;
  const P = (x, y) => [cx + (x - 500) * k, cy + (y - 380) * k];
  const pt = (x, y) => P(x, y).map(f1).join(" ");
  let s = "";
  // band
  s += `<path d="M${pt(150, 600)} L${pt(850, 600)} L${pt(840, 700)} Q${pt(500, 735)} ${pt(160, 700)} Z" fill="#000"/>`;
  // arches (5 visible half-arches meeting at the orb)
  s += `<path d="M${pt(150, 590)} C${pt(90, 420)} ${pt(170, 250)} ${pt(330, 230)} C${pt(420, 220)} ${pt(480, 250)} ${pt(500, 230)} C${pt(520, 250)} ${pt(580, 220)} ${pt(670, 230)} C${pt(830, 250)} ${pt(910, 420)} ${pt(850, 590)} L${pt(790, 590)} C${pt(830, 450)} ${pt(780, 320)} ${pt(670, 300)} C${pt(590, 290)} ${pt(540, 320)} ${pt(530, 360)} L${pt(530, 590)} L${pt(470, 590)} L${pt(470, 360)} C${pt(460, 320)} ${pt(410, 290)} ${pt(330, 300)} C${pt(220, 320)} ${pt(170, 450)} ${pt(210, 590)} Z" fill="#000"/>`;
  // inner arches
  s += `<path d="M${pt(300, 590)} C${pt(290, 470)} ${pt(330, 390)} ${pt(400, 370)} L${pt(415, 410)} C${pt(365, 430)} ${pt(345, 500)} ${pt(355, 590)} Z" fill="#000"/>`;
  s += `<path d="M${pt(700, 590)} C${pt(710, 470)} ${pt(670, 390)} ${pt(600, 370)} L${pt(585, 410)} C${pt(635, 430)} ${pt(655, 500)} ${pt(645, 590)} Z" fill="#000"/>`;
  // orb + cross
  const [ox, oy] = P(500, 170);
  s += circle(ox, oy, 62 * k, `fill="#000"`);
  s += `<path d="M${pt(482, 40)} L${pt(518, 40)} L${pt(518, 72)} L${pt(550, 72)} L${pt(550, 104)} L${pt(518, 104)} L${pt(518, 125)} L${pt(482, 125)} L${pt(482, 104)} L${pt(450, 104)} L${pt(450, 72)} L${pt(482, 72)} Z" fill="#000"/>`;
  // pearls on the rim of the arches
  for (const [x, y] of [[150, 560], [175, 380], [330, 262], [670, 262], [825, 380], [850, 560], [500, 270]]) {
    const [px, py] = P(x, y);
    s += circle(px, py, 30 * k, `fill="#000"`);
  }
  // fleurons on the band
  for (const x of [200, 350, 500, 650, 800]) {
    const [px, py] = P(x, 600);
    s += `<path d="M${f1(px)} ${f1(py - 95 * k)} C${f1(px + 40 * k)} ${f1(py - 55 * k)} ${f1(px + 30 * k)} ${f1(py - 20 * k)} ${f1(px)} ${f1(py)} C${f1(px - 30 * k)} ${f1(py - 20 * k)} ${f1(px - 40 * k)} ${f1(py - 55 * k)} ${f1(px)} ${f1(py - 95 * k)} Z" fill="#000"/>`;
  }
  return s;
}
/** Crown band jewels (to erase or recolour). */
function crownJewels(cx, cy, w) {
  const k = w / 1000;
  let s = "";
  for (const [x, r] of [[250, 26], [375, 20], [500, 30], [625, 20], [750, 26]]) s += circle(cx + (x - 500) * k, cy + (655 - 380) * k, r * k, `fill="#000"`);
  return s;
}

/** Sun: disc + 24 alternating straight / flame rays. */
function sun(cx, cy, R, { n = 24, inner = 0.48, disc = 0.4 } = {}) {
  let s = circle(cx, cy, R * disc, `fill="#000"`);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const long = i % 2 === 0;
    const r1 = R * (long ? 1 : 0.8), r0 = R * inner, da = (Math.PI / n) * (long ? 0.42 : 0.34);
    if (long) s += poly([[cx + r0 * Math.cos(a - da), cy + r0 * Math.sin(a - da)], [cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)], [cx + r0 * Math.cos(a + da), cy + r0 * Math.sin(a + da)]], `fill="#000"`);
    else {
      const m = R * (inner + 0.18), b = Math.PI / n * 0.5;
      s += `<path d="M${f1(cx + r0 * Math.cos(a - da))} ${f1(cy + r0 * Math.sin(a - da))} Q${f1(cx + m * Math.cos(a + b))} ${f1(cy + m * Math.sin(a + b))} ${f1(cx + r1 * Math.cos(a))} ${f1(cy + r1 * Math.sin(a))} Q${f1(cx + m * Math.cos(a - b * 0.2))} ${f1(cy + m * Math.sin(a - b * 0.2))} ${f1(cx + r0 * Math.cos(a + da))} ${f1(cy + r0 * Math.sin(a + da))} Z" fill="#000"/>`;
    }
  }
  return s;
}

/** Galleon under sail (side view) in a 1000 × 1000 box. Returns { hull, sails, rig }. */
function galleon(cx, cy, w) {
  const k = w / 1000;
  const pt = (x, y) => `${f1(cx + (x - 500) * k)} ${f1(cy + (y - 500) * k)}`;
  const hull = `<path d="M${pt(70, 690)} L${pt(140, 690)} L${pt(170, 650)} L${pt(860, 650)} L${pt(880, 590)} L${pt(960, 585)} L${pt(940, 660)} C${pt(900, 760)} ${pt(820, 810)} ${pt(700, 815)} L${pt(270, 815)} C${pt(180, 805)} ${pt(110, 760)} ${pt(70, 690)} Z" fill="#000"/>`;
  const sail = (x, top, bot, wd) => `<path d="M${pt(x - wd / 2, top)} C${pt(x - wd / 2 - 18, (top + bot) / 2)} ${pt(x - wd / 2 - 18, (top + bot) / 2)} ${pt(x - wd / 2 + 8, bot)} Q${pt(x, bot + 34)} ${pt(x + wd / 2 - 8, bot)} C${pt(x + wd / 2 + 26, (top + bot) / 2)} ${pt(x + wd / 2 + 26, (top + bot) / 2)} ${pt(x + wd / 2, top)} Q${pt(x, top + 26)} ${pt(x - wd / 2, top)} Z" fill="#000"/>`;
  let sails = "";
  sails += sail(300, 300, 450, 200) + sail(300, 480, 620, 240);
  sails += sail(540, 200, 370, 230) + sail(540, 400, 620, 280);
  sails += sail(760, 330, 460, 170) + sail(760, 490, 620, 200);
  sails += `<path d="M${pt(880, 560)} L${pt(990, 600)} L${pt(880, 440)} Z" fill="#000"/>`; // jib
  let rig = "";
  for (const [x, top] of [[300, 220], [540, 110], [760, 260]]) rig += rect(cx + (x - 500 - 9) * k, cy + (top - 500) * k, 18 * k, (660 - top) * k, `fill="#000"`);
  for (const [x, top] of [[300, 220], [540, 110], [760, 260]]) rig += `<path d="M${pt(x, top)} L${pt(x + 70, top + 22)} L${pt(x, top + 44)} Z" fill="#000"/>`; // pennants
  rig += `<path d="M${pt(870, 600)} L${pt(990, 560)}" stroke="#000" stroke-width="${f1(14 * k)}"/>`;
  return { hull, sails, rig };
}

/** Horseshoe (Nasrid) arch opening: returns path d of the opening in box x, y, w, h. */
function archD(x, y, w, h) {
  const r = w / 2, cx = x + r, spring = y + r * 1.05;
  return `M${f1(x + w * 0.06)} ${f1(y + h)} L${f1(x + w * 0.06)} ${f1(spring + r * 0.2)} A${f1(r)} ${f1(r)} 0 1 1 ${f1(x + w * 0.94)} ${f1(spring + r * 0.2)} L${f1(x + w * 0.94)} ${f1(y + h)} Z`;
}

/** Spanish fan (abanico) opened 150°: ribs + scalloped leaf. Returns { leaf, ribs, guard }. */
function fan(cx, cy, R, { n = 15, open = 150 } = {}) {
  const a0 = (-90 - open / 2) * (Math.PI / 180), a1 = (-90 + open / 2) * (Math.PI / 180);
  const r0 = R * 0.34;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    if (!i) d += `M${f1(cx + r0 * Math.cos(a))} ${f1(cy + r0 * Math.sin(a))} L${f1(x)} ${f1(y)}`;
    else {
      const am = a - (a1 - a0) / n / 2, rm = R * 1.06;
      d += ` Q${f1(cx + rm * Math.cos(am))} ${f1(cy + rm * Math.sin(am))} ${f1(x)} ${f1(y)}`;
    }
  }
  d += ` L${f1(cx + r0 * Math.cos(a1))} ${f1(cy + r0 * Math.sin(a1))} A${f1(r0)} ${f1(r0)} 0 0 0 ${f1(cx + r0 * Math.cos(a0))} ${f1(cy + r0 * Math.sin(a0))} Z`;
  const leaf = `<path d="${d}" fill="#000"/>`;
  let ribs = "";
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    ribs += `<line x1="${f1(cx)}" y1="${f1(cy)}" x2="${f1(cx + R * 0.98 * Math.cos(a))}" y2="${f1(cy + R * 0.98 * Math.sin(a))}" stroke="#000" stroke-width="${f1(R * 0.018)}" stroke-linecap="round"/>`;
  }
  const guard = circle(cx, cy, R * 0.07, `fill="#000"`);
  return { leaf, ribs, guard, a0, a1, r0 };
}

/** Palm tree: curved trunk + fronds. */
function palm(x, y, h, { lean = 0.18, seed = 1 } = {}) {
  const r = rng(seed);
  const tx = x + h * lean, ty = y - h;
  let s = `<path d="M${f1(x - h * 0.035)} ${f1(y)} Q${f1(x + h * lean * 0.2)} ${f1(y - h * 0.5)} ${f1(tx - h * 0.018)} ${f1(ty)} L${f1(tx + h * 0.018)} ${f1(ty)} Q${f1(x + h * lean * 0.2 + h * 0.05)} ${f1(y - h * 0.5)} ${f1(x + h * 0.035)} ${f1(y)} Z" fill="#000"/>`;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i / 8) * Math.PI + (r() - 0.5) * 0.2;
    const len = h * (0.36 + r() * 0.14);
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + len * 0.28;
    const mx = tx + Math.cos(a) * len * 0.5, my = ty + Math.sin(a) * len * 0.5 - len * 0.12;
    const wd = h * 0.045;
    s += `<path d="M${f1(tx)} ${f1(ty)} Q${f1(mx - wd * Math.sin(a))} ${f1(my - wd)} ${f1(ex)} ${f1(ey)} Q${f1(mx + wd * Math.sin(a))} ${f1(my + wd * 0.6)} ${f1(tx)} ${f1(ty)} Z" fill="#000"/>`;
  }
  return s;
}

/** Lighthouse: tapered tower, gallery, lantern. Returns { tower, bands, lamp }. */
function lighthouse(cx, base, h) {
  const bw = h * 0.2, tw = h * 0.13, top = base - h * 0.78;
  const tower = poly([[cx - bw / 2, base], [cx - tw / 2, top], [cx + tw / 2, top], [cx + bw / 2, base]], `fill="#000"`) + rect(cx - tw * 0.75, top - h * 0.03, tw * 1.5, h * 0.03, `fill="#000"`) + rect(cx - tw * 0.38, top - h * 0.13, tw * 0.76, h * 0.1, `fill="#000"`) + `<path d="M${f1(cx - tw * 0.5)} ${f1(top - h * 0.13)} Q${f1(cx)} ${f1(top - h * 0.24)} ${f1(cx + tw * 0.5)} ${f1(top - h * 0.13)} Z" fill="#000"/>`;
  let bands = "";
  for (let i = 0; i < 3; i++) {
    const y0 = base - h * (0.18 + i * 0.22), y1 = y0 - h * 0.1;
    const wAt = (y) => bw + ((tw - bw) * (base - y)) / (base - top);
    bands += poly([[cx - wAt(y0) / 2, y0], [cx - wAt(y1) / 2, y1], [cx + wAt(y1) / 2, y1], [cx + wAt(y0) / 2, y0]], `fill="#000"`);
  }
  const lamp = rect(cx - tw * 0.24, top - h * 0.115, tw * 0.48, h * 0.07, `fill="#000"`);
  return { tower, bands, lamp, top: top - h * 0.08 };
}

/** Wave band (scalloped sea) across [x0, x1]. */
function waves(x0, x1, y, amp, period, thick) {
  let d = `M${f1(x0)} ${f1(y)}`;
  for (let x = x0; x < x1; x += period) d += ` Q${f1(x + period / 4)} ${f1(y - amp)} ${f1(x + period / 2)} ${f1(y)} T${f1(x + period)} ${f1(y)}`;
  d += ` L${f1(x1)} ${f1(y + thick)}`;
  for (let x = x1; x > x0; x -= period) d += ` Q${f1(x - period / 4)} ${f1(y + thick - amp)} ${f1(x - period / 2)} ${f1(y + thick)} T${f1(x - period)} ${f1(y + thick)}`;
  return `<path d="${d} Z" fill="#000"/>`;
}

/** Stencil cut bars over text (vertical bridges at given x positions). */
const bridges = (xs, y, h, w = 26) => xs.map((x) => rect(x - w / 2, y, w, h, `fill="#000"`)).join("");

export { out, op, er, ROUGH, ROUGH_HEAVY, lionImg, bull, bullOps, crown, crownJewels, sun, galleon, archD, fan, palm, lighthouse, waves, bridges, loadLion, placement, manifestAdds, LOG, ONLY, MANIFEST, PLACEMENT };


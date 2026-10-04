/**
 * STATEMENT pieces — one async function per artwork, composed from the kit's motifs.
 * Coordinates: 2400 × 3200 print canvas (12 × 16 in). Chest marks sit at the wearer's left
 * chest (centre ≈ 1730, 460) and render from a small region, re-scaled to ≥ 3000 px.
 * Names → public/catalog/art/st-<name>.png; designs that use them: src/lib/catalog/statement.ts.
 */
import * as L from "./statement-lib.mjs";
import * as K from "./statement-kit.mjs";

const { W, T, rect, circle, poly, star, brush, brushLine, splatter, spatter, drips, halftone, rays, torn, arcText, f1, nid } = L;
const { C, TH, out, op, er, ROUGH, ROUGH_HEAVY, lionImg, bullOps, crown, crownJewels, sun, galleon, archD, fan, palm, lighthouse, waves, bridges } = K;

const CHEST = [1380, 180, 700, 560]; // left-chest region
const MC = { cx: 1730, cy: 450 }; // its centre
const SOFT = { sigma: 1.5, amp: 0.45, grain: 4 };
const SPRAY = { sigma: 22, density: 0.8, dot: 2.4 };
/** Text op. */
const tx = async (text, o, color, fx = {}) => op((await T(text, o)).svg, color, fx);
const sfx = (tone) => (tone === "dark" ? "noche" : "dia");

/* ═════════════════════════ BROCHA Y BANDERA ═════════════════════════ */
async function brochaEspana(tone) {
  const ink = tone === "dark" ? C.cream : C.ink;
  await out(`brocha-espana-${sfx(tone)}`, [
    op(brushLine(60, 980, 2340, 760, 640, { seed: 3, bow: 0.05 }), C.red, { rough: ROUGH }),
    op(brushLine(2360, 1520, 40, 1420, 560, { seed: 7, bow: -0.04 }), C.gold, { rough: ROUGH }),
    op(brushLine(120, 2080, 2200, 1960, 300, { seed: 11, bow: 0.06, dry: 0.8 }), C.red, { rough: ROUGH }),
    op(splatter(2080, 520, 80, { seed: 4, drops: 30 }) + splatter(330, 2280, 60, { seed: 9, drops: 24 }), C.red, { rough: SOFT }),
    op(spatter(100, 300, 2200, 2300, 70, { seed: 12, max: 22 }), C.gold),
    await tx("ESPAÑA", { font: "anton", w: 2240, sy: 1.18, cy: 1240, rot: -4 }, ink, { rough: SOFT }),
    await tx("HECHO EN ESPAÑA · DESDE SIEMPRE", { font: "inter", w: 1500, top: 2320, ls: 0.12 }, ink),
  ], { seed: 21, wear: 0.32 });
}

async function brochaLeon(tone) {
  const ink = tone === "dark" ? C.cream : C.ink;
  await out(`brocha-leon-${sfx(tone)}`, [
    op(brushLine(80, 700, 2300, 1500, 700, { seed: 13, bow: 0.08 }), C.red, { rough: ROUGH_HEAVY }),
    op(brushLine(2250, 520, 200, 1900, 520, { seed: 17, bow: -0.06, dry: 0.7 }), C.gold, { rough: ROUGH_HEAVY }),
    op(splatter(1900, 1950, 95, { seed: 5, drops: 34 }), C.red, { rough: SOFT }),
    op(spatter(150, 250, 2100, 2100, 60, { seed: 14 }), C.gold),
    op(lionImg(1180, 1170, 1650), ink, { rough: SOFT }),
    er(lionImg(1180, 1170, 1650, "red")),
    await tx("ROJO Y GUALDA", { font: "serif", w: 2000, top: 2260 }, ink, { rough: SOFT }),
    await tx("EL LEÓN DE LA CASA", { font: "inter", w: 900, top: 2560, ls: 0.2 }, tone === "dark" ? C.gold : C.red),
  ], { seed: 22, wear: 0.3 });
}

async function brochaToro(tone) {
  const ink = tone === "dark" ? C.cream : C.ink;
  await out(`brocha-toro-${sfx(tone)}`, [
    op(brush([[100, 1500], [700, 900], [1500, 1700], [2320, 1000]], 820, { seed: 23, dry: 0.6 }), C.red, { rough: ROUGH_HEAVY }),
    op(splatter(500, 600, 110, { seed: 25, drops: 36 }) + splatter(2000, 2050, 70, { seed: 26 }), C.gold, { rough: SOFT }),
    op(spatter(150, 300, 2100, 2100, 50, { seed: 27 }), C.red),
    ...bullOps(1200, 1230, 1750, ink, { rough: SOFT }),
    await tx("TORO BRAVO", { font: "anton", w: 2100, sy: 1.15, top: 2280 }, ink, { rough: SOFT }),
    await tx("CASTA · NOBLEZA · BRAVURA", { font: "inter", w: 1200, top: 2880, ls: 0.16 }, tone === "dark" ? C.gold : C.red),
  ], { seed: 24, wear: 0.32 });
}

async function brochaHecho() {
  await out("brocha-hecho", [
    op(brushLine(220, 1520, 2240, 1450, 300, { seed: 31, dry: 0.7 }), C.gold, { rough: ROUGH }),
    await tx("Hecho en", { font: "marker", w: 1300, x: 260, top: 380, rot: -4 }, C.ink, { rough: SOFT }),
    await tx("ESPAÑA", { font: "marker", w: 2150, top: 780, sy: 1.25, rot: -4 }, C.red, { rough: SOFT }),
    op(splatter(2050, 520, 60, { seed: 33 }), C.red, { rough: SOFT }),
    op(circle(1850, 2020, 260, `fill="none" stroke="#000" stroke-width="34"`) + circle(1850, 2020, 205, `fill="none" stroke="#000" stroke-width="14"`), C.red, { rough: ROUGH_HEAVY }),
    await tx("RyG", { font: "serif", w: 250, cx: 1850, cy: 2000 }, C.red, { rough: ROUGH }),
    op(await arcText("ORIGEN · ESPAÑA · ORIGEN ·", { font: "inter", cx: 1850, cy: 2020, r: 225, size: 46, ls: 0.12 }), C.red, { rough: ROUGH }),
    await tx("CON ORGULLO", { font: "inter", w: 820, x: 300, top: 1940, ls: 0.24 }, C.ink),
    await tx("DESDE SIEMPRE", { font: "inter", w: 820, x: 300, top: 2060, ls: 0.24 }, C.ink),
  ], { seed: 30, wear: 0.3 });
}

async function brochaRojoGualda() {
  await out("brocha-rojo-gualda", [
    op(brushLine(40, 760, 2360, 640, 520, { seed: 41 }), C.red, { rough: ROUGH_HEAVY }),
    op(brushLine(2360, 1820, 40, 1700, 520, { seed: 43 }), C.gold, { rough: ROUGH_HEAVY }),
    await tx("ROJO", { font: "abril", w: 2000, cy: 720 }, C.cream, { rough: SOFT }),
    await tx("y", { font: "script", h: 520, cy: 1240 }, C.gold, { rough: SOFT }),
    await tx("GUALDA", { font: "abril", w: 2200, cy: 1760 }, C.cream, { rough: SOFT }),
    er(brushLine(300, 1230, 900, 1210, 60, { seed: 44, dry: 1 }) + brushLine(1500, 1250, 2100, 1230, 60, { seed: 45, dry: 1 })),
    await tx("LOS COLORES DE CASA", { font: "inter", w: 1100, top: 2280, ls: 0.22 }, C.cream),
  ], { seed: 40, wear: 0.28 });
}

async function brochaAbanico() {
  const f = fan(1200, 1640, 1100, { n: 13 });
  await out("brocha-abanico", [
    op(f.leaf, C.red, { rough: ROUGH_HEAVY }),
    op(halftone({ x: 100, y: 500, w: 2200, h: 1200, cell: 58, angle: 20, f: (u, v) => 0.2 + v * 0.75 }), C.wine),
    er(circle(1200, 1640, 1100 * 0.36)),
    op(f.ribs + f.guard, C.gold),
    op(brushLine(200, 1880, 2200, 1780, 160, { seed: 51, dry: 0.8 }), C.gold, { rough: ROUGH }),
    await tx("de Feria", { font: "script", w: 1800, cy: 2240, rot: -6 }, C.cream, { rough: SOFT }),
    await tx("¡OLÉ!", { font: "anton", w: 480, cx: 1200, top: 2560, ls: 0.1 }, C.gold),
  ], { seed: 50, wear: 0.28 });
}

async function brochaSol() {
  let r = "";
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const r0 = 420, r1 = i % 2 ? 860 : 1080;
    r += brushLine(1200 + r0 * Math.cos(a), 1180 + r0 * Math.sin(a), 1200 + r1 * Math.cos(a), 1180 + r1 * Math.sin(a), i % 2 ? 90 : 130, { seed: 60 + i, bow: 0.02, fringe: 5, streaks: 3 });
  }
  await out("brocha-sol", [
    op(r, C.gold, { rough: ROUGH }),
    op(circle(1200, 1180, 360, `fill="#000"`), C.red, { rough: ROUGH_HEAVY }),
    op(spatter(200, 200, 2000, 2000, 60, { seed: 61 }), C.gold),
    await tx("SOL DE ESPAÑA", { font: "anton", w: 2100, top: 2420 }, C.cream, { rough: SOFT }),
    await tx("LUZ · CALOR · CARÁCTER", { font: "inter", w: 1100, top: 2950, ls: 0.2 }, C.gold),
  ], { seed: 59, wear: 0.3 });
}

async function brochaRoja() {
  // for red garments: no red ink — cream, gold and ink
  await out("brocha-roja", [
    op(brushLine(60, 900, 2340, 700, 600, { seed: 71 }), C.gold, { rough: ROUGH_HEAVY }),
    op(brushLine(2340, 1700, 60, 1560, 420, { seed: 73, dry: 0.8 }), C.ink, { rough: ROUGH_HEAVY }),
    op(lionImg(1200, 1120, 1300), C.cream, { rough: SOFT }),
    er(lionImg(1200, 1120, 1300, "red")),
    op(splatter(1950, 420, 70, { seed: 74 }), C.cream, { rough: SOFT }),
    await tx("ESPAÑA", { font: "anton", w: 2100, sy: 1.1, top: 2050 }, C.cream, { rough: SOFT }),
    await tx("SANGRE ROJA · CORAZÓN DE ORO", { font: "inter", w: 1400, top: 3030, ls: 0.12 }, C.gold),
  ], { seed: 70, wear: 0.3 });
}

async function salpicado() {
  await out("salpicado", [
    op(splatter(1200, 1100, 330, { seed: 81, drops: 70, spread: 3.4 }), C.red, { rough: SOFT }),
    op(splatter(820, 1500, 150, { seed: 82, drops: 40, spread: 3 }) + splatter(1700, 700, 120, { seed: 83, drops: 34 }), C.gold, { rough: SOFT }),
    op(spatter(0, 0, 2400, 2400, 140, { seed: 84, max: 30 }), C.gold),
    op(spatter(0, 0, 2400, 2400, 90, { seed: 85, max: 24 }), C.red),
    await tx("RyG", { font: "serif", w: 520, cy: 1100 }, C.cream),
    await tx("PINTADO A MANO EN ESPAÑA", { font: "inter", w: 1300, top: 2560, ls: 0.16 }, C.cream),
  ], { seed: 80, wear: 0.2 });
}

/* ═════════════════════════ SPRAY / GRAFITI ═════════════════════════ */
async function sprayEspana() {
  const g = { font: "graffiti", w: 2250, cy: 1150, rot: -6 };
  const word = await T("España", g);
  await out("spray-espana", [
    await tx("España", { ...g, stroke: "#000", sw: 70 }, C.red, { spray: { sigma: 26, density: 0.85, dot: 2.6 } }),
    op(drips(word.box.x + 160, word.box.x + word.box.w - 160, word.box.y + word.box.h * 0.66, { seed: 3, n: 11, len: [200, 640], wid: [18, 40] }), C.red),
    op(word.svg, C.gold),
    await tx("España", { ...g, cx: 1186, cy: 1138, fill: "none", extra: `stroke="#000" stroke-width="12"` }, C.cream),
    await tx("RyG", { font: "marker", w: 520, x: 1620, top: 1980, rot: -8 }, C.white, { spray: { sigma: 6, density: 0.5, dot: 2 } }),
    ...[[330, 520, 90], [2080, 600, 70], [560, 2150, 60]].map(([x, y, r]) => op(star(x, y, r, `fill="#000"`), C.gold, { spray: { sigma: 10, density: 0.7 } })),
  ], { seed: 31, wear: 0.25 });
}

async function sprayMuro() {
  const g = { font: "spray", w: 2200, cy: 1300, sy: 1.25 };
  const word = await T("ESPAÑA", g);
  await out("spray-muro", [
    op(crown(1200, 560, 760), C.red, { spray: SPRAY }),
    op(word.svg, C.ink, { spray: { sigma: 14, density: 0.6, dot: 2.2 } }),
    op(drips(word.box.x + 80, word.box.x + word.box.w - 80, word.box.y + word.box.h * 0.8, { seed: 91, n: 13, len: [140, 700], wid: [16, 34] }), C.ink),
    await tx("DE ESPAÑA PARA EL MUNDO", { font: "marker", w: 2200, top: 2380, rot: -3 }, C.red, { spray: { sigma: 6, density: 0.5 } }),
  ], { seed: 90, wear: 0.2 });
}

async function stencilLeon(tone) {
  const ink = tone === "dark" ? C.gold : C.ink, acc = tone === "dark" ? C.cream : C.red;
  const word = await T("LEÓN DE ESPAÑA", { font: "shoulders", w: 2100, top: 2200 });
  const xs = [];
  for (let x = word.box.x + 90; x < word.box.x + word.box.w; x += 150) xs.push(x);
  await out(`stencil-leon-${sfx(tone)}`, [
    op(lionImg(1200, 1150, 1700), ink, { spray: SPRAY }),
    er(lionImg(1200, 1150, 1700, "red")),
    op(lionImg(1200, 1150, 1700, "red"), acc, { spray: { sigma: 12, density: 0.6 }, rough: ROUGH }),
    op(word.svg, acc, { spray: { sigma: 12, density: 0.55 } }),
    er(bridges(xs, word.box.y + word.box.h * 0.42, word.box.h * 0.16, 24)),
    op(drips(800, 1700, word.box.y + word.box.h, { seed: 101, n: 5, len: [80, 300], wid: [14, 24] }), acc),
  ], { seed: 100, wear: 0.25 });
}

async function grafitiRyg() {
  const a = { font: "graffiti", w: 1500, cx: 1150, cy: 820, rot: -7 }, b = { font: "graffiti", w: 2250, cy: 1550, rot: -7 };
  const wb = await T("Gualda", b);
  await out("grafiti-ryg", [
    op(crown(1700, 360, 520), C.gold, { spray: SPRAY }),
    await tx("Rojo y", { ...a, stroke: "#000", sw: 80 }, C.red, { spray: SPRAY }),
    await tx("Gualda", { ...b, stroke: "#000", sw: 80 }, C.red, { spray: SPRAY }),
    op(drips(wb.box.x + 200, wb.box.x + wb.box.w - 200, wb.box.y + wb.box.h * 0.7, { seed: 111, n: 12, len: [180, 640] }), C.red),
    await tx("Rojo y", a, C.gold),
    await tx("Gualda", b, C.gold),
    await tx("Gualda", { ...b, cx: 1186, cy: 1536, fill: "none", extra: `stroke="#000" stroke-width="14"` }, C.white),
    await tx("Rojo y", { ...a, cx: 1136, cy: 806, fill: "none", extra: `stroke="#000" stroke-width="14"` }, C.white),
    ...[[300, 380, 80], [2150, 1100, 70], [420, 2300, 60], [1950, 2350, 90]].map(([x, y, r]) => op(star(x, y, r, `fill="#000"`), C.white, { spray: { sigma: 8, density: 0.6 } })),
  ], { seed: 110, wear: 0.22 });
}

async function sprayCorona() {
  await out("spray-corona", [
    op(crown(1200, 1000, 1700), C.red, { spray: { sigma: 30, density: 0.85, dot: 2.6 } }),
    er(crownJewels(1200, 1000, 1700)),
    op(drips(500, 1900, 1520, { seed: 121, n: 10, len: [150, 600] }), C.red),
    await tx("REYES DEL", { font: "marker", w: 1500, top: 2080, rot: -3 }, C.ink, { spray: { sigma: 5, density: 0.4 } }),
    await tx("BARRIO", { font: "marker", w: 1900, top: 2380, rot: -3 }, C.ink, { spray: { sigma: 5, density: 0.4 } }),
  ], { seed: 120, wear: 0.2 });
}

async function spray26() {
  const n = { font: "bungee", w: 1950, cy: 1200, rot: -5 };
  const num = await T("26", n);
  await out("spray-26", [
    await tx("26", { ...n, stroke: "#000", sw: 90 }, C.red, { spray: { sigma: 30, density: 0.85, dot: 2.6 } }),
    op(drips(num.box.x + 120, num.box.x + num.box.w - 120, num.box.y + num.box.h * 0.9, { seed: 131, n: 9, len: [200, 600], wid: [20, 44] }), C.red),
    op(num.svg, C.gold),
    op(star(760, 300, 150, `fill="#000"`) + star(1640, 300, 150, `fill="#000"`), C.gold, { spray: { sigma: 12, density: 0.7 } }),
    await tx("Campeones", { font: "marker", w: 1900, cy: 1300, rot: -12 }, C.white, { spray: { sigma: 6, density: 0.4 } }),
    await tx("ESPAÑA · 2010 · 2026", { font: "inter", w: 1500, top: 2380, ls: 0.14 }, C.cream),
  ], { seed: 130, wear: 0.25 });
}

async function sprayToro() {
  const word = await T("TORO", { font: "anton", w: 1900, top: 2150, sy: 1.1 });
  const xs = [];
  for (let x = word.box.x + 230; x < word.box.x + word.box.w; x += 480) xs.push(x);
  await out("spray-toro", [
    ...bullOps(1200, 1050, 1700, C.red, { spray: { sigma: 26, density: 0.8, dot: 2.6 } }),
    op(word.svg, C.ink, { spray: { sigma: 10, density: 0.5 } }),
    er(bridges(xs, word.box.y, word.box.h, 30)),
    op(drips(word.box.x + 60, word.box.x + word.box.w - 60, word.box.y + word.box.h * 0.92, { seed: 141, n: 8, len: [80, 380], wid: [14, 28] }), C.ink),
  ], { seed: 140, wear: 0.22 });
}

async function tagsEspalda() {
  await out("tags-pecho", [await tx("RyG", { font: "graffiti", w: 520, cx: MC.cx, cy: MC.cy, rot: -8 }, C.gold, { spray: { sigma: 5, density: 0.5 } })], { seed: 150, wear: 0.1, region: CHEST });
  const words = [
    ["OLÉ", "marker", 800, 650, 400, -10, C.red],
    ["ESPAÑA", "graffiti", 2100, 1200, 1060, -6, C.gold],
    ["+34", "spray", 620, 520, 1720, 6, C.cream],
    ["RyG", "graffiti", 860, 1520, 1760, -8, C.white],
    ["26", "bungee", 420, 2060, 2330, 8, C.gold],
    ["Sol", "graffiti", 560, 520, 2380, -6, C.cream],
    ["VAMOS", "marker", 1000, 1360, 2400, -4, C.red],
    ["fiesta", "brush", 760, 860, 2860, -6, C.gold],
    ["DESDE SIEMPRE", "inter", 1000, 1500, 3080, 0, C.cream],
  ];
  const ops = [op(spatter(0, 0, 2400, 3200, 120, { seed: 151, max: 20 }), C.red)];
  for (const [t, font, w, cx, cy, rot, col] of words) {
    const g = { font, w, cx, cy, rot };
    if (font !== "inter") ops.push(await tx(t, { ...g, stroke: "#000", sw: w * 0.04 }, col === C.red ? C.gold : C.red, { spray: { sigma: 14, density: 0.6 } }));
    ops.push(await tx(t, g, col));
  }
  ops.push(op(crown(1780, 420, 400), C.gold, { spray: { sigma: 10, density: 0.6 } }), op(star(2150, 1500, 100, `fill="#000"`) + star(300, 2900, 90, `fill="#000"`), C.white, { spray: { sigma: 8, density: 0.6 } }));
  ops.push(op(drips(500, 1900, 1330, { seed: 152, n: 7, len: [100, 300] }), C.gold));
  await out("tags-espalda", ops, { seed: 153, wear: 0.22 });
}

/* ═════════════════════════ GIGANTE A LA ESPALDA ═════════════════════════ */
async function espaldaToro() {
  await out("espalda-toro-pecho", [...bullOps(MC.cx, 380, 260, C.ink), await tx("TORO BRAVO", { font: "anton", w: 380, cx: MC.cx, top: 550, ls: 0.08 }, C.red)], { seed: 41, wear: 0.12, region: CHEST });
  await out("espalda-toro", [
    op(halftone({ x: 200, y: 260, w: 2000, h: 2000, cell: 52, angle: 30, f: (u, v) => 1.15 - Math.hypot(u - 0.5, v - 0.5) * 2.1, clip: circle(1200, 1260, 980) }), C.red),
    op(circle(1200, 1260, 760, `fill="#000"`), C.red),
    ...bullOps(1200, 1200, 1900, C.ink, { rough: ROUGH }),
    await tx("TORO BRAVO", { font: "anton", w: 2100, top: 2420, sy: 1.2 }, C.ink, { rough: SOFT }),
    await tx("ESPAÑA · DESDE SIEMPRE", { font: "inter", w: 1300, top: 2920, ls: 0.14 }, C.red),
  ], { seed: 42, wear: 0.35 });
}

async function espaldaLeon() {
  await out("espalda-leon-pecho", [op(lionImg(MC.cx, MC.cy, 330, "gold"), C.gold), op(lionImg(MC.cx, MC.cy, 330, "red"), C.red)], { seed: 160, wear: 0, region: CHEST });
  await out("espalda-leon", [
    op(rays(1200, 1450, 760, 1080, 36, { width: 0.45 }), C.gold, { rough: ROUGH }),
    op(halftone({ x: 0, y: 200, w: 2400, h: 2400, cell: 56, f: (u, v) => 1.1 - Math.hypot(u - 0.5, v - 0.5) * 2.4, clip: circle(1200, 1450, 760) }), C.wine),
    op(lionImg(1200, 1450, 1500, "gold"), C.gold, { rough: SOFT }),
    op(lionImg(1200, 1450, 1500, "red"), C.red, { rough: SOFT }),
    op(await arcText("ROJO Y GUALDA", { font: "abril", cx: 1200, cy: 1450, r: 1140, size: 210, ls: 0.1 }), C.cream, { rough: SOFT }),
    await tx("CORAZÓN DE LEÓN", { font: "anton", w: 1900, top: 2760, ls: 0.06 }, C.cream, { rough: SOFT }),
  ], { seed: 161, wear: 0.3 });
}

async function espaldaSol() {
  await out("espalda-sol-pecho", [op(sun(MC.cx, 420, 170), C.gold), op(circle(MC.cx, 420, 50, `fill="#000"`), C.red), await tx("SOL", { font: "anton", w: 160, cx: MC.cx, top: 620, ls: 0.1 }, C.cream)], { seed: 170, wear: 0, region: CHEST });
  await out("espalda-sol", [
    op(halftone({ x: 0, y: 100, w: 2400, h: 2400, cell: 54, f: (u, v) => 1.2 - Math.hypot(u - 0.5, v - 0.5) * 2.2 }), C.red),
    op(sun(1200, 1300, 1150, { n: 32 }), C.gold, { rough: ROUGH }),
    op(circle(1200, 1300, 420, `fill="#000"`), C.red, { rough: ROUGH }),
    await tx("SOL DE ESPAÑA", { font: "shoulders", w: 2200, top: 2560 }, C.cream, { rough: SOFT }),
    await tx("LUZ · CALOR · CARÁCTER", { font: "inter", w: 1200, top: 3000, ls: 0.2 }, C.gold),
  ], { seed: 171, wear: 0.3 });
}

async function espaldaGaleon() {
  const s = galleon(MC.cx, 430, 380);
  await out("espalda-galeon-pecho", [op(s.hull + s.rig, C.navy), op(s.sails, C.red)], { seed: 180, wear: 0, region: CHEST });
  const g = galleon(1200, 1250, 2100);
  await out("espalda-galeon", [
    op(halftone({ x: 300, y: 200, w: 1800, h: 1800, cell: 50, angle: 15, f: (u, v) => 1.1 - Math.hypot(u - 0.5, v - 0.5) * 2.2, clip: circle(1200, 1100, 900) }), C.gold),
    op(g.sails, C.red, { rough: SOFT }),
    op(g.hull + g.rig, C.navy, { rough: SOFT }),
    op(waves(150, 2250, 2000, 50, 220, 60) + waves(150, 2250, 2130, 40, 260, 44), C.navy, { rough: SOFT }),
    await tx("MAR DE ESPAÑA", { font: "serif", w: 2100, top: 2380 }, C.navy, { rough: SOFT }),
    await tx("RUMBO · PUERTO · DESTINO", { font: "inter", w: 1200, top: 2760, ls: 0.2 }, C.red),
  ], { seed: 181, wear: 0.3 });
}

async function espaldaAlhambra() {
  const arch = (x, y, w, h) => `<path d="${archD(x, y, w, h)}" fill="#000"/>`;
  await out("espalda-alhambra-pecho", [op(rect(MC.cx - 130, 230, 260, 360, `fill="#000"`), C.terra), er(arch(MC.cx - 95, 270, 190, 320)), await tx("GRANADA", { font: "cinzel", w: 300, cx: MC.cx, top: 630 }, C.ink)], { seed: 190, wear: 0, region: CHEST });
  const ops = [];
  // tile lattice in the spandrels
  ops.push(op(halftone({ x: 150, y: 300, w: 2100, h: 1900, cell: 70, angle: 45, f: () => 0.55 }), C.sea));
  ops.push(op(rect(150, 300, 2100, 60, `fill="#000"`) + rect(150, 2140, 2100, 70, `fill="#000"`), C.terra));
  const cols = [[220, 560], [920, 560], [1620, 560]];
  for (const [x, w] of cols) ops.push(er(arch(x, 520, w, 1640)));
  for (const [x, w] of cols) ops.push(op(`<path d="${archD(x, 520, w, 1640)}" fill="none" stroke="#000" stroke-width="44"/>`, C.terra, { rough: SOFT }));
  ops.push(op(rect(190, 2160, 90, 10) + [780, 1480, 2180].map((x) => rect(x - 45, 1500, 90, 660, `fill="#000"`)).join(""), C.terra));
  ops.push(await tx("ALHAMBRA", { font: "cinzel", w: 2000, top: 2380 }, C.ink, { rough: SOFT }));
  ops.push(await tx("GRANADA · AL-ÁNDALUS · ESPAÑA", { font: "inter", w: 1500, top: 2760, ls: 0.16 }, C.terra));
  await out("espalda-alhambra", ops, { seed: 191, wear: 0.32 });
}

async function espaldaAbanico() {
  const fs = fan(MC.cx, 520, 230, { n: 9 });
  await out("espalda-abanico-pecho", [op(fs.leaf, C.red), er(circle(MC.cx, 520, 230 * 0.36)), op(fs.ribs + fs.guard, C.gold)], { seed: 200, wear: 0, region: CHEST });
  const f = fan(1200, 1700, 1150, { n: 17 });
  await out("espalda-abanico", [
    op(f.leaf, C.red, { rough: ROUGH }),
    op(halftone({ x: 50, y: 500, w: 2300, h: 1300, cell: 60, angle: 0, f: (u, v) => 0.45 * (0.5 + 0.5 * Math.sin(u * 30)) }), C.wine),
    er(circle(1200, 1700, 1150 * 0.36)),
    op(f.ribs + f.guard, C.gold),
    op(`<path d="${f.leaf.match(/d="([^"]+)"/)[1]}" fill="none" stroke="#000" stroke-width="30"/>`, C.gold, { rough: SOFT }),
    await tx("de Feria", { font: "script", w: 2000, cy: 2280, rot: -5 }, C.cream, { rough: SOFT }),
    await tx("ABRIL · FAROLILLOS · SEVILLANAS", { font: "inter", w: 1500, top: 2700, ls: 0.12 }, C.gold),
  ], { seed: 201, wear: 0.28 });
}

async function espaldaCorona() {
  await out("espalda-corona-pecho", [op(crown(MC.cx, 400, 300), C.gold), er(crownJewels(MC.cx, 400, 300)), await tx("RyG", { font: "cinzel", w: 170, cx: MC.cx, top: 590 }, C.cream)], { seed: 210, wear: 0, region: CHEST });
  await out("espalda-corona", [
    op(crown(1200, 1150, 1900), C.gold, { rough: SOFT }),
    er(crownJewels(1200, 1150, 1900)),
    op(crownJewels(1200, 1150, 1900).replace(/r="([\d.]+)"/g, (m, r) => `r="${(+r * 0.7).toFixed(1)}"`), C.red),
    await tx("ROJO Y GUALDA", { font: "cinzel", w: 2100, top: 2050 }, C.cream, { rough: SOFT }),
    op(rect(500, 2380, 1400, 16, `fill="#000"`), C.gold),
    await tx("DESDE SIEMPRE", { font: "inter", w: 1000, top: 2470, ls: 0.3 }, C.gold),
  ], { seed: 211, wear: 0.3 });
}

async function espalda34() {
  await out("espalda-34-pecho", [await tx("+34", { font: "anton", w: 300, cx: MC.cx, cy: MC.cy }, C.gold), op(rect(MC.cx - 150, MC.cy + 120, 300, 22, `fill="#000"`), C.red)], { seed: 220, wear: 0, region: CHEST });
  await out("espalda-34", [
    op(brushLine(80, 1450, 2320, 1250, 900, { seed: 221 }), C.red, { rough: ROUGH_HEAVY }),
    await tx("+34", { font: "anton", w: 1950, sy: 1.25, cy: 1300, rot: -3 }, C.cream, { rough: SOFT }),
    await tx("PREFIJO DE ORIGEN", { font: "marker", w: 1800, top: 2300, rot: -3 }, C.gold, { rough: SOFT }),
    await tx("ESPAÑA · LLAMADA DESDE CASA", { font: "inter", w: 1300, top: 2740, ls: 0.14 }, C.cream),
  ], { seed: 222, wear: 0.3 });
}

async function espaldaVarsity() {
  await out("espalda-varsity-pecho", [await tx("RyG", { font: "varsity", w: 360, cx: MC.cx, cy: MC.cy, stroke: "#000", sw: 18 }, C.red), await tx("RyG", { font: "varsity", w: 360, cx: MC.cx, cy: MC.cy }, C.gold)], { seed: 230, wear: 0, region: CHEST });
  await out("espalda-varsity", [
    op(await arcText("ESPAÑA", { font: "varsity", cx: 1200, cy: 1900, r: 1350, size: 400, ls: 0.06 }).then((s) => s.replace(/fill="#000"/g, `fill="#000" stroke="#000" stroke-width="44" stroke-linejoin="round"`)), C.red),
    op(await arcText("ESPAÑA", { font: "varsity", cx: 1200, cy: 1900, r: 1350, size: 400, ls: 0.06 }), C.cream),
    await tx("34", { font: "varsity", h: 1250, cy: 1500, stroke: "#000", sw: 60, shadow: [40, 40, "#000", 10] }, C.red),
    await tx("34", { font: "varsity", h: 1250, cy: 1500 }, C.gold),
    await tx("HECHO EN ESPAÑA", { font: "varsity", w: 1700, top: 2400 }, C.cream),
    op(star(200, 2470, 70, `fill="#000"`) + star(2200, 2470, 70, `fill="#000"`), C.gold),
  ], { seed: 231, wear: 0.38 });
}

async function espaldaMediterraneo() {
  await out("espalda-mediterraneo-pecho", [op(`<clipPath id="mc"><rect x="1500" y="200" width="460" height="300"/></clipPath><g clip-path="url(#mc)">${circle(MC.cx, 470, 170, `fill="#000"`)}</g>`, C.orange), op(waves(1540, 1920, 480, 22, 90, 26) + waves(1540, 1920, 540, 22, 90, 26), C.navy)], { seed: 240, wear: 0, region: CHEST });
  const cx = 1200, cy = 1500, R = 950;
  const band = (i, n) => `<clipPath id="sb${i}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><g clip-path="url(#sb${i})">${rect(cx - R, cy - R + (i * 2 * R) / n / 1.0 * 0.5, 2 * R, R / n * 0.78, `fill="#000"`)}</g>`;
  const cols = [C.gold, C.gold, C.orange, C.orange, C.red, C.red];
  const ops = cols.map((c, i) => op(band(i, 6), c));
  ops.push(op(rect(0, cy, 2400, 2000, `fill="#000"`), "#000000"), er(rect(0, cy, 2400, 2000, `fill="#000"`)));
  ops.splice(ops.length - 2, 1);
  ops.push(op(waves(150, 2250, cy + 40, 46, 240, 60) + waves(150, 2250, cy + 190, 40, 280, 50) + waves(350, 2050, cy + 330, 34, 300, 40), C.navy, { rough: SOFT }));
  ops.push(await tx("MEDITERRÁNEO", { font: "retro", w: 2200, top: cy + 520 }, C.navy, { rough: SOFT }));
  ops.push(await tx("SAL · LUZ · TIEMPO LENTO", { font: "inter", w: 1200, top: cy + 1000, ls: 0.2 }, C.sea));
  await out("espalda-mediterraneo", ops, { seed: 241, wear: 0.35 });
}

/* ═════════════════════════ MÍNIMO DE LUJO ═════════════════════════ */
async function minMonograma(tone) {
  const g = tone === "dark" ? C.gold : C.red, s = tone === "dark" ? C.cream : C.ink;
  await out(`min-monograma-${sfx(tone)}`, [op(crown(MC.cx, 330, 230), g), await tx("RyG", { font: "cinzel", w: 340, cx: MC.cx, top: 450 }, s), op(rect(MC.cx - 120, 610, 240, 10, `fill="#000"`), g), await tx("ESPAÑA", { font: "inter", w: 200, cx: MC.cx, top: 650, ls: 0.4 }, g)], { seed: 250 + (tone === "dark" ? 0 : 1), wear: 0, region: CHEST });
}
async function minCoordenadas(tone) {
  const s = tone === "dark" ? C.cream : C.ink;
  await out(`min-coordenadas-${sfx(tone)}`, [
    await tx("ESPAÑA", { font: "cinzel", w: 420, cx: MC.cx, top: 300 }, s),
    op(rect(MC.cx - 210, 440, 420, 22, `fill="#000"`), C.red),
    op(rect(MC.cx - 210, 462, 420, 30, `fill="#000"`), C.gold),
    op(rect(MC.cx - 210, 492, 420, 22, `fill="#000"`), C.red),
    await tx("40°25′N · 3°42′O", { font: "inter", w: 420, cx: MC.cx, top: 560 }, s),
  ], { seed: 260, wear: 0, region: CHEST });
}
async function minDesdeSiempre() {
  await out("min-desde-siempre", [await tx("Desde siempre", { font: "script", w: 520, cx: MC.cx, cy: 420, rot: -6 }, C.red), op(rect(MC.cx - 60, 540, 120, 14, `fill="#000"`), C.red), op(rect(MC.cx - 60, 554, 120, 18, `fill="#000"`), C.gold), op(rect(MC.cx - 60, 572, 120, 14, `fill="#000"`), C.red)], { seed: 270, wear: 0, region: CHEST });
}
async function minLeonSello() {
  await out("min-leon-sello", [
    op(circle(MC.cx, MC.cy, 240, `fill="none" stroke="#000" stroke-width="16"`) + circle(MC.cx, MC.cy, 160, `fill="none" stroke="#000" stroke-width="10"`), C.gold),
    op(await arcText("ROJO Y GUALDA", { font: "inter", cx: MC.cx, cy: MC.cy, r: 180, size: 44, ls: 0.2 }) + await arcText("ESPAÑA", { font: "inter", cx: MC.cx, cy: MC.cy, r: 180, size: 44, ls: 0.3, bottom: true }), C.gold),
    op(lionImg(MC.cx, MC.cy, 230), C.cream),
    op(star(MC.cx - 205, MC.cy, 18, `fill="#000"`) + star(MC.cx + 205, MC.cy, 18, `fill="#000"`), C.gold),
  ], { seed: 280, wear: 0, region: CHEST });
}

/* bordados: flat Printful threads, ≤ 4 colours, no hairlines, no wear */
async function embRyg() {
  await out("emb-ryg", [op(crown(MC.cx, 320, 260), TH.gold), er(crownJewels(MC.cx, 320, 260)), await tx("RyG", { font: "cinzel", w: 380, cx: MC.cx, top: 460 }, TH.white)], { seed: 290, wear: 0, region: CHEST, colours: 8 });
}
async function embEspana() {
  await out("emb-espana", [await tx("ESPAÑA", { font: "cinzel", w: 460, cx: MC.cx, top: 330 }, TH.white), op(rect(MC.cx - 230, 470, 460, 30, `fill="#000"`), TH.red), op(rect(MC.cx - 230, 500, 460, 46, `fill="#000"`), TH.yellow), op(rect(MC.cx - 230, 546, 460, 30, `fill="#000"`), TH.red)], { seed: 291, wear: 0, region: CHEST, colours: 8 });
}
async function embDesdeSiempre() {
  await out("emb-desde-siempre", [await tx("Desde siempre", { font: "script", w: 560, cx: MC.cx, cy: 420, rot: -6 }, TH.yellow), op(brushLine(MC.cx - 220, 540, MC.cx + 230, 520, 30, { seed: 3, streaks: 0, fringe: 0, dry: 0 }), TH.red)], { seed: 292, wear: 0, region: CHEST, colours: 8 });
}
async function embSol() {
  await out("emb-sol", [op(sun(MC.cx, MC.cy, 230, { n: 16, disc: 0.42, inner: 0.5 }), TH.yellow), op(circle(MC.cx, MC.cy, 70, `fill="#000"`), TH.red)], { seed: 293, wear: 0, region: CHEST, colours: 8 });
}
async function embCoordenadas() {
  await out("emb-coordenadas", [op(sun(MC.cx - 200, MC.cy, 90, { n: 12, disc: 0.45, inner: 0.55 }), TH.yellow), await tx("40°N · 3°O", { font: "anton", w: 330, x: MC.cx - 90, cy: MC.cy }, TH.white)], { seed: 294, wear: 0, region: CHEST, colours: 8 });
}

/* ═════════════════════════ RETRO POSTAL ═════════════════════════ */
/** 70s sunset disc cut into bands of colours (top → bottom). */
function bandSun(cx, cy, R, cols, gap = 0.22) {
  const n = cols.length, bh = (2 * R) / n;
  return cols.map((c, i) => op(`<clipPath id="${nid("bs")}c"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>`.replace(/id="([^"]+)c"/, (m, id) => `id="${id}"`) + "", c)).map((o, i) => {
    const id = nid("bs");
    const y = cy - R + i * bh;
    const hh = bh * (1 - gap * (i / n));
    return { ...o, svg: `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><g clip-path="url(#${id})">${rect(cx - R, y, 2 * R, hh, `fill="#000"`)}</g>` };
  });
}
async function postal(name, o) {
  const ops = [];
  if (o.rays) {
    const id = nid("rc");
    ops.push(op(`<clipPath id="${id}">${rect(-400, -400, 3200, (o.sunY ?? 1150) + 520)}</clipPath><g clip-path="url(#${id})">${rays(1200, o.sunY ?? 1150, 300, 1400, 28, { width: 0.42 })}</g>`, o.rays, { rough: SOFT }));
  }
  ops.push(...bandSun(1200, o.sunY ?? 1150, o.sunR ?? 780, o.sun));
  if (o.mid) ops.push(...(await o.mid()));
  if (o.sea) ops.push(op(rect(-400, (o.sunY ?? 1150) + 140, 3200, 900, `fill="#000"`), "#000"), er(rect(-400, (o.sunY ?? 1150) + 140, 3200, 900, `fill="#000"`)));
  if (o.sea) ops.splice(ops.length - 2, 1);
  if (o.sea) ops.push(op(waves(250, 2150, (o.sunY ?? 1150) + 170, 40, 230, 54) + waves(250, 2150, (o.sunY ?? 1150) + 300, 36, 260, 46) + waves(450, 1950, (o.sunY ?? 1150) + 420, 30, 280, 38), o.sea, { rough: SOFT }));
  if (o.fg) ops.push(...(await o.fg()));
  const title = { font: "retro", w: o.titleW ?? 2150, top: o.titleTop ?? 2120, rot: -4 };
  ops.push(await tx(o.title, { ...title, x: undefined, cx: 1230, top: title.top + 34 }, o.shadow));
  ops.push(await tx(o.title, title, o.ink));
  ops.push(await tx(o.sub, { font: "inter", w: 1400, top: (o.titleTop ?? 2120) + 560, ls: 0.22 }, o.subInk ?? o.ink));
  await out(name, ops, { seed: o.seed, wear: 0.45 });
}
const SUN70 = [C.gold, C.gold2, C.orange, C.terra, C.red];

/* ═════════════════════════ COLLAGE (art-* composed at print time) ═════════════════════════ */
async function collagePaper(n, seed) {
  await out(`collage-papel-${n}`, [
    op(torn(330, 330, 1740, 1760, { seed, amp: 26, rot: n % 2 ? -3 : 2.5 }), C.cream),
    op(torn(260, 1800, 900, 380, { seed: seed + 1, amp: 18, rot: -6 }), C.red),
    op(torn(1350, 230, 760, 300, { seed: seed + 2, amp: 18, rot: 5 }), C.gold),
  ], { seed, wear: 0.15 });
}
async function collageTop(name, word, sub, seed, o = {}) {
  await out(`collage-${name}`, [
    op(brushLine(120, 2240, 2280, 2120, 300, { seed, dry: 0.7 }), o.stroke ?? C.red, { rough: ROUGH }),
    op(rect(380, 300, 360, 90, `fill="#000" transform="rotate(-24 560 345)"`) + rect(1700, 1980, 380, 90, `fill="#000" transform="rotate(18 1890 2025)"`), C.bone, { rough: { sigma: 2, amp: 0.7, grain: 4 } }),
    await tx(word, { font: o.font ?? "anton", w: o.w ?? 2000, h: 500, top: 2330, rot: -2 }, C.cream, { rough: SOFT }),
    await tx(sub, { font: "inter", w: 1400, top: 2930, ls: 0.18 }, C.gold),
    op(spatter(100, 150, 2200, 2700, 50, { seed: seed + 3 }), C.gold),
  ], { seed, wear: 0.28 });
}

export async function pieces() {
  // Brocha y bandera
  await brochaEspana("dark");
  await brochaEspana("light");
  await brochaLeon("dark");
  await brochaLeon("light");
  await brochaToro("dark");
  await brochaToro("light");
  await brochaHecho();
  await brochaRojoGualda();
  await brochaAbanico();
  await brochaSol();
  await brochaRoja();
  await salpicado();
  // Spray / grafiti
  await sprayEspana();
  await sprayMuro();
  await stencilLeon("dark");
  await stencilLeon("light");
  await grafitiRyg();
  await sprayCorona();
  await spray26();
  await sprayToro();
  await tagsEspalda();
  // Gigante a la espalda
  await espaldaToro();
  await espaldaLeon();
  await espaldaSol();
  await espaldaGaleon();
  await espaldaAlhambra();
  await espaldaAbanico();
  await espaldaCorona();
  await espalda34();
  await espaldaVarsity();
  await espaldaMediterraneo();
  // Mínimo de lujo
  await minMonograma("dark");
  await minMonograma("light");
  await minCoordenadas("dark");
  await minCoordenadas("light");
  await minDesdeSiempre();
  await minLeonSello();
  await embRyg();
  await embEspana();
  await embDesdeSiempre();
  await embSol();
  await embCoordenadas();
  // Retro postal
  await postal("postal-costa-blanca", { seed: 300, sun: SUN70, rays: null, sea: C.sea, ink: C.navy, shadow: C.orange, title: "Costa Blanca", sub: "ALICANTE · ESPAÑA", fg: async () => [op(palm(560, 1900, 1100, { seed: 3 }) + palm(1880, 1900, 900, { seed: 5, lean: -0.2 }), C.ink, { rough: SOFT })] });
  await postal("postal-ibiza", { seed: 310, sun: [C.gold2, C.orange, C.red, C.wine], rays: C.gold, ink: C.red, shadow: C.gold, title: "Ibiza", titleW: 1600, sub: "ISLAS BALEARES · ESPAÑA", subInk: C.ink, sea: C.teal });
  await postal("postal-sevilla", { seed: 320, sun: SUN70, rays: C.gold, ink: C.wine, shadow: C.orange, title: "Sevilla", titleW: 1900, sub: "SOL · AZAHAR · ARTE", mid: async () => {
    // generic Andalusian bell tower
    const x = 1200, b = 2000;
    const tower = rect(x - 170, b - 1000, 340, 1000, `fill="#000"`) + rect(x - 130, b - 1260, 260, 260, `fill="#000"`) + rect(x - 90, b - 1420, 180, 160, `fill="#000"`) + `<path d="M${x - 70} ${b - 1420} Q${x} ${b - 1600} ${x + 70} ${b - 1420} Z" fill="#000"/>` + rect(x - 8, b - 1700, 16, 120, `fill="#000"`);
    let win = "";
    for (let i = 0; i < 4; i++) win += `<path d="${archD(x - 40, b - 900 + i * 210, 80, 140)}" fill="#000"/>`;
    win += `<path d="${archD(x - 100, b - 1220, 80, 170)}" fill="#000"/><path d="${archD(x + 20, b - 1220, 80, 170)}" fill="#000"/>`;
    return [op(tower, C.ink, { rough: SOFT }), er(win)];
  } });
  await postal("postal-galicia", { seed: 330, sun: [C.sky, C.sea, C.navy], rays: null, ink: C.navy, shadow: C.sky, title: "Galicia", titleW: 1900, sub: "RÍAS · FAROS · MAR", sea: C.navy, subInk: C.sea, fg: async () => {
    const l = lighthouse(1650, 1500, 1050);
    return [op(rays(1650, l.top, 120, 900, 10, { width: 0.3, rot: 190 }).slice(0), C.gold), op(l.tower, C.navy), op(l.bands, C.red), op(l.lamp, C.gold), op(`<path d="${`M1300 1500 L1450 1380 L1900 1380 L2050 1500 Z`}" fill="#000"/>`, C.ink)];
  } });
  await postal("postal-espana", { seed: 340, sun: SUN70, rays: C.gold, ink: C.red, shadow: C.ink, title: "España", titleW: 2000, sub: "TIERRA DE SOL · VERANO ETERNO", subInk: C.ink });
  await postal("postal-canarias", { seed: 350, sun: [C.gold2, C.gold, C.orange, C.terra], rays: null, ink: C.terra, shadow: C.ink, title: "Canarias", titleW: 2050, sub: "ISLAS AFORTUNADAS", subInk: C.ink, sea: C.sky, mid: async () => [op(poly([[350, 1300], [1000, 560], [1100, 640], [1220, 560], [1900, 1300]], `fill="#000"`), C.ink, { rough: SOFT }), op(poly([[1000, 560], [1100, 640], [1220, 560], [1180, 760], [1040, 760]], `fill="#000"`), C.red)] });
  await postal("postal-madrid", { seed: 360, sun: [C.gold, C.orange, C.red, C.wine], rays: C.red, ink: C.wine, shadow: C.gold, title: "Madrid", titleW: 1900, sub: "KILÓMETRO CERO · DE TODAS PARTES", subInk: C.ink });
  await postal("postal-costa-del-sol", { seed: 370, sun: SUN70, rays: null, sea: C.teal, ink: C.teal, shadow: C.gold, title: "Costa del Sol", sub: "MÁLAGA · ESPAÑA", subInk: C.ink, fg: async () => [op(palm(1700, 1950, 1200, { seed: 9, lean: -0.15 }), C.ink, { rough: SOFT })] });
  // Collage
  await collagePaper(1, 400);
  await collagePaper(2, 410);
  await collageTop("toro", "TORO", "BRAVURA · ARTE · ESPAÑA", 420);
  await collageTop("flamenca", "Duende", "FLAMENCO · ALMA · COMPÁS", 430, { font: "serifi", w: 1700, stroke: C.red });
  await collageTop("galeon", "MAR", "RUMBO A CASA · DESDE SIEMPRE", 440, { stroke: C.navy, w: 1500 });
  await collageTop("alhambra", "GRANADA", "ALHAMBRA · AL-ÁNDALUS", 450, { font: "cinzel", stroke: C.terra });
  await collageTop("quijote", "LA MANCHA", "EN UN LUGAR DE LA MANCHA…", 460, { font: "serif", stroke: C.ochre });
  await collageTop("leon", "LEÓN", "ROJO Y GUALDA · DESDE SIEMPRE", 470);
}

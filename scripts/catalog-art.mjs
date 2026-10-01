/**
 * Builds the brand's print-ready art motifs (transparent PNG, trimmed) into public/catalog/art
 * and writes src/lib/catalog/art-manifest.json ({ name: aspect }) used by the design library.
 * Original vector artwork drawn for ROJO Y GUALDA — no third-party marks.
 *
 *   node scripts/catalog-art.mjs
 */
import sharp from "sharp";
import { mkdir, writeFile, copyFile } from "node:fs/promises";

const OUT = new URL("../public/catalog/art/", import.meta.url);
const MANIFEST = new URL("../src/lib/catalog/art-manifest.json", import.meta.url);
const SIZE = 1800;

const C = {
  gold: "#d4a62a",
  gold2: "#f0c75a",
  red: "#c8102e",
  ink: "#111111",
  white: "#ffffff",
  cream: "#f3ead7",
  navy: "#14213d",
  sea: "#1f5f8b",
  yellow: "#ffc400",
  green: "#2f6b3a",
  orange: "#e8742a",
};

const rad = (d) => (d * Math.PI) / 180;
const pt = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
const f = (n) => n.toFixed(1);

// ---------- motifs (viewBox 0 0 1000 1000) ----------
const M = {
  sun: ({ a, b }) => {
    let rays = "";
    for (let i = 0; i < 24; i++) {
      const ang = i * 15 - 90;
      const long = i % 2 === 0;
      const r1 = 250, r2 = long ? 480 : 400, w = long ? 7.5 : 5.5;
      const [x1, y1] = pt(500, 500, r1, ang - w), [x2, y2] = pt(500, 500, r2, ang), [x3, y3] = pt(500, 500, r1, ang + w);
      rays += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} Z" fill="${long ? a : b}"/>`;
    }
    return `${rays}<circle cx="500" cy="500" r="225" fill="${a}"/><circle cx="500" cy="500" r="185" fill="none" stroke="${b}" stroke-width="14"/>`;
  },
  sunset: ({ a, b, c }) => {
    // retro sunset: half sun with cut stripes over waves
    let cuts = "";
    [0, 1, 2, 3, 4].forEach((i) => (cuts += `<rect x="0" y="${560 - i * 62}" width="1000" height="${10 + i * 5}" fill="black"/>`));
    let waves = "";
    for (let i = 0; i < 3; i++) {
      const y = 680 + i * 80;
      waves += `<path d="M120 ${y} q 47 -40 95 0 t 95 0 t 95 0 t 95 0 t 95 0 t 95 0 t 95 0 t 95 0" fill="none" stroke="${c}" stroke-width="30" stroke-linecap="round"/>`;
    }
    return `<defs><mask id="m"><rect width="1000" height="1000" fill="white"/>${cuts}</mask><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <path d="M180 620 A320 320 0 0 1 820 620 Z" fill="url(#g)" mask="url(#m)"/>${waves}`;
  },
  waves: ({ a }) => {
    let w = "";
    for (let i = 0; i < 4; i++) {
      const y = 330 + i * 110;
      w += `<path d="M80 ${y} q 52.5 -60 105 0 t 105 0 t 105 0 t 105 0 t 105 0 t 105 0 t 105 0 t 105 0" fill="none" stroke="${a}" stroke-width="34" stroke-linecap="round"/>`;
    }
    return w;
  },
  flagband: ({ a, b }) =>
    `<rect x="60" y="400" width="880" height="200" rx="100" fill="${a}"/><rect x="60" y="450" width="880" height="100" fill="${b}"/><rect x="60" y="400" width="880" height="200" rx="100" fill="none"/>`,
  stripes: ({ a, b }) => `<rect x="80" y="430" width="840" height="46" rx="23" fill="${a}"/><rect x="80" y="500" width="840" height="46" rx="23" fill="${b}"/>`,
  laurel: ({ a }) => {
    let leaves = "";
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const ang = 200 - i * 17; // from bottom up along an arc
        const [x, y] = pt(500, 520, 330, side === -1 ? ang : 180 - ang);
        const rot = side === -1 ? ang + 90 + 25 : 180 - ang - 90 - 25;
        leaves += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="34" ry="82" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" fill="${a}"/>`;
      }
      const arc = side === -1 ? "M330 820 Q140 560 330 230" : "M670 820 Q860 560 670 230";
      leaves += `<path d="${arc}" fill="none" stroke="${a}" stroke-width="16" stroke-linecap="round"/>`;
    }
    return leaves + `<path d="M430 850 L500 800 L570 850" fill="none" stroke="${a}" stroke-width="18" stroke-linecap="round"/>`;
  },
  star8: ({ a, b }) => {
    const s = (r1, r2, n, rot) => {
      let d = "";
      for (let i = 0; i < n * 2; i++) {
        const [x, y] = pt(500, 500, i % 2 ? r2 : r1, (360 / (n * 2)) * i + rot);
        d += `${i ? "L" : "M"}${f(x)} ${f(y)} `;
      }
      return d + "Z";
    };
    return `<path d="${s(470, 330, 8, -90)}" fill="${a}"/><path d="${s(300, 210, 8, -67.5)}" fill="${b}"/><circle cx="500" cy="500" r="120" fill="${a}"/><circle cx="500" cy="500" r="56" fill="${b}"/>`;
  },
  azulejo: ({ a, b }) => {
    const petal = (rot) => `<path d="M500 500 C 430 400, 430 250, 500 160 C 570 250, 570 400, 500 500 Z" fill="${a}" transform="rotate(${rot} 500 500)"/>`;
    const leaf = (rot) => `<path d="M500 500 C 470 440, 470 360, 500 300 C 530 360, 530 440, 500 500 Z" fill="${b}" transform="rotate(${rot} 500 500)"/>`;
    const corner = (x, y) => `<path d="M${x} ${y} m -150 0 a150 150 0 0 0 150 150 a150 150 0 0 0 150 -150" fill="none"/>`;
    return `<rect x="70" y="70" width="860" height="860" rx="36" fill="${b}"/><rect x="100" y="100" width="800" height="800" rx="24" fill="none" stroke="${a}" stroke-width="22"/>
      ${[0, 90, 180, 270].map(petal).join("")}${[45, 135, 225, 315].map((r) => `<g transform="scale(1)">${leaf(r).replace(`fill="${b}"`, `fill="${a}" opacity="0.85"`)}</g>`).join("")}
      <circle cx="500" cy="500" r="70" fill="${b}"/><circle cx="500" cy="500" r="38" fill="${a}"/>
      ${[[100, 100], [900, 100], [100, 900], [900, 900]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="120" fill="none" stroke="${a}" stroke-width="22"/>`).join("")}${corner(0, 0)}`;
  },
  football: ({ a, b }) => {
    // classic truncated-icosahedron look: centre pentagon + 5 surrounding partial pentagons
    const pent = (cx, cy, r, rot) => {
      let d = "";
      for (let i = 0; i < 5; i++) {
        const [x, y] = pt(cx, cy, r, rot + i * 72);
        d += `${i ? "L" : "M"}${f(x)} ${f(y)} `;
      }
      return d + "Z";
    };
    let outer = "";
    for (let i = 0; i < 5; i++) {
      const [x, y] = pt(500, 500, 300, -90 + 36 + i * 72);
      outer += `<path d="${pent(x, y, 120, -90 + 36 + i * 72 + 180)}" fill="${b}"/>`;
      const [lx1, ly1] = pt(500, 500, 112, -90 + i * 72);
      const [lx2, ly2] = pt(500, 500, 250, -90 + i * 72);
      outer += `<line x1="${f(lx1)}" y1="${f(ly1)}" x2="${f(lx2)}" y2="${f(ly2)}" stroke="${b}" stroke-width="14"/>`;
    }
    return `<defs><clipPath id="c"><circle cx="500" cy="500" r="400"/></clipPath></defs><circle cx="500" cy="500" r="420" fill="${b}"/><circle cx="500" cy="500" r="400" fill="${a}"/><g clip-path="url(#c)">${outer}<path d="${pent(500, 500, 120, -90)}" fill="${b}"/></g>`;
  },
  pitch: ({ a }) =>
    `<g fill="none" stroke="${a}" stroke-width="16"><rect x="150" y="60" width="700" height="880" rx="8"/><line x1="150" y1="500" x2="850" y2="500"/><circle cx="500" cy="500" r="110"/><rect x="320" y="60" width="360" height="150"/><rect x="410" y="60" width="180" height="60"/><rect x="320" y="790" width="360" height="150"/><rect x="410" y="880" width="180" height="60"/><path d="M420 210 A90 90 0 0 0 580 210"/><path d="M420 790 A90 90 0 0 1 580 790"/></g><circle cx="500" cy="500" r="12" fill="${a}"/>`,
  padel: ({ a, b, c }) => {
    let holes = "";
    for (let r = 0; r < 6; r++) for (let k = 0; k < 5; k++) {
      const x = 330 + k * 60 + (r % 2) * 30, y = 230 + r * 58;
      if (Math.hypot((x - 450) / 210, (y - 380) / 250) < 0.78) holes += `<circle cx="${x}" cy="${y}" r="15" fill="${b}"/>`;
    }
    return `<g transform="rotate(-28 500 500)"><ellipse cx="450" cy="380" rx="230" ry="270" fill="${a}"/><ellipse cx="450" cy="380" rx="200" ry="240" fill="none" stroke="${b}" stroke-width="10" opacity="0.5"/>${holes}<path d="M400 630 L380 880 Q450 910 520 880 L500 630 Z" fill="${a}"/><rect x="372" y="760" width="156" height="130" rx="26" fill="${b}"/></g><circle cx="770" cy="760" r="95" fill="${c}"/><path d="M690 715 Q770 790 850 715" fill="none" stroke="${b}" stroke-width="12"/><path d="M690 805 Q770 730 850 805" fill="none" stroke="${b}" stroke-width="12" opacity="0"/>`;
  },
  bike: ({ a }) =>
    `<g fill="none" stroke="${a}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"><circle cx="250" cy="640" r="170"/><circle cx="750" cy="640" r="170"/><path d="M250 640 L420 360 L680 360 L750 640"/><path d="M420 360 L520 640 L680 360"/><path d="M250 640 L520 640"/><path d="M380 300 L470 300"/><path d="M680 360 L650 270 L720 250"/></g><circle cx="520" cy="640" r="34" fill="${a}"/><circle cx="250" cy="640" r="20" fill="${a}"/><circle cx="750" cy="640" r="20" fill="${a}"/>`,
  mountain: ({ a, b }) =>
    `<path d="M60 820 L330 330 L460 560 L610 250 L940 820 Z" fill="${a}"/><path d="M610 250 L680 380 L640 360 L610 410 L575 365 L545 385 Z" fill="${b}"/><path d="M330 330 L380 420 L345 405 L320 440 L290 405 Z" fill="${b}"/><path d="M90 860 Q500 760 910 860" fill="none" stroke="${a}" stroke-width="20" stroke-linecap="round" stroke-dasharray="40 30"/>`,
  shell: ({ a, b }) => {
    let ribs = "";
    const n = 11;
    for (let i = 0; i < n; i++) {
      const ang = 200 + (140 / (n - 1)) * i;
      const [x, y] = pt(500, 820, 600, ang);
      ribs += `<path d="M500 820 L${f(x)} ${f(y)}" stroke="${b}" stroke-width="22" stroke-linecap="round"/>`;
    }
    let edge = "M";
    for (let i = 0; i <= 40; i++) {
      const ang = 200 + (140 / 40) * i;
      const r = 600 + (i % 4 === 2 ? 26 : 0);
      const [x, y] = pt(500, 820, r, ang);
      edge += `${f(x)} ${f(y)} L`;
    }
    edge = edge.replace(/ L$/, "") + " L500 820 Z";
    return `<path d="${edge}" fill="${a}"/>${ribs}<path d="M380 820 L330 900 L670 900 L620 820 Z" fill="${a}"/><circle cx="500" cy="840" r="36" fill="${b}"/>`;
  },
  arrow: ({ a }) => `<path d="M120 420 L620 420 L620 260 L900 500 L620 740 L620 580 L120 580 Q90 500 120 420 Z" fill="${a}"/>`,
  checkered: ({ a, b }) => {
    let sq = "";
    const n = 6, s = 110;
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < n; k++) {
        const wave = Math.sin((k / n) * Math.PI * 1.4) * 40;
        sq += `<rect x="${200 + k * s}" y="${240 + r * s + wave}" width="${s}" height="${s}" fill="${(r + k) % 2 ? b : a}"/>`;
      }
    return `<rect x="150" y="190" width="40" height="760" rx="20" fill="${a}"/>${sq}`;
  },
  gauge: ({ a, b }) => {
    let ticks = "";
    for (let i = 0; i <= 12; i++) {
      const ang = 150 + i * 20;
      const [x1, y1] = pt(500, 560, 330, ang), [x2, y2] = pt(500, 560, i % 3 === 0 ? 260 : 290, ang);
      ticks += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${i > 9 ? b : a}" stroke-width="${i % 3 === 0 ? 22 : 12}" stroke-linecap="round"/>`;
    }
    const [nx, ny] = pt(500, 560, 280, 318);
    return `<path d="M${f(pt(500, 560, 400, 150)[0])} ${f(pt(500, 560, 400, 150)[1])} A400 400 0 1 1 ${f(pt(500, 560, 400, 30)[0])} ${f(pt(500, 560, 400, 30)[1])}" fill="none" stroke="${a}" stroke-width="30" stroke-linecap="round"/>${ticks}<line x1="500" y1="560" x2="${f(nx)}" y2="${f(ny)}" stroke="${b}" stroke-width="26" stroke-linecap="round"/><circle cx="500" cy="560" r="50" fill="${a}"/>`;
  },
  fan: ({ a, b }) => {
    let pleats = "";
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a1 = 190 + (160 / n) * i, a2 = a1 + 160 / n;
      const [x1, y1] = pt(500, 760, 520, a1), [x2, y2] = pt(500, 760, 520, a2);
      pleats += `<path d="M500 760 L${f(x1)} ${f(y1)} A520 520 0 0 1 ${f(x2)} ${f(y2)} Z" fill="${i % 2 ? a : b}"/>`;
    }
    return `${pleats}<path d="M${f(pt(500, 760, 520, 190)[0])} ${f(pt(500, 760, 520, 190)[1])} A520 520 0 0 1 ${f(pt(500, 760, 520, 350)[0])} ${f(pt(500, 760, 520, 350)[1])}" fill="none" stroke="${a}" stroke-width="18"/><circle cx="500" cy="760" r="210" fill="${a}"/><circle cx="500" cy="760" r="40" fill="${b}"/>`;
  },
  burst: ({ a, b }) => {
    let l = "";
    for (let i = 0; i < 18; i++) {
      const ang = i * 20;
      const [x1, y1] = pt(500, 500, 150, ang), [x2, y2] = pt(500, 500, i % 2 ? 360 : 450, ang);
      l += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${i % 3 ? a : b}" stroke-width="26" stroke-linecap="round"/>`;
      const [dx, dy] = pt(500, 500, i % 2 ? 410 : 500, ang);
      l += `<circle cx="${f(dx)}" cy="${f(dy)}" r="18" fill="${i % 3 ? b : a}"/>`;
    }
    return l + `<circle cx="500" cy="500" r="70" fill="${b}"/>`;
  },
  olive: ({ a, b, c }) =>
    `<line x1="230" y1="860" x2="760" y2="150" stroke="${c}" stroke-width="22" stroke-linecap="round"/><circle cx="745" cy="170" r="30" fill="${c}"/>
     <ellipse cx="560" cy="400" rx="130" ry="165" transform="rotate(37 560 400)" fill="${a}"/><circle cx="520" cy="350" r="40" fill="${b}"/>
     <ellipse cx="400" cy="615" rx="130" ry="165" transform="rotate(37 400 615)" fill="${a}"/><circle cx="360" cy="565" r="40" fill="${b}"/>`,
  vermut: ({ a, b, c }) =>
    `<path d="M220 160 L780 160 L520 520 L520 820 L680 860 L320 860 L480 820 L480 520 Z" fill="none" stroke="${a}" stroke-width="30" stroke-linejoin="round"/>
     <path d="M300 240 L700 240 L500 510 Z" fill="${b}"/><circle cx="600" cy="300" r="56" fill="${c}"/><circle cx="600" cy="300" r="22" fill="${b}"/>
     <line x1="420" y1="180" x2="700" y2="420" stroke="${a}" stroke-width="12" stroke-linecap="round"/>
     <circle cx="760" cy="200" r="110" fill="${c}" opacity="0"/>`,
  palm: ({ a, b }) => {
    const frond = (rot, len) => `<path d="M500 330 Q ${500 + len * 0.45} ${330 - len * 0.32} ${500 + len} ${330 + len * 0.12} Q ${500 + len * 0.55} ${330 - len * 0.12} 500 345 Z" fill="${a}" transform="rotate(${rot} 500 330)"/>`;
    return `<path d="M470 900 Q520 640 485 330 L520 330 Q560 640 530 900 Z" fill="${b}"/>${[-160, -125, -90 - 0, -55, -20, 15, 200].map((r, i) => frond(r, 300 - (i % 2) * 40)).join("")}<circle cx="480" cy="360" r="26" fill="${b}"/><circle cx="525" cy="365" r="26" fill="${b}"/>`;
  },
  compass: ({ a, b }) => {
    const pointer = (rot, r, w, col) => `<path d="M500 ${500 - r} L${500 + w} 500 L500 ${500 + r} L${500 - w} 500 Z" fill="${col}" transform="rotate(${rot} 500 500)"/>`;
    return `<circle cx="500" cy="500" r="430" fill="none" stroke="${a}" stroke-width="16"/><circle cx="500" cy="500" r="395" fill="none" stroke="${a}" stroke-width="6" stroke-dasharray="6 18"/>
      ${pointer(45, 300, 50, b)}${pointer(-45, 300, 50, b)}${pointer(0, 420, 70, a)}${pointer(90, 420, 70, a)}
      <path d="M500 80 L570 500 L500 500 Z" fill="${b}"/><path d="M500 920 L430 500 L500 500 Z" fill="${b}"/><path d="M80 500 L500 430 L500 500 Z" fill="${b}"/><path d="M920 500 L500 570 L500 500 Z" fill="${b}"/>
      <circle cx="500" cy="500" r="46" fill="${a}"/><circle cx="500" cy="500" r="18" fill="${b}"/>`;
  },
  castle: ({ a, b }) => {
    const merlons = (x, y, w, n) => Array.from({ length: n }, (_, i) => `<rect x="${x + i * (w / n) + w / n / 6}" y="${y - 50}" width="${(w / n) * 0.66}" height="56" fill="${a}"/>`).join("");
    return `<rect x="160" y="380" width="180" height="500" fill="${a}"/>${merlons(160, 380, 180, 3)}<rect x="660" y="380" width="180" height="500" fill="${a}"/>${merlons(660, 380, 180, 3)}
      <rect x="380" y="240" width="240" height="640" fill="${a}"/>${merlons(380, 240, 240, 4)}<rect x="320" y="520" width="360" height="360" fill="${a}"/>
      <path d="M440 880 L440 720 A60 60 0 0 1 560 720 L560 880 Z" fill="${b}"/><rect x="475" y="340" width="50" height="90" rx="25" fill="${b}"/><rect x="225" y="470" width="50" height="80" rx="25" fill="${b}"/><rect x="725" y="470" width="50" height="80" rx="25" fill="${b}"/><rect x="120" y="880" width="760" height="40" rx="10" fill="${a}"/>`;
  },
  guitar: ({ a, b }) =>
    `<g transform="rotate(-30 500 500)"><rect x="470" y="40" width="60" height="460" rx="12" fill="${a}"/><rect x="450" y="20" width="100" height="90" rx="20" fill="${a}"/>
     <path d="M500 420 C 330 420, 320 560, 400 610 C 280 650, 280 900, 500 900 C 720 900, 720 650, 600 610 C 680 560, 670 420, 500 420 Z" fill="${a}"/>
     <circle cx="500" cy="640" r="72" fill="${b}"/><rect x="440" y="780" width="120" height="26" rx="10" fill="${b}"/>
     ${[480, 493, 507, 520].map((x) => `<line x1="${x}" y1="60" x2="${x}" y2="790" stroke="${b}" stroke-width="3"/>`).join("")}</g>`,
  ring: ({ a }) => `<circle cx="500" cy="500" r="460" fill="none" stroke="${a}" stroke-width="24"/><circle cx="500" cy="500" r="410" fill="none" stroke="${a}" stroke-width="8"/>`,
  pin: ({ a, b }) => `<path d="M500 940 C 380 760, 230 600, 230 420 A270 270 0 0 1 770 420 C 770 600, 620 760, 500 940 Z" fill="${a}"/><circle cx="500" cy="420" r="110" fill="${b}"/>`,
  spain: ({ a }) => {
    // simplified Spain silhouette, projected from real coastline coordinates (original generalised drawing)
    const p = [[40,196],[113,162],[157,140],[215,160],[303,159],[390,175],[442,169],[507,178],[588,179],[617,210],[675,234],[770,229],[843,263],[949,270],[960,292],[945,325],[880,369],[807,399],[785,434],[748,474],[719,508],[695,556],[708,604],[735,625],[683,666],[664,705],[647,734],[595,753],[558,818],[500,816],[398,820],[354,844],[325,873],[310,887],[277,859],[252,811],[215,777],[179,772],[171,734],[190,676],[201,614],[175,537],[208,508],[219,474],[219,407],[259,354],[237,316],[179,325],[120,301],[73,321],[69,273],[44,225]];
    const d = p.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") + " Z";
    return `<g transform="translate(20 60) scale(0.9)"><path d="${d}" fill="${a}" stroke="${a}" stroke-width="10" stroke-linejoin="round"/><ellipse cx="934" cy="540" rx="44" ry="30" fill="${a}"/><ellipse cx="1018" cy="503" rx="22" ry="11" fill="${a}"/><ellipse cx="823" cy="601" rx="15" ry="12" fill="${a}"/></g>`;
  },
  dots: ({ a }) => Array.from({ length: 5 }, (_, i) => `<circle cx="${180 + i * 160}" cy="500" r="36" fill="${a}"/>`).join(""),
};

// ---------- colourways ----------
const ART = [
  ["sun-gold", "sun", { a: C.gold, b: C.red }],
  ["sun-red", "sun", { a: C.red, b: C.gold }],
  ["sunset-warm", "sunset", { a: C.yellow, b: C.red, c: C.sea }],
  ["sunset-cream", "sunset", { a: C.gold2, b: C.orange, c: C.cream }],
  ["waves-navy", "waves", { a: C.sea }],
  ["waves-cream", "waves", { a: C.cream }],
  ["flagband", "flagband", { a: C.red, b: C.yellow }],
  ["stripes-rg", "stripes", { a: C.red, b: C.gold }],
  ["laurel-gold", "laurel", { a: C.gold }],
  ["laurel-ink", "laurel", { a: C.ink }],
  ["star8-gold", "star8", { a: C.gold, b: C.red }],
  ["star8-navy", "star8", { a: C.navy, b: C.sea }],
  ["azulejo-blue", "azulejo", { a: C.sea, b: C.white }],
  ["football", "football", { a: C.white, b: C.ink }],
  ["football-gold", "football", { a: C.gold2, b: C.red }],
  ["pitch-white", "pitch", { a: C.white }],
  ["pitch-ink", "pitch", { a: C.ink }],
  ["padel-red", "padel", { a: C.red, b: C.white, c: C.yellow }],
  ["padel-ink", "padel", { a: C.ink, b: C.white, c: C.yellow }],
  ["bike-gold", "bike", { a: C.gold }],
  ["bike-ink", "bike", { a: C.ink }],
  ["mountain-gold", "mountain", { a: C.gold, b: C.white }],
  ["mountain-ink", "mountain", { a: C.ink, b: C.white }],
  ["shell-yellow", "shell", { a: C.yellow, b: C.navy }],
  ["shell-gold", "shell", { a: C.gold, b: C.ink }],
  ["arrow-yellow", "arrow", { a: C.yellow }],
  ["checkered", "checkered", { a: C.white, b: C.ink }],
  ["checkered-ink", "checkered", { a: C.ink, b: C.white }],
  ["gauge-gold", "gauge", { a: C.gold, b: C.red }],
  ["gauge-ink", "gauge", { a: C.ink, b: C.red }],
  ["fan-red", "fan", { a: C.red, b: C.gold2 }],
  ["burst", "burst", { a: C.red, b: C.yellow }],
  ["olive", "olive", { a: C.green, b: C.red, c: C.ink }],
  ["olive-cream", "olive", { a: "#6f8f3a", b: C.red, c: C.cream }],
  ["vermut", "vermut", { a: C.ink, b: C.red, c: C.orange }],
  ["vermut-cream", "vermut", { a: C.cream, b: C.red, c: C.orange }],
  ["palm-sea", "palm", { a: "#2f7d5b", b: "#7a4a24" }],
  ["palm-cream", "palm", { a: C.cream, b: C.cream }],
  ["compass-gold", "compass", { a: C.gold, b: C.red }],
  ["compass-navy", "compass", { a: C.navy, b: C.red }],
  ["castle-gold", "castle", { a: C.gold, b: "rgba(0,0,0,0)" }],
  ["castle-red", "castle", { a: C.red, b: "rgba(0,0,0,0)" }],
  ["guitar-gold", "guitar", { a: C.gold, b: C.ink }],
  ["guitar-ink", "guitar", { a: C.ink, b: C.cream }],
  ["ring-gold", "ring", { a: C.gold }],
  ["ring-ink", "ring", { a: C.ink }],
  ["ring-cream", "ring", { a: C.cream }],
  ["pin-red", "pin", { a: C.red, b: C.yellow }],
  ["spain-gold", "spain", { a: C.gold }],
  ["spain-red", "spain", { a: C.red }],
  ["spain-ink", "spain", { a: C.ink }],
  ["dots-gold", "dots", { a: C.gold }],
];

await mkdir(OUT, { recursive: true });
const manifest = {};
for (const [name, motif, colors] of ART) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1000 1000">${M[motif](colors)}</svg>`;
  const png = await sharp(Buffer.from(svg)).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  await writeFile(new URL(`${name}.png`, OUT), png.data);
  manifest[name] = +(png.info.height / png.info.width).toFixed(4);
}
// Official brand artwork (supplied by the brand)
for (const [name, file] of [["logo-lion", "logo-lion.png"], ["logo-text", "logo-text.png"], ["logo-full", "logo-full.png"]]) {
  const src = new URL(`../public/brand/${file}`, import.meta.url).pathname;
  const out = await sharp(src).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  await writeFile(new URL(`${name}.png`, OUT), out.data);
  manifest[name] = +(out.info.height / out.info.width).toFixed(4);
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(Object.keys(manifest).length, "art files");

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
  // ───── wine (generic, no designation-of-origin marks) ─────
  wineglass: ({ a, b }) =>
    `<path d="M318 300 L682 300 C 680 405 628 482 500 502 C 372 482 320 405 318 300 Z" fill="${b}"/>
     <path d="M330 110 L670 110 C 700 330 640 482 500 506 C 360 482 300 330 330 110 Z" fill="none" stroke="${a}" stroke-width="28" stroke-linejoin="round"/>
     <rect x="486" y="500" width="28" height="330" fill="${a}"/><ellipse cx="500" cy="848" rx="175" ry="34" fill="${a}"/>
     <path d="M380 170 C 372 240 378 280 392 320" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="round" opacity=".55"/>`,
  porron: ({ a, b }) =>
    `<path d="M700 640 L935 230" stroke="${a}" stroke-width="56" stroke-linecap="round"/><path d="M712 628 L932 240" stroke="${b}" stroke-width="16" stroke-linecap="round"/>
     <path d="M445 110 L555 110 L552 380 C 620 450 790 650 800 800 Q 800 875 728 875 L272 875 Q 200 875 200 800 C 210 650 380 450 448 380 Z" fill="none" stroke="${a}" stroke-width="28" stroke-linejoin="round"/>
     <path d="M232 700 L768 700 C 776 735 780 770 780 800 Q 780 855 728 855 L272 855 Q 220 855 220 800 C 220 770 224 735 232 700 Z" fill="${b}"/>
     <rect x="425" y="86" width="150" height="40" rx="12" fill="${a}"/>`,
  grapes: ({ a, b, c }) => {
    const pos = [[380,380],[500,380],[620,380],[440,480],[560,480],[380,580],[500,580],[620,580],[440,680],[560,680],[500,780]];
    return `<path d="M500 330 C 500 250 540 190 600 150" fill="none" stroke="${c}" stroke-width="22" stroke-linecap="round"/>
      <path d="M520 230 C 600 140 760 150 820 230 C 740 300 600 300 520 230 Z" fill="${b}"/>
      ${pos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="62" fill="${a}"/><circle cx="${x - 20}" cy="${y - 22}" r="14" fill="#fff" opacity=".35"/>`).join("")}`;
  },
  bottle: ({ a, b }) =>
    `<path d="M440 90 L560 90 L560 300 C 560 340 640 370 640 450 L640 880 Q640 910 610 910 L390 910 Q360 910 360 880 L360 450 C 360 370 440 340 440 300 Z" fill="${a}"/>
     <rect x="380" y="540" width="240" height="210" rx="10" fill="${b}"/><rect x="430" y="80" width="140" height="40" rx="10" fill="${b}"/>
     <path d="M410 600 H590 M410 650 H560 M410 700 H520" stroke="${a}" stroke-width="14" stroke-linecap="round"/>`,

  // ───── embroidery-safe (flat, Printful thread colours only) ─────
  // Royal crown in the style of the brand lion's crown: cross + orb, five pearled arches over red velvet,
  // fleur-tipped circlet with jewels. Flat shapes, thread colours only (a gold, b red, c bright gold, d white).
  crownemb: ({ a, b, c = "#FFCC00", d = "#FFFFFF" }) => {
    // cubic arches springing from the fleurons and dipping where they meet under the orb (like the lion's crown)
    const A = [[205, 548, 190, 320, 420, 285, 500, 352], [795, 548, 810, 320, 580, 285, 500, 352], [352, 552, 352, 395, 455, 320, 500, 352], [648, 552, 648, 395, 545, 320, 500, 352]];
    const bez = (q, t) => { const [x0, y0, x1, y1, x2, y2, x3, y3] = q, u = 1 - t; return [u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]; };
    const arch = (q) => `<path d="M${q[0]} ${q[1]} C ${q[2]} ${q[3]} ${q[4]} ${q[5]} ${q[6]} ${q[7]}" fill="none" stroke="${a}" stroke-width="30" stroke-linecap="round"/>`;
    const pearls = (q, n) => Array.from({ length: n }, (_, i) => { const [x, y] = bez(q, (i + 1) / (n + 1)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11.5" fill="${c}"/>`; }).join("");
    const fleur = (x, h) => `<path d="M${x} ${660 - h} C ${x - 22} ${660 - h * 0.7} ${x - 52} ${660 - h * 0.55} ${x - 44} ${660 - h * 0.22} C ${x - 30} ${640} ${x - 14} ${652} ${x} 660 C ${x + 14} ${652} ${x + 30} ${640} ${x + 44} ${660 - h * 0.22} C ${x + 52} ${660 - h * 0.55} ${x + 22} ${660 - h * 0.7} ${x} ${660 - h} Z" fill="${a}"/>`;
    return `
     <path d="M196 662 L205 548 C 190 320 420 285 500 352 C 580 285 810 320 795 548 L804 662 Z" fill="${b}"/>
     <path d="M500 352 L500 552" stroke="${a}" stroke-width="30" stroke-linecap="round"/>
     ${A.map(arch).join("")}
     ${A.map((q, i) => pearls(q, i < 2 ? 7 : 4)).join("")}${[420, 470, 515].map((y) => `<circle cx="500" cy="${y}" r="11.5" fill="${c}"/>`).join("")}
     ${[[205, 130], [352, 120], [500, 125], [648, 120], [795, 130]].map(([x, h]) => fleur(x, h)).join("")}
     ${[278, 426, 574, 722].map((x) => `<path d="M${x} 618 L${x + 14} 662 H${x - 14} Z" fill="${a}"/><circle cx="${x}" cy="606" r="13" fill="${c}"/>`).join("")}
     <circle cx="500" cy="318" r="42" fill="${a}"/><path d="M462 318 H538" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
     <path d="M484 172 H516 V208 H548 V240 H516 V282 H484 V240 H452 V208 H484 Z" fill="${a}"/>
     <path d="M150 662 H850 L838 772 Q500 800 162 772 Z" fill="${a}"/>
     <path d="M152 664 H848" stroke="${c}" stroke-width="14" stroke-linecap="round"/><path d="M166 768 Q500 796 834 768" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round"/>
     ${[[230, d], [365, b], [500, d], [635, b], [770, d]].map(([x, col], i) => (i % 2 ? `<rect x="${x - 24}" y="694" width="48" height="48" rx="7" transform="rotate(45 ${x} 718)" fill="${col}"/>` : `<ellipse cx="${x}" cy="718" rx="28" ry="32" fill="${col}"/>`)).join("")}
     ${[298, 432, 568, 702].map((x) => `<circle cx="${x}" cy="718" r="10" fill="${c}"/>`).join("")}`;
  },
  // ───── football: club-colour abstractions (colours + city only — no crests, club names or marks) ─────
  // Terrace scarf: knitted stripes with a woven centre panel and fringes.
  scarf: ({ a, b, c }) => {
    let out = `<defs><clipPath id="sc"><rect x="70" y="380" width="860" height="240" rx="14"/></clipPath></defs><g clip-path="url(#sc)">`;
    for (let i = 0; i < 14; i++) out += `<rect x="${70 + i * 61.5}" y="380" width="62" height="240" fill="${i % 2 ? b : a}"/>`;
    out += `<rect x="330" y="380" width="340" height="240" fill="${c}"/>`;
    for (let y = 392; y < 620; y += 14) out += `<path d="M70 ${y} H930" stroke="#000" stroke-opacity=".08" stroke-width="3"/>`; // knit rows
    out += `</g>`;
    for (let i = 0; i < 18; i++) {
      out += `<path d="M${84 + i * 46} 620 v${46 + (i % 3) * 6}" stroke="${i % 2 ? b : a}" stroke-width="10" stroke-linecap="round"/>`;
      out += `<path d="M${84 + i * 46} 380 v-${46 + (i % 3) * 6}" stroke="${i % 2 ? b : a}" stroke-width="10" stroke-linecap="round"/>`;
    }
    return out + `<rect x="352" y="402" width="296" height="196" rx="8" fill="none" stroke="${a}" stroke-width="10"/>`;
  },
  // Modern kit stripes: three sharp slanted bars in the club colours (sportswear speed stripes).
  kitbars: ({ a, b, c }) =>
    [a, b, c].map((col, i) => `<path d="M${120 + i * 250} 760 L${330 + i * 250} 240 L${470 + i * 250} 240 L${260 + i * 250} 760 Z" fill="${col}"/>`).join(""),
  // Stadium seen from above as topographic rings, pitch at the heart.
  stadium: ({ a, b }) => {
    let out = "";
    for (let i = 0; i < 9; i++) {
      const w = 880 - i * 50, h = 640 - i * 36;
      out += `<rect x="${500 - w / 2}" y="${500 - h / 2}" width="${w}" height="${h}" rx="${h / 2.2}" fill="none" stroke="${i % 2 ? b : a}" stroke-width="${i < 2 ? 12 : 7}" opacity="${(1 - i * 0.06).toFixed(2)}"/>`;
    }
    out += `<rect x="330" y="390" width="340" height="220" fill="none" stroke="${a}" stroke-width="8"/><path d="M500 390 V610" stroke="${a}" stroke-width="6"/><circle cx="500" cy="500" r="40" fill="none" stroke="${a}" stroke-width="6"/>`;
    out += `<rect x="330" y="450" width="40" height="100" fill="none" stroke="${a}" stroke-width="5"/><rect x="630" y="450" width="40" height="100" fill="none" stroke="${a}" stroke-width="5"/><circle cx="500" cy="500" r="7" fill="${b}"/>`;
    return out;
  },
  // Coach's board: pitch, Xs and Os, dashed runs.
  tactics: ({ a, b }) => {
    let out = `<rect x="110" y="140" width="780" height="720" rx="18" fill="none" stroke="${a}" stroke-width="10"/><path d="M110 500 H890" stroke="${a}" stroke-width="6"/><circle cx="500" cy="500" r="90" fill="none" stroke="${a}" stroke-width="6"/>`;
    out += `<rect x="330" y="140" width="340" height="130" fill="none" stroke="${a}" stroke-width="6"/><rect x="330" y="730" width="340" height="130" fill="none" stroke="${a}" stroke-width="6"/>`;
    const o = [[300, 640], [500, 600], [700, 640], [400, 420], [620, 400]], x = [[260, 300], [480, 330], [720, 290], [560, 720]];
    for (const [cx, cy] of o) out += `<circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="${b}" stroke-width="10"/>`;
    for (const [cx, cy] of x) out += `<path d="M${cx - 22} ${cy - 22} L${cx + 22} ${cy + 22} M${cx + 22} ${cy - 22} L${cx - 22} ${cy + 22}" stroke="${a}" stroke-width="10" stroke-linecap="round"/>`;
    out += `<path d="M300 610 C 340 520 380 470 400 450" fill="none" stroke="${b}" stroke-width="7" stroke-dasharray="18 14"/><path d="M620 372 C 600 300 560 250 500 210" fill="none" stroke="${b}" stroke-width="7" stroke-dasharray="18 14"/><path d="M488 196 l14 14 -20 4 z" fill="${b}"/>`;
    return out;
  },

  // Painted red-and-gold brush swoosh (as under the lookbook lettering): tapered strokes with dry-brush streaks.
  swoosh: ({ a, b }) => {
    let r = 11;
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    // centreline: gentle rising curve; thickness tapers to a point on the left, dry-brush break-up on the right
    const P = (t, y0, y1) => [70 + 860 * t, y0 + (y1 - y0) * t - 40 * Math.sin(Math.PI * t)];
    const N = (t, y0, y1) => { const [x1, ya] = P(t - 0.005, y0, y1), [x2, yb] = P(t + 0.005, y0, y1), dx = x2 - x1, dy = yb - ya, l = Math.hypot(dx, dy); return [-dy / l, dx / l]; };
    const W = (t, k) => k * Math.min(1, Math.pow(t / 0.35, 0.8)) * (t > 0.85 ? 1 - (t - 0.85) * 2.2 : 1);
    const stroke = (y0, y1, k, col) => {
      const top = [], bot = [];
      for (let i = 0; i <= 80; i++) {
        const t = i / 80, [x, y] = P(t, y0, y1), [nx, ny] = N(Math.min(0.995, Math.max(0.005, t)), y0, y1), w = W(t, k) * (0.92 + rnd() * 0.12);
        top.push(`${(x + nx * w).toFixed(1)} ${(y + ny * w).toFixed(1)}`);
        bot.push(`${(x - nx * w * 0.8).toFixed(1)} ${(y - ny * w * 0.8).toFixed(1)}`);
      }
      let out = `<path d="M${top.join(" L")} L${bot.reverse().join(" L")} Z" fill="${col}"/>`;
      for (let i = 0; i < 22; i++) {
        const off = (rnd() * 2 - 1) * k * 1.05, t0 = 0.2 + rnd() * 0.45, t1 = Math.min(1.04, t0 + 0.3 + rnd() * 0.45), pts = [];
        for (let j = 0; j <= 20; j++) { const t = t0 + ((t1 - t0) * j) / 20, [x, y] = P(t, y0, y1), [nx, ny] = N(Math.min(0.995, t), y0, y1); pts.push(`${(x + nx * off).toFixed(1)} ${(y + ny * off).toFixed(1)}`); }
        out += `<path d="M${pts.join(" L")}" fill="none" stroke="${col}" stroke-width="${(2.5 + rnd() * 6).toFixed(1)}" stroke-linecap="round" opacity="${(0.6 + rnd() * 0.4).toFixed(2)}"/>`;
      }
      return out;
    };
    return stroke(500, 430, 38, a) + stroke(590, 525, 34, b);
  },
  swooshemb: ({ a, b }) =>
    `<path d="M70 480 C 300 430 650 360 930 380 L 900 420 C 640 430 320 520 110 540 Z" fill="${a}"/>
     <path d="M140 580 C 360 530 660 470 930 470 L 900 508 C 650 520 380 600 170 622 Z" fill="${b}"/>`,
  flagemb: ({ a, b }) => `<rect x="60" y="260" width="880" height="480" rx="40" fill="${a}"/><rect x="60" y="380" width="880" height="240" fill="${b}"/>`,

  // ───── military-inspired (generic: no armed-forces emblems, ranks, unit crests or weapons) ─────
  camo: ({ a, b, c, d }) => {
    const blobs = [[180,200,170,110,20],[520,170,190,120,-15],[820,240,150,120,30],[300,450,210,130,-25],[680,470,200,140,10],[150,720,170,120,35],[480,760,220,130,-10],[830,760,160,120,20],[600,320,110,70,40],[380,620,120,80,-30]];
    const cols = [b, c, d];
    return `<defs><clipPath id="cc"><rect x="60" y="60" width="880" height="880" rx="90"/></clipPath></defs><g clip-path="url(#cc)"><rect width="1000" height="1000" fill="${a}"/>
      ${blobs.map(([x, y, rx, ry, r], i) => `<path d="M${x - rx} ${y} C ${x - rx} ${y - ry * 1.3}, ${x + rx * 0.4} ${y - ry * 1.1}, ${x + rx} ${y - ry * 0.2} C ${x + rx * 1.2} ${y + ry * 0.8}, ${x - rx * 0.2} ${y + ry * 1.2}, ${x - rx} ${y} Z" fill="${cols[i % 3]}" transform="rotate(${r} ${x} ${y})"/>`).join("")}</g>`;
  },
  dogtags: ({ a, b }) =>
    `<path d="M300 80 C 420 300 520 330 560 420 M700 80 C 620 260 600 330 620 400" fill="none" stroke="${b}" stroke-width="12" stroke-dasharray="2 22" stroke-linecap="round"/>
     <g transform="rotate(-14 420 600)"><rect x="270" y="420" width="300" height="440" rx="120" fill="${a}"/><circle cx="420" cy="480" r="22" fill="${b}"/>
       <rect x="320" y="560" width="200" height="22" rx="11" fill="${b}" opacity=".55"/><rect x="320" y="610" width="160" height="22" rx="11" fill="${b}" opacity=".55"/><rect x="320" y="660" width="190" height="22" rx="11" fill="${b}" opacity=".55"/></g>
     <g transform="rotate(10 640 560)"><rect x="500" y="380" width="280" height="410" rx="112" fill="none" stroke="${a}" stroke-width="22"/><circle cx="640" cy="440" r="20" fill="${a}"/></g>`,
  patchflag: ({ a, b, c }) =>
    `<rect x="60" y="250" width="880" height="500" rx="70" fill="${c}"/><rect x="95" y="285" width="810" height="430" rx="46" fill="none" stroke="${b}" stroke-width="10" stroke-dasharray="18 14"/>
     <rect x="140" y="330" width="720" height="340" rx="16" fill="${a}"/><rect x="140" y="415" width="720" height="170" fill="${b}"/>`,

  // ───── professions (generic illustrations — no official emblems, crests or protected signs) ─────
  stethoscope: ({ a, b }) =>
    `<path d="M310 120 V300 A190 190 0 0 0 690 300 V120" fill="none" stroke="${a}" stroke-width="40" stroke-linecap="round"/>
     <circle cx="310" cy="110" r="34" fill="${b}"/><circle cx="690" cy="110" r="34" fill="${b}"/>
     <path d="M500 490 V610 C 500 760 720 800 730 680" fill="none" stroke="${a}" stroke-width="40" stroke-linecap="round"/>
     <circle cx="730" cy="640" r="110" fill="${a}"/><circle cx="730" cy="640" r="58" fill="${b}"/>`,
  heartecg: ({ a, b }) =>
    `<path d="M500 880 C 160 640 90 470 120 340 C 160 170 380 130 500 300 C 620 130 840 170 880 340 C 910 470 840 640 500 880 Z" fill="${a}"/>
     <path d="M150 500 L360 500 L420 380 L490 650 L560 300 L630 560 L670 500 L850 500" fill="none" stroke="${b}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`,
  ecg: ({ a, b }) =>
    `<path d="M40 520 L320 520 L380 380 L450 720 L540 220 L620 620 L670 520 L960 520" fill="none" stroke="${a}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/><circle cx="960" cy="520" r="26" fill="${b}"/>`,
  cap: ({ a, b }) =>
    `<path d="M130 560 C 130 380 320 290 520 290 C 740 290 880 380 880 470 L860 560 Z" fill="${a}"/>
     <rect x="130" y="556" width="730" height="90" rx="8" fill="${b}"/>
     <path d="M180 642 Q 500 830 830 642 L800 705 Q 500 870 210 705 Z" fill="${a}"/>
     <circle cx="500" cy="430" r="62" fill="none" stroke="${b}" stroke-width="20"/><circle cx="500" cy="430" r="20" fill="${b}"/>`,
  firehelmet: ({ a, b }) =>
    `<path d="M250 640 C 230 250 770 250 750 640 Z" fill="${a}"/>
     <path d="M474 250 C 474 230 526 230 526 250 L536 640 L464 640 Z" fill="${b}"/>
     <path d="M80 640 Q 500 720 920 640 Q 960 700 900 740 Q 500 820 60 720 Q 40 680 80 640 Z" fill="${a}"/>
     <path d="M500 380 L590 420 L575 530 L500 580 L425 530 L410 420 Z" fill="${b}"/><circle cx="500" cy="470" r="34" fill="${a}"/>`,
  flame: ({ a, b }) =>
    `<path d="M500 90 C 560 260 760 330 760 580 C 760 760 640 900 500 900 C 360 900 240 760 240 580 C 240 450 320 380 360 300 C 380 420 430 460 470 470 C 440 330 460 200 500 90 Z" fill="${a}"/>
     <path d="M500 480 C 540 580 640 620 640 730 C 640 820 580 880 500 880 C 420 880 360 820 360 730 C 360 660 410 620 430 570 C 450 630 480 650 500 650 C 485 590 485 530 500 480 Z" fill="${b}"/>`,
  taxi: ({ a, b, c }) => {
    let chk = "";
    for (let i = 0; i < 14; i++) chk += `<rect x="${170 + i * 47}" y="${i % 2 ? 560 : 590}" width="47" height="30" fill="${c}"/>`;
    return `<rect x="420" y="250" width="160" height="60" rx="10" fill="${b}"/>
      <path d="M130 520 L230 330 Q 250 300 290 300 L710 300 Q 750 300 770 330 L870 520 Q 930 530 930 590 L930 690 Q 930 720 900 720 L100 720 Q 70 720 70 690 L70 590 Q 70 530 130 520 Z" fill="${a}"/>
      <path d="M260 510 L320 360 L480 360 L480 510 Z M520 510 L520 360 L680 360 L740 510 Z" fill="${c}"/>
      <rect x="160" y="560" width="680" height="60" fill="${b}"/>${chk}
      <circle cx="260" cy="730" r="92" fill="${c}"/><circle cx="260" cy="730" r="58" fill="${a}"/><circle cx="740" cy="730" r="92" fill="${c}"/><circle cx="740" cy="730" r="58" fill="${a}"/>`;
  },
  truck: ({ a, b, c }) =>
    `<rect x="60" y="250" width="560" height="380" rx="18" fill="${a}"/>
     <path d="M640 360 L800 360 Q 830 360 850 390 L930 500 Q 945 520 945 545 L945 630 L640 630 Z" fill="${b}"/>
     <path d="M690 400 L800 400 L870 500 L690 500 Z" fill="${c}"/><rect x="60" y="630" width="885" height="40" fill="${a}"/>
     ${[200, 360, 790].map((x) => `<circle cx="${x}" cy="700" r="84" fill="${c}"/><circle cx="${x}" cy="700" r="40" fill="${a}"/>`).join("")}`,
  book: ({ a, b }) =>
    `<path d="M500 300 C 400 240 230 230 100 270 L100 800 C 230 760 400 770 500 830 Z" fill="${a}"/>
     <path d="M500 300 C 600 240 770 230 900 270 L900 800 C 770 760 600 770 500 830 Z" fill="${a}" opacity=".85"/>
     <path d="M160 360 C 260 340 360 350 440 380 M160 450 C 260 430 360 440 440 470 M160 540 C 260 520 360 530 440 560 M560 380 C 640 350 740 340 840 360 M560 470 C 640 440 740 430 840 450" stroke="${b}" stroke-width="16" stroke-linecap="round" fill="none"/>
     <path d="M500 300 V830" stroke="${b}" stroke-width="16"/>
     <path d="M640 120 C 700 70 790 110 780 190 C 770 260 720 290 690 270 C 660 290 610 260 600 190 C 595 140 610 120 640 120 Z" fill="${b}"/><path d="M690 120 C 690 90 710 60 740 50" stroke="${a}" stroke-width="12" fill="none" stroke-linecap="round"/>`,
  chef: ({ a, b }) =>
    `<path d="M260 520 C 140 520 110 360 220 315 C 230 190 390 155 440 235 C 485 120 660 135 680 250 C 790 195 920 300 840 420 C 900 470 860 560 760 540 L740 700 L270 700 Z" fill="${a}"/>
     <rect x="250" y="690" width="500" height="130" rx="18" fill="${a}"/><path d="M280 735 H720" stroke="${b}" stroke-width="20" stroke-linecap="round"/>
     <path d="M400 560 V660 M500 540 V660 M600 560 V660" stroke="${b}" stroke-width="14" stroke-linecap="round" opacity=".55"/>`,
  wrench: ({ a, b }) =>
    `<defs><mask id="wm"><rect width="1000" height="1000" fill="white"/><rect x="-60" y="-200" width="120" height="230" transform="translate(300 300) rotate(-45)" fill="black"/><circle cx="700" cy="700" r="48" fill="black"/></mask></defs>
     <g mask="url(#wm)"><g transform="rotate(-45 500 500)"><rect x="440" y="250" width="120" height="560" rx="40" fill="${a}"/></g>
     <circle cx="300" cy="300" r="185" fill="${a}"/><circle cx="700" cy="700" r="125" fill="${a}"/></g>
     <circle cx="700" cy="700" r="48" fill="none" stroke="${b}" stroke-width="18"/>`,
  tractor: ({ a, b, c }) =>
    `<path d="M300 300 L540 300 L560 520 L300 520 Z" fill="${a}"/><path d="M340 340 L500 340 L515 480 L340 480 Z" fill="${c}"/>
     <path d="M540 440 L840 460 Q 880 465 880 510 L880 620 L520 620 Z" fill="${a}"/><rect x="700" y="360" width="30" height="100" fill="${b}"/>
     <circle cx="330" cy="660" r="200" fill="${b}"/><circle cx="330" cy="660" r="90" fill="${a}"/>
     <circle cx="770" cy="720" r="120" fill="${b}"/><circle cx="770" cy="720" r="52" fill="${a}"/>`,
  scissors: ({ a, b }) =>
    `<g transform="rotate(-18 420 520)">
       <path d="M400 560 L250 120 L300 110 L455 540 Z" fill="${a}"/><path d="M440 560 L590 120 L540 110 L385 540 Z" fill="${a}"/>
       <circle cx="330" cy="720" r="95" fill="none" stroke="${a}" stroke-width="42"/><circle cx="510" cy="720" r="95" fill="none" stroke="${a}" stroke-width="42"/>
       <path d="M395 560 L360 640 M445 560 L480 640" stroke="${a}" stroke-width="42" stroke-linecap="round"/><circle cx="420" cy="540" r="24" fill="${b}"/></g>
     <g transform="rotate(14 780 520)"><rect x="740" y="160" width="90" height="700" rx="18" fill="${b}"/>${Array.from({ length: 14 }, (_, i) => `<rect x="690" y="${185 + i * 46}" width="70" height="24" rx="8" fill="${b}"/>`).join("")}</g>`,
  paw: ({ a, b }) =>
    `<ellipse cx="500" cy="660" rx="210" ry="180" fill="${a}"/>
     <ellipse cx="270" cy="440" rx="80" ry="105" fill="${a}" transform="rotate(-20 270 440)"/><ellipse cx="410" cy="300" rx="80" ry="110" fill="${a}" transform="rotate(-8 410 300)"/>
     <ellipse cx="590" cy="300" rx="80" ry="110" fill="${a}" transform="rotate(8 590 300)"/><ellipse cx="730" cy="440" rx="80" ry="105" fill="${a}" transform="rotate(20 730 440)"/>
     <path d="M500 760 C 400 690 380 640 390 610 C 405 560 470 555 500 600 C 530 555 595 560 610 610 C 620 640 600 690 500 760 Z" fill="${b}"/>`,
  bolt: ({ a, b }) =>
    `<circle cx="500" cy="500" r="430" fill="none" stroke="${b}" stroke-width="34"/>
     <path d="M560 110 L260 560 L470 560 L420 890 L740 410 L530 410 Z" fill="${a}"/>`,
  hardhat: ({ a, b }) =>
    `<path d="M220 620 C 220 360 780 360 780 620 Z" fill="${a}"/><path d="M455 330 C 455 300 545 300 545 330 L560 620 L440 620 Z" fill="${b}"/>
     <path d="M110 620 L890 620 Q 920 620 910 660 L900 690 L100 690 L90 660 Q 80 620 110 620 Z" fill="${a}"/>
     <rect x="250" y="750" width="230" height="110" fill="${b}"/><rect x="520" y="750" width="230" height="110" fill="${b}"/><rect x="385" y="880" width="230" height="80" fill="${b}"/>`,
  coffee: ({ a, b }) =>
    `<path d="M200 400 L740 400 L700 800 Q 690 860 630 860 L310 860 Q 250 860 240 800 Z" fill="${a}"/>
     <path d="M735 470 C 900 460 910 680 715 700" fill="none" stroke="${a}" stroke-width="44"/>
     <path d="M120 900 L820 900" stroke="${a}" stroke-width="34" stroke-linecap="round"/>
     <path d="M350 330 C 300 260 400 220 350 140 M470 330 C 420 260 520 220 470 140 M590 330 C 540 260 640 220 590 140" fill="none" stroke="${b}" stroke-width="26" stroke-linecap="round"/>`,
  scales: ({ a, b }) =>
    `<rect x="480" y="160" width="40" height="660" fill="${a}"/><path d="M330 880 L670 880 L620 820 L380 820 Z" fill="${a}"/><circle cx="500" cy="150" r="40" fill="${b}"/>
     <rect x="160" y="230" width="680" height="30" rx="15" fill="${a}"/>
     <path d="M200 260 L110 520 M200 260 L290 520 M800 260 L710 520 M800 260 L890 520" stroke="${a}" stroke-width="10"/>
     <path d="M80 520 L320 520 C 310 620 90 620 80 520 Z M680 520 L920 520 C 910 620 690 620 680 520 Z" fill="${b}"/>`,
  mortar: ({ a, b }) =>
    `<path d="M560 520 L840 120" stroke="${b}" stroke-width="70" stroke-linecap="round"/>
     <path d="M150 480 L850 480 C 850 700 700 820 500 820 C 300 820 150 700 150 480 Z" fill="${a}"/><rect x="120" y="450" width="760" height="60" rx="20" fill="${a}"/>
     <path d="M360 820 L640 820 L680 900 L320 900 Z" fill="${a}"/><path d="M250 600 H750" stroke="${b}" stroke-width="18" stroke-linecap="round"/>`,
  code: ({ a, b }) =>
    `<path d="M330 260 L110 500 L330 740" fill="none" stroke="${a}" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M670 260 L890 500 L670 740" fill="none" stroke="${a}" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M570 180 L430 820" stroke="${b}" stroke-width="56" stroke-linecap="round"/>`,
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
  ["crown-emb", "crownemb", { a: "#A67843", b: "#CC3333", c: "#FFCC00", d: "#FFFFFF" }],
  ["swoosh-rg", "swoosh", { a: "#c8102e", b: "#e0b030" }],
  ["swoosh-emb", "swooshemb", { a: "#CC3333", b: "#FFCC00" }],
  ["flag-emb", "flagemb", { a: "#CC3333", b: "#FFCC00" }],
  ["camo-olive", "camo", { a: "#4b5320", b: "#6b7a3a", c: "#2f3a1c", d: "#a89f6a" }],
  ["camo-sand", "camo", { a: "#c3b091", b: "#a48c63", c: "#7a6a4a", d: "#e0d2b0" }],
  ["camo-night", "camo", { a: "#1f2326", b: "#3a4046", c: "#0f1112", d: "#5a6168" }],
  ["dogtags-khaki", "dogtags", { a: "#c3b091", b: "#4b5320" }],
  ["dogtags-steel", "dogtags", { a: "#c9ccd1", b: "#6b7078" }],
  ["patchflag-olive", "patchflag", { a: "#c8102e", b: "#ffc400", c: "#4b5320" }],
  ["patchflag-khaki", "patchflag", { a: "#c8102e", b: "#ffc400", c: "#a48c63" }],
  ["wineglass-red", "wineglass", { a: C.ink, b: "#7b1e2b" }],
  ["wineglass-cream", "wineglass", { a: C.cream, b: "#a3263a" }],
  ["porron-gold", "porron", { a: C.gold, b: "#8e1f30" }],
  ["porron-ink", "porron", { a: C.ink, b: "#8e1f30" }],
  ["grapes-wine", "grapes", { a: "#5b1a3a", b: "#4f7a2a", c: "#6b4a2a" }],
  ["grapes-gold", "grapes", { a: C.gold, b: C.cream, c: C.gold2 }],
  ["bottle-wine", "bottle", { a: "#2a1a1f", b: C.cream }],
  ["bottle-cream", "bottle", { a: C.cream, b: C.red }],
  ["stethoscope-gold", "stethoscope", { a: C.gold, b: C.red, c: C.ink }],
  ["stethoscope-cream", "stethoscope", { a: C.cream, b: C.gold, c: C.ink }],
  ["heartecg-gold", "heartecg", { a: C.gold, b: C.red, c: C.ink }],
  ["heartecg-cream", "heartecg", { a: C.cream, b: C.gold, c: C.ink }],
  ["ecg-gold", "ecg", { a: C.gold, b: C.red, c: C.ink }],
  ["ecg-cream", "ecg", { a: C.cream, b: C.gold, c: C.ink }],
  ["cap-gold", "cap", { a: C.gold, b: C.red, c: C.ink }],
  ["cap-cream", "cap", { a: C.cream, b: C.gold, c: C.ink }],
  ["firehelmet-gold", "firehelmet", { a: C.gold, b: C.red, c: C.ink }],
  ["firehelmet-cream", "firehelmet", { a: C.cream, b: C.gold, c: C.ink }],
  ["flame-gold", "flame", { a: C.gold, b: C.red, c: C.ink }],
  ["flame-cream", "flame", { a: C.cream, b: C.gold, c: C.ink }],
  ["taxi-gold", "taxi", { a: C.gold, b: C.red, c: C.ink }],
  ["taxi-cream", "taxi", { a: C.cream, b: C.gold, c: C.ink }],
  ["truck-gold", "truck", { a: C.gold, b: C.red, c: C.ink }],
  ["truck-cream", "truck", { a: C.cream, b: C.gold, c: C.ink }],
  ["book-gold", "book", { a: C.gold, b: C.red, c: C.ink }],
  ["book-cream", "book", { a: C.cream, b: C.gold, c: C.ink }],
  ["chef-gold", "chef", { a: C.gold, b: C.red, c: C.ink }],
  ["chef-cream", "chef", { a: C.cream, b: C.gold, c: C.ink }],
  ["wrench-gold", "wrench", { a: C.gold, b: C.red, c: C.ink }],
  ["wrench-cream", "wrench", { a: C.cream, b: C.gold, c: C.ink }],
  ["tractor-gold", "tractor", { a: C.gold, b: C.red, c: C.ink }],
  ["tractor-cream", "tractor", { a: C.cream, b: C.gold, c: C.ink }],
  ["scissors-gold", "scissors", { a: C.gold, b: C.red, c: C.ink }],
  ["scissors-cream", "scissors", { a: C.cream, b: C.gold, c: C.ink }],
  ["paw-gold", "paw", { a: C.gold, b: C.red, c: C.ink }],
  ["paw-cream", "paw", { a: C.cream, b: C.gold, c: C.ink }],
  ["bolt-gold", "bolt", { a: C.gold, b: C.red, c: C.ink }],
  ["bolt-cream", "bolt", { a: C.cream, b: C.gold, c: C.ink }],
  ["hardhat-gold", "hardhat", { a: C.gold, b: C.red, c: C.ink }],
  ["hardhat-cream", "hardhat", { a: C.cream, b: C.gold, c: C.ink }],
  ["coffee-gold", "coffee", { a: C.gold, b: C.red, c: C.ink }],
  ["coffee-cream", "coffee", { a: C.cream, b: C.gold, c: C.ink }],
  ["scales-gold", "scales", { a: C.gold, b: C.red, c: C.ink }],
  ["scales-cream", "scales", { a: C.cream, b: C.gold, c: C.ink }],
  ["mortar-gold", "mortar", { a: C.gold, b: C.red, c: C.ink }],
  ["mortar-cream", "mortar", { a: C.cream, b: C.gold, c: C.ink }],
  ["code-gold", "code", { a: C.gold, b: C.red, c: C.ink }],
  ["code-cream", "code", { a: C.cream, b: C.gold, c: C.ink }],
];

// football: three motifs per club colourway (src/lib/catalog/football-teams.json)
const TEAMS = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../src/lib/catalog/football-teams.json", import.meta.url), "utf8"));
for (const t of TEAMS) {
  ART.push([`scarf-${t.key}`, "scarf", { a: t.a, b: t.b, c: t.c }]);
  ART.push([`kitbars-${t.key}`, "kitbars", { a: t.a, b: t.b, c: t.c }]);
  ART.push([`stadium-${t.key}`, "stadium", { a: t.a, b: t.b }]);
}
ART.push(["tactics-gold", "tactics", { a: "#f3ead7", b: "#d4a62a" }], ["stadium-gold", "stadium", { a: "#d4a62a", b: "#c8102e" }]);

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
// Lookbook artwork (generated for the brand from our lookbook, transparent PNG). Green-screen spill is
// neutralised (G clamped to max(R,B) on semi-transparent / greenish pixels) so no green fringe prints.
for (const name of ["lion-crowned", "crown-royal"]) {
  const src = new URL(`../public/brand/${name}.png`, import.meta.url).pathname;
  let raw;
  try {
    raw = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  } catch {
    continue; // not supplied yet
  }
  const { data, info } = raw;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 8) { data[i + 3] = 0; continue; }
    const m = Math.max(r, b);
    if (g > m + 12) {
      data[i + 1] = m; // despill
      if (g > 150 && r < 140 && b < 140) data[i + 3] = Math.round(a * 0.15); // leftover screen
    }
  }
  const out = await sharp(data, { raw: info }).trim({ threshold: 1 }).resize({ width: name === "lion-crowned" ? 1600 : 1200, kernel: "lanczos3" }).png({ compressionLevel: 9, palette: false }).toBuffer({ resolveWithObject: true });
  await writeFile(new URL(`${name}.png`, OUT), out.data);
  manifest[name] = +(out.info.height / out.info.width).toFixed(4);
}
// Illustrations imported through the admin (stored in storage site-art/, aspects recorded here)
try {
  const remote = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../src/lib/catalog/remote-art.json", import.meta.url), "utf8"));
  for (const [name, aspect] of Object.entries(remote)) manifest[name] ??= aspect;
} catch {}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(Object.keys(manifest).length, "art files");
// León series art (embroidery lions, badge, shield, band) — merged into the manifest just written
await import("./lion-art.mjs");
// Fútbol PRO art (big terrace prints, fp-*) — merged into the manifest as well
// own process: it loads its typefaces through a private fontconfig, which must be set before libvips starts
(await import("node:child_process")).execFileSync(process.execPath, [new URL("./futbol-art.mjs", import.meta.url).pathname], { stdio: "inherit" });

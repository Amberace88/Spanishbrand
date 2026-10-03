/**
 * Product silhouettes for the designer (400×400 SVG). Garments, bags and caps take the product colour;
 * full-bleed products (posters, cushions, cases, flags…) draw their face exactly on the print area
 * (`zone`), so the design the customer sees is the product face that gets printed.
 */
import type { KindSpec, SilhouetteKey, Zone } from "@/lib/personalization/kinds";

export function shade(hex: string, amt: number) {
  const n = parseInt((hex || "#ffffff").slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((1 << 24) | (c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1)}`;
}

/** Zone rectangle in SVG units (400 box). */
export function zoneRect(z: Zone, aspect: number) {
  const x = z.left * 4, y = z.top * 4, w = z.width * 4;
  return { x, y, w, h: w * aspect };
}

const TEE = "M140 60 L100 74 L36 122 L70 186 L110 166 L110 350 Q110 362 122 362 L278 362 Q290 362 290 350 L290 166 L330 186 L364 122 L300 74 L260 60";
const WOMTEE = "M146 62 L108 76 L52 118 L80 172 L118 156 Q110 210 122 262 Q114 312 118 352 Q118 362 130 362 L270 362 Q282 362 282 352 Q286 312 278 262 Q290 210 282 156 L320 172 L348 118 L292 76 L254 62";
const SWEAT = "M140 62 L100 76 Q70 90 60 140 L34 318 L74 330 L108 190 L110 340 L290 340 L292 190 L326 330 L366 318 L340 140 Q330 90 300 76 L260 62";
const HOODIE_BODY = "M148 72 Q200 46 252 72 L302 92 Q332 104 340 144 L366 318 L326 330 L296 196 L294 350 Q294 362 282 362 L118 362 Q106 362 106 350 L104 196 L74 330 L34 318 L60 144 Q68 104 98 92 Z";
const CROP_BODY = "M148 72 Q200 46 252 72 L302 92 Q332 104 340 144 L366 318 L326 330 L296 196 L294 280 Q294 290 282 290 L118 290 Q106 290 106 280 L104 196 L74 330 L34 318 L60 144 Q68 104 98 92 Z";

function Neck({ back, color, d }: { back: boolean; color: string; d: { l: number; r: number; y: number; depth: number } }) {
  const { l, r, y, depth } = d;
  const dark = shade(color, -22);
  if (back) return <path d={`M${l} ${y} Q${(l + r) / 2} ${y + depth * 0.35} ${r} ${y}`} stroke={dark} strokeWidth="7" fill="none" strokeLinecap="round" />;
  return <path d={`M${l} ${y} Q${l + 10} ${y + depth} ${(l + r) / 2} ${y + depth} Q${r - 10} ${y + depth} ${r} ${y} Q${r - 20} ${y + depth * 0.55} ${(l + r) / 2} ${y + depth * 0.55} Q${l + 20} ${y + depth * 0.55} ${l} ${y} Z`} fill={dark} />;
}

function Garment({ k, color, back }: { k: SilhouetteKey; color: string; back: boolean }) {
  const dark = shade(color, -22);
  const darker = shade(color, -40);
  const light = shade(color, 26);
  switch (k) {
    case "tee":
    case "kids":
      return (
        <>
          <path d={`${TEE} Q250 ${back ? 76 : 94} 200 ${back ? 76 : 94} Q150 ${back ? 76 : 94} 140 60 Z`} fill={color} />
          <Neck back={back} color={color} d={{ l: 140, r: 260, y: 60, depth: 34 }} />
          <path d="M110 166 L110 200 M290 166 L290 200" stroke={dark} strokeWidth="2" />
          <path d="M122 362 L278 362" stroke={darker} strokeOpacity=".25" strokeWidth="3" />
          <path d="M70 186 L110 166 M330 186 L290 166" stroke={dark} strokeOpacity=".5" strokeWidth="2" />
        </>
      );
    case "womtee":
      return (
        <>
          <path d={`${WOMTEE} Q246 ${back ? 76 : 92} 200 ${back ? 76 : 92} Q154 ${back ? 76 : 92} 146 62 Z`} fill={color} />
          <Neck back={back} color={color} d={{ l: 146, r: 254, y: 62, depth: 30 }} />
          <path d="M80 172 L118 156 M320 172 L282 156" stroke={dark} strokeOpacity=".5" strokeWidth="2" />
        </>
      );
    case "sweat":
      return (
        <>
          <path d={`${SWEAT} Q250 ${back ? 76 : 92} 200 ${back ? 76 : 92} Q150 ${back ? 76 : 92} 140 62 Z`} fill={color} />
          <rect x="110" y="336" width="180" height="24" rx="6" fill={dark} />
          <path d="M120 340 V358 M140 340 V358 M160 340 V358 M180 340 V358 M200 340 V358 M220 340 V358 M240 340 V358 M260 340 V358 M280 340 V358" stroke={darker} strokeOpacity=".3" strokeWidth="1.5" />
          <path d="M34 318 L74 330 L70 344 L30 332 Z M366 318 L326 330 L330 344 L370 332 Z" fill={dark} />
          <Neck back={back} color={color} d={{ l: 140, r: 260, y: 62, depth: 30 }} />
        </>
      );
    case "hoodie":
    case "crop": {
      const body = k === "crop" ? CROP_BODY : HOODIE_BODY;
      return (
        <>
          <path d={body} fill={color} />
          {back ? (
            <path d="M138 70 Q138 18 200 16 Q262 18 262 70 Q262 112 236 128 Q200 142 164 128 Q138 112 138 70 Z" fill={dark} />
          ) : (
            <>
              <path d="M146 76 Q146 22 200 20 Q254 22 254 76 Q232 108 200 108 Q168 108 146 76 Z" fill={dark} />
              <path d="M168 80 Q200 98 232 80" stroke={darker} strokeWidth="3" fill="none" />
              <path d="M186 104 L184 150 M214 104 L216 150" stroke={light} strokeWidth="3" strokeLinecap="round" />
              {k === "hoodie" && <path d="M146 270 L254 270 L266 330 L134 330 Z" fill={dark} opacity=".55" />}
            </>
          )}
          {k === "crop" && <rect x="106" y="276" width="188" height="16" rx="6" fill={dark} />}
        </>
      );
    }
    case "baby":
      return (
        <>
          <path d={`M150 70 L118 82 L78 120 L100 160 L128 146 L128 290 Q128 318 160 330 L182 352 L218 352 L240 330 Q272 318 272 290 L272 146 L300 160 L322 120 L282 82 L250 70 Q240 ${back ? 84 : 98} 200 ${back ? 84 : 98} Q160 ${back ? 84 : 98} 150 70 Z`} fill={color} />
          <Neck back={back} color={color} d={{ l: 150, r: 250, y: 70, depth: 28 }} />
          <circle cx="188" cy="344" r="3" fill={darker} opacity=".5" />
          <circle cx="200" cy="344" r="3" fill={darker} opacity=".5" />
          <circle cx="212" cy="344" r="3" fill={darker} opacity=".5" />
        </>
      );
    case "tote":
      return (
        <>
          <path d="M150 140 Q150 56 200 56 Q250 56 250 140" stroke={dark} strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M98 136 L302 136 L318 362 L82 362 Z" fill={color} />
          <path d="M98 136 L302 136 L300 152 L100 152 Z" fill={dark} opacity=".5" />
        </>
      );
    case "apron":
      return (
        <>
          <path d="M150 72 Q150 28 200 28 Q250 28 250 72" stroke={dark} strokeWidth="7" fill="none" />
          <path d="M140 70 L260 70 L262 150 Q300 160 304 180 L300 372 Q300 380 292 380 L108 380 Q100 380 100 372 L96 180 Q100 160 138 150 Z" fill={color} />
          <path d="M96 182 L40 196 M304 182 L360 196" stroke={dark} strokeWidth="6" strokeLinecap="round" />
          <path d="M140 70 L260 70" stroke={dark} strokeWidth="4" />
        </>
      );
    case "cap":
    case "trucker":
      return (
        <>
          <path d="M84 252 Q84 132 200 122 Q316 132 316 252 Z" fill={color} />
          {k === "trucker" && (
            <>
              <path d="M84 252 Q86 170 128 140 L136 252 Z M316 252 Q314 170 272 140 L264 252 Z" fill={shade(color, 40)} />
              <path d="M96 200 L130 200 M92 225 L132 225 M104 175 L128 175 M270 200 L304 200 M268 225 L308 225 M272 175 L296 175" stroke={dark} strokeWidth="1.5" opacity=".6" />
            </>
          )}
          <path d="M200 122 Q170 190 176 252 M200 122 Q230 190 224 252" stroke={dark} strokeWidth="2" fill="none" opacity=".6" />
          <path d="M58 252 Q200 226 362 262 Q376 292 334 296 Q200 276 70 284 Q40 278 58 252 Z" fill={dark} />
          <circle cx="200" cy="122" r="7" fill={darker} />
        </>
      );
    case "beanie":
      return (
        <>
          <path d="M92 236 Q92 92 200 88 Q308 92 308 236 Z" fill={color} />
          <path d="M120 236 Q122 130 160 104 M160 236 Q160 120 184 96 M240 236 Q240 120 216 96 M280 236 Q278 130 240 104" stroke={dark} strokeWidth="2" fill="none" opacity=".45" />
          <rect x="80" y="222" width="240" height="80" rx="16" fill={dark} />
          {Array.from({ length: 23 }).map((_, i) => (
            <path key={i} d={`M${92 + i * 10} 228 V296`} stroke={darker} strokeWidth="2" opacity=".35" />
          ))}
        </>
      );
    default:
      return null;
  }
}

function Face({ k, z }: { k: SilhouetteKey; z: { x: number; y: number; w: number; h: number } }) {
  const { x, y, w, h } = z;
  switch (k) {
    case "poster":
      return (
        <>
          <rect x={x + 6} y={y + 10} width={w} height={h} fill="#000" opacity=".16" />
          <rect x={x} y={y} width={w} height={h} fill="#fffcf7" />
          <rect x={x + w / 2 - 16} y={y - 6} width="32" height="12" rx="2" fill="#d9cfbd" opacity=".9" />
        </>
      );
    case "framed": {
      const m = 14, f = 12;
      return (
        <>
          <rect x={x - m - f + 6} y={y - m - f + 10} width={w + 2 * (m + f)} height={h + 2 * (m + f)} fill="#000" opacity=".18" />
          <rect x={x - m - f} y={y - m - f} width={w + 2 * (m + f)} height={h + 2 * (m + f)} fill="#1b1714" />
          <rect x={x - m} y={y - m} width={w + 2 * m} height={h + 2 * m} fill="#f7f3ea" />
          <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill="none" stroke="#000" strokeOpacity=".12" />
        </>
      );
    }
    case "canvas":
      return (
        <>
          <path d={`M${x + w} ${y} L${x + w + 10} ${y + 8} L${x + w + 10} ${y + h + 8} L${x + w} ${y + h} Z`} fill="#000" opacity=".25" />
          <path d={`M${x} ${y + h} L${x + 10} ${y + h + 8} L${x + w + 10} ${y + h + 8} L${x + w} ${y + h} Z`} fill="#000" opacity=".18" />
          <rect x={x} y={y} width={w} height={h} fill="#fffcf7" />
        </>
      );
    case "pillow":
      return (
        <>
          <path d={`M${x - 22} ${y - 18} Q${x + w / 2} ${y - 4} ${x + w + 22} ${y - 18} Q${x + w + 8} ${y + h / 2} ${x + w + 22} ${y + h + 18} Q${x + w / 2} ${y + h + 4} ${x - 22} ${y + h + 18} Q${x - 8} ${y + h / 2} ${x - 22} ${y - 18} Z`} fill="#efe8da" />
          <rect x={x} y={y} width={w} height={h} rx="10" fill="#fffcf7" />
        </>
      );
    case "towel":
      return (
        <>
          <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx="6" fill="#efe8da" />
          <rect x={x} y={y} width={w} height={h} rx="4" fill="#fffcf7" />
          <path d={Array.from({ length: 14 }).map((_, i) => `M${x + 4 + (i * (w - 8)) / 13} ${y + h + 4} v10`).join(" ")} stroke="#d9cfbd" strokeWidth="2" />
        </>
      );
    case "blanket":
      return (
        <>
          <path d={`M${x - 6} ${y - 6} L${x + w + 6} ${y - 6} L${x + w + 6} ${y + h + 6} Q${x + w * 0.75} ${y + h + 26} ${x + w / 2} ${y + h + 8} Q${x + w * 0.25} ${y + h + 26} ${x - 6} ${y + h + 6} Z`} fill="#e9e1d2" />
          <rect x={x} y={y} width={w} height={h} rx="4" fill="#fffcf7" />
        </>
      );
    case "phone":
      return (
        <>
          <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx="26" fill="#1b1b1b" />
          <rect x={x} y={y} width={w} height={h} rx="21" fill="#fffcf7" />
        </>
      );
    case "flag":
      return (
        <>
          <rect x={x - 12} y={y - 18} width="6" height={340 - y + 30} rx="3" fill="#8a7a62" />
          <circle cx={x - 9} cy={y - 20} r="6" fill="#c9a227" />
          <rect x={x + 4} y={y + 6} width={w} height={h} fill="#000" opacity=".12" />
          <rect x={x} y={y} width={w} height={h} fill="#fffcf7" />
        </>
      );
    case "sticker":
      return (
        <>
          <rect x={x - 34} y={y - 34} width={w + 68} height={h + 68} rx="18" fill="#f6f3ec" />
          <rect x={x - 34} y={y - 34} width={w + 68} height={h + 68} rx="18" fill="none" stroke="#000" strokeOpacity=".08" />
        </>
      );
    case "mug":
      return (
        <>
          <ellipse cx="200" cy="350" rx="110" ry="10" fill="#000" opacity=".08" />
          <path d="M276 150 Q348 150 348 218 Q348 286 276 286 L276 258 Q318 258 318 218 Q318 178 276 178 Z" fill="#e7e2d8" />
          <path d="M112 112 L276 112 L276 322 Q276 344 254 344 L134 344 Q112 344 112 322 Z" fill="#fffcf7" />
          <ellipse cx="194" cy="112" rx="82" ry="12" fill="#e7e2d8" />
          <ellipse cx="194" cy="112" rx="74" ry="8" fill="#cfc8bb" />
        </>
      );
    case "tumbler":
      return (
        <>
          <ellipse cx="200" cy="356" rx="70" ry="8" fill="#000" opacity=".08" />
          <path d="M146 80 L254 80 L244 346 Q244 354 236 354 L164 354 Q156 354 156 346 Z" fill="#e9e9e6" />
          <rect x="140" y="58" width="120" height="24" rx="6" fill="#2a2a2a" />
          <rect x="176" y="50" width="48" height="10" rx="3" fill="#2a2a2a" />
        </>
      );
    default:
      return null;
  }
}

/** Gloss / fold highlights drawn over the print (mugs, tumblers, phone camera). */
function Overlay({ k, z }: { k: SilhouetteKey; z: { x: number; y: number; w: number; h: number } }) {
  if (k === "mug") return <path d="M122 130 L122 320" stroke="#fff" strokeOpacity=".45" strokeWidth="7" strokeLinecap="round" />;
  if (k === "tumbler") return <path d="M164 96 L170 338" stroke="#fff" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" />;
  if (k === "phone")
    return (
      <>
        <rect x={z.x + 10} y={z.y + 10} width={z.w * 0.42} height={z.w * 0.42} rx="14" fill="#1b1b1b" />
        <circle cx={z.x + 10 + z.w * 0.13} cy={z.y + 10 + z.w * 0.13} r={z.w * 0.08} fill="#333" />
        <circle cx={z.x + 10 + z.w * 0.29} cy={z.y + 10 + z.w * 0.29} r={z.w * 0.08} fill="#333" />
      </>
    );
  if (k === "pillow") return <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="10" fill="url(#ryg-pillow)" />;
  return null;
}

const FACE_KINDS = new Set<SilhouetteKey>(["poster", "framed", "canvas", "pillow", "towel", "blanket", "phone", "flag", "sticker", "mug", "tumbler"]);

export function Silhouette({ spec, color, back = false, layer = "base" }: { spec: KindSpec; color: string; back?: boolean; layer?: "base" | "overlay" }) {
  const k = spec.silhouette;
  const z = zoneRect(back && spec.backZone ? spec.backZone : spec.zone, spec.aspect);
  if (layer === "overlay") return <Overlay k={k} z={z} />;
  if (FACE_KINDS.has(k)) {
    return (
      <>
        <defs>
          <radialGradient id="ryg-pillow" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity=".18" />
          </radialGradient>
        </defs>
        <Face k={k} z={z} />
      </>
    );
  }
  const s = spec.scale ?? 1;
  return (
    <g transform={s !== 1 ? `translate(${200 - 200 * s} ${210 - 210 * s}) scale(${s})` : undefined}>
      <Garment k={k} color={color} back={back} />
    </g>
  );
}

/** Small picker thumbnail (product colour neutral). */
export function SilhouetteThumb({ spec, color = "#e9e3d6" }: { spec: KindSpec; color?: string }) {
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden>
      <Silhouette spec={spec} color={color} />
      {FACE_KINDS.has(spec.silhouette) && (() => {
        const z = zoneRect(spec.zone, spec.aspect);
        return <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="#a3162b" opacity=".08" />;
      })()}
      <Silhouette spec={spec} color={color} layer="overlay" />
    </svg>
  );
}

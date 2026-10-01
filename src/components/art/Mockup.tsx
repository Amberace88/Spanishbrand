/**
 * Illustrated product mockups (pure SVG + collection artwork as the "print").
 * Used for categories and "coming soon" previews until real product photography exists —
 * never presented as a specific purchasable item.
 */
import { CollectionArt } from "@/components/art/CollectionArt";
import { BrandLogo } from "@/components/brand/Wordmark";

export type MockupKind = "tee" | "hoodie" | "cap" | "mug" | "poster" | "tote";

const PRINT_AREA: Record<MockupKind, { left: string; top: string; width: string; height: string; radius?: string }> = {
  tee: { left: "36%", top: "31%", width: "28%", height: "30%", radius: "6px" },
  hoodie: { left: "38%", top: "33%", width: "24%", height: "24%", radius: "6px" },
  cap: { left: "0", top: "0", width: "0", height: "0" },
  mug: { left: "31%", top: "36%", width: "30%", height: "38%", radius: "4px" },
  poster: { left: "29.5%", top: "17%", width: "41%", height: "66%" },
  tote: { left: "35%", top: "45%", width: "30%", height: "30%", radius: "4px" },
};

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${((1 << 24) | (c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1)}`;
}

function Emblem({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 16 }).map((_, i) => (
        <rect key={i} x={-1.2} y={-r * 1.55} width={2.4} height={r * 0.42} fill="#ffc629" transform={`rotate(${i * 22.5})`} />
      ))}
      <circle r={r} fill="#c8102e" />
      <circle r={r * 0.45} fill="#ffc629" />
    </g>
  );
}

export function Shape({ kind, color, logo = false }: { kind: MockupKind; color: string; logo?: boolean }) {
  const dark = shade(color, -22);
  const darker = shade(color, -40);
  switch (kind) {
    case "tee":
      return (
        <>
          <path d="M140 60 L100 74 L36 122 L70 186 L110 166 L110 350 Q110 362 122 362 L278 362 Q290 362 290 350 L290 166 L330 186 L364 122 L300 74 L260 60 Q250 94 200 94 Q150 94 140 60 Z" fill={color} />
          <path d="M140 60 Q150 94 200 94 Q250 94 260 60 Q240 78 200 78 Q160 78 140 60 Z" fill={dark} />
          <path d="M110 166 L110 200 M290 166 L290 200" stroke={dark} strokeWidth="2" />
          <path d="M122 362 L278 362" stroke={darker} strokeOpacity=".25" strokeWidth="3" />
        </>
      );
    case "hoodie":
      return (
        <>
          <path d="M148 72 Q200 46 252 72 L302 92 Q332 104 340 144 L366 318 L326 330 L296 196 L294 350 Q294 362 282 362 L118 362 Q106 362 106 350 L104 196 L74 330 L34 318 L60 144 Q68 104 98 92 Z" fill={color} />
          <path d="M146 76 Q146 22 200 20 Q254 22 254 76 Q232 108 200 108 Q168 108 146 76 Z" fill={dark} />
          <path d="M168 80 Q200 98 232 80" stroke={darker} strokeWidth="3" fill="none" />
          <path d="M186 104 L184 150 M214 104 L216 150" stroke={shade(color, 30)} strokeWidth="3" strokeLinecap="round" />
          <path d="M146 270 L254 270 L266 330 L134 330 Z" fill={dark} opacity=".55" />
        </>
      );
    case "cap":
      return (
        <>
          <path d="M84 252 Q84 132 200 122 Q316 132 316 252 Z" fill={color} />
          <path d="M200 122 Q170 190 176 252 M200 122 Q230 190 224 252 M120 170 Q140 210 136 252 M280 170 Q260 210 264 252" stroke={dark} strokeWidth="2" fill="none" />
          <path d="M58 252 Q200 226 362 262 Q376 292 334 296 Q200 276 70 284 Q40 278 58 252 Z" fill={dark} />
          <circle cx="200" cy="122" r="7" fill={darker} />
          {!logo && <Emblem x={200} y={200} r={20} />}
        </>
      );
    case "mug":
      return (
        <>
          <ellipse cx="200" cy="350" rx="110" ry="10" fill="#000" opacity=".08" />
          <path d="M276 150 Q348 150 348 218 Q348 286 276 286 L276 258 Q318 258 318 218 Q318 178 276 178 Z" fill={dark} />
          <path d="M112 112 L276 112 L276 322 Q276 344 254 344 L134 344 Q112 344 112 322 Z" fill={color} />
          <ellipse cx="194" cy="112" rx="82" ry="12" fill={dark} />
          <ellipse cx="194" cy="112" rx="74" ry="8" fill={darker} />
          <path d="M120 130 L120 320" stroke="#fff" strokeOpacity=".35" strokeWidth="6" strokeLinecap="round" />
        </>
      );
    case "poster":
      return (
        <>
          <rect x="104" y="54" width="200" height="300" fill="#000" opacity=".12" transform="translate(6 8)" />
          <rect x="104" y="54" width="200" height="300" fill="#2a231c" />
          <rect x="112" y="62" width="184" height="284" fill="#fffcf7" />
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
  }
}

const LOGO_AREA: Record<MockupKind, { left: string; top: string; width: string }> = {
  tee: { left: "36%", top: "34%", width: "28%" },
  hoodie: { left: "36%", top: "35%", width: "28%" },
  cap: { left: "36%", top: "38%", width: "28%" },
  mug: { left: "31%", top: "44%", width: "30%" },
  poster: { left: "31%", top: "36%", width: "38%" },
  tote: { left: "34%", top: "50%", width: "32%" },
};

export function Mockup({ kind, color = "#fffcf7", slug = "espana", className = "", print = "art" }: { kind: MockupKind; color?: string; slug?: string; className?: string; print?: "art" | "logo" }) {
  const pa = PRINT_AREA[kind];
  if (print === "logo") {
    const la = LOGO_AREA[kind];
    return (
      <div className={`relative aspect-square ${className}`} aria-hidden>
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_18px_24px_rgba(28,23,18,0.14)]">
          <Shape kind={kind} color={color} logo />
        </svg>
        <div className="absolute flex justify-center" style={{ left: la.left, top: la.top, width: la.width }}>
          <BrandLogo variant={kind === "poster" || kind === "mug" ? "full" : "text"} className="!h-auto !w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_18px_24px_rgba(28,23,18,0.14)]">
        <Shape kind={kind} color={color} />
      </svg>
      {kind !== "cap" && (
        <div className="absolute overflow-hidden" style={{ left: pa.left, top: pa.top, width: pa.width, height: pa.height, borderRadius: pa.radius }}>
          <CollectionArt slug={slug} className="absolute inset-0" />
        </div>
      )}
    </div>
  );
}

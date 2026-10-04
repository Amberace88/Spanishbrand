import PLACEMENT from "@/lib/catalog/futbol-pro-art.json";

const P = PLACEMENT as Record<string, { aspect: number; x: number; y: number; w: number }>;
/* The pattern / lettering sources are print files (up to 2400×3200 PNG, ~150 KB, ~30 MB decoded each): previews go
 * through the image optimizer at preview size (WebP, a fraction of the bytes and decode work). */
const preview = (path: string) => `/_next/image?url=${encodeURIComponent(path)}&w=640&q=75`;
const SHIRT = "M150 40 L95 58 L30 140 L78 182 L112 150 L112 372 L288 372 L288 150 L322 182 L370 140 L305 58 L250 40 Q200 92 150 40 Z";

/** All-over sublimated shirt preview: the full-bleed pattern clipped to a shirt, with the chest lettering on top. */
export function AopShirt({ city, side = "frente", className = "" }: { city: string; side?: "frente" | "dorsal"; className?: string }) {
  const id = `aop-${city}-${side}`;
  const mark = P[`fp-camiseta-${city}-${side}`];
  // torso print box ≈ x 112..288, y 40..372 (3:4-ish) — place the mark by its canvas geometry
  const box = { x: 100, y: 40, w: 200, h: 266 };
  return (
    <svg viewBox="0 0 400 400" className={`h-full w-full drop-shadow-[0_22px_30px_rgba(0,0,0,0.35)] ${className}`} aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d={SHIRT} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <image href={preview(`/catalog/art/fp-camiseta-${city}-patron.png`)} x="20" y="30" width="360" height="360" preserveAspectRatio="xMidYMid slice" />
        {mark && (
          <image
            href={preview(`/catalog/art/fp-camiseta-${city}-${side}.png`)}
            x={box.x + (mark.x - mark.w / 2) * box.w}
            y={box.y + (mark.y - (mark.w * mark.aspect * 0.75) / 2) * box.h}
            width={mark.w * box.w}
            height={mark.w * mark.aspect * box.w}
          />
        )}
      </g>
      <path d={SHIRT} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
      <path d="M150 40 Q200 92 250 40" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="6" />
    </svg>
  );
}

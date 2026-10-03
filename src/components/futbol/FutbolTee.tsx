import Image from "next/image";
import { Shape } from "@/components/art/Mockup";
import PLACEMENT from "@/lib/catalog/futbol-pro-art.json";

const P = PLACEMENT as Record<string, { aspect: number; x: number; y: number; w: number }>;
/** Print zone of the tee drawing (400 × 400 viewBox) — same geometry as the designer and DesignArt. */
const ZONE = { left: 30, top: 23, width: 40 };

function Print({ file, className = "" }: { file: string; className?: string }) {
  const p = P[file];
  if (!p) return null;
  // the art keeps the spot it was composed in on the 12 × 16 in canvas
  const w = p.w * 100, h = ((p.w * p.aspect) / (4 / 3)) * 100;
  return (
    <div className={`absolute ${className}`} style={{ left: `${p.x * 100 - w / 2}%`, top: `${p.y * 100 - h / 2}%`, width: `${w}%`, height: `${h}%` }}>
      <Image src={`/catalog/art/${file}.png`} alt="" fill sizes="(min-width:1024px) 22vw, 45vw" className="object-contain" />
    </div>
  );
}

/**
 * A Fútbol PRO design on a tee drawing, before product photos exist (and on the landing).
 * With `back`, hovering turns the shirt round to show the back print.
 */
export function FutbolTee({ front, back, garment = "#141414", className = "" }: { front: string; back?: string; garment?: string; className?: string }) {
  const zone = (file: string, extra = "") => (
    <div className={`pointer-events-none absolute ${extra}`} style={{ left: `${ZONE.left}%`, top: `${ZONE.top}%`, width: `${ZONE.width}%`, aspectRatio: "3 / 4" }}>
      <Print file={file} />
    </div>
  );
  return (
    <div className={`group/tee relative aspect-square ${className}`}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_22px_30px_rgba(0,0,0,0.35)]" aria-hidden>
        <Shape kind="tee" color={garment} />
      </svg>
      {zone(`fp-${front}`, back ? "transition-opacity duration-500 group-hover/tee:opacity-0" : "")}
      {back && zone(`fp-${back}`, "opacity-0 transition-opacity duration-500 group-hover/tee:opacity-100")}
    </div>
  );
}

/** Flat full-bleed pattern swatch for all-over shirts. */
export function FutbolPattern({ file, className = "" }: { file: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={`/catalog/art/fp-${file}.png`} alt="" fill sizes="(min-width:1024px) 22vw, 45vw" className="object-cover" />
    </div>
  );
}

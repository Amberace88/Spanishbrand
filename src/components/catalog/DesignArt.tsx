"use client";
import { useEffect, useRef, useState } from "react";
import { Shape } from "@/components/art/Mockup";
import { Artwork, BROWSER_FONTS } from "@/lib/personalization/artwork";
import type { Layer } from "@/lib/personalization/types";

type Kind = "tee" | "hoodie" | "tote" | "poster" | "flat";

/** Print zone inside the 400×400 drawing — same geometry as the designer. */
const ZONE: Record<Exclude<Kind, "flat">, { left: number; top: number; width: number }> = {
  tee: { left: 30, top: 23, width: 40 },
  hoodie: { left: 33, top: 31, width: 34 },
  tote: { left: 30, top: 40, width: 40 },
  poster: { left: 28, top: 15.5, width: 46 },
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Live preview of a library design on a garment drawing (or flat), rendered with the same
 * Artwork component as the print file — used before real product photos exist and as style cards.
 */
export function DesignArt({ layers, tone, kind = "tee", garment, className = "" }: { layers: Layer[]; tone: "dark" | "light"; kind?: Kind; garment?: string; className?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const color = garment ?? (tone === "dark" ? "#161616" : "#f7f4ee");
  if (kind === "flat") {
    return (
      <div ref={ref} className={`relative aspect-[3/4] overflow-hidden ${className}`} style={{ background: color }}>
        {w > 0 && (
          <div className="absolute inset-0">
            <Artwork value={{ mode: "designer", placement: "front", layers }} width={w} height={(w * 4) / 3} fonts={BROWSER_FONTS} />
          </div>
        )}
      </div>
    );
  }
  const z = ZONE[kind];
  return (
    <div className={`relative aspect-square ${className}`}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.16)]" aria-hidden>
        <Shape kind={kind} color={kind === "poster" ? (tone === "dark" ? "#141414" : "#f6f1e6") : color} />
      </svg>
      <div ref={ref} className="pointer-events-none absolute" style={{ left: `${z.left}%`, top: `${z.top}%`, width: `${z.width}%`, aspectRatio: "3 / 4" }}>
        {w > 0 && <Artwork value={{ mode: "designer", placement: "front", layers }} width={w} height={(w * 4) / 3} fonts={BROWSER_FONTS} />}
      </div>
    </div>
  );
}

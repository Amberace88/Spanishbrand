"use client";
import "./club.css";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { memberPattern, type TierId } from "@/lib/club";

export type MemberCardProps = {
  number: string;
  name: string;
  since: string;
  points?: number;
  tier: TierId;
  tierLabel: string;
  labels: { club: string; since: string; points: string };
  /** Accessible summary (the visual card is decorative). */
  ariaLabel: string;
  className?: string;
};

/**
 * Premium 3D member card: pointer tilt (desktop), device-tilt where the browser allows it without a
 * permission prompt (Android), idle foil drift otherwise. Static on prefers-reduced-motion.
 */
export function MemberCard3D({ number, name, since, points, tier, tierLabel, labels, ariaLabel, className = "" }: MemberCardProps) {
  const scene = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [idle, setIdle] = useState(true);
  const pattern = useMemo(() => memberPattern(`RYG-${number}`), [number]);

  useEffect(() => {
    const s = scene.current;
    const c = card.current;
    if (!s || !c) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const apply = (px: number, py: number, glare: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        s.style.setProperty("--rx", `${(px - 0.5) * 18}deg`);
        s.style.setProperty("--ry", `${(0.5 - py) * 14}deg`);
        s.style.setProperty("--mx", `${px * 100}%`);
        s.style.setProperty("--my", `${py * 100}%`);
        s.style.setProperty("--glare", String(glare));
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = c.getBoundingClientRect();
      c.dataset.active = "true";
      setIdle(false);
      apply(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), 1);
    };
    const onLeave = () => {
      c.dataset.active = "false";
      setIdle(true);
      apply(0.5, 0.5, 0);
    };
    s.addEventListener("pointermove", onMove);
    s.addEventListener("pointerleave", onLeave);

    // Gyro: only where no permission prompt is needed (iOS requires a user gesture → skipped, idle drift instead).
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent;
    const coarse = window.matchMedia("(hover: none)").matches;
    let onTilt: ((e: DeviceOrientationEvent) => void) | null = null;
    if (coarse && DOE && typeof DOE.requestPermission !== "function") {
      onTilt = (e) => {
        if (e.beta == null || e.gamma == null) return;
        setIdle(false);
        const px = 0.5 + Math.max(-1, Math.min(1, e.gamma / 30)) * 0.5;
        const py = 0.5 + Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.5;
        c.dataset.active = "true";
        apply(px, py, 0.7);
      };
      window.addEventListener("deviceorientation", onTilt);
    }
    return () => {
      cancelAnimationFrame(raf);
      s.removeEventListener("pointermove", onMove);
      s.removeEventListener("pointerleave", onLeave);
      if (onTilt) window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);

  const n = pattern.length;
  return (
    <figure ref={scene} className={`rg-card-scene mx-auto w-full max-w-[460px] ${idle ? "rg-card-idle" : ""} ${className}`} role="img" aria-label={ariaLabel}>
      <div ref={card} className="rg-card" data-tier={tier} aria-hidden>
        <div className="rg-card-face">
          <div className="rg-guilloche" />
          <div className="flag-line absolute inset-x-0 top-0 h-[5px] opacity-90" />
          {/* lion watermark */}
          <div className="absolute -bottom-[18%] -right-[8%] h-[95%] opacity-[0.07]">
            <Image src="/brand/logo-lion.webp" alt="" width={997} height={1174} sizes="(min-width: 640px) 384px, 256px" className="h-full w-auto" draggable={false} />
          </div>
        </div>
        <div className="rg-holo" />
        <div className="rg-glare" />

        <div className="relative flex h-full flex-col justify-between p-[6%]" style={{ transform: "translateZ(40px)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="block h-7 sm:h-9">
                <Image src="/brand/logo-text.webp" alt="" width={1368} height={707} sizes="128px" className="h-full w-auto" draggable={false} />
              </span>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#e0b84a] sm:text-[11px]">{labels.club}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="block h-11 sm:h-14">
                <Image src="/brand/logo-lion.webp" alt="" width={997} height={1174} sizes="64px" className="h-full w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" draggable={false} />
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="rg-chip h-[18px] w-[26px] rounded-[4px] sm:h-[22px] sm:w-[30px]" />
                <span className="rounded-full border border-[#e0b84a]/50 bg-black/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#f1d27a] sm:text-[10px]">
                  {tier === "HONOR" ? "★ " : ""}
                  {tierLabel}
                </span>
              </div>
              <p className="rg-emboss font-mono text-[clamp(1.15rem,5.2vw,1.9rem)] font-bold tracking-[0.16em] sm:text-[1.75rem]">Nº {number}</p>
              <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f5f1e8] sm:text-[12px]">{name}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[#f5f1e8]/60 sm:text-[11px]">
                {points != null && (
                  <>
                    <span className="rg-foil-text font-bold">{points.toLocaleString("es-ES")} {labels.points}</span> ·{" "}
                  </>
                )}
                {labels.since} {since}
              </p>
            </div>
            {/* decorative member pattern — not a scannable code */}
            <div className="shrink-0 rounded-lg bg-[#f5f1e8]/[0.04] p-1.5 ring-1 ring-[#e0b84a]/40">
              <svg viewBox={`0 0 ${n} ${n}`} className="block h-[54px] w-[54px] sm:h-[66px] sm:w-[66px]" shapeRendering="crispEdges">
                {pattern.flatMap((row, r) => row.map((on, c) => (on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#e0b84a" /> : null)))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

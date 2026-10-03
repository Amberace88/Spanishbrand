"use client";
import "./club.css";
import { useEffect, useRef, useState } from "react";
import { CLUB_MEDIA } from "@/lib/club-media";

/** Deterministic particle field (no Math.random → no hydration mismatch). */
const PARTICLES = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 97.13 + n * 13.7) + 1) / 2);
  return {
    x: `${(r(1) * 100).toFixed(2)}%`,
    s: `${(2 + r(2) * 3.5).toFixed(1)}px`,
    d: `${(11 + r(3) * 12).toFixed(1)}s`,
    delay: `${(-r(4) * 20).toFixed(1)}s`,
    drift: `${((r(5) - 0.5) * 120).toFixed(0)}px`,
    o: (0.35 + r(6) * 0.6).toFixed(2),
  };
});

/**
 * Cinematic club background. Layers (bottom → top):
 *  1. animated CSS/SVG fallback (aura, gold light sweeping across the lion, rising gold particles) — always present
 *  2. poster still (if /club/club-poster.webp exists) — fades in on load
 *  3. looping film (if /club/club-loop.mp4 exists) — fades in once playing; skipped on reduced motion / data saver,
 *     lazy-loaded on small screens when the hero scrolls into view. Any error keeps the layer below.
 *  4. legibility scrim
 */
export function ClubHeroMedia({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [posterOk, setPosterOk] = useState(false);
  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasVideo = Boolean(CLUB_MEDIA.mp4 || CLUB_MEDIA.webm);

  useEffect(() => {
    if (!hasVideo) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce.matches || saveData) return;
    const small = window.matchMedia("(max-width: 767px)").matches;
    if (!small) {
      setLoad(true);
      return;
    }
    const el = wrap.current;
    if (!el || !("IntersectionObserver" in window)) return setLoad(true);
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasVideo]);

  return (
    <div ref={wrap} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="rg-hero-bg">
        <div className="rg-aura" />
        <div className="rg-sweep-band" />
        <div className="rg-lion-light" />
        <div className="rg-particles">
          {PARTICLES.map((p, i) => (
            <i key={i} style={{ ["--x" as string]: p.x, ["--s" as string]: p.s, ["--d" as string]: p.d, ["--delay" as string]: p.delay, ["--drift" as string]: p.drift, ["--o" as string]: p.o }} />
          ))}
        </div>
      </div>
      {CLUB_MEDIA.poster && (
        // eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed still; sized by the container (no CLS)
        <img src={CLUB_MEDIA.poster} alt="" decoding="async" onLoad={() => setPosterOk(true)} onError={() => setPosterOk(false)} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${posterOk ? "opacity-100" : "opacity-0"}`} />
      )}
      {hasVideo && load && !failed && (
        <video
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${playing ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          poster={CLUB_MEDIA.poster ?? undefined}
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
        >
          {CLUB_MEDIA.webm && <source src={CLUB_MEDIA.webm} type="video/webm" />}
          {CLUB_MEDIA.mp4 && <source src={CLUB_MEDIA.mp4} type="video/mp4" onError={() => setFailed(true)} />}
        </video>
      )}
      <div className="rg-scrim" />
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const SRC = "/audio/rojo-y-gualda.mp3";
const TARGET_VOL = 0.55;

/**
 * House anthem "Rojo y Gualda". Off by default (no autoplay, nothing downloaded until the visitor asks),
 * fades in/out, keeps playing across client-side navigation because the header stays mounted.
 */
export function SoundToggle({ className = "" }: { className?: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pill, setPill] = useState(false);
  const [progress, setProgress] = useState(0);

  const ramp = useCallback((to: number, ms: number, done?: () => void) => {
    const a = audio.current;
    if (!a) return;
    if (fade.current) cancelAnimationFrame(fade.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      a.volume = from + (to - from) * k;
      if (k < 1) fade.current = requestAnimationFrame(step);
      else done?.();
    };
    fade.current = requestAnimationFrame(step);
  }, []);

  const ensure = () => {
    if (audio.current) return audio.current;
    const a = new Audio(SRC);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    a.addEventListener("timeupdate", () => setProgress(a.duration ? a.currentTime / a.duration : 0));
    a.addEventListener("pause", () => setPlaying(false));
    a.addEventListener("play", () => setPlaying(true));
    audio.current = a;
    return a;
  };

  const play = () => {
    const a = ensure();
    a.play()
      .then(() => {
        ramp(TARGET_VOL, 1200);
        setPill(true);
      })
      .catch(() => setPlaying(false));
  };
  const pause = () => ramp(0, 450, () => audio.current?.pause());
  const toggle = () => (playing ? pause() : play());
  const close = () => {
    pause();
    setPill(false);
  };

  // pause when the tab is hidden for a long time? keep it simple: respect the OS media keys via mediaSession
  useEffect(() => {
    if (!("mediaSession" in navigator) || !playing) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: "Rojo y Gualda", artist: "ROJO Y GUALDA", artwork: [{ src: "/brand/logo-lion.png", sizes: "512x512", type: "image/png" }] });
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("play", play);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => () => audio.current?.pause(), []);

  return (
    <>
      <button
        onClick={toggle}
        aria-label={playing ? "Silenciar el himno" : "Escuchar «Rojo y Gualda»"}
        aria-pressed={playing}
        title={playing ? "Silenciar" : "Escuchar «Rojo y Gualda»"}
        className={`group relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-fg/[0.06] ${className}`}
      >
        {/* equaliser: flat + muted when off, dancing in brand colours when on */}
        <span className="flex h-[18px] items-end gap-[3px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full ${playing ? "eq-bar bg-gradient-to-t from-[#c8102e] to-[#f1bf00]" : "bg-current opacity-80"}`}
              style={{ height: playing ? undefined : [6, 10, 7, 4][i], animationDelay: `${[-0.2, -0.65, -0.4, -0.9][i]}s` }}
            />
          ))}
        </span>
        {!playing && <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full border-2 border-bg bg-[#c8102e]" aria-hidden />}
      </button>

      <AnimatePresence>
        {pill && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed right-3 top-[76px] z-[60] flex items-center gap-3 rounded-full border border-white/10 bg-[#0d0c0b]/90 py-1.5 pl-1.5 pr-2 text-[#f3ead7] shadow-[0_18px_40px_-12px_rgba(0,0,0,.6)] backdrop-blur-xl sm:right-6 xl:top-[92px]"
            role="region"
            aria-label="Reproductor"
          >
            <span className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_50%,#2a2420_0_30%,#111_31%_100%)] ${playing ? "animate-[spin_6s_linear_infinite]" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-lion.png" alt="" className="h-7 w-7 object-contain" />
              <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">Rojo y Gualda</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#f3ead7]/55">El himno de la casa</span>
              <span className="mt-1 block h-[3px] w-32 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-[#c8102e] via-[#f1bf00] to-[#c8102e]" style={{ width: `${progress * 100}%` }} />
              </span>
            </span>
            <button onClick={toggle} aria-label={playing ? "Pausa" : "Reproducir"} className="grid h-9 w-9 place-items-center rounded-full bg-[#f3ead7] text-[#0d0c0b] transition-transform hover:scale-105">
              {playing ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
              )}
            </button>
            <button onClick={close} aria-label="Cerrar reproductor" className="grid h-8 w-8 place-items-center rounded-full text-[#f3ead7]/60 hover:bg-white/10 hover:text-[#f3ead7]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

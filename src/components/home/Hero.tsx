"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useT } from "@/components/providers/I18nProvider";
import { Mockup } from "@/components/art/Mockup";
import { IconArrow } from "@/components/ui/Icons";
import { DesignTile, JerseyTile } from "@/components/home/HeroTiles";

const ease = [0.16, 1, 0.3, 1] as const;

/** Hero film (Grok Imagine, from the lookbook still). null = still image only. */
const HERO_VIDEO: string | null = "/brand/hero-film";

/**
 * Plays the hero film once over the poster still and holds the final close-up frame.
 * Skipped on reduced motion and data-saver (checked after mount); the still underneath stays the LCP image.
 */
function HeroFilm({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [ended, setEnded] = useState(false);
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    // decided after hydration (server and first client render match), so reduced motion never swaps the tree
    if (c?.saveData || matchMedia("(prefers-reduced-motion: reduce)").matches) setSkip(true);
  }, []);
  if (skip) return null;
  return (
    // overflow-hidden: the end-of-film drift (scale) must never spill past the left fade into the text column
    // inset 3px on the faded edge (bottom on mobile, left on desktop): the GPU video layer otherwise bleeds a 1px seam past the gradient on bright frames
    <div className={`absolute inset-x-0 bottom-[3px] top-0 overflow-hidden transition-opacity duration-500 lg:bottom-0 lg:left-[3px] ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden>
      {/* the film ends on the lion close-up; the held frame keeps drifting so the end never looks frozen */}
      <video
        ref={ref}
        className="h-full w-full object-cover object-center"
        style={{ transform: ended ? "scale(1.06)" : "scale(1)", transition: "transform 16s cubic-bezier(.16,1,.3,1)" }}
        poster="/brand/lookbook-trio.webp"
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onPlaying={() => setReady(true)}
        onEnded={() => setEnded(true)}
      >
        <source src={`${src}.webm`} type="video/webm" />
        <source src={`${src}.mp4`} type="video/mp4" />
      </video>
      {/* soft golden glint that settles on the final frame */}
      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_55%_35%,rgba(224,184,74,0.18),transparent_70%)] mix-blend-screen transition-opacity duration-[2500ms] ${ended ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

/** Rotating circular "club" emblem. */
export function ClubBadge({ text, className = "", tone = "light" }: { text: string; className?: string; tone?: "light" | "dark" }) {
  const chars = `${text} · `.repeat(2);
  return (
    <div className={`aspect-square ${className.includes("absolute") ? "" : "relative"} ${className}`} aria-hidden>
      <svg viewBox="0 0 200 200" className="spin-slow absolute inset-0 h-full w-full">
        <defs>
          <path id="club-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text fill={tone === "light" ? "#e0b84a" : "#0d0d0d"} fontSize="15" fontWeight="700" letterSpacing="3" style={{ fontFamily: "var(--font-logo)", textTransform: "uppercase" }}>
          <textPath href="#club-circle">{chars}</textPath>
        </text>
      </svg>
      <div className="absolute inset-[30%] overflow-hidden rounded-full bg-[#0b0b0b] ring-2 ring-[#e0b84a]">
        {/* fill + object-contain: keeps the lion's aspect ratio on every browser (iOS Safari stretched h-full/w-auto) */}
        <Image src="/brand/logo-lion.webp" alt="" fill sizes="80px" className="object-contain p-[16%]" draggable={false} />
      </div>
    </div>
  );
}

export function Hero({ brandName, persoPhoto, designPhoto }: { brandName: string; jerseyImg?: string | null; blankImg?: string | null; persoPhoto?: string | null; designPhoto?: string | null }) {
  const t = useT();
  const reduce = useReducedMotion();
  // same start state on server and client (no hydration mismatch); reduced motion just skips the tween
  const tile = (d: number) => ({ initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: reduce ? { duration: 0 } : { delay: d, duration: 0.9, ease } });

  return (
    <section className="bg-bg px-3 pb-3 pt-3 sm:px-5 sm:pb-5">
      <div className="mx-auto grid max-w-[1600px] gap-3 lg:h-[clamp(680px,86vh,820px)] lg:grid-cols-12 lg:grid-rows-2">
        {/* Main tile — lookbook */}
        <motion.div {...tile(0)} className="grain-soft relative flex min-h-[720px] flex-col overflow-hidden rounded-[28px] bg-[#0b0b0b] text-[#f5f1e8] lg:col-span-8 lg:row-span-2 lg:min-h-0">
          <motion.div initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={reduce ? { duration: 0 } : { duration: 2.2, ease }} className="absolute inset-x-0 top-0 h-[46%] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[64%]">
            <Image src="/brand/lookbook-trio.webp" alt="Lookbook ROJO Y GUALDA" fill preload sizes="(min-width:1024px) 50vw, 100vw" className="object-cover object-center" />
            {HERO_VIDEO && <HeroFilm src={HERO_VIDEO} />}
            <div className="absolute -inset-px bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/30 to-transparent lg:bg-gradient-to-r lg:from-[#0b0b0b] lg:via-[#0b0b0b]/45 lg:to-transparent" />
          </motion.div>
          <div className="relative z-10 mt-auto flex flex-col p-6 sm:p-10 lg:mt-0 lg:h-full lg:max-w-[58%]">
            <div className="flex items-center gap-3">
              <span className="flag-stripe h-3.5 w-5 rounded-[3px]" aria-hidden />
              <p className="kicker text-[#e0b84a]">{t("hero3.kicker")}</p>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-logo)] text-[14vw] font-bold leading-[0.98] tracking-[0.01em] sm:text-[10.5vw] lg:text-[min(calc(7.8vw_-_22px),5.9rem)]">
              {[t("hero3.title.a"), t("hero3.title.b")].map((w, k) => (
                <span key={k} className="-mt-[0.12em] block overflow-hidden pb-[0.06em] pt-[0.12em]">
                  <motion.span className={`block ${k === 1 ? "text-gold-metal" : "text-red-metal"}`} initial={{ y: "105%" }} animate={{ y: "0%" }} transition={reduce ? { duration: 0 } : { delay: 0.25 + k * 0.1, duration: 1.1, ease }}>
                    {w}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p {...tile(0.45)} className="mt-5 max-w-md text-[17px] leading-relaxed text-[#f5f1e8]/75">
              {t("hero3.body")}
            </motion.p>
            <motion.div {...tile(0.55)} className="mt-8 flex flex-wrap gap-3 lg:mt-auto">
              <Link href="/shop" className="btn bg-[#c8102e] px-7 py-4 text-[15px] text-white hover:-translate-y-px hover:shadow-[0_12px_30px_-10px_#c8102e]">
                {t("hero2.cta.primary")} <IconArrow className="h-4 w-4" />
              </Link>
              <Link href="/collections" className="btn btn-ghost-light px-7 py-4 text-[15px]">
                {t("hero2.cta.secondary")}
              </Link>
            </motion.div>
          </div>
          <ClubBadge text={`${brandName} · club · est. 2026`} className="absolute right-5 top-5 z-10 w-24 sm:right-8 sm:top-8 sm:w-32" />
        </motion.div>

        {/* Side tiles: quick live edit (name + number / text), full editors one click away */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-4 lg:row-span-2 lg:min-h-0 lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          <motion.div {...tile(0.12)} className="h-full">
            <JerseyTile photo={persoPhoto ?? null} badge={t("nav.personalize")} title={t("hero3.perso")} labels={{ name: t("hero3.tile.name"), number: t("hero3.tile.number"), go: t("hero3.tile.go") }} />
          </motion.div>
          <motion.div {...tile(0.22)} className="h-full">
            <DesignTile photo={designPhoto ?? null} badge={t("hero3.designBadge")} title={t("hero3.design")} labels={{ text: t("hero3.tile.text"), go: t("hero3.tile.go"), font: t("hero3.tile.font"), tpl: t("hero3.tile.tpl") }} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}


/** Oversized scrolling words, alternating solid / outline. */
export function BigMarquee({ words, reverse = false }: { words: string[]; reverse?: boolean }) {
  const list = [...words, ...words];
  return (
    <div className="relative overflow-hidden border-y border-line py-5 sm:py-7">
      <div className={`${reverse ? "marquee-track-rev" : "marquee-track"} flex w-max whitespace-nowrap`}>
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center" aria-hidden={k === 1}>
            {list.map((w, i) => (
              <span key={i} className="flex items-center">
                <span className={`mega px-6 text-[13vw] sm:text-[9vw] lg:text-[7rem] ${i % 2 ? "text-stroke-fg" : ""}`}>{w}</span>
                <svg viewBox="0 0 24 24" className="h-[5vw] w-[5vw] text-accent lg:h-14 lg:w-14" aria-hidden>
                  <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill="currentColor" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Word({ children, progress, range }: { children: ReactNode; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
  );
}

/** Statement that lights up word by word while scrolling. */
export function Manifesto({ kicker, text, highlight }: { kicker: string; text: string; highlight: string[] }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  return (
    <section className="bg-bg py-16 sm:py-24">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <p className="kicker text-accent">{kicker}</p>
        <p ref={ref} className="headline mt-6 max-w-6xl text-[2.3rem] leading-[1.02] sm:text-6xl lg:text-[5.2rem]">
          {words.map((w, i) => {
            const hl = highlight.some((h) => w.toLowerCase().startsWith(h));
            const inner = <span className={hl ? "text-accent" : undefined}>{w}</span>;
            return reduce ? (
              <span key={i} className="mr-[0.25em] inline-block">
                {inner}
              </span>
            ) : (
              <Word key={i} progress={scrollYProgress} range={[i / words.length, Math.min(1, (i + 1.5) / words.length)]}>
                {inner}
              </Word>
            );
          })}
        </p>
      </div>
    </section>
  );
}

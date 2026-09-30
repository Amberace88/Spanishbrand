"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useT } from "@/components/providers/I18nProvider";

export function Hero({ foundedYear }: { foundedYear: number | null }) {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const sunY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const words = t("hero.words").split("|");
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % words.length), 2400);
    return () => clearInterval(id);
  }, [reduce, words.length]);

  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section ref={ref} className="grain relative flex min-h-[100svh] flex-col overflow-hidden bg-ink text-bone">
      {/* Sun + rays */}
      <motion.div style={{ y: reduce ? 0 : sunY }} className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute left-1/2 top-[58%] aspect-square w-[150vmax] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-[0.22]"
          style={{ background: "repeating-conic-gradient(from 0deg, rgba(244,239,230,.55) 0deg 0.6deg, transparent 0.6deg 10deg)", maskImage: "radial-gradient(circle, black 0%, transparent 62%)", WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 62%)" }}
        />
        <motion.div
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.4, ease }}
          className="absolute left-1/2 top-[64%] aspect-square w-[78vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(circle at 50% 42%, #f0c77a 0%, #d7662f 34%, #b3122e 58%, rgba(94,10,24,0) 72%)", filter: "blur(2px)" }}
        />
        <div className="absolute inset-x-0 top-[64%] h-[36%] bg-gradient-to-b from-ink/70 via-ink to-ink" />
        <div className="absolute inset-x-0 top-[64%] h-px bg-gradient-to-r from-transparent via-oro-2/60 to-transparent" />
        {Array.from({ length: 6 }).map((_, k) => (
          <div key={k} className="absolute left-1/2 h-px -translate-x-1/2 bg-oro-2" style={{ top: `calc(64% + ${14 + k * 16}px)`, width: `${46 - k * 6}vmin`, opacity: 0.35 - k * 0.05 }} />
        ))}
      </motion.div>

      {/* Side meta */}
      <div className="pointer-events-none absolute right-3 top-28 hidden sm:block">
        <p className="eyebrow whitespace-nowrap text-[0.6rem] text-bone/40 [writing-mode:vertical-rl]">40.4168° N · 3.7038° W — Km 0</p>
      </div>
      <div className="pointer-events-none absolute left-3 top-28 hidden sm:block">
        <p className="eyebrow rotate-180 whitespace-nowrap text-[0.6rem] text-bone/40 [writing-mode:vertical-rl]">Est. {foundedYear ?? "—"} · España</p>
      </div>

      <motion.div style={{ y: reduce ? 0 : titleY, opacity: fade }} className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-end px-4 pb-24 pt-28 sm:px-8 sm:pb-28">
        <motion.p initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1, ease }} className="eyebrow mb-6 text-oro-2">
          {t("hero.eyebrow")}
        </motion.p>

        <h1 className="display text-[22vw] sm:text-[17vw] lg:text-[13.5vw]">
          {[t("hero.title.a"), t("hero.title.b")].map((w, k) => (
            <span key={k} className="-mt-[0.2em] block overflow-hidden pb-[0.04em] pt-[0.2em]">
              <motion.span className={`block ${k === 1 ? "text-transparent [-webkit-text-stroke:1.5px_var(--color-bone)] sm:[-webkit-text-stroke:2px_var(--color-bone)]" : ""}`} initial={reduce ? false : { y: "110%" }} animate={{ y: "0%" }} transition={{ delay: 0.45 + k * 0.12, duration: 1.3, ease }}>
                {w}
              </motion.span>
            </span>
          ))}
        </h1>

        <div className="mt-4 flex flex-col gap-8 sm:mt-6 lg:flex-row lg:items-end lg:justify-between">
          <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1.2 }} className="serif max-w-xl text-3xl italic leading-[1.05] text-bone/90 sm:text-5xl">
            {t("hero.title.c")}{" "}
            <span className="relative inline-grid overflow-hidden align-bottom not-italic text-oro-2" style={{ height: "1.18em" }}>
              <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
                {words.reduce((a, b) => (b.length > a.length ? b : a), "")}
              </span>
              <AnimatePresence initial={false}>
                <motion.span key={words[i]} className="col-start-1 row-start-1 whitespace-nowrap" initial={{ y: "110%" }} animate={{ y: "0%" }} exit={{ y: "-110%" }} transition={{ duration: 0.7, ease }}>
                  {words[i]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.p>

          <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 1, ease }} className="flex flex-col gap-3 sm:flex-row">
            <Link href="/collections" className="btn btn-primary">
              {t("hero.cta.primary")} <span aria-hidden>→</span>
            </Link>
            <Link href="/about" className="btn btn-ghost-light">
              {t("hero.cta.secondary")}
            </Link>
          </motion.div>
        </div>
      </motion.div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-bone/50">
        <span className="eyebrow text-[0.6rem]">{t("hero.scroll")}</span>
        <span className="relative h-10 w-px overflow-hidden bg-bone/15">
          <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-bone" animate={reduce ? undefined : { y: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
        </span>
      </div>
    </section>
  );
}

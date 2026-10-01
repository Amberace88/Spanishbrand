"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useT } from "@/components/providers/I18nProvider";
import { Mockup } from "@/components/art/Mockup";
import { IconArrow, IconCheck, IconLock, IconTruck } from "@/components/ui/Icons";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const t = useT();
  const reduce = useReducedMotion();
  const fade = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.9, ease } });

  return (
    <section className="relative overflow-hidden bg-warm">
      {/* soft sun glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-oro-2/25 blur-3xl" aria-hidden />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-4 pb-14 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-20 lg:pt-14">
        <div>
          <motion.p {...fade(0.05)} className="inline-flex items-center gap-2 rounded-full border border-rojo/15 bg-rojo-50 px-3.5 py-1.5 text-[13px] font-semibold text-rojo">
            <span className="flag-stripe h-3 w-4 rounded-[2px]" aria-hidden /> {t("hero2.badge")}
          </motion.p>
          <motion.h1 {...fade(0.12)} className="headline mt-6 text-[2.75rem] sm:text-6xl xl:text-[5.2rem]">
            {t("hero2.title.a")}{" "}
            <span className="relative whitespace-nowrap">
              <span className="serif font-normal italic tracking-[-0.01em] text-rojo">{t("hero2.title.b")}</span>
              <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-oro-2" aria-hidden>
                <motion.path d="M3 11 C 80 2, 200 2, 297 9" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 1, ease }} />
              </svg>
            </span>
          </motion.h1>
          <motion.p {...fade(0.2)} className="mt-6 max-w-xl text-lg leading-relaxed text-stone-2 sm:text-xl">
            {t("hero2.body")}
          </motion.p>
          <motion.div {...fade(0.28)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/shop" className="btn btn-primary px-8 py-4 text-base">
              {t("hero2.cta.primary")} <IconArrow className="h-5 w-5" />
            </Link>
            <Link href="/collections" className="btn btn-ghost px-8 py-4 text-base">
              {t("hero2.cta.secondary")}
            </Link>
          </motion.div>
          <motion.ul {...fade(0.36)} className="mt-9 grid max-w-xl grid-cols-1 gap-3 text-sm text-stone-2 sm:grid-cols-3">
            {[
              [IconCheck, t("hero2.chip.made")],
              [IconTruck, t("hero2.chip.tracked")],
              [IconLock, t("trust.secure.t")],
            ].map(([Icon, label], i) => {
              const I = Icon as typeof IconCheck;
              return (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-oliva-50 text-oliva">
                    <I className="h-4 w-4" />
                  </span>
                  <span className="font-medium text-ink/80">{label as string}</span>
                </li>
              );
            })}
          </motion.ul>
        </div>

        {/* Visual composition */}
        <motion.div initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease, delay: 0.1 }} className="relative mx-auto aspect-square w-full max-w-[620px]">
          <div className="azulejo absolute inset-[4%] rounded-[2.5rem] shadow-[inset_0_0_0_1px_rgba(36,86,166,0.12)]" />
          <div className="absolute inset-[4%] rounded-[2.5rem] bg-gradient-to-t from-white/70 via-white/10 to-transparent" />
          {/* sun */}
          <div className="absolute left-1/2 top-[30%] h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-0 animate-spin-slow rounded-full opacity-70" style={{ background: "repeating-conic-gradient(from 0deg, #ffc629 0deg 5deg, transparent 5deg 15deg)", maskImage: "radial-gradient(circle, transparent 46%, black 47%, black 62%, transparent 63%)", WebkitMaskImage: "radial-gradient(circle, transparent 46%, black 47%, black 62%, transparent 63%)" }} />
            <div className="absolute inset-[19%] rounded-full" style={{ background: "radial-gradient(circle at 40% 35%, #ffd76a 0%, #f2a33a 45%, #d9452b 100%)" }} />
          </div>
          {/* main tee */}
          <div className="absolute left-1/2 top-[52%] w-[66%] -translate-x-1/2 -translate-y-1/2">
            <Mockup kind="tee" color="#fffcf7" slug="espana" className="floaty" />
          </div>
          {/* floating cards */}
          <div className="floaty-slow absolute left-0 top-[10%] w-[30%] rounded-2xl bg-white p-2.5 shadow-[0_20px_40px_-18px_rgba(28,23,18,0.35)] sm:p-3">
            <div className="rounded-xl bg-oro-50">
              <Mockup kind="cap" color="#1d3f7a" />
            </div>
            <p className="mt-2 px-1 text-[11px] font-bold sm:text-xs">{t("nav.cat.HEADWEAR")}</p>
          </div>
          <div className="floaty absolute bottom-[6%] right-0 w-[30%] rounded-2xl bg-white p-2.5 shadow-[0_20px_40px_-18px_rgba(28,23,18,0.35)] sm:p-3" style={{ animationDelay: "-2s" }}>
            <div className="rounded-xl bg-terra-50">
              <Mockup kind="mug" color="#fffcf7" slug="mediterraneo" />
            </div>
            <p className="mt-2 px-1 text-[11px] font-bold sm:text-xs">{t("nav.cat.DRINKWARE")}</p>
          </div>
          <div className="absolute bottom-[14%] left-[3%] flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-semibold shadow-[0_14px_30px_-14px_rgba(28,23,18,0.4)] sm:text-[13px]">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-rojo text-white">
              <IconCheck className="h-3.5 w-3.5" />
            </span>
            {t("hero2.chip.made")}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { formatMoney } from "@/lib/format";

/** The pledge as a gold medallion: coins drop into it once when it scrolls into view, then it breathes. */
export function CoinMedal({ amount }: { amount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const ease = [0.23, 1, 0.32, 1] as const;
  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[260px] sm:max-w-[340px]">
      {/* falling coins: three, one after another, each lands and fades into the medallion */}
      {!reduce &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute left-1/2 top-0 z-10 -ml-4 grid h-8 w-8 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe9a6,#e0b84a_45%,#8a6516)] text-[11px] font-bold text-[#3b2a06] shadow-[0_6px_14px_-4px_rgba(0,0,0,0.6)]"
            style={{ x: (i - 1) * 26 }}
            initial={{ y: -40, opacity: 0, rotate: -30 }}
            animate={inView ? { y: [-40, 120, 128], opacity: [0, 1, 0], rotate: [-30, 10, 0] } : undefined}
            transition={{ duration: 1.1, delay: 0.25 + i * 0.32, ease, times: [0, 0.8, 1] }}
          >
            €
          </motion.span>
        ))}
      {/* pulse ring when the coins land */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-[9%] rounded-full ring-2 ring-[#e0b84a]/50"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={inView ? { scale: [0.9, 1.12], opacity: [0.8, 0] } : undefined}
          transition={{ duration: 1.2, delay: 1.25, repeat: 2, repeatDelay: 2.6, ease }}
        />
      )}
      <motion.div
        className="absolute inset-[9%] grid place-items-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#2a2418,#0b0b0b_70%)] shadow-[inset_0_0_0_1px_rgba(224,184,74,0.45),inset_0_0_60px_rgba(224,184,74,0.12),0_40px_70px_-30px_rgba(0,0,0,0.9)]"
        animate={reduce || !inView ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      >
        <div className="absolute inset-[7%] rounded-full border border-dashed border-[#e0b84a]/25" aria-hidden />
        <Image src="/brand/logo-lion.webp" alt="" width={220} height={220} className="pointer-events-none absolute w-[62%] opacity-[0.07]" aria-hidden />
        <p className="relative text-center">
          <span className="block font-[family-name:var(--font-logo)] text-[clamp(3.2rem,9vw,5rem)] font-bold leading-none">
            <CountUp to={amount} duration={1.6} format={(n) => formatMoney(n)} className="text-gold-metal" />
          </span>
        </p>
      </motion.div>
    </div>
  );
}

/** Month-to-date total in euros, counting up once. */
export function MoneyCount({ to, className }: { to: number; className?: string }) {
  return <CountUp to={to} duration={1.8} format={(n) => formatMoney(n)} className={className} />;
}

"use client";
import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Scroll-triggered editorial reveal. */
export function Reveal({ children, delay = 0, y = 20, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const line: Variants = {
  hidden: { y: "105%" },
  show: (i: number) => ({ y: "0%", transition: { duration: 1.2, ease: EASE, delay: i * 0.09 } }),
};

/**
 * Line-by-line mask reveal for large headings. The observer sits on the (visible)
 * wrapper — observing the clipped inner span would never intersect.
 */
export function MaskLines({ lines, className, delay = 0 }: { lines: ReactNode[]; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span className={`block ${className ?? ""}`} initial={reduce ? false : "hidden"} whileInView="show" viewport={{ once: true, amount: 0.1 }} transition={{ delayChildren: delay }}>
      {lines.map((l, i) => (
        <span key={i} className="-mt-[0.2em] block overflow-hidden pb-[0.06em] pt-[0.2em]">
          <motion.span className="block" variants={line} custom={i}>
            {l}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

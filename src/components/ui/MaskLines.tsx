"use client";
import { m, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

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
    <m.span className={`block ${className ?? ""}`} initial={reduce ? false : "hidden"} whileInView="show" viewport={{ once: true, amount: 0.1 }} transition={{ delayChildren: delay }}>
      {lines.map((l, i) => (
        <span key={i} className="-mt-[0.2em] block overflow-hidden pb-[0.06em] pt-[0.2em]">
          <m.span className="block" variants={line} custom={i}>
            {l}
          </m.span>
        </span>
      ))}
    </m.span>
  );
}

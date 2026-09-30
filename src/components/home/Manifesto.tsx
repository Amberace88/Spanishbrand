"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

/**
 * Editorial "title sequence": scroll-driven manifesto. Stands in for the brand film
 * slot until real video exists (no fake video placeholder).
 */
const LINES = [
  { text: "No vendemos souvenirs.", tone: "text-bone" },
  { text: "Contamos un país.", tone: "text-oro-2" },
  { text: "Sus ciudades, su mar, sus carreteras.", tone: "text-bone" },
  { text: "Hecho bajo pedido. Sin stock. Sin prisa.", tone: "text-bone/70" },
];

function Line({ progress, i, text, tone }: { progress: MotionValue<number>; i: number; text: string; tone: string }) {
  const start = i / LINES.length;
  const end = start + 1 / LINES.length;
  const opacity = useTransform(progress, [start - 0.08, start + 0.05, end - 0.02, end + 0.08], [0.12, 1, 1, 0.25]);
  const x = useTransform(progress, [start - 0.1, start + 0.05], ["4%", "0%"]);
  return (
    <motion.p style={{ opacity, x }} className={`serif text-[9vw] leading-[1.02] sm:text-[6.4vw] lg:text-[5.2vw] ${tone}`}>
      {text}
    </motion.p>
  );
}

export function Manifesto({ eyebrow }: { eyebrow: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 40%"] });
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <section ref={ref} className="grain relative overflow-hidden bg-ink py-28 text-bone sm:py-40">
      <div className="pointer-events-none absolute -right-[20vmin] top-1/2 aspect-square w-[70vmin] -translate-y-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #b3122e 0%, transparent 65%)" }} />
      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="mb-14 flex items-center gap-6">
          <p className="eyebrow text-oro-2">{eyebrow}</p>
          <div className="h-px flex-1 bg-bone/10">
            <motion.div style={{ width: reduce ? "100%" : bar }} className="h-px bg-oro-2" />
          </div>
          <p className="eyebrow text-bone/40">Manifiesto</p>
        </div>
        <div className="space-y-2">
          {LINES.map((l, i) =>
            reduce ? (
              <p key={i} className={`serif text-[9vw] leading-[1.02] sm:text-[6.4vw] lg:text-[5.2vw] ${l.tone}`}>
                {l.text}
              </p>
            ) : (
              <Line key={i} progress={scrollYProgress} i={i} text={l.text} tone={l.tone} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

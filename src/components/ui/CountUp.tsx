"use client";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Number that counts up once when scrolled into view (tabular figures, no layout shift). */
export function CountUp({ to, from = 0, duration = 1.4, format = (n: number) => Math.round(n).toLocaleString("es-ES"), className }: { to: number; from?: number; duration?: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [v, setV] = useState(from); // same start on server and client (no hydration mismatch)
  useEffect(() => {
    if (!inView || reduce) return void setV(to);
    const c = animate(from, to, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, reduce, from, to, duration]);
  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {/* the real figure for screen readers, crawlers and no-JS; the animated one is decoration */}
      <span className="sr-only">{format(to)}</span>
      <span aria-hidden>{format(v)}</span>
    </span>
  );
}

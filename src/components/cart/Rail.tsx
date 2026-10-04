"use client";
import "./cart.css";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IconArrow } from "@/components/ui/Icons";

/** Horizontal snap rail with prev/next buttons (touch/trackpad scroll everywhere; buttons from sm up). */
export function Rail({ head, children, label, prev, next, compact = false }: { head: ReactNode; children: ReactNode; label: string; prev: string; next: string; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        <div className="min-w-0">{head}</div>
        <div className={`hidden shrink-0 gap-2 sm:flex ${edge.start && edge.end ? "sm:invisible" : ""}`}>
        <button type="button" className="ct-arrow" onClick={() => go(-1)} disabled={edge.start} aria-label={prev}>
          <IconArrow className="h-4 w-4 rotate-180" />
        </button>
        <button type="button" className="ct-arrow" onClick={() => go(1)} disabled={edge.end} aria-label={next}>
          <IconArrow className="h-4 w-4" />
        </button>
        </div>
      </div>
      <div ref={ref} className={`ct-rail ${compact ? "ct-rail-compact" : ""}`} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}

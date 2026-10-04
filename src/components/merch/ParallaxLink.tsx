"use client";
import Link from "next/link";
import { useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Link whose layers drift with the pointer: sets --px / --py (−1…1) on the element, read by `.plx`
 * layers (each with its own depth `--d`). One rAF per frame, nothing for touch or reduced motion.
 */
export function ParallaxLink({ href, className, style, children, label }: { href: string; className?: string; style?: CSSProperties; children: ReactNode; label?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const frame = useRef(0);
  const set = (x: number, y: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty("--px", x.toFixed(3));
      ref.current?.style.setProperty("--py", y.toFixed(3));
    });
  };
  return (
    <Link
      ref={ref}
      href={href}
      aria-label={label}
      className={className}
      style={style}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = e.currentTarget.getBoundingClientRect();
        set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => set(0, 0)}
    >
      {children}
    </Link>
  );
}

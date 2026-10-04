"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Horizontal chip row that brings the active chip (aria-current) into view on narrow screens. */
export function ChipRail({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>("[aria-current]");
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, active.offsetLeft - nav.clientWidth / 2 + active.offsetWidth / 2);
  }, []);
  return (
    <nav ref={ref} className={className}>
      {children}
    </nav>
  );
}

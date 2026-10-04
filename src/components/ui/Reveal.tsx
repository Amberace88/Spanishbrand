import type { CSSProperties, ReactNode } from "react";

export { MaskLines } from "./MaskLines";

/**
 * Scroll-triggered editorial reveal — CSS only (scroll-driven animation, see `.reveal` in globals.css).
 * No JavaScript and no hydration: content already in the viewport paints visible with the HTML (it used to
 * wait for hydration at opacity 0, delaying LCP), content below the fold rises in as it enters the viewport.
 * Browsers without `animation-timeline` and reduced-motion users simply see the content.
 * `delay` (seconds, as before) staggers siblings by starting their reveal a little later in the scroll.
 */
export function Reveal({ children, delay = 0, y = 20, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const style = { "--rv-y": `${y}px`, ...(delay ? { "--rv-start": `${Math.min(40, Math.round(delay * 100))}%` } : {}) } as CSSProperties;
  return (
    <div className={className ? `reveal ${className}` : "reveal"} style={style}>
      {children}
    </div>
  );
}

/** Staggered reveal for grids/lists (CSS scroll-driven, like Reveal): wrap items in <Stagger.Item index={i}>. */
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" }) {
  const C = as;
  return <C className={className}>{children}</C>;
}
Stagger.Item = function StaggerItem({ children, className, index = 0, as = "div" }: { children: ReactNode; className?: string; index?: number; as?: "div" | "li" }) {
  const C = as;
  const style = { "--rv-y": "18px", ...(index ? { "--rv-start": `${Math.min(40, (index % 8) * 5)}%` } : {}) } as CSSProperties;
  return (
    <C className={className ? `reveal ${className}` : "reveal"} style={style}>
      {children}
    </C>
  );
};
